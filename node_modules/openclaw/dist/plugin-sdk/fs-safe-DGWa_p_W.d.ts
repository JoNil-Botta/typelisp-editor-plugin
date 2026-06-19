import { AbsolutePathSymlinkPolicy, EnsureAbsoluteDirectoryOptions, EnsureAbsoluteDirectoryResult, MovePathToTrashOptions, ResolvedAbsolutePath, ResolvedWritableAbsolutePath, appendRegularFile, appendRegularFileSync, assertAbsolutePathInput, canonicalPathFromExistingAncestor, findExistingAncestor as findExistingAncestor$1, movePathToTrash, pathExists, pathExistsSync, readLocalFileFromRoots, readRegularFile, readRegularFileSync, resolveAbsolutePathForRead, resolveAbsolutePathForWrite, resolveLocalPathFromRootsSync, resolveRegularFileAppendFlags, sanitizeUntrustedFileName, statRegularFile, statRegularFileSync, withTimeout } from "@openclaw/fs-safe/advanced";
import { OpenResult, ReadResult, ReadResult as ReadResult$1, openLocalFileSafely, readLocalFileSafely, resolveOpenedFileRealPathForHandle, root as root$1 } from "@openclaw/fs-safe/root";
import { FsSafeError, FsSafeErrorCode } from "@openclaw/fs-safe/errors";
import { isPathInside } from "@openclaw/fs-safe/path";
import { SecureFileReadOptions, SecureFileReadResult, readSecureFile } from "@openclaw/fs-safe/secure-file";
import { WalkDirectoryEntry, WalkDirectoryOptions, WalkDirectoryResult, walkDirectory, walkDirectorySync } from "@openclaw/fs-safe/walk";

//#region src/infra/fs-safe.d.ts
type ExternalFileWriteOptions = {
  rootDir: string;
  path: string;
  write: (tempPath: string) => Promise<void>;
  fallbackFileName?: string;
  tempPrefix?: string;
};
type ExternalFileWriteResult = {
  path: string;
};
declare function ensureAbsoluteDirectory(dirPath: string, options?: {
  scopeLabel?: string;
  mode?: number;
}): Promise<{
  ok: true;
  path: string;
} | {
  ok: false;
  error: Error;
}>;
declare function writeExternalFileWithinRoot(options: ExternalFileWriteOptions): Promise<ExternalFileWriteResult>;
/** @deprecated Use root(rootDir).read(relativePath, options). */
declare function readFileWithinRoot(params: {
  rootDir: string;
  relativePath: string;
  rejectHardlinks?: boolean;
  nonBlockingRead?: boolean;
  allowSymlinkTargetWithinRoot?: boolean;
  maxBytes?: number;
}): Promise<ReadResult>;
/** @deprecated Use root(rootDir).write(relativePath, data, options). */
declare function writeFileWithinRoot(params: {
  rootDir: string;
  relativePath: string;
  data: string | Buffer;
  encoding?: BufferEncoding;
  mkdir?: boolean;
}): Promise<void>;
//#endregion
export { readLocalFileFromRoots as A, root$1 as B, findExistingAncestor$1 as C, pathExists as D, openLocalFileSafely as E, resolveAbsolutePathForRead as F, walkDirectorySync as G, statRegularFile as H, resolveAbsolutePathForWrite as I, writeFileWithinRoot as J, withTimeout as K, resolveLocalPathFromRootsSync as L, readRegularFile as M, readRegularFileSync as N, pathExistsSync as O, readSecureFile as P, resolveOpenedFileRealPathForHandle as R, ensureAbsoluteDirectory as S, movePathToTrash as T, statRegularFileSync as U, sanitizeUntrustedFileName as V, walkDirectory as W, WalkDirectoryResult as _, ExternalFileWriteResult as a, assertAbsolutePathInput as b, MovePathToTrashOptions as c, ResolvedAbsolutePath as d, ResolvedWritableAbsolutePath as f, WalkDirectoryOptions as g, WalkDirectoryEntry as h, ExternalFileWriteOptions as i, readLocalFileSafely as j, readFileWithinRoot as k, OpenResult as l, SecureFileReadResult as m, EnsureAbsoluteDirectoryOptions as n, FsSafeError as o, SecureFileReadOptions as p, writeExternalFileWithinRoot as q, EnsureAbsoluteDirectoryResult as r, FsSafeErrorCode as s, AbsolutePathSymlinkPolicy as t, ReadResult$1 as u, appendRegularFile as v, isPathInside as w, canonicalPathFromExistingAncestor as x, appendRegularFileSync as y, resolveRegularFileAppendFlags as z };