import { createEngine as createCoreEngine } from "./index.js";
export * from "./index.js";
const browserWasmUrl = new URL("./vendor/pdfium.esm.wasm", import.meta.url).href;
let sharedEngine;
let sharedInFlight = 0;
let sharedReleaseRequested = false;
export async function createEngine(options = {}) {
    return createCoreEngine({
        wasmUrl: browserWasmUrl,
        ...options,
    });
}
export async function openPdf(input, options = {}) {
    const engine = await createEngine();
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
