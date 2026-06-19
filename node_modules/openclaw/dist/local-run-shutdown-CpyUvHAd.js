import { y as parseStrictNonNegativeInteger } from "./number-coercion-CJQ8TR--.js";
import "./parse-finite-number-Z7n6tXLk.js";
//#region src/tui/local-run-shutdown.ts
const LOCAL_RUN_SHUTDOWN_GRACE_MS = 12e4;
/** Resolves the hard-exit grace period for local TUI shutdown. */
function resolveLocalRunShutdownGraceMs() {
	const raw = process.env.OPENCLAW_TUI_LOCAL_RUN_SHUTDOWN_GRACE_MS?.trim();
	const parsed = parseStrictNonNegativeInteger(raw);
	if (parsed !== void 0) return parsed;
	return LOCAL_RUN_SHUTDOWN_GRACE_MS;
}
//#endregion
export { resolveLocalRunShutdownGraceMs as t };
