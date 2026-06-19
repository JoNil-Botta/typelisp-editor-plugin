//#region src/auto-reply/reply-payload.ts
const REPLY_MEDIA_FAILURE_WARNING = "⚠️ Media failed.";
/** Appends the standard media failure warning without duplicating it. */
function appendReplyMediaFailureWarning(text) {
	if (!text?.trim()) return REPLY_MEDIA_FAILURE_WARNING;
	if (text.includes("⚠️ Media failed.")) return text;
	return `${text}\n${REPLY_MEDIA_FAILURE_WARNING}`;
}
function normalizeTtsSupplementSpokenText(value) {
	return typeof value === "string" && value.trim() ? value : void 0;
}
function hasReplyPayloadMedia(payload) {
	return Boolean(payload.mediaUrl?.trim() || payload.mediaUrls?.some((url) => url.trim()));
}
/** Returns normalized TTS supplement metadata only when the payload has media to carry it. */
function getReplyPayloadTtsSupplement(payload) {
	const spokenText = normalizeTtsSupplementSpokenText(payload.ttsSupplement?.spokenText);
	if (!spokenText || !hasReplyPayloadMedia(payload)) return;
	return {
		spokenText,
		...payload.ttsSupplement?.visibleTextAlreadyDelivered === true ? { visibleTextAlreadyDelivered: true } : {}
	};
}
/** Returns true when the payload is a valid TTS supplement media payload. */
function isReplyPayloadTtsSupplement(payload) {
	return Boolean(getReplyPayloadTtsSupplement(payload));
}
/** Marks a reply payload as supplemental TTS media while preserving the original shape. */
function markReplyPayloadAsTtsSupplement(payload, spokenText = payload.spokenText ?? payload.text ?? "", options) {
	const normalizedSpokenText = normalizeTtsSupplementSpokenText(spokenText);
	if (!normalizedSpokenText) return payload;
	return {
		...payload,
		spokenText: normalizedSpokenText,
		ttsSupplement: {
			spokenText: normalizedSpokenText,
			...options?.visibleTextAlreadyDelivered === true ? { visibleTextAlreadyDelivered: true } : {}
		}
	};
}
/** Removes visible-only fields from a payload that should be delivered as TTS supplement media. */
function buildTtsSupplementMediaPayload(payload) {
	const supplement = getReplyPayloadTtsSupplement(payload);
	if (!supplement) return payload;
	const { text: _text, presentation: _presentation, interactive: _interactive, btw: _btw, ...mediaPayload } = payload;
	return {
		...mediaPayload,
		spokenText: supplement.spokenText,
		ttsSupplement: supplement
	};
}
const replyPayloadMetadata = /* @__PURE__ */ new WeakMap();
/** Adds internal metadata to a reply payload object. */
function setReplyPayloadMetadata(payload, metadata) {
	const previous = replyPayloadMetadata.get(payload);
	replyPayloadMetadata.set(payload, {
		...previous,
		...metadata
	});
	return payload;
}
/** Reads internal metadata attached to a reply payload object. */
function getReplyPayloadMetadata(payload) {
	return replyPayloadMetadata.get(payload);
}
/** Returns true when a payload is the synthesized warning for a non-terminal tool error. */
function isReplyPayloadNonTerminalToolErrorWarning(payload) {
	return getReplyPayloadMetadata(payload)?.nonTerminalToolErrorWarning === true;
}
/** Copies internal payload metadata when cloning or transforming payload objects. */
function copyReplyPayloadMetadata(source, payload) {
	const metadata = getReplyPayloadMetadata(source);
	return metadata ? setReplyPayloadMetadata(payload, metadata) : payload;
}
/** Marks a notice payload as deliverable even when normal source replies are suppressed. */
function markReplyPayloadForSourceSuppressionDelivery(payload) {
	return setReplyPayloadMetadata(payload, { deliverDespiteSourceReplySuppression: true });
}
function markCommandReplyForDelivery(reply) {
	if (!reply) return reply;
	if (Array.isArray(reply)) return reply.map((payload) => markReplyPayloadForSourceSuppressionDelivery(payload));
	return markReplyPayloadForSourceSuppressionDelivery(reply);
}
/** Returns true for internal status/notice payloads, not assistant answer content. */
function isReplyPayloadStatusNotice(payload) {
	return Boolean(payload.isCompactionNotice || payload.isFallbackNotice || payload.isStatusNotice);
}
//#endregion
export { getReplyPayloadTtsSupplement as a, isReplyPayloadTtsSupplement as c, markReplyPayloadForSourceSuppressionDelivery as d, setReplyPayloadMetadata as f, getReplyPayloadMetadata as i, markCommandReplyForDelivery as l, buildTtsSupplementMediaPayload as n, isReplyPayloadNonTerminalToolErrorWarning as o, copyReplyPayloadMetadata as r, isReplyPayloadStatusNotice as s, appendReplyMediaFailureWarning as t, markReplyPayloadAsTtsSupplement as u };
