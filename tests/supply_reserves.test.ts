import { describe, it, expect } from 'vitest';
import { updateSupplyReserves, ensureSupplyReserves, deductCombatExpenditure, getEffectiveSupplyState } from '../src/state/supply_reserves.js';
import { MAINTENANCE_DRAIN_PER_FORMATION, HEAVY_MAINTENANCE_PER_WEAPON } from '../src/state/supply_reserve_constants.js';
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
    it('initializes reserves with per-faction default values when absent', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        expect(state.military.general_supply_reserve).toBeDefined();
        expect(state.military.heavy_munitions_reserve).toBeDefined();
        // Per-faction overrides: RBiH starts near-zero (no JNA inheritance)
        expect(state.military.general_supply_reserve!['RBiH']).toBe(10);
        expect(state.military.general_supply_reserve!['RS']).toBe(80);
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBe(5);
    });

    it('does not overwrite existing reserves', () => {
        const state = makeMinimalState({
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 } as any,
            heavy_munitions_reserve: { RBiH: 40, RS: 40, HRHB: 40 } as any
        });
        ensureSupplyReserves(state);
        expect(state.military.general_supply_reserve!['RBiH']).toBe(50);
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBe(40);
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

        // RBiH starts at 10 (per-faction override), RS at 80, HRHB at 75
        expect(state.military.general_supply_reserve!['RBiH']).toBeCloseTo(10 - 2 * MAINTENANCE_DRAIN_PER_FORMATION, 5);
        // RS: 80 - 1*DRAIN
        expect(state.military.general_supply_reserve!['RS']).toBeCloseTo(80 - 1 * MAINTENANCE_DRAIN_PER_FORMATION, 5);
        // HRHB: 75 - 0*DRAIN = 75, but capped by EMBARGO_SUPPLY_CAP['HRHB'] = 70
        expect(state.military.general_supply_reserve!['HRHB']).toBe(70);

        // Heavy munitions unchanged (no combat expenditure in per-turn update)
        // RBiH starts at 5 (per-faction override)
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBe(5);

        expect(report.factions).toHaveLength(3);
        expect(report.factions[0]!.faction_id).toBe('HRHB'); // sorted
    });

    it('adds production income split between general and heavy', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        // RS controls Zenica Steel (8 capacity)
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 8, HRHB: 0 });

        // RS: general = 80 - 0 + 8*1.0*0.6 = 84.8
        expect(state.military.general_supply_reserve!['RS']).toBeCloseTo(84.8, 5);
        // RS: heavy = 60 + 8*1.0*0.4 = 63.2
        expect(state.military.heavy_munitions_reserve!['RS']).toBeCloseTo(63.2, 5);
    });

    it('drains heavy munitions proportional to heavy weapon count (tanks + artillery)', () => {
        const state = makeMinimalState({
            formations: {
                'rs1': { id: 'rs1', faction: 'RS', personnel: 3000, composition: { tanks: 30, artillery: 20, infantry: 0, aa_systems: 0 } } as any,
                'rs2': { id: 'rs2', faction: 'RS', personnel: 2000, composition: { tanks: 0, artillery: 10, infantry: 0, aa_systems: 0 } } as any,
                'rbih1': { id: 'rbih1', faction: 'RBiH', personnel: 2000, composition: { tanks: 0, artillery: 5, infantry: 0, aa_systems: 0 } } as any,
            }
        });
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });

        // RS: 50 heavy weapons (30T+20A + 10A), RBiH: 5 (5A)
        const rsHeavyDrain = 60 * HEAVY_MAINTENANCE_PER_WEAPON;  // 60 weapons × 0.001 = 0.06
        const rbihHeavyDrain = 5 * HEAVY_MAINTENANCE_PER_WEAPON; // 5 weapons × 0.001 = 0.005

        // RS heavy starts at 60 (same as default): 60 - rsHeavyDrain
        expect(state.military.heavy_munitions_reserve!['RS']).toBeCloseTo(60 - rsHeavyDrain, 5);
        // RBiH heavy starts at 5 (per-faction override): 5 - rbihHeavyDrain
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBeCloseTo(5 - rbihHeavyDrain, 5);
        // HRHB: no formations → no drain, starts at 25 (per-faction override)
        expect(state.military.heavy_munitions_reserve!['HRHB']).toBe(25);

        // Report should include heavy_maintenance_drain
        const rsEntry = report.factions.find(f => f.faction_id === 'RS')!;
        expect(rsEntry.heavy_maintenance_drain).toBeCloseTo(rsHeavyDrain, 5);
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;
        expect(rbihEntry.heavy_maintenance_drain).toBeCloseTo(rbihHeavyDrain, 5);
    });

    it('clamps reserves at 0 and 100', () => {
        const state = makeMinimalState({
            general_supply_reserve: { RBiH: 1, RS: 99, HRHB: 50 } as any,
            heavy_munitions_reserve: { RBiH: 1, RS: 99, HRHB: 50 } as any,
            formations: Object.fromEntries(
                Array.from({ length: 50 }, (_, i) => [`b${i}`, { id: `b${i}`, faction: 'RBiH', personnel: 1000 }])
            ) as any
        });
        updateSupplyReserves(state, { RBiH: 0, RS: 50, HRHB: 0 });

        // RBiH: 1 - 50*0.025 = 1-1.25 = -0.25 → clamped to 0
        expect(state.military.general_supply_reserve!['RBiH']).toBe(0);
        // RS: 99 + 50*0.6 = 129 → clamped to EMBARGO_SUPPLY_CAP['RS'] = 90
        expect(state.military.general_supply_reserve!['RS']).toBe(90);
    });
});

describe('deductCombatExpenditure', () => {
    it('deducts heavy munitions and general supply after battle', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        // 3 attackers at intensity 1.5
        deductCombatExpenditure(state, 'RBiH', 3, 1.5);

        // Heavy: RBiH starts at 5 (per-faction override); 5 - (3 * 1.5 * 1.2 / 100) = 5 - 0.054 = 4.946
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBeCloseTo(4.946, 5);
        // General: RBiH starts at 10; 10 - (3 * 1.5 * 0.5 / 100) = 10 - 0.0225 = 9.9775
        expect(state.military.general_supply_reserve!['RBiH']).toBeCloseTo(9.9775, 5);
    });

    it('does not go below zero', () => {
        const state = makeMinimalState({
            heavy_munitions_reserve: { RBiH: 0.001, RS: 60, HRHB: 60 } as any,
            general_supply_reserve: { RBiH: 0.001, RS: 80, HRHB: 80 } as any
        });
        deductCombatExpenditure(state, 'RBiH', 10, 5.0);
        expect(state.military.heavy_munitions_reserve!['RBiH']).toBe(0);
        expect(state.military.general_supply_reserve!['RBiH']).toBe(0);
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

    it('critical reachability upgrades to strained when reserves high, stays critical when low', () => {
        // High reserves (≥50) compensate for isolation: critical → strained
        expect(getEffectiveSupplyState('critical', 100)).toBe('strained');
        expect(getEffectiveSupplyState('critical', 50)).toBe('strained');
        // Low reserves cannot compensate: stays critical
        expect(getEffectiveSupplyState('critical', 49)).toBe('critical');
        expect(getEffectiveSupplyState('critical', 0)).toBe('critical');
    });
});
