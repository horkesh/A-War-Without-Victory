import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyPhase0Directives } from '../src/desktop/desktop_sim.js';
import { runPhase0TurnAndAdvance } from '../src/ui/warroom/run_phase0_turn.js';
import { updateMilitiaEmergence } from '../src/sim/phase_i/militia_emergence.js';
import { runPoolPopulation } from '../src/sim/phase_i/pool_population.js';
import { spawnFormationsFromPools } from '../src/sim/formation_spawn.js';
import type { SettlementRecord } from '../src/map/settlements.js';

function makePhase0State(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 0,
      seed: 'phase0-iv1-seed',
      phase: 'phase_0',
      referendum_held: true,
      referendum_turn: 0,
      war_start_turn: 0,
      player_faction: 'RBiH',
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        command_capacity: 0,
        negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
        declaration_pressure: 0,
        declared: false,
        declaration_turn: null,
        prewar_capital: 70,
      },
      {
        id: 'RS',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        command_capacity: 0,
        negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
        declaration_pressure: 0,
        declared: true,
        declaration_turn: 0,
        prewar_capital: 100,
      },
      {
        id: 'HRHB',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        command_capacity: 0,
        negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
        declaration_pressure: 0,
        declared: true,
        declaration_turn: 0,
        prewar_capital: 40,
      },
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    municipalities: {
      TEST_MUN: {
        stability_score: 50,
        control: 'contested',
        organizational_penetration: {},
      },
    },
    political_controllers: {
      SID_TEST_1: 'RBiH',
    },
    phase_i_militia_strength: {},
    formation_spawn_directive: { kind: 'both' },
  };
}

function runToSpawn(state: GameState): { poolAvailable: number; spawned: number } {
  const transitioned = runPhase0TurnAndAdvance(state, state.meta.seed ?? 'phase0-iv1-seed', 'RBiH');
  assert.strictEqual(transitioned.meta.phase, 'phase_i', 'state should transition to phase_i');
  updateMilitiaEmergence(transitioned);
  const settlements = new Map<string, SettlementRecord>([
    ['SID_TEST_1', { mun_code: 'TEST_MUN', mun1990_id: 'TEST_MUN' } as SettlementRecord]
  ]);
  runPoolPopulation(transitioned, settlements);
  const poolKey = 'TEST_MUN:RBiH';
  const poolAvailable = transitioned.militia_pools?.[poolKey]?.available ?? 0;
  const spawnReport = spawnFormationsFromPools(transitioned, {
    batchSize: 1000,
    factionFilter: 'RBiH',
    munFilter: 'TEST_MUN',
    maxPerMun: 1,
    customTags: [],
    applyChanges: true,
    formationKind: 'brigade',
    municipalityHqSettlement: null,
    historicalNameLookup: null,
    historicalHqLookup: null,
    population1991ByMun: null,
  });
  return { poolAvailable, spawned: spawnReport.formations_created };
}

test('Phase 0 investment deterministically changes Phase I brigade availability', () => {
  const baselineState = makePhase0State();
  const investedState = makePhase0State();

  const applied = applyPhase0Directives(investedState, [
    {
      id: 'iv1-00',
      factionId: 'RBiH',
      investmentType: 'police',
      scope: { kind: 'municipality', mun_ids: ['TEST_MUN'] },
      targetMunIds: ['TEST_MUN'],
      coordinated: true,
    },
    {
      id: 'iv1-01',
      factionId: 'RBiH',
      investmentType: 'party',
      scope: { kind: 'municipality', mun_ids: ['TEST_MUN'] },
      targetMunIds: ['TEST_MUN'],
      coordinated: true,
    }
  ]);
  assert.strictEqual(applied, 2);

  const baseline = runToSpawn(baselineState);
  const invested = runToSpawn(investedState);

  assert.ok(invested.poolAvailable > baseline.poolAvailable, 'investment should increase pool availability');
  assert.ok(invested.spawned >= baseline.spawned, 'investment should not reduce spawn availability');
});

test('Coordinated directives update alliance state deterministically', () => {
  const stateA = makePhase0State();
  const stateB = makePhase0State();
  const directives = [
    {
      id: 'a-1',
      factionId: 'RBiH' as const,
      investmentType: 'party' as const,
      scope: { kind: 'municipality' as const, mun_ids: ['TEST_MUN'] },
      targetMunIds: ['TEST_MUN'],
      coordinated: true,
    },
    {
      id: 'a-2',
      factionId: 'RS' as const,
      investmentType: 'party' as const,
      scope: { kind: 'municipality' as const, mun_ids: ['TEST_MUN'] },
      targetMunIds: ['TEST_MUN'],
      coordinated: false,
    },
  ];
  applyPhase0Directives(stateA, directives);
  applyPhase0Directives(stateB, directives);
  assert.deepStrictEqual(stateA.phase0_relationships, stateB.phase0_relationships);
  assert.ok((stateA.phase0_relationships?.rbih_hrhb ?? 0) > 0.5);
  assert.ok((stateA.phase0_relationships?.rbih_rs ?? 0) < -0.2);
});

