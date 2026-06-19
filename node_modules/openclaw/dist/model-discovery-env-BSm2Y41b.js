//#region extensions/chutes/model-discovery-env.ts
/**
* Environment helper for Chutes model discovery behavior in tests.
*/
/** Returns whether dynamic Chutes model discovery should use test behavior. */
function isChutesModelDiscoveryTestEnvironment(env = process.env) {
	return env.NODE_ENV === "test" || env.VITEST === "true";
}
//#endregion
export { isChutesModelDiscoveryTestEnvironment as t };
