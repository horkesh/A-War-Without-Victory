/**
 * Phase B1.1 V2: Phase I unreachable without referendum — end-to-end via runOneTurn.
 *
 * Start in phase_0 with referendum_held false. Run multiple turns.
 * Assert phase remains phase_0; no Phase I entry unless referendum_held AND current_turn == war_start_turn.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { runOneTurn } from '../src/state/turn_pipeline.js';
import { buildMinimalPhase0State } from './phase0_e2e_helper.js';

const INPUTS = { seed: 'v2-deterministic' };

test('V2: phase stays phase_0 when referendum_held false', () => {
    const state = buildMinimalPhase0State({ turn: 0, bothDeclared: true });
    state.meta.referendum_eligible_turn = 0;
    state.meta.referendum_deadline_turn = 20;
    state.meta.referendum_held = false;

    let s = state;
    for (let i = 0; i < 15; i++) {
        const r = runOneTurn(s, INPUTS);
        s = r.state;
        assert.strictEqual(s.meta.phase, 'phase_0', `turn ${s.meta.turn}: phase must remain phase_0 when referendum_held false`);
    }
});
