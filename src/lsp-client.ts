import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as os from "os";

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string };
}

export class TypeLispLspClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, (msg: JsonRpcMessage) => void>();
  private buffer = "";
  private running = false;

  constructor(
    private typelispPath: string,
    private stdlibRoots: string[] = []
  ) {}

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
        this.buffer += data.toString("utf-8");
        this.processBuffer();
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        // LSP servers log diagnostics to stderr, ignore
      });

      this.process.on("error", reject);

      // Send initialize
      this.sendRequest("initialize", {
        processId: process.pid,
        rootUri: null,
        capabilities: {},
      }).then(() => resolve()).catch(reject);
    });
  }

  stop(): void {
    this.running = false;
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill();
      this.process = null;
    }
  }

  private processBuffer(): void {
    while (true) {
      const headerMatch = this.buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!headerMatch) break;

      const contentLength = parseInt(headerMatch[1], 10);
      const headerEnd = headerMatch.index! + headerMatch[0].length;

      if (this.buffer.length < headerEnd + contentLength) break;

      const content = this.buffer.slice(headerEnd, headerEnd + contentLength);
      this.buffer = this.buffer.slice(headerEnd + contentLength);

      try {
        const msg: JsonRpcMessage = JSON.parse(content);
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const resolve = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          resolve(msg);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  sendRequest(method: string, params: any): Promise<JsonRpcMessage> {
    return new Promise((resolve) => {
      this.requestId++;
      const id = this.requestId;
      this.pending.set(id, resolve);

      const msg = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;

      this.process?.stdin?.write(header + content);
    });
  }

  openDocument(uri: string, text: string): Promise<void> {
    return new Promise((resolve) => {
      const msg = {
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: { uri, languageId: "typelisp", version: 1, text },
        },
      };
      const content = JSON.stringify(msg);
      const header = `Content-Length: ${Buffer.byteLength(content, "utf-8")}\r\n\r\n`;
      this.process?.stdin?.write(header + content, () => resolve());
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

  async replaceBody(uri: string, name: string, newBody: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/replaceBody", {
      textDocument: { uri },
      name,
      newBody,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
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
      error: resp.error?.message,
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

  async replaceBodyAt(uri: string, position: { line: number; character: number }, newBody: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const resp = await this.sendRequest("tl/replaceBody", {
      textDocument: { uri },
      position,
      newBody,
    });
    return {
      success: resp.result?.success || false,
      text: resp.result?.text,
      error: resp.error?.message,
    };
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

  async rename(uri: string, oldName: string | undefined, position: { line: number; character: number } | undefined, newName: string): Promise<{ success: boolean; text?: string; error?: string }> {
    const params: any = {
      textDocument: { uri },
      newName,
    };
    if (oldName) params.oldName = oldName;
    if (position) params.position = position;

    const resp = await this.sendRequest("tl/rename", params);
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
      error: resp.error?.message,
    };
  }

  async findReferences(uri: string, name: string): Promise<{ success: boolean; references?: any[]; error?: string }> {
    const resp = await this.sendRequest("tl/findReferences", {
      textDocument: { uri },
      name,
    });
    return {
      success: resp.result?.success || false,
      references: resp.result?.references,
      error: resp.error?.message,
    };
  }
}
