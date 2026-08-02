import { ChildProcess } from "child_process";
export interface JsonRpcError {
    code: number;
    message: string;
    data?: unknown;
}
export interface JsonRpcMessage {
    jsonrpc: "2.0";
    id?: number;
    method?: string;
    params?: any;
    result?: any;
    error?: JsonRpcError;
}
export type EditResult = {
    success: boolean;
    text?: string;
    error?: string;
    errorData?: unknown;
};
export declare function editResult(resp: JsonRpcMessage): EditResult;
export declare class TypeLispLspClient {
    private typelispPath;
    private stdlibRoots;
    private process;
    private requestId;
    private pending;
    private buffer;
    private running;
    private timeoutMs;
    constructor(typelispPath: string, stdlibRoots?: string[]);
    getProcess(): ChildProcess | null;
    start(): Promise<void>;
    stop(): void;
    private rejectAllPending;
    private processBuffer;
    sendRequest(method: string, params: any): Promise<JsonRpcMessage>;
    openDocument(uri: string, text: string): Promise<void>;
    changeDocument(uri: string, text: string): Promise<void>;
    closeDocument(uri: string): Promise<void>;
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
    replaceBody(uri: string, name: string, newBody: string): Promise<EditResult>;
    replacePattern(uri: string, name: string | undefined, oldPattern: string, newPattern: string, position?: {
        line: number;
        character: number;
    }): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    patch(uri: string, oldText: string, newText: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    deleteFunction(uri: string, name: string | undefined, position?: {
        line: number;
        character: number;
    }): Promise<{
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
    check(uri: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    findPosition(uri: string, name: string, kind?: string): Promise<{
        line: number;
        character: number;
    } | null>;
    replaceBodyAt(uri: string, position: {
        line: number;
        character: number;
    }, newBody: string): Promise<EditResult>;
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
    move(uri: string, name: string | undefined, position: {
        line: number;
        character: number;
    } | undefined, direction?: string, destination?: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    rename(uri: string, oldName: string | undefined, position: {
        line: number;
        character: number;
    } | undefined, newName: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    expandMacro(uri: string, name: string): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    getType(uri: string, position: {
        line: number;
        character: number;
    }): Promise<{
        success: boolean;
        type?: string;
        error?: string;
    }>;
    findReferences(uri: string, name: string): Promise<{
        success: boolean;
        references?: any[];
        error?: string;
    }>;
    batch(uri: string, operations: Array<{
        method: string;
        name?: string;
        newText?: string;
    }>): Promise<EditResult & {
        results?: any[];
    }>;
    projectSearch(uri: string, query: string): Promise<{
        success: boolean;
        results?: any[];
        error?: string;
    }>;
}
