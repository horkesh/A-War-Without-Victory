/**
 * Phase A1.3: Deterministic canonical GameState serialization.
 *
 * Output is stable byte-for-byte across runs for identical input state.
 * No derived/transient fields (Engine Invariants §13.1); no timestamps; no Map/Set in state.
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
    'formations',
    'theatres',
    'army_theatre_assignment',
    'front_segments',
    'front_posture',
    'front_posture_regions',
    'front_edges',
    'war_front_edges_osid',
    'assignable_front_segments',
    'front_pressure',
    'militia_pools',
    'strategic_reserves',
    'production_facilities',
    'negotiation_status',
    'ceasefire',
    'negotiation_ledger',
    'casualty_ledger',
    'civilian_casualties',
    'control_overrides',
    'control_recognition',
    'supply_rights',
    'end_state',
    'displacement_state',
    'hostile_takeover_timers',
    'displacement_camp_state',
    'minority_flight_state',
    'displacement_event_log',
    'sustainability_state',
    'collapse_eligibility',
    'collapse_eligibility_tier1',
    'local_strain',
    'collapse_damage',
    'capacity_modifiers',
    'effective_posture_exposure',
    'logistics_priority',
    'sector_stance_orders',
    'loss_of_control_trends',
    'political_controllers',
    'contested_control',
    'municipalities',
    'settlements',
    'international_visibility_pressure',
    'ivp_consequences_active',
    'enclaves',
    'sarajevo_state',
    // Phase I (Early War) state (Phase_I_Specification_v0_3_0.md)
    'war_consolidation_until',
    'war_militia_strength',
    'war_control_strain',
    'war_jna',
    'war_alliance_rbih_hrhb',
    'rbih_hrhb_state',
    'war_displacement_initiated',
    'coercion_pressure_by_municipality',
    // Phase II (Mid-War / Consolidation) state (Phase D)
    'war_supply_pressure',
    'war_exhaustion',
    'war_exhaustion_local',
    'enclave_resilience',

    // Supply Reserves (Phase A+B)
    'general_supply_reserve',
    'heavy_munitions_reserve',
    'siege_turn_counters',
    // Brigade Operations System state (Phase II)
    'brigade_front_assignment',
    'corps_front_edges',
    'corps_fallback_front_edges',
    'brigade_desired_aor_cap',
    'brigade_posture_orders',
    'brigade_attack_orders',
    'corps_attack_axis_orders',
    'corps_command',
    'corps_equipment_reserve',
    'army_stance',
    'og_orders',
    'og_subfront_edges',
    'settlement_holdouts',
    'militia_garrison',
    'brigade_movement_state',
    'brigade_movement_orders',
    'brigade_reposition_orders',
    'brigade_deploy_orders',
    'brigade_encircled',
    'battle_damage',
    // Local fronts (derived each turn, but stored for GUI/reporting)
    'local_fronts',
    // Corps front sectors (derived each turn, stored for GUI/reporting/diagnostics)
    'corps_front_sectors',
    // Sector-facing intelligence (derived each turn, stored for GUI/fog-of-war/bot)
    'sector_intel',
    // Phase F (Displacement & Population Dynamics) — stored, not derived
    'settlement_displacement',
    'settlement_displacement_started_turn',
    'municipality_displacement',
    // Formation spawn directive (FORAWWV H2.4)
    'formation_spawn_directive',
    // Recruitment system (player_choice mode)
    'recruitment_state',
    // Phase 0: Event log and relationship tracking
    'phase0_events_log',
    'phase0_relationships',
    // War timeline (externalized faction temporal profiles)
    'war_timeline',
    // Named officers system (Tier 1)
    'named_officer_data',
    'named_officers',
    // Graz Accords / local truces (2026-03-04)
    'vienna_declaration_turn',
    'truce_broken_turn',
    'vienna_accepted',
    'vienna_kiseljak_broken',
    'vienna_herzegovina_broken_by',
    // Triggered operations state
    'triggered_operations_accepted',
    'declined_operations',
    // Control change event log (GUI battle markers, last 3 turns)
    'control_events',
    'airdrop_allocation',
    'pending_convoy_decisions',
    'smuggling_allocation',
    'sarajevo_tunnel_operational',
    'opsec_sectors',
    'used_operation_names',
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
            throw new Error(
                'serializeGameState: GameState must not contain Map; derived state must be recomputed each turn (Engine Invariants §13.1)'
            );
        }
        if (value instanceof Set) {
            throw new Error(
                'serializeGameState: GameState must not contain Set; derived state must be recomputed each turn (Engine Invariants §13.1)'
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
 * Convert GameState to a plain structure with deterministically ordered keys (no undefined, no Map/Set).
 * Optional helper for callers that need the serializable object without the string.
 */
export function toSerializableGameState(state: GameState): unknown {
    assertNoWrapper(state);
    const result = validateGameStateShape(state);
    if (!result.ok) {
        throw new Error(`serializeGameState: shape validation failed: ${result.errors.join('; ')}`);
    }
    return toDeterministicJsonValue(state);
}

/**
 * Serialize GameState to canonical JSON string (stable byte-for-byte for identical state).
 * - Rejects wrappers (e.g. { state, phasesExecuted }).
 * - Rejects denylisted derived-state keys (validateGameStateShape).
 * - Rejects Map/Set in state (fail fast).
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

