/**
 * Phase A1.3: Stable deterministic serialization — same state produces byte-identical JSON.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { serializeGameState } from '../src/state/serializeGameState.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal valid GameState with out-of-order record keys (political_controllers, formations). */
function fixtureWithOutOfOrderKeys(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 1, seed: 'stability-fixture' },
    factions: [],
    formations: {
      'form_z': { id: 'form_z', faction: 'RBiH', name: 'Z', created_turn: 0, status: 'active', assignment: null },
      'form_a': { id: 'form_a', faction: 'RS', name: 'A', created_turn: 0, status: 'active', assignment: null },
      'form_m': { id: 'form_m', faction: 'HRHB', name: 'M', created_turn: 0, status: 'active', assignment: null }
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: {
      'sid_zzz': 'RBiH',
      'sid_aaa': null,
      'sid_mmm': 'RS'
    }
  };
}

test('serializeGameState produces identical string when called twice', () => {
  const state = fixtureWithOutOfOrderKeys();
  const a = serializeGameState(state);
  const b = serializeGameState(state);
  assert.strictEqual(a, b, 'Two serializations of same state must be byte-identical');
});

test('serializeGameState output has deterministically ordered top-level keys', () => {
  const state = fixtureWithOutOfOrderKeys();
  const str = serializeGameState(state);
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const keys = Object.keys(parsed);
  const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  assert.deepStrictEqual(keys, sorted, 'Top-level keys must appear in sorted order');
});

test('serializeGameState output has deterministically ordered keys in political_controllers', () => {
  const state = fixtureWithOutOfOrderKeys();
  const str = serializeGameState(state);
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const pc = parsed.political_controllers as Record<string, unknown> | undefined;
  assert.ok(pc && typeof pc === 'object');
  const keys = Object.keys(pc);
  const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  assert.deepStrictEqual(keys, sorted, 'political_controllers keys must appear in sorted order');
});

test('serializeGameState output has deterministically ordered keys in formations', () => {
  const state = fixtureWithOutOfOrderKeys();
  const str = serializeGameState(state);
  const parsed = JSON.parse(str) as Record<string, unknown>;
  const formations = parsed.formations as Record<string, unknown> | undefined;
  assert.ok(formations && typeof formations === 'object');
  const keys = Object.keys(formations);
  const sorted = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  assert.deepStrictEqual(keys, sorted, 'formations keys must appear in sorted order');
});
