/**
 * Determinism Guard Helper: Utility functions for ensuring deterministic outputs
 * 
 * This module provides helper functions for CLI tools that produce artifacts
 * to ensure determinism (no timestamps, stable sorting).
 * 
 * Usage:
 *   import { stripTimestampKeysForArtifacts, ensureStableSort } from './engineering/determinism_guard';
 */



/** Forbidden field names for derived artifacts (must match tests/artifact_determinism.test.ts). */
const FORBIDDEN_ARTIFACT_KEYS = new Set([
    'generated_at',
    'build_timestamp',
    'auditTimestamp',
    'audit_timestamp',
    'timestamp',
    'created_at',
    'updated_at'
]);

/**
 * Recursively remove forbidden timestamp keys from an object (for derived artifact writes).
 * Returns a deep copy with forbidden keys stripped; does not mutate input.
 * Use before JSON.stringify when writing to data/derived/.
 */
export function stripTimestampKeysForArtifacts(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => stripTimestampKeysForArtifacts(item));
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (FORBIDDEN_ARTIFACT_KEYS.has(key)) {
            continue;
        }
        result[key] = stripTimestampKeysForArtifacts(value);
    }
    return result;
}

/**
 * Remove timestamp fields from an object (for artifact generation) — shallow, legacy.
 * Prefer stripTimestampKeysForArtifacts for derived JSON writes.
 */
export function removeTimestampFields<T extends Record<string, any>>(obj: T): Omit<T, 'generated_at' | 'created_at' | 'updated_at' | 'timestamp'> {
    const { generated_at, created_at, updated_at, timestamp, ...rest } = obj;
    return rest;
}

/**
 * Ensure an array is sorted deterministically (by a key function)
 */
export function ensureStableSort<T>(arr: T[], keyFn: (item: T) => string | number): T[] {
    return [...arr].sort((a, b) => {
        const keyA = keyFn(a);
        const keyB = keyFn(b);
        if (typeof keyA === 'string' && typeof keyB === 'string') {
            return keyA.localeCompare(keyB);
        }
        return (keyA as number) - (keyB as number);
    });
}

/**
 * Ensure object keys are sorted (for canonical JSON)
 */
export function ensureSortedKeys<T extends Record<string, any>>(obj: T): T {
    const sorted = Object.keys(obj).sort();
    const result = {} as T;
    for (const key of sorted) {
        result[key as keyof T] = obj[key];
    }
    return result;
}

/**
 * Validate that an object has no timestamp fields (throws if found)
 */
export function assertNoTimestamps(obj: any, path: string = ''): void {
    const timestampFields = ['generated_at', 'created_at', 'updated_at', 'timestamp'];
    for (const field of timestampFields) {
        if (field in obj) {
            throw new Error(`Timestamp field '${field}' found in ${path || 'object'}. Remove it for determinism.`);
        }
    }

    // Recursively check nested objects (but not arrays of primitives)
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            assertNoTimestamps(value, path ? `${path}.${key}` : key);
        }
    }
}
