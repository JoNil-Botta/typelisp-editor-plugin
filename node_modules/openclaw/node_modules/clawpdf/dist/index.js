import { createEngineImpl } from "./engine.js";
import { encodePngRgba, encodePngRgbaCompressed } from "./png.js";
export { PDFIUM_RELEASE, PDFIUM_WASM_SHA256 } from "./constants.js";
export { PdfBudgetError, PdfDestroyedError, PdfError, PdfFormatError, PdfPageRangeError, PdfPasswordError, PdfSecurityError, } from "./errors.js";
export { renderInlineImages, resolveInlineImageProtocol } from "./inline.js";
let sharedEngine;
let sharedInFlight = 0;
let sharedReleaseRequested = false;
export async function createEngine(options = {}) {
    return createEngineImpl(options);
}
export async function openPdf(input, options = {}) {
    const engine = await createEngineImpl();
    try {
        return await engine.openPrivate(input, options);
    }
    catch (error) {
        await engine.destroy();
        throw error;
    }
}
export async function extractPdf(input, options = {}) {
    if (options.engine) {
        return options.engine.extract(input, withoutEngine(options));
    }
    sharedInFlight += 1;
    try {
        const engine = await getSharedEngine();
        return await engine.extract(input, options);
    }
    finally {
        sharedInFlight -= 1;
        if (sharedReleaseRequested && sharedInFlight === 0) {
            await disposeSharedEngine();
        }
    }
}
export async function releaseExtractEngine() {
    sharedReleaseRequested = true;
    if (sharedInFlight === 0) {
        await disposeSharedEngine();
    }
}
export function encodePng(rgba, options) {
    if (options.compress === false) {
        return encodePngRgba(options.width, options.height, rgba);
    }
    return encodePngRgbaCompressed(options.width, options.height, rgba);
}
async function getSharedEngine() {
    if (!sharedEngine) {
        sharedReleaseRequested = false;
        let nextEngine;
        nextEngine = createEngine().catch((error) => {
            if (sharedEngine === nextEngine) {
                sharedEngine = undefined;
            }
            throw error;
        });
        sharedEngine = nextEngine;
    }
    return sharedEngine;
}
async function disposeSharedEngine() {
    const engine = sharedEngine;
    sharedEngine = undefined;
    sharedReleaseRequested = false;
    if (engine) {
        await (await engine).destroy();
    }
}
function withoutEngine(options) {
    const { engine: _engine, ...rest } = options;
    return rest;
}
