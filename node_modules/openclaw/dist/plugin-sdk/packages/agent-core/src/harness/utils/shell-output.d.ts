import { type ExecutionEnv, type ExecutionEnvExecOptions, ExecutionError, type Result } from "../types.js";
/** Options for shell execution with combined stdout/stderr capture. */
export interface ShellCaptureOptions extends Omit<ExecutionEnvExecOptions, "onStdout" | "onStderr"> {
    onChunk?: (chunk: string) => void;
}
/** Captured shell result, with large output optionally spilled to a file. */
export interface ShellCaptureResult {
    output: string;
    exitCode: number | undefined;
    cancelled: boolean;
    truncated: boolean;
    fullOutputPath?: string;
}
/** Remove control characters that make terminal/model output unsafe to replay. */
export declare function sanitizeBinaryOutput(str: string): string;
/** Execute a command while keeping a bounded tail and optional full-output log. */
export declare function executeShellWithCapture(env: ExecutionEnv, command: string, options?: ShellCaptureOptions): Promise<Result<ShellCaptureResult, ExecutionError>>;
