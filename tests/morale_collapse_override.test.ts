/**
 * LANE-NIGHTSHIFT-N4-CANON-AMENDMENT (Engine Invariants v0.7.0 §6.2.4 +
 * Systems Manual v0.7.0 §6.4, 2026-05-03) — morale-collapse override
 * shadow-flag contract.
 *
 * The morale_low_streak counter increments unconditionally when morale ≤ 15
 * (diagnostic visibility), with 5-point hysteresis reset above 20. The
 * dissolution override path is gated behind env flag MORALE_OVERRIDE_ENABLED
 * (default false). With the flag off, the streak counter still ticks but
 * brigade_dissolution.ts retains its 2-of-3 / personnel-cap behavior. With
 * the flag on, a streak ≥ MORALE_OVERRIDE_TURNS (8) bypasses the personnel
 * cap and 2-of-3 criteria and dissolves the brigade regardless.
 *
 * Determinism: pure synchronous; no I/O; no random; no Date.now.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import { dissolveCombatIneffectiveBrigades, MORALE_OVERRIDE_TURNS } from '../src/sim/combat/brigade_dissolution.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'rs_brigade_a',
        faction: 'RS',
        name: 'Brigade A',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'rs_corps',
        location_osid: 'op:test:home_2',
        home_osid: 'op:test:home_2',
        personnel: 2000,
        morale: 60,
        cohesion: 50,
        ...overrides,
    } as FormationState;
}

function makeState(brigade: FormationState): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, phase: 'war', seed: 'n4-test' } as any,
        military: {
            formations: { [brigade.id]: brigade } as any,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: {
                rs_corps: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [],
                } as any,
            },
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

describe('LANE-NIGHTSHIFT-N4 morale_low_streak counter', () => {
    it('T1 — increments by 1 when morale ≤ 15', () => {
        const f = makeBrigade({ morale: 10 });
        const state = makeState(f);
        runMoraleDrift(state, new Set(), undefined);
        expect(f.morale_low_streak).toBe(1);
    });

    it('T2 — increments cumulatively across turns', () => {
        const f = makeBrigade({ morale: 5, morale_low_streak: 3 });
        const state = makeState(f);
        runMoraleDrift(state, new Set(), undefined);
        expect(f.morale_low_streak).toBe(4);
    });

    it('T3 — resets to 0 when morale > 20', () => {
        const f = makeBrigade({ morale: 25, morale_low_streak: 5 });
        const state = makeState(f);
        runMoraleDrift(state, new Set(), undefined);
        expect(f.morale_low_streak).toBe(0);
    });

    it('T4 — preserved unchanged in 16-20 hysteresis band', () => {
        for (const m of [16, 18, 20]) {
            const f = makeBrigade({ morale: m, morale_low_streak: 4 });
            const state = makeState(f);
            runMoraleDrift(state, new Set(), undefined);
            expect(f.morale_low_streak, `hysteresis at morale=${m}`).toBe(4);
        }
    });

    it('T5 — undefined input deserializes to 0; first low-morale turn writes 1', () => {
        const f = makeBrigade({ morale: 10 });
        // morale_low_streak is undefined on legacy save shape
        expect(f.morale_low_streak).toBeUndefined();
        const state = makeState(f);
        runMoraleDrift(state, new Set(), undefined);
        expect(f.morale_low_streak).toBe(1);
    });
});

describe('LANE-NIGHTSHIFT-N4 dissolution override gate (shadow-flag)', () => {
    const ORIGINAL_FLAG = process.env.MORALE_OVERRIDE_ENABLED;

    afterEach(() => {
        if (ORIGINAL_FLAG === undefined) {
            delete process.env.MORALE_OVERRIDE_ENABLED;
        } else {
            process.env.MORALE_OVERRIDE_ENABLED = ORIGINAL_FLAG;
        }
    });

    it('T6 — flag OFF: streak ≥ 8 + personnel 2000 + low morale does NOT dissolve', () => {
        delete process.env.MORALE_OVERRIDE_ENABLED;
        const f = makeBrigade({
            personnel: 2000,
            morale: 0,
            cohesion: 20,
            morale_low_streak: MORALE_OVERRIDE_TURNS, // 8
        });
        const state = makeState(f);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(0);
        expect(f.status).toBe('active');
        expect(f.lifecycle_status).not.toBe('destroyed');
    });

    it('T7 — flag ON: streak ≥ 8 + personnel 2000 dissolves regardless of cap', () => {
        process.env.MORALE_OVERRIDE_ENABLED = 'true';
        const f = makeBrigade({
            personnel: 2000,
            morale: 0,
            cohesion: 20,
            morale_low_streak: MORALE_OVERRIDE_TURNS, // 8
        });
        const state = makeState(f);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
        expect(f.status).toBe('inactive');
        expect(f.lifecycle_status).toBe('destroyed');
    });

    it('T8 — flag ON: streak < 8 does NOT trigger override (personnel cap still applies)', () => {
        process.env.MORALE_OVERRIDE_ENABLED = 'true';
        const f = makeBrigade({
            personnel: 2000,
            morale: 0,
            cohesion: 20,
            morale_low_streak: 5, // below threshold
        });
        const state = makeState(f);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(0);
        expect(f.status).toBe('active');
    });

    it('T9 — flag ON: legacy 2-of-3 dissolution still fires when criteria met (no override needed)', () => {
        process.env.MORALE_OVERRIDE_ENABLED = 'true';
        const f = makeBrigade({
            personnel: 300, // below threshold
            morale: 10,     // <= 15
            cohesion: 50,
            morale_low_streak: 1,
        });
        const state = makeState(f);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
        expect(f.lifecycle_status).toBe('destroyed');
    });

    it('T10 — flag OFF: legacy 2-of-3 dissolution still fires (canon path preserved)', () => {
        delete process.env.MORALE_OVERRIDE_ENABLED;
        const f = makeBrigade({
            personnel: 300,
            morale: 10,
            cohesion: 50,
            morale_low_streak: 0,
        });
        const state = makeState(f);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
    });
});
