/**
 * B1.4: Event evaluator tests — trigger matching, registry order, determinism.
 * Same state + turn + seed → same events_fired; RNG only for random events; stable EVENT_REGISTRY order.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { triggerMatches } from '../src/sim/events/event_types.js';
import { EVENT_REGISTRY, HISTORICAL_EVENTS } from '../src/sim/events/event_registry.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Deterministic RNG: same seed → same sequence (Mulberry32 + string hash). */
function createRng(seed: string | number): Rng {
  const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
  let a = numericSeed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function minimalState(phase: 'phase_i' | 'phase_ii', turn: number): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn, seed: 'events-test-seed', phase }
  } as GameState;
}

test('triggerMatches: phase filter — phase_ii event does not match phase_i state', () => {
  const markale = EVENT_REGISTRY.find((e) => e.id === 'markale_market')!;
  const state = minimalState('phase_i', 90);
  assert.strictEqual(triggerMatches(markale, state, 90), false);
});

test('triggerMatches: phase filter — phase_i event matches phase_i state', () => {
  const srebrenica = EVENT_REGISTRY.find((e) => e.id === 'srebrenica_enclave')!;
  const state = minimalState('phase_i', 10);
  assert.strictEqual(triggerMatches(srebrenica, state, 10), true);
});

test('triggerMatches: turn_min — event with turn_min 40 does not match turn 39', () => {
  const arabh = EVENT_REGISTRY.find((e) => e.id === 'arabh_organization')!;
  const state = minimalState('phase_i', 39);
  assert.strictEqual(triggerMatches(arabh, state, 39), false);
});

test('triggerMatches: turn_min — event with turn_min 40 matches turn 40', () => {
  const arabh = EVENT_REGISTRY.find((e) => e.id === 'arabh_organization')!;
  const state = minimalState('phase_i', 40);
  assert.strictEqual(triggerMatches(arabh, state, 40), true);
});

test('triggerMatches: turn_max — event with turn_max 80 does not match turn 81', () => {
  const vrs = EVENT_REGISTRY.find((e) => e.id === 'vrs_offensive')!;
  const state = minimalState('phase_i', 81);
  assert.strictEqual(triggerMatches(vrs, state, 81), false);
});

test('triggerMatches: turn_max — event with turn_max 80 matches turn 80', () => {
  const vrs = EVENT_REGISTRY.find((e) => e.id === 'vrs_offensive')!;
  const state = minimalState('phase_i', 80);
  assert.strictEqual(triggerMatches(vrs, state, 80), true);
});

test('evaluateEvents: phase_i turn 10 fires historical events only (no probability)', () => {
  const state = minimalState('phase_i', 10);
  const rng = createRng('seed-a');
  const result = evaluateEvents(state, rng, 10);
  const ids = result.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  assert.ok(ids.includes('srebrenica_enclave'));
  assert.ok(ids.includes('sarajevo_siege'));
  assert.ok(ids.includes('vrs_offensive'));
  assert.ok(ids.includes('hrhb_croat_rep'));
  assert.strictEqual(result.fired.every((f) => typeof f.text === 'string'), true);
});

test('evaluateEvents: phase_ii turn 100 fires phase_ii historical events', () => {
  const state = minimalState('phase_ii', 100);
  const rng = createRng('seed-b');
  const result = evaluateEvents(state, rng, 100);
  const ids = result.fired.map((f) => f.id);
  assert.ok(ids.includes('markale_market'));
  assert.ok(ids.includes('washington_agreement'));
});

test('evaluateEvents: same state + turn + seed → same events_fired (determinism)', () => {
  const state = minimalState('phase_i', 50);
  const rng1 = createRng('determinism-seed');
  const rng2 = createRng('determinism-seed');
  const result1 = evaluateEvents(state, rng1, 50);
  const result2 = evaluateEvents(state, rng2, 50);
  assert.deepStrictEqual(
    result1.fired.map((f) => ({ id: f.id, text: f.text })),
    result2.fired.map((f) => ({ id: f.id, text: f.text }))
  );
});

test('evaluateEvents: registry order stable — two calls produce identical fired order', () => {
  const state = minimalState('phase_ii', 100);
  const rng1 = createRng('order-seed');
  const rng2 = createRng('order-seed');
  const a = evaluateEvents(state, rng1, 100).fired;
  const b = evaluateEvents(state, rng2, 100).fired;
  assert.strictEqual(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) {
    assert.strictEqual(a[i]!.id, b[i]!.id);
    assert.strictEqual(a[i]!.text, b[i]!.text);
  }
});

test('evaluateEvents: phase_0 or other phase returns empty fired', () => {
  const statePhase0 = { ...minimalState('phase_i', 10), meta: { ...minimalState('phase_i', 10).meta, phase: 'phase_0' } } as GameState;
  const rng = createRng('x');
  const result = evaluateEvents(statePhase0, rng, 10);
  assert.strictEqual(result.fired.length, 0);
});

test('EVENT_REGISTRY: historical events first then random; stable array', () => {
  const historicalIds = HISTORICAL_EVENTS.map((e) => e.id);
  const registryHistorical = EVENT_REGISTRY.slice(0, HISTORICAL_EVENTS.length).map((e) => e.id);
  assert.deepStrictEqual(registryHistorical, historicalIds);
  assert.ok(EVENT_REGISTRY.length > HISTORICAL_EVENTS.length);
});

test('evaluateEvents: random events use RNG — same seed same fired set', () => {
  const state = minimalState('phase_ii', 95);
  const seed = 'random-same';
  const r1 = evaluateEvents(state, createRng(seed), 95);
  const r2 = evaluateEvents(state, createRng(seed), 95);
  const ids1 = r1.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const ids2 = r2.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(ids1, ids2);
});

test('evaluateEvents: each RNG seed yields deterministic fired set (phase_ii with random events)', () => {
  const state = minimalState('phase_ii', 95);
  const seedA1 = evaluateEvents(state, createRng('seed-alpha'), 95).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const seedA2 = evaluateEvents(state, createRng('seed-alpha'), 95).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const seedB1 = evaluateEvents(state, createRng('seed-beta'), 95).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const seedB2 = evaluateEvents(state, createRng('seed-beta'), 95).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(seedA1, seedA2);
  assert.deepStrictEqual(seedB1, seedB2);
});
