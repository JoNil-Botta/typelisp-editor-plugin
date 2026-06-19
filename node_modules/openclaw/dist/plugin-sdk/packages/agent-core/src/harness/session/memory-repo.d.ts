import { type Session, type SessionMetadata, type SessionRepo } from "../types.js";
/** In-memory session repository for tests and ephemeral harness usage. */
export declare class InMemorySessionRepo implements SessionRepo<SessionMetadata, {
    id?: string;
}> {
    private sessions;
    create(options?: {
        id?: string;
    }): Promise<Session>;
    open(metadata: SessionMetadata): Promise<Session>;
    list(): Promise<SessionMetadata[]>;
    delete(metadata: SessionMetadata): Promise<void>;
    fork(sourceMetadata: SessionMetadata, options: {
        entryId?: string;
        position?: "before" | "at";
        id?: string;
    }): Promise<Session>;
}
