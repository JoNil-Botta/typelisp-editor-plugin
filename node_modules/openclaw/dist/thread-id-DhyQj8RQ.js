import { l as normalizeOptionalStringifiedId } from "./string-coerce-mnp54Vah.js";
//#region src/infra/outbound/thread-id.ts
/** Normalizes channel thread/topic ids before outbound payload construction. */
function normalizeOutboundThreadId(value) {
	return normalizeOptionalStringifiedId(value);
}
//#endregion
export { normalizeOutboundThreadId as t };
