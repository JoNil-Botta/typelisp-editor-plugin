//#region src/utils/message-channel-constants.ts
const INTERNAL_MESSAGE_CHANNEL = "webchat";
const INTERNAL_NON_DELIVERY_CHANNELS = [
	"heartbeat",
	"cron",
	"webhook",
	"voice",
	"sessions_send"
];
function isInternalNonDeliveryChannel(value) {
	return INTERNAL_NON_DELIVERY_CHANNELS.includes(value);
}
//#endregion
export { isInternalNonDeliveryChannel as n, INTERNAL_MESSAGE_CHANNEL as t };
