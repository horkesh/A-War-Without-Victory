/**
 * Tests for deterministic consolidation and isolated-cluster scoring.
 * Covers: exception data, scoreConsolidationTarget, sortTargetsByConsolidationScore, determinism.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '../src/state/game_state.js';
import {
  scoreConsolidationTarget,
  sortTargetsByConsolidationScore,
  isConnectedStrongholdSid,
  isIsolatedHoldoutSid,
  isFastRearCleanupMun,
  BONUS_FAST_CLEANUP_MUN
} from '../src/sim/consolidation_scoring.js';

function makeState(pc: Record<string, string>): GameState {
  return {
    schema_version: 1,
    meta: { turn: 5, seed: 'cons-test', phase: 'phase_ii' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: pc
  } as GameState;
}

test('isConnectedStrongholdSid returns true for Sapna S163520', () => {
  assert.strictEqual(isConnectedStrongholdSid('S163520'), true);
  assert.strictEqual(isConnectedStrongholdSid('S999999'), false);
});

test('isIsolatedHoldoutSid returns true for Petrovo S120154 and Vozuca S162094', () => {
  assert.strictEqual(isIsolatedHoldoutSid('S120154'), true);
  assert.strictEqual(isIsolatedHoldoutSid('S162094'), true);
  assert.strictEqual(isIsolatedHoldoutSid('S1'), false);
});

test('isFastRearCleanupMun returns true for prijedor and banja_luka', () => {
  assert.strictEqual(isFastRearCleanupMun('prijedor'), true);
  assert.strictEqual(isFastRearCleanupMun('banja_luka'), true);
  assert.strictEqual(isFastRearCleanupMun('zvornik'), false);
  assert.strictEqual(isFastRearCleanupMun(undefined), false);
});

test('scoreConsolidationTarget returns 0 for own-controlled settlement', () => {
  const state = makeState({ S1: 'RS', S2: 'RBiH' });
  const edges = [{ a: 'S1', b: 'S2' }];
  const sidToMun = new Map<string, string>([['S1', 'mun_a'], ['S2', 'mun_b']]);
  const score = scoreConsolidationTarget({
    state,
    targetSid: 'S1',
    attackerFaction: 'RS',
    edges,
    sidToMun,
    settlementsByMun: new Map([['mun_a', ['S1']], ['mun_b', ['S2']]])
  });
  assert.strictEqual(score, 0);
});

test('scoreConsolidationTarget applies fast-cleanup mun bonus', () => {
  const state = makeState({ S1: 'RS', S2: 'RBiH' });
  const edges = [{ a: 'S1', b: 'S2' }];
  const sidToMun = new Map<string, string>([['S1', 'prijedor'], ['S2', 'prijedor']]);
  const settlementsByMun = new Map<string, string[]>([['prijedor', ['S1', 'S2']]]);
  const score = scoreConsolidationTarget({
    state,
    targetSid: 'S2',
    attackerFaction: 'RS',
    edges,
    sidToMun,
    settlementsByMun
  });
  assert.ok(score >= BONUS_FAST_CLEANUP_MUN, 'score should include fast-cleanup bonus');
  assert.ok(score >= 130, `Prijedor fast-cleanup score should be high for quick rear cleanup, got ${score}`);
});

test('fast-cleanup bonus is RS-specific for Prijedor/Banja Luka set', () => {
  const state = makeState({ S1: 'RBiH', S2: 'RS' });
  const edges = [{ a: 'S1', b: 'S2' }];
  const sidToMun = new Map<string, string>([['S1', 'prijedor'], ['S2', 'prijedor']]);
  const settlementsByMun = new Map<string, string[]>([['prijedor', ['S1', 'S2']]]);
  const score = scoreConsolidationTarget({
    state,
    targetSid: 'S2',
    attackerFaction: 'RBiH',
    edges,
    sidToMun,
    settlementsByMun
  });
  assert.ok(score < 130, `non-RS attacker should not receive RS fast-cleanup bonus in Prijedor, got ${score}`);
});

test('sortTargetsByConsolidationScore is deterministic (same input => same order)', () => {
  const state = makeState({ S1: 'RS', S2: 'RBiH', S3: 'RBiH', S4: 'RBiH' });
  const edges = [{ a: 'S1', b: 'S2' }, { a: 'S1', b: 'S3' }, { a: 'S2', b: 'S4' }];
  const sidToMun = new Map<string, string>([['S1', 'm1'], ['S2', 'm2'], ['S3', 'm2'], ['S4', 'm2']]);
  const candidates = ['S2', 'S3', 'S4'];
  const order1 = sortTargetsByConsolidationScore(state, candidates, 'RS', edges, sidToMun);
  const order2 = sortTargetsByConsolidationScore(state, candidates, 'RS', edges, sidToMun);
  assert.deepStrictEqual(order1, order2);
  assert.strictEqual(order1.length, 3);
});
