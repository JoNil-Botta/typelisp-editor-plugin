import loadPdfium from "./vendor/pdfium.esm.js";
import { PdfErrorCode as PdfiumErrorCode, PDFIUM_RELEASE, PDFIUM_WASM_SHA256 } from "./constants.js";
import { DocumentImpl } from "./document.js";
import { PdfDestroyedError, PdfFormatError, PdfPasswordError, PdfSecurityError, } from "./errors.js";
import { extractDocument } from "./extract.js";
import { normalizePdfInput } from "./input.js";
import { positiveInteger } from "./render.js";
const textEncoder = new TextEncoder();
const formFillInfoBytes = 1024;
const defaultMaxRenderPixels = 100_000_000;
export async function createEngineImpl(options = {}) {
    const loadOptions = {};
    if (options.wasmUrl) {
        loadOptions.locateFile = () => options.wasmUrl;
    }
    if (options.wasmBinary) {
        loadOptions.wasmBinary = options.wasmBinary;
        loadOptions.locateFile = () => "";
    }
    if (options.instantiateWasm) {
        loadOptions.instantiateWasm = options.instantiateWasm;
    }
    const module = await loadPdfium(loadOptions);
    module._FPDF_InitLibraryWithConfig({
        version: 2,
        m_pIsolate: null,
        m_pPlatform: null,
        m_pUserFontPaths: null,
        m_v8EmbedderSlot: 0,
    });
    return new EngineImpl(module, options.maxRenderPixels ?? defaultMaxRenderPixels);
}
export class EngineImpl {
    module;
    pdfiumRelease = PDFIUM_RELEASE;
    wasmSha256 = PDFIUM_WASM_SHA256;
    formFillInfoBytes = formFillInfoBytes;
    maxRenderPixels;
    #destroyed = false;
    #destroying = false;
    #documents = new Set();
    constructor(module, maxRenderPixels) {
        this.module = module;
        this.maxRenderPixels = positiveInteger("maxRenderPixels", maxRenderPixels);
    }
    async open(input, options = {}) {
        return this.openInternal(input, options);
    }
    async openPrivate(input, options = {}) {
        return this.openInternal(input, options, () => {
            void this.destroy();
        });
    }
    async extract(input, options = {}) {
        const openOptions = options.password === undefined ? {} : { password: options.password };
        const document = await this.open(input, openOptions);
        try {
            return await extractDocument(document, options);
        }
        finally {
            document.destroy();
        }
    }
    async destroy() {
        this.destroySync();
    }
    [Symbol.asyncDispose]() {
        return this.destroy();
    }
    malloc(size) {
        const ptr = this.module.wasmExports.malloc(size);
        if (!ptr) {
            throw new PdfFormatError(`PDFium malloc failed for ${size} bytes`);
        }
        return ptr;
    }
    stringToCString(value) {
        const bytes = textEncoder.encode(`${value}\0`);
        const ptr = this.malloc(bytes.byteLength);
        this.module.HEAPU8.set(bytes, ptr);
        return ptr;
    }
    async openInternal(input, options, onDestroy) {
        this.assertLive();
        const bytes = await normalizePdfInput(input);
        this.assertLive();
        const documentPtr = this.malloc(bytes.byteLength);
        this.module.HEAPU8.set(bytes, documentPtr);
        const passwordPtr = options.password ? this.stringToCString(options.password) : 0;
        const documentHandle = this.module._FPDF_LoadMemDocument(documentPtr, bytes.byteLength, passwordPtr);
        if (passwordPtr) {
            this.module.wasmExports.free(passwordPtr);
        }
        if (!documentHandle) {
            this.module.wasmExports.free(documentPtr);
            throw pdfLoadError(this.module._FPDF_GetLastError());
        }
        const document = new DocumentImpl(this, documentHandle, documentPtr, () => {
            this.#documents.delete(document);
        }, onDestroy);
        this.#documents.add(document);
        return document;
    }
    destroySync() {
        if (this.#destroyed || this.#destroying) {
            return;
        }
        this.#destroying = true;
        for (const document of Array.from(this.#documents)) {
            document.destroy();
        }
        this.module._FPDF_DestroyLibrary();
        this.#destroyed = true;
        this.#destroying = false;
    }
    assertLive() {
        if (this.#destroyed || this.#destroying) {
            throw new PdfDestroyedError("PDF engine has been destroyed");
        }
    }
}
function pdfLoadError(code) {
    switch (code) {
        case PdfiumErrorCode.File:
        case PdfiumErrorCode.Format:
            return new PdfFormatError();
        case PdfiumErrorCode.Password:
            return new PdfPasswordError();
        case PdfiumErrorCode.Security:
            return new PdfSecurityError();
        case PdfiumErrorCode.Page:
            return new PdfFormatError("PDF page could not be loaded");
        case PdfiumErrorCode.Unknown:
            return new PdfFormatError("Unknown PDFium error");
        default:
            return new PdfFormatError(`PDFium load failed with error ${code}`);
    }
}
