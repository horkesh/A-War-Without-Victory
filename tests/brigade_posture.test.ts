/**
 * Tests for War phase brigade posture system (Stage 4B).
 * Validates posture adoption constraints, order processing,
 * per-turn cohesion costs, and auto-downgrade mechanics.
 *
 * 8-posture system: hold, defend, defend_at_all_costs, elastic_defense,
 * counterattack, dig_in, attack, assault.
 */
import { describe, expect, it } from 'vitest';
import {
    applyPostureCosts,
    applyPostureOrders,
    canAdoptPosture,
    normalizePosture
} from '../src/sim/combat/brigade_posture.js';
import { computeDigInDefMult } from '../src/sim/combat/combat_math.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
    return {
        id, faction, name: `Brigade ${id}`, created_turn: 1, status: 'active',
        assignment: null, kind: 'brigade', personnel, cohesion: 60, hq_sid: hq, tags: []
    };
}

function makePostureState(overrides?: Partial<{ formations: Record<string, FormationState> }>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'posture-test', phase: 'war' } as any,
        factions: [
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: overrides?.formations ?? {
            'rs-brig-1': makeFormation('rs-brig-1', 'RS', 'S1')
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RS' },
        brigade_posture_orders: []
    } as GameState;
}

describe('brigade posture - canAdoptPosture', () => {
    it('high cohesion (60) can adopt attack', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 60;
        expect(canAdoptPosture(brig, 'attack')).toBe(true);
    });

    it('low cohesion (30) cannot adopt attack (min 25; 30 is allowed)', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 30;
        expect(canAdoptPosture(brig, 'attack')).toBe(true);
    });

    it('low cohesion (20) cannot adopt attack (min 25)', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 20;
        expect(canAdoptPosture(brig, 'attack')).toBe(false);
    });

    it('readiness=degraded cannot adopt attack (only active allowed)', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 60;
        brig.readiness = 'degraded';
        expect(canAdoptPosture(brig, 'attack')).toBe(false);
    });

    it('can adopt hold posture (min cohesion 0, readiness active/overextended/degraded)', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 20;
        brig.readiness = 'active';
        expect(canAdoptPosture(brig, 'hold')).toBe(true);
        brig.readiness = 'degraded';
        expect(canAdoptPosture(brig, 'hold')).toBe(true);
    });

    it('assault requires cohesion >= 60 — cohesion 59 cannot adopt assault', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 59;
        expect(canAdoptPosture(brig, 'assault')).toBe(false);
    });

    it('assault requires cohesion >= 60 — cohesion 60 can adopt assault', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 60;
        expect(canAdoptPosture(brig, 'assault')).toBe(true);
    });

    it('home_defense_active blocks attack posture', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 80;
        brig.home_defense_active = true;
        expect(canAdoptPosture(brig, 'attack')).toBe(false);
    });

    it('home_defense_active blocks assault posture', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 80;
        brig.home_defense_active = true;
        expect(canAdoptPosture(brig, 'assault')).toBe(false);
    });

    it('home_defense_active does not block defend posture', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 80;
        brig.home_defense_active = true;
        expect(canAdoptPosture(brig, 'defend')).toBe(true);
    });
});

describe('brigade posture - applyPostureOrders', () => {
    it('changes posture and reports count', () => {
        const state = makePostureState();
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'attack' }
        ];

        const report = applyPostureOrders(state);

        expect(report.postures_changed).toBe(1);
        expect(report.postures_rejected).toBe(0);
        expect(state.formations['rs-brig-1'].posture).toBe('attack');
    });

    it('rejects invalid posture order when cohesion is too low', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].cohesion = 20; // below attack min 25
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'attack' }
        ];

        const report = applyPostureOrders(state);

        expect(report.postures_changed).toBe(0);
        expect(report.postures_rejected).toBe(1);
        expect(state.formations['rs-brig-1'].posture).not.toBe('attack');
    });

    it('clears orders after processing', () => {
        const state = makePostureState();
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'hold' }
        ];

        applyPostureOrders(state);

        expect(state.brigade_posture_orders).toEqual([]);
    });

    it('applies hold posture order', () => {
        const state = makePostureState();
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'hold' }
        ];

        const report = applyPostureOrders(state);

        expect(report.postures_changed).toBe(1);
        expect(state.formations['rs-brig-1'].posture).toBe('hold');
    });

    it('hold auto-upgrades to defend for home_defense_active brigade', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].home_defense_active = true;
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'hold' }
        ];

        const report = applyPostureOrders(state);

        expect(report.postures_changed).toBe(1);
        // 'hold' order was upgraded to 'defend' for home-ground brigade
        expect(state.formations['rs-brig-1'].posture).toBe('defend');
    });
});

