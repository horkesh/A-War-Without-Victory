/**
 * Phase A1.3: Serializer rejects pipeline wrapper objects ({ state, phasesExecuted }).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { serializeGameState } from '../src/state/serializeGameState.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalState(): GameState {
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

test('serializeGameState rejects wrapper { state, phasesExecuted }', () => {
  const state = minimalState();
  const wrapper = { state, phasesExecuted: ['directives', 'deployments'] };
  assert.throws(
    () => serializeGameState(wrapper as unknown as GameState),
    (err: Error) => {
      const msg = err.message || '';
      return msg.includes('phasesExecuted') || msg.includes('unexpected top-level');
    },
    'Must reject wrapper with a clear message'
  );
});

test('serializeGameState rejects object with only state key (wrapper shape)', () => {
  const state = minimalState();
  const wrapper = { state };
  assert.throws(
    () => serializeGameState(wrapper as unknown as GameState),
    (err: Error) => err.message.includes('unexpected top-level') && err.message.includes('state'),
    'Must reject { state } wrapper'
  );
});
