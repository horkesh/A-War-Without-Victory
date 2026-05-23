/**
 * Fall-1995 mechanics E-A3 (multi-axis simultaneity penalty) + E-A4 (cascade trigger).
 *
 * Spec: docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md §3.
 *
 * E-A3 contract (`computeDefenderPowerBreakdown` consumer):
 *   - 1 enemy offensive → multiAxisMult === 1.0 (byte-stable historical path)
 *   - 2 → 0.9×; 3 → 0.8×; 4+ → 0.7× (capped)
 *
 * E-A4 contract (`emitCascadePenaltiesOnFlip` writer):
 *   - On flip, every front-edge-adjacent OSID still owned by the losing
 *     faction receives a cascade_penalties entry with multiplier 0.85 and
 *     expires_turn = state.meta.turn + 2.
 *   - Deterministic iteration order (sorted by strictCompare).
 *
 * These tests deliberately do NOT exercise the full attack resolver — they
 * directly call the writer (E-A4) and `computeDefenderPower` (E-A3) so the
 * mechanic-under-test is isolated from unrelated combat-math machinery.
 */
import { describe, it, expect } from 'vitest';

import { computeDefenderPower } from '../src/sim/combat/combat_math.js';
import { emitCascadePenaltiesOnFlip } from '../src/sim/combat/attack_resolution_osid.js';
import { getCascadePenaltyForOsid } from '../src/sim/events/active_modifiers.js';
import type { FormationState, GameState, FactionId } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ─── Synthetic state + brigade builders ─────────────────────────────────────

const TEST_OSID = 'op:test:plain_test' as Osid;
const NEUTRAL_TERRAIN: Record<string, number> = {};

interface StateOpts {
    activeOffensivesByCorps?: Record<string, number>;
    cascadePenalties?: Array<{ osid: string; multiplier: number; expires_turn: number }>;
    politicalControllers?: Record<string, FactionId>;
    turn?: number;
}

