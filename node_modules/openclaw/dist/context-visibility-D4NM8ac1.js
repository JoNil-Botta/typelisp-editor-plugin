import { n as normalizeAccountId } from "./account-id-Df9e41E6.js";
import { t as resolveAccountEntry } from "./account-lookup-DL1YTqjF.js";
//#region src/config/context-visibility.ts
/** Reads the global channel default supplemental context visibility mode. */
function resolveDefaultContextVisibility(cfg) {
	return cfg.channels?.defaults?.contextVisibility;
}
/** Resolves supplemental context visibility using explicit, account, channel, default precedence. */
function resolveChannelContextVisibilityMode(params) {
	if (params.configuredContextVisibility) return params.configuredContextVisibility;
	const channelConfig = params.cfg.channels?.[params.channel];
	const accountId = normalizeAccountId(params.accountId);
	return resolveAccountEntry(channelConfig?.accounts, accountId)?.contextVisibility ?? channelConfig?.contextVisibility ?? resolveDefaultContextVisibility(params.cfg) ?? "all";
}
//#endregion
export { resolveDefaultContextVisibility as n, resolveChannelContextVisibilityMode as t };
