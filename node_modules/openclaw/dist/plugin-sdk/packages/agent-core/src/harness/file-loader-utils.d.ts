import { type ExecutionEnv, type FileInfo, type Result } from "./types.js";
export interface FileInfoDiagnostic {
    type: "warning";
    code: "file_info_failed";
    message: string;
    path: string;
}
interface FileInfoDiagnostics {
    push(diagnostic: FileInfoDiagnostic): unknown;
}
/** Parse optional YAML frontmatter and return the normalized Markdown body. */
export declare function parseFrontmatter(content: string): Result<{
    frontmatter: Record<string, unknown>;
    body: string;
}, Error>;
/** Resolve symlink or unknown file info into the concrete loadable file kind. */
export declare function resolveFileInfoKind(env: ExecutionEnv, info: FileInfo, diagnostics: FileInfoDiagnostics): Promise<"file" | "directory" | undefined>;
/** Join harness environment paths without requiring Node path semantics. */
export declare function joinEnvPath(base: string, child: string): string;
/** Return the parent path for slash-separated harness environment paths. */
export declare function dirnameEnvPath(path: string): string;
/** Return the leaf name for slash-separated harness environment paths. */
export declare function basenameEnvPath(path: string): string;
/** Return a root-relative path when possible, otherwise a display-safe non-absolute path. */
export declare function relativeEnvPath(root: string, path: string): string;
export {};
