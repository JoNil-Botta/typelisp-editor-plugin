import { n as buildGoogleVertexStaticCatalogProvider, t as buildGoogleStaticCatalogProvider } from "../../provider-catalog-A3FUHqQX.js";
import { a as resolveGoogleVertexConfigApiKey } from "../../vertex-adc-BojntflG.js";
//#region extensions/google/provider-discovery.ts
const googleProviderDiscovery = {
	id: "google",
	label: "Google AI Studio",
	docsPath: "/providers/models",
	auth: [],
	resolveConfigApiKey: ({ provider, env }) => provider === "google-vertex" ? resolveGoogleVertexConfigApiKey(env) : void 0,
	staticCatalog: {
		order: "simple",
		run: async () => ({ providers: {
			google: buildGoogleStaticCatalogProvider(),
			"google-vertex": buildGoogleVertexStaticCatalogProvider()
		} })
	}
};
//#endregion
export { googleProviderDiscovery as default };
