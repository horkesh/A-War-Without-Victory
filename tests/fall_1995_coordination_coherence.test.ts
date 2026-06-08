/**
 * Fall-1995 mechanic E-B1 — corps coordination-coherence decay (v2).
 *
 * Covers:
 *   - Pre-Storm: every corps coherence == 1.0 (byte-stable historical path).
 *   - Post-Storm: only KRAJINA_COLLAPSE_CORPS decay; non-Krajina corps stay 1.0.
 *   - computeCoordinationCoherence is deterministic + clamped to [0.1, 1.0].
 *   - getCoordinationCoherence default semantics (absent/NaN -> 1.0).
 *   - Consumer-1 (combat_math): periphery + low-coherence defender gets ×0.80;
 *     core/corridor OSIDs and high-coherence corps are unchanged.
 *   - Consumer-2 (the `<0.7` launch-block) is intentionally ABSENT in v2.
 *
 * Determinism: pure unit-level, no scenario harness, no randomness.
 */

import assert from 'node:assert';
import { describe, test } from 'vitest';
import {
    computeCoordinationCoherence,
    getCoordinationCoherence,
    updateCoordinationCoherence,
} from '../src/sim/combat/coordination_coherence.js';
import { computeDefenderPower } from '../src/sim/combat/combat_math.js';
// Register the node-only strategic-priorities disk loader so getOsidPriority
// (used by the Consumer-1 periphery penalty) reads the canonical JSON.
import '../src/sim/combat/strategic_priorities_node.js';
import type { FormationId, FormationState, GameState, FactionId } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(turn: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'eb1-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        factions: [],
        political: {} as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
    } as any as GameState;
}

function addCorps(state: GameState, id: FormationId, faction: 'RBiH' | 'RS' | 'HRHB', depth?: number): FormationState {
    const corps: FormationState = {
        id,
        faction,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'corps',
        corps_id: id,
    } as FormationState;
    if (typeof depth === 'number') corps.strategic_depth = depth;
    (state.military.formations as Record<string, FormationState>)[id] = corps;
    return corps;
}

