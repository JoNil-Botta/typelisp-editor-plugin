import { t as SafeBinProfile } from "./exec-safe-bin-policy-profiles-BDyHRwUP.js";

//#region src/infra/exec-approvals.types.d.ts
type ExecAllowlistEntry = {
  id?: string;
  pattern: string;
  source?: "allow-always";
  commandText?: string;
  argPattern?: string;
  lastUsedAt?: number;
  lastUsedCommand?: string;
  lastResolvedPath?: string;
};
//#endregion
//#region src/infra/exec-command-resolution.d.ts
type ExecutableResolution = {
  rawExecutable: string;
  resolvedPath?: string;
  resolvedRealPath?: string;
  executableName: string;
};
type CommandResolution = {
  execution: ExecutableResolution;
  policy: ExecutableResolution;
  effectiveArgv?: string[];
  wrapperChain?: string[];
  policyBlocked?: boolean;
  blockedWrapper?: string;
};
declare function resolveCommandResolution(command: string, cwd?: string, env?: NodeJS.ProcessEnv): CommandResolution | null;
declare function resolveCommandResolutionFromArgv(argv: string[], cwd?: string, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform): CommandResolution | null;
declare function resolveExecutableTrustPath(resolution: ExecutableResolution | null | undefined, cwd?: string): string | undefined;
declare function resolveExecutionTargetResolution(resolution: CommandResolution | ExecutableResolution | null): ExecutableResolution | null;
declare function resolvePolicyTargetResolution(resolution: CommandResolution | ExecutableResolution | null): ExecutableResolution | null;
declare function resolveExecutionTargetCandidatePath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function resolveExecutionTargetTrustPath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function resolvePolicyTargetCandidatePath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function resolvePolicyTargetTrustPath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function resolveApprovalAuditCandidatePath(resolution: CommandResolution | null, cwd?: string): string | undefined;
declare function resolveApprovalAuditTrustPath(resolution: CommandResolution | null, cwd?: string): string | undefined;
/** @deprecated Use resolveExecutionTargetCandidatePath. */
declare function resolveAllowlistCandidatePath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function resolvePolicyAllowlistCandidatePath(resolution: CommandResolution | ExecutableResolution | null, cwd?: string): string | undefined;
declare function matchAllowlist(entries: ExecAllowlistEntry[], resolution: ExecutableResolution | null, argv?: string[], platform?: string | null): ExecAllowlistEntry | null;
type ExecArgvToken = {
  kind: "empty";
  raw: string;
} | {
  kind: "terminator";
  raw: string;
} | {
  kind: "stdin";
  raw: string;
} | {
  kind: "positional";
  raw: string;
} | {
  kind: "option";
  raw: string;
  style: "long";
  flag: string;
  inlineValue?: string;
} | {
  kind: "option";
  raw: string;
  style: "short-cluster";
  cluster: string;
  flags: string[];
};
/**
 * Tokenizes a single argv entry into a normalized option/positional model.
 * Consumers can share this model to keep argv parsing behavior consistent.
 */
declare function parseExecArgvToken(raw: string): ExecArgvToken;
//#endregion
//#region src/infra/exec-approvals-analysis.d.ts
type ExecCommandSegment = {
  raw: string;
  argv: string[];
  sourceArgv?: string[];
  resolution: CommandResolution | null;
};
type ExecCommandAnalysis = {
  ok: boolean;
  reason?: string;
  segments: ExecCommandSegment[];
  chains?: ExecCommandSegment[][];
};
type ShellChainOperator = "&&" | "||" | ";";
type ShellChainPart = {
  part: string;
  opToNext: ShellChainOperator | null;
};
declare function isWindowsPlatform(platform?: string | null): boolean;
/**
 * Splits a command string by chain operators (&&, ||, ;) while preserving the operators.
 * Returns null when no chain is present or when the chain is malformed.
 */
declare function splitCommandChainWithOperators(command: string): ShellChainPart[] | null;
declare function windowsEscapeArg(value: string): {
  ok: true;
  escaped: string;
} | {
  ok: false;
};
/**
 * Builds a shell command string that preserves pipes/chaining, but forces *arguments* to be
 * literal (no globbing, no env-var expansion) by single-quoting every argv token.
 *
 * Used to make "safe bins" actually stdin-only even though execution happens via `shell -c`.
 */
