import fs from "node:fs";
import path from "node:path";
import fs$1 from "node:fs/promises";
//#region src/agents/session-dirs.ts
/**
* Agent session directory discovery helpers.
* Lists per-agent `sessions` directories under state roots in sorted order for
* callers that scan persisted session stores.
*/
function mapAgentSessionDirs(agentsDir, entries) {
	return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(agentsDir, entry.name, "sessions")).toSorted((a, b) => a.localeCompare(b));
}
/** Lists per-agent session directories under an agents state directory. */
async function resolveAgentSessionDirsFromAgentsDir(agentsDir) {
	let entries;
	try {
		entries = await fs$1.readdir(agentsDir, { withFileTypes: true });
	} catch (err) {
		if (err.code === "ENOENT") return [];
		throw err;
	}
	return mapAgentSessionDirs(agentsDir, entries);
}
/** Synchronous variant of per-agent session directory discovery. */
function resolveAgentSessionDirsFromAgentsDirSync(agentsDir) {
	let entries;
	try {
		entries = fs.readdirSync(agentsDir, { withFileTypes: true });
	} catch (err) {
		if (err.code === "ENOENT") return [];
		throw err;
	}
	return mapAgentSessionDirs(agentsDir, entries);
}
/** Lists per-agent session directories under a state directory. */
async function resolveAgentSessionDirs(stateDir) {
	return await resolveAgentSessionDirsFromAgentsDir(path.join(stateDir, "agents"));
}
//#endregion
export { resolveAgentSessionDirsFromAgentsDir as n, resolveAgentSessionDirsFromAgentsDirSync as r, resolveAgentSessionDirs as t };
