import { type FileError, type Result, type SessionMetadata, type SessionStorage, type SessionTreeEntry } from "../types.js";
import { Session } from "./session.js";
/** Create a time-sortable session id. */
export declare function createSessionId(): string;
/** Create a canonical session timestamp string. */
export declare function createTimestamp(): string;
/** Wrap a storage implementation in the Session facade. */
export declare function toSession<TMetadata extends SessionMetadata>(storage: SessionStorage<TMetadata>): Session<TMetadata>;
/** Unwrap filesystem results into session errors with caller context. */
export declare function getFileSystemResultOrThrow<TValue>(result: Result<TValue, FileError>, message: string): TValue;
/** Select the entries copied into a forked session. */
export declare function getEntriesToFork(storage: SessionStorage, options: {
    entryId?: string;
    position?: "before" | "at";
}): Promise<SessionTreeEntry[]>;
