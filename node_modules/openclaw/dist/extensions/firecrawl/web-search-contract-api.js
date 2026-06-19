import { r as buildFirecrawlWebSearchProviderBase } from "../../web-search-shared-DwGUlBhx.js";
//#region extensions/firecrawl/web-search-contract-api.ts
function createFirecrawlWebSearchProvider() {
	return {
		...buildFirecrawlWebSearchProviderBase(),
		createTool: () => null
	};
}
//#endregion
export { createFirecrawlWebSearchProvider };
