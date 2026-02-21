/**
 * Tests for src/sim/phase_ii/brigade_pressure.ts and
 *            src/sim/phase_ii/faction_resilience.ts
 *
 * Covers: computeResilienceModifier, computeBrigadeRawPressure,
 *         computeBrigadeDefense, computeBrigadePressureByEdge
 */

import { describe, expect, it } from 'vitest';
import {
    computeBrigadeDefense,
    computeBrigadePressureByEdge,
    computeBrigadeRawPressure
} from '../src/sim/phase_ii/brigade_pressure.js';
import { ensureBrigadeComposition } from '../src/sim/phase_ii/equipment_effects.js';
import { computeResilienceModifier } from '../src/sim/phase_ii/faction_resilience.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// --- Helpers ---

function makeFormation(
    id: string,
    faction: FactionId,
    hq: string,
    personnel: number = 1000
): FormationState {
    return {
        id,
        faction,
        name: `Brigade ${id}`,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel,
        cohesion: 60,
        hq_sid: hq,
        tags: []
    } as FormationState;
}

/**
 * Build a minimal GameState for resilience / pressure tests.
 * politicalControllers: Record<SettlementId, FactionId>
 */
function makeState(opts: {
    politicalControllers: Record<string, string>;
    formations?: Record<string, FormationState>;
    brigadeAor?: Record<string, string>;
    turn?: number;
}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: opts.turn ?? 20, seed: 'test', phase: 'phase_ii' } as any,
        formations: opts.formations ?? {},
        political_controllers: opts.politicalControllers,
        brigade_aor: opts.brigadeAor ?? {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        factions: [],
        militia_pools: {},
        municipalities: {}
    } as GameState;
}

/**
 * Generate a political_controllers map with a given faction controlling
 * a certain number of settlements out of a total.
 */
function makePCMap(
    faction: string,
    controlled: number,
    total: number,
    otherFaction: string = 'RS'
): Record<string, string> {
    const pc: Record<string, string> = {};
    for (let i = 0; i < total; i++) {
        pc[`s${i}`] = i < controlled ? faction : otherFaction;
    }
    return pc;
}

// ===================================================================
// faction_resilience.ts tests
// ===================================================================

describe('computeResilienceModifier', () => {
    it('returns 1.0 when faction has majority control (>40%)', () => {
        // RBiH controls 50 of 100 settlements => 50%
        const pc = makePCMap('RBiH', 50, 100);
        const state = makeState({ politicalControllers: pc });
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        expect(mod).toBe(1.0);
    });

    it('returns > 1.0 when faction has existential threat (control < 30%)', () => {
        // RBiH controls 20 of 100 => 20%
        const pc = makePCMap('RBiH', 20, 100);
        const state = makeState({ politicalControllers: pc });
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        expect(mod).toBeGreaterThan(1.0);
    });

    it('existential threat bonus increases as control decreases', () => {
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');

        // 25% control
        const pc25 = makePCMap('RBiH', 25, 100);
        const mod25 = computeResilienceModifier(
            makeState({ politicalControllers: pc25 }),
            'RBiH',
            brigade
        );

        // 10% control
        const pc10 = makePCMap('RBiH', 10, 100);
        const mod10 = computeResilienceModifier(
            makeState({ politicalControllers: pc10 }),
            'RBiH',
            brigade
        );

        expect(mod10).toBeGreaterThan(mod25);
    });

    it('gives home defense bonus when brigade defends home municipality', () => {
        const brigade = makeFormation('rbih1', 'RBiH', 'hq_s5');
        brigade.posture = 'defend';
        brigade.tags = ['mun:MUN_HOME'];

        // 35% control => no existential threat but under pressure threshold
        const pc = makePCMap('RBiH', 35, 100);
        const brigadeAor: Record<string, string> = { hq_s5: 'rbih1' };
        const state = makeState({ politicalControllers: pc, brigadeAor });

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        // Should get home defense bonus (0.20) + cohesion under pressure (0.15)
        expect(mod).toBeGreaterThan(1.0);
        // Home defense bonus alone is +0.20
        expect(mod).toBeGreaterThanOrEqual(1.2);
    });

    it('no home defense bonus when posture is attack', () => {
        const brigade = makeFormation('rbih1', 'RBiH', 'hq_s5');
        brigade.posture = 'attack';
        brigade.tags = ['mun:MUN_HOME'];

        // 50% control => no existential, no pressure
        const pc = makePCMap('RBiH', 50, 100);
        const brigadeAor: Record<string, string> = { hq_s5: 'rbih1' };
        const state = makeState({ politicalControllers: pc, brigadeAor });

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        expect(mod).toBe(1.0);
    });

    it('cohesion under pressure bonus when control < 40% and cohesion > 50', () => {
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');
        brigade.cohesion = 70; // above MIN_COHESION_FOR_PRESSURE_BONUS (50)

        // 35% control => under PRESSURE_THRESHOLD (0.40)
        const pc = makePCMap('RBiH', 35, 100);
        const state = makeState({ politicalControllers: pc });

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        // Should include cohesion under pressure bonus (+0.15)
        expect(mod).toBeGreaterThanOrEqual(1.15);
    });

    it('no cohesion under pressure bonus when cohesion <= 50', () => {
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');
        brigade.cohesion = 40; // below threshold

        // 35% control => under PRESSURE_THRESHOLD
        const pc = makePCMap('RBiH', 35, 100);
        const state = makeState({ politicalControllers: pc });

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        // No existential (35% > 30%), no home defense, no cohesion bonus
        expect(mod).toBe(1.0);
    });

    it('returns 1.0 when no political_controllers', () => {
        const state = makeState({ politicalControllers: {} });
        // Remove political_controllers entirely
        delete (state as any).political_controllers;
        const brigade = makeFormation('rbih1', 'RBiH', 'hq1');

        const mod = computeResilienceModifier(state, 'RBiH', brigade);
        expect(mod).toBe(1.0);
    });
});

