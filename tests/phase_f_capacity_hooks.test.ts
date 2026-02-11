/**
 * Phase F Step 5: Capacity consequences (read-only hooks) tests.
 * - Hooks return [0, 1] capacity factors; deterministic.
 * - No control flips (hooks do not touch political_controllers).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
  getMunicipalityDisplacementFactor,
  getSettlementDisplacementFactor,
  buildDisplacementCapacityReport
} from '../src/sim/phase_f/displacement_capacity_hooks.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 25,
      seed: 'pf-cap',
      phase: 'phase_ii',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RBiH', S2: 'RS' },
    settlement_displacement: { S1: 0.2, S2: 0.5 },
    municipality_displacement: { MUN_A: 0.3 }
  };
}

test('getMunicipalityDisplacementFactor returns 1 - displacement in [0, 1]', () => {
  const state = minimalPhaseIIState();
  assert.strictEqual(getMunicipalityDisplacementFactor(state, 'MUN_A'), 0.7);
  assert.strictEqual(getMunicipalityDisplacementFactor(state, 'MUN_ABSENT'), 1);
});

test('getSettlementDisplacementFactor returns 1 - displacement in [0, 1]', () => {
  const state = minimalPhaseIIState();
  assert.strictEqual(getSettlementDisplacementFactor(state, 'S1'), 0.8);
  assert.strictEqual(getSettlementDisplacementFactor(state, 'S2'), 0.5);
  assert.strictEqual(getSettlementDisplacementFactor(state, 'S_ABSENT'), 1);
});

test('buildDisplacementCapacityReport: deterministic and no control flips', () => {
  const state = minimalPhaseIIState();
  const report = buildDisplacementCapacityReport(state);
  assert.ok(report.municipalities_affected.includes('MUN_A'));
  assert.ok(report.settlements_affected.includes('S1') && report.settlements_affected.includes('S2'));
  assert.strictEqual(report.municipality_factors['MUN_A'], 0.7);
  assert.deepStrictEqual(state.political_controllers, { S1: 'RBiH', S2: 'RS' });
});

test('hooks return 1 when phase !== phase_ii', () => {
  const state = minimalPhaseIIState();
  state.meta!.phase = 'phase_i';
  assert.strictEqual(getMunicipalityDisplacementFactor(state, 'MUN_A'), 1);
  assert.strictEqual(getSettlementDisplacementFactor(state, 'S1'), 1);
});
