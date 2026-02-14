import assert from 'node:assert';
import { test } from 'node:test';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

test('parseGameState extracts deterministic order lists and events', () => {
  const parsed = parseGameState({
    meta: { turn: 7, phase: 'phase_ii' },
    formations: {
      b2: { faction: 'RS', name: 'B2', kind: 'brigade', readiness: 'active', cohesion: 60, status: 'active', created_turn: 1, tags: [] },
      b1: { faction: 'RBiH', name: 'B1', kind: 'brigade', readiness: 'active', cohesion: 70, status: 'active', created_turn: 1, tags: [] }
    },
    brigade_attack_orders: [
      { brigade_id: 'b2', target_settlement_id: 'S3' },
      { brigade_id: 'b1', target_settlement_id: 'S1' }
    ],
    brigade_mun_orders: [
      { brigade_id: 'b2', target_mun_id: 'zvornik' },
      { brigade_id: 'b1', target_mun_id: 'tuzla' }
    ],
    control_events: [
      { turn: 7, settlement_id: 'S2', from: 'RS', to: 'RBiH', mechanism: 'phase_ii_attack', mun_id: 'foo' },
      { turn: 6, settlement_id: 'S1', from: null, to: 'RS', mechanism: 'phase_i', mun_id: 'bar' }
    ],
    political_controllers: { S1: 'RBiH' }
  });

  assert.strictEqual(parsed.attackOrders.length, 2);
  assert.strictEqual(parsed.attackOrders[0].brigadeId, 'b1');
  assert.strictEqual(parsed.movementOrders[0].brigadeId, 'b1');
  assert.strictEqual(parsed.recentControlEvents.length, 2);
  assert.strictEqual(parsed.recentControlEvents[0].turn, 6);
});

test('parseGameState preserves meta.player_faction in LoadedGameState', () => {
  const parsed = parseGameState({
    meta: { turn: 1, phase: 'phase_ii', player_faction: 'RS' },
    formations: {},
    political_controllers: {}
  });
  assert.strictEqual(parsed.player_faction, 'RS');
});

