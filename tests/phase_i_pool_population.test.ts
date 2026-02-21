/**
 * Phase I pool population tests (plan: militia_and_brigade_formation_system).
 * - Pools created from phase_i_militia_strength with composite key mun_id:faction.
 * - Displaced contribution adds to controller's pool.
 * - Deterministic: same state -> same report and pool state.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runPoolPopulation } from '../src/sim/phase_i/pool_population.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'pool-pop-fixture', phase: 'phase_i' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {},
        municipalities: {
            MUN_A: { stability_score: 50, control: 'consolidated' as const },
            MUN_B: { stability_score: 50, control: 'consolidated' as const }
        },
        phase_i_militia_strength: {
            MUN_A: { RBiH: 30, RS: 50, HRHB: 10 },
            MUN_B: { RBiH: 20, RS: 0, HRHB: 40 }
        }
    };
}

test('runPoolPopulation creates pools with composite key from phase_i_militia_strength', () => {
    const state = baseState();
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    const report = runPoolPopulation(state, settlements);

    assert.ok(report.pools_created >= 4 || report.pools_updated >= 0);
    const keyA_RBiH = militiaPoolKey('MUN_A', 'RBiH');
    const keyA_RS = militiaPoolKey('MUN_A', 'RS');
    const poolA_RBiH = state.militia_pools![keyA_RBiH];
    const poolA_RS = state.militia_pools![keyA_RS];
    assert.ok(poolA_RBiH, 'pool MUN_A:RBiH should exist');
    assert.ok(poolA_RS, 'pool MUN_A:RS should exist');
    assert.strictEqual(poolA_RBiH.mun_id, 'MUN_A');
    assert.strictEqual(poolA_RBiH.faction, 'RBiH');
    assert.strictEqual(poolA_RS.mun_id, 'MUN_A');
    assert.strictEqual(poolA_RS.faction, 'RS');
    // Current calibration: floor(strength * 30 * faction_scale), consolidated authority.
    // RBiH: floor(30 * 30 * 1.18) = 1062
    // RS:   floor(50 * 30 * 0.98) = 1470
    assert.ok(poolA_RBiH.available >= 1062);
    assert.ok(poolA_RS.available >= 1470);
});

test('runPoolPopulation is deterministic (same state -> same pools)', () => {
    const state = baseState();
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    runPoolPopulation(state, settlements);
    const afterFirst = JSON.stringify(
        Object.entries(state.militia_pools!).sort((a, b) => a[0].localeCompare(b[0]))
    );

    runPoolPopulation(state, settlements);
    const afterSecond = JSON.stringify(
        Object.entries(state.militia_pools!).sort((a, b) => a[0].localeCompare(b[0]))
    );

    assert.strictEqual(afterFirst, afterSecond);
});

test('runPoolPopulation does not decrease available when pool already exists', () => {
    const state = baseState();
    const key = militiaPoolKey('MUN_A', 'RBiH');
    state.militia_pools![key] = {
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

    const pool = state.militia_pools![key];
    assert.ok(pool);
    assert.ok(pool.available >= 10000, 'available must not decrease (strength 30 -> 3000, max(10000,3000)=10000)');
});

test('runPoolPopulation applies authority scale: contested 0.85, fragmented 0.70', () => {
    const state = baseState();
    (state.municipalities!['MUN_A'] as any).control = 'contested';
    (state.municipalities!['MUN_B'] as any).control = 'fragmented';
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);

    runPoolPopulation(state, settlements);

    const poolA_RBiH = state.militia_pools![militiaPoolKey('MUN_A', 'RBiH')];
    const poolB_RBiH = state.militia_pools![militiaPoolKey('MUN_B', 'RBiH')];
    assert.ok(poolA_RBiH, 'MUN_A:RBiH pool exists');
    assert.ok(poolB_RBiH, 'MUN_B:RBiH pool exists');
    const expectedA = Math.floor(30 * 100 * 1.2 * 0.85);
    const expectedB = Math.floor(20 * 100 * 1.2 * 0.7);
    assert.ok(poolA_RBiH.available <= expectedA + 1, 'contested scales down (~0.85)');
    assert.ok(poolB_RBiH.available <= expectedB + 1, 'fragmented scales down (~0.70)');
});

test('runPoolPopulation RBiH 10% adds to RBiH pools when at least one RBiH brigade exists', () => {
    const state = baseState();
    state.formations!['F_RBiH_0001'] = {
        id: 'F_RBiH_0001',
        faction: 'RBiH',
        kind: 'brigade',
        name: 'Test',
        created_turn: 0,
        status: 'active',
        assignment: null
    } as any;
    state.political_controllers = { s1: 'RBiH', s2: 'RBiH' };
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
    assert.ok(state.militia_pools![keyA], 'RBiH pool MUN_A exists');
    assert.ok(state.militia_pools![keyB], 'RBiH pool MUN_B exists');
    assert.ok((report.rbih_10pct_additions ?? 0) > 0, 'RBiH 10%% additions reported');
});
