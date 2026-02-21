/**
 * Phase H1.1: Stable JSON stringify for deterministic outputs.
 * Keys sorted recursively; arrays kept in stable order. No timestamps.
 */

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Recursively normalize a value for deterministic JSON: sort object keys, preserve array order.
 * Does not mutate input.
 */
function toStableValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map((item) => toStableValue(item));
        }
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).slice().sort(strictCompare);
        const out: Record<string, unknown> = {};
        for (const k of keys) {
            const v = obj[k];
            if (v === undefined) {
                continue;
            }
            out[k] = toStableValue(v);
        }
        return out;
    }
    return value;
}

/**
 * Stringify with deterministic key order (recursive sort). Arrays keep existing order.
 * Use for all emitted JSON in scenario harness (Engine Invariants §11.3).
 */
export function stableStringify(obj: unknown, space?: number): string {
    const normalized = toStableValue(obj);
    if (space !== undefined) {
        return JSON.stringify(normalized, null, space);
    }
    return JSON.stringify(normalized);
}
