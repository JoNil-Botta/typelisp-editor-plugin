const CANONICAL_ARRAY_INDEX_SEGMENT = /^(0|[1-9]\d*)$/;
/** Parses a canonical non-negative array index segment used by config and JSON paths. */
function parseConfigPathArrayIndex(segment) {
	if (!CANONICAL_ARRAY_INDEX_SEGMENT.test(segment)) return;
	const index = Number(segment);
	return Number.isSafeInteger(index) && index <= 1e5 ? index : void 0;
}
//#endregion
export { parseConfigPathArrayIndex as t };
