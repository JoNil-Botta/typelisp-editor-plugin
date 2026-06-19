import { encodePngRgba, encodePngRgbaCompressed } from "./png.js";
export class PageImpl {
    document;
    index;
    constructor(document, index) {
        this.document = document;
        this.index = index;
    }
    get width() {
        return this.document.withLoadedPage(this.index, (page) => this.document.engine.module._FPDF_GetPageWidth(page));
    }
    get height() {
        return this.document.withLoadedPage(this.index, (page) => this.document.engine.module._FPDF_GetPageHeight(page));
    }
    get rotation() {
        return this.document.withLoadedPage(this.index, (page) => {
            const rotation = this.document.engine.module._FPDFPage_GetRotation(page);
            return ((((rotation % 4) + 4) % 4) * 90);
        });
    }
    text() {
        return this.document.getPageText(this.index);
    }
    render(options = {}) {
        return this.document.renderPage(this.index, options);
    }
    async png(options = {}) {
        if (options.compress === false) {
            return this.pngSync(options);
        }
        const rendered = this.render(options);
        return encodePngRgbaCompressed(rendered.width, rendered.height, rendered.rgba);
    }
    pngSync(options = {}) {
        const rendered = this.render(options);
        return encodePngRgba(rendered.width, rendered.height, rendered.rgba);
    }
    [Symbol.dispose]() { }
}
