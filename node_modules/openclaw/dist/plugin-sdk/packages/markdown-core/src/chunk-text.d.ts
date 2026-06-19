/**
 * Splits plain text into size-bounded chunks at readable boundaries.
 *
 * Returns the original text as one chunk when the limit is non-positive.
 */
export declare function chunkText(text: string, limit: number): string[];
