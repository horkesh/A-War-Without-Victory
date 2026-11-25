/**
 * L3b (command-loop proposal §5C, Council L8, 2026-11-14): a Level-1 plan whose approval proposal
 * expired unanswered is released, not held at `ready` forever.
 *
 * WHY. `apply-autonomy-transition` stamps an unanswered proposal `accepted: false` at the next
 * Advance but stages no `player_op_response`. The Level-1 guard then held the plan at `ready`
 * every turn, proposal generation skipped it as already resolved, the commander could not start a
 * new plan, and the 25-Authority "unrequested operation" card was its only way out ("the same two
 * unrequested operation offers sit unchanged from 1992 to 1995").
 *
 * Contract pinned here:
 *   - Expired unanswered: the plan is released (current_plan null), no operation is admitted.
 *   - Still pending (this turn's proposal): held at ready, unchanged.
 *   - Explicit decline (staged response): abandoned as before; explicit accept launches (#633 B11).
 *   - Bot factions and headless auto-control: never reach the guard (unchanged).
 */

import { describe, it, expect } from 'vitest';
import type { CorpsCommandState, FactionId, GameState, PendingProposalReview } from '../../../src/state/game_state.js';
import { applyCommanderOutput } from '../../../src/sim/combat/commander/commander_loop.js';
import { warPhases } from '../../../src/sim/turn_phases/war_phases.js';

const PLAYER = 'arbih_test_corps';
const BOT = 'vrs_test_corps';
const PLAN = (id: string) => `plan_${id}_t10`;

function makeState(opts: { headless?: boolean } = {}): GameState {
    const corps = (id: string, faction: FactionId) => ({
        formation: { id, faction, name: id, kind: 'corps', status: 'active', created_turn: 1, assignment: null },
        command: {
            command_span: 5, subordinate_count: 2, og_slots: 0, active_ogs: [], corps_exhaustion: 0,
            faction_war_exhaustion: 0, stance: 'offensive', active_operations: [],
            commander_state: { current_plan: { plan_id: PLAN(id), status: 'ready' } },
        } as unknown as CorpsCommandState,
    });
    const player = corps(PLAYER, 'RBiH');
    const bot = corps(BOT, 'RS');
    return {
        meta: {
            turn: 10, seed: 'l3b', phase: 'war', autonomy_level: 1, player_faction: 'RBiH',
            headless_scenario_auto_control: opts.headless ?? false,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: { [PLAYER]: player.formation, [BOT]: bot.formation },
            corps_command: { [PLAYER]: player.command, [BOT]: bot.command },
            brigade_movement_orders: {},
        },
    } as unknown as GameState;
}

function proposal(turn: number): PendingProposalReview {
    return {
        id: `PROP_${turn}_ops_0`, turn, faction: 'RBiH', domain: 'ops', description: 'Test offensive',
        proposed_action: `APPROVE_OP:${PLAYER}:${PLAN(PLAYER)}`, current_value: 'pending', proposed_value: 'approved',
    } as PendingProposalReview;
}

/** The commander advanced its ready plan to executing and emitted one operation this turn. */
function applyExecutingPlan(state: GameState, id: string): void {
    applyCommanderOutput(state, id, {
        directive: { type: 'hold', target_zone: null },
        operations: [{
            name: `op_${id}`, type: 'sector_attack', phase: 'planning', sector_id: `sector:${id}:0`,
            objectives: ['op:test:objective'], participating_brigades: [`${id}_b1`, `${id}_b2`],
            commander_officer_id: `officer_${id}`,
        }],
        sector_stances: [],
        updated_state: { current_plan: { plan_id: PLAN(id), status: 'executing', target_osids: ['op:test:objective'] } },
        reinforcement_requests: [], prepositioning_orders: [], plan_updates: [], garrison_locks: [],
    } as any);
}

const cmd = (state: GameState, id: string) => state.military.corps_command![id]!;
const launched = (state: GameState, id: string) => cmd(state, id).active_operations.map((op) => op.name);

/** Advance to turn 11 and run the real expiry step (apply-autonomy-transition). */
async function advanceAndExpire(state: GameState): Promise<void> {
    state.meta.turn = 11;
    const step = warPhases.find((s) => s.name === 'apply-autonomy-transition')!;
    await step.run({ state } as never);
}

