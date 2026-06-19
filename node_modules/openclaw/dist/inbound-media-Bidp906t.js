import { c as normalizeOptionalString } from "./string-coerce-mnp54Vah.js";
//#region src/auto-reply/reply/inbound-media.ts
/** Detects inbound media and audio markers in channel message context. */
function hasNormalizedStringEntry(values) {
	return Array.isArray(values) && values.some((value) => normalizeOptionalString(value));
}
/** Returns true when the context carries current-turn media or sticker data. */
function hasInboundMedia(ctx) {
	return Boolean(ctx.StickerMediaIncluded || ctx.Sticker || normalizeOptionalString(ctx.MediaPath) || normalizeOptionalString(ctx.MediaUrl) || hasNormalizedStringEntry(ctx.MediaPaths) || hasNormalizedStringEntry(ctx.MediaUrls) || Array.isArray(ctx.MediaTypes) && ctx.MediaTypes.length > 0);
}
const AUDIO_PLACEHOLDER_RE = /^<media:audio>(\s*\([^)]*\))?$/i;
const AUDIO_HEADER_RE = /^\[Audio\b/i;
function normalizeMediaType(value) {
	return normalizeOptionalString(value)?.split(";", 1)[0]?.toLowerCase();
}
/** Returns true when media fields or body placeholders indicate inbound audio. */
function hasInboundAudio(ctx) {
	if ([normalizeMediaType(ctx.MediaType), ...Array.isArray(ctx.MediaTypes) ? ctx.MediaTypes.map((type) => normalizeMediaType(type)) : []].filter((type) => Boolean(type)).some((type) => type === "audio" || type.startsWith("audio/"))) return true;
	const trimmed = (normalizeOptionalString(ctx.BodyForCommands) ?? normalizeOptionalString(ctx.CommandBody) ?? normalizeOptionalString(ctx.RawBody) ?? normalizeOptionalString(ctx.Body) ?? "").trim();
	if (!trimmed) return false;
	return AUDIO_PLACEHOLDER_RE.test(trimmed) || AUDIO_HEADER_RE.test(trimmed);
}
//#endregion
export { hasInboundMedia as n, hasInboundAudio as t };
