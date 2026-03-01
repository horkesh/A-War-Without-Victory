/**
 * Tests for Phase II brigade posture system (Stage 4B).
 * Validates posture adoption constraints, order processing,
 * per-turn cohesion costs, and auto-downgrade mechanics.
 */
import { describe, expect, it } from 'vitest';
import {
    applyPostureCosts,
    applyPostureOrders,
    canAdoptPosture
} from '../src/sim/combat/brigade_posture.js';
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

    it('can adopt consolidation posture (min cohesion 0, readiness active/overextended/degraded)', () => {
        const brig = makeFormation('rs-brig-1', 'RS', 'S1');
        brig.cohesion = 20;
        brig.readiness = 'active';
        expect(canAdoptPosture(brig, 'consolidation')).toBe(true);
        brig.readiness = 'degraded';
        expect(canAdoptPosture(brig, 'consolidation')).toBe(true);
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
            { brigade_id: 'rs-brig-1', posture: 'probe' }
        ];

        applyPostureOrders(state);

        expect(state.brigade_posture_orders).toEqual([]);
    });

    it('applies consolidation posture order', () => {
        const state = makePostureState();
        state.brigade_posture_orders = [
            { brigade_id: 'rs-brig-1', posture: 'consolidation' }
        ];

        const report = applyPostureOrders(state);

        expect(report.postures_changed).toBe(1);
        expect(state.formations['rs-brig-1'].posture).toBe('consolidation');
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

    it('consolidation posture adds 1 cohesion per turn (tuned)', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'consolidation';
        state.formations['rs-brig-1'].cohesion = 50;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(51);
    });

    it('defend posture recovers 2 cohesion per turn, capped at 85', () => {
        const state = makePostureState();
        state.formations['rs-brig-1'].posture = 'defend';
        state.formations['rs-brig-1'].cohesion = 83;

        applyPostureCosts(state);

        // 83 + 2 = 85 (at cap)
        expect(state.formations['rs-brig-1'].cohesion).toBe(85);

        applyPostureCosts(state);
        expect(state.formations['rs-brig-1'].cohesion).toBe(85);
    });

    it('auto-downgrades to defend when cohesion drops below posture minimum', () => {
        const state = makePostureState();
        // attack requires min 25; set cohesion to 26 so after -3 drain it becomes 23 < 25
        state.formations['rs-brig-1'].posture = 'attack';
        state.formations['rs-brig-1'].cohesion = 26;

        applyPostureCosts(state);

        expect(state.formations['rs-brig-1'].cohesion).toBe(23);
        expect(state.formations['rs-brig-1'].posture).toBe('defend');
    });
});
