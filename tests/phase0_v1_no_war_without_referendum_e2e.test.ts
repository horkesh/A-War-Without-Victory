/**
 * Phase B1.1 V1: No war without referendum — end-to-end via runOneTurn.
 *
 * Construct Phase 0 state where referendum can never be held (both declared so eligible,
 * but we never hold it). Run past the referendum deadline. Assert non-war terminal outcome.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { OUTCOME_NON_WAR_TERMINAL } from '../src/phase0/index.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';
import { buildMinimalPhase0State } from './phase0_e2e_helper.js';

const INPUTS = { seed: 'v1-deterministic' };

test('V1: no war without referendum — eligible but never held, run to deadline', () => {
    const state = buildMinimalPhase0State({
        turn: 0,
        bothDeclared: true,
        referendum_eligible_turn: 0,
        referendum_deadline_turn: 5
    });

    let s = state;
    for (let i = 0; i < 7; i++) {
        const r = runOneTurn(s, INPUTS);
        s = r.state;
    }

    assert.strictEqual(s.meta.referendum_held, undefined, 'referendum_held must not be true');
    assert.ok(
        s.meta.war_start_turn === undefined || s.meta.war_start_turn === null,
        'war_start_turn must be absent'
    );
    assert.notStrictEqual(s.meta.phase, 'phase_i', 'meta.phase must never become phase_i');
    assert.strictEqual(s.meta.game_over, true, 'terminal non-war outcome must be reached');
    assert.strictEqual(s.meta.outcome, OUTCOME_NON_WAR_TERMINAL);
});