// Amended 2026-11-25, player-override model (Engine Invariants §14.10a-b; lane C s8 ruling Q1/Q3):
// silence applies the staff's plan on the headless turn. The L3b release and the hold at `ready`
// it repaired are both retired; the lapse is stamped as the staff's choice, never as a refusal.
describe('an unanswered Level-1 plan proposal: the staff proceed, on the headless turn', () => {
    it('while the proposal is still open (this turn) the plan launches as the bot plan would', () => {
        const state = makeState();
        state.meta.pending_proposal_reviews = [proposal(10)];
        applyExecutingPlan(state, PLAYER);
        expect(launched(state, PLAYER)).toEqual([`op_${PLAYER}`]);
        expect(cmd(state, PLAYER).commander_state?.current_plan?.status).toBe('executing');
    });

    it('at Advance the lapse is stamped as the staff proceeding (silence), with no staged response', async () => {
        const state = makeState();
        state.meta.pending_proposal_reviews = [proposal(10)];
        await advanceAndExpire(state);
        expect(state.meta.pending_proposal_reviews).toEqual([
            expect.objectContaining({ accepted: true, resolved_turn: 11, resolved_by: 'silence' }),
        ]);
        expect(state.meta.proposal_decision_history).toEqual([
            expect.objectContaining({ id: 'PROP_10_ops_0', accepted: true, resolved_turn: 11, resolved_by: 'silence' }),
        ]);
        expect(cmd(state, PLAYER).player_op_response).toBeUndefined();

        applyExecutingPlan(state, PLAYER);
        expect(launched(state, PLAYER)).toEqual([`op_${PLAYER}`]);
    });

    it('a plan an older save held at ready after a decline-stamped lapse launches on its next pass', () => {
        const state = makeState();
        state.meta.pending_proposal_reviews = [{ ...proposal(10), accepted: false, resolved_turn: 11 }];
        state.meta.turn = 30;
        applyExecutingPlan(state, PLAYER);
        expect(launched(state, PLAYER)).toEqual([`op_${PLAYER}`]);
    });

    it('an explicit decline still abandons the plan, and an explicit accept still launches it', async () => {
        const declined = makeState();
        declined.meta.pending_proposal_reviews = [{ ...proposal(10), accepted: false, resolved_turn: 10 }];
        cmd(declined, PLAYER).player_op_response = { plan_id: PLAN(PLAYER), approved: false, turn: 10 };
        applyExecutingPlan(declined, PLAYER);
        expect(launched(declined, PLAYER)).toEqual([]);
        expect(cmd(declined, PLAYER).commander_state?.current_plan).toBeNull();
        expect(cmd(declined, PLAYER).status_reason).toBe('plan abandoned: the President refused the staff op plan');

        const accepted = makeState();
        accepted.meta.pending_proposal_reviews = [{ ...proposal(10), accepted: true, resolved_turn: 10 }];
        cmd(accepted, PLAYER).player_op_response = { plan_id: PLAN(PLAYER), approved: true, turn: 10 };
        applyExecutingPlan(accepted, PLAYER);
        expect(launched(accepted, PLAYER)).toEqual([`op_${PLAYER}`]);
    });

    it('a refusal staged for a different plan does not stop this one', () => {
        const state = makeState();
        cmd(state, PLAYER).player_op_response = { plan_id: 'plan_other', approved: false, turn: 10 };
        applyExecutingPlan(state, PLAYER);
        expect(launched(state, PLAYER)).toEqual([`op_${PLAYER}`]);
    });

    it('bot corps and headless auto-control are unchanged: plans launch', async () => {
        const state = makeState();
        state.meta.pending_proposal_reviews = [proposal(10)];
        await advanceAndExpire(state);
        applyExecutingPlan(state, BOT);
        expect(launched(state, BOT)).toEqual([`op_${BOT}`]);

        const headless = makeState({ headless: true });
        headless.meta.pending_proposal_reviews = [proposal(10)];
        await advanceAndExpire(headless);
        applyExecutingPlan(headless, PLAYER);
        expect(launched(headless, PLAYER)).toEqual([`op_${PLAYER}`]);
        expect(cmd(headless, PLAYER).commander_state?.current_plan?.status).toBe('executing');
    });
});
