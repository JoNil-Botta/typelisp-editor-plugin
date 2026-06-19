import { type ExtractResult } from "../extract.js";
export type MessageContentBlock = {
    type: "text";
    text: string;
} | {
    type: "image";
    source: {
        type: "base64";
        media_type: "image/png";
        data: string;
    };
};
export declare function toMessageContent(result: ExtractResult): MessageContentBlock[];
export declare function toDataUrls(result: ExtractResult): string[];
//# sourceMappingURL=index.d.ts.map