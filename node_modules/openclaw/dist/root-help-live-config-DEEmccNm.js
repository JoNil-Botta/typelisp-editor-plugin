//#region src/cli/root-help-live-config.ts
function hasEntries(value) {
	return value !== void 0 && Object.keys(value).length > 0;
}
function hasListEntries(value) {
	return Array.isArray(value) && value.length > 0;
}
/** Detect config fields that can change which plugin help sections are rendered. */
function hasPluginHelpAffectingConfig(config) {
	const plugins = config?.plugins;
	if (!plugins) return false;
	return plugins.enabled === false || hasListEntries(plugins.allow) || hasListEntries(plugins.deny) || hasListEntries(plugins.load?.paths) || hasEntries(plugins.slots) || hasEntries(plugins.entries) || hasEntries(plugins.installs);
}
/** Detect env vars that can change bundled plugin availability in root help. */
function hasPluginHelpAffectingEnv(env) {
	return Boolean(env.OPENCLAW_BUNDLED_PLUGINS_DIR?.trim() || env.OPENCLAW_DISABLE_BUNDLED_PLUGINS?.trim());
}
/** Load render options only when config/env can affect plugin help output. */
async function loadRootHelpRenderOptionsForConfigSensitivePlugins(env = process.env) {
	const snapshot = await (await import("./config/config.js")).readConfigFileSnapshot({
		observe: false,
		skipPluginValidation: true
	});
	if (!snapshot.valid) return null;
	if (!hasPluginHelpAffectingEnv(env) && !hasPluginHelpAffectingConfig(snapshot.sourceConfig)) return null;
	return {
		config: snapshot.runtimeConfig,
		env
	};
}
//#endregion
export { hasPluginHelpAffectingConfig, hasPluginHelpAffectingEnv, loadRootHelpRenderOptionsForConfigSensitivePlugins };
