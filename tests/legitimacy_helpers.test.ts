import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '../src/state/game_state.js';
import { getFactionLegitimacyAverages } from '../src/state/legitimacy.js';

test('getFactionLegitimacyAverages returns neutral when missing data', () => {
  const state: GameState = {
    schema_version: 1,
    meta: { turn: 1, seed: 'leg-test' },
    factions: [
      { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
  const averages = getFactionLegitimacyAverages(state);
  assert.strictEqual(averages.RBiH, 0.5);
});
