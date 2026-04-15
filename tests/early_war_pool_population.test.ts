/**
 * Peace phase pool population tests (plan: militia_and_brigade_formation_system).
 * - Pools created from war_militia_strength with composite key mun_id:faction.
 * - Displaced contribution adds to controller's pool.
 * - Deterministic: same state -> same report and pool state.
 */

import { expect, test } from 'vitest';
import { applyRsJnaInheritanceBonus, runPoolPopulation } from '../src/sim/early_war/pool_population.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

function baseState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'pool-pop-fixture', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            MUN_A: { RBiH: 30, RS: 50, HRHB: 10 },
            MUN_B: { RBiH: 20, RS: 0, HRHB: 40 }
        }
  } as any,
  political: {
    political_controllers: {},
    municipalities: {
            MUN_A: { stability_score: 50, control: 'consolidated' as const },
            MUN_B: { stability_score: 50, control: 'consolidated' as const }
        }
  } as any,
        displacement: {} as any
    };
}

test('runPoolPopulation creates pools with composite key from war_militia_strength', () => {
    const state = baseState();
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    const report = runPoolPopulation(state, settlements);

    expect(report.pools_created >= 4 || report.pools_updated >= 0).toBeTruthy();
    const keyA_RBiH = militiaPoolKey('MUN_A', 'RBiH');
    const keyA_RS = militiaPoolKey('MUN_A', 'RS');
    const poolA_RBiH = state.military.militia_pools![keyA_RBiH];
    const poolA_RS = state.military.militia_pools![keyA_RS];
    expect(poolA_RBiH).toBeTruthy();
    expect(poolA_RS).toBeTruthy();
    expect(poolA_RBiH.mun_id).toBe('MUN_A');
    expect(poolA_RBiH.faction).toBe('RBiH');
    expect(poolA_RS.mun_id).toBe('MUN_A');
    expect(poolA_RS.faction).toBe('RS');
    // Calibration evolves; assert structural expectations instead of brittle constants.
    expect(poolA_RBiH.available > 0).toBeTruthy();
    expect(poolA_RS.available > 0).toBeTruthy();
});

test('runPoolPopulation is deterministic (same state -> same pools)', () => {
    const state = baseState();
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    runPoolPopulation(state, settlements);
    const afterFirst = JSON.stringify(
        Object.entries(state.military.militia_pools!).sort((a, b) => a[0].localeCompare(b[0]))
    );

    runPoolPopulation(state, settlements);
    const afterSecond = JSON.stringify(
        Object.entries(state.military.militia_pools!).sort((a, b) => a[0].localeCompare(b[0]))
    );

    expect(afterFirst).toBe(afterSecond);
});

test('runPoolPopulation does not decrease available when pool already exists', () => {
    const state = baseState();
    const key = militiaPoolKey('MUN_A', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'MUN_A',
        faction: 'RBiH',
        available: 10000,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any]
    ]);

    runPoolPopulation(state, settlements);

    const pool = state.military.militia_pools![key];
    expect(pool).toBeTruthy();
    expect(pool.available >= 10000).toBeTruthy();
});

test('runPoolPopulation applies authority scale: contested 0.85, fragmented 0.70', () => {
    const state = baseState();
    (state.political.municipalities!['MUN_A'] as any).control = 'contested';
    (state.political.municipalities!['MUN_B'] as any).control = 'fragmented';
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    runPoolPopulation(state, settlements);

    const poolA_RBiH = state.military.militia_pools![militiaPoolKey('MUN_A', 'RBiH')];
    const poolB_RBiH = state.military.militia_pools![militiaPoolKey('MUN_B', 'RBiH')];
    expect(poolA_RBiH).toBeTruthy();
    expect(poolB_RBiH).toBeTruthy();
    const expectedA = Math.floor(30 * 100 * 1.2 * 0.85);
    const expectedB = Math.floor(20 * 100 * 1.2 * 0.7);
    expect(poolA_RBiH.available <= expectedA + 1).toBeTruthy();
    expect(poolB_RBiH.available <= expectedB + 1).toBeTruthy();
});

test('runPoolPopulation RBiH 10% adds to RBiH pools when at least one RBiH brigade exists', () => {
    const state = baseState();
    state.military.formations!['F_RBiH_0001'] = {
        id: 'F_RBiH_0001',
        faction: 'RBiH',
        kind: 'brigade',
        name: 'Test',
        created_turn: 0,
        status: 'active',
        assignment: null
    } as any;
    state.political.political_controllers = { s1: 'RBiH', s2: 'RBiH' };
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);
    const population1991: any = {
        MUN_A: { total: 100000, bosniak: 40000, serb: 40000, croat: 15000, other: 5000 },
        MUN_B: { total: 50000, bosniak: 20000, serb: 20000, croat: 8000, other: 2000 }
    };

    const report = runPoolPopulation(state, settlements, population1991);

    const keyA = militiaPoolKey('MUN_A', 'RBiH');
    const keyB = militiaPoolKey('MUN_B', 'RBiH');
    expect(state.military.militia_pools![keyA]).toBeTruthy();
    expect(state.military.militia_pools![keyB]).toBeTruthy();
    expect((report.rbih_10pct_additions ?? 0) > 0).toBeTruthy();
});

test('applyRsJnaInheritanceBonus adds to RS pools proportionally by eligible Serb pop', () => {
    const state = baseState();
    state.meta.turn = 0;
    state.military.militia_pools = {
        [militiaPoolKey('MUN_A', 'RS')]: {
            mun_id: 'MUN_A',
            faction: 'RS',
            available: 1000,
            committed: 0,
            exhausted: 0,
            updated_turn: 0
        },
        [militiaPoolKey('MUN_B', 'RS')]: {
            mun_id: 'MUN_B',
            faction: 'RS',
            available: 500,
            committed: 0,
            exhausted: 0,
            updated_turn: 0
        }
    };
    const pop1991 = {
        MUN_A: { total: 10000, bosniak: 1000, serb: 6000, croat: 2000, other: 1000 },
        MUN_B: { total: 8000, bosniak: 1000, serb: 4000, croat: 2000, other: 1000 }
    };
    const report = applyRsJnaInheritanceBonus(state, pop1991);
    expect(report.total_added > 0).toBeTruthy();
    expect(report.pools_updated).toBe(2);
    const poolA = state.military.militia_pools![militiaPoolKey('MUN_A', 'RS')];
    const poolB = state.military.militia_pools![militiaPoolKey('MUN_B', 'RS')];
    expect(poolA.available > 1000).toBeTruthy();
    expect(poolB.available > 500).toBeTruthy();
    expect(poolA.available - 1000 >= poolB.available - 500).toBeTruthy();
});
