/**
 * Phase C Step 8: JNA transition tests.
 * - JNA starts when RS is declared (Phase I already gated); does not start the war.
 * - Withdrawal and asset transfer advance 0.05 per turn; completion at ≥0.95 / ≥0.90.
 * - Report appears in Phase I runTurn.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runJNATransition } from '../src/sim/phase_i/jna_transition.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { runTurn } from '../src/sim/turn_pipeline.js';

function statePhaseIWithRSDeclared(overrides?: { phase_i_jna?: { transition_begun: boolean; withdrawal_progress: number; asset_transfer_rs: number } }): GameState {
  const s: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'jna-fixture',
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
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: {
      MUN_A: { RBiH: 30, RS: 60, HRHB: 10 },
      MUN_B: { RBiH: 25, RS: 70, HRHB: 5 }
    }
  };
  if (overrides?.phase_i_jna !== undefined) {
    s.phase_i_jna = overrides.phase_i_jna;
  }
  return s;
}

test('runJNATransition starts JNA when RS declared and not yet begun', () => {
  const state = statePhaseIWithRSDeclared();
  const report = runJNATransition(state);
  assert.strictEqual(report.started, true);
  assert.strictEqual(state.phase_i_jna!.transition_begun, true);
  assert.strictEqual(report.withdrawal_after, 0.05);
  assert.strictEqual(report.asset_transfer_after, 0.05);
  assert.strictEqual(report.completed, false);
});

test('runJNATransition does not start when RS not declared', () => {
  const state = statePhaseIWithRSDeclared();
  state.factions!.find((f) => f.id === 'RS')!.declared = false;
  const report = runJNATransition(state);
  assert.strictEqual(report.started, false);
  assert.strictEqual(state.phase_i_jna!.transition_begun, false);
  assert.strictEqual(report.withdrawal_after, 0);
  assert.strictEqual(report.asset_transfer_after, 0);
});

test('runJNATransition advances 0.05 per turn when already begun', () => {
  const state = statePhaseIWithRSDeclared({
    phase_i_jna: { transition_begun: true, withdrawal_progress: 0.1, asset_transfer_rs: 0.15 }
  });
  const report = runJNATransition(state);
  assert.strictEqual(report.started, false);
  assert.strictEqual(report.withdrawal_before, 0.1);
  assert.strictEqual(report.withdrawal_after, 0.15);
  assert.strictEqual(report.asset_transfer_before, 0.15);
  assert.strictEqual(report.asset_transfer_after, 0.2);
  assert.strictEqual(report.completed, false);
});

test('runJNATransition caps withdrawal and asset at 1', () => {
  const state = statePhaseIWithRSDeclared({
    phase_i_jna: { transition_begun: true, withdrawal_progress: 0.98, asset_transfer_rs: 0.99 }
  });
  const report = runJNATransition(state);
  assert.strictEqual(report.withdrawal_after, 1);
  assert.strictEqual(report.asset_transfer_after, 1);
  assert.strictEqual(report.completed, true);
});

test('runJNATransition reports completed when withdrawal ≥ 0.95 and asset ≥ 0.9', () => {
  const state = statePhaseIWithRSDeclared({
    phase_i_jna: { transition_begun: true, withdrawal_progress: 0.95, asset_transfer_rs: 0.9 }
  });
  const report = runJNATransition(state);
  assert.strictEqual(report.completed, true);
  assert.strictEqual(report.withdrawal_after, 1);
  assert.strictEqual(report.asset_transfer_after, 0.95);
});

test('Phase I runTurn includes phase_i_jna_transition in report', async () => {
  const state = statePhaseIWithRSDeclared();
  const { report } = await runTurn(state, { seed: 'jna-fixture' });
  assert.ok('phase_i_jna_transition' in report);
  assert.strictEqual(report.phases.some((p) => p.name === 'phase-i-jna-transition'), true);
  assert.strictEqual(report.phase_i_jna_transition!.started, true);
});
