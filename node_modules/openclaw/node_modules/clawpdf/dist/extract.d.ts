import { type DocumentImpl } from "./document.js";
import { type PdfEngine } from "./engine.js";
import { type PdfInput } from "./input.js";
export type ExtractMode = "auto" | "text" | "images" | "both";
export type ExtractOptions = {
    mode?: ExtractMode;
    password?: string;
    pages?: number[];
    maxPages?: number;
    minTextChars?: number;
    maxTextChars?: number;
    engine?: PdfEngine;
    image?: {
        dpi?: number;
        scale?: number;
        maxPixels?: number;
        maxDimension?: number;
        forms?: boolean;
        format?: "png";
    };
};
export type ExtractResult = {
    text: string;
    images: PdfImage[];
    pagesProcessed: number[];
    truncated: {
        text: boolean;
        images: boolean;
    };
};
export type PdfImage = {
    page: number;
    width: number;
    height: number;
    bytes: Uint8Array;
    mimeType: "image/png";
};
export type ExtractPdf = (input: PdfInput, options?: ExtractOptions) => Promise<ExtractResult>;
export declare function extractDocument(document: DocumentImpl, options?: ExtractOptions): Promise<ExtractResult>;
//# sourceMappingURL=extract.d.ts.map