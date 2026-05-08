/**
 * LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 — siege defender morale
 * drain shadow-flag contract.
 *
 * The mechanism reads `state.military.siege_turn_counters` (faction-keyed)
 * and applies a graduated per-turn morale decrement per the Q1-locked
 * SIEGE_DRAIN_SCHEDULE. Floor: 25. Default-off shadow flag:
 * SIEGE_MORALE_DRAIN_ENABLED. Diagnostic counter (drain_pending_count)
 * increments unconditionally per N4 morale-collapse override precedent.
 *
 * Determinism: pure synchronous; no I/O; no random; no Date.now.
 *
 * Canon: Engine Invariants v0.9.0 §6.10 + Systems Manual v0.9.0 §6.10.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
    applySiegeMoraleDrain,
    getSiegeDrainCoefficient,
    SIEGE_DRAIN_MORALE_FLOOR,
} from '../src/sim/combat/siege_morale_drain.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'rs_srk_pale_a',
        faction: 'RS',
        name: 'SRK Pale Brigade',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'rs_srk',
        location_osid: 'op:pale:pale_2',
        home_osid: 'op:pale:pale_2',
        personnel: 2000,
        morale: 65,
        cohesion: 50,
        ...overrides,
    } as FormationState;
}

function makeState(
    brigades: FormationState[],
    siegeCounters: Record<string, number>
): GameState {
    const formations: Record<string, FormationState> = {};
    for (const f of brigades) formations[f.id] = f;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, phase: 'war', seed: 'siege-drain-test' } as any,
        military: {
            formations: formations as any,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: {},
            siege_turn_counters: siegeCounters,
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

describe('LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 / getSiegeDrainCoefficient (T1: schedule boundaries)', () => {
    it('phase A: counter 0–13 → 0.0', () => {
        expect(getSiegeDrainCoefficient(0)).toBe(0.0);
        expect(getSiegeDrainCoefficient(1)).toBe(0.0);
        expect(getSiegeDrainCoefficient(13)).toBe(0.0);
    });

    it('phase B: counter 14–26 → -0.5', () => {
        expect(getSiegeDrainCoefficient(14)).toBe(-0.5);
        expect(getSiegeDrainCoefficient(20)).toBe(-0.5);
        expect(getSiegeDrainCoefficient(26)).toBe(-0.5);
    });

    it('phase C: counter 27–52 → -1.0', () => {
        expect(getSiegeDrainCoefficient(27)).toBe(-1.0);
        expect(getSiegeDrainCoefficient(40)).toBe(-1.0);
        expect(getSiegeDrainCoefficient(52)).toBe(-1.0);
    });

    it('phase D: counter 53–104 → -1.5', () => {
        expect(getSiegeDrainCoefficient(53)).toBe(-1.5);
        expect(getSiegeDrainCoefficient(80)).toBe(-1.5);
        expect(getSiegeDrainCoefficient(104)).toBe(-1.5);
    });

    it('phase E: counter 105+ → -2.0', () => {
        expect(getSiegeDrainCoefficient(105)).toBe(-2.0);
        expect(getSiegeDrainCoefficient(200)).toBe(-2.0);
        expect(getSiegeDrainCoefficient(10_000)).toBe(-2.0);
    });

    it('boundary snap at 13/14 and 104/105', () => {
        // Critical anti-off-by-one anchors.
        expect(getSiegeDrainCoefficient(13)).toBe(0.0);
        expect(getSiegeDrainCoefficient(14)).toBe(-0.5);
        expect(getSiegeDrainCoefficient(104)).toBe(-1.5);
        expect(getSiegeDrainCoefficient(105)).toBe(-2.0);
    });

    it('negative / non-finite counter → 0.0 (defensive)', () => {
        expect(getSiegeDrainCoefficient(-1)).toBe(0.0);
        expect(getSiegeDrainCoefficient(Number.NaN)).toBe(0.0);
    });
});

describe('LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 / applySiegeMoraleDrain (T2: floor enforcement, T3: env-flag gate)', () => {
    const ORIGINAL_FLAG = process.env.SIEGE_MORALE_DRAIN_ENABLED;

    afterEach(() => {
        if (ORIGINAL_FLAG === undefined) {
            delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        } else {
            process.env.SIEGE_MORALE_DRAIN_ENABLED = ORIGINAL_FLAG;
        }
    });

    it('T2a — floor enforcement: brigade at morale 26 with -2.0 drain → clamps to 25', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 26 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 200 }); // phase E
        const report = applySiegeMoraleDrain(state);
        expect(f.morale).toBe(SIEGE_DRAIN_MORALE_FLOOR);
        expect(f.morale).toBe(25);
        expect(report.drain_applied).toBe(1);
    });

    it('T2b — floor enforcement: brigade already at morale 25 with -2.0 drain → stays 25, skipped', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 25 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 200 });
        const report = applySiegeMoraleDrain(state);
        expect(f.morale).toBe(25);
        expect(report.drain_applied).toBe(0);
        expect(report.drain_skipped_at_floor).toBe(1);
    });

    it('T2c — floor enforcement: brigade at morale 24 with -2.0 drain → unchanged (already below floor)', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 24 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 200 });
        applySiegeMoraleDrain(state);
        expect(f.morale).toBe(24);
    });

    it('T3a — flag UNSET: morale unchanged even at phase-E counter', () => {
        delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        const f = makeBrigade({ morale: 65 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 200 });
        const report = applySiegeMoraleDrain(state);
        expect(f.morale).toBe(65);
        expect(report.drain_applied).toBe(0);
    });

    it('T3b — flag SET to "false": morale unchanged', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'false';
        const f = makeBrigade({ morale: 65 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 200 });
        applySiegeMoraleDrain(state);
        expect(f.morale).toBe(65);
    });

    it('T3c — flag SET to "true": morale reduced per schedule', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 60 });
        // Phase C: counter 40 → -1.0/turn
        const state = makeState([f], { 'RS:op:pale:pale_2': 40 });
        const report = applySiegeMoraleDrain(state);
        expect(f.morale).toBe(59);
        expect(report.drain_applied).toBe(1);
        expect(report.total_morale_removed).toBe(1);
    });

    it('T3d — phase A (counter 10): no drain even with flag ON', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 65 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 10 }); // phase A
        applySiegeMoraleDrain(state);
        expect(f.morale).toBe(65);
    });
});

describe('LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 / faction symmetry (T4)', () => {
    const ORIGINAL_FLAG = process.env.SIEGE_MORALE_DRAIN_ENABLED;

    afterEach(() => {
        if (ORIGINAL_FLAG === undefined) {
            delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        } else {
            process.env.SIEGE_MORALE_DRAIN_ENABLED = ORIGINAL_FLAG;
        }
    });

    it('T4 — same input shape produces same drain regardless of faction key (RS/RBiH/HRHB)', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';

        const factions = ['RS', 'RBiH', 'HRHB'] as const;
        const results = factions.map((faction) => {
            const f = makeBrigade({
                id: `${faction.toLowerCase()}_brigade`,
                faction: faction as any,
                location_osid: `op:test:hill_2`,
                morale: 60,
            });
            const state = makeState([f], { [`${faction}:op:test:hill_2`]: 80 }); // phase D, -1.5
            const report = applySiegeMoraleDrain(state);
            return {
                faction,
                final_morale: f.morale,
                drain_applied: report.drain_applied,
                total_morale_removed: report.total_morale_removed,
            };
        });

        // All three factions produce identical numeric outcomes — mechanism
        // does not name a faction in code; the data does.
        const first = results[0];
        for (const r of results) {
            expect(r.drain_applied).toBe(first.drain_applied);
            expect(r.total_morale_removed).toBe(first.total_morale_removed);
            expect(r.final_morale).toBe(first.final_morale);
        }
        expect(first.drain_applied).toBe(1);
        expect(first.final_morale).toBe(58.5);
    });
});

describe('LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1 / diagnostic counter (T5: unconditional increment)', () => {
    const ORIGINAL_FLAG = process.env.SIEGE_MORALE_DRAIN_ENABLED;

    afterEach(() => {
        if (ORIGINAL_FLAG === undefined) {
            delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        } else {
            process.env.SIEGE_MORALE_DRAIN_ENABLED = ORIGINAL_FLAG;
        }
    });

    it('T5a — flag OFF: drain_pending_count increments for qualifying brigades', () => {
        delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        const f = makeBrigade({ morale: 60 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 80 }); // phase D
        const report = applySiegeMoraleDrain(state);
        // Flag off: morale unchanged but pending count still bumps.
        expect(f.morale).toBe(60);
        expect(report.drain_pending_count).toBe(1);
        expect(report.formations_inspected).toBe(1);
        expect(report.drain_applied).toBe(0);
    });

    it('T5b — flag ON: drain_pending_count also increments (visibility preserved both ways)', () => {
        process.env.SIEGE_MORALE_DRAIN_ENABLED = 'true';
        const f = makeBrigade({ morale: 60 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 80 });
        const report = applySiegeMoraleDrain(state);
        expect(report.drain_pending_count).toBe(1);
        expect(report.drain_applied).toBe(1);
    });

    it('T5c — phase A (counter 5): no pending count (coefficient = 0)', () => {
        delete process.env.SIEGE_MORALE_DRAIN_ENABLED;
        const f = makeBrigade({ morale: 60 });
        const state = makeState([f], { 'RS:op:pale:pale_2': 5 }); // phase A
        const report = applySiegeMoraleDrain(state);
        expect(report.drain_pending_count).toBe(0);
    });
});
