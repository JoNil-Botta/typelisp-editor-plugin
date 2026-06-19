import { a as normalizeLowercaseStringOrEmpty } from "./string-coerce-mnp54Vah.js";
import { s as resolveCommandResolutionFromArgv } from "./exec-command-resolution-CqhcxBz-.js";
import { a as extractShellWrapperInlineCommand, f as POSIX_INLINE_COMMAND_FLAGS, g as resolveInlineCommandMatch, k as splitShellArgs, u as resolveShellWrapperTransportArgv } from "./shell-wrapper-resolution-CFL_Vekh.js";
import "./exec-wrapper-resolution-VZBsT_RG.js";
//#region src/infra/exec-approvals-analysis.ts
const DISALLOWED_PIPELINE_TOKENS = new Set([
	">",
	"<",
	"`",
	"\n",
	"\r",
	"(",
	")"
]);
const DOUBLE_QUOTE_ESCAPES = new Set([
	"\\",
	"\"",
	"$",
	"`"
]);
const MAX_UNQUOTED_HEREDOC_CONTINUATION_LINES = 1024;
const MAX_UNQUOTED_HEREDOC_LOGICAL_LINE_LENGTH = 64 * 1024;
const WINDOWS_UNSUPPORTED_TOKENS = new Set([
	"&",
	"|",
	"<",
	">",
	";",
	"^",
	"(",
	")",
	"%",
	"!",
	"`",
	"\n",
	"\r"
]);
function isDoubleQuoteEscape(next) {
	return Boolean(next && DOUBLE_QUOTE_ESCAPES.has(next));
}
function isEscapedLineContinuation(next) {
	return next === "\n" || next === "\r";
}
function isShellCommentStart(source, index) {
	if (source[index] !== "#") return false;
	if (index === 0) return true;
	const prev = source[index - 1];
	return Boolean(prev && /\s/.test(prev));
}
function splitShellPipeline(command) {
	const parseHeredocDelimiter = (source, start) => {
		let i = start;
		while (i < source.length && (source[i] === " " || source[i] === "	")) i += 1;
		if (i >= source.length) return null;
		const first = source[i];
		if (first === "'" || first === "\"") {
			const quote = first;
			i += 1;
			let delimiter = "";
			while (i < source.length) {
				const ch = source[i];
				if (ch === "\n" || ch === "\r") return null;
				if (quote === "\"" && ch === "\\" && i + 1 < source.length) {
					delimiter += source[i + 1];
					i += 2;
					continue;
				}
				if (ch === quote) return {
					delimiter,
					end: i + 1,
					quoted: true
				};
				delimiter += ch;
				i += 1;
			}
			return null;
		}
		let delimiter = "";
		while (i < source.length) {
			const ch = source[i];
			if (/\s/.test(ch) || ch === "|" || ch === "&" || ch === ";" || ch === "<" || ch === ">") break;
			delimiter += ch;
			i += 1;
		}
		if (!delimiter) return null;
		return {
			delimiter,
			end: i,
			quoted: false
		};
	};
	const segments = [];
	let buf = "";
	let inSingle = false;
	let inDouble = false;
	let escaped = false;
	let emptySegment = false;
	const pendingHeredocs = [];
	let inHeredocBody = false;
	let heredocLine = "";
	let unquotedHeredocLogicalChunks = [];
	let unquotedHeredocLogicalLength = 0;
	const pushPart = () => {
		const trimmed = buf.trim();
		if (trimmed) segments.push(trimmed);
		buf = "";
	};
	const isEscapedInHeredocLine = (line, index) => {
		let slashes = 0;
		for (let i = index - 1; i >= 0 && line[i] === "\\"; i -= 1) slashes += 1;
		return slashes % 2 === 1;
	};
	const hasUnquotedHeredocExpansionToken = (line) => {
		for (let i = 0; i < line.length; i += 1) {
			const ch = line[i];
			if (ch === "`" && !isEscapedInHeredocLine(line, i)) return true;
			if (ch === "$" && !isEscapedInHeredocLine(line, i)) {
				const next = line[i + 1];
				if (next === "(" || next === "{" || next === "[" || next !== void 0 && (/^[A-Za-z_]$/.test(next) || /^[0-9]$/.test(next) || "@*?!$#-".includes(next))) return true;
			}
		}
		return false;
	};
	const stripUnquotedHeredocLineContinuation = (line) => {
		let trailingSlashes = 0;
		for (let i = line.length - 1; i >= 0 && line[i] === "\\"; i -= 1) trailingSlashes += 1;
		if (trailingSlashes % 2 === 1) return {
			line: line.slice(0, -1),
			continues: true
		};
		return {
			line,
			continues: false
		};
	};
	for (let i = 0; i < command.length; i += 1) {
		const ch = command[i];
		const next = command[i + 1];
		if (inHeredocBody) {
			if (ch === "\n" || ch === "\r") {
				const current = pendingHeredocs[0];
				if (current) {
					const line = current.stripTabs ? heredocLine.replace(/^\t+/, "") : heredocLine;
					if (current.quoted) {
						if (line === current.delimiter) pendingHeredocs.shift();
					} else if (line === current.delimiter && unquotedHeredocLogicalChunks.length === 0) pendingHeredocs.shift();
					else {
						const continued = stripUnquotedHeredocLineContinuation(line);
						unquotedHeredocLogicalChunks.push(continued.line);
						if (unquotedHeredocLogicalChunks.length > MAX_UNQUOTED_HEREDOC_CONTINUATION_LINES) return {
							ok: false,
							reason: "heredoc continuation too long",
							segments: []
						};
						unquotedHeredocLogicalLength += continued.line.length;
						if (unquotedHeredocLogicalLength > MAX_UNQUOTED_HEREDOC_LOGICAL_LINE_LENGTH) return {
							ok: false,
							reason: "heredoc logical line too large",
							segments: []
						};
						if (!continued.continues) {
							if (hasUnquotedHeredocExpansionToken(unquotedHeredocLogicalChunks.join(""))) return {
								ok: false,
								reason: "shell expansion in unquoted heredoc",
								segments: []
							};
							unquotedHeredocLogicalChunks = [];
							unquotedHeredocLogicalLength = 0;
						}
					}
				}
				heredocLine = "";
				if (pendingHeredocs.length === 0) inHeredocBody = false;
				if (ch === "\r" && next === "\n") i += 1;
			} else heredocLine += ch;
			continue;
		}
		if (escaped) {
			buf += ch;
			escaped = false;
			emptySegment = false;
			continue;
		}
		if (!inSingle && !inDouble && ch === "\\") {
			escaped = true;
			buf += ch;
			emptySegment = false;
			continue;
		}
		if (inSingle) {
			if (ch === "'") inSingle = false;
			buf += ch;
			emptySegment = false;
			continue;
		}
		if (inDouble) {
			if (ch === "\\" && isEscapedLineContinuation(next)) return {
				ok: false,
				reason: "unsupported shell token: newline",
				segments: []
			};
			if (ch === "\\" && isDoubleQuoteEscape(next)) {
				buf += ch;
				buf += next;
				i += 1;
				emptySegment = false;
				continue;
			}
			if (ch === "$" && next === "(") return {
				ok: false,
				reason: "unsupported shell token: $()",
				segments: []
			};
			if (ch === "`") return {
				ok: false,
				reason: "unsupported shell token: `",
				segments: []
			};
			if (ch === "\n" || ch === "\r") return {
				ok: false,
				reason: "unsupported shell token: newline",
				segments: []
			};
			if (ch === "\"") inDouble = false;
			buf += ch;
			emptySegment = false;
			continue;
		}
		if (ch === "'") {
			inSingle = true;
			buf += ch;
			emptySegment = false;
			continue;
		}
		if (ch === "\"") {
			inDouble = true;
			buf += ch;
			emptySegment = false;
			continue;
		}
		if (isShellCommentStart(command, i)) break;
		if ((ch === "\n" || ch === "\r") && pendingHeredocs.length > 0) {
			inHeredocBody = true;
			heredocLine = "";
			if (ch === "\r" && next === "\n") i += 1;
			continue;
		}
		if (ch === "|" && next === "|") return {
			ok: false,
			reason: "unsupported shell token: ||",
			segments: []
		};
		if (ch === "|" && next === "&") return {
			ok: false,
			reason: "unsupported shell token: |&",
			segments: []
		};
		if (ch === "|") {
			emptySegment = true;
			pushPart();
			continue;
		}
		if (ch === "&" || ch === ";") return {
			ok: false,
			reason: `unsupported shell token: ${ch}`,
			segments: []
		};
		if (ch === "<" && next === "<") {
			buf += "<<";
			emptySegment = false;
			i += 1;
			let scanIndex = i + 1;
			let stripTabs = false;
			if (command[scanIndex] === "-") {
				stripTabs = true;
				buf += "-";
				scanIndex += 1;
			}
			const parsed = parseHeredocDelimiter(command, scanIndex);
			if (parsed) {
				pendingHeredocs.push({
					delimiter: parsed.delimiter,
					stripTabs,
					quoted: parsed.quoted
				});
				buf += command.slice(scanIndex, parsed.end);
				i = parsed.end - 1;
			}
			continue;
		}
		if (DISALLOWED_PIPELINE_TOKENS.has(ch)) return {
			ok: false,
			reason: `unsupported shell token: ${ch}`,
			segments: []
		};
		if (ch === "$" && next === "(") return {
			ok: false,
			reason: "unsupported shell token: $()",
			segments: []
		};
		buf += ch;
		emptySegment = false;
	}
	if (inHeredocBody && pendingHeredocs.length > 0) {
		const current = pendingHeredocs[0];
		const line = current.stripTabs ? heredocLine.replace(/^\t+/, "") : heredocLine;
		if (!current.quoted && unquotedHeredocLogicalChunks.length > 0) {
			const continued = stripUnquotedHeredocLineContinuation(line);
			if (hasUnquotedHeredocExpansionToken([...unquotedHeredocLogicalChunks, continued.line].join(""))) return {
				ok: false,
				reason: "shell expansion in unquoted heredoc",
				segments: []
			};
		} else if (line === current.delimiter) {
			pendingHeredocs.shift();
			if (pendingHeredocs.length === 0) inHeredocBody = false;
		}
	}
	if (pendingHeredocs.length > 0 || inHeredocBody) return {
		ok: false,
		reason: "unterminated heredoc",
		segments: []
	};
	if (escaped || inSingle || inDouble) return {
		ok: false,
		reason: "unterminated shell quote/escape",
		segments: []
	};
	pushPart();
	if (emptySegment || segments.length === 0) return {
		ok: false,
		reason: segments.length === 0 ? "empty command" : "empty pipeline segment",
		segments: []
	};
	return {
		ok: true,
		segments
	};
}
const WINDOWS_ALWAYS_UNSAFE_TOKENS = new Set([
	"\n",
	"\r",
	"%",
	"`"
]);
function findWindowsUnsupportedToken(command) {
	let inDouble = false;
	for (let i = 0; i < command.length; i++) {
		const ch = command[i];
		if (ch === "\"") {
			inDouble = !inDouble;
			continue;
		}
		if (ch === "$") {
			const next = command[i + 1];
			if (next !== void 0 && /[A-Za-z_{(?$]/.test(next)) return "$";
			continue;
		}
		if (WINDOWS_UNSUPPORTED_TOKENS.has(ch)) {
			if (inDouble && !WINDOWS_ALWAYS_UNSAFE_TOKENS.has(ch)) continue;
			if (ch === "\n" || ch === "\r") return "newline";
			return ch;
		}
	}
	return null;
}
function tokenizeWindowsSegment(segment) {
	const tokens = [];
	let buf = "";
	let inDouble = false;
	let inSingle = false;
	let wasQuoted = false;
	const pushToken = () => {
		if (buf.length > 0 || wasQuoted) {
			tokens.push(buf);
			buf = "";
		}
		wasQuoted = false;
	};
	for (let i = 0; i < segment.length; i += 1) {
		const ch = segment[i];
		if (ch === "\"" && !inSingle) {
			if (!inDouble) wasQuoted = true;
			inDouble = !inDouble;
			continue;
		}
		if (ch === "'" && !inDouble) {
			if (inSingle && segment[i + 1] === "'") {
				buf += "'";
				i += 1;
				continue;
			}
			if (!inSingle) wasQuoted = true;
			inSingle = !inSingle;
			continue;
		}
		if (!inDouble && !inSingle && /\s/.test(ch)) {
			pushToken();
			continue;
		}
		buf += ch;
	}
	if (inDouble || inSingle) return null;
	pushToken();
	return tokens.length > 0 ? tokens : null;
}
/**
* Recursively strip transparent Windows shell wrappers from a command string.
*
* LLMs generate commands with arbitrary nesting of shell wrappers:
*   powershell -NoProfile -Command "& node 'C:\path' --count 3"
*   cmd /c "node C:\path --count 3"
*   & node C:\path --count 3
*
* All of these should resolve to: node C:\path --count 3
*
* Recognised wrappers (applied repeatedly until stable):
*   - PowerShell call-operator: `& exe args`
*   - cmd.exe pass-through:    `cmd /c "..."` or `cmd /c ...`
*   - PowerShell invocation:   `powershell [-flags] -Command "..."`
*/
function stripWindowsShellWrapper(command) {
	const MAX_DEPTH = 5;
	let result = command;
	for (let i = 0; i < MAX_DEPTH; i++) {
		const prev = result;
		result = stripWindowsShellWrapperOnce(result.trim());
		if (result === prev) break;
	}
	return result;
}
function stripWindowsShellWrapperOnce(command) {
	const psCallMatch = command.match(/^&\s+(.+)$/s);
	if (psCallMatch) return psCallMatch[1];
	const psFlags = /(?:-(?!c(?:ommand)?\b|-command\b)\w+(?:\s+(?!-)(?:"[^"]*(?:""[^"]*)*"|'[^']*(?:''[^']*)*'|\S+))?\s+)*/i.source;
	const psCommandFlag = `(?:-command|-c|--command)`;
	const psInvokeMatch = command.match(new RegExp(`^(?:powershell|pwsh)(?:\\.exe)?\\s+${psFlags}${psCommandFlag}\\s+"(.+)"$`, "is"));
	if (psInvokeMatch) return psInvokeMatch[1].replace(/""/g, "\"");
	const psInvokeSingleQuote = command.match(new RegExp(`^(?:powershell|pwsh)(?:\\.exe)?\\s+${psFlags}${psCommandFlag}\\s+'(.+)'$`, "is"));
	if (psInvokeSingleQuote) return psInvokeSingleQuote[1].replace(/''/g, "'");
	const psInvokeNoQuote = command.match(new RegExp(`^(?:powershell|pwsh)(?:\\.exe)?\\s+${psFlags}${psCommandFlag}\\s+(.+)$`, "is"));
	if (psInvokeNoQuote) return psInvokeNoQuote[1];
	return command;
}
function analyzeWindowsShellCommand(params) {
	const effective = stripWindowsShellWrapper(params.command.trim());
	const unsupported = findWindowsUnsupportedToken(effective);
	if (unsupported) return {
		ok: false,
		reason: `unsupported windows shell token: ${unsupported}`,
		segments: []
	};
	const argv = tokenizeWindowsSegment(effective);
	if (!argv || argv.length === 0) return {
		ok: false,
		reason: "unable to parse windows command",
		segments: []
	};
	return {
		ok: true,
		segments: [{
			raw: params.command,
			argv,
			resolution: resolveCommandResolutionFromArgv(argv, params.cwd, params.env, params.platform ?? void 0)
		}]
	};
}
function isWindowsPlatform(platform) {
	return normalizeLowercaseStringOrEmpty(platform).startsWith("win");
}
function parseSegmentsFromParts(parts, cwd, env, platform) {
	const segments = [];
	for (const raw of parts) {
		const argv = splitShellArgs(raw);
		if (!argv || argv.length === 0) return null;
		segments.push({
			raw,
			argv,
			resolution: resolveCommandResolutionFromArgv(argv, cwd, env, platform ?? void 0)
		});
	}
	return segments;
}
/**
* Splits a command string by chain operators (&&, ||, ;) while preserving the operators.
* Returns null when no chain is present or when the chain is malformed.
*/
function splitCommandChainWithOperators(command) {
	const parts = [];
	let buf = "";
	let inSingle = false;
	let inDouble = false;
	let escaped = false;
	let foundChain = false;
	let invalidChain = false;
	const pushPart = (opToNext) => {
		const trimmed = buf.trim();
		buf = "";
		if (!trimmed) return false;
		parts.push({
			part: trimmed,
			opToNext
		});
		return true;
	};
	for (let i = 0; i < command.length; i += 1) {
		const ch = command[i];
		const next = command[i + 1];
		if (escaped) {
			buf += ch;
			escaped = false;
			continue;
		}
		if (!inSingle && !inDouble && ch === "\\") {
			escaped = true;
			buf += ch;
			continue;
		}
		if (inSingle) {
			if (ch === "'") inSingle = false;
			buf += ch;
			continue;
		}
		if (inDouble) {
			if (ch === "\\" && isEscapedLineContinuation(next)) {
				invalidChain = true;
				break;
			}
			if (ch === "\\" && isDoubleQuoteEscape(next)) {
				buf += ch;
				buf += next;
				i += 1;
				continue;
			}
			if (ch === "\"") inDouble = false;
			buf += ch;
			continue;
		}
		if (ch === "'") {
			inSingle = true;
			buf += ch;
			continue;
		}
		if (ch === "\"") {
			inDouble = true;
			buf += ch;
			continue;
		}
		if (isShellCommentStart(command, i)) break;
		if (ch === "&" && next === "&") {
			if (!pushPart("&&")) invalidChain = true;
			i += 1;
			foundChain = true;
			continue;
		}
		if (ch === "|" && next === "|") {
			if (!pushPart("||")) invalidChain = true;
			i += 1;
			foundChain = true;
			continue;
		}
		if (ch === ";") {
			if (!pushPart(";")) invalidChain = true;
			foundChain = true;
			continue;
		}
		buf += ch;
	}
	if (!foundChain) return null;
	const trimmed = buf.trim();
	if (!trimmed) return null;
	parts.push({
		part: trimmed,
		opToNext: null
	});
	if (invalidChain || parts.length === 0) return null;
	return parts;
}
function shellEscapeSingleArg(value) {
	return `'${value.replace(/'/g, `'"'"'`)}'`;
}
const WINDOWS_UNSAFE_CMD_META = /[%`]|\$(?=[A-Za-z_{(?$])/;
function windowsEscapeArg(value) {
	if (value === "") return {
		ok: true,
		escaped: "\"\""
	};
	if (WINDOWS_UNSAFE_CMD_META.test(value)) return { ok: false };
	if (/^[a-zA-Z0-9_./:~\\=-]+$/.test(value)) return {
		ok: true,
		escaped: value
	};
	return {
		ok: true,
		escaped: `"${value.replace(/"/g, "\"\"")}"`
	};
}
function rebuildWindowsShellCommandFromSource(params) {
	const source = stripWindowsShellWrapper(params.command.trim());
	if (!source) return {
		ok: false,
		reason: "empty command"
	};
	const unsupported = findWindowsUnsupportedToken(source);
	if (unsupported) return {
		ok: false,
		reason: `unsupported windows shell token: ${unsupported}`
	};
	const rendered = params.renderSegment(source, 0);
	if (!rendered.ok) return {
		ok: false,
		reason: rendered.reason
	};
	return {
		ok: true,
		command: `& ${rendered.rendered}`,
		segmentCount: 1
	};
}
function rebuildShellCommandFromSource(params) {
	if (isWindowsPlatform(params.platform ?? null)) return rebuildWindowsShellCommandFromSource(params);
	const source = params.command.trim();
	if (!source) return {
		ok: false,
		reason: "empty command"
	};
	const chainParts = splitCommandChainWithOperators(source) ?? [{
		part: source,
		opToNext: null
	}];
	let segmentCount = 0;
	let out = "";
	for (const part of chainParts) {
		const pipelineSplit = splitShellPipeline(part.part);
		if (!pipelineSplit.ok) return {
			ok: false,
			reason: pipelineSplit.reason ?? "unable to parse pipeline"
		};
		const renderedSegments = [];
		for (const segmentRaw of pipelineSplit.segments) {
			const rendered = params.renderSegment(segmentRaw, segmentCount);
			if (!rendered.ok) return {
				ok: false,
				reason: rendered.reason
			};
			renderedSegments.push(rendered.rendered);
			segmentCount += 1;
		}
		out += renderedSegments.join(" | ");
		if (part.opToNext) out += ` ${part.opToNext} `;
	}
	return {
		ok: true,
		command: out,
		segmentCount
	};
}
/**
* Builds a shell command string that preserves pipes/chaining, but forces *arguments* to be
* literal (no globbing, no env-var expansion) by single-quoting every argv token.
*
* Used to make "safe bins" actually stdin-only even though execution happens via `shell -c`.
*/
function buildSafeShellCommand(params) {
	const isWindows = isWindowsPlatform(params.platform);
	return finalizeRebuiltShellCommand(rebuildShellCommandFromSource({
		command: params.command,
		platform: params.platform,
		renderSegment: (segmentRaw) => {
			const argv = isWindows ? tokenizeWindowsSegment(segmentRaw) ?? [] : splitShellArgs(segmentRaw) ?? [];
			if (argv.length === 0) return {
				ok: false,
				reason: "unable to parse shell segment"
			};
			if (isWindows) return renderWindowsQuotedArgv(argv);
			return {
				ok: true,
				rendered: argv.map((token) => shellEscapeSingleArg(token)).join(" ")
			};
		}
	}));
}
function renderWindowsQuotedArgv(argv) {
	const parts = [];
	for (const token of argv) {
		const result = windowsEscapeArg(token);
		if (!result.ok) return {
			ok: false,
			reason: `unsafe windows token: ${token}`
		};
		parts.push(result.escaped);
	}
	return {
		ok: true,
		rendered: parts.join(" ")
	};
}
function renderQuotedArgv(argv, platform) {
	if (isWindowsPlatform(platform)) {
		const result = renderWindowsQuotedArgv(argv);
		return result.ok ? result.rendered : null;
	}
	return argv.map((token) => shellEscapeSingleArg(token)).join(" ");
}
function finalizeRebuiltShellCommand(rebuilt, expectedSegmentCount) {
	if (!rebuilt.ok) return {
		ok: false,
		reason: rebuilt.reason
	};
	if (typeof expectedSegmentCount === "number" && rebuilt.segmentCount !== expectedSegmentCount) return {
		ok: false,
		reason: "segment count mismatch"
	};
	return {
		ok: true,
		command: rebuilt.command
	};
}
function resolvePlannedSegmentArgv(segment) {
	if (segment.resolution?.policyBlocked === true) return null;
	const baseArgv = segment.resolution?.effectiveArgv && segment.resolution.effectiveArgv.length > 0 ? segment.resolution.effectiveArgv : segment.argv;
	if (baseArgv.length === 0) return null;
	const argv = [...baseArgv];
	const execution = segment.resolution?.execution;
	const resolvedExecutable = execution?.resolvedRealPath?.trim() ?? execution?.resolvedPath?.trim() ?? "";
	if (resolvedExecutable) argv[0] = resolvedExecutable;
	return argv;
}
function renderSafeBinSegmentArgv(segment, platform) {
	const argv = resolvePlannedSegmentArgv(segment);
	if (!argv || argv.length === 0) return null;
	return renderQuotedArgv(argv, platform);
}
function findSubsequence(haystack, needle) {
	if (needle.length === 0 || needle.length > haystack.length) return -1;
	for (let start = 0; start <= haystack.length - needle.length; start += 1) {
		let matches = true;
		for (let offset = 0; offset < needle.length; offset += 1) if (haystack[start + offset] !== needle[offset]) {
			matches = false;
			break;
		}
		if (matches) return start;
	}
	return -1;
}
function replaceShellInlineCommandArgv(params) {
	const transportArgv = resolveShellWrapperTransportArgv(params.argv);
	if (!transportArgv) return null;
	const transportStart = findSubsequence(params.argv, transportArgv);
	if (transportStart < 0) return null;
	const match = resolveInlineCommandMatch(transportArgv, POSIX_INLINE_COMMAND_FLAGS, { allowCombinedC: true });
	if (match.valueTokenIndex === null) return null;
	const absoluteValueIndex = transportStart + match.valueTokenIndex;
	const token = params.argv[absoluteValueIndex];
	if (token === void 0) return null;
	const rewritten = [...params.argv];
	if (token === params.oldCommand) {
		rewritten[absoluteValueIndex] = params.nextCommand;
		return rewritten;
	}
	if (token.endsWith(params.oldCommand)) {
		rewritten[absoluteValueIndex] = token.slice(0, token.length - params.oldCommand.length) + params.nextCommand;
		return rewritten;
	}
	return null;
}
function renderInlineChainSegmentArgv(params) {
	const inlineCommand = extractShellWrapperInlineCommand(params.segment.argv);
	if (!inlineCommand) return null;
	const analysis = analyzeShellCommand({
		command: inlineCommand,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform
	});
	if (!analysis.ok) return null;
	const rebuilt = buildEnforcedShellCommand({
		command: inlineCommand,
		segments: analysis.segments,
		platform: params.platform
	});
	if (!rebuilt.ok || !rebuilt.command) return null;
	const rewrittenArgv = replaceShellInlineCommandArgv({
		argv: params.segment.argv,
		oldCommand: inlineCommand,
		nextCommand: rebuilt.command
	});
	return rewrittenArgv ? renderQuotedArgv(rewrittenArgv, params.platform) : null;
}
/**
* Rebuilds a shell command and selectively single-quotes argv tokens for segments that
* must be treated as literal (safeBins hardening) while preserving the rest of the
* shell syntax (pipes + chaining).
*/
function buildSafeBinsShellCommand(params) {
	if (params.segments.length !== params.segmentSatisfiedBy.length) return {
		ok: false,
		reason: "segment metadata mismatch"
	};
	return finalizeRebuiltShellCommand(rebuildShellCommandFromSource({
		command: params.command,
		platform: params.platform,
		renderSegment: (raw, segmentIndex) => {
			const seg = params.segments[segmentIndex];
			const by = params.segmentSatisfiedBy[segmentIndex];
			if (!seg || by === void 0) return {
				ok: false,
				reason: "segment mapping failed"
			};
			const needsLiteral = by === "safeBins";
			if (by === "inlineChain") {
				const rendered = renderInlineChainSegmentArgv({
					segment: seg,
					cwd: params.cwd,
					env: params.env,
					platform: params.platform
				});
				if (!rendered) return {
					ok: false,
					reason: "inline chain execution plan unavailable"
				};
				return {
					ok: true,
					rendered
				};
			}
			if (!needsLiteral) return {
				ok: true,
				rendered: raw.trim()
			};
			const rendered = renderSafeBinSegmentArgv(seg, params.platform);
			if (!rendered) return {
				ok: false,
				reason: "segment execution plan unavailable"
			};
			return {
				ok: true,
				rendered
			};
		}
	}), params.segments.length);
}
function buildEnforcedShellCommand(params) {
	return finalizeRebuiltShellCommand(rebuildShellCommandFromSource({
		command: params.command,
		platform: params.platform,
		renderSegment: (_raw, segmentIndex) => {
			const seg = params.segments[segmentIndex];
			if (!seg) return {
				ok: false,
				reason: "segment mapping failed"
			};
			const argv = resolvePlannedSegmentArgv(seg);
			if (!argv) return {
				ok: false,
				reason: "segment execution plan unavailable"
			};
			const rendered = renderQuotedArgv(argv, params.platform);
			if (!rendered) return {
				ok: false,
				reason: "unsafe windows token in argv"
			};
			return {
				ok: true,
				rendered
			};
		}
	}), params.segments.length);
}
/**
* Splits a command string by chain operators (&&, ||, ;) while respecting quotes.
* Returns null when no chain is present or when the chain is malformed.
*/
function splitCommandChain(command) {
	const parts = splitCommandChainWithOperators(command);
	if (!parts) return null;
	return parts.map((p) => p.part);
}
function analyzeShellCommand(params) {
	if (isWindowsPlatform(params.platform)) return analyzeWindowsShellCommand(params);
	const chainParts = splitCommandChain(params.command);
	if (chainParts) {
		const chains = [];
		const allSegments = [];
		for (const part of chainParts) {
			const pipelineSplit = splitShellPipeline(part);
			if (!pipelineSplit.ok) return {
				ok: false,
				reason: pipelineSplit.reason,
				segments: []
			};
			const segments = parseSegmentsFromParts(pipelineSplit.segments, params.cwd, params.env, params.platform);
			if (!segments) return {
				ok: false,
				reason: "unable to parse shell segment",
				segments: []
			};
			chains.push(segments);
			allSegments.push(...segments);
		}
		return {
			ok: true,
			segments: allSegments,
			chains
		};
	}
	const split = splitShellPipeline(params.command);
	if (!split.ok) return {
		ok: false,
		reason: split.reason,
		segments: []
	};
	const segments = parseSegmentsFromParts(split.segments, params.cwd, params.env, params.platform);
	if (!segments) return {
		ok: false,
		reason: "unable to parse shell segment",
		segments: []
	};
	return {
		ok: true,
		segments
	};
}
function analyzeArgvCommand(params) {
	const argv = params.argv.filter((entry) => entry.trim().length > 0);
	if (argv.length === 0) return {
		ok: false,
		reason: "empty argv",
		segments: []
	};
	return {
		ok: true,
		segments: [{
			raw: argv.join(" "),
			argv,
			sourceArgv: [...params.argv],
			resolution: resolveCommandResolutionFromArgv(argv, params.cwd, params.env, params.platform ?? void 0)
		}]
	};
}
//#endregion
export { buildSafeShellCommand as a, splitCommandChain as c, buildSafeBinsShellCommand as i, splitCommandChainWithOperators as l, analyzeShellCommand as n, isWindowsPlatform as o, buildEnforcedShellCommand as r, resolvePlannedSegmentArgv as s, analyzeArgvCommand as t, windowsEscapeArg as u };
