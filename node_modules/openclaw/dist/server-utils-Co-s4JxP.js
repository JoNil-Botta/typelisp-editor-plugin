import { c as normalizeOptionalString } from "./string-coerce-mnp54Vah.js";
import { y as resolveStateDir } from "./paths-mvMm5bYV.js";
import { d as normalizeTrimmedStringList } from "./string-normalization-WNUDCpXX.js";
import { t as createAsyncLock } from "./async-lock-CaiUOILd.js";
import { m as writeJson, o as tryReadJson } from "./json-files-2umMHm0W.js";
import path from "node:path";
//#region src/infra/voicewake.ts
const DEFAULT_TRIGGERS = [
	"openclaw",
	"claude",
	"computer"
];
function resolvePath(baseDir) {
	const root = baseDir ?? resolveStateDir();
	return path.join(root, "settings", "voicewake.json");
}
function sanitizeTriggers(triggers) {
	const cleaned = (triggers ?? []).map((w) => normalizeOptionalString(w) ?? "").filter((w) => w.length > 0);
	return cleaned.length > 0 ? cleaned : DEFAULT_TRIGGERS;
}
const withLock = createAsyncLock();
/** Return the built-in voice wake trigger list. */
function defaultVoiceWakeTriggers() {
	return [...DEFAULT_TRIGGERS];
}
/** Load persisted voice wake triggers, falling back to defaults. */
async function loadVoiceWakeConfig(baseDir) {
	const existing = await tryReadJson(resolvePath(baseDir));
	if (!existing) return {
		triggers: defaultVoiceWakeTriggers(),
		updatedAtMs: 0
	};
	return {
		triggers: sanitizeTriggers(existing.triggers),
		updatedAtMs: typeof existing.updatedAtMs === "number" && existing.updatedAtMs > 0 ? existing.updatedAtMs : 0
	};
}
/** Persist the configured voice wake trigger list. */
async function setVoiceWakeTriggers(triggers, baseDir) {
	const sanitized = sanitizeTriggers(triggers);
	const filePath = resolvePath(baseDir);
	return await withLock(async () => {
		const next = {
			triggers: sanitized,
			updatedAtMs: Date.now()
		};
		await writeJson(filePath, next);
		return next;
	});
}
//#endregion
//#region src/gateway/server-utils.ts
/** Normalizes voice-wake trigger config with bounded count/length and defaults. */
function normalizeVoiceWakeTriggers(input) {
	const cleaned = normalizeTrimmedStringList(input).slice(0, 32).map((value) => value.slice(0, 64));
	return cleaned.length > 0 ? cleaned : defaultVoiceWakeTriggers();
}
/** Formats unknown gateway errors without throwing on unusual status/code shapes. */
function formatError(err) {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	const statusValue = err?.status;
	const codeValue = err?.code;
	if (statusValue !== void 0 || codeValue !== void 0) return `status=${typeof statusValue === "string" || typeof statusValue === "number" ? String(statusValue) : "unknown"} code=${typeof codeValue === "string" || typeof codeValue === "number" ? String(codeValue) : "unknown"}`;
	try {
		return JSON.stringify(err, null, 2);
	} catch {
		return String(err);
	}
}
//#endregion
export { setVoiceWakeTriggers as i, normalizeVoiceWakeTriggers as n, loadVoiceWakeConfig as r, formatError as t };
