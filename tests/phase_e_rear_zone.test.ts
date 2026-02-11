/**
 * Phase E Step 5: Rear Political Control Zone tests.
 * - Rear zones only exist behind fronts (settlements with control but not front-active)
 * - Rear zones reduce volatility (authority stabilization factor)
 * - No control flips (rear zone detection is read-only)
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { deriveRearPoliticalControlZones, isSettlementInRearZone, getRearZoneAuthorityStabilizationFactor } from '../src/sim/phase_e/rear_zone_detection.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 10, seed: 'rear-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 0, war_start_turn: 1 },
    factions: [
      { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: {}
  };
}

test('Rear zone: no rear zones when phase_i', () => {
  const state = minimalPhaseIIState();
  state.meta.phase = 'phase_i';
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  assert.strictEqual(rearZone.settlement_ids.length, 0, 'No rear zones in phase_i');
});

test('Rear zone: all controlled settlements are rear when no eligible edges', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RBiH', 'S3': 'RBiH' }; // same control, no opposing
  const edges = [{ a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  assert.strictEqual(rearZone.settlement_ids.length, 3, 'All controlled settlements are rear when no fronts');
  assert.ok(rearZone.settlement_ids.includes('S1'), 'S1 is rear');
  assert.ok(rearZone.settlement_ids.includes('S2'), 'S2 is rear');
  assert.ok(rearZone.settlement_ids.includes('S3'), 'S3 is rear');
});

test('Rear zone: front-active settlements are NOT in rear zone', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }]; // S1–S2 is front edge (opposing control)
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  // S1 and S2 are front-active (on eligible edge); S3 is rear
  assert.ok(!rearZone.settlement_ids.includes('S1'), 'S1 is front-active, not rear');
  assert.ok(!rearZone.settlement_ids.includes('S2'), 'S2 is front-active, not rear');
  assert.ok(rearZone.settlement_ids.includes('S3'), 'S3 is rear (not on any eligible edge)');
});

test('Rear zone: settlements with null control are NOT in rear zone', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': null, 'S4': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  // S3 has null control → not controlled → not in rear zone
  assert.ok(!rearZone.settlement_ids.includes('S3'), 'S3 (null control) is not in rear zone');
  assert.ok(rearZone.settlement_ids.includes('S4'), 'S4 (controlled, not front-active) is in rear zone');
});

test('Rear zone: rear zones exist behind fronts', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH', 'S4': 'RBiH', 'S5': 'HRHB' };
  const edges = [{ a: 'S1', b: 'S2' }, { a: 'S2', b: 'S5' }]; // S1–S2 (RBiH–RS) and S2–S5 (RS–HRHB) are front edges
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  // Front-active: S1, S2, S5 (on eligible edges with opposing control)
  // Rear: S3, S4 (controlled but not on any eligible edge)
  assert.ok(!rearZone.settlement_ids.includes('S1'), 'S1 is front-active');
  assert.ok(!rearZone.settlement_ids.includes('S2'), 'S2 is front-active');
  assert.ok(rearZone.settlement_ids.includes('S3'), 'S3 is rear (behind front)');
  assert.ok(rearZone.settlement_ids.includes('S4'), 'S4 is rear (behind front)');
  assert.ok(!rearZone.settlement_ids.includes('S5'), 'S5 is front-active');
});

test('Rear zone: isSettlementInRearZone returns correct values', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  assert.strictEqual(isSettlementInRearZone('S1', rearZone), false, 'S1 is not in rear zone');
  assert.strictEqual(isSettlementInRearZone('S2', rearZone), false, 'S2 is not in rear zone');
  assert.strictEqual(isSettlementInRearZone('S3', rearZone), true, 'S3 is in rear zone');
});

test('Rear zone: authority stabilization factor is lower for rear zones', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  const factorS1 = getRearZoneAuthorityStabilizationFactor('S1', rearZone); // front-active
  const factorS3 = getRearZoneAuthorityStabilizationFactor('S3', rearZone); // rear
  assert.strictEqual(factorS1, 1.0, 'Front-active settlement has no stabilization (factor 1.0)');
  assert.strictEqual(factorS3, 0.5, 'Rear settlement has stabilization (factor 0.5)');
  assert.ok(factorS3 < factorS1, 'Rear zone has lower stabilization factor (more stable)');
});

test('Rear zone: rear zone detection does not flip control', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
  const originalControl = { ...state.political_controllers };
  const edges = [{ a: 'S1', b: 'S2' }];
  deriveRearPoliticalControlZones(state, edges); // should not mutate state.political_controllers
  assert.deepStrictEqual(state.political_controllers, originalControl, 'Rear zone detection does not flip control');
});

test('Rear zone: rear zones reduce volatility (read-only stabilization factor)', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH', 'S4': 'RBiH' };
  const edges = [{ a: 'S1', b: 'S2' }];
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  // Rear settlements S3, S4 have reduced authority volatility (stabilization factor 0.5)
  // This is read-only; no state mutation
  const factorS3 = getRearZoneAuthorityStabilizationFactor('S3', rearZone);
  const factorS4 = getRearZoneAuthorityStabilizationFactor('S4', rearZone);
  assert.strictEqual(factorS3, 0.5, 'S3 (rear) has reduced volatility');
  assert.strictEqual(factorS4, 0.5, 'S4 (rear) has reduced volatility');
  // Authority stabilization is read-only; no mutation of state.municipalities or faction.profile.authority
  assert.ok(!state.municipalities || Object.keys(state.municipalities).length === 0, 'No municipality state mutation');
});

test('Rear zone: deterministic ordering (settlement_ids sorted)', () => {
  const state = minimalPhaseIIState();
  state.political_controllers = { 'S3': 'RBiH', 'S1': 'RBiH', 'S2': 'RS', 'S4': 'RBiH' };
  const edges = [{ a: 'S2', b: 'S3' }]; // S2–S3 front edge
  const rearZone = deriveRearPoliticalControlZones(state, edges);
  // Rear: S1, S4 (not on eligible edge); should be sorted
  const expected = ['S1', 'S4'].sort();
  assert.deepStrictEqual(rearZone.settlement_ids, expected, 'Rear zone settlement_ids are sorted');
});
