/**
 * Phase B1.1 V3: Non-war terminal path — end-to-end via runOneTurn.
 *
 * Configure state so referendum eligibility occurs but referendum is not held within deadline.
 * Run until after referendum_deadline_turn. Assert non-war terminal and Phase I blocked.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { OUTCOME_NON_WAR_TERMINAL } from '../src/phase0/index.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';
import { buildMinimalPhase0State } from './phase0_e2e_helper.js';

const INPUTS = { seed: 'v3-deterministic' };

test('V3: non-war terminal when deadline reached without referendum', () => {
    const state = buildMinimalPhase0State({
        turn: 2,
        bothDeclared: true
    });
    state.meta.referendum_eligible_turn = 2;
    state.meta.referendum_deadline_turn = 6;

    let s = state;
    while (!s.meta.game_over && s.meta.turn < 20) {
        const r = runOneTurn(s, INPUTS);
        s = r.state;
    }

    assert.strictEqual(s.meta.game_over, true);
    assert.strictEqual(s.meta.outcome, OUTCOME_NON_WAR_TERMINAL);
    assert.notStrictEqual(s.meta.phase, 'phase_i');
});
