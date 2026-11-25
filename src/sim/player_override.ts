/**
 * Player-override model (lane C s8 ruling, 2026-11-25; Engine Invariants §14.10a).
 *
 * Owner: "There should be no drift between live and headless games." For the player faction the
 * staff (bot) pipeline runs every turn exactly as headless, at every autonomy level. The player's
 * input is an OVERRIDE layer: an explicit order, refusal, hold or approval replaces the staff's
 * choice for that one decision. Silence applies the staff's choice, on the turn headless applies
 * it. The autonomy level only decides what is surfaced, never whether a decision is made.
 *
 * `resolveBySilence` is the one place a surfaced decision the player left unanswered is resolved
 * as the staff's choice. It applies the choice the caller hands it (the same function the bot path
 * calls) and writes a record-only receipt (`resolved_by: 'silence'`, "staff proceeded") to
 * `meta.proposal_decision_history`. The receipt is written only when a live president holds the
 * seat (headless runs never get one), is never read by a simulation decision, and belongs in the
 * live/headless parity noise filter.
 *
 * Deterministic: no RNG, no wall clock; history is kept sorted by (resolved_turn, id).
 */

import type { FactionId, GameState, PendingProposalReview, ProposalDecisionRecord } from '../state/game_state.js';
import { proposalDecisionIdentity } from '../state/proposal_decision_history.js';
import { strictCompare } from '../state/validateGameState.js';

/**
 * The faction a live human holds: `player_faction` when set and the run is not headless
 * auto-control; null in headless runs and campaigns without a player. Unlike
 * `selectManualPlayerFaction` it does not depend on the autonomy level.
 */
export function selectLivePlayerFaction(state: GameState): FactionId | null {
    if (state.meta?.headless_scenario_auto_control === true) return null;
    return state.meta?.player_faction ?? null;
}

/** One decision applied by silence. `turn` is the turn the decision was surfaced. */
export interface SilenceReceipt {
    id: string;
    faction: FactionId;
    turn: number;
    domain: PendingProposalReview['domain'];
    description: string;
    proposed_action: string;
    /**
     * Whether the staff's choice adopted the surfaced proposal (an op plan launched, an
     * opportunity decided as recommended) or let the current value stand (a stance proposal).
     */
    adopted: boolean;
    proposed_value?: string;
    current_value?: string;
}

/**
 * Append the record-only "staff proceeded" receipt for a decision applied by silence. Inert
 * without a live president (headless, campaigns without a player). Deduplicated on the durable
 * identity (id, resolved_turn), so a retried write never doubles a row.
 */
export function recordSilenceReceipt(state: GameState, receipt: SilenceReceipt, resolvedTurn: number): void {
    if (selectLivePlayerFaction(state) == null) return;
    const meta = state.meta;
    const record: ProposalDecisionRecord = {
        id: receipt.id,
        turn: Math.min(receipt.turn, resolvedTurn),
        faction: receipt.faction,
        domain: receipt.domain,
        description: receipt.description,
        proposed_action: receipt.proposed_action,
        accepted: receipt.adopted,
        resolved_turn: resolvedTurn,
        resolved_by: 'silence',
        ...(receipt.proposed_value !== undefined ? { proposed_value: receipt.proposed_value } : {}),
        ...(receipt.current_value !== undefined ? { current_value: receipt.current_value } : {}),
    };
    const identity = proposalDecisionIdentity(record);
    const history = meta.proposal_decision_history ?? [];
    if (history.some((row) => proposalDecisionIdentity(row) === identity)) return;
    history.push(record);
    history.sort((left, right) => (left.resolved_turn - right.resolved_turn) || strictCompare(left.id, right.id));
    meta.proposal_decision_history = history;
}

/**
 * A surfaced review the player let pass its turn (apply-autonomy-transition; ruling Q3, H-6):
 * stamp it resolved as the staff's choice, never as his refusal. Record-only for every kind: the
 * staff already acted on the headless turn. An op plan (`APPROVE_OP:`) launched on the staff's
 * clock, so it reads adopted; a stance proposal left the staff's stance standing, so it reads not
 * adopted; an opportunity review stages no decision at all (the staff decides that opportunity
 * itself each turn, on the headless clock, in apply-bot-opportunity-decisions), so the next
 * turn's consumer has nothing to apply. Mutates the row; returns nothing.
 */
export function stampLapsedReviewAsStaffChoice(review: PendingProposalReview, turn: number): void {
    review.resolved_turn = turn;
    review.resolved_by = 'silence';
    if (review.proposed_action.startsWith('OPPORTUNITY:')) return;
    review.accepted = review.proposed_action.startsWith('APPROVE_OP:');
}

/**
 * Resolve one surfaced decision the player left unanswered as the staff's choice: run
 * `applyStaffChoice` (the bot path's own call) and record the silence receipt. Returns what
 * `applyStaffChoice` returns. The receipt is skipped when `applyStaffChoice` returns `false`
 * (nothing was applied, e.g. the decision no longer exists).
 */
export function resolveBySilence<T>(
    state: GameState,
    receipt: SilenceReceipt,
    applyStaffChoice: () => T,
): T {
    const result = applyStaffChoice();
    if (result !== false) recordSilenceReceipt(state, receipt, state.meta?.turn ?? receipt.turn);
    return result;
}
