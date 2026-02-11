/**
 * Phase A1.1: Denylisted derived-state keys are rejected by validateGameStateShape.
 * Engine Invariants §13.1: no serialization of derived states.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function baseState(): Record<string, unknown> {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'x' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
}

test('state with top-level "fronts" key is rejected', () => {
  const state = baseState();
  state.fronts = [];
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('fronts')));
});

test('state with top-level "corridors" key is rejected', () => {
  const state = baseState();
  state.corridors = {};
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('corridors')));
});

test('state with top-level "derived" key is rejected', () => {
  const state = baseState();
  state.derived = {};
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('derived')));
});

test('state with top-level "cache" key is rejected', () => {
  const state = baseState();
  state.cache = {};
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('cache')));
});

// Phase E: AoR and rear zone are derived; must not be serialized (Engine Invariants §13.1).
test('state with top-level "phase_e_aor_membership" key is rejected', () => {
  const state = baseState();
  (state as any).phase_e_aor_membership = { by_formation: {} };
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('phase_e_aor_membership')));
});

test('state with top-level "phase_e_aor_influence" key is rejected', () => {
  const state = baseState();
  (state as any).phase_e_aor_influence = {};
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('phase_e_aor_influence')));
});

test('state with top-level "phase_e_rear_zone" key is rejected', () => {
  const state = baseState();
  (state as any).phase_e_rear_zone = { settlement_ids: [] };
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('phase_e_rear_zone')));
});
