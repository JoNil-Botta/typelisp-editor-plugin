import { n as ARCEE_MODEL_CATALOG, r as buildArceeModelDefinition, t as ARCEE_BASE_URL } from "./models-Ck4gEtbI.js";
//#region extensions/arcee/provider-catalog.ts
/** Canonical OpenRouter API base URL for Arcee-routed models. */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_LEGACY_BASE_URL = "https://openrouter.ai/v1";
function normalizeBaseUrl(baseUrl) {
	return (baseUrl ?? "").trim().replace(/\/+$/, "");
}
/** Normalize OpenRouter base URLs accepted for Arcee model routing. */
function normalizeArceeOpenRouterBaseUrl(baseUrl) {
	const normalized = normalizeBaseUrl(baseUrl);
	if (!normalized) return;
	if (normalized === "https://openrouter.ai/api/v1" || normalized === OPENROUTER_LEGACY_BASE_URL) return OPENROUTER_BASE_URL;
}
/** Convert a bare Arcee model id to the OpenRouter `arcee/*` id. */
function toArceeOpenRouterModelId(modelId) {
	const normalized = modelId.trim();
	if (!normalized || normalized.startsWith("arcee/")) return normalized;
	return `arcee/${normalized}`;
}
/** Build direct Arcee catalog models. */
function buildArceeCatalogModels() {
	return ARCEE_MODEL_CATALOG.map(buildArceeModelDefinition);
}
/** Build OpenRouter-routed Arcee catalog models. */
function buildArceeOpenRouterCatalogModels() {
	return buildArceeCatalogModels().map((model) => Object.assign({}, model, { id: toArceeOpenRouterModelId(model.id) }));
}
/** Build the direct Arcee provider config. */
function buildArceeProvider() {
	return {
		baseUrl: ARCEE_BASE_URL,
		api: "openai-completions",
		models: buildArceeCatalogModels()
	};
}
/** Build the OpenRouter-backed Arcee provider config. */
function buildArceeOpenRouterProvider() {
	return {
		baseUrl: OPENROUTER_BASE_URL,
		api: "openai-completions",
		models: buildArceeOpenRouterCatalogModels()
	};
}
//#endregion
export { buildArceeProvider as a, buildArceeOpenRouterProvider as i, buildArceeCatalogModels as n, normalizeArceeOpenRouterBaseUrl as o, buildArceeOpenRouterCatalogModels as r, toArceeOpenRouterModelId as s, OPENROUTER_BASE_URL as t };
