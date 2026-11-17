import { describe, it, expect } from 'vitest';
import {
    updateSupplyReserves,
    ensureSupplyReserves,
} from '../src/state/supply_reserves.js';
import type { GameState } from '../src/state/game_state.js';
import {
    PATRON_AID_SCALE,
    PATRON_AID_FACTION_EFFICIENCY,
    PATRON_AID_GENERAL_FRACTION,
    PATRON_AID_HEAVY_FRACTION,
    FACILITY_COMBAT_DAMAGE_RATE,
} from '../src/state/supply_reserve_constants.js';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
  schema_version: 1,
  meta: { turn: 10, seed: 'test', phase: 'war', supply_reserves_enabled: true },
  factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] }
        ],
  ...overrides,
  military: {
    formations: {},
      ...(overrides?.military || {})
} as any,
  political: {
    settlements: [],
    municipalities: {},
    political_controllers: {},
      ...(overrides?.political || {})
} as any,
  displacement: {
      ...(overrides?.displacement || {})
} as any,
} as unknown as GameState;
}

// updateSiegeTurnCounters and the siege-counter reserve drain were retired
// 2026-11-17 (§6 panel, Fable consult 6). An old save may still carry
// military.siege_turn_counters; the reserve economy must ignore it.
describe('updateSupplyReserves — retired siege drain', () => {
    it('ignores siege_turn_counters carried by an old save', () => {
        const withCounters = makeMinimalState({
  military: {
    siege_turn_counters: { 'RBiH:op:srebrenica:center': 1000 },
  } as any,
});
        const without = makeMinimalState();
        ensureSupplyReserves(withCounters);
        ensureSupplyReserves(without);
        const reportWith = updateSupplyReserves(withCounters, { RBiH: 0, RS: 0, HRHB: 0 });
        const reportWithout = updateSupplyReserves(without, { RBiH: 0, RS: 0, HRHB: 0 });
        expect(JSON.stringify(reportWith.factions)).toBe(JSON.stringify(reportWithout.factions));
        expect(withCounters.military.general_supply_reserve).toEqual(without.military.general_supply_reserve);
        expect(withCounters.military.heavy_munitions_reserve).toEqual(without.military.heavy_munitions_reserve);
        // The counters are carried through untouched; nothing writes them.
        expect(withCounters.military.siege_turn_counters).toEqual({ 'RBiH:op:srebrenica:center': 1000 });
    });
});

describe('updateSupplyReserves — patron aid', () => {
    it('adds patron aid income split between general and heavy', () => {
        const state = makeMinimalState({
            factions: [
                { id: 'RBiH', supply_sources: [], patron_state: { material_support_level: 0.8, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 } },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any
        });
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;
        const factionEff = PATRON_AID_FACTION_EFFICIENCY['RBiH'] ?? 1.0;
        const expectedAid = 0.8 * PATRON_AID_SCALE * factionEff;
        expect(rbihEntry.patron_aid_general).toBeCloseTo(expectedAid * PATRON_AID_GENERAL_FRACTION, 5);
        expect(rbihEntry.patron_aid_heavy).toBeCloseTo(expectedAid * PATRON_AID_HEAVY_FRACTION, 5);
    });
});

describe('updateSupplyReserves — embargo reduction', () => {
    it('applies embargo factor to income', () => {
        const state = makeMinimalState({
            factions: [
                {
                    id: 'RBiH', supply_sources: [],
                    patron_state: { material_support_level: 1.0, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 },
                    embargo_profile: { heavy_equipment_access: 0, ammunition_resupply_rate: 0.5, maintenance_capacity: 0, smuggling_efficiency: 0.2, external_pipeline_status: 0.3 }
                },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any
        });
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 10, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;

        // embargo_factor_heavy = clamp01(0.5 + 0.2 × 0.3) = 0.56
        expect(rbihEntry.embargo_factor_heavy).toBeCloseTo(0.5 + 0.2 * 0.3, 5);
        // embargo_factor_general = clamp01(0.3 + 0.2 × 0.2) = 0.34
        expect(rbihEntry.embargo_factor_general).toBeCloseTo(0.3 + 0.2 * 0.2, 5);
    });

    it('defaults to 1.0 embargo factor when no embargo profile', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;
        expect(rbihEntry.embargo_factor_general).toBe(1.0);
        expect(rbihEntry.embargo_factor_heavy).toBe(1.0);
    });
});

describe('facility combat damage', () => {
    it('FACILITY_COMBAT_DAMAGE_RATE constant is 0.05', () => {
        expect(FACILITY_COMBAT_DAMAGE_RATE).toBe(0.05);
    });
});

describe('updateSupplyReserves — disabled gate', () => {
    it('reports no siege drain channel (retired 2026-11-17)', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });
        for (const entry of report.factions) {
            expect(entry).not.toHaveProperty('siege_drain_general');
            expect(entry).not.toHaveProperty('siege_drain_heavy');
        }
    });
});

describe('updateSupplyReserves — determinism', () => {
    it('produces identical results on identical input', () => {
        const makeState = () => makeMinimalState({
  factions: [
                { id: 'RBiH', supply_sources: [], patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 } },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any,
  military: {
    formations: {
                'b1': { id: 'b1', faction: 'RBiH', personnel: 1000 } as any,
                'b2': { id: 'b2', faction: 'RS', personnel: 1000 } as any,
            },
    siege_turn_counters: { 'RBiH:op:srebrenica:center': 3 },
  } as any,
});

        const state1 = makeState();
        const state2 = makeState();
        ensureSupplyReserves(state1);
        ensureSupplyReserves(state2);
        const prod = { RBiH: 5, RS: 3, HRHB: 1 };
        const report1 = updateSupplyReserves(state1, prod);
        const report2 = updateSupplyReserves(state2, prod);

        expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
        expect(state1.military.general_supply_reserve).toEqual(state2.military.general_supply_reserve);
        expect(state1.military.heavy_munitions_reserve).toEqual(state2.military.heavy_munitions_reserve);
    });
});

describe('updateSupplyReserves — combined update', () => {
    it('combines maintenance, production, patron, and embargo', () => {
        const state = makeMinimalState({
  factions: [
                {
                    id: 'RBiH', supply_sources: [],
                    patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 },
                    embargo_profile: { heavy_equipment_access: 0, ammunition_resupply_rate: 0.8, maintenance_capacity: 0, smuggling_efficiency: 0.1, external_pipeline_status: 0.6 }
                },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any,
  military: {
    formations: {
                'b1': { id: 'b1', faction: 'RBiH', personnel: 1000 } as any,
            },
    siege_turn_counters: { 'RBiH:op:srebrenica:center': 2 },
  } as any,
});
        ensureSupplyReserves(state);
        const prevGeneral = state.military.general_supply_reserve!['RBiH']!;
        const report = updateSupplyReserves(state, { RBiH: 5, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;

        // Verify all channels are populated
        expect(rbihEntry.maintenance_drain).toBeGreaterThan(0);
        expect(rbihEntry.production_income_general).toBeGreaterThan(0);
        expect(rbihEntry.patron_aid_general).toBeGreaterThan(0);
        expect(rbihEntry.embargo_factor_general).toBeLessThan(1.0);
        expect(rbihEntry.embargo_factor_general).toBeGreaterThan(0);
    });
});
