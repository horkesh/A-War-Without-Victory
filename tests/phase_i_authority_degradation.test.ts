/**
 * Phase C Step 5: Authority degradation tests.
 * - Authority can degrade while control remains unchanged.
 * - Control can change without granting authority (control flip does not modify authority; Step 4).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runAuthorityDegradation } from '../src/sim/phase_i/authority_degradation.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { runTurn } from '../src/sim/turn_pipeline.js';

function stateWithDeclarations(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'authority-fixture',
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
        profile: { authority: 40, legitimacy: 40, control: 40, logistics: 40, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 5
      },
      {
        id: 'HRHB',
        profile: { authority: 35, legitimacy: 35, control: 35, logistics: 35, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 6
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
    phase_i_jna: { transition_begun: true, withdrawal_progress: 0.2, asset_transfer_rs: 0.15 }
  };
}

test('runAuthorityDegradation updates RBiH authority (decay from RS/HRHB declared and JNA)', () => {
  const state = stateWithDeclarations();
  const rbihBefore = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
  const report = runAuthorityDegradation(state);
  const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
  const change = report.changes.find((c) => c.faction_id === 'RBiH');
  assert.ok(change);
  assert.strictEqual(change!.authority_before, rbihBefore);
  assert.strictEqual(change!.authority_after, rbihAfter);
  assert.ok(rbihAfter !== rbihBefore, 'RBiH authority should change when RS/HRHB declared and JNA active');
});

test('RBiH authority does not fall below 20 (Phase I floor)', () => {
  const state = stateWithDeclarations();
  state.factions!.find((f) => f.id === 'RBiH')!.profile.authority = 22;
  for (let i = 0; i < 5; i++) runAuthorityDegradation(state);
  const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
  assert.ok(rbihAfter >= 20, `RBiH authority must be >= 20, got ${rbihAfter}`);
});

test('RS authority is capped at 85', () => {
  const state = stateWithDeclarations();
  state.factions!.find((f) => f.id === 'RS')!.profile.authority = 84;
  runAuthorityDegradation(state);
  const rsAfter = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
  assert.ok(rsAfter <= 85, `RS authority must be <= 85, got ${rsAfter}`);
});

test('HRHB authority is capped at 70', () => {
  const state = stateWithDeclarations();
  state.factions!.find((f) => f.id === 'HRHB')!.profile.authority = 69;
  runAuthorityDegradation(state);
  const hrhbAfter = state.factions!.find((f) => f.id === 'HRHB')!.profile.authority;
  assert.ok(hrhbAfter <= 70, `HRHB authority must be <= 70, got ${hrhbAfter}`);
});

test('Authority can degrade while control unchanged (political_controllers not touched)', () => {
  const state = stateWithDeclarations();
  const pcBefore = { ...state.political_controllers };
  runAuthorityDegradation(state);
  assert.deepStrictEqual(state.political_controllers, pcBefore, 'Authority update must not change political_controllers');
  const rbihAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
  assert.ok(typeof rbihAfter === 'number', 'RBiH authority should still be updated');
});

test('Phase I runTurn includes authority update in report', async () => {
  const state = stateWithDeclarations();
  const { report } = await runTurn(state, { seed: state.meta.seed });
  assert.ok(report.phase_i_authority);
  assert.ok(Array.isArray(report.phase_i_authority!.changes));
  assert.ok(report.phases.some((p) => p.name === 'phase-i-authority-update'));
});
