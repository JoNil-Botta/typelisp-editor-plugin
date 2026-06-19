import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { TypeLispLspClient } from "./lsp-client.js";
import * as fs from "fs";
import * as path from "path";

// Global client cache to avoid restarting server for every tool call
let globalClient: TypeLispLspClient | null = null;
let globalClientPromise: Promise<TypeLispLspClient> | null = null;

async function getClient(typelispPath?: string, stdlibRoots?: string[]): Promise<TypeLispLspClient> {
  if (globalClient && globalClientPromise) {
    return globalClient;
  }

  const tlPath = typelispPath || findTypelisp();
  const roots = stdlibRoots || ["."];

  globalClient = new TypeLispLspClient(tlPath, roots);
  globalClientPromise = globalClient.start().then(() => globalClient!);

  // Keep server alive for the process lifetime
  process.on("exit", () => globalClient?.stop());

  return globalClientPromise;
}

function findTypelisp(): string {
  const candidates = [
    path.join(process.env.HOME || "", "workspace", "typelisp", "target", "stage0", "typelisp"),
    path.join(process.env.HOME || "", "workspace", "typelisp", "target", "stage1-built"),
    "typelisp",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "typelisp";
}

function makeUri(filePath: string): string {
  const abs = path.resolve(filePath);
  return "file://" + abs;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function writeFile(filePath: string, text: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, text, "utf-8");
  fs.renameSync(tmp, filePath);
}

export default defineToolPlugin({
  id: "typelisp-editor",
  name: "TypeLisp Editor",
  description: "Structural editing tools for TypeLisp (.tl) files via LSP.",
  configSchema: Type.Object({
    typelispPath: Type.Optional(Type.String({ description: "Path to typelisp binary." })),
    stdlibRoots: Type.Optional(Type.Array(Type.String(), { description: "Additional stdlib roots." })),
  }),
  tools: (tool) => [
    tool({
      name: "typelisp_edit_check",
      label: "Check TypeLisp File",
      description: "Compile-check a .tl file without writing changes. Returns parse/type errors if any.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to check." }),
      }),
      execute: async ({ file }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.format(uri);
        if (result.error) {
          return { success: false, error: result.error };
        }
        return { success: true, message: `${file}: OK` };
      },
    }),

    tool({
      name: "typelisp_edit_list",
      label: "List TypeLisp Functions",
      description: "List all top-level forms (functions, structs, etc.) in a .tl file.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file." }),
      }),
      execute: async ({ file }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const functions = await client.listFunctions(uri);
        return { functions };
      },
    }),

    tool({
      name: "typelisp_edit_append",
      label: "Append TypeLisp Form",
      description: "Append a new top-level form to the end of a .tl file. Validates before writing.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        form: Type.String({ description: "The new form text (e.g., '(define (foo ...) ...)' )." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, form, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.appendFunction(uri, form);
        if (!result.success) {
          return { success: false, error: result.error || "appendFunction failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Appended form to ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_replace",
      label: "Replace TypeLisp Form",
      description: "Replace a top-level form by name with new text.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.String({ description: "Name of the form to replace." }),
        new_form: Type.String({ description: "New form text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, new_form, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.replaceFunction(uri, name, new_form);
        if (!result.success) {
          return { success: false, error: result.error || "replaceFunction failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Replaced '${name}' in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_replace_body",
      label: "Replace TypeLisp Function Body",
      description: "Replace the body of a function, keeping its signature.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.String({ description: "Name of the function." }),
        new_body: Type.String({ description: "New body text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, new_body, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.replaceBody(uri, name, new_body);
        if (!result.success) {
          return { success: false, error: result.error || "replaceBody failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Replaced body of '${name}' in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_replace_pattern",
      label: "Replace Pattern in TypeLisp Function",
      description: "Whole-word pattern replacement within a function body.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.String({ description: "Name of the function." }),
        old_pattern: Type.String({ description: "Pattern to replace." }),
        new_pattern: Type.String({ description: "Replacement text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, old_pattern, new_pattern, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.replacePattern(uri, name, old_pattern, new_pattern);
        if (!result.success) {
          return { success: false, error: result.error || "replacePattern failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Replaced pattern in '${name}' in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_delete",
      label: "Delete TypeLisp Form",
      description: "Delete a top-level form by name.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.String({ description: "Name of the form to delete." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.deleteFunction(uri, name);
        if (!result.success) {
          return { success: false, error: result.error || "deleteFunction failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Deleted '${name}' from ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_format",
      label: "Format TypeLisp File",
      description: "Format a .tl file in-place using the LSP formatter.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to format." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.format(uri);
        if (!result.success) {
          return { success: false, error: result.error || "format failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Formatted ${file}` };
      },
    }),
  ],
});
