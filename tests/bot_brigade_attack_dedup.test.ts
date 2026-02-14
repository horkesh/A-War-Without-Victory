/**
 * One-brigade-per-target attack orders (plan: one-brigade-per-target).
 * - No two brigades of the same faction receive the same attack target SID unless
 *   OG+operation and heavy resistance (stub returns false, so no duplicates in practice).
 * - Determinism: same state and edges => same attack_orders.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { generateBotBrigadeOrders } from '../src/sim/phase_ii/bot_brigade_ai.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function buildStateWithOverlappingTargets(): { state: GameState; edges: EdgeRecord[] } {
  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S4' },
    { a: 'S2', b: 'S4' },
    { a: 'S3', b: 'S4' }
  ];
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 20,
      seed: 'dedup-test',
      phase: 'phase_ii',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {
      B1: {
        id: 'B1',
        faction: 'RBiH',
        name: 'B1',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        posture: 'attack'
      },
      B2: {
        id: 'B2',
        faction: 'RBiH',
        name: 'B2',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        posture: 'attack'
      },
      B3: {
        id: 'B3',
        faction: 'RBiH',
        name: 'B3',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        posture: 'attack'
      }
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RBiH', S2: 'RBiH', S3: 'RBiH', S4: 'RS' },
    brigade_aor: { S1: 'B1', S2: 'B2', S3: 'B3' }
  };
  return { state, edges };
}

test('generateBotBrigadeOrders: no duplicate attack targets across brigades', () => {
  const { state, edges } = buildStateWithOverlappingTargets();
  const result = generateBotBrigadeOrders(state, edges, 'RBiH', null);

  const targets = Object.values(result.attack_orders).filter((v): v is string => v != null);
  const uniqueTargets = new Set(targets);
  assert.strictEqual(
    targets.length,
    uniqueTargets.size,
    'attack_orders must not assign the same target SID to more than one brigade (one-brigade-per-target)'
  );
});

test('generateBotBrigadeOrders: determinism — same inputs => same attack_orders', () => {
  const { state, edges } = buildStateWithOverlappingTargets();
  const result1 = generateBotBrigadeOrders(state, edges, 'RBiH', null);
  const result2 = generateBotBrigadeOrders(state, edges, 'RBiH', null);
  assert.deepStrictEqual(result1.attack_orders, result2.attack_orders, 'same state and edges must yield identical attack_orders');
});
