import { type LoadPdfiumOptions, type PdfiumModule } from "./vendor/pdfium.esm.js";
import { type ExtractOptions } from "./extract.js";
import { type PdfInput } from "./input.js";
export type EngineOptions = {
    wasmBinary?: ArrayBuffer;
    wasmUrl?: string;
    instantiateWasm?: LoadPdfiumOptions["instantiateWasm"];
    maxRenderPixels?: number;
};
export type OpenPdfOptions = {
    password?: string;
};
export interface PdfEngine extends AsyncDisposable {
    readonly pdfiumRelease: string;
    readonly wasmSha256: string;
    open(input: PdfInput, options?: OpenPdfOptions): Promise<PdfDocument>;
    extract(input: PdfInput, options?: ExtractOptions): Promise<ExtractResult>;
    destroy(): Promise<void>;
}
export type PdfDocument = import("./document.js").PdfDocument;
export type ExtractResult = import("./extract.js").ExtractResult;
export declare function createEngineImpl(options?: EngineOptions): Promise<EngineImpl>;
export declare class EngineImpl implements PdfEngine {
    #private;
    readonly module: PdfiumModule;
    readonly pdfiumRelease = "7623";
    readonly wasmSha256 = "14ca2adbe23b45dea57da28ae2746e376f1cddfb8e2d0b01b71dcc5cf227734e";
    readonly formFillInfoBytes = 1024;
    readonly maxRenderPixels: number;
    constructor(module: PdfiumModule, maxRenderPixels: number);
    open(input: PdfInput, options?: OpenPdfOptions): Promise<PdfDocument>;
    openPrivate(input: PdfInput, options?: OpenPdfOptions): Promise<PdfDocument>;
    extract(input: PdfInput, options?: ExtractOptions): Promise<ExtractResult>;
    destroy(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    malloc(size: number): number;
    stringToCString(value: string): number;
    private openInternal;
    private destroySync;
    private assertLive;
}
//# sourceMappingURL=engine.d.ts.map