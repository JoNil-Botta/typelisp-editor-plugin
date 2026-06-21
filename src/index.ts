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
      name: "typelisp_edit_insert",
      label: "Insert TypeLisp Form",
      description: "Insert a new form after the form at a given position.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        position: Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }),
        form: Type.String({ description: "The new form text (e.g., '(define (foo ...) ...)' )." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, position, form, dry_run }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.insertAfter(uri, position, form);
        if (!result.success) {
          return { success: false, error: result.error || "insertAfter failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        return { success: true, message: `Inserted form after position (${position.line}, ${position.character}) in ${file}` };
      },
    }),
    tool({
      name: "typelisp_edit_replace",
      label: "Replace TypeLisp Form",
      description: "Replace a form by name (top-level) or at a position (any level).",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Name of the top-level form to replace." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based replacement (alternative to name)." })),
        new_form: Type.String({ description: "New form text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, new_form, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.replaceFunction(uri, name, new_form, position);
        if (!result.success) {
          return { success: false, error: result.error || "replaceFunction failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Replaced ${desc} in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_replace_body",
      label: "Replace TypeLisp Function Body",
      description: "Replace the body of a function by name or at a position.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Name of the function." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based replacement (alternative to name)." })),
        new_body: Type.String({ description: "New body text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, new_body, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = name
          ? await client.replaceBody(uri, name, new_body)
          : await client.replaceBodyAt(uri, position!, new_body);
        if (!result.success) {
          return { success: false, error: result.error || "replaceBody failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Replaced body of ${desc} in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_replace_pattern",
      label: "Replace Pattern in TypeLisp Function",
      description: "Whole-word pattern replacement within a function body by name or at a position.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Name of the function." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based replacement (alternative to name)." })),
        old_pattern: Type.String({ description: "Pattern to replace." }),
        new_pattern: Type.String({ description: "Replacement text." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, old_pattern, new_pattern, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = name
          ? await client.replacePattern(uri, name, old_pattern, new_pattern)
          : await client.replacePatternAt(uri, position!, old_pattern, new_pattern);
        if (!result.success) {
          return { success: false, error: result.error || "replacePattern failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Replaced pattern in ${desc} in ${file}` };
      },
    }),

    tool({
      name: "typelisp_edit_delete",
      label: "Delete TypeLisp Form",
      description: "Delete a form by name (top-level) or at a position (any level).",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Name of the top-level form to delete." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based deletion (alternative to name)." })),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = name
          ? await client.deleteFunction(uri, name)
          : await client.deleteFunctionAt(uri, position!);
        if (!result.success) {
          return { success: false, error: result.error || "deleteFunction failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Deleted ${desc} from ${file}` };
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
    tool({
      name: "typelisp_edit_read",
      label: "Read TypeLisp Form",
      description: "Read the form at a given position in a .tl file. Optionally returns an outer enclosing form.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file." }),
        position: Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }),
        outer: Type.Optional(Type.Number({ description: "How many levels outward to go (0 = innermost form, 1 = enclosing form, etc.)." })),
      }),
      execute: async ({ file, position, outer }, config) => {
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.readFormAt(uri, position, outer ?? 0);
        if (!result.success) {
          return { success: false, error: result.error || "readFormAt failed" };
        }
        return { success: true, form: result.form };
      },
    }),
    tool({
      name: "typelisp_edit_structural_move",
      label: "Move TypeLisp Form",
      description: "Move a top-level form up or down by name or at a position.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Name of the top-level form to move." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based move (alternative to name)." })),
        direction: Type.String({ description: "Direction to move: 'up' or 'down'." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, direction, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.structuralMove(uri, name, position, direction);
        if (!result.success) {
          return { success: false, error: result.error || "structuralMove failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Moved ${desc} ${direction} in ${file}` };
      },
    }),
    tool({
      name: "typelisp_edit_rename",
      label: "Rename in TypeLisp File",
      description: "Rename all occurrences of a name by old name or at a position.",
      parameters: Type.Object({
        file: Type.String({ description: "Path to the .tl file to edit." }),
        name: Type.Optional(Type.String({ description: "Old name to replace." })),
        position: Type.Optional(Type.Object({
          line: Type.Number({ description: "0-indexed line number." }),
          character: Type.Number({ description: "0-indexed character offset." }),
        }, { description: "Position-based rename (alternative to name)." })),
        new_name: Type.String({ description: "New name to replace with." }),
        dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
      }),
      execute: async ({ file, name, position, new_name, dry_run }, config) => {
        if (!name && !position) {
          return { success: false, error: "Either 'name' or 'position' is required." };
        }
        const client = await getClient(config.typelispPath, config.stdlibRoots);
        const uri = makeUri(file);
        const text = readFile(file);
        await client.openDocument(uri, text);

        const result = await client.rename(uri, name, position, new_name);
        if (!result.success) {
          return { success: false, error: result.error || "rename failed" };
        }

        if (dry_run) {
          return { success: true, dryRun: true, diff: { old: text, new: result.text } };
        }

        writeFile(file, result.text!);
        const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
        return { success: true, message: `Renamed ${desc} to '${new_name}' in ${file}` };
      },
    }),
  ],
});
