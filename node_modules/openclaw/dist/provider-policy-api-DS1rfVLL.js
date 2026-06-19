//#region extensions/moonshot/provider-policy-api.ts
const KIMI_K2_7_CODE_MODEL_ID = "kimi-k2.7-code";
function resolveThinkingProfile(context) {
	if (context.modelId.trim().toLowerCase() === "kimi-k2.7-code") return {
		levels: [{
			id: "low",
			label: "on"
		}],
		defaultLevel: "low",
		preserveWhenCatalogReasoningFalse: true
	};
	return {
		levels: [{
			id: "off",
			label: "off"
		}, {
			id: "low",
			label: "on"
		}],
		defaultLevel: "off"
	};
}
//#endregion
export { resolveThinkingProfile as n, KIMI_K2_7_CODE_MODEL_ID as t };
