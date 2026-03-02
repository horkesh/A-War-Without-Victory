/**
 * Tests for elite loan system.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ELITE_LOAN_DURATION,
    ELITE_LOAN_COOLDOWN,
    ELITE_CASUALTY_THRESHOLD,
    ELITE_MORALE_RECALL,
    ELITE_DEGRADATION_THRESHOLD,
    createEliteLoanState,
} from '../src/state/elite_loan_types.js';
import {
    processEliteLoanLifecycle,
    deployElite,
    isEliteAvailable,
} from '../src/sim/combat/elite_loan.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeEliteFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'arbih_guards_brigade',
        faction: 'RBiH',
        name: 'Guards Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 2200,
        morale: 70,
        elite_loan_state: createEliteLoanState(),
        ...overrides,
    };
}

function makeState(formations: Record<string, FormationState>, turn = 10): GameState {
    return {
        meta: { turn, phase: 'war', start_year: 1992, recruitment_mode: 'player_choice' },
        formations,
        factions: [],
        political_controllers: {},
    } as unknown as GameState;
}

describe('elite loan constants', () => {
    it('loan duration is 6 weeks', () => assert.equal(ELITE_LOAN_DURATION, 6));
    it('cooldown is 4 weeks', () => assert.equal(ELITE_LOAN_COOLDOWN, 4));
    it('casualty threshold is 30%', () => assert.equal(ELITE_CASUALTY_THRESHOLD, 0.30));
    it('morale recall is 35', () => assert.equal(ELITE_MORALE_RECALL, 35));
    it('degradation threshold is 50%', () => assert.equal(ELITE_DEGRADATION_THRESHOLD, 0.50));
});

describe('elite deployment', () => {
    it('deploys successfully when available', () => {
        const f = makeEliteFormation();
        const result = deployElite(f, 'corps_1', 10);
        assert.equal(result, true);
        assert.equal(f.elite_loan_state!.on_loan, true);
        assert.equal(f.elite_loan_state!.loaned_to_corps, 'corps_1');
        assert.equal(f.elite_loan_state!.loan_start_turn, 10);
        assert.equal(f.elite_loan_state!.loan_start_personnel, 2200);
    });

    it('refuses deployment when already on loan', () => {
        const f = makeEliteFormation();
        deployElite(f, 'corps_1', 10);
        const result = deployElite(f, 'corps_2', 11);
        assert.equal(result, false);
    });

    it('refuses deployment when on cooldown', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.last_recall_turn = 8;
        const result = deployElite(f, 'corps_1', 10); // Only 2 turns since recall, need 4
        assert.equal(result, false);
    });

    it('allows deployment after cooldown', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.last_recall_turn = 5;
        const result = deployElite(f, 'corps_1', 10); // 5 turns since recall, need 4
        assert.equal(result, true);
    });

    it('refuses deployment when permanently degraded', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.permanently_degraded = true;
        const result = deployElite(f, 'corps_1', 10);
        assert.equal(result, false);
    });
});

describe('elite loan lifecycle', () => {
    it('expires loan after ELITE_LOAN_DURATION turns', () => {
        const f = makeEliteFormation();
        deployElite(f, 'corps_1', 5);
        const state = makeState({ arbih_guards_brigade: f }, 5 + ELITE_LOAN_DURATION);

        const report = processEliteLoanLifecycle(state);
        assert.equal(report.loans_expired, 1);
        assert.equal(f.elite_loan_state!.on_loan, false);
        assert.equal(f.elite_loan_state!.last_recall_turn, 5 + ELITE_LOAN_DURATION);
    });

    it('force recalls on low morale', () => {
        const f = makeEliteFormation({ morale: 30 }); // Below ELITE_MORALE_RECALL (35)
        deployElite(f, 'corps_1', 5);
        const state = makeState({ arbih_guards_brigade: f }, 7);

        const report = processEliteLoanLifecycle(state);
        assert.equal(report.loans_recalled, 1);
        assert.equal(f.elite_loan_state!.on_loan, false);
    });

    it('force recalls on high casualties', () => {
        const f = makeEliteFormation({ personnel: 2200 });
        deployElite(f, 'corps_1', 5);
        // Now take >30% casualties: 2200 * 0.30 = 660. Personnel drops to 1500 → 31.8%
        f.personnel = 1500;
        const state = makeState({ arbih_guards_brigade: f }, 7);

        const report = processEliteLoanLifecycle(state);
        assert.equal(report.loans_recalled, 1);
    });

    it('does not recall when within casualty threshold', () => {
        const f = makeEliteFormation({ personnel: 2200 });
        deployElite(f, 'corps_1', 5);
        f.personnel = 1700; // 22.7% loss, below 30%
        const state = makeState({ arbih_guards_brigade: f }, 7);

        const report = processEliteLoanLifecycle(state);
        assert.equal(report.loans_active, 1);
        assert.equal(report.loans_recalled, 0);
    });

    it('permanently degrades when personnel below 50%', () => {
        const f = makeEliteFormation({ personnel: 2200 });
        deployElite(f, 'corps_1', 5);
        f.personnel = 900; // Below 50% of 2200
        const state = makeState({ arbih_guards_brigade: f }, 7);

        const report = processEliteLoanLifecycle(state);
        assert.equal(report.permanently_degraded, 1);
        assert.equal(f.elite_loan_state!.permanently_degraded, true);
    });
});

describe('isEliteAvailable', () => {
    it('returns true when ready', () => {
        const f = makeEliteFormation();
        assert.equal(isEliteAvailable(f, 10), true);
    });

    it('returns false when on loan', () => {
        const f = makeEliteFormation();
        deployElite(f, 'corps_1', 5);
        assert.equal(isEliteAvailable(f, 6), false);
    });

    it('returns false when on cooldown', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.last_recall_turn = 8;
        assert.equal(isEliteAvailable(f, 10), false); // 2 turns since recall
        assert.equal(isEliteAvailable(f, 11), false); // 3 turns, still on cooldown
        assert.equal(isEliteAvailable(f, 12), true);  // 4 turns = cooldown expired
    });

    it('returns true after cooldown expires', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.last_recall_turn = 5;
        assert.equal(isEliteAvailable(f, 10), true); // 5 turns > 4
    });

    it('returns false when degraded', () => {
        const f = makeEliteFormation();
        f.elite_loan_state!.permanently_degraded = true;
        assert.equal(isEliteAvailable(f, 10), false);
    });
});