describe('E-B1: coordination-coherence decay (v2)', () => {
    test('default accessor: absent / NaN -> 1.0', () => {
        assert.strictEqual(getCoordinationCoherence(undefined), 1.0);
        assert.strictEqual(getCoordinationCoherence(null), 1.0);
        assert.strictEqual(getCoordinationCoherence({} as FormationState), 1.0);
        assert.strictEqual(
            getCoordinationCoherence({ coordination_coherence: Number.NaN } as FormationState),
            1.0,
        );
        assert.strictEqual(
            getCoordinationCoherence({ coordination_coherence: 0.42 } as FormationState),
            0.42,
        );
    });

    test('pre-Storm: every corps coherence == 1.0', () => {
        const state = makeState(150);
        addCorps(state, 'vrs_1st_krajina' as FormationId, 'RS', 0.3);
        addCorps(state, 'vrs_2nd_krajina' as FormationId, 'RS', 0.2);
        addCorps(state, 'arbih_5th_corps' as FormationId, 'RBiH', 0.5);
        // operation_storm_triggered not set
        updateCoordinationCoherence(state);
        for (const id of Object.keys(state.military.formations)) {
            assert.strictEqual(
                getCoordinationCoherence(state.military.formations[id]),
                1.0,
                `${id} should be fully coherent pre-Storm`,
            );
        }
    });

    test('post-Storm: only KRAJINA_COLLAPSE_CORPS decay; others stay 1.0', () => {
        const state = makeState(160);
        (state.meta as any).operation_storm_triggered = true;
        addCorps(state, 'vrs_1st_krajina' as FormationId, 'RS', 0.4);
        addCorps(state, 'vrs_2nd_krajina' as FormationId, 'RS', 0.3);
        addCorps(state, 'arbih_5th_corps' as FormationId, 'RBiH', 0.4);
        addCorps(state, 'vrs_drina' as FormationId, 'RS', 0.4);
        updateCoordinationCoherence(state);

        // Krajina corps decay below 1.0 (depth-driven, no C2 suppression here so
        // c2 == 1.0; blended = 0.6*depth + 0.4*1.0).
        const k1 = getCoordinationCoherence(state.military.formations['vrs_1st_krajina']);
        const k2 = getCoordinationCoherence(state.military.formations['vrs_2nd_krajina']);
        assert.ok(k1 < 1.0, `vrs_1st_krajina should decay, got ${k1}`);
        assert.ok(k2 < 1.0, `vrs_2nd_krajina should decay, got ${k2}`);
        assert.ok(k2 <= k1, 'lower depth -> lower (or equal) coherence');

        // Non-Krajina corps stay fully coherent even post-Storm.
        assert.strictEqual(getCoordinationCoherence(state.military.formations['arbih_5th_corps']), 1.0);
        assert.strictEqual(getCoordinationCoherence(state.military.formations['vrs_drina']), 1.0);
    });

    test('compute is clamped to [0.1, 1.0] and deterministic', () => {
        const state = makeState(160);
        (state.meta as any).operation_storm_triggered = true;
        addCorps(state, 'vrs_2nd_krajina' as FormationId, 'RS', 0.1);
        const a = computeCoordinationCoherence(state, 'vrs_2nd_krajina' as FormationId);
        const b = computeCoordinationCoherence(state, 'vrs_2nd_krajina' as FormationId);
        assert.strictEqual(a, b, 'deterministic: identical inputs -> identical output');
        assert.ok(a >= 0.1 && a <= 1.0, `clamp range, got ${a}`);
    });

    test('NATO C2 suppression deepens decay', () => {
        const state = makeState(160);
        (state.meta as any).operation_storm_triggered = true;
        addCorps(state, 'vrs_2nd_krajina' as FormationId, 'RS', 0.5);
        const without = computeCoordinationCoherence(state, 'vrs_2nd_krajina' as FormationId);
        // Add a NATO C2 (equipment-quality) suppression for RS.
        (state.military as any).equipment_quality_modifiers = [
            { faction: 'RS', multiplier: 0.7, expires_turn: 999 },
        ];
        const withC2 = computeCoordinationCoherence(state, 'vrs_2nd_krajina' as FormationId);
        assert.ok(withC2 < without, `C2 suppression should lower coherence: ${withC2} < ${without}`);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// Consumer-1: periphery-abandonment defender penalty (combat_math)
// ════════════════════════════════════════════════════════════════════════════

const PERIPHERY_OSID = 'op:test:plain_periphery' as Osid; // unlisted -> periphery for RS
const RS_CORE_OSID = 'op:banja_luka:banja_luka_2' as Osid; // core for RS (E-B4 canon)
const NEUTRAL_TERRAIN: Record<string, number> = {};

function makeCombatState(coherence: number | undefined): GameState {
    const corps: FormationState = {
        id: 'vrs_2nd_krajina',
        faction: 'RS',
        kind: 'corps',
        name: 'vrs_2nd_krajina',
        created_turn: 0,
        status: 'active',
        assignment: null,
        corps_id: 'vrs_2nd_krajina',
    } as unknown as FormationState;
    if (typeof coherence === 'number') corps.coordination_coherence = coherence;
    return {
        meta: { turn: 160, phase: 'war', operation_storm_triggered: true },
        political: { political_controllers: {}, enclave_resilience: {} },
        military: {
            formations: { vrs_2nd_krajina: corps },
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
            home_distance_cache: {},
            active_offensives_against_corps: {},
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

function makeDefenderBrigade(faction: FactionId = 'RS'): FormationState {
    return {
        id: 'test_def_bde',
        faction,
        kind: 'brigade',
        name: 'Test Defender',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        equipment_class: 'light_infantry',
        cohesion: 60,
        morale: 60,
        experience: 0.5,
        posture: 'defend',
        entrenchment_turns: 4,
        corps_id: 'vrs_2nd_krajina',
        composition: {
            infantry: 1500, tanks: 0, artillery: 0, aa_systems: 0,
            tank_condition: { operational: 0, repair: 0, damaged: 0 },
            artillery_condition: { operational: 0, repair: 0, damaged: 0 },
        },
        ops: { last_supplied_turn: 160 },
    } as unknown as FormationState;
}

describe('E-B1 Consumer-1: periphery-abandonment defender penalty', () => {
    test('low-coherence corps: periphery OSID gets ×0.80; core OSID unchanged', () => {
        const lowState = makeCombatState(0.5);   // below threshold 0.6
        const fullState = makeCombatState(1.0);  // at/above threshold

        const periphLow = computeDefenderPower(lowState, makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        const periphFull = computeDefenderPower(fullState, makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        assert.ok(
            Math.abs(periphLow - periphFull * 0.80) < 1e-6,
            `periphery+low-coherence should be ×0.80: ${periphLow} vs ${periphFull * 0.80}`,
        );

        // Core OSID is never penalised even when coherence is low.
        const coreLow = computeDefenderPower(lowState, makeDefenderBrigade(), RS_CORE_OSID, NEUTRAL_TERRAIN);
        const coreFull = computeDefenderPower(fullState, makeDefenderBrigade(), RS_CORE_OSID, NEUTRAL_TERRAIN);
        assert.strictEqual(coreLow, coreFull, 'core OSID must be byte-stable regardless of coherence');
    });

    test('high-coherence corps: periphery OSID byte-stable (no penalty)', () => {
        // coherence >= threshold -> no penalty even on a periphery OSID.
        const fullState = makeCombatState(1.0);
        const noField = makeCombatState(undefined); // absent -> default 1.0
        const a = computeDefenderPower(fullState, makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        const b = computeDefenderPower(noField, makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        assert.strictEqual(a, b, 'coherence 1.0 == absent: both byte-stable, no penalty');
    });

    test('threshold boundary: exactly 0.6 does NOT fire (strict <)', () => {
        const atThreshold = computeDefenderPower(makeCombatState(0.6), makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        const justBelow = computeDefenderPower(makeCombatState(0.59), makeDefenderBrigade(), PERIPHERY_OSID, NEUTRAL_TERRAIN);
        assert.ok(justBelow < atThreshold, 'penalty fires strictly below 0.6');
        assert.ok(Math.abs(justBelow - atThreshold * 0.80) < 1e-6, 'just-below applies ×0.80');
    });
});
