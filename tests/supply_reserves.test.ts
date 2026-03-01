import { describe, it, expect } from 'vitest';
import { updateSupplyReserves, ensureSupplyReserves, deductCombatExpenditure, getEffectiveSupplyState } from '../src/state/supply_reserves.js';
import type { GameState } from '../src/state/game_state.js';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn: 10, seed: 'test', phase: 'war', supply_reserves_enabled: true },
        factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] }
        ],
        formations: {},
        settlements: [],
        municipalities: {},
        political_controllers: {},
        ...overrides
    } as unknown as GameState;
}

describe('ensureSupplyReserves', () => {
    it('initializes reserves with default values when absent', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        expect(state.general_supply_reserve).toBeDefined();
        expect(state.heavy_munitions_reserve).toBeDefined();
        expect(state.general_supply_reserve!['RBiH']).toBe(80);
        expect(state.general_supply_reserve!['RS']).toBe(80);
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(60);
    });

    it('does not overwrite existing reserves', () => {
        const state = makeMinimalState({
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 } as any,
            heavy_munitions_reserve: { RBiH: 40, RS: 40, HRHB: 40 } as any
        });
        ensureSupplyReserves(state);
        expect(state.general_supply_reserve!['RBiH']).toBe(50);
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(40);
    });
});

describe('updateSupplyReserves', () => {
    it('drains maintenance from general supply proportional to formation count', () => {
        const state = makeMinimalState({
            formations: {
                'b1': { id: 'b1', faction: 'RBiH', personnel: 1000 } as any,
                'b2': { id: 'b2', faction: 'RBiH', personnel: 1000 } as any,
                'b3': { id: 'b3', faction: 'RS', personnel: 1000 } as any,
            }
        });
        ensureSupplyReserves(state);
        // Zero production
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });

        // RBiH: 80 - 2*0.15 = 79.7
        expect(state.general_supply_reserve!['RBiH']).toBeCloseTo(79.7, 5);
        // RS: 80 - 1*0.15 = 79.85
        expect(state.general_supply_reserve!['RS']).toBeCloseTo(79.85, 5);
        // HRHB: 80 - 0*0.15 = 80
        expect(state.general_supply_reserve!['HRHB']).toBe(80);

        // Heavy munitions unchanged (no combat expenditure in per-turn update)
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(60);

        expect(report.factions).toHaveLength(3);
        expect(report.factions[0]!.faction_id).toBe('HRHB'); // sorted
    });

    it('adds production income split between general and heavy', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        // RS controls Zenica Steel (8 capacity)
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 8, HRHB: 0 });

        // RS: general = 80 - 0 + 8*1.0*0.6 = 84.8
        expect(state.general_supply_reserve!['RS']).toBeCloseTo(84.8, 5);
        // RS: heavy = 60 + 8*1.0*0.4 = 63.2
        expect(state.heavy_munitions_reserve!['RS']).toBeCloseTo(63.2, 5);
    });

    it('clamps reserves at 0 and 100', () => {
        const state = makeMinimalState({
            general_supply_reserve: { RBiH: 2, RS: 99, HRHB: 50 } as any,
            heavy_munitions_reserve: { RBiH: 1, RS: 99, HRHB: 50 } as any,
            formations: Object.fromEntries(
                Array.from({ length: 50 }, (_, i) => [`b${i}`, { id: `b${i}`, faction: 'RBiH', personnel: 1000 }])
            ) as any
        });
        updateSupplyReserves(state, { RBiH: 0, RS: 50, HRHB: 0 });

        // RBiH: 2 - 50*0.15 = 2-7.5 = -5.5 → clamped to 0
        expect(state.general_supply_reserve!['RBiH']).toBe(0);
        // RS: 99 + 50*0.6 = 129 → clamped to 100
        expect(state.general_supply_reserve!['RS']).toBe(100);
    });
});

describe('deductCombatExpenditure', () => {
    it('deducts heavy munitions and general supply after battle', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        // 3 attackers at intensity 1.5
        deductCombatExpenditure(state, 'RBiH', 3, 1.5);

        // Heavy: 60 - (3 * 1.5 * 2.0 / 100) = 60 - 0.09 = 59.91
        expect(state.heavy_munitions_reserve!['RBiH']).toBeCloseTo(59.91, 5);
        // General: 80 - (3 * 1.5 * 0.5 / 100) = 80 - 0.0225 = 79.9775
        expect(state.general_supply_reserve!['RBiH']).toBeCloseTo(79.9775, 5);
    });

    it('does not go below zero', () => {
        const state = makeMinimalState({
            heavy_munitions_reserve: { RBiH: 0.001, RS: 60, HRHB: 60 } as any,
            general_supply_reserve: { RBiH: 0.001, RS: 80, HRHB: 80 } as any
        });
        deductCombatExpenditure(state, 'RBiH', 10, 5.0);
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(0);
        expect(state.general_supply_reserve!['RBiH']).toBe(0);
    });
});

describe('getEffectiveSupplyState', () => {
    it('returns adequate when reachable and reserves high', () => {
        expect(getEffectiveSupplyState('adequate', 80)).toBe('adequate');
        expect(getEffectiveSupplyState('adequate', 50)).toBe('adequate');
    });

    it('degrades adequate to strained when reserves moderate', () => {
        expect(getEffectiveSupplyState('adequate', 49)).toBe('strained');
        expect(getEffectiveSupplyState('adequate', 20)).toBe('strained');
    });

    it('degrades adequate to critical when reserves low', () => {
        expect(getEffectiveSupplyState('adequate', 19)).toBe('critical');
        expect(getEffectiveSupplyState('adequate', 0)).toBe('critical');
    });

    it('strained reachability never improves beyond strained', () => {
        expect(getEffectiveSupplyState('strained', 100)).toBe('strained');
        expect(getEffectiveSupplyState('strained', 50)).toBe('strained');
    });

    it('strained reachability degrades to critical when reserves low', () => {
        expect(getEffectiveSupplyState('strained', 19)).toBe('critical');
    });

    it('critical reachability always returns critical', () => {
        expect(getEffectiveSupplyState('critical', 100)).toBe('critical');
        expect(getEffectiveSupplyState('critical', 0)).toBe('critical');
    });
});
