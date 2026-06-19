import { a as normalizeLowercaseStringOrEmpty } from "./string-coerce-mnp54Vah.js";
//#region src/channels/native-command-session-targets.ts
/**
* Native command session target resolver.
*
* Chooses storage and command target session keys for channel-native command events.
*/
/**
* Resolves the storage session key and command target key for native command events.
*/
function resolveNativeCommandSessionTargets(params) {
	const rawSessionKey = params.boundSessionKey ?? `agent:${params.agentId}:${params.sessionPrefix}:${params.userId}`;
	return {
		sessionKey: params.lowercaseSessionKey ? normalizeLowercaseStringOrEmpty(rawSessionKey) : rawSessionKey,
		commandTargetSessionKey: params.boundSessionKey ?? params.targetSessionKey
	};
}
//#endregion
export { resolveNativeCommandSessionTargets as t };