// ===================================================================
// brigade_pressure.ts tests
// ===================================================================

describe('computeBrigadeRawPressure', () => {
    it('attack posture gives higher pressure than defend', () => {
        const attacker = makeFormation('rs1', 'RS', 's0');
        attacker.posture = 'attack';
        ensureBrigadeComposition(attacker);

        const defender = makeFormation('rs2', 'RS', 's0');
        defender.posture = 'defend';
        ensureBrigadeComposition(defender);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        // Give each brigade 5 settlements in AoR for density
        for (let i = 0; i < 5; i++) {
            brigadeAor[`s${i}`] = 'rs1';
            brigadeAor[`s${i + 50}`] = 'rs2';
        }

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: attacker, rs2: defender },
            brigadeAor
        });

        const attackPressure = computeBrigadeRawPressure(state, attacker);
        const defendPressure = computeBrigadeRawPressure(state, defender);

        expect(attackPressure).toBeGreaterThan(defendPressure);
    });

    it('disrupted brigade has halved pressure', () => {
        const normal = makeFormation('rs1', 'RS', 's0');
        normal.posture = 'attack';
        ensureBrigadeComposition(normal);

        const disrupted = makeFormation('rs2', 'RS', 's0');
        disrupted.posture = 'attack';
        disrupted.disrupted = true;
        ensureBrigadeComposition(disrupted);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
            brigadeAor[`s${i}`] = 'rs1';
            brigadeAor[`s${i + 50}`] = 'rs2';
        }

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: normal, rs2: disrupted },
            brigadeAor
        });

        const normalPressure = computeBrigadeRawPressure(state, normal);
        const disruptedPressure = computeBrigadeRawPressure(state, disrupted);

        // Disrupted multiplier is 0.5, so pressure should be halved
        expect(disruptedPressure).toBeCloseTo(normalPressure * 0.5, 1);
    });

    it('unsupplied brigade has reduced pressure (supply factor 0.4)', () => {
        const supplied = makeFormation('rs1', 'RS', 's0');
        supplied.posture = 'attack';
        supplied.ops = { last_supplied_turn: 19 } as any; // supplied within 2 turns
        ensureBrigadeComposition(supplied);

        const unsupplied = makeFormation('rs2', 'RS', 's0');
        unsupplied.posture = 'attack';
        // no ops.last_supplied_turn => unsupplied
        ensureBrigadeComposition(unsupplied);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
            brigadeAor[`s${i}`] = 'rs1';
            brigadeAor[`s${i + 50}`] = 'rs2';
        }

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: supplied, rs2: unsupplied },
            brigadeAor
        });

        const suppliedPressure = computeBrigadeRawPressure(state, supplied);
        const unsuppliedPressure = computeBrigadeRawPressure(state, unsupplied);

        expect(suppliedPressure).toBeGreaterThan(unsuppliedPressure);
    });

    it('returns 0 for forming readiness', () => {
        const f = makeFormation('rs1', 'RS', 's0');
        f.posture = 'attack';
        f.readiness = 'forming' as any;
        ensureBrigadeComposition(f);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = { s0: 'rs1' };
        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: f },
            brigadeAor
        });

        const pressure = computeBrigadeRawPressure(state, f);
        expect(pressure).toBe(0);
    });
});

