import { describe, expect, it, beforeAll, afterAll } from "vitest";
import entry from "./index.js";
import { getToolPluginMetadata } from "openclaw/plugin-sdk/tool-plugin";
import { TypeLispLspClient } from "./lsp-client.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Helper: parse patch text (re-exported from index.ts for testing)
function parseSimplePatch(patchText: string): { oldText: string; newText: string } | null {
  const lines = patchText.split("\n");
  let inHunk = false;
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;

    if (line.startsWith("- ")) {
      oldLines.push(line.slice(2));
    } else if (line.startsWith("+ ")) {
      newLines.push(line.slice(2));
    } else if (line.startsWith(" ")) {
      oldLines.push(line.slice(1));
      newLines.push(line.slice(1));
    } else if (line.trim() === "" || line.startsWith("*** ")) {
      break;
    } else {
      oldLines.push(line);
      newLines.push(line);
    }
  }

  if (oldLines.length === 0) return null;

  return {
    oldText: oldLines.join("\n"),
    newText: newLines.join("\n"),
  };
}

function applySimplePatch(fileText: string, oldText: string, newText: string): { success: boolean; text?: string; error?: string } {
  if (oldText === "") {
    return { success: false, error: "oldText cannot be empty" };
  }

  const count = (fileText.split(oldText).length - 1);
  if (count === 0) {
    return { success: false, error: "oldText not found in document" };
  }
  if (count > 1) {
    return { success: false, error: "oldText occurs more than once in document" };
  }

  const replaced = fileText.replace(oldText, newText);
  return { success: true, text: replaced };
}

describe("typelisp-editor-plugin", () => {
  it("declares tool metadata including apply_patch", () => {
    const tools = getToolPluginMetadata(entry)?.tools.map((tool) => tool.name);
    expect(tools).toContain("typelisp_edit_apply_patch");
    expect(tools).toContain("typelisp_edit_patch");
    expect(tools).toContain("typelisp_edit_replace_body");
  });
});

describe("parseSimplePatch", () => {
  it("parses a unified diff hunk", () => {
    const patch = `*** Begin Patch
*** Update File: test.tl
--- a/test.tl
+++ b/test.tl
@@ -1,3 +1,3 @@
 (define (foo) : i64
-  1)
+  2)
`;
    const result = parseSimplePatch(patch);
    expect(result).not.toBeNull();
    expect(result!.oldText).toBe("(define (foo) : i64\n 1)");
    expect(result!.newText).toBe("(define (foo) : i64\n 2)");
  });

  it("returns null for invalid patch", () => {
    const result = parseSimplePatch("not a patch");
    expect(result).toBeNull();
  });
});

describe("applySimplePatch", () => {
  it("replaces unique text", () => {
    const result = applySimplePatch("(define (foo) : i64 1)", "1", "2");
    expect(result.success).toBe(true);
    expect(result.text).toBe("(define (foo) : i64 2)");
  });

  it("rejects empty oldText", () => {
    const result = applySimplePatch("text", "", "new");
    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be empty");
  });

  it("rejects missing oldText", () => {
    const result = applySimplePatch("text", "missing", "new");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("rejects duplicate oldText", () => {
    const result = applySimplePatch("a a a", "a", "b");
    expect(result.success).toBe(false);
    expect(result.error).toContain("more than once");
  });

  it("handles multi-line replacements", () => {
    const oldText = `(when (is-playing?)
  (player-update))`;
    const newText = `(cond
  [(is-playing?)
   (player-update)])`;
    const file = `(define (main) : i64\n${oldText}\n  0)`;
    const result = applySimplePatch(file, oldText, newText);
    expect(result.success).toBe(true);
    expect(result.text).toContain("cond");
    expect(result.text).not.toContain("when (is-playing?)");
  });
});

describe("LSP client timeout behavior", () => {
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

  it("patch completes without formatting large files", async () => {
    // Create a large file (2000 lines) - format that won't be reformatted
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

    // Patch should complete quickly (< 5s) since we removed full-file formatting
    const start = Date.now();
    const result = await client.patch(uri, "(define (func-1000) : i64\n  1000)", "(define (func-1000) : i64\n  9999)");
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.text).toContain("(define (func-1000) : i64\n  9999)");
    expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds

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

    // This should NOT reject the nested let as invalid syntax
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
