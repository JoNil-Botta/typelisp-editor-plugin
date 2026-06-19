import { t as createWebSearchProviderContractFields } from "./provider-web-search-contract-vmITpMTy.js";
//#region extensions/firecrawl/web-search-shared.ts
const FIRECRAWL_CREDENTIAL_PATH = "plugins.entries.firecrawl.config.webSearch.apiKey";
const FIRECRAWL_FETCH_CREDENTIAL_PATH = "plugins.entries.firecrawl.config.webFetch.apiKey";
function getConfiguredFirecrawlFetchCredentialFallback(config) {
	const apiKey = (config?.plugins?.entries?.firecrawl?.config)?.webFetch?.apiKey;
	return apiKey === void 0 ? void 0 : {
		path: FIRECRAWL_FETCH_CREDENTIAL_PATH,
		value: apiKey
	};
}
function buildFirecrawlWebSearchProviderBase() {
	return {
		id: "firecrawl",
		label: "Firecrawl Search",
		hint: "Structured results with optional result scraping",
		onboardingScopes: ["text-inference"],
		credentialLabel: "Firecrawl API key",
		envVars: ["FIRECRAWL_API_KEY"],
		placeholder: "fc-...",
		signupUrl: "https://www.firecrawl.dev/",
		docsUrl: "https://docs.openclaw.ai/tools/firecrawl",
		autoDetectOrder: 60,
		credentialPath: FIRECRAWL_CREDENTIAL_PATH,
		...createWebSearchProviderContractFields({
			credentialPath: FIRECRAWL_CREDENTIAL_PATH,
			searchCredential: {
				type: "scoped",
				scopeId: "firecrawl"
			},
			configuredCredential: { pluginId: "firecrawl" },
			selectionPluginId: "firecrawl"
		}),
		getConfiguredCredentialFallback: getConfiguredFirecrawlFetchCredentialFallback
	};
}
//#endregion
export { getConfiguredFirecrawlFetchCredentialFallback as i, FIRECRAWL_FETCH_CREDENTIAL_PATH as n, buildFirecrawlWebSearchProviderBase as r, FIRECRAWL_CREDENTIAL_PATH as t };
