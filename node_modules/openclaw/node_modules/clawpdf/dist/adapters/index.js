export function toMessageContent(result) {
    const blocks = [];
    if (result.text) {
        blocks.push({ type: "text", text: result.text });
    }
    for (const image of result.images) {
        blocks.push({
            type: "image",
            source: {
                type: "base64",
                media_type: image.mimeType,
                data: bytesToBase64(image.bytes),
            },
        });
    }
    return blocks;
}
export function toDataUrls(result) {
    return result.images.map((image) => `data:${image.mimeType};base64,${bytesToBase64(image.bytes)}`);
}
function bytesToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}