function makeMinimalState(opts: StateOpts = {}): GameState {
    return {
        meta: { turn: opts.turn ?? 50, phase: 'war' },
        political: {
            political_controllers: opts.politicalControllers ?? {},
            enclave_resilience: {},
        },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
            home_distance_cache: {},
            active_offensives_against_corps: opts.activeOffensivesByCorps ?? {},
            cascade_penalties: opts.cascadePenalties,
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

function makeBrigade(corpsId: string | null, faction: FactionId = 'RBiH'): FormationState {
    return {
        id: 'test_bde',
        faction,
        kind: 'brigade',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        location_osid: TEST_OSID,
        equipment_class: 'light_infantry',
        cohesion: 60,
        morale: 60,
        experience: 0.5,
        posture: 'defend',
        entrenchment_turns: 4,
        corps_id: corpsId,
        composition: {
            infantry: 1500,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, repair: 0, damaged: 0 },
            artillery_condition: { operational: 0, repair: 0, damaged: 0 },
        },
        ops: { last_supplied_turn: 50 },
    } as unknown as FormationState;
}

// ════════════════════════════════════════════════════════════════════════════
// E-A3 multi-axis penalty
// ════════════════════════════════════════════════════════════════════════════

describe('Fall-1995 E-A3 — multi-axis simultaneity penalty on defender power', () => {
    it('single-offensive scenario produces 1.0× multiplier (byte-stable historical path)', () => {
        // Two states identical except for offensive count (0 vs 1) — both must
        // yield the SAME defender power. This is the byte-stability contract:
        // historical single-offensive runs must not see any behavior change.
        const stateNoOffensive = makeMinimalState({
            activeOffensivesByCorps: {},
        });
        const stateOneOffensive = makeMinimalState({
            activeOffensivesByCorps: { 'corps:rs_drina': 1 },
        });
        const bdeNo = makeBrigade('corps:rs_drina', 'RS');
        const bdeOne = makeBrigade('corps:rs_drina', 'RS');

        const powerNo = computeDefenderPower(stateNoOffensive, bdeNo, TEST_OSID, NEUTRAL_TERRAIN);
        const powerOne = computeDefenderPower(stateOneOffensive, bdeOne, TEST_OSID, NEUTRAL_TERRAIN);

        // EXACT equality required for byte-stability — the 1.0× multiplier
        // gate (`if (multiAxisMult !== 1.0)`) must keep the path mathematically
        // identical to the historical no-cache path.
        expect(powerOne).toBe(powerNo);
        expect(powerOne).toBeGreaterThan(0);
    });

    it('two simultaneous offensives produce 0.9× multiplier', () => {
        const stateNone = makeMinimalState({ activeOffensivesByCorps: {} });
        const stateTwo = makeMinimalState({
            activeOffensivesByCorps: { 'corps:rs_drina': 2 },
        });
        const bdeNone = makeBrigade('corps:rs_drina', 'RS');
        const bdeTwo = makeBrigade('corps:rs_drina', 'RS');

        const powerNone = computeDefenderPower(stateNone, bdeNone, TEST_OSID, NEUTRAL_TERRAIN);
        const powerTwo = computeDefenderPower(stateTwo, bdeTwo, TEST_OSID, NEUTRAL_TERRAIN);

        expect(powerTwo).toBeCloseTo(powerNone * 0.9, 5);
    });

    it('multiplier caps at 0.7× for 4+ simultaneous offensives', () => {
        const stateNone = makeMinimalState({ activeOffensivesByCorps: {} });
        const stateFour = makeMinimalState({
            activeOffensivesByCorps: { 'corps:rs_drina': 4 },
        });
        const stateTen = makeMinimalState({
            activeOffensivesByCorps: { 'corps:rs_drina': 10 },
        });
        const bdeNone = makeBrigade('corps:rs_drina', 'RS');
        const bdeFour = makeBrigade('corps:rs_drina', 'RS');
        const bdeTen = makeBrigade('corps:rs_drina', 'RS');

        const powerNone = computeDefenderPower(stateNone, bdeNone, TEST_OSID, NEUTRAL_TERRAIN);
        const powerFour = computeDefenderPower(stateFour, bdeFour, TEST_OSID, NEUTRAL_TERRAIN);
        const powerTen = computeDefenderPower(stateTen, bdeTen, TEST_OSID, NEUTRAL_TERRAIN);

        // Cap at 0.7× (min(n-1, 3) = 3 → 1 - 0.30 = 0.70)
        expect(powerFour).toBeCloseTo(powerNone * 0.7, 5);
        expect(powerTen).toBeCloseTo(powerNone * 0.7, 5);
    });

    it('brigade with no corps_id is unaffected by E-A3', () => {
        const stateTwo = makeMinimalState({
            activeOffensivesByCorps: { 'corps:rs_drina': 2 },
        });
        const stateNone = makeMinimalState({ activeOffensivesByCorps: {} });
        // Brigade has null corps_id — should not get any penalty.
        const bdeUnattached = makeBrigade(null, 'RS');
        const bdeUnattached2 = makeBrigade(null, 'RS');

        const powerNone = computeDefenderPower(stateNone, bdeUnattached, TEST_OSID, NEUTRAL_TERRAIN);
        const powerTwo = computeDefenderPower(stateTwo, bdeUnattached2, TEST_OSID, NEUTRAL_TERRAIN);

        expect(powerTwo).toBe(powerNone);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// E-A4 cascade trigger
// ════════════════════════════════════════════════════════════════════════════

describe('Fall-1995 E-A4 — cascade penalty writer on OSID flip', () => {
    it('OSID flip writes cascade_penalties for adjacent same-faction OSIDs', () => {
        // Setup: targetOsid flipped from RS to RBiH. Three adjacent OSIDs:
        //   - osid_A: still RS-controlled (eligible — should receive penalty)
        //   - osid_B: still RS-controlled (eligible — should receive penalty)
        //   - osid_C: RBiH-controlled (already attacker's — no penalty)
        const targetOsid = 'op:rs:kljuc_2';
        const osidA = 'op:rs:bosanski_petrovac_2';
        const osidB = 'op:rs:sanski_most_2';
        const osidC = 'op:rbih:bihac_2';

        const state = makeMinimalState({
            politicalControllers: {
                // targetOsid has ALREADY been flipped by the resolver before
                // the writer runs (see attack_resolution_osid.ts ordering).
                [targetOsid]: 'RBiH',
                [osidA]: 'RS',
                [osidB]: 'RS',
                [osidC]: 'RBiH',
            },
            turn: 100,
        });

        // Synthetic adjacency: targetOsid is connected to A, B, C.
        const adjacency = new Map<string, string[]>([
            [targetOsid, [osidA, osidB, osidC]],
            [osidA, [targetOsid]],
            [osidB, [targetOsid]],
            [osidC, [targetOsid]],
        ]);

        emitCascadePenaltiesOnFlip(state, targetOsid, 'RS', adjacency);

        const penalties = state.military.cascade_penalties ?? [];
        expect(penalties).toHaveLength(2);

        // Deterministic order: sorted by strictCompare.
        const osids = penalties.map(p => p.osid).sort();
        expect(osids).toEqual([osidA, osidB].sort());

        for (const p of penalties) {
            expect(p.multiplier).toBe(0.85);
            // expires_turn = currentTurn + 2 → active on turn 101, GC'd at start of 102.
            expect(p.expires_turn).toBe(102);
        }

        // The C neighbor (already attacker-controlled) is correctly excluded.
        expect(penalties.find(p => p.osid === osidC)).toBeUndefined();
    });

    it('reader getCascadePenaltyForOsid returns 0.85 for a freshly-written penalty', () => {
        const target = 'op:rs:kljuc_2';
        const neighbor = 'op:rs:bosanski_petrovac_2';
        const state = makeMinimalState({
            politicalControllers: {
                [target]: 'RBiH',
                [neighbor]: 'RS',
            },
            turn: 100,
        });
        const adjacency = new Map<string, string[]>([
            [target, [neighbor]],
            [neighbor, [target]],
        ]);

        emitCascadePenaltiesOnFlip(state, target, 'RS', adjacency);

        // On turn 101 (one turn after flip), reader returns the penalty.
        expect(getCascadePenaltyForOsid(state, neighbor, 101)).toBeCloseTo(0.85);
        // Non-neighbor OSID returns 1.0 (no-op).
        expect(getCascadePenaltyForOsid(state, 'op:other:elsewhere_2', 101)).toBe(1.0);
        // Past expires_turn (102): no penalty.
        expect(getCascadePenaltyForOsid(state, neighbor, 102)).toBe(1.0);
    });

    it('writer is a no-op when prevController is null (uncontrolled OSID flip)', () => {
        const state = makeMinimalState({
            politicalControllers: { 'op:test:target': 'RBiH' },
            turn: 100,
        });
        const adjacency = new Map<string, string[]>([
            ['op:test:target', ['op:test:neighbor']],
        ]);

        emitCascadePenaltiesOnFlip(state, 'op:test:target', null, adjacency);

        expect(state.military.cascade_penalties ?? []).toHaveLength(0);
    });
});
