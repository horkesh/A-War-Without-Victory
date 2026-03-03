import { describe, it, expect } from 'vitest';
import {
    updateSiegeTurnCounters,
    updateSupplyReserves,
    ensureSupplyReserves,
} from '../src/state/supply_reserves.js';
import type { GameState } from '../src/state/game_state.js';
import {
    SIEGE_BASE_RATE,
    SIEGE_ESCALATION_RATE,
    MAX_SIEGE_PRESSURE_RATE,
    SIEGE_MIN_POCKET_SIZE,
    PATRON_AID_SCALE,
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
        formations: {},
        settlements: [],
        municipalities: {},
        political_controllers: {},
        ...overrides
    } as unknown as GameState;
}

describe('updateSiegeTurnCounters', () => {
    it('increments counter for critical OSID', () => {
        const state = makeMinimalState();
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:srebrenica:center', state: 'critical' as const },
                    { osid: 'op:tuzla:center', state: 'adequate' as const },
                ]
            }]
        };
        const report = updateSiegeTurnCounters(state, supply);
        expect(state.siege_turn_counters!['RBiH:op:srebrenica:center']).toBe(1);
        expect(state.siege_turn_counters!['RBiH:op:tuzla:center']).toBeUndefined();
        expect(report.active_sieges).toBe(1);
    });

    it('accumulates counter over multiple turns', () => {
        const state = makeMinimalState({
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 3 }
        });
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RBiH',
                by_osid: [{ osid: 'op:srebrenica:center', state: 'critical' as const }]
            }]
        };
        updateSiegeTurnCounters(state, supply);
        expect(state.siege_turn_counters!['RBiH:op:srebrenica:center']).toBe(4);
    });

    it('resets counter when no longer critical', () => {
        const state = makeMinimalState({
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 5 }
        });
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RBiH',
                by_osid: [{ osid: 'op:srebrenica:center', state: 'adequate' as const }]
            }]
        };
        const report = updateSiegeTurnCounters(state, supply);
        expect(state.siege_turn_counters!['RBiH:op:srebrenica:center']).toBeUndefined();
        expect(report.counters_reset).toBe(1);
    });
});

describe('updateSiegeTurnCounters — pocket-size threshold', () => {
    /** Build a linear chain adjacency: A1—A2—A3—...—An */
    function makeChainAdjacency(osids: string[]): Map<string, string[]> {
        const adj = new Map<string, string[]>();
        for (let i = 0; i < osids.length; i++) {
            const neighbors: string[] = [];
            if (i > 0) neighbors.push(osids[i - 1]);
            if (i < osids.length - 1) neighbors.push(osids[i + 1]);
            adj.set(osids[i], neighbors);
        }
        return adj;
    }

    it('freezes counter at 1 for small pockets (below SIEGE_MIN_POCKET_SIZE)', () => {
        // 2 connected critical OSIDs — below threshold of 5
        const state = makeMinimalState({
            siege_turn_counters: { 'RBiH:op:a:1': 10, 'RBiH:op:a:2': 10 }
        });
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:a:1', state: 'critical' as const },
                    { osid: 'op:a:2', state: 'critical' as const },
                ]
            }]
        };
        const adjacency = makeChainAdjacency(['op:a:1', 'op:a:2']);
        updateSiegeTurnCounters(state, supply, adjacency);
        // Counter frozen at 1 (was 10, now reset to 1)
        expect(state.siege_turn_counters!['RBiH:op:a:1']).toBe(1);
        expect(state.siege_turn_counters!['RBiH:op:a:2']).toBe(1);
    });

    it('escalates normally for large pockets (at or above SIEGE_MIN_POCKET_SIZE)', () => {
        // Build a pocket of exactly SIEGE_MIN_POCKET_SIZE critical OSIDs
        const osids = Array.from({ length: SIEGE_MIN_POCKET_SIZE }, (_, i) => `op:siege:${i}`);
        const counters: Record<string, number> = {};
        for (const osid of osids) counters[`RBiH:${osid}`] = 5;

        const state = makeMinimalState({ siege_turn_counters: counters });
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RBiH',
                by_osid: osids.map(osid => ({ osid, state: 'critical' as const }))
            }]
        };
        const adjacency = makeChainAdjacency(osids);
        updateSiegeTurnCounters(state, supply, adjacency);
        // Counter should increment normally (5 → 6)
        expect(state.siege_turn_counters![`RBiH:${osids[0]}`]).toBe(6);
    });

    it('handles mixed pockets: large escalate, small frozen', () => {
        // Large pocket (5 OSIDs) + singleton (1 OSID)
        const largeOsids = Array.from({ length: SIEGE_MIN_POCKET_SIZE }, (_, i) => `op:large:${i}`);
        const singleton = 'op:isolated:outpost';
        const counters: Record<string, number> = {};
        for (const osid of largeOsids) counters[`RS:${osid}`] = 3;
        counters[`RS:${singleton}`] = 8;

        const state = makeMinimalState({ siege_turn_counters: counters });
        const allOsids = [...largeOsids, singleton];
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RS',
                by_osid: allOsids.map(osid => ({ osid, state: 'critical' as const }))
            }]
        };
        // Large pocket is a connected chain; singleton has no neighbors in the critical set
        const adjacency = makeChainAdjacency(largeOsids);
        adjacency.set(singleton, []); // isolated

        updateSiegeTurnCounters(state, supply, adjacency);
        // Large pocket escalates: 3 → 4
        expect(state.siege_turn_counters![`RS:${largeOsids[0]}`]).toBe(4);
        // Singleton frozen at 1
        expect(state.siege_turn_counters![`RS:${singleton}`]).toBe(1);
    });

    it('backward compat: without adjacency, all OSIDs escalate', () => {
        const state = makeMinimalState({
            siege_turn_counters: { 'RS:op:outpost:1': 5 }
        });
        const supply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RS',
                by_osid: [{ osid: 'op:outpost:1', state: 'critical' as const }]
            }]
        };
        // No adjacency passed → all escalate
        updateSiegeTurnCounters(state, supply);
        expect(state.siege_turn_counters!['RS:op:outpost:1']).toBe(6);
    });

    it('SIEGE_MIN_POCKET_SIZE constant is 5', () => {
        expect(SIEGE_MIN_POCKET_SIZE).toBe(5);
    });
});

