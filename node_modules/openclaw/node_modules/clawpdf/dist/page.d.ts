import { type DocumentImpl } from "./document.js";
import { type RenderOptions } from "./render.js";
export interface PdfPage extends Disposable {
    readonly index: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: 0 | 90 | 180 | 270;
    text(): string;
    render(options?: RenderOptions): {
        width: number;
        height: number;
        rgba: Uint8Array;
    };
    png(options?: RenderOptions & {
        compress?: boolean;
    }): Promise<Uint8Array>;
    pngSync(options?: RenderOptions): Uint8Array;
}
export declare class PageImpl implements PdfPage {
    private readonly document;
    readonly index: number;
    constructor(document: DocumentImpl, index: number);
    get width(): number;
    get height(): number;
    get rotation(): 0 | 90 | 180 | 270;
    text(): string;
    render(options?: RenderOptions): {
        width: number;
        height: number;
        rgba: Uint8Array;
    };
    png(options?: RenderOptions & {
        compress?: boolean;
    }): Promise<Uint8Array>;
    pngSync(options?: RenderOptions): Uint8Array;
    [Symbol.dispose](): void;
}
//# sourceMappingURL=page.d.ts.map