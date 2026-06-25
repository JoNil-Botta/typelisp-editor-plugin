import { spawn } from "child_process";
export class TypeLispLspClient {
    typelispPath;
    stdlibRoots;
    process = null;
    requestId = 0;
    pending = new Map();
    buffer = "";
    running = false;
    timeoutMs = 30000; // 30 second request timeout
    constructor(typelispPath, stdlibRoots = []) {
        this.typelispPath = typelispPath;
        this.stdlibRoots = stdlibRoots;
    }
    getProcess() {
        return this.process;
    }
    start() {
        return new Promise((resolve, reject) => {
            const cmd = [this.typelispPath, "lsp"];
            for (const root of this.stdlibRoots) {
                cmd.push("--stdlib-root", root);
            }
            this.process = spawn(cmd[0], cmd.slice(1), {
                stdio: ["pipe", "pipe", "pipe"],
            });
            this.running = true;
            this.process.stdout?.on("data", (data) => {
                this.buffer += data.toString("utf-8");
                this.processBuffer();
            });
            this.process.stderr?.on("data", (data) => {
                // LSP servers log diagnostics to stderr, ignore
            });
            this.process.on("error", reject);
            this.process.on("exit", () => {
                this.running = false;
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
    stop() {
        this.running = false;
        if (this.process) {
            this.process.stdin?.end();
            this.process.kill();
            this.process = null;
        }
    }
    processBuffer() {
        while (true) {
            const headerMatch = this.buffer.match(/Content-Length: (\d+)\r\n\r\n/);
            if (!headerMatch)
                break;
            const contentLength = parseInt(headerMatch[1], 10);
            const headerEnd = headerMatch.index + headerMatch[0].length;
            if (this.buffer.length < headerEnd + contentLength)
                break;
            const content = this.buffer.slice(headerEnd, headerEnd + contentLength);
            this.buffer = this.buffer.slice(headerEnd + contentLength);
            try {
                const msg = JSON.parse(content);
                if (msg.id !== undefined && this.pending.has(msg.id)) {
                    const resolve = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    resolve(msg);
                }
            }
            catch (e) {
                // Ignore parse errors
            }
        }
    }
    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.process || !this.running) {
                reject(new Error("LSP client is not running"));
                return;
            }
            this.requestId++;
            const id = this.requestId;
            this.pending.set(id, resolve);
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
                        this.pending.delete(id);
                        reject(err);
                    }
                });
            }
            catch (err) {
                clearTimeout(timeout);
                this.pending.delete(id);
                reject(err);
            }
        });
    }
    openDocument(uri, text) {
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
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
    closeDocument(uri) {
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
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
    // tl/ methods
    async listFunctions(uri) {
        const resp = await this.sendRequest("tl/listFunctions", {
            textDocument: { uri },
        });
        // Server returns a plain array of strings, not { functions: [...] }
        if (Array.isArray(resp.result)) {
            return resp.result;
        }
        return resp.result?.functions || [];
    }
    async appendFunction(uri, newText) {
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
    async replaceFunction(uri, name, newText, position) {
        const params = {
            textDocument: { uri },
            newText,
        };
        if (name && !position) {
            const found = await this.findPosition(uri, name);
            if (!found) {
                return { success: false, error: `Form '${name}' not found` };
            }
            params.position = found;
        }
        else if (position) {
            params.position = position;
        }
        const resp = await this.sendRequest("tl/replace", params);
        return {
            success: resp.result?.success || false,
            text: resp.result?.text,
            error: resp.error?.message,
        };
    }
    async replaceBody(uri, name, newBody) {
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
    async replacePattern(uri, name, oldPattern, newPattern, position) {
        const params = {
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
        }
        else if (position) {
            params.position = position;
        }
        const resp = await this.sendRequest("tl/replacePattern", params);
        return {
            success: resp.result?.success || false,
            text: resp.result?.text,
            error: resp.error?.message,
        };
    }
    async patch(uri, oldText, newText) {
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
    async deleteFunction(uri, name, position) {
        const params = {
            textDocument: { uri },
        };
        if (name && !position) {
            const found = await this.findPosition(uri, name);
            if (!found) {
                return { success: false, error: `Form '${name}' not found` };
            }
            params.position = found;
        }
        else if (position) {
            params.position = position;
        }
        const resp = await this.sendRequest("tl/delete", params);
        return {
            success: resp.result?.success || false,
            text: resp.result?.text,
            error: resp.error?.message,
        };
    }
    async format(uri) {
        const resp = await this.sendRequest("textDocument/formatting", {
            textDocument: { uri },
        });
        return {
            success: resp.result !== undefined && resp.result !== null,
            text: resp.result?.[0]?.newText,
            error: resp.error?.message,
        };
    }
    async deleteFunctionAt(uri, position) {
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
    async insertAfter(uri, position, newText) {
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
    async check(uri) {
        const resp = await this.sendRequest("tl/check", {
            textDocument: { uri },
        });
        return {
            success: resp.result?.success || false,
            error: resp.result?.error || resp.error?.message,
        };
    }
    async findPosition(uri, name, kind) {
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
    async replaceBodyAt(uri, position, newBody) {
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
    async replacePatternAt(uri, position, oldPattern, newPattern) {
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
    async readFormAt(uri, position, outer) {
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
    async move(uri, name, position, direction, destination) {
        const params = {
            textDocument: { uri },
        };
        if (name && !position) {
            const found = await this.findPosition(uri, name);
            if (!found) {
                return { success: false, error: `Form '${name}' not found` };
            }
            params.position = found;
        }
        else if (position) {
            params.position = position;
        }
        if (destination)
            params.destination = destination;
        if (direction)
            params.direction = direction;
        const resp = await this.sendRequest("tl/move", params);
        return {
            success: resp.result?.success || false,
            text: resp.result?.text,
            error: resp.error?.message,
        };
    }
    async rename(uri, oldName, position, newName) {
        const params = {
            textDocument: { uri },
            newName,
        };
        if (oldName)
            params.oldName = oldName;
        if (position)
            params.position = position;
        const resp = await this.sendRequest("tl/rename", params);
        return {
            success: resp.result?.success || false,
            text: resp.result?.text,
            error: resp.error?.message,
        };
    }
    async expandMacro(uri, name) {
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
    async getType(uri, position) {
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
    async findReferences(uri, name) {
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
