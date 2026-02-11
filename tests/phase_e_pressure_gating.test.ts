/**
 * Phase E1.1: Phase E pressure update gating tests.
 * - Calling sim pipeline in phase_i does not run Phase E pressure update (no phase_e_pressure_update effect).
 * - Calling in phase_ii runs exactly one phase-e-pressure-update per turn and report is present when edges exist.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function minimalPhaseIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'gating-i',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
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
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } }
  };
}

function minimalPhaseIIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 20,
      seed: 'gating-ii',
      phase: 'phase_ii',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RBiH', S2: 'RS' }
  };
}

test('phase_i runTurn does not run phase-e-pressure-update (Phase I path has no Phase E)', async () => {
  const state = minimalPhaseIState();
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];
  const { report } = await runTurn(state, { seed: 'gating-i', settlementEdges: edges });
  const phaseNames = report.phases.map((p) => p.name);
  assert.ok(!phaseNames.includes('phase-e-pressure-update'), 'Phase I path must not include phase-e-pressure-update');
  assert.strictEqual(report.phase_e_pressure_update, undefined);
});

test('phase_ii runTurn includes phase-e-pressure-update and runs exactly once per turn', async () => {
  const state = minimalPhaseIIState();
  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const { report } = await runTurn(state, { seed: 'gating-ii', settlementEdges: edges });
  const phaseNames = report.phases.map((p) => p.name);
  const count = phaseNames.filter((n) => n === 'phase-e-pressure-update').length;
  assert.strictEqual(count, 1, 'phase-e-pressure-update must run exactly once per turn in phase_ii path');
  assert.ok(report.phase_e_pressure_update !== undefined, 'phase_e_pressure_update report should be present');
  assert.strictEqual(typeof report.phase_e_pressure_update.applied, 'boolean');
  assert.strictEqual(typeof report.phase_e_pressure_update.stats.nodes_with_outflow, 'number');
});