declare function buildSafeShellCommand(params: {
  command: string;
  platform?: string | null;
}): {
  ok: boolean;
  command?: string;
  reason?: string;
};
declare function resolvePlannedSegmentArgv(segment: ExecCommandSegment): string[] | null;
/**
 * Rebuilds a shell command and selectively single-quotes argv tokens for segments that
 * must be treated as literal (safeBins hardening) while preserving the rest of the
 * shell syntax (pipes + chaining).
 */
declare function buildSafeBinsShellCommand(params: {
  command: string;
  segments: ExecCommandSegment[];
  segmentSatisfiedBy: ("allowlist" | "safeBins" | "safeBuiltins" | "inlineChain" | "skills" | null)[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
}): {
  ok: boolean;
  command?: string;
  reason?: string;
};
declare function buildEnforcedShellCommand(params: {
  command: string;
  segments: ExecCommandSegment[];
  platform?: string | null;
}): {
  ok: boolean;
  command?: string;
  reason?: string;
};
/**
 * Splits a command string by chain operators (&&, ||, ;) while respecting quotes.
 * Returns null when no chain is present or when the chain is malformed.
 */
declare function splitCommandChain(command: string): string[] | null;
declare function analyzeShellCommand(params: {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
}): ExecCommandAnalysis;
declare function analyzeArgvCommand(params: {
  argv: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
}): ExecCommandAnalysis;
//#endregion
//#region src/infra/command-analysis/explain.d.ts
/** Compact command explanation summary shown in approval UI. */
type CommandExplanationSummary = {
  commandCount: number;
  nestedCommandCount: number;
  riskKinds: string[];
  warningLines: string[];
};
//#endregion
//#region src/infra/exec-safe-bin-trust.d.ts
type TrustedSafeBinPathParams = {
  resolvedPath: string;
  trustedDirs?: ReadonlySet<string>;
};
declare function isTrustedSafeBinPath(params: TrustedSafeBinPathParams): boolean;
//#endregion
//#region src/infra/exec-approvals-allowlist.d.ts
declare function normalizeSafeBins(entries?: readonly string[]): Set<string>;
declare function resolveSafeBins(entries?: readonly string[] | null): Set<string>;
declare function isSafeBinUsage(params: {
  argv: string[];
  resolution: ExecutableResolution | null;
  safeBins: Set<string>;
  platform?: string | null;
  trustedSafeBinDirs?: ReadonlySet<string>;
  safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
  isTrustedSafeBinPathFn?: typeof isTrustedSafeBinPath;
}): boolean;
type ExecAllowlistEvaluation = {
  allowlistSatisfied: boolean;
  allowlistMatches: ExecAllowlistEntry[];
  segmentAllowlistEntries: Array<ExecAllowlistEntry | null>;
  segmentSatisfiedBy: ExecSegmentSatisfiedBy[];
};
type ExecSegmentSatisfiedBy = "allowlist" | "safeBins" | "inlineChain" | "safeBuiltins" | "skills" | null;
type SkillBinTrustEntry = {
  name: string;
  resolvedPath: string;
};
type ExecAllowlistContext = {
  allowlist: ExecAllowlistEntry[];
  safeBins: Set<string>;
  safeBinProfiles?: Readonly<Record<string, SafeBinProfile>>;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  trustedSafeBinDirs?: ReadonlySet<string>;
  skillBins?: readonly SkillBinTrustEntry[];
  autoAllowSkills?: boolean;
  allowShellBuiltins?: boolean;
};
declare function evaluateExecAllowlist(params: {
  analysis: ExecCommandAnalysis;
} & ExecAllowlistContext): ExecAllowlistEvaluation;
type ExecAllowlistAnalysis = {
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  allowlistMatches: ExecAllowlistEntry[];
  segments: ExecCommandSegment[];
  segmentAllowlistEntries: Array<ExecAllowlistEntry | null>;
  segmentSatisfiedBy: ExecSegmentSatisfiedBy[];
};
type AllowAlwaysPattern = {
  pattern: string;
  argPattern?: string;
};
/**
 * Derive persisted allowlist patterns for an "allow always" decision.
 * When a command is wrapped in a shell (for example `zsh -lc "<cmd>"`),
 * persist the inner executable(s) rather than the shell binary.
 */
declare function resolveAllowAlwaysPatternEntries(params: {
  segments: ExecCommandSegment[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  strictInlineEval?: boolean;
}): AllowAlwaysPattern[];
declare function resolveAllowAlwaysPatterns(params: {
  segments: ExecCommandSegment[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  strictInlineEval?: boolean;
}): string[];
/**
 * Evaluates allowlist for shell commands (including &&, ||, ;) and returns analysis metadata.
 */
declare function evaluateShellAllowlist(params: {
  command: string;
  env?: NodeJS.ProcessEnv;
} & ExecAllowlistContext): ExecAllowlistAnalysis;
//#endregion
//#region src/infra/exec-approvals.d.ts
type ExecHost = "sandbox" | "gateway" | "node";
type ExecTarget = "auto" | ExecHost;
type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";
type ExecMode = "deny" | "allowlist" | "ask" | "auto" | "full";
declare const EXEC_TARGET_VALUES: readonly ExecTarget[];
declare function normalizeExecHost(value?: string | null): ExecHost | null;
declare function normalizeExecTarget(value?: string | null): ExecTarget | null;
declare function requireValidExecTarget(value?: unknown): ExecTarget | null;
declare function normalizeExecSecurity(value?: string | null): ExecSecurity | null;
declare function normalizeExecAsk(value?: string | null): ExecAsk | null;
declare function normalizeExecMode(value?: string | null): ExecMode | null;
declare function resolveExecModeFromPolicy(params: {
  security: ExecSecurity;
  ask: ExecAsk;
}): ExecMode;
declare function resolveExecPolicyForMode(mode: ExecMode): {
  security: ExecSecurity;
  ask: ExecAsk;
  autoReview: boolean;
};
declare function resolveExecModePolicy(params: {
  mode?: ExecMode | null;
  security: ExecSecurity;
  ask: ExecAsk;
}): {
  mode: ExecMode;
  security: ExecSecurity;
  ask: ExecAsk;
  autoReview: boolean;
};
type SystemRunApprovalBinding = {
  argv: string[];
  cwd: string | null;
  agentId: string | null;
  sessionKey: string | null;
  envHash: string | null;
};
type SystemRunApprovalFileOperand = {
  argvIndex: number;
  path: string;
  sha256: string;
};
type SystemRunApprovalPlan = {
  argv: string[];
  cwd: string | null;
  commandText: string;
  commandPreview?: string | null;
  agentId: string | null;
  sessionKey: string | null;
  mutableFileOperand?: SystemRunApprovalFileOperand | null;
};
type ExecApprovalCommandSpan = {
  startIndex: number;
  endIndex: number;
};
type ExecApprovalRequestPayload = {
  command: string;
  commandPreview?: string | null;
  commandArgv?: string[];
  envKeys?: string[];
  systemRunBinding?: SystemRunApprovalBinding | null;
  systemRunPlan?: SystemRunApprovalPlan | null;
  cwd?: string | null;
  nodeId?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  warningText?: string | null;
  commandAnalysis?: CommandExplanationSummary | null;
  commandSpans?: ExecApprovalCommandSpan[];
  allowedDecisions?: readonly ExecApprovalDecision[];
  agentId?: string | null;
  resolvedPath?: string | null;
  sessionKey?: string | null;
  turnSourceChannel?: string | null;
  turnSourceTo?: string | null;
  turnSourceAccountId?: string | null;
  turnSourceThreadId?: string | number | null;
};
type ExecApprovalRequest = {
  id: string;
  request: ExecApprovalRequestPayload;
  createdAtMs: number;
  expiresAtMs: number;
};
type ExecApprovalResolved = {
  id: string;
  decision: ExecApprovalDecision;
  resolvedBy?: string | null;
  ts: number;
  request?: ExecApprovalRequest["request"];
};
type ExecApprovalsDefaults = {
  security?: ExecSecurity;
  ask?: ExecAsk;
  askFallback?: ExecSecurity;
  autoAllowSkills?: boolean;
};
type ExecApprovalsAgent = ExecApprovalsDefaults & {
  allowlist?: ExecAllowlistEntry[];
};
type ExecApprovalsFile = {
  version: 1;
  socket?: {
    path?: string;
    token?: string;
  };
  defaults?: ExecApprovalsDefaults;
  agents?: Record<string, ExecApprovalsAgent>;
};
type ExecApprovalsSnapshot = {
  path: string;
  exists: boolean;
  raw: string | null;
  file: ExecApprovalsFile;
  hash: string;
};
type ExecApprovalsResolved = {
  path: string;
  socketPath: string;
  token: string;
  defaults: Required<ExecApprovalsDefaults>;
  agent: Required<ExecApprovalsDefaults>;
  agentSources: {
    security: string | null;
    ask: string | null;
    askFallback: string | null;
  };
  allowlist: ExecAllowlistEntry[];
  file: ExecApprovalsFile;
};
declare const DEFAULT_EXEC_APPROVAL_TIMEOUT_MS = 1800000;
declare const DEFAULT_EXEC_APPROVAL_ASK_FALLBACK: ExecSecurity;
declare function resolveExecApprovalsPath(): string;
declare function resolveExecApprovalsSocketPath(): string;
declare function resolveExecApprovalsDisplayPath(): string;
declare function resolveExecApprovalsTranscriptPath(): string;
declare function normalizeExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile;
declare function mergeExecApprovalsSocketDefaults(params: {
  normalized: ExecApprovalsFile;
  current?: ExecApprovalsFile;
}): ExecApprovalsFile;
declare function readExecApprovalsSnapshot(): ExecApprovalsSnapshot;
declare function loadExecApprovals(): ExecApprovalsFile;
declare function saveExecApprovals(file: ExecApprovalsFile): void;
declare function restoreExecApprovalsSnapshot(snapshot: ExecApprovalsSnapshot): void;
declare function ensureExecApprovals(): ExecApprovalsFile;
type ExecApprovalsDefaultOverrides = {
  security?: ExecSecurity;
  ask?: ExecAsk;
  askFallback?: ExecSecurity;
  autoAllowSkills?: boolean;
  requireSocket?: boolean;
};
declare function resolveExecApprovals(agentId?: string, overrides?: ExecApprovalsDefaultOverrides): ExecApprovalsResolved;
declare function resolveExecApprovalsFromFile(params: {
  file: ExecApprovalsFile;
  agentId?: string;
  overrides?: ExecApprovalsDefaultOverrides;
  path?: string;
  socketPath?: string;
  token?: string;
}): ExecApprovalsResolved;
declare function requiresExecApproval(params: {
  ask: ExecAsk;
  security: ExecSecurity;
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  durableApprovalSatisfied?: boolean;
}): boolean;
declare function commandRequiresSecurityAuditSuppressionApproval(params: {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  segments: Array<{
    argv: string[];
    raw?: string;
  }>;
}): boolean;
declare function hasDurableExecApproval(params: {
  analysisOk: boolean;
  segmentAllowlistEntries: Array<ExecAllowlistEntry | null>;
  allowlist?: readonly ExecAllowlistEntry[];
  commandText?: string | null;
}): boolean;
declare function hasNodeCommandAllowAlwaysMarker(params: {
  allowlist?: readonly ExecAllowlistEntry[];
  commandText?: string | null;
}): boolean;
declare function recordAllowlistUse(approvals: ExecApprovalsFile, agentId: string | undefined, entry: ExecAllowlistEntry, command: string, resolvedPath?: string): void;
declare function recordAllowlistMatchesUse(params: {
  approvals: ExecApprovalsFile;
  agentId: string | undefined;
  matches: readonly ExecAllowlistEntry[];
  command: string;
  resolvedPath?: string;
}): void;
declare function addAllowlistEntry(approvals: ExecApprovalsFile, agentId: string | undefined, pattern: string, options?: {
  argPattern?: string;
  source?: ExecAllowlistEntry["source"];
}): void;
declare function addDurableCommandApproval(approvals: ExecApprovalsFile, agentId: string | undefined, commandText: string): void;
declare function resolveAllowAlwaysPatternCoverage(params: {
  segments: ExecCommandSegment[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  strictInlineEval?: boolean;
}): {
  complete: boolean;
  patterns: ReturnType<typeof resolveAllowAlwaysPatternEntries>;
};
declare function persistAllowAlwaysPatterns(params: {
  approvals: ExecApprovalsFile;
  agentId: string | undefined;
  segments: ExecCommandSegment[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: string | null;
  commandText?: string;
  strictInlineEval?: boolean;
}): ReturnType<typeof resolveAllowAlwaysPatternEntries>;
declare function minSecurity(a: ExecSecurity, b: ExecSecurity): ExecSecurity;
declare function maxAsk(a: ExecAsk, b: ExecAsk): ExecAsk;
type ExecApprovalDecision = "allow-once" | "allow-always" | "deny";
declare const DEFAULT_EXEC_APPROVAL_DECISIONS: readonly ["allow-once", "allow-always", "deny"];
declare function resolveExecApprovalAllowedDecisions(params?: {
  ask?: string | null;
}): readonly ExecApprovalDecision[];
declare function resolveExecApprovalRequestAllowedDecisions(params?: {
  ask?: string | null;
  allowedDecisions?: readonly ExecApprovalDecision[] | readonly string[] | null;
}): readonly ExecApprovalDecision[];
declare function isExecApprovalDecisionAllowed(params: {
  decision: ExecApprovalDecision;
  ask?: string | null;
}): boolean;
declare function requestExecApprovalViaSocket(params: {
  socketPath: string;
  token: string;
  request: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ExecApprovalDecision | null>;
//#endregion
export { resolveExecApprovalsFromFile as $, ExecAllowlistEntry as $t, isExecApprovalDecisionAllowed as A, isWindowsPlatform as At, normalizeExecTarget as B, resolveAllowlistCandidatePath as Bt, SystemRunApprovalPlan as C, ShellChainOperator as Ct, ensureExecApprovals as D, buildEnforcedShellCommand as Dt, commandRequiresSecurityAuditSuppressionApproval as E, analyzeShellCommand as Et, normalizeExecApprovals as F, CommandResolution as Ft, requestExecApprovalViaSocket as G, resolveExecutableTrustPath as Gt, readExecApprovalsSnapshot as H, resolveApprovalAuditTrustPath as Ht, normalizeExecAsk as I, ExecArgvToken as It, resolveAllowAlwaysPatternCoverage as J, resolveExecutionTargetTrustPath as Jt, requireValidExecTarget as K, resolveExecutionTargetCandidatePath as Kt, normalizeExecHost as L, ExecutableResolution as Lt, maxAsk as M, splitCommandChain as Mt, mergeExecApprovalsSocketDefaults as N, splitCommandChainWithOperators as Nt, hasDurableExecApproval as O, buildSafeBinsShellCommand as Ot, minSecurity as P, windowsEscapeArg as Pt, resolveExecApprovalsDisplayPath as Q, resolvePolicyTargetTrustPath as Qt, normalizeExecMode as R, matchAllowlist as Rt, SystemRunApprovalFileOperand as S, ExecCommandSegment as St, addDurableCommandApproval as T, analyzeArgvCommand as Tt, recordAllowlistMatchesUse as U, resolveCommandResolution as Ut, persistAllowAlwaysPatterns as V, resolveApprovalAuditCandidatePath as Vt, recordAllowlistUse as W, resolveCommandResolutionFromArgv as Wt, resolveExecApprovalRequestAllowedDecisions as X, resolvePolicyTargetCandidatePath as Xt, resolveExecApprovalAllowedDecisions as Y, resolvePolicyAllowlistCandidatePath as Yt, resolveExecApprovals as Z, resolvePolicyTargetResolution as Zt, ExecHost as _, resolveAllowAlwaysPatternEntries as _t, ExecApprovalCommandSpan as a, resolveExecPolicyForMode as at, ExecTarget as b, CommandExplanationSummary as bt, ExecApprovalRequestPayload as c, AllowAlwaysPattern as ct, ExecApprovalsDefaultOverrides as d, ExecSegmentSatisfiedBy as dt, resolveExecApprovalsPath as et, ExecApprovalsDefaults as f, SkillBinTrustEntry as ft, ExecAsk as g, normalizeSafeBins as gt, ExecApprovalsSnapshot as h, isSafeBinUsage as ht, EXEC_TARGET_VALUES as i, resolveExecModePolicy as it, loadExecApprovals as j, resolvePlannedSegmentArgv as jt, hasNodeCommandAllowAlwaysMarker as k, buildSafeShellCommand as kt, ExecApprovalResolved as l, ExecAllowlistAnalysis as lt, ExecApprovalsResolved as m, evaluateShellAllowlist as mt, DEFAULT_EXEC_APPROVAL_DECISIONS as n, resolveExecApprovalsTranscriptPath as nt, ExecApprovalDecision as o, restoreExecApprovalsSnapshot as ot, ExecApprovalsFile as p, evaluateExecAllowlist as pt, requiresExecApproval as q, resolveExecutionTargetResolution as qt, DEFAULT_EXEC_APPROVAL_TIMEOUT_MS as r, resolveExecModeFromPolicy as rt, ExecApprovalRequest as s, saveExecApprovals as st, DEFAULT_EXEC_APPROVAL_ASK_FALLBACK as t, resolveExecApprovalsSocketPath as tt, ExecApprovalsAgent as u, ExecAllowlistEvaluation as ut, ExecMode as v, resolveAllowAlwaysPatterns as vt, addAllowlistEntry as w, ShellChainPart as wt, SystemRunApprovalBinding as x, ExecCommandAnalysis as xt, ExecSecurity as y, resolveSafeBins as yt, normalizeExecSecurity as z, parseExecArgvToken as zt };