describe('brigade posture - applyPostureCosts', () => {
    it('attack posture drains 3 cohesion per turn', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'attack';
        state.formations['rs-brig-1'].cohesion = 60;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(57);
    });

    it('hold posture adds 1 cohesion per turn (recovery)', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'hold';
        state.formations['rs-brig-1'].cohesion = 50;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(51);
    });

    it('defend posture drains 1 cohesion per turn', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'defend';
        state.formations['rs-brig-1'].cohesion = 83;

        applyPostureCosts(state);

        // 83 - 1 = 82
        expect(state.formations['rs-brig-1'].cohesion).toBe(82);
    });

    it('hold posture recovery is capped at 85', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'hold';
        state.formations['rs-brig-1'].cohesion = 85;

        applyPostureCosts(state);

        // Already at cap — no increase beyond 85
        expect(state.formations['rs-brig-1'].cohesion).toBe(85);
    });

    it('auto-downgrades to hold when cohesion drops below posture minimum', () => {
        const state = makePostureState();
        // attack requires min 25; set cohesion to 26 so after -3 drain it becomes 23 < 25
        state.formations['rs-brig-1'].posture = 'attack';
        state.formations['rs-brig-1'].cohesion = 26;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(23);
        // New system: auto-downgrade goes to 'hold', not 'defend'
        expect(state.formations['rs-brig-1'].posture).toBe('hold');
    });

    it('dig_in posture adds 0.5 cohesion per turn (stored as float)', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'dig_in';
        state.formations['rs-brig-1'].cohesion = 60;

        applyPostureCosts(state);

        // 60 + 0.5 = 60.5 (stored to 1 decimal, not truncated)
        expect(state.formations['rs-brig-1'].cohesion).toBe(60.5);
    });

    it('dig_in progress increments by 0.25 each turn', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'dig_in';
        state.formations['rs-brig-1'].dig_in_progress = 0;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].dig_in_progress).toBe(0.25);

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].dig_in_progress).toBe(0.5);
    });

    it('dig_in progress is capped at 1.0', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'dig_in';
        state.formations['rs-brig-1'].dig_in_progress = 0.9;

        applyPostureCosts(state);

        // 0.9 + 0.25 = 1.15 → clamped to 1.0
        expect(state.formations['rs-brig-1'].dig_in_progress).toBe(1.0);
    });

    it('dig_in progress resets to 0 when switching away from dig_in', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'hold'; // switched away from dig_in
        state.formations['rs-brig-1'].dig_in_progress = 0.75;

        applyPostureCosts(state);

        // Progress was > 0, posture is not dig_in → reset to 0
        expect(state.formations['rs-brig-1'].dig_in_progress).toBe(0);
    });

    it('defend_at_all_costs never auto-downgrades even at very low cohesion', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'defend_at_all_costs';
        // cohesion will drop to 6 after -4; min is 10 for DAAC but it must NOT downgrade
        state.formations['rs-brig-1'].cohesion = 10;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(6);
        // DAAC never auto-downgrades
        expect(state.formations['rs-brig-1'].posture).toBe('defend_at_all_costs');
    });
});

describe('brigade posture - computeDigInDefMult', () => {
    it('at progress=0.0 returns base value 1.35', () => {
        expect(computeDigInDefMult(0)).toBeCloseTo(1.35, 4);
    });

    it('at progress=0.25 ramps to ~1.433', () => {
        // 1.35 + (0.25/0.75) * 0.25 = 1.35 + 0.08333 = 1.43333
        expect(computeDigInDefMult(0.25)).toBeCloseTo(1.4333, 3);
    });

    it('at progress=0.50 ramps to ~1.517', () => {
        // 1.35 + (0.50/0.75) * 0.25 = 1.35 + 0.16667 = 1.51667
        expect(computeDigInDefMult(0.50)).toBeCloseTo(1.5167, 3);
    });

    it('at progress=0.75 reaches full value 1.60', () => {
        expect(computeDigInDefMult(0.75)).toBeCloseTo(1.60, 4);
    });

    it('at progress=1.0 is clamped at 1.60 (no overshoot)', () => {
        expect(computeDigInDefMult(1.0)).toBeCloseTo(1.60, 4);
    });

    it('default (no argument) returns base value 1.35', () => {
        expect(computeDigInDefMult()).toBeCloseTo(1.35, 4);
    });
});

describe('brigade posture - normalizePosture', () => {
    it("normalizes 'probe' to 'hold'", () => {
        expect(normalizePosture('probe')).toBe('hold');
    });

    it("normalizes 'consolidation' to 'hold'", () => {
        expect(normalizePosture('consolidation')).toBe('hold');
    });

    it("preserves valid 8-posture values unchanged", () => {
        expect(normalizePosture('hold')).toBe('hold');
        expect(normalizePosture('defend')).toBe('defend');
        expect(normalizePosture('defend_at_all_costs')).toBe('defend_at_all_costs');
        expect(normalizePosture('elastic_defense')).toBe('elastic_defense');
        expect(normalizePosture('counterattack')).toBe('counterattack');
        expect(normalizePosture('dig_in')).toBe('dig_in');
        expect(normalizePosture('attack')).toBe('attack');
        expect(normalizePosture('assault')).toBe('assault');
    });

    it("normalizes unknown/undefined to 'hold'", () => {
        expect(normalizePosture(undefined)).toBe('hold');
        expect(normalizePosture('garbage')).toBe('hold');
    });
});
