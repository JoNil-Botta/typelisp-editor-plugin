import { a as normalizeLowercaseStringOrEmpty, s as normalizeOptionalLowercaseString } from "./string-coerce-mnp54Vah.js";
import { r as asOptionalObjectRecord } from "./record-coerce-DHZ4bFlT.js";
//#region src/agents/tool-mutation.ts
/**
* Tool mutation classification and fingerprinting.
*
* Identifies mutating tool calls and file targets so retry/recovery logic can reason about side effects.
*/
const MUTATING_TOOL_NAMES = new Set([
	"write",
	"edit",
	"apply_patch",
	"exec",
	"bash",
	"process",
	"message",
	"sessions_spawn",
	"sessions_send",
	"cron",
	"gateway",
	"canvas",
	"nodes",
	"session_status",
	"create_goal",
	"update_goal"
]);
const FILE_MUTATING_TOOL_NAMES = new Set(["edit", "write"]);
const FILE_TARGET_PATH_ARG_KEYS = [
	"path",
	"file_path",
	"filePath",
	"filepath",
	"file"
];
const FILE_TARGET_OLDPATH_ARG_KEYS = ["oldPath", "old_path"];
const READ_ONLY_ACTIONS = new Set([
	"get",
	"list",
	"read",
	"status",
	"show",
	"fetch",
	"search",
	"query",
	"view",
	"poll",
	"log",
	"inspect",
	"check",
	"probe"
]);
const PROCESS_MUTATING_ACTIONS = new Set([
	"write",
	"send_keys",
	"submit",
	"paste",
	"kill"
]);
const MESSAGE_MUTATING_ACTIONS = new Set([
	"send",
	"reply",
	"thread_reply",
	"threadreply",
	"edit",
	"delete",
	"react",
	"pin",
	"unpin"
]);
const READ_ONLY_SHELL_COMMANDS = new Set([
	"cat",
	"file",
	"grep",
	"head",
	"ls",
	"pwd",
	"rg",
	"stat",
	"tail",
	"wc"
]);
const READ_ONLY_GIT_SUBCOMMANDS = new Set([
	"diff",
	"grep",
	"log",
	"ls-files",
	"rev-parse",
	"show",
	"status"
]);
const READ_ONLY_GH_PR_SUBCOMMANDS = new Set([
	"checks",
	"diff",
	"list",
	"status",
	"view"
]);
const READ_ONLY_GH_ISSUE_SUBCOMMANDS = new Set([
	"list",
	"status",
	"view"
]);
const UNSAFE_RG_FLAGS = new Set(["--pre", "--pre-glob"]);
const UNSAFE_GIT_FLAGS = new Set([
	"--ext-diff",
	"--output",
	"-o",
	"--open-files-in-pager"
]);
function normalizeActionName(value) {
	return normalizeOptionalLowercaseString(value)?.replace(/[\s-]+/g, "_") || void 0;
}
function readShellCommand(record) {
	const command = record?.command ?? record?.cmd;
	if (typeof command !== "string") return;
	return command.trim() || void 0;
}
function tokenizeSimpleShellCommand(command) {
	if (/[;&|<>\n\r`]/.test(command) || command.includes("$(") || command.includes("\\")) return;
	const tokens = [];
	let current = "";
	let quote;
	for (const char of command) {
		if (quote) {
			if (char === quote) quote = void 0;
			else current += char;
			continue;
		}
		if (char === "'" || char === "\"") {
			quote = char;
			continue;
		}
		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}
	if (quote) return;
	if (current) tokens.push(current);
	return tokens.length > 0 ? tokens : void 0;
}
function isReadOnlySedCommand(tokens) {
	const args = tokens.slice(1);
	if (args.some((token) => token === "--in-place" || token.startsWith("--in-place="))) return false;
	if (args.some((token) => token.startsWith("-") && token !== "-" && token.includes("i"))) return false;
	if (args.some((token) => token === "-e" || token === "--expression")) return false;
	let sawSuppressAutoPrint = false;
	let expression;
	for (const token of args) {
		if (token === "--in-place" || token.startsWith("--in-place=")) return false;
		if (token === "--quiet" || token === "--silent") {
			sawSuppressAutoPrint = true;
			continue;
		}
		if (token.startsWith("-") && token !== "-") {
			if (token.includes("i")) return false;
			if (token.includes("n")) sawSuppressAutoPrint = true;
			continue;
		}
		expression ??= token;
		break;
	}
	return sawSuppressAutoPrint && expression != null && /^(\d+|\$)(,(\d+|\$))?p$/.test(expression);
}
function hasUnsafeRipgrepFlag(tokens) {
	return tokens.some((token) => {
		const normalized = normalizeLowercaseStringOrEmpty(token);
		return UNSAFE_RG_FLAGS.has(normalized) || normalized.startsWith("--pre=") || normalized.startsWith("--pre-glob=");
	});
}
function hasUnsafeGitFlag(tokens) {
	return tokens.some((token) => {
		const normalized = normalizeLowercaseStringOrEmpty(token);
		return UNSAFE_GIT_FLAGS.has(normalized) || token.startsWith("-O") || normalized.startsWith("--output=") || normalized.startsWith("--open-files-in-pager=");
	});
}
function isReadOnlyGitCommand(tokens) {
	const subcommand = normalizeLowercaseStringOrEmpty(tokens[1]);
	if (hasUnsafeGitFlag(tokens)) return false;
	if (READ_ONLY_GIT_SUBCOMMANDS.has(subcommand)) return true;
	return subcommand === "remote" && tokens.length === 3 && tokens[2] === "-v";
}
function isReadOnlyGhCommand(tokens) {
	if (tokens.some((token) => {
		const normalized = normalizeLowercaseStringOrEmpty(token);
		return normalized === "--web" || normalized.startsWith("--web=") || /^-[a-z]*w[a-z]*(?:=.*)?$/.test(normalized);
	})) return false;
	const area = normalizeLowercaseStringOrEmpty(tokens[1]);
	const action = normalizeLowercaseStringOrEmpty(tokens[2]);
	if (area === "search") return action.length > 0;
	if (area === "pr") return READ_ONLY_GH_PR_SUBCOMMANDS.has(action);
	if (area === "issue") return READ_ONLY_GH_ISSUE_SUBCOMMANDS.has(action);
	return false;
}
function isPlainReadOnlyShellCommand(command) {
	if (!command) return false;
	const tokens = tokenizeSimpleShellCommand(command);
	if (!tokens) return false;
	const executable = normalizeLowercaseStringOrEmpty(tokens[0]);
	if (executable === "rg" && hasUnsafeRipgrepFlag(tokens)) return false;
	if (READ_ONLY_SHELL_COMMANDS.has(executable)) return true;
	if (executable === "sed") return isReadOnlySedCommand(tokens);
	if (executable === "git") return isReadOnlyGitCommand(tokens);
	if (executable === "gh") return isReadOnlyGhCommand(tokens);
	return false;
}
function normalizeFingerprintValue(value) {
	if (typeof value === "string") {
		const normalized = value.trim();
		return normalized ? normalizeLowercaseStringOrEmpty(normalized) : void 0;
	}
	if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return normalizeLowercaseStringOrEmpty(String(value));
}
function appendFingerprintAlias(parts, record, label, keys) {
	for (const key of keys) {
		const value = normalizeFingerprintValue(record?.[key]);
		if (!value) continue;
		parts.push(`${label}=${value}`);
		return true;
	}
	return false;
}
function isLikelyMutatingToolName(toolName) {
	const normalized = normalizeLowercaseStringOrEmpty(toolName);
	if (!normalized) return false;
	return MUTATING_TOOL_NAMES.has(normalized) || normalized.endsWith("_actions") || normalized.startsWith("message_") || normalized.includes("send");
}
function isMutatingToolCall(toolName, args) {
	const normalized = normalizeLowercaseStringOrEmpty(toolName);
	const record = asOptionalObjectRecord(args);
	const action = normalizeActionName(record?.action);
	switch (normalized) {
		case "write":
		case "edit":
		case "apply_patch":
		case "sessions_send":
		case "create_goal":
		case "update_goal": return true;
		case "exec":
		case "bash": return !isPlainReadOnlyShellCommand(readShellCommand(record));
		case "process": return action != null && PROCESS_MUTATING_ACTIONS.has(action);
		case "message": return action != null && MESSAGE_MUTATING_ACTIONS.has(action) || typeof record?.content === "string" || typeof record?.message === "string";
		case "subagents": return action === "kill" || action === "steer";
		case "session_status": return typeof record?.model === "string" && record.model.trim().length > 0;
		default:
			if (normalized === "cron" || normalized === "gateway" || normalized === "canvas") return action == null || !READ_ONLY_ACTIONS.has(action);
			if (normalized === "nodes") return action == null || action !== "list";
			if (normalized.endsWith("_actions")) return action == null || !READ_ONLY_ACTIONS.has(action);
			if (normalized.startsWith("message_") || normalized.includes("send")) return true;
			return false;
	}
}
function buildToolActionFingerprint(toolName, args, meta) {
	if (!isMutatingToolCall(toolName, args)) return;
	const normalizedTool = normalizeLowercaseStringOrEmpty(toolName);
	const record = asOptionalObjectRecord(args);
	const action = normalizeActionName(record?.action);
	const parts = [`tool=${normalizedTool}`];
	if (action) parts.push(`action=${action}`);
	let hasStableTarget = false;
	hasStableTarget = appendFingerprintAlias(parts, record, "path", [
		"path",
		"file_path",
		"filePath",
		"filepath",
		"file"
	]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "oldpath", ["oldPath", "old_path"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "newpath", ["newPath", "new_path"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "to", ["to", "target"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "messageid", ["messageId", "message_id"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "sessionkey", ["sessionKey", "session_key"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "jobid", ["jobId", "job_id"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "id", ["id"]) || hasStableTarget;
	hasStableTarget = appendFingerprintAlias(parts, record, "model", ["model"]) || hasStableTarget;
	const normalizedMeta = normalizeOptionalLowercaseString(meta?.trim().replace(/\s+/g, " "));
	if (normalizedMeta && !hasStableTarget) parts.push(`meta=${normalizedMeta}`);
	return parts.join("|");
}
function isFileMutatingToolName(rawName) {
	return FILE_MUTATING_TOOL_NAMES.has(normalizeLowercaseStringOrEmpty(rawName));
}
function readArgFingerprintValue(record, keys) {
	if (!record) return;
	for (const key of keys) {
		const normalized = normalizeFingerprintValue(record[key]);
		if (normalized) return normalized;
	}
}
function extractFileTarget(toolName, args) {
	if (!isFileMutatingToolName(toolName)) return;
	const record = asOptionalObjectRecord(args);
	const path = readArgFingerprintValue(record, FILE_TARGET_PATH_ARG_KEYS);
	const oldpath = readArgFingerprintValue(record, FILE_TARGET_OLDPATH_ARG_KEYS);
	if (!path && !oldpath) return;
	return {
		...path !== void 0 ? { path } : {},
		...oldpath !== void 0 ? { oldpath } : {}
	};
}
function fileTargetsEqual(a, b) {
	return (a.path ?? "") === (b.path ?? "") && (a.oldpath ?? "") === (b.oldpath ?? "");
}
function buildToolMutationState(toolName, args, meta) {
	const actionFingerprint = buildToolActionFingerprint(toolName, args, meta);
	const fileTarget = extractFileTarget(toolName, args);
	return {
		mutatingAction: actionFingerprint != null,
		actionFingerprint,
		...fileTarget !== void 0 ? { fileTarget } : {}
	};
}
function isSameToolMutationAction(existing, next) {
	if (existing.actionFingerprint != null || next.actionFingerprint != null) {
		if (existing.actionFingerprint == null || next.actionFingerprint == null) return false;
		if (existing.actionFingerprint === next.actionFingerprint) return true;
		if (isFileMutatingToolName(existing.toolName) && isFileMutatingToolName(next.toolName) && existing.fileTarget !== void 0 && next.fileTarget !== void 0 && fileTargetsEqual(existing.fileTarget, next.fileTarget)) return true;
		return false;
	}
	return existing.toolName === next.toolName && (existing.meta ?? "") === (next.meta ?? "");
}
//#endregion
export { isSameToolMutationAction as i, isLikelyMutatingToolName as n, isMutatingToolCall as r, buildToolMutationState as t };
