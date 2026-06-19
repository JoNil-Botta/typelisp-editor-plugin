import { n as channelRouteDedupeKey } from "./channel-route-D7X5briz.js";
//#region src/infra/approval-native-target-key.ts
/** Builds the stable dedupe key used to compare channel-native approval targets. */
function buildChannelApprovalNativeTargetKey(target) {
	return channelRouteDedupeKey({
		to: target.to,
		threadId: target.threadId
	});
}
//#endregion
export { buildChannelApprovalNativeTargetKey as t };
