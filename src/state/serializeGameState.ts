/**
 * Phase A1.3: Deterministic canonical GameState serialization.
 *
 * Output is stable byte-for-byte across runs for identical input state.
 * No derived/transient fields (Engine Invariants §13.1); no timestamps.
 * Maps are serialized as sorted plain objects; Sets as sorted arrays.
 *
 * Serialization does NOT depend on JS object insertion order: uses deterministic deep key ordering.
 */


import type { GameState } from './game_state.js';
import { strictCompare, validateGameStateShape } from './validateGameState.js';


/** Top-level keys allowed on GameState (canonical only). Wrappers like { state, phasesExecuted } are rejected. */
const GAMESTATE_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'schema_version',
    'meta',
    'factions',
    'turn_summaries',
    'operation_history',
    'pending_paramilitary_requests',
    'paramilitary_policy',
    'paramilitary_deployment_count',
    'paramilitary_decision_history',
    'military',
    'political',
    'displacement'
]);

/**
 * Recursively normalize a value for deterministic JSON: sort object keys, preserve array order,
 * reject Map/Set. Does not mutate input.
 */
function toDeterministicJsonValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'object') {
        if (value instanceof Map) {
            // Serialize Map as a plain object with deterministically sorted keys.
            // Commander state (v0.8) uses Maps for garrison_budget, intel_picture, etc.
            const mapObj: Record<string, unknown> = {};
            const mapKeys = [...value.keys()].map(String).sort(strictCompare);
            for (const k of mapKeys) {
                mapObj[k] = toDeterministicJsonValue(value.get(k));
            }
            return mapObj;
        }
        if (value instanceof Set) {
            // Serialize Set as a deterministically sorted array.
            return [...value].map(v => toDeterministicJsonValue(v)).sort((a, b) =>
                strictCompare(String(a), String(b))
            );
        }
        if (Array.isArray(value)) {
            return value.map((item) => toDeterministicJsonValue(item));
        }
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).slice().sort(strictCompare);
        const out: Record<string, unknown> = {};
        for (const k of keys) {
            const v = obj[k];
            if (v === undefined) {
                continue;
            }
            out[k] = toDeterministicJsonValue(v);
        }
        return out;
    }
    return value;
}

/**
 * Ensure the argument is a bare GameState (no wrapper). Reject { state, phasesExecuted } or any
 * object with top-level keys not in the canonical GameState set.
 */
function assertNoWrapper(state: unknown): asserts state is Record<string, unknown> {
    if (state == null || typeof state !== 'object') {
        throw new Error('serializeGameState: expected a GameState object');
    }
    const obj = state as Record<string, unknown>;
    const topKeys = Object.keys(obj);
    for (const key of topKeys) {
        if (!GAMESTATE_TOP_LEVEL_KEYS.has(key)) {
            throw new Error(
                `serializeGameState: unexpected top-level key "${key}" (possible wrapper; pass GameState only, not { state, phasesExecuted })`
            );
        }
    }
}

/**
 * LANE D-CONTENT (Path A) — substrate skip-list REMOVED. The humanitarian /
 * origin-dest aggregates are now legitimate save-state fields read by
 * consumers (compute_capital.ts, brigade_reconstitution.ts) and persist
 * across saves. This is the re-baselined save shape; 40w hash drifts from
 * legacy 765c1c19912ce9e8 to a new value (capture-time controller
 * attribution semantics).
 */

/**
 * Convert GameState to a plain structure with deterministically ordered keys (no undefined).
 * Maps → sorted plain objects, Sets → sorted arrays. Optional helper for callers that need
 * the serializable object without the string.
 */
export function toSerializableGameState(state: GameState): unknown {
    assertNoWrapper(state);
    const result = validateGameStateShape(state);
    if (!result.ok) {
        throw new Error(`serializeGameState: shape validation failed: ${result.errors.join('; ')}`);
    }
    const out = toDeterministicJsonValue(state) as Record<string, unknown>;
    return out;
}

/**
 * Serialize GameState to canonical JSON string (stable byte-for-byte for identical state).
 * - Rejects wrappers (e.g. { state, phasesExecuted }).
 * - Rejects denylisted derived-state keys (validateGameStateShape).
 * - Serializes Map as sorted plain objects, Set as sorted arrays.
 * - Object keys are sorted with strictCompare; array order preserved.
 * @param state GameState to serialize
 * @param space Optional: 2 for pretty-printed (deterministic); omit for compact
 */
export function serializeGameState(state: GameState, space?: number): string {
    const serializable = toSerializableGameState(state);
    if (space !== undefined) {
        return JSON.stringify(serializable, null, space);
    }
    return JSON.stringify(serializable);
}
