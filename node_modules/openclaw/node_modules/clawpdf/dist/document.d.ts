import { type EngineImpl } from "./engine.js";
import { type ExtractOptions, type ExtractResult } from "./extract.js";
import { type PdfPage } from "./page.js";
import { type RenderOptions } from "./render.js";
export type DocumentDestroyHook = () => void;
export type PdfMetadata = {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
};
export interface PdfDocument extends Disposable, AsyncDisposable {
    readonly pageCount: number;
    readonly metadata: PdfMetadata;
    page(pageNumber: number): PdfPage;
    pages(range?: {
        from?: number;
        to?: number;
    }): IterableIterator<PdfPage>;
    text(options?: TextOptions): string;
    extract(options?: ExtractOptions): Promise<ExtractResult>;
    destroy(): void;
}
export type TextOptions = {
    pages?: number[];
    maxPages?: number;
    maxChars?: number;
};
export type TextExtraction = {
    text: string;
    pagesProcessed: number[];
    truncated: boolean;
};
export declare class DocumentImpl implements PdfDocument {
    #private;
    readonly engine: EngineImpl;
    readonly documentHandle: number;
    private readonly documentPtr;
    private readonly releaseDocument;
    private readonly onDestroy?;
    constructor(engine: EngineImpl, documentHandle: number, documentPtr: number, releaseDocument: () => void, onDestroy?: DocumentDestroyHook | undefined);
    get pageCount(): number;
    get metadata(): PdfMetadata;
    page(pageNumber: number): PdfPage;
    pages(range?: {
        from?: number;
        to?: number;
    }): IterableIterator<PdfPage>;
    text(options?: TextOptions): string;
    extract(options?: ExtractOptions): Promise<ExtractResult>;
    destroy(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
    extractText(options?: TextOptions): TextExtraction;
    effectivePageNumbers(options?: Pick<TextOptions, "pages" | "maxPages">): number[];
    getPageText(pageNumber: number): string;
    renderPage(pageNumber: number, options?: RenderOptions): {
        width: number;
        height: number;
        rgba: Uint8Array;
    };
    withLoadedPage<T>(pageNumber: number, callback: (page: number) => T): T;
    checkPageNumber(pageNumber: number): void;
    assertLive(): void;
    private ensureFormHandle;
    private readMetadata;
    private getMetaText;
}
//# sourceMappingURL=document.d.ts.map