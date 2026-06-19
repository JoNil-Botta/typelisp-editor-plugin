//#region packages/memory-host-sdk/src/host/fs-utils.d.ts
/** True for missing-file errors emitted by Node or fs-safe. */
declare function isFileMissingError(err: unknown): err is NodeJS.ErrnoException & {
  code: "ENOENT" | "ENOTDIR" | "not-found";
};
//#endregion
export { isFileMissingError as t };