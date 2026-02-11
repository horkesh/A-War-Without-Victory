/**
 * Phase B1.1 V4: Full suite regression — runOneTurn executes 10+ Phase 0 turns without throwing.
 * Preserves determinism.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { runOneTurn } from '../src/state/turn_pipeline.js';
import { serializeState } from '../src/state/serialize.js';
import { buildMinimalPhase0State } from './phase0_e2e_helper.js';

const INPUTS = { seed: 'v4-regression-seed' };

test('V4: 10+ Phase 0 turns without throw', () => {
  const state = buildMinimalPhase0State({ turn: 0 });

  let s = state;
  for (let i = 0; i < 12; i++) {
    const r = runOneTurn(s, INPUTS);
    s = r.state;
  }

  assert.strictEqual(s.meta.turn, 12);
  assert.strictEqual(s.meta.phase, 'phase_0');
});

test('V4: determinism — same inputs yield identical final state', () => {
  const base = buildMinimalPhase0State({ turn: 0 });

  let s1 = base;
  for (let i = 0; i < 10; i++) {
    s1 = runOneTurn(s1, INPUTS).state;
  }

  let s2 = base;
  for (let i = 0; i < 10; i++) {
    s2 = runOneTurn(s2, INPUTS).state;
  }

  const out1 = serializeState(s1);
  const out2 = serializeState(s2);
  assert.strictEqual(out1, out2);
});
