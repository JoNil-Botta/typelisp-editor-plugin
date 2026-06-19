import type { DatabaseSync } from "node:sqlite";
/** Ensure memory index tables and optional FTS/cache tables exist. */
export declare function ensureMemoryIndexSchema(params: {
    db: DatabaseSync;
    embeddingCacheTable: string;
    cacheEnabled: boolean;
    ftsTable: string;
    ftsEnabled: boolean;
    ftsTokenizer?: "unicode61" | "trigram";
}): {
    ftsAvailable: boolean;
    ftsError?: string;
};
