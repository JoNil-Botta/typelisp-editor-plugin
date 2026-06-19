import { s as normalizeOptionalLowercaseString } from "./string-coerce-mnp54Vah.js";
//#region packages/acp-core/src/types.ts
const ACP_PROVENANCE_MODE_VALUES = [
	"off",
	"meta",
	"meta+receipt"
];
function normalizeAcpProvenanceMode(value) {
	const normalized = normalizeOptionalLowercaseString(value);
	if (!normalized) return;
	return ACP_PROVENANCE_MODE_VALUES.includes(normalized) ? normalized : void 0;
}
//#endregion
export { normalizeAcpProvenanceMode as t };
