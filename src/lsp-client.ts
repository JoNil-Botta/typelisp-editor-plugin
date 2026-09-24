import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as os from "os";

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: JsonRpcError;
}

export type EditResult = {
  success: boolean;
  text?: string;
  error?: string;
  errorData?: unknown;
};

export function editResult(resp: JsonRpcMessage): EditResult {
  return {
    success: resp.result?.success || false,
    text: resp.result?.text,
    error: resp.error?.message || resp.result?.error,
    errorData: resp.error?.data ?? resp.result?.context,
  };
}

export class TypeLispLspClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<
    number,
    {
      method: string;
      resolve: (msg: JsonRpcMessage) => void;
      reject: (err: Error) => void;
    }
  >();
  private buffer: Buffer = Buffer.alloc(0);
  private running = false;
  private timeoutMs = 120000; // 2 minute request timeout (was 30s — too short for large files)

  constructor(
    private typelispPath: string,
    private stdlibRoots: string[] = []
  ) {}

  getProcess(): ChildProcess | null {
    return this.process;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = [this.typelispPath, "lsp"];
      for (const root of this.stdlibRoots) {
        cmd.push("--stdlib-root", root);
      }

      this.process = spawn(cmd[0], cmd.slice(1), {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.running = true;

      this.process.stdout?.on("data", (data: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, data]);
        this.processBuffer();
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        // LSP servers log diagnostics to stderr, ignore
      });

      // The child can die before a queued write drains; the exit handler
      // rejects all pending requests, so swallow the stream error here.
      this.process.stdin?.on("error", () => {
        /* EPIPE after crash: pending requests are rejected on exit */
      });

      this.process.on("error", (err) => {
        this.running = false;
        this.process = null;
        this.rejectAllPending(new Error(`TypeLisp LSP server error: ${err.message}`));
        reject(err);
      });
      this.process.on("exit", (code, signal) => {
        this.running = false;
        this.process = null;
        this.rejectAllPending(
          new Error(
            `TypeLisp LSP server exited unexpectedly (code=${code}, signal=${signal ?? "none"})`
          )
        );
      });

      // Send initialize with timeout
      const initTimeout = setTimeout(() => {
        reject(new Error("LSP initialize timeout after 10s"));
      }, 10000);

      this.sendRequest("initialize", {
        processId: process.pid,
        rootUri: null,
        capabilities: {},
      }).then(() => {
        clearTimeout(initTimeout);
        resolve();
      }).catch((err) => {
        clearTimeout(initTimeout);
        reject(err);
      });
    });
  }

  stop(): void {
    this.running = false;
    this.rejectAllPending(new Error("TypeLisp LSP client stopped"));
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill();
      this.process = null;
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [, entry] of this.pending) {
      entry.reject(error);
    }
    this.pending.clear();
  }

  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = this.buffer.slice(0, headerEnd).toString("utf-8");
      const match = header.match(/Content-Length: (\d+)/);
      if (!match) break;

      const contentLength = parseInt(match[1], 10);
      const contentStart = headerEnd + 4;

      if (this.buffer.length < contentStart + contentLength) break;

      const content = this.buffer.slice(contentStart, contentStart + contentLength).toString("utf-8");
      this.buffer = this.buffer.slice(contentStart + contentLength);

      try {
        const msg: JsonRpcMessage = JSON.parse(content);
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const entry = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  sendRequest(method: string, params: any): Promise<JsonRpcMessage> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.running) {
        reject(new Error("LSP client is not running"));
        return;
      }

      this.requestId++;
      const id = this.requestId;
      this.pending.set(id, { method, resolve, reject });

      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request '${method}' timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      const msg = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;

      try {
        this.process.stdin?.write(header + content, (err) => {
          if (err) {
            clearTimeout(timeout);
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "EPIPE") {
              // The child closed its stdin or died. Reject everything now
              // with the crash error instead of waiting for the request
              // timeout; the exit handler also fires, but pending is already
              // cleared so it becomes a no-op.
              this.running = false;
              this.rejectAllPending(
                new Error("TypeLisp LSP server exited unexpectedly (write EPIPE)")
              );
              return;
            }
            this.pending.delete(id);
            reject(err);
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  openDocument(uri: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.running) {
        reject(new Error("LSP client is not running"));
        return;
      }

      const msg = {
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: { uri, languageId: "typelisp", version: 1, text },
        },
      };
      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;
      try {
        this.process.stdin?.write(header + content, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  changeDocument(uri: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.running) {
        reject(new Error("LSP client is not running"));
        return;
      }

      const msg = {
        jsonrpc: "2.0",
        method: "textDocument/didChange",
        params: {
          textDocument: { uri, version: Date.now() },
          contentChanges: [{ text }],
        },
      };
      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;
      try {
        this.process.stdin?.write(header + content, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  closeDocument(uri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.running) {
        resolve();
        return;
      }

      const msg = {
        jsonrpc: "2.0",
        method: "textDocument/didClose",
        params: {
          textDocument: { uri },
        },
      };
      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;
      try {
        this.process.stdin?.write(header + content, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // tl/ methods

  async listFunctions(uri: string): Promise<string[]> {
    const resp = await this.sendRequest("tl/listFunctions", {
      textDocument: { uri },
    });
    // Server returns a plain array of strings, not { functions: [...] }
    if (Array.isArray(resp.result)) {
      return resp.result;
    }
    return resp.result?.functions || [];
  }

  async appendFunction(uri: string, newText: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/appendFunction", {
      textDocument: { uri },
      newText,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async replaceFunction(uri: string, name: string | undefined, newText: string, position?: { line: number; character: number }): Promise<{ success: boolean; text?: string; error?: string }> {
    const params: any = {
      textDocument: { uri },
      newText,
    };
    if (name && !position) {
      const found = await this.findPosition(uri, name);
      if (!found) {
        return { success: false, error: `Form '${name}' not found` };
      }
      params.position = found;
    } else if (position) {
      params.position = position;
    }

    const resp = await this.sendRequest("tl/replace", params);
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async replaceBody(uri: string, name: string, newBody: string): Promise<EditResult> {
    const resp = await this.sendRequest("tl/replaceBody", {
      textDocument: { uri },
      name,
      newBody,
    });
    return editResult(resp);
  }

  async replacePattern(uri: string, name: string | undefined, oldPattern: string, newPattern: string, position?: { line: number; character: number }): Promise<{ success: boolean; text?: string; error?: string }> {
    const params: any = {
      textDocument: { uri },
      oldPattern,
      newPattern,
    };
    if (name && !position) {
      const found = await this.findPosition(uri, name);
      if (!found) {
        return { success: false, error: `Form '${name}' not found` };
      }
      params.position = found;
    } else if (position) {
      params.position = position;
    }

    const resp = await this.sendRequest("tl/replacePattern", params);
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async patch(uri: string, oldText: string, newText: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/patch", {
      textDocument: { uri },
      oldText,
      newText,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async deleteFunction(uri: string, name: string | undefined, position?: { line: number; character: number }): Promise<{ success: boolean; text?: string; error?: string }> {
    const params: any = {
      textDocument: { uri },
    };
    if (name && !position) {
      const found = await this.findPosition(uri, name);
      if (!found) {
        return { success: false, error: `Form '${name}' not found` };
      }
      params.position = found;
    } else if (position) {
      params.position = position;
    }

    const resp = await this.sendRequest("tl/delete", params);
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async format(uri: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("textDocument/formatting", {
      textDocument: { uri },
    });
    return {
      success: resp.result !== undefined && resp.result !== null,
      text: resp.result?.[0]?.newText,
      error: resp.error?.message,
    };
  }

  async deleteFunctionAt(uri: string, position: { line: number; character: number }): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/delete", {
      textDocument: { uri },
      position,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async insertAfter(uri: string, position: { line: number; character: number }, newText: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/insertAfter", {
      textDocument: { uri },
      position,
      newText,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async check(uri: string): Promise<{ success: boolean; error?: string }> {
    const resp = await this.sendRequest("tl/check", {
      textDocument: { uri },
    });
    return {
      success: resp.result?.success || false,
      error: resp.result?.error || resp.error?.message,
    };
  }

  async findPosition(uri: string, name: string, kind?: string): Promise<{ line: number; character: number } | null> {
    const resp = await this.sendRequest("tl/findPosition", {
      textDocument: { uri },
      name,
      ...(kind ? { kind } : {}),
    });
    if (resp.error) {
      return null;
    }
    return resp.result ?? null;
  }

  async replaceBodyAt(uri: string, position: { line: number; character: number }, newBody: string): Promise<EditResult> {
    const resp = await this.sendRequest("tl/replaceBody", {
      textDocument: { uri },
      position,
      newBody,
    });
    return editResult(resp);
  }

  async replacePatternAt(uri: string, position: { line: number; character: number }, oldPattern: string, newPattern: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/replacePattern", {
      textDocument: { uri },
      position,
      oldPattern,
      newPattern,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async readFormAt(uri: string, position: { line: number; character: number }, outer?: number): Promise<{ success: boolean; form?: string; error?: string }> {
    const resp = await this.sendRequest("tl/read", {
      textDocument: { uri },
      position,
      outer: outer ?? 0,
    });
    return {
      success: resp.result?.success || false,
      form: resp.result?.form,
      error: resp.error?.message,
    };
  }

  async move(uri: string, name: string | undefined, position: { line: number; character: number } | undefined, direction?: string, destination?: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const params: any = {
      textDocument: { uri },
    };
    if (name && !position) {
      const found = await this.findPosition(uri, name);
      if (!found) {
        return { success: false, error: `Form '${name}' not found` };
      }
      params.position = found;
    } else if (position) {
      params.position = position;
    }
    if (destination) params.destination = destination;
    if (direction) params.direction = direction;

    const resp = await this.sendRequest("tl/move", params);
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async expandMacro(uri: string, name: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/expandMacro", {
      textDocument: { uri },
      name,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
  }

  async getType(uri: string, position: { line: number; character: number }): Promise<{ success: boolean; type?: string; error?: string }> {
    const resp = await this.sendRequest("tl/getType", {
      textDocument: { uri },
      position,
    });
    return {
      success: resp.result?.success || false,
      type: resp.result?.type,
      error: resp.result?.error || resp.error?.message,
    };
  }

  async batch(uri: string, operations: Array<{ method: string; name?: string; newText?: string }>): Promise<EditResult & { results?: any[] }> {
    const resp = await this.sendRequest("tl/batch", {
      textDocument: { uri },
      operations,
    });
    return {
      ...editResult(resp),
      results: resp.result?.results,
    };
  }

  async projectSearch(uri: string, query: string): Promise<{ success: boolean; results?: any[]; error?: string }> {
    const resp = await this.sendRequest("tl/projectSearch", {
      textDocument: { uri },
      name: query,
    });
    return {
      success: resp.result?.success || false,
      results: resp.result?.results,
      error: resp.error?.message,
    };
  }
}
