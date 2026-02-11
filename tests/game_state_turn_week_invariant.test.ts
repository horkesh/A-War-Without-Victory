/**
 * Phase A1.1: current_turn is modeled as integer weeks; no dates/timestamps in state.
 * Engine Invariants v0.3.0; CANON: one game turn = one week.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

test('meta.turn must be non-negative integer (weeks)', () => {
  const state = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 5, seed: 'x' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, true);
});

test('meta.turn as float is rejected', () => {
  const state = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 1.5, seed: 'x' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('integer')));
});

test('meta.turn negative is rejected', () => {
  const state = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: -1, seed: 'x' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some(e => e.includes('non-negative') || e.includes('integer')));
});

test('state has no timestamp or date fields in meta (contract: meta only turn + seed + optional phase)', () => {
  const state = {
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
  const meta = state.meta as Record<string, unknown>;
  const allowed = new Set(['turn', 'seed', 'phase']);
  for (const key of Object.keys(meta)) {
    assert.ok(allowed.has(key), `meta must not contain "${key}" (no timestamps/dates); only turn, seed, phase allowed`);
  }
});
