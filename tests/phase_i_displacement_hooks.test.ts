/**
 * Phase C Step 7: Displacement initiation hooks tests.
 * - Deterministic hook creation when control flip report has flips and hostile share > 0.30 (stub).
 * - No modification to displacement_state or population totals.
 * - Same municipality not hooked twice (idempotent per mun).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runDisplacementHooks } from '../src/sim/phase_i/displacement_hooks.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { ControlFlipReport } from '../src/sim/phase_i/control_flip.js';

function stateWithPhaseI(overrides?: { phase_i_displacement_initiated?: Record<string, number> }): GameState {
  const s: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'disp-hooks-fixture',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 5
      },
      {
        id: 'HRHB',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: {
      MUN_A: { stability_score: 40 },
      MUN_B: { stability_score: 50 }
    },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: {
      MUN_A: { RBiH: 25, RS: 60, HRHB: 10 },
      MUN_B: { RBiH: 20, RS: 80, HRHB: 5 }
    }
  };
  if (overrides?.phase_i_displacement_initiated !== undefined) {
    s.phase_i_displacement_initiated = overrides.phase_i_displacement_initiated as Record<MunicipalityId, number>;
  }
  return s;
}

test('runDisplacementHooks with no flips returns empty report', () => {
  const state = stateWithPhaseI();
  const controlFlipReport: ControlFlipReport = { flips: [], municipalities_evaluated: 0, control_events: [] };
  const report = runDisplacementHooks(state, 10, controlFlipReport);
  assert.strictEqual(report.hooks_created, 0);
  assert.strictEqual(report.by_mun.length, 0);
  assert.strictEqual(state.phase_i_displacement_initiated === undefined, true);
});

test('runDisplacementHooks with flips creates hooks and report is deterministic by mun_id', () => {
  const state = stateWithPhaseI();
  const controlFlipReport: ControlFlipReport = {
    flips: [
      { mun_id: 'MUN_B' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' },
      { mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }
    ],
    municipalities_evaluated: 2,
    control_events: []
  };
  const report = runDisplacementHooks(state, 10, controlFlipReport);
  assert.strictEqual(report.hooks_created, 2);
  assert.strictEqual(report.by_mun.length, 2);
  assert.strictEqual(report.by_mun[0].mun_id, 'MUN_A');
  assert.strictEqual(report.by_mun[0].initiated_turn, 10);
  assert.strictEqual(report.by_mun[1].mun_id, 'MUN_B');
  assert.strictEqual(report.by_mun[1].initiated_turn, 10);
  assert.strictEqual(state.phase_i_displacement_initiated!['MUN_A'], 10);
  assert.strictEqual(state.phase_i_displacement_initiated!['MUN_B'], 10);
});

test('runDisplacementHooks does not modify displacement_state or population totals', () => {
  const state = stateWithPhaseI();
  state.displacement_state = {
    MUN_A: {
      mun_id: 'MUN_A' as MunicipalityId,
      original_population: 1000,
      displaced_out: 0,
      displaced_in: 0,
      lost_population: 0,
      last_updated_turn: 9
    }
  };
  const controlFlipReport: ControlFlipReport = {
    flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
    municipalities_evaluated: 1,
    control_events: []
  };
  runDisplacementHooks(state, 10, controlFlipReport);
  assert.ok(state.displacement_state !== undefined);
  assert.strictEqual(state.displacement_state!['MUN_A'].original_population, 1000);
  assert.strictEqual(state.displacement_state!['MUN_A'].displaced_out, 0);
  assert.strictEqual(state.displacement_state!['MUN_A'].displaced_in, 0);
  assert.strictEqual(state.displacement_state!['MUN_A'].lost_population, 0);
});

test('runDisplacementHooks does not create duplicate hook for same municipality', () => {
  const state = stateWithPhaseI({ phase_i_displacement_initiated: { MUN_A: 9 } });
  const controlFlipReport: ControlFlipReport = {
    flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
    municipalities_evaluated: 1,
    control_events: []
  };
  const report = runDisplacementHooks(state, 10, controlFlipReport);
  assert.strictEqual(report.hooks_created, 0);
  assert.strictEqual(report.by_mun.length, 0);
  assert.strictEqual(state.phase_i_displacement_initiated!['MUN_A'], 9);
});

test('Phase I runTurn includes phase_i_displacement_hooks in report', async () => {
  const state = stateWithPhaseI();
  const { report } = await runTurn(state, { seed: 'disp-hooks-fixture' });
  assert.ok('phase_i_displacement_hooks' in report);
  assert.strictEqual(report.phases.some((p) => p.name === 'phase-i-displacement-hooks'), true);
});
