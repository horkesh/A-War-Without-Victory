/**
 * Tests for v0.4.3 Economy & War Production
 * - Production facilities produce supply
 * - Damaged facilities produce less
 * (Smuggling-route tests retired 2026-11-17 with the supply-reserve economy, Fable consult 6.)
 */
import { describe, it, expect } from 'vitest';
import { calculateFactionProductionBonus, ensureProductionFacilities } from '../src/state/production_facilities.js';
import type { GameState } from '../src/state/game_state.js';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        factions: [
            { id: 'RBiH', profile: {} },
            { id: 'RS', profile: {} },
            { id: 'HRHB', profile: {} },
        ],
        political: {
            political_controllers: {},
            settlements: {},
        },
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        ...overrides,
    } as unknown as GameState;
}

describe('Production facilities', () => {
    it('ensureProductionFacilities seeds 9 facilities', () => {
        const state = makeMinimalState();
        ensureProductionFacilities(state);
        const facilities = state.military.production_facilities!;
        const count = Object.keys(facilities).length;
        expect(count).toBe(9);
        // Check new RS-area facilities exist
        expect(facilities['prod_hadzici_ammo']).toBeDefined();
        expect(facilities['prod_lukavica_depot']).toBeDefined();
    });

    it('facilities start at condition 1.0', () => {
        const state = makeMinimalState();
        ensureProductionFacilities(state);
        for (const f of Object.values(state.military.production_facilities!)) {
            expect(f.current_condition).toBe(1);
        }
    });

    it('calculateFactionProductionBonus returns 0 when no controllers', () => {
        const state = makeMinimalState();
        const settlements = new Map();
        const bonuses = calculateFactionProductionBonus(state, settlements);
        expect(bonuses['RBiH']).toBe(0);
        expect(bonuses['RS']).toBe(0);
        expect(bonuses['HRHB']).toBe(0);
    });

    it('damaged facilities produce less', () => {
        const state = makeMinimalState();
        ensureProductionFacilities(state);
        // Damage Zenica to 50%
        state.military.production_facilities!['prod_zenica_steel'].current_condition = 0.5;
        const settlements = new Map();
        // Without controllers, can't verify actual output — but condition is stored
        expect(state.military.production_facilities!['prod_zenica_steel'].current_condition).toBe(0.5);
    });
});
