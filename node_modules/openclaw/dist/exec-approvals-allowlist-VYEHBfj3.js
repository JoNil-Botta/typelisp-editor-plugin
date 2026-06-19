import { a as normalizeLowercaseStringOrEmpty, c as normalizeOptionalString, s as normalizeOptionalLowercaseString } from "./string-coerce-mnp54Vah.js";
import { t as expandHomePrefix } from "./home-dir-BjcCg_IW.js";
import { a as validateSafeBinArgv, c as DEFAULT_SAFE_BINS, l as SAFE_BIN_PROFILES, n as isTrustedSafeBinPath } from "./exec-safe-bin-trust-Do7n3gvF.js";
import { c as resolveExecutableTrustPath, d as resolveExecutionTargetTrustPath, h as resolvePolicyTargetTrustPath, l as resolveExecutionTargetCandidatePath, m as resolvePolicyTargetResolution, p as resolvePolicyTargetCandidatePath, s as resolveCommandResolutionFromArgv, t as matchAllowlist, u as resolveExecutionTargetResolution, y as resolveExecWrapperTrustPlan } from "./exec-command-resolution-CqhcxBz-.js";
import { O as normalizeExecutableToken, _ as resolvePowerShellInlineCommandMatch, c as isShellWrapperExecutable, f as POSIX_INLINE_COMMAND_FLAGS, g as resolveInlineCommandMatch, m as isPowerShellInlineFileCommandFlag, n as POWERSHELL_WRAPPERS, r as extractBindableShellWrapperInlineCommand, x as unwrapDispatchWrappersForResolution, y as isDispatchWrapperExecutable } from "./shell-wrapper-resolution-CFL_Vekh.js";
import "./exec-wrapper-resolution-VZBsT_RG.js";
import { a as detectInlineEvalArgv, l as isInterpreterLikeAllowlistPattern } from "./risks-DRxJ1pW5.js";
import { c as splitCommandChain, l as splitCommandChainWithOperators, n as analyzeShellCommand, o as isWindowsPlatform } from "./exec-approvals-analysis-B4N2JXzl.js";
import path from "node:path";
//#region src/infra/exec-safe-builtins.ts
const DEFAULT_SAFE_BUILTINS = new Set([
	":",
	"cd",
	"false",
	"pwd",
	"test",
	"true"
]);
/** Returns true when a parsed POSIX shell segment is one of the closed safe builtin forms. */
function isSafeBuiltinSegment(params) {
	if (isWindowsPlatform(params.platform ?? process.platform)) return false;
	const head = params.segment.argv[0]?.trim().toLowerCase();
	if (!head) return false;
	if (head === "[") return params.segment.argv.at(-1) === "]";
	return DEFAULT_SAFE_BUILTINS.has(head);
}
//#endregion
//#region src/infra/exec-approvals-allowlist.ts
function hasShellLineContinuation(command) {
	return /\\(?:\r\n|\n|\r)/.test(command);
}
function normalizeSafeBins(entries) {
	if (!Array.isArray(entries)) return /* @__PURE__ */ new Set();
	const normalized = entries.map((entry) => normalizeLowercaseStringOrEmpty(entry)).filter((entry) => entry.length > 0);
	return new Set(normalized);
}
function resolveSafeBins(entries) {
	if (entries === void 0) return normalizeSafeBins(DEFAULT_SAFE_BINS);
	return normalizeSafeBins(entries ?? []);
}
function isSafeBinUsage(params) {
	if (isWindowsPlatform(params.platform ?? process.platform)) return false;
	if (params.safeBins.size === 0) return false;
	const resolution = params.resolution;
	const execName = normalizeOptionalLowercaseString(resolution?.executableName);
	if (!execName) return false;
	if (!params.safeBins.has(execName)) return false;
	const trustPath = resolveExecutableTrustPath(resolution);
	if (!trustPath) return false;
	if (!(params.isTrustedSafeBinPathFn ?? isTrustedSafeBinPath)({
		resolvedPath: trustPath,
		trustedDirs: params.trustedSafeBinDirs
	})) return false;
	const argv = params.argv.slice(1);
	const profile = (params.safeBinProfiles ?? SAFE_BIN_PROFILES)[execName];
	if (!profile) return false;
	return validateSafeBinArgv(argv, profile, { binName: execName });
}
function isPathScopedExecutableToken(token) {
	return token.includes("/") || token.includes("\\");
}
function pickExecAllowlistContext(params) {
	return {
		allowlist: params.allowlist,
		safeBins: params.safeBins,
		safeBinProfiles: params.safeBinProfiles,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform,
		trustedSafeBinDirs: params.trustedSafeBinDirs,
		skillBins: params.skillBins,
		autoAllowSkills: params.autoAllowSkills,
		allowShellBuiltins: params.allowShellBuiltins
	};
}
function normalizeSkillBinName(value) {
	const trimmed = normalizeOptionalLowercaseString(value);
	return trimmed && trimmed.length > 0 ? trimmed : null;
}
function normalizeSkillBinResolvedPath(value) {
	const trimmed = normalizeOptionalString(value);
	if (!trimmed) return null;
	const resolved = path.resolve(trimmed);
	if (process.platform === "win32") return normalizeLowercaseStringOrEmpty(resolved.replace(/\\/g, "/"));
	return resolved;
}
function buildSkillBinTrustIndex(entries) {
	const trustByName = /* @__PURE__ */ new Map();
	if (!entries || entries.length === 0) return trustByName;
	for (const entry of entries) {
		const name = normalizeSkillBinName(entry.name);
		const resolvedPath = normalizeSkillBinResolvedPath(entry.resolvedPath);
		if (!name || !resolvedPath) continue;
		const paths = trustByName.get(name) ?? /* @__PURE__ */ new Set();
		paths.add(resolvedPath);
		trustByName.set(name, paths);
	}
	return trustByName;
}
function isSkillAutoAllowedSegment(params) {
	if (!params.allowSkills) return false;
	const resolution = params.segment.resolution;
	const execution = resolveExecutionTargetResolution(resolution);
	const trustPath = resolveExecutionTargetTrustPath(resolution);
	if (!execution?.resolvedPath || !trustPath) return false;
	const rawExecutable = execution.rawExecutable?.trim() ?? "";
	if (!rawExecutable || isPathScopedExecutableToken(rawExecutable)) return false;
	const executableName = normalizeSkillBinName(execution.executableName);
	const resolvedPath = normalizeSkillBinResolvedPath(trustPath);
	if (!executableName || !resolvedPath) return false;
	return Boolean(params.skillBinTrust.get(executableName)?.has(resolvedPath));
}
const MAX_SHELL_WRAPPER_INLINE_EVAL_DEPTH = 3;
function matchExecutableAllowlistForSegment(params) {
	if (params.isPositionalCarrierInvocation) return null;
	const match = matchAllowlist(params.allowlist, params.candidateResolution, params.effectiveArgv, params.platform);
	const hasBoundArgPattern = typeof match?.argPattern === "string" && match.argPattern.trim().length > 0;
	const isBareWildcardMatch = match?.pattern?.trim() === "*" && !hasBoundArgPattern;
	if (params.allowlistTargetIsExecutionTarget && (params.inlineCommand !== null || params.isShellWrapperInvocation && params.effectiveArgv.length > 1) && !hasBoundArgPattern && !isBareWildcardMatch) return null;
	return match;
}
function executableResolutionsReferToSameTarget(left, right) {
	if (!left || !right) return false;
	return left.rawExecutable === right.rawExecutable && left.resolvedPath === right.resolvedPath && left.resolvedRealPath === right.resolvedRealPath && left.executableName === right.executableName;
}
function resolveShellWrapperScriptArgv(params) {
	const scriptBase = normalizeLowercaseStringOrEmpty(path.basename(params.shellScriptCandidatePath));
	const cwdBase = params.cwd && params.cwd.trim() ? params.cwd.trim() : process.cwd();
	const resolveArgPath = (a) => path.isAbsolute(a) ? a : path.resolve(cwdBase, a);
	let idx = params.effectiveArgv.findIndex((a) => resolveArgPath(a) === params.shellScriptCandidatePath);
	if (idx === -1) idx = params.effectiveArgv.findIndex((a) => normalizeLowercaseStringOrEmpty(path.basename(a)) === scriptBase);
	const scriptArgs = idx !== -1 ? params.effectiveArgv.slice(idx + 1) : [];
	return [params.shellScriptCandidatePath, ...scriptArgs];
}
function resolvePowerShellFileScriptArgv(params) {
	const argv = resolveSegmentSourceArgv(params.segment);
	if (!Array.isArray(argv) || argv.length < 3) return null;
	const wrapperName = normalizeExecutableToken(argv[0] ?? "");
	if (!POWERSHELL_WRAPPERS.has(wrapperName)) return null;
	const match = resolvePowerShellInlineCommandMatch(argv);
	if (match.valueTokenIndex === null || !match.command) return null;
	if (!isPowerShellInlineFileCommandFlag(argv[match.valueTokenIndex - 1] ?? "")) return null;
	const scriptToken = argv[match.valueTokenIndex]?.trim();
	if (!scriptToken) return null;
	const expanded = scriptToken.startsWith("~") ? expandHomePrefix(scriptToken) : scriptToken;
	const base = params.cwd && params.cwd.trim().length > 0 ? params.cwd : process.cwd();
	return [path.isAbsolute(expanded) ? expanded : path.resolve(base, expanded), ...argv.slice(match.valueTokenIndex + 1)];
}
function resolveSegmentSourceArgv(segment) {
	const sourceArgv = segment.sourceArgv;
	if (!Array.isArray(sourceArgv) || sourceArgv.length === 0) return segment.argv;
	const segmentExecutable = normalizeExecutableToken(segment.argv[0] ?? "");
	if (!segmentExecutable) return segment.argv;
	if (normalizeExecutableToken(sourceArgv[0] ?? "") === segmentExecutable) return sourceArgv;
	const unwrappedSourceArgv = unwrapDispatchWrappersForResolution(sourceArgv);
	return normalizeExecutableToken(unwrappedSourceArgv[0] ?? "") === segmentExecutable ? unwrappedSourceArgv : segment.argv;
}
function resolveSegmentAllowlistMatch(params) {
	const effectiveArgv = params.segment.resolution?.effectiveArgv && params.segment.resolution.effectiveArgv.length > 0 ? params.segment.resolution.effectiveArgv : params.segment.argv;
	const allowlistSegment = effectiveArgv === params.segment.argv ? params.segment : {
		...params.segment,
		argv: effectiveArgv
	};
	const executableResolution = resolvePolicyTargetResolution(params.segment.resolution);
	const executionResolution = resolveExecutionTargetResolution(params.segment.resolution);
	const candidatePath = resolvePolicyTargetCandidatePath(params.segment.resolution, params.context.cwd);
	const trustPath = resolvePolicyTargetTrustPath(params.segment.resolution, params.context.cwd);
	const candidateResolution = candidatePath && executableResolution ? {
		...executableResolution,
		resolvedPath: candidatePath,
		resolvedRealPath: trustPath
	} : executableResolution;
	const inlineCommand = extractBindableShellWrapperInlineCommand(allowlistSegment.argv);
	const powerShellFileScriptArgv = resolvePowerShellFileScriptArgv({
		segment: allowlistSegment,
		cwd: params.context.cwd
	});
	const isShellWrapperInvocation = isShellWrapperSegment(allowlistSegment);
	const isPositionalCarrierInvocation = inlineCommand !== null && isDirectShellPositionalCarrierInvocation(inlineCommand);
	const executableMatch = matchExecutableAllowlistForSegment({
		allowlist: params.context.allowlist,
		candidateResolution,
		effectiveArgv,
		platform: params.context.platform,
		inlineCommand,
		isShellWrapperInvocation,
		isPositionalCarrierInvocation,
		allowlistTargetIsExecutionTarget: executableResolutionsReferToSameTarget(executableResolution, executionResolution)
	});
	const shellPositionalArgvCandidatePath = inlineCommand !== null ? resolveShellWrapperPositionalArgvCandidatePath({
		segment: allowlistSegment,
		cwd: params.context.cwd,
		env: params.context.env,
		platform: params.context.platform
	}) : void 0;
	const shellPositionalArgvMatch = shellPositionalArgvCandidatePath ? matchAllowlist(params.context.allowlist, {
		rawExecutable: shellPositionalArgvCandidatePath,
		resolvedPath: shellPositionalArgvCandidatePath,
		resolvedRealPath: resolveCandidateTrustPath(shellPositionalArgvCandidatePath),
		executableName: path.basename(shellPositionalArgvCandidatePath)
	}, void 0, params.context.platform) : null;
	const shellScriptCandidatePath = powerShellFileScriptArgv?.[0] ?? (inlineCommand === null ? resolveShellWrapperScriptCandidatePath({
		segment: allowlistSegment,
		cwd: params.context.cwd
	}) : void 0);
	const shellScriptArgv = shellScriptCandidatePath ? powerShellFileScriptArgv ?? resolveShellWrapperScriptArgv({
		shellScriptCandidatePath,
		effectiveArgv,
		cwd: params.context.cwd
	}) : null;
	const shellScriptMatch = shellScriptCandidatePath && shellScriptArgv ? matchAllowlist(params.context.allowlist, {
		rawExecutable: shellScriptCandidatePath,
		resolvedPath: shellScriptCandidatePath,
		resolvedRealPath: resolveCandidateTrustPath(shellScriptCandidatePath),
		executableName: path.basename(shellScriptCandidatePath)
	}, shellScriptArgv, params.context.platform) : null;
	return {
		effectiveArgv,
		inlineCommand: powerShellFileScriptArgv ? null : inlineCommand,
		match: executableMatch ?? shellPositionalArgvMatch ?? shellScriptMatch
	};
}
function resolveSegmentSatisfaction(params) {
	if (params.match) return "allowlist";
	if (isSafeBinUsage({
		argv: params.effectiveArgv,
		resolution: resolveExecutionTargetResolution(params.segment.resolution),
		safeBins: params.context.safeBins,
		safeBinProfiles: params.context.safeBinProfiles,
		platform: params.context.platform,
		trustedSafeBinDirs: params.context.trustedSafeBinDirs
	})) return "safeBins";
	if (params.context.allowShellBuiltins === true && isSafeBuiltinSegment({
		segment: params.segment,
		platform: params.context.platform
	})) return "safeBuiltins";
	return isSkillAutoAllowedSegment({
		segment: params.segment,
		allowSkills: params.allowSkills,
		skillBinTrust: params.skillBinTrust
	}) ? "skills" : null;
}
function resolveInlineCommandFallback(params) {
	if (params.by !== null || !params.inlineCommand) return null;
	if (!isWindowsPlatform(params.context.platform)) {
		if (hasShellLineContinuation(params.inlineCommand)) return null;
		const inlineChainParts = splitCommandChain(params.inlineCommand);
		if (!inlineChainParts || inlineChainParts.length <= 1) return null;
		return evaluateShellWrapperInlineCommands({
			inlineCommands: inlineChainParts,
			context: params.context,
			inlineDepth: params.inlineDepth + 1
		});
	}
	return evaluateShellWrapperInlineCommand({
		inlineCommand: params.inlineCommand,
		context: params.context,
		inlineDepth: params.inlineDepth + 1
	});
}
function evaluateShellWrapperInlineCommands(params) {
	if (params.inlineDepth >= MAX_SHELL_WRAPPER_INLINE_EVAL_DEPTH) return null;
	const matches = [];
	const segmentSatisfiedBy = [];
	for (const inlineCommand of params.inlineCommands) {
		const analysis = analyzeShellCommand({
			command: inlineCommand,
			cwd: params.context.cwd,
			env: params.context.env,
			platform: params.context.platform
		});
		if (!analysis.ok) return null;
		const result = evaluateSegments(analysis.segments, params.context, params.inlineDepth);
		if (!result.satisfied) return null;
		matches.push(...result.matches);
		segmentSatisfiedBy.push(...result.segmentSatisfiedBy);
	}
	return {
		matches,
		satisfiedBy: segmentSatisfiedBy.some((entry) => entry === "safeBins" || entry === "inlineChain") ? "inlineChain" : "allowlist"
	};
}
function evaluateShellWrapperInlineCommand(params) {
	if (params.inlineDepth >= MAX_SHELL_WRAPPER_INLINE_EVAL_DEPTH) return null;
	if (hasShellLineContinuation(params.inlineCommand)) return null;
	const analysis = analyzeShellCommand({
		command: params.inlineCommand,
		cwd: params.context.cwd,
		env: params.context.env,
		platform: params.context.platform
	});
	if (!analysis.ok || analysis.segments.length === 0) return null;
	const matches = [];
	for (const group of resolveAnalysisSegmentGroups(analysis)) {
		const result = evaluateSegments(group, params.context, params.inlineDepth);
		if (!result.satisfied) return null;
		matches.push(...result.matches);
	}
	return {
		matches,
		satisfiedBy: "allowlist"
	};
}
function evaluateSegments(segments, params, inlineDepth = 0) {
	const matches = [];
	const skillBinTrust = buildSkillBinTrustIndex(params.skillBins);
	const allowSkills = params.autoAllowSkills === true && skillBinTrust.size > 0;
	const segmentAllowlistEntries = [];
	const segmentSatisfiedBy = [];
	return {
		satisfied: segments.every((segment) => {
			if (segment.resolution?.policyBlocked === true) {
				segmentAllowlistEntries.push(null);
				segmentSatisfiedBy.push(null);
				return false;
			}
			const { effectiveArgv, inlineCommand, match } = resolveSegmentAllowlistMatch({
				segment,
				context: params
			});
			if (match) matches.push(match);
			segmentAllowlistEntries.push(match ?? null);
			const by = resolveSegmentSatisfaction({
				match,
				segment,
				effectiveArgv,
				context: params,
				allowSkills,
				skillBinTrust
			});
			const inlineResult = resolveInlineCommandFallback({
				by,
				inlineCommand,
				context: params,
				inlineDepth
			});
			if (inlineResult) {
				matches.push(...inlineResult.matches);
				segmentSatisfiedBy.push(inlineResult.satisfiedBy);
				return true;
			}
			segmentSatisfiedBy.push(by);
			return Boolean(by);
		}),
		matches,
		segmentAllowlistEntries,
		segmentSatisfiedBy
	};
}
function resolveAnalysisSegmentGroups(analysis) {
	if (analysis.chains) return analysis.chains;
	return [analysis.segments];
}
function evaluateExecAllowlist(params) {
	const allowlistMatches = [];
	const segmentAllowlistEntries = [];
	const segmentSatisfiedBy = [];
	if (!params.analysis.ok || params.analysis.segments.length === 0) return {
		allowlistSatisfied: false,
		allowlistMatches,
		segmentAllowlistEntries,
		segmentSatisfiedBy
	};
	const allowlistContext = pickExecAllowlistContext(params);
	const hasChains = Boolean(params.analysis.chains);
	for (const group of resolveAnalysisSegmentGroups(params.analysis)) {
		const result = evaluateSegments(group, allowlistContext);
		if (!result.satisfied) {
			if (!hasChains) return {
				allowlistSatisfied: false,
				allowlistMatches: result.matches,
				segmentAllowlistEntries: result.segmentAllowlistEntries,
				segmentSatisfiedBy: result.segmentSatisfiedBy
			};
			return {
				allowlistSatisfied: false,
				allowlistMatches: [],
				segmentAllowlistEntries: [],
				segmentSatisfiedBy: []
			};
		}
		allowlistMatches.push(...result.matches);
		segmentAllowlistEntries.push(...result.segmentAllowlistEntries);
		segmentSatisfiedBy.push(...result.segmentSatisfiedBy);
	}
	return {
		allowlistSatisfied: true,
		allowlistMatches,
		segmentAllowlistEntries,
		segmentSatisfiedBy
	};
}
function hasSegmentExecutableMatch(segment, predicate) {
	const execution = resolveExecutionTargetResolution(segment.resolution);
	const candidates = [
		execution?.executableName,
		execution?.rawExecutable,
		segment.argv[0]
	];
	for (const candidate of candidates) {
		if (typeof candidate !== "string") continue;
		const trimmed = candidate.trim();
		if (!trimmed) continue;
		if (predicate(trimmed)) return true;
	}
	return false;
}
function isShellWrapperSegment(segment) {
	return hasSegmentExecutableMatch(segment, isShellWrapperExecutable);
}
const SHELL_WRAPPER_OPTIONS_WITH_VALUE = new Set([
	"-c",
	"--command",
	"-o",
	"-O",
	"+O"
]);
const SHELL_WRAPPER_DISQUALIFYING_SCRIPT_OPTIONS = [
	"--rcfile",
	"--init-file",
	"--startup-file"
];
function hasDisqualifyingShellWrapperScriptOption(token) {
	return SHELL_WRAPPER_DISQUALIFYING_SCRIPT_OPTIONS.some((option) => token === option || token.startsWith(`${option}=`));
}
const POWERSHELL_OPTIONS_WITH_VALUE_RE = /^-(?:executionpolicy|ep|windowstyle|w|workingdirectory|wd|inputformat|outputformat|settingsfile|configurationfile|version|v|psconsolefile|pscf|encodedcommand|en|enc|encodedarguments|ea)$/i;
function resolveShellWrapperScriptCandidatePath(params) {
	if (!isShellWrapperSegment(params.segment)) return;
	const argv = params.segment.argv;
	if (!Array.isArray(argv) || argv.length < 2) return;
	const wrapperName = normalizeExecutableToken(argv[0] ?? "");
	const isPowerShell = POWERSHELL_WRAPPERS.has(wrapperName);
	let idx = 1;
	while (idx < argv.length) {
		const token = argv[idx]?.trim() ?? "";
		if (!token) {
			idx += 1;
			continue;
		}
		if (token === "--") {
			idx += 1;
			break;
		}
		if (token === "-c" || token === "--command") return;
		if (!isPowerShell && /^-[^-]*c[^-]*$/i.test(token)) return;
		if (token === "-s" || !isPowerShell && /^-[^-]*s[^-]*$/i.test(token)) return;
		if (hasDisqualifyingShellWrapperScriptOption(token)) return;
		if (SHELL_WRAPPER_OPTIONS_WITH_VALUE.has(token)) {
			idx += 2;
			continue;
		}
		if (isPowerShell && POWERSHELL_OPTIONS_WITH_VALUE_RE.test(token)) {
			idx += 2;
			continue;
		}
		if (token.startsWith("-") || token.startsWith("+")) {
			idx += 1;
			continue;
		}
		break;
	}
	const scriptToken = argv[idx]?.trim();
	if (!scriptToken) return;
	if (path.isAbsolute(scriptToken)) return scriptToken;
	const expanded = scriptToken.startsWith("~") ? expandHomePrefix(scriptToken) : scriptToken;
	const base = params.cwd && params.cwd.trim().length > 0 ? params.cwd : process.cwd();
	return path.resolve(base, expanded);
}
function resolveShellWrapperPositionalArgvCandidatePath(params) {
	if (!isShellWrapperSegment(params.segment)) return;
	const argv = params.segment.argv;
	if (!Array.isArray(argv) || argv.length < 4) return;
	const wrapper = normalizeExecutableToken(argv[0] ?? "");
	if (![
		"ash",
		"bash",
		"dash",
		"fish",
		"ksh",
		"sh",
		"zsh"
	].includes(wrapper)) return;
	const inlineMatch = resolveInlineCommandMatch(argv, POSIX_INLINE_COMMAND_FLAGS, { allowCombinedC: true });
	if (inlineMatch.valueTokenIndex === null || !inlineMatch.command) return;
	if (!isDirectShellPositionalCarrierInvocation(inlineMatch.command)) return;
	const carriedExecutable = argv.slice(inlineMatch.valueTokenIndex + 1).map((token) => token.trim()).find((token) => token.length > 0);
	if (!carriedExecutable) return;
	const carriedName = normalizeExecutableToken(carriedExecutable);
	if (isDispatchWrapperExecutable(carriedName) || isShellWrapperExecutable(carriedName)) return;
	return resolveExecutionTargetCandidatePath(resolveCommandResolutionFromArgv([carriedExecutable], params.cwd, params.env, params.platform ?? void 0), params.cwd);
}
function isDirectShellPositionalCarrierInvocation(command) {
	const trimmed = command.trim();
	if (trimmed.length === 0) return false;
	const shellWhitespace = String.raw`[^\S\r\n]+`;
	const positionalZero = String.raw`(?:\$(?:0|\{0\})|"\$(?:0|\{0\})")`;
	const positionalArg = String.raw`(?:\$(?:[@*]|[1-9]|\{[@*1-9]\})|"\$(?:[@*]|[1-9]|\{[@*1-9]\})")`;
	return new RegExp(`^(?:exec${shellWhitespace}(?:--${shellWhitespace})?)?${positionalZero}(?:${shellWhitespace}${positionalArg})*$`, "u").test(trimmed);
}
function escapeRegExpLiteral(input) {
	return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildScriptArgPatternFromArgv(argv, scriptPath, cwd, platform) {
	if (!isWindowsPlatform(platform ?? process.platform)) return;
	const scriptBase = normalizeLowercaseStringOrEmpty(path.basename(scriptPath));
	const base = cwd && cwd.trim() ? cwd.trim() : process.cwd();
	const resolveArgPath = (arg) => path.isAbsolute(arg) ? arg : path.resolve(base, arg);
	let scriptIdx = argv.findIndex((arg) => resolveArgPath(arg) === scriptPath);
	if (scriptIdx === -1) scriptIdx = argv.findIndex((arg) => normalizeLowercaseStringOrEmpty(path.basename(arg)) === scriptBase);
	const normalized = (scriptIdx !== -1 ? argv.slice(scriptIdx + 1) : []).map((a) => a.replace(/\//g, "\\"));
	if (normalized.length === 0) return "^\0\0$";
	return `^${normalized.map(escapeRegExpLiteral).join("\0")}\x00$`;
}
function buildArgPatternFromArgv(argv, platform) {
	if (!isWindowsPlatform(platform ?? process.platform)) return;
	const normalized = argv.slice(1).map((a) => a.replace(/\//g, "\\"));
	if (normalized.length === 0) return "^\0\0$";
	return `^${escapeRegExpLiteral(normalized.join("\0"))}\x00$`;
}
function addAllowAlwaysPattern(out, pattern, argPattern) {
	if (!out.some((p) => p.pattern === pattern && (p.argPattern ?? void 0) === (argPattern ?? void 0))) out.push({
		pattern,
		argPattern
	});
}
function resolveCandidateTrustPath(candidatePath) {
	if (!candidatePath) return;
	return resolveExecutableTrustPath({
		rawExecutable: candidatePath,
		resolvedPath: candidatePath,
		executableName: path.basename(candidatePath)
	});
}
function collectAllowAlwaysPatterns(params) {
	if (params.depth >= 3) return;
	const trustPlan = resolveExecWrapperTrustPlan(params.segment.argv, void 0, params.platform ?? void 0);
	if (trustPlan.policyBlocked) return;
	const segment = trustPlan.argv === params.segment.argv ? params.segment : {
		raw: trustPlan.argv.join(" "),
		argv: trustPlan.argv,
		sourceArgv: params.segment.sourceArgv,
		resolution: resolveCommandResolutionFromArgv(trustPlan.argv, params.cwd, params.env, params.platform ?? void 0)
	};
	const candidatePath = resolveExecutionTargetTrustPath(segment.resolution, params.cwd);
	if (!candidatePath) return;
	if (isInterpreterLikeAllowlistPattern(candidatePath)) {
		const effectiveArgv = segment.resolution?.effectiveArgv ?? segment.argv;
		if (params.strictInlineEval !== true || detectInlineEvalArgv(effectiveArgv) !== null) return;
	}
	if (!trustPlan.shellWrapperExecutable) {
		const argPattern = buildArgPatternFromArgv(segment.argv, params.platform);
		addAllowAlwaysPattern(params.out, candidatePath, argPattern);
		return;
	}
	const powerShellFileScriptArgv = resolvePowerShellFileScriptArgv({
		segment,
		cwd: params.cwd
	});
	const inlineCommand = powerShellFileScriptArgv ? null : trustPlan.shellInlineCommand;
	const positionalArgvPath = inlineCommand !== null ? resolveShellWrapperPositionalArgvCandidatePath({
		segment,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform
	}) : void 0;
	if (positionalArgvPath) {
		addAllowAlwaysPattern(params.out, resolveCandidateTrustPath(positionalArgvPath) ?? positionalArgvPath);
		return;
	}
	if (!inlineCommand) {
		const scriptPath = powerShellFileScriptArgv?.[0] ?? resolveShellWrapperScriptCandidatePath({
			segment,
			cwd: params.cwd
		});
		if (scriptPath) {
			const scriptTrustPath = resolveCandidateTrustPath(scriptPath) ?? scriptPath;
			const argPattern = buildScriptArgPatternFromArgv(powerShellFileScriptArgv ?? params.segment.argv, scriptPath, params.cwd, params.platform);
			addAllowAlwaysPattern(params.out, scriptTrustPath, argPattern);
		}
		return;
	}
	const nested = analyzeShellCommand({
		command: inlineCommand,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform
	});
	if (!nested.ok) return;
	for (const nestedSegment of nested.segments) collectAllowAlwaysPatterns({
		segment: nestedSegment,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform,
		strictInlineEval: params.strictInlineEval,
		depth: params.depth + 1,
		out: params.out
	});
}
/**
* Derive persisted allowlist patterns for an "allow always" decision.
* When a command is wrapped in a shell (for example `zsh -lc "<cmd>"`),
* persist the inner executable(s) rather than the shell binary.
*/
function resolveAllowAlwaysPatternEntries(params) {
	const patterns = [];
	for (const segment of params.segments) collectAllowAlwaysPatterns({
		segment,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform,
		strictInlineEval: params.strictInlineEval,
		depth: 0,
		out: patterns
	});
	return patterns;
}
function resolveAllowAlwaysPatterns(params) {
	return resolveAllowAlwaysPatternEntries(params).map((pattern) => pattern.pattern);
}
/**
* Evaluates allowlist for shell commands (including &&, ||, ;) and returns analysis metadata.
*/
function evaluateShellAllowlist(params) {
	const allowlistContext = {
		...pickExecAllowlistContext(params),
		allowShellBuiltins: true
	};
	const analysisFailure = () => ({
		analysisOk: false,
		allowlistSatisfied: false,
		allowlistMatches: [],
		segments: [],
		segmentAllowlistEntries: [],
		segmentSatisfiedBy: []
	});
	if (hasShellLineContinuation(params.command)) return analysisFailure();
	const chainParts = isWindowsPlatform(params.platform) ? null : splitCommandChainWithOperators(params.command);
	if (!chainParts) {
		const analysis = analyzeShellCommand({
			command: params.command,
			cwd: params.cwd,
			env: params.env,
			platform: params.platform
		});
		if (!analysis.ok) return analysisFailure();
		const evaluation = evaluateExecAllowlist({
			analysis,
			...allowlistContext
		});
		return {
			analysisOk: true,
			allowlistSatisfied: evaluation.allowlistSatisfied,
			allowlistMatches: evaluation.allowlistMatches,
			segments: analysis.segments,
			segmentAllowlistEntries: evaluation.segmentAllowlistEntries,
			segmentSatisfiedBy: evaluation.segmentSatisfiedBy
		};
	}
	const chainEvaluations = chainParts.map(({ part }) => {
		const analysis = analyzeShellCommand({
			command: part,
			cwd: params.cwd,
			env: params.env,
			platform: params.platform
		});
		if (!analysis.ok) return null;
		return {
			analysis,
			evaluation: evaluateExecAllowlist({
				analysis,
				...allowlistContext
			})
		};
	});
	if (chainEvaluations.some((entry) => entry === null)) return analysisFailure();
	const finalizedEvaluations = chainEvaluations;
	const allowlistMatches = [];
	const segments = [];
	const segmentAllowlistEntries = [];
	const segmentSatisfiedBy = [];
	for (const { analysis, evaluation } of finalizedEvaluations) {
		segments.push(...analysis.segments);
		allowlistMatches.push(...evaluation.allowlistMatches);
		segmentAllowlistEntries.push(...evaluation.segmentAllowlistEntries);
		segmentSatisfiedBy.push(...evaluation.segmentSatisfiedBy);
		if (!evaluation.allowlistSatisfied) return {
			analysisOk: true,
			allowlistSatisfied: false,
			allowlistMatches,
			segments,
			segmentAllowlistEntries,
			segmentSatisfiedBy
		};
	}
	return {
		analysisOk: true,
		allowlistSatisfied: true,
		allowlistMatches,
		segments,
		segmentAllowlistEntries,
		segmentSatisfiedBy
	};
}
//#endregion
export { resolveAllowAlwaysPatternEntries as a, normalizeSafeBins as i, evaluateShellAllowlist as n, resolveAllowAlwaysPatterns as o, isSafeBinUsage as r, resolveSafeBins as s, evaluateExecAllowlist as t };
