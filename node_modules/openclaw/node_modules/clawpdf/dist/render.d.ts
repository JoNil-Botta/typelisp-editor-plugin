export type RenderOptions = ({
    dpi?: number;
    scale?: never;
    width?: never;
    height?: never;
} | {
    dpi?: never;
    scale?: number;
    width?: never;
    height?: never;
} | {
    dpi?: never;
    scale?: never;
    width?: number;
    height?: never;
} | {
    dpi?: never;
    scale?: never;
    width?: never;
    height?: number;
}) & {
    background?: "white" | "transparent";
    forms?: boolean;
    rotate?: 0 | 90 | 180 | 270;
};
export type ResolvedRenderSize = {
    width: number;
    height: number;
    scale: number;
    rotate: 0 | 1 | 2 | 3;
};
export declare function resolveRenderSize(pageWidth: number, pageHeight: number, embeddedRotation: 0 | 90 | 180 | 270, options: RenderOptions | undefined, maxRenderPixels: number): ResolvedRenderSize;
export declare function planImageRender(pageWidth: number, pageHeight: number, requestedScale: number, remainingPixels: number, maxDimension: number): {
    scale: number;
    capped: boolean;
} | null;
export declare function positiveInteger(name: string, value: number): number;
export declare function nonNegativeInteger(name: string, value: number): number;
export declare function positiveFiniteNumber(name: string, value: number): number;
//# sourceMappingURL=render.d.ts.map