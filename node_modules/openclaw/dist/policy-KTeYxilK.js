import { o as detectInlineEvalInSegments } from "./risks-DRxJ1pW5.js";
import { n as analyzeShellCommand, t as analyzeArgvCommand } from "./exec-approvals-analysis-B4N2JXzl.js";
//#region src/infra/command-analysis/policy.ts
/** Parses a shell or argv command into command segments for approval policy checks. */
function analyzeCommandForPolicy(params) {
	const analysis = params.source === "shell" ? analyzeShellCommand({
		command: params.command,
		cwd: params.cwd,
		env: params.env,
		platform: params.platform
	}) : analyzeArgvCommand({
		argv: params.argv,
		cwd: params.cwd,
		env: params.env
	});
	if (!analysis.ok) return {
		ok: false,
		source: params.source,
		reason: analysis.reason,
		analysis,
		segments: []
	};
	return {
		ok: true,
		source: params.source,
		analysis,
		segments: analysis.segments
	};
}
function detectPolicyInlineEval(segments) {
	return detectInlineEvalInSegments(segments);
}
//#endregion
export { detectPolicyInlineEval as n, analyzeCommandForPolicy as t };
