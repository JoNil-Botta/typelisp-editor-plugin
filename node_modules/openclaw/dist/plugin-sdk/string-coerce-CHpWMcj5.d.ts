//#region packages/normalization-core/src/string-coerce.d.ts
/** Reads a value only when it is already a string, preserving whitespace. */
declare function readStringValue(value: unknown): string | undefined;
/** Trims string input and returns null for non-strings or empty strings. */
declare function normalizeNullableString(value: unknown): string | null;
/** Trims string input and returns undefined for non-strings or empty strings. */
declare function normalizeOptionalString(value: unknown): string | undefined;
/** Stringifies primitive ids/flags before applying optional string normalization. */
declare function normalizeStringifiedOptionalString(value: unknown): string | undefined;
/** Normalizes an optional array of primitive-ish values into non-empty strings. */
declare function normalizeStringifiedEntries(values?: ReadonlyArray<unknown>): string[];
/** Lowercases a normalized optional string. */
declare function normalizeOptionalLowercaseString(value: unknown): string | undefined;
/** Lowercases a normalized string or returns an empty string when absent. */
declare function normalizeLowercaseStringOrEmpty(value: unknown): string;
/** Parses loose boolean/fast-mode flags from strings or booleans. */
declare function normalizeFastMode(raw?: string | boolean | null): boolean | undefined;
/** Lowercases text while intentionally preserving surrounding whitespace. */
declare function lowercasePreservingWhitespace(value: string): string;
/** Locale-aware lowercase helper that still preserves surrounding whitespace. */
declare function localeLowercasePreservingWhitespace(value: string): string;
/** Reads a string directly or from an object's `primary` field. */
declare function resolvePrimaryStringValue(value: unknown): string | undefined;
/** Normalizes thread ids that may be numeric or string-backed. */
declare function normalizeOptionalThreadValue(value: unknown): string | number | undefined;
/** Normalizes a thread/id value and stringifies finite numeric ids. */
declare function normalizeOptionalStringifiedId(value: unknown): string | undefined;
/** Type guard for strings that remain non-empty after trimming. */
declare function hasNonEmptyString(value: unknown): value is string;
//#endregion
export { normalizeLowercaseStringOrEmpty as a, normalizeOptionalString as c, normalizeStringifiedEntries as d, normalizeStringifiedOptionalString as f, normalizeFastMode as i, normalizeOptionalStringifiedId as l, resolvePrimaryStringValue as m, localeLowercasePreservingWhitespace as n, normalizeNullableString as o, readStringValue as p, lowercasePreservingWhitespace as r, normalizeOptionalLowercaseString as s, hasNonEmptyString as t, normalizeOptionalThreadValue as u };