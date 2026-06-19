import { type ExtractOptions, type ExtractResult } from "./extract.js";
import { type PdfInput } from "./input.js";
export { PDFIUM_RELEASE, PDFIUM_WASM_SHA256 } from "./constants.js";
export { PdfBudgetError, PdfDestroyedError, PdfError, PdfFormatError, PdfPageRangeError, PdfPasswordError, PdfSecurityError, } from "./errors.js";
export type { EngineOptions, OpenPdfOptions, PdfDocument, PdfEngine } from "./engine.js";
export type { ExtractMode, ExtractOptions, ExtractResult, PdfImage } from "./extract.js";
export type { PdfInput } from "./input.js";
export type { PdfMetadata } from "./document.js";
export type { PdfPage } from "./page.js";
export type { RenderOptions } from "./render.js";
export type { InlineImageMode, InlineImageProtocol, InlineImage } from "./inline.js";
export { renderInlineImages, resolveInlineImageProtocol } from "./inline.js";
export type EncodePngOptions = {
    width: number;
    height: number;
    compress?: boolean;
};
export declare function createEngine(options?: import("./engine.js").EngineOptions): Promise<import("./engine.js").PdfEngine>;
export declare function openPdf(input: PdfInput, options?: import("./engine.js").OpenPdfOptions): Promise<import("./engine.js").PdfDocument>;
export declare function extractPdf(input: PdfInput, options?: ExtractOptions): Promise<ExtractResult>;
export declare function releaseExtractEngine(): Promise<void>;
export declare function encodePng(rgba: Uint8Array, options: EncodePngOptions & {
    compress: false;
}): Uint8Array;
export declare function encodePng(rgba: Uint8Array, options: EncodePngOptions & {
    compress?: true;
}): Promise<Uint8Array>;
//# sourceMappingURL=index.d.ts.map