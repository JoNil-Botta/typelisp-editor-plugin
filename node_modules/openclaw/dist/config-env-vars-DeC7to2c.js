import { a as normalizeEnvVarKey, n as isDangerousHostEnvOverrideVarName, r as isDangerousHostEnvVarName } from "./host-env-security-RnaFYKhk.js";
import { n as containsEnvVarReference } from "./env-substitution-BWBLYD_t.js";
//#region src/config/config-env-vars.ts
function isBlockedConfigEnvVar(key) {
	return isDangerousHostEnvVarName(key) || isDangerousHostEnvOverrideVarName(key);
}
function collectConfigEnvVarsByTarget(cfg) {
	const envConfig = cfg?.env;
	if (!envConfig) return {};
	const entries = {};
	if (envConfig.vars) for (const [rawKey, value] of Object.entries(envConfig.vars)) {
		if (typeof value !== "string" || !value.trim()) continue;
		const key = normalizeEnvVarKey(rawKey, { portable: true });
		if (!key) continue;
		if (isBlockedConfigEnvVar(key)) continue;
		if (containsEnvVarReference(value)) continue;
		entries[key] = value;
	}
	for (const [rawKey, value] of Object.entries(envConfig)) {
		if (rawKey === "shellEnv" || rawKey === "vars") continue;
		if (typeof value !== "string" || !value.trim()) continue;
		const key = normalizeEnvVarKey(rawKey, { portable: true });
		if (!key) continue;
		if (isBlockedConfigEnvVar(key)) continue;
		if (containsEnvVarReference(value)) continue;
		entries[key] = value;
	}
	return entries;
}
/** Collects config env vars safe to inject into runtime process environments. */
function collectConfigRuntimeEnvVars(cfg) {
	return collectConfigEnvVarsByTarget(cfg);
}
/** Collects config env vars safe to persist into managed service environments. */
function collectConfigServiceEnvVars(cfg) {
	return collectConfigEnvVarsByTarget(cfg);
}
/** Builds a cloned environment with config env vars applied without mutating the base env. */
function createConfigRuntimeEnv(cfg, baseEnv = process.env) {
	const env = { ...baseEnv };
	applyConfigEnvVars(cfg, env);
	return env;
}
/** Applies config env vars to an environment without overwriting existing non-empty values. */
function applyConfigEnvVars(cfg, env = process.env) {
	const entries = collectConfigRuntimeEnvVars(cfg);
	for (const [key, value] of Object.entries(entries)) {
		if (env[key]?.trim()) continue;
		if (containsEnvVarReference(value)) continue;
		env[key] = value;
	}
}
//#endregion
export { collectConfigServiceEnvVars as n, createConfigRuntimeEnv as r, applyConfigEnvVars as t };
