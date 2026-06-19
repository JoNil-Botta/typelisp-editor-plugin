export type InlineImageMode = "none" | "auto" | "kitty" | "iterm";
export type InlineImageProtocol = "none" | "kitty" | "iterm";
export type InlineImage = {
    data: Uint8Array;
    name: string;
    label?: string;
};
type Writable = {
    write(chunk: string | Uint8Array): unknown;
    isTTY?: boolean;
    columns?: number;
};
export declare function resolveInlineImageProtocol({ mode, env, stdout, }: {
    mode: InlineImageMode;
    env: Record<string, string | undefined>;
    stdout: Writable;
}): InlineImageProtocol;
export declare function renderInlineImages({ images, mode, env, stdout, }: {
    images: InlineImage[];
    mode: InlineImageMode;
    env: Record<string, string | undefined>;
    stdout: Writable;
}): {
    rendered: number;
    protocol: InlineImageProtocol;
};
export {};
//# sourceMappingURL=inline.d.ts.map