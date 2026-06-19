import { appendFileSync, writeFileSync } from "node:fs";
import fs$1 from "node:fs/promises";
//#region src/config/sessions/version.ts
/** Current persisted session transcript/header schema version. */
const CURRENT_SESSION_VERSION = 3;
//#endregion
//#region src/config/sessions/transcript-jsonl.ts
/** Serializes one JSONL entry and appends the newline terminator. */
function serializeJsonlEntry(entry) {
	return `${serializeJsonlLine(entry)}\n`;
}
function serializeJsonlLine(entry) {
	return JSON.stringify(entry);
}
function serializeJsonlEntries(entries) {
	return serializeJsonlLines(entries.map(serializeJsonlLine));
}
function serializeJsonlLines(lines) {
	return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}
function writeJsonlEntriesSync(filePath, entries) {
	writeFileSync(filePath, serializeJsonlEntries(entries), "utf-8");
}
function appendJsonlEntrySync(filePath, entry) {
	appendFileSync(filePath, serializeJsonlEntry(entry), "utf-8");
}
async function writeJsonlEntry(filePath, entry, options) {
	await fs$1.writeFile(filePath, serializeJsonlEntry(entry), {
		encoding: options?.encoding ?? "utf-8",
		...options?.flag ? { flag: options.flag } : {},
		...options?.mode !== void 0 ? { mode: options.mode } : {}
	});
}
async function writeJsonlLines(filePath, lines, options) {
	await fs$1.writeFile(filePath, serializeJsonlLines(lines), {
		encoding: options?.encoding ?? "utf-8",
		...options?.flag ? { flag: options.flag } : {},
		...options?.mode !== void 0 ? { mode: options.mode } : {}
	});
}
async function appendJsonlEntry(filePath, entry) {
	await fs$1.appendFile(filePath, serializeJsonlEntry(entry), "utf-8");
}
//#endregion
export { writeJsonlEntry as a, writeJsonlEntriesSync as i, appendJsonlEntrySync as n, writeJsonlLines as o, serializeJsonlLine as r, CURRENT_SESSION_VERSION as s, appendJsonlEntry as t };