describe('updateSupplyReserves — siege drain', () => {
    it('drains reserves based on siege turn counters', () => {
        const state = makeMinimalState({
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 5 }
        });
        ensureSupplyReserves(state);
        const prevGeneral = state.general_supply_reserve!['RBiH']!;
        const prevHeavy = state.heavy_munitions_reserve!['RBiH']!;

        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });

        // Siege drain: min(MAX, BASE × (1 + ESC × counter))
        const drain = Math.min(MAX_SIEGE_PRESSURE_RATE, SIEGE_BASE_RATE * (1 + SIEGE_ESCALATION_RATE * 5));
        const expectedGeneralDrain = drain * 0.7;
        const expectedHeavyDrain = drain * 0.3;

        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;
        expect(rbihEntry.siege_drain_general).toBeCloseTo(expectedGeneralDrain, 5);
        expect(rbihEntry.siege_drain_heavy).toBeCloseTo(expectedHeavyDrain, 5);
        expect(state.general_supply_reserve!['RBiH']).toBeLessThan(prevGeneral);
    });

    it('caps siege drain at MAX_SIEGE_PRESSURE_RATE', () => {
        // Very high counter → should be capped
        const state = makeMinimalState({
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 1000 }
        });
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;
        const totalDrain = rbihEntry.siege_drain_general + rbihEntry.siege_drain_heavy;
        expect(totalDrain).toBeCloseTo(MAX_SIEGE_PRESSURE_RATE, 5);
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
        const expectedAid = 0.8 * PATRON_AID_SCALE;
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
    it('no siege drain when no siege_turn_counters', () => {
        const state = makeMinimalState();
        ensureSupplyReserves(state);
        const report = updateSupplyReserves(state, { RBiH: 0, RS: 0, HRHB: 0 });
        for (const entry of report.factions) {
            expect(entry.siege_drain_general).toBe(0);
            expect(entry.siege_drain_heavy).toBe(0);
        }
    });
});

describe('updateSupplyReserves — determinism', () => {
    it('produces identical results on identical input', () => {
        const makeState = () => makeMinimalState({
            formations: {
                'b1': { id: 'b1', faction: 'RBiH', personnel: 1000 } as any,
                'b2': { id: 'b2', faction: 'RS', personnel: 1000 } as any,
            },
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 3 },
            factions: [
                { id: 'RBiH', supply_sources: [], patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 } },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any
        });

        const state1 = makeState();
        const state2 = makeState();
        ensureSupplyReserves(state1);
        ensureSupplyReserves(state2);
        const prod = { RBiH: 5, RS: 3, HRHB: 1 };
        const report1 = updateSupplyReserves(state1, prod);
        const report2 = updateSupplyReserves(state2, prod);

        expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
        expect(state1.general_supply_reserve).toEqual(state2.general_supply_reserve);
        expect(state1.heavy_munitions_reserve).toEqual(state2.heavy_munitions_reserve);
    });
});

describe('updateSupplyReserves — combined update', () => {
    it('combines maintenance, production, siege, patron, and embargo', () => {
        const state = makeMinimalState({
            formations: {
                'b1': { id: 'b1', faction: 'RBiH', personnel: 1000 } as any,
            },
            siege_turn_counters: { 'RBiH:op:srebrenica:center': 2 },
            factions: [
                {
                    id: 'RBiH', supply_sources: [],
                    patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0, patron_commitment: 0, last_updated: 0 },
                    embargo_profile: { heavy_equipment_access: 0, ammunition_resupply_rate: 0.8, maintenance_capacity: 0, smuggling_efficiency: 0.1, external_pipeline_status: 0.6 }
                },
                { id: 'RS', supply_sources: [] },
                { id: 'HRHB', supply_sources: [] }
            ] as any
        });
        ensureSupplyReserves(state);
        const prevGeneral = state.general_supply_reserve!['RBiH']!;
        const report = updateSupplyReserves(state, { RBiH: 5, RS: 0, HRHB: 0 });
        const rbihEntry = report.factions.find(f => f.faction_id === 'RBiH')!;

        // Verify all channels are populated
        expect(rbihEntry.maintenance_drain).toBeGreaterThan(0);
        expect(rbihEntry.production_income_general).toBeGreaterThan(0);
        expect(rbihEntry.siege_drain_general).toBeGreaterThan(0);
        expect(rbihEntry.patron_aid_general).toBeGreaterThan(0);
        expect(rbihEntry.embargo_factor_general).toBeLessThan(1.0);
        expect(rbihEntry.embargo_factor_general).toBeGreaterThan(0);
    });
});
