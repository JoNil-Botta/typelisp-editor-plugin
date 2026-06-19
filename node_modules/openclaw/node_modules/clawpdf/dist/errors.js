export class PdfError extends Error {
    code;
    cause;
    constructor(code, message, options = {}) {
        super(message, options);
        this.name = new.target.name;
        this.code = code;
        if ("cause" in options) {
            this.cause = options.cause;
        }
    }
}
export class PdfPasswordError extends PdfError {
    constructor(message = "PDF password is required or incorrect", options = {}) {
        super("password", message, options);
    }
}
export class PdfFormatError extends PdfError {
    constructor(message = "Input is not a valid PDF or is corrupted", options = {}) {
        super("format", message, options);
    }
}
export class PdfSecurityError extends PdfError {
    constructor(message = "PDF security handler is unsupported", options = {}) {
        super("security", message, options);
    }
}
export class PdfPageRangeError extends PdfError {
    pageCount;
    requested;
    constructor(requested, pageCount) {
        super("page_range", `Page ${requested} is outside 1..${pageCount}`);
        this.requested = requested;
        this.pageCount = pageCount;
    }
}
export class PdfBudgetError extends PdfError {
    limit;
    value;
    constructor(limit, value, message = `${limit} budget exceeded: ${value}`) {
        super("budget", message);
        this.limit = limit;
        this.value = value;
    }
}
export class PdfDestroyedError extends PdfError {
    constructor(message = "PDF resource has been destroyed") {
        super("destroyed", message);
    }
}
