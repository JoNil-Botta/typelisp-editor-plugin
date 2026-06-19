import { r as resolveUnifiedOpenAIThinkingProfile } from "../../thinking-policy-D2pce6l8.js";
//#region extensions/openai/provider-policy-api.ts
function normalizeConfig(params) {
	return params.providerConfig;
}
function resolveThinkingProfile(params) {
	switch (params.provider.trim().toLowerCase()) {
		case "openai": return resolveUnifiedOpenAIThinkingProfile(params.modelId);
		default: return null;
	}
}
//#endregion
export { normalizeConfig, resolveThinkingProfile };
