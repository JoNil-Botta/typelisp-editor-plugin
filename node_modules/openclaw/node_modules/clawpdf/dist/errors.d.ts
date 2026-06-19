export type PdfErrorCode = "password" | "format" | "security" | "page_range" | "budget" | "destroyed" | "size_conflict";
export declare class PdfError extends Error {
    readonly code: PdfErrorCode;
    readonly cause?: unknown;
    constructor(code: PdfErrorCode, message: string, options?: {
        cause?: unknown;
    });
}
export declare class PdfPasswordError extends PdfError {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class PdfFormatError extends PdfError {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class PdfSecurityError extends PdfError {
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class PdfPageRangeError extends PdfError {
    readonly pageCount: number;
    readonly requested: number;
    constructor(requested: number, pageCount: number);
}
export declare class PdfBudgetError extends PdfError {
    readonly limit: "maxPixels" | "maxDimension" | "maxTextChars" | "renderPixels";
    readonly value: number;
    constructor(limit: "maxPixels" | "maxDimension" | "maxTextChars" | "renderPixels", value: number, message?: string);
}
export declare class PdfDestroyedError extends PdfError {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map