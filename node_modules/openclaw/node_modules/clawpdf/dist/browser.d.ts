import { type EngineOptions, type OpenPdfOptions } from "./engine.js";
import { type ExtractOptions, type ExtractResult } from "./extract.js";
import { type PdfInput } from "./input.js";
export * from "./index.js";
export declare function createEngine(options?: EngineOptions): Promise<import("./engine.js").PdfEngine>;
export declare function openPdf(input: PdfInput, options?: OpenPdfOptions): Promise<import("./engine.js").PdfDocument>;
export declare function extractPdf(input: PdfInput, options?: ExtractOptions): Promise<ExtractResult>;
export declare function releaseExtractEngine(): Promise<void>;
//# sourceMappingURL=browser.d.ts.map