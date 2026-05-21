// Shared schema-boundary validator primitives for the Strict-Null Batch C lane.
//
// These helpers narrow `unknown` payloads (JSON ingestion, IPC reads, replay
// frame sidecars, LLM responses) into typed values for downstream engine
// consumers without using the prior untyped widening pattern. Each primitive
// returns `null` when the value does not match the expected shape; callers
// compose them into per-loader `parse<Shape>` helpers and decide whether
// `null` is fatal (loader throws) or skippable (loader uses a documented
// fallback).
//
// Reference precedent: `parseFactionId` / `parseAdvisorContextType` in
// `src/sim/ai_commander/response_parser.ts` (Batch 49, commit 9f78a37b).
// Those live alongside their consumer because they are LLM-response-specific.
// Batch C generalizes the pattern into this shared module so the schema
// boundary loaders (`scenario_loader.ts`, `oob_loader.ts`,
// `political_control_init.ts`, etc.) do not each re-invent `typeof === ...`
// chains. Per-loader composed helpers stay co-located with their loader.

/**
 * Narrow `unknown` to `Record<string, unknown>` (a plain object).
 * Returns `null` if the value is not a plain object (rejects arrays and null).
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

/**
 * Narrow `unknown` to `unknown[]`. Returns `null` if the value is not an array.
 */
export function asArray(value: unknown): unknown[] | null {
    // Array.isArray narrows `unknown` to `any[]`; that assigns to `unknown[]`
    // without an explicit cast, keeping the primitive cast-free at boundary.
    return Array.isArray(value) ? value : null;
}

/**
 * Narrow `unknown` to `string`. Returns `null` if the value is not a string.
 * Empty strings ARE returned (callers may add their own length check).
 */
export function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

/**
 * Narrow `unknown` to a finite `number`. Returns `null` for non-numeric values,
 * `NaN`, and `Infinity`. Zero IS returned.
 */
export function asFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Narrow `unknown` to `boolean`. Returns `null` if the value is not a boolean.
 * Truthy non-boolean values (e.g. `1`, `'true'`) are rejected — callers that
 * want coercion must do it explicitly.
 */
export function asBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
}

/**
 * Narrow an already-array-checked `unknown[]` to `T[]` by running `parseItem`
 * on each entry and dropping items that fail. Preserves order; deterministic.
 */
export function asTypedArray<T>(
    items: readonly unknown[],
    parseItem: (raw: unknown) => T | null,
): T[] {
    const out: T[] = [];
    for (const raw of items) {
        const parsed = parseItem(raw);
        if (parsed !== null) out.push(parsed);
    }
    return out;
}
