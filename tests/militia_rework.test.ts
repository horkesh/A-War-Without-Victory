/**
 * Militia/brigade rework tests (MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN).
 * - Spawn at 800 (MIN_BRIGADE_SPAWN); new brigade has personnel 800.
 * - Fragmented mun never spawns.
 * - Minority decay runs only in first 3 turns of Phase I and reduces pool.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { spawnFormationsFromPools, reinforceBrigadesFromPools } from '../src/sim/formation_spawn.js';
import { runMinorityMilitiaDecay } from '../src/sim/phase_i/minority_militia_decay.js';
import { MIN_BRIGADE_SPAWN } from '../src/state/formation_constants.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function baseState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 10, seed: 'rework-fixture', phase: 'phase_i' },
    factions: [
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: {},
    municipalities: {}
  };
}

test('spawn at 800: pool with 800 available spawns one brigade with personnel 800', () => {
  const state = baseState();
  state.formation_spawn_directive = { kind: 'brigade' };
  const key = militiaPoolKey('MUN_X', 'RBiH');
  state.militia_pools![key] = {
    mun_id: 'MUN_X',
    faction: 'RBiH',
    available: 800,
    committed: 0,
    exhausted: 0,
    updated_turn: 10
  };
  state.municipalities!['MUN_X'] = { control: 'consolidated' };

  const report = spawnFormationsFromPools(state, {
    batchSize: null,
    factionFilter: null,
    munFilter: null,
    maxPerMun: null,
    customTags: [],
    applyChanges: true,
    formationKind: 'brigade'
  });

  assert.strictEqual(report.formations_created, 1);
  const formation = Object.values(state.formations!)[0] as any;
  assert.ok(formation);
  assert.strictEqual(formation.personnel, MIN_BRIGADE_SPAWN);
  assert.strictEqual(formation.faction, 'RBiH');
});

test('fragmented mun never spawns', () => {
  const state = baseState();
  state.formation_spawn_directive = { kind: 'brigade' };
  const key = militiaPoolKey('MUN_FRAG', 'RS');
  state.militia_pools![key] = {
    mun_id: 'MUN_FRAG',
    faction: 'RS',
    available: 5000,
    committed: 0,
    exhausted: 0,
    updated_turn: 10
  };
  state.municipalities!['MUN_FRAG'] = { control: 'fragmented' };

  const report = spawnFormationsFromPools(state, {
    batchSize: null,
    factionFilter: null,
    munFilter: null,
    maxPerMun: null,
    customTags: [],
    applyChanges: true,
    formationKind: 'brigade'
  });

  assert.strictEqual(report.formations_created, 0, 'fragmented mun must not spawn');
});

test('minority decay runs only in first 3 turns of Phase I and reduces pool', () => {
  const state = baseState();
  state.meta.phase = 'phase_i';
  state.meta.war_start_turn = 10;
  state.meta.turn = 10;
  state.political_controllers = { s1: 'RS', s2: 'RS' };
  const key = militiaPoolKey('MUN_NONURBAN', 'RBiH');
  state.militia_pools![key] = {
    mun_id: 'MUN_NONURBAN',
    faction: 'RBiH',
    available: 1000,
    committed: 0,
    exhausted: 0,
    updated_turn: 10
  };
  state.municipalities!['MUN_NONURBAN'] = { control: 'consolidated' };
  const settlements = new Map([
    ['s1', { sid: 's1', mun1990_id: 'MUN_NONURBAN', mun_code: 'MUN_NONURBAN' } as any],
    ['s2', { sid: 's2', mun1990_id: 'MUN_NONURBAN', mun_code: 'MUN_NONURBAN' } as any]
  ]);
  const population1991 = {
    MUN_NONURBAN: { total: 10000, bosniak: 2000, serb: 6000, croat: 1500, other: 500 }
  };

  const report = runMinorityMilitiaDecay(state, settlements, population1991);

  assert.ok(report.pools_affected >= 1);
  assert.ok(report.manpower_removed > 0);
  assert.ok(state.militia_pools![key].available < 1000);
});

test('minority decay does not run outside first 3 turns of Phase I', () => {
  const state = baseState();
  state.meta.phase = 'phase_i';
  state.meta.war_start_turn = 10;
  state.meta.turn = 14;
  state.political_controllers = { s1: 'RS' };
  const key = militiaPoolKey('MUN_X', 'RBiH');
  state.militia_pools![key] = {
    mun_id: 'MUN_X',
    faction: 'RBiH',
    available: 1000,
    committed: 0,
    exhausted: 0,
    updated_turn: 14
  };
  state.municipalities!['MUN_X'] = { control: 'consolidated' };
  const settlements = new Map([['s1', { sid: 's1', mun1990_id: 'MUN_X', mun_code: 'MUN_X' } as any]]);

  const report = runMinorityMilitiaDecay(state, settlements);

  assert.strictEqual(report.pools_affected, 0);
  assert.strictEqual(report.manpower_removed, 0);
  assert.strictEqual(state.militia_pools![key].available, 1000);
});

test('reinforce uses MIN_BRIGADE_SPAWN (800) when personnel absent', () => {
  const state = baseState();
  state.formations!['F1'] = {
    id: 'F1',
    faction: 'RBiH',
    name: 'Test',
    created_turn: 0,
    status: 'active',
    assignment: null,
    kind: 'brigade',
    tags: ['mun:MUN_Z']
  } as any;
  state.militia_pools![militiaPoolKey('MUN_Z', 'RBiH')] = {
    mun_id: 'MUN_Z',
    faction: 'RBiH',
    available: 2000,
    committed: 0,
    exhausted: 0,
    updated_turn: 10
  };

  reinforceBrigadesFromPools(state);

  const f = state.formations!['F1'] as any;
  assert.ok(f.personnel !== undefined);
  assert.ok(f.personnel >= MIN_BRIGADE_SPAWN && f.personnel <= 2500);
});
