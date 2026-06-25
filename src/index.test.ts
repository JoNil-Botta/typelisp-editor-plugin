import { describe, expect, it, beforeAll, afterAll } from "vitest";
import entry from "./index.js";
import { getToolPluginMetadata } from "openclaw/plugin-sdk/tool-plugin";
import { TypeLispLspClient } from "./lsp-client.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("typelisp-editor-plugin", () => {
  it("declares expected tool metadata", () => {
    const tools = getToolPluginMetadata(entry)?.tools.map((tool) => tool.name);
    expect(tools).toContain("typelisp_edit_patch");
    expect(tools).toContain("typelisp_edit_replace_body");
    expect(tools).toContain("typelisp_edit_format");
    expect(tools).not.toContain("typelisp_edit_apply_patch");
  });
});

describe("LSP client", () => {
  let client: TypeLispLspClient;
  let tmpDir: string;
  let typelispPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "typelisp-test-"));
    typelispPath = path.join(process.env.HOME || "", "workspace", "typelisp", "target", "stage0", "typelisp");
    if (!fs.existsSync(typelispPath)) {
      typelispPath = "typelisp";
    }
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    if (client) {
      client.stop();
    }
  });

  it("patch works on large files", async () => {
    const largeFile = path.join(tmpDir, "large.tl");
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      lines.push(`(define (func-${i}) : i64\n  ${i})`);
    }
    fs.writeFileSync(largeFile, lines.join("\n\n"), "utf-8");

    client = new TypeLispLspClient(typelispPath, [tmpDir]);
    await client.start();

    const uri = "file://" + largeFile;
    const text = fs.readFileSync(largeFile, "utf-8");
    await client.openDocument(uri, text);

    const start = Date.now();
    const result = await client.patch(uri, "(define (func-1000) : i64\n  1000)", "(define (func-1000) : i64\n  9999)");
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.text).toContain("(define (func-1000) : i64\n  9999)");
    expect(elapsed).toBeLessThan(30000); // Should complete within LSP timeout

    await client.closeDocument(uri);
  }, 30000);

  it("patch applies formatting after replacement", async () => {
    const testFile = path.join(tmpDir, "format_test.tl");
    fs.writeFileSync(
      testFile,
      "(define   (f)  :  i64   (+ 1   2))",
      "utf-8"
    );

    if (!client) {
      client = new TypeLispLspClient(typelispPath, [tmpDir]);
      await client.start();
    }

    const uri = "file://" + testFile;
    const text = fs.readFileSync(testFile, "utf-8");
    await client.openDocument(uri, text);

    const result = await client.patch(uri, "(+ 1   2)", "(+ 3   4)");
    expect(result.success).toBe(true);
    // Should be formatted with consistent spacing
    expect(result.text).toContain("(define (f) : i64");

    await client.closeDocument(uri);
  }, 10000);

  it("replaceBody accepts nested let expressions", async () => {
    const testFile = path.join(tmpDir, "let_test.tl");
    fs.writeFileSync(
      testFile,
      `(define (main) : i64\n  (begin\n    (set! x 1)\n    (+ x 1)))`,
      "utf-8"
    );

    if (!client) {
      client = new TypeLispLspClient(typelispPath, [tmpDir]);
      await client.start();
    }

    const uri = "file://" + testFile;
    const text = fs.readFileSync(testFile, "utf-8");
    await client.openDocument(uri, text);

    const newBody = `(let
  [dt : f64 0.016]
  (begin
    (set! x 1)
    (+ x 1)))`;

    const result = await client.replaceBody(uri, "main", newBody);
    expect(result.success).toBe(true);
    expect(result.text).toContain("[dt : f64 0.016]");

    await client.closeDocument(uri);
  }, 10000);
});
