import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { TypeLispLspClient } from "./lsp-client.js";
import * as fs from "fs";
import * as path from "path";
// Global client cache to avoid restarting server for every tool call
let globalClient = null;
let globalClientPromise = null;
function isProcessAlive(proc) {
    if (!proc)
        return false;
    if (proc.killed)
        return false;
    if (proc.exitCode !== null)
        return false;
    if (proc.signalCode !== null)
        return false;
    return true;
}
async function getClient(typelispPath, stdlibRoots, filePath) {
    if (globalClient && globalClientPromise) {
        if (isProcessAlive(globalClient.getProcess())) {
            // Health check: try a quick ping to verify server is responsive
            try {
                await Promise.race([
                    globalClient.listFunctions("file:///health-check.tl"),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Health check timeout")), 2000)),
                ]);
                return globalClient;
            }
            catch {
                console.warn("TypeLisp LSP client health check failed, restarting server");
                try {
                    globalClient.stop();
                }
                catch (_) { }
                globalClient = null;
                globalClientPromise = null;
            }
        }
        else {
            globalClient = null;
            globalClientPromise = null;
        }
    }
    const tlPath = typelispPath || findTypelisp();
    // Resolve stdlib roots: if a file is provided, include its directory
    const roots = new Set();
    for (const r of (stdlibRoots || ["."])) {
        roots.add(path.resolve(r));
    }
    if (filePath) {
        roots.add(path.dirname(path.resolve(filePath)));
    }
    globalClient = new TypeLispLspClient(tlPath, Array.from(roots));
    globalClientPromise = globalClient.start().then(() => globalClient);
    process.on("exit", () => globalClient?.stop());
    return globalClientPromise;
}
function findTypelisp() {
    const candidates = [
        path.join(process.env.HOME || "", "workspace", "typelisp", "target", "stage0", "typelisp"),
        path.join(process.env.HOME || "", "workspace", "typelisp", "target", "stage1-built"),
        "typelisp",
    ];
    for (const c of candidates) {
        if (fs.existsSync(c))
            return c;
    }
    return "typelisp";
}
function makeUri(filePath) {
    const abs = path.resolve(filePath);
    return "file://" + abs;
}
function readFile(filePath) {
    return fs.readFileSync(filePath, "utf-8");
}
function writeFile(filePath, text) {
    const tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, text, "utf-8");
    fs.renameSync(tmp, filePath);
}
function parsePatchText(patchText) {
    const edits = [];
    const lines = patchText.split("\n");
    let i = 0;
    while (i < lines.length) {
        // Look for "*** Begin Patch" or "*** Update File:"
        if (lines[i].trim().startsWith("*** Update File:")) {
            const filePath = lines[i].trim().slice("*** Update File:".length).trim();
            i++;
            // Skip header lines (---, +++, @@)
            while (i < lines.length && !lines[i].trim().startsWith("*** ")) {
                if (lines[i].startsWith("@@")) {
                    // Start of a hunk - read until next hunk or end
                    i++;
                    const hunkLines = [];
                    while (i < lines.length && !lines[i].startsWith("@@") && !lines[i].trim().startsWith("*** ")) {
                        hunkLines.push(lines[i]);
                        i++;
                    }
                    // Parse hunk to extract old/new text
                    // For simplicity, we look for contiguous - and + lines
                    const oldLines = [];
                    const newLines = [];
                    for (const line of hunkLines) {
                        if (line.startsWith("- ")) {
                            oldLines.push(line.slice(2));
                        }
                        else if (line.startsWith("+ ")) {
                            newLines.push(line.slice(2));
                        }
                        else if (line.startsWith(" ")) {
                            // Context line - part of both
                            oldLines.push(line.slice(1));
                            newLines.push(line.slice(1));
                        }
                        else {
                            // Context line without space prefix
                            oldLines.push(line);
                            newLines.push(line);
                        }
                    }
                    if (oldLines.length > 0) {
                        edits.push({
                            filePath,
                            oldText: oldLines.join("\n"),
                            newText: newLines.join("\n"),
                        });
                    }
                }
                else {
                    i++;
                }
            }
        }
        else {
            i++;
        }
    }
    return edits;
}
// Simpler patch parser for the common case: oldText/newText pairs
function parseSimplePatch(patchText) {
    const oldMarker = "--- a/";
    const newMarker = "+++ b/";
    // Find the hunk markers
    const lines = patchText.split("\n");
    let inHunk = false;
    const oldLines = [];
    const newLines = [];
    for (const line of lines) {
        if (line.startsWith("@@")) {
            inHunk = true;
            continue;
        }
        if (!inHunk)
            continue;
        if (line.startsWith("- ")) {
            oldLines.push(line.slice(2));
        }
        else if (line.startsWith("+ ")) {
            newLines.push(line.slice(2));
        }
        else if (line.startsWith(" ")) {
            oldLines.push(line.slice(1));
            newLines.push(line.slice(1));
        }
        else if (line.trim() === "" || line.startsWith("*** ")) {
            break;
        }
        else {
            oldLines.push(line);
            newLines.push(line);
        }
    }
    if (oldLines.length === 0)
        return null;
    return {
        oldText: oldLines.join("\n"),
        newText: newLines.join("\n"),
    };
}
// Apply a simple find-and-replace patch to a file
function applySimplePatch(fileText, oldText, newText) {
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
// Helper: open document, execute operation, then close to prevent memory leaks
async function withDocument(client, uri, text, operation) {
    await client.openDocument(uri, text);
    try {
        const result = await operation();
        return result;
    }
    finally {
        try {
            await client.closeDocument(uri);
        }
        catch (_) {
            // Ignore close errors
        }
    }
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.check(uri));
                if (result.error) {
                    return { success: false, error: result.error };
                }
                if (!result.success) {
                    return { success: false, error: result.error || "Typecheck failed" };
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const functions = await withDocument(client, uri, text, () => client.listFunctions(uri));
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.appendFunction(uri, form));
                if (!result.success) {
                    return { success: false, error: result.error || "appendFunction failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                return { success: true, message: `Appended form to ${file}` };
            },
        }),
        tool({
            name: "typelisp_edit_insert_after",
            label: "Insert TypeLisp Form After",
            description: "Insert a new form after an existing one. Pass either 'name' (to insert after a named form) or 'position' (to insert after a specific position).",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file to edit." }),
                name: Type.Optional(Type.String({ description: "Name of the form to insert after (alternative to position)." })),
                position: Type.Optional(Type.Object({ line: Type.Number(), character: Type.Number() }, { description: "Cursor position {line, character} (alternative to name)." })),
                kind: Type.Optional(Type.String({ description: "Filter by kind when using name: function, struct, enum, macro, dispatch." })),
                new_form: Type.String({ description: "New form text to insert." }),
                dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
            }),
            execute: async ({ file, name, position, kind, new_form, dry_run }, config) => {
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, async () => {
                    let pos = position;
                    if (name && !pos) {
                        const found = await client.findPosition(uri, name, kind);
                        if (!found) {
                            return { success: false, error: `Form '${name}' not found${kind ? ` (kind: ${kind})` : ""}` };
                        }
                        pos = found;
                    }
                    if (!pos) {
                        return { success: false, error: "Either 'name' or 'position' is required." };
                    }
                    return client.insertAfter(uri, pos, new_form);
                });
                if (!result.success) {
                    return { success: false, error: result.error || "insertAfter failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                const desc = name ? `after '${name}'` : `after position (${position?.line ?? 0}, ${position?.character ?? 0})`;
                return { success: true, message: `Inserted form ${desc} in ${file}` };
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.replaceFunction(uri, name, new_form, position));
                if (!result.success) {
                    return { success: false, error: result.error || "replaceFunction failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
                return { success: true, message: `Replaced ${desc} in ${file}` };
            },
        }),
        tool({
            name: "typelisp_edit_patch",
            label: "Patch TypeLisp File",
            description: "Find and replace text anywhere in a .tl file, with form validation.",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file to edit." }),
                oldText: Type.String({ description: "Exact text to find (must be unique)." }),
                newText: Type.String({ description: "Replacement text." }),
                dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
            }),
            execute: async ({ file, oldText, newText, dry_run }, config) => {
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.patch(uri, oldText, newText));
                if (!result.success) {
                    return { success: false, error: result.error || "patch failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                return { success: true, message: `Patched ${file}` };
            },
        }),
        tool({
            name: "typelisp_edit_apply_patch",
            label: "Apply Patch to TypeLisp File",
            description: "Apply a unified diff patch to one or more .tl files. Uses direct text replacement (no LSP) so it works on files of any size and outside the sandbox.",
            parameters: Type.Object({
                input: Type.String({ description: "Patch text in *** Begin Patch / *** End Patch format." }),
                dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
                check: Type.Optional(Type.Boolean({ description: "Compile-check each modified file after applying (requires typelisp)." })),
            }),
            execute: async ({ input, dry_run, check }, config) => {
                // Parse the patch to find file path and old/new text
                const parsed = parseSimplePatch(input);
                if (!parsed) {
                    return { success: false, error: "Could not parse patch. Expected unified diff format with @@ hunk markers." };
                }
                // Extract file path from patch header
                const fileMatch = input.match(/\*\*\* Update File:\s*(.+)/);
                const filePath = fileMatch ? fileMatch[1].trim() : null;
                if (!filePath) {
                    return { success: false, error: "Patch must include '*** Update File: <path>' header." };
                }
                const text = readFile(filePath);
                const result = applySimplePatch(text, parsed.oldText, parsed.newText);
                if (!result.success) {
                    return { success: false, error: result.error };
                }
                // Optional compile-check
                let checkResult;
                if (check) {
                    try {
                        const client = await getClient(config.typelispPath, config.stdlibRoots, filePath);
                        const uri = makeUri(filePath);
                        const checkRes = await withDocument(client, uri, result.text, () => client.check(uri));
                        checkResult = checkRes.success ? "OK" : (checkRes.error || "Check failed");
                    }
                    catch (e) {
                        checkResult = `Check error: ${e.message}`;
                    }
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text }, checkResult };
                }
                writeFile(filePath, result.text);
                return { success: true, message: `Applied patch to ${filePath}`, checkResult };
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => name
                    ? client.replaceBody(uri, name, new_body)
                    : client.replaceBodyAt(uri, position, new_body));
                if (!result.success) {
                    return { success: false, error: result.error || "replaceBody failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => name
                    ? client.replacePattern(uri, name, old_pattern, new_pattern)
                    : client.replacePatternAt(uri, position, old_pattern, new_pattern));
                if (!result.success) {
                    return { success: false, error: result.error || "replacePattern failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => name
                    ? client.deleteFunction(uri, name)
                    : client.deleteFunctionAt(uri, position));
                if (!result.success) {
                    return { success: false, error: result.error || "deleteFunction failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.format(uri));
                if (!result.success) {
                    return { success: false, error: result.error || "format failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.readFormAt(uri, position, outer ?? 0));
                if (!result.success) {
                    return { success: false, error: result.error || "readFormAt failed" };
                }
                return { success: true, form: result.form };
            },
        }),
        tool({
            name: "typelisp_edit_move",
            label: "Move TypeLisp Form",
            description: "Move a top-level form by name or at a position. Pass either 'destination' (name of form to move after) or 'direction' ('up'/'down' for adjacent swap).",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file to edit." }),
                name: Type.Optional(Type.String({ description: "Name of the top-level form to move." })),
                position: Type.Optional(Type.Object({
                    line: Type.Number({ description: "0-indexed line number." }),
                    character: Type.Number({ description: "0-indexed character offset." }),
                }, { description: "Position-based move (alternative to name)." })),
                destination: Type.Optional(Type.String({ description: "Name of the form to move after (alternative to direction)." })),
                direction: Type.Optional(Type.String({ description: "Direction to move: 'up' or 'down' (alternative to destination)." })),
                dry_run: Type.Optional(Type.Boolean({ description: "Preview diff without writing." })),
            }),
            execute: async ({ file, name, position, destination, direction, dry_run }, config) => {
                if (!name && !position) {
                    return { success: false, error: "Either 'name' or 'position' is required." };
                }
                if (!destination && !direction) {
                    return { success: false, error: "Either 'destination' or 'direction' is required." };
                }
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.move(uri, name, position, direction, destination));
                if (!result.success) {
                    return { success: false, error: result.error || "move failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
                const moveDesc = destination ? `after '${destination}'` : `${direction}`;
                return { success: true, message: `Moved ${desc} ${moveDesc} in ${file}` };
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
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.rename(uri, name, position, new_name));
                if (!result.success) {
                    return { success: false, error: result.error || "rename failed" };
                }
                if (dry_run) {
                    return { success: true, dryRun: true, diff: { old: text, new: result.text } };
                }
                writeFile(file, result.text);
                const desc = position ? `at line ${position.line}, col ${position.character}` : `'${name}'`;
                return { success: true, message: `Renamed ${desc} to '${new_name}' in ${file}` };
            },
        }),
        tool({
            name: "typelisp_edit_expand_macro",
            label: "Expand TypeLisp Macro",
            description: "Get the text of a top-level form by name (macro expansion placeholder).",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file." }),
                name: Type.String({ description: "Name of the form to expand." }),
            }),
            execute: async ({ file, name }, config) => {
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.expandMacro(uri, name));
                if (!result.success) {
                    return { success: false, error: result.error || "expandMacro failed" };
                }
                return { success: true, form: result.text };
            },
        }),
        tool({
            name: "typelisp_edit_get_type",
            label: "Get TypeLisp Type",
            description: "Get the type of the expression at a cursor position.",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file." }),
                position: Type.Object({
                    line: Type.Number({ description: "0-indexed line number." }),
                    character: Type.Number({ description: "0-indexed character offset." }),
                }),
            }),
            execute: async ({ file, position }, config) => {
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.getType(uri, position));
                if (!result.success) {
                    return { success: false, error: result.error || "getType failed" };
                }
                return { success: true, type: result.type };
            },
        }),
        tool({
            name: "typelisp_edit_find_references",
            label: "Find TypeLisp References",
            description: "Find all references to a name in a .tl file.",
            parameters: Type.Object({
                file: Type.String({ description: "Path to the .tl file." }),
                name: Type.String({ description: "Name to find references for." }),
            }),
            execute: async ({ file, name }, config) => {
                const client = await getClient(config.typelispPath, config.stdlibRoots, file);
                const uri = makeUri(file);
                const text = readFile(file);
                const result = await withDocument(client, uri, text, () => client.findReferences(uri, name));
                if (!result.success) {
                    return { success: false, error: result.error || "findReferences failed" };
                }
                return { success: true, references: result.references };
            },
        }),
    ],
});
