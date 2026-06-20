interface JsonRpcMessage {
    jsonrpc: "2.0";
    id?: number;
    method?: string;
    params?: any;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}
export declare class TypeLispLspClient {
    private typelispPath;
    private stdlibRoots;
    private process;
    private requestId;
    private pending;
    private buffer;
    private running;
    constructor(typelispPath: string, stdlibRoots?: string[]);
    start(): Promise<void>;
    stop(): void;
    private processBuffer;
    sendRequest(method: string, params: any): Promise<JsonRpcMessage>;
    openDocument(uri: string, text: string): Promise<JsonRpcMessage>;
    listFunctions(uri: string): Promise<string[]>;
    appendFunction(uri: string, newText: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    replaceFunction(uri: string, name: string | undefined, newText: string, position?: {
        line: number;
        character: number;
    }): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    replaceBody(uri: string, name: string, newBody: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    replacePattern(uri: string, name: string, oldPattern: string, newPattern: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    deleteFunction(uri: string, name: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    format(uri: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    deleteFunctionAt(uri: string, position: {
        line: number;
        character: number;
    }): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    insertAfter(uri: string, position: {
        line: number;
        character: number;
    }, newText: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    replaceBodyAt(uri: string, position: {
        line: number;
        character: number;
    }, newBody: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    replacePatternAt(uri: string, position: {
        line: number;
        character: number;
    }, oldPattern: string, newPattern: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    readFormAt(uri: string, position: {
        line: number;
        character: number;
    }, outer?: number): Promise<{
        success: boolean;
        form?: string;
        error?: string;
    }>;
}
export {};