describe('computeBrigadeDefense', () => {
    it('defend posture gives higher defense than attack posture', () => {
        const defBrigade = makeFormation('rs1', 'RS', 's0');
        defBrigade.posture = 'defend';
        ensureBrigadeComposition(defBrigade);

        const atkBrigade = makeFormation('rs2', 'RS', 's0');
        atkBrigade.posture = 'attack';
        ensureBrigadeComposition(atkBrigade);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
            brigadeAor[`s${i}`] = 'rs1';
            brigadeAor[`s${i + 50}`] = 'rs2';
        }

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: defBrigade, rs2: atkBrigade },
            brigadeAor
        });

        const defDefense = computeBrigadeDefense(state, defBrigade, 0);
        const atkDefense = computeBrigadeDefense(state, atkBrigade, 0);

        expect(defDefense).toBeGreaterThan(atkDefense);
    });

    it('front hardening increases defense with active streak', () => {
        const brigade = makeFormation('rs1', 'RS', 's0');
        brigade.posture = 'defend';
        ensureBrigadeComposition(brigade);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        for (let i = 0; i < 5; i++) brigadeAor[`s${i}`] = 'rs1';

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: brigade },
            brigadeAor
        });

        const defNoStreak = computeBrigadeDefense(state, brigade, 0);
        const defWithStreak = computeBrigadeDefense(state, brigade, 10);

        expect(defWithStreak).toBeGreaterThan(defNoStreak);
    });

    it('hardening bonus caps at 0.5 (streak >= 10)', () => {
        const brigade = makeFormation('rs1', 'RS', 's0');
        brigade.posture = 'defend';
        ensureBrigadeComposition(brigade);

        const pc = makePCMap('RS', 50, 100);
        const brigadeAor: Record<string, string> = {};
        for (let i = 0; i < 5; i++) brigadeAor[`s${i}`] = 'rs1';

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: brigade },
            brigadeAor
        });

        const defStreak10 = computeBrigadeDefense(state, brigade, 10);
        const defStreak20 = computeBrigadeDefense(state, brigade, 20);

        // Both should cap at max hardening bonus of 0.5
        expect(defStreak10).toBeCloseTo(defStreak20, 5);
    });
});

describe('computeBrigadePressureByEdge', () => {
    it('returns correct edges with pressure delta', () => {
        const brigA = makeFormation('rs1', 'RS', 'sA');
        brigA.posture = 'attack';
        ensureBrigadeComposition(brigA);

        const brigB = makeFormation('rbih1', 'RBiH', 'sB');
        brigB.posture = 'defend';
        ensureBrigadeComposition(brigB);

        const pc: Record<string, string> = { sA: 'RS', sB: 'RBiH' };
        const brigadeAor: Record<string, string> = { sA: 'rs1', sB: 'rbih1' };

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: brigA, rbih1: brigB },
            brigadeAor
        });

        const frontEdges = [{ a: 'sA', b: 'sB' }];
        const result = computeBrigadePressureByEdge(state, frontEdges);

        const eid = 'sA:sB'; // sorted
        expect(result.edge_pressure[eid]).toBeDefined();
        expect(result.edge_pressure[eid].side_a_pressure).toBeGreaterThan(0);
        expect(result.edge_pressure[eid].side_b_pressure).toBeGreaterThan(0);
        expect(typeof result.edge_pressure[eid].delta).toBe('number');
    });

    it('skips edges where both sides are same faction', () => {
        const pc: Record<string, string> = { sA: 'RS', sB: 'RS' };
        const state = makeState({ politicalControllers: pc });

        const frontEdges = [{ a: 'sA', b: 'sB' }];
        const result = computeBrigadePressureByEdge(state, frontEdges);

        expect(Object.keys(result.edge_pressure)).toHaveLength(0);
    });

    it('populates brigade_pressure for each brigade on a front edge', () => {
        const brigA = makeFormation('rs1', 'RS', 'sA');
        brigA.posture = 'probe';
        ensureBrigadeComposition(brigA);

        const brigB = makeFormation('rbih1', 'RBiH', 'sB');
        brigB.posture = 'defend';
        ensureBrigadeComposition(brigB);

        const pc: Record<string, string> = { sA: 'RS', sB: 'RBiH' };
        const brigadeAor: Record<string, string> = { sA: 'rs1', sB: 'rbih1' };

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: brigA, rbih1: brigB },
            brigadeAor
        });

        const result = computeBrigadePressureByEdge(state, [{ a: 'sA', b: 'sB' }]);

        expect(result.brigade_pressure['rs1']).toBeGreaterThan(0);
        expect(result.brigade_pressure['rbih1']).toBeGreaterThan(0);
    });

    it('delta is clamped to [-10, 10]', () => {
        // Create a very strong brigade on one side and nothing on the other
        const brig = makeFormation('rs1', 'RS', 'sA', 5000);
        brig.posture = 'attack';
        brig.cohesion = 100;
        ensureBrigadeComposition(brig);

        const pc: Record<string, string> = { sA: 'RS', sB: 'RBiH' };
        const brigadeAor: Record<string, string> = { sA: 'rs1' }; // sB has no brigade

        const state = makeState({
            politicalControllers: pc,
            formations: { rs1: brig },
            brigadeAor
        });

        const result = computeBrigadePressureByEdge(state, [{ a: 'sA', b: 'sB' }]);
        const eid = 'sA:sB';
        expect(result.edge_pressure[eid].delta).toBeLessThanOrEqual(10);
        expect(result.edge_pressure[eid].delta).toBeGreaterThanOrEqual(-10);
    });
});
