/**
 * Peace plan evaluation engine.
 *
 * §6 E3a2 (ruled 2026-11-17): each side answers a plan on its own routed card. The card's
 * option declares `plan_answer`; the applier only logs the choice in `event_decision_log`
 * (plan_answer.ts reads it back). evaluate-peace-plans is the only resolver: from a plan's
 * trigger week to its close week it writes one complete, resolved row in
 * `peace_plan_history` at the first step where all three answers are recorded. At the close
 * week a side with no recorded answer is answered by today's fallback: a bot by the plan
 * owner (historical_responses / the plan scorer), Observer by the historical owner, and a
 * human player by the `pending_peace_plan` pointer and its modal (the only pointer there is).
 * Costs land at resolution: the standing through the record, the plan's −5 support per
 * refusal, and the relationship event.
 *
 * Deterministic: canonical faction order, the log in persisted order, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { PeacePlanDefinition, PeacePlanResponse, NegotiationState } from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import type { EventDefinition, PlanAnswer } from '../events/event_types.js';
import { PEACE_PLANS, getPeacePlanById } from './peace_plan_data.js';
import { PEACE_PLAN_REJECTION_SUPPORT_COST, applyPatronSupportDelta } from './patron_pressure.js';
import { freezeEndgameSnapshot } from '../endgame/endgame_snapshot.js';
import { applyPeaceSettlement, isSettlementPlan } from './peace_settlement.js';
import { warDeadTotals } from './war_dead.js';
import { getFactionTerritoryAreaPct } from '../osid_areas.js';
import { recordSilenceReceipt, selectLivePlayerFaction } from '../player_override.js';
import {
    collectRoutedPeacePlanCards,
    finalizePlanAnswers,
    hasPendingRoutedDecision,
    planOwnerResponse,
    planWarWeek,
    readRecordedPlanAnswers,
    type PlanResponse,
} from './plan_answer.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];
const DAYTON_PLAN_ID = 'dayton';

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

/** Ensure negotiation state exists on the GameState. */
function ensureNegotiationState(state: GameState): NegotiationState {
    if (!state.military.negotiation) {
        const capital: Record<string, import('../../state/negotiation_types.js').NegotiationBreakdown> = {};
        const patron_relationships: Record<string, import('../../state/negotiation_types.js').PatronRelationship> = {};
        for (const faction of CANONICAL_FACTIONS) {
            capital[faction] = createEmptyCapital();
            patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }
        state.military.negotiation = {
            capital,
            patron_relationships,
            peace_plan_history: [],
        };
    }
    const negotiation = state.military.negotiation;
    // Save compatibility: older and diagnostic states may carry a partial
    // negotiation object. This boundary owns the writable collection
    // invariants used by resolution and its consequences.
    if (!Array.isArray(negotiation.peace_plan_history)) {
        negotiation.peace_plan_history = [];
    }
    if (!negotiation.capital) {
        negotiation.capital = {};
    }
    if (!negotiation.patron_relationships) {
        negotiation.patron_relationships = {};
    }
    for (const faction of CANONICAL_FACTIONS) {
        negotiation.capital[faction] ??= createEmptyCapital();
        negotiation.patron_relationships[faction] ??= createDefaultPatronRelationship(faction);
    }
    return negotiation;
}

// ═══════════════════════════════════════════════════════════════════════════
// Territory computation (for bot decisions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faction's current share of Bosnia and Herzegovina by AREA, 0..100 (owned by osid_areas.ts).
 *
 * Every plan's `proposed_split` is an area share (peace_plan_data.ts), so the
 * bot response must compare like with like. This used to be a settlement-count
 * ratio: at week 40 of a hands-off emergent run RS held 52.7% of settlements
 * but 63.4% of the area, so the RS Vance-Owen floor (gap vs 43%) read 9.7pp
 * instead of 20.4pp and RS accepted the plan, ending the war in January 1993.
 */
export { getFactionTerritoryAreaPct };

// ═══════════════════════════════════════════════════════════════════════════
// Main evaluation (called from pipeline)
// ═══════════════════════════════════════════════════════════════════════════

function isHumanPlayerFaction(state: GameState, faction: FactionId): boolean {
    return state.meta.player_faction === faction && (state.meta.autonomy_level ?? 0) < 3;
}

/**
 * The resolver's per-turn step (evaluate-peace-plans).
 *
 * For each routed plan without a row, from its trigger week to its close week (ruling item 9:
 * a window, not the exact week):
 * - all three answers on the log → one complete, resolved row (the conditional answer is
 *   evaluated here, on the other side's answer in the same set);
 * - at the close week, a bot side with no answer → the plan owner's answer; Observer → the
 *   historical answer; a live human player who left it unanswered → the plan owner's answer as
 *   headless gives it, by silence (§14.10a); only a headless run with an authored player gets
 *   the `pending_peace_plan` pointer (the modal);
 * - the fallback never pre-empts the human player's routed card that is still pending: the
 *   window then stays open past the close week until that card is answered (the card blocks
 *   the advance, so this is one turn at most on the desktop).
 * A plan whose window passed before it could open (a later-start scenario) is never opened.
 *
 * `eventDefinitions` is the turn's catalog (TurnInput.eventDefinitions); without it no routed
 * answer can be read and every side is answered by the fallback at the close week.
 */
export function evaluatePeacePlans(state: GameState, eventDefinitions: readonly EventDefinition[] = []): void {
    if (state.meta.phase !== 'war') return;
    if (state.meta.game_over) return;

    const neg = ensureNegotiationState(state);
    const routedCards = collectRoutedPeacePlanCards(eventDefinitions);

    // The close-week fallback is the only pointer; while it is pending it holds the step
    // (windows never overlap). It is answered by the modal (resolvePeacePlan), by the player's
    // routed answer if one reaches the log, or automatically at Observer.
    if (neg.pending_peace_plan) {
        settlePendingFallback(state, neg, routedCards);
        return;
    }

    const warWeek = planWarWeek(state);
    const humanFaction = CANONICAL_FACTIONS.find((faction) => isHumanPlayerFaction(state, faction)) ?? null;
    for (const plan of PEACE_PLANS) {
        // Dayton has its own package negotiation, trigger, and resolution flow.
        if (plan.id === DAYTON_PLAN_ID || plan.close_week == null) continue;
        if (warWeek < plan.trigger_week) continue;
        if (neg.peace_plan_history.some((entry) => entry.plan_id === plan.id)) continue;

        const recorded = readRecordedPlanAnswers(state, routedCards, plan.id);
        const humanCardPending = humanFaction != null && hasPendingRoutedDecision(state, plan.id, humanFaction);
        const inWindow = warWeek <= plan.close_week
            || humanCardPending
            || (humanFaction != null && recorded.has(humanFaction));
        if (!inWindow) continue;

        const answers: Partial<Record<FactionId, PlanAnswer>> = {};
        for (const [faction, entry] of recorded) answers[faction] = entry.answer;
        const complete = CANONICAL_FACTIONS.every((faction) => answers[faction] != null);
        if (!complete) {
            if (warWeek < plan.close_week) continue;
            if (humanCardPending) continue;
            // Player-override model (owner 2026-11-25, §14.10a; lane C s8 ruling Q7b, H-18): a
            // live President who left the plan unanswered by its close week gets the plan owner's
            // answer, exactly as headless gives that seat (no `forceHistorical`), on the close
            // week. Their explicit answer is the routed card (on the log above) or a pending
            // fallback modal from an older save. Only a headless run with an authored player
            // faction keeps the fallback pointer below, so its baselines stay byte-identical.
            const silentHuman = humanFaction != null && selectLivePlayerFaction(state) === humanFaction
                ? humanFaction
                : null;
            for (const faction of CANONICAL_FACTIONS) {
                if (answers[faction] != null || (faction === humanFaction && faction !== silentHuman)) continue;
                const response = planOwnerResponse(
                    state, plan, faction, faction === silentHuman ? false : state.meta.player_faction === faction,
                );
                answers[faction] = { plan_id: plan.id, response };
                if (faction === silentHuman) {
                    recordSilenceReceipt(state, {
                        id: `PEACE_PLAN_SILENCE_${plan.id}`,
                        faction,
                        turn: (state.meta.war_start_turn ?? 0) + plan.trigger_week,
                        domain: 'political',
                        description: `${plan.name} — staff proceeded: ${response}`,
                        proposed_action: `PEACE_PLAN:${plan.id}`,
                        adopted: true,
                        proposed_value: response,
                    }, state.meta.turn);
                }
            }
            if (humanFaction != null && answers[humanFaction] == null) {
                const final = finalizePlanAnswers(answers);
                const botResponses: Record<string, PlanResponse> = {};
                for (const faction of CANONICAL_FACTIONS) {
                    if (faction !== humanFaction) botResponses[faction] = final[faction]!;
                }
                neg.pending_peace_plan = {
                    plan_id: plan.id,
                    turn_offered: (state.meta.war_start_turn ?? 0) + plan.trigger_week,
                    bot_responses: botResponses,
                };
                return;
            }
        }
        const final = finalizePlanAnswers(answers);
        recordResolvedPlan(state, plan, final as Record<FactionId, PlanResponse>);
        if (state.meta.game_over) return;
    }
}

/**
 * The pending fallback: Observer answers it (the turn's step only); a routed answer already on
 * the log settles it.
 */
function settlePendingFallback(
    state: GameState,
    neg: NegotiationState,
    routedCards: ReadonlyMap<string, EventDefinition>,
    observerAnswers = true,
): void {
    const pending = neg.pending_peace_plan;
    if (!pending) return;
    const plan = getPeacePlanById(pending.plan_id);
    const playerFaction = state.meta.player_faction;
    if (!plan || playerFaction == null) return;
    if (observerAnswers && (state.meta.autonomy_level ?? 0) >= 3) {
        resolvePeacePlan(state, plan.id, planOwnerResponse(state, plan, playerFaction, true));
        return;
    }
    const recorded = readRecordedPlanAnswers(state, routedCards, plan.id).get(playerFaction);
    if (!recorded) return;
    const answers: Partial<Record<FactionId, PlanAnswer>> = { [playerFaction]: recorded.answer };
    for (const faction of CANONICAL_FACTIONS) {
        if (faction === playerFaction) continue;
        answers[faction] = { plan_id: plan.id, response: pending.bot_responses[faction] ?? 'rejected' };
    }
    const final = finalizePlanAnswers(answers);
    resolvePeacePlan(state, plan.id, final[playerFaction]!);
}

/**
 * Codex #827: settle a pending fallback from the player's routed answer as soon as the card is
 * answered, outside the turn. A v42 save can hold the pointer beside the player's own routed card
 * (the old rule opened the pointer at the trigger week; v43 keeps both). The desktop advance gate
 * blocks on the pointer before evaluate-peace-plans can read that answer, so the player would
 * otherwise answer the fallback modal a second time, and could contradict the card.
 *
 * The turn's own settle step, minus the Observer answer: the record is the logged answer. A no-op
 * without a pointer or without a recorded answer (a null answer, such as the Owen-Stoltenberg
 * Presidency accept, leaves the pointer to its modal). Fresh play never settles anything here: the
 * engine opens no pointer while the player's card is pending or answered, and the gate has every
 * pointer answered before the next turn runs.
 */
export function settlePendingPeacePlanFromRecord(state: GameState, eventDefinitions: readonly EventDefinition[]): void {
    const neg = state.military.negotiation;
    if (state.meta.phase !== 'war' || state.meta.game_over || !neg?.pending_peace_plan) return;
    settlePendingFallback(state, neg, collectRoutedPeacePlanCards(eventDefinitions), false);
}

/**
 * The harness guard for a deferred fallback (ruling item 9). A pending pointer holds the
 * plan step, so a harness that keeps deferring it would silently skip every later plan.
 * Throws when another routed plan's window has opened while a fallback is still pending.
 */
export function assertNoPeacePlanWindowSkipped(state: GameState): void {
    const pending = state.military.negotiation?.pending_peace_plan;
    if (!pending) return;
    const warWeek = planWarWeek(state);
    const history = state.military.negotiation?.peace_plan_history ?? [];
    for (const plan of PEACE_PLANS) {
        if (plan.id === pending.plan_id || plan.id === DAYTON_PLAN_ID || plan.close_week == null) continue;
        if (warWeek < plan.trigger_week) continue;
        if (history.some((entry) => entry.plan_id === plan.id)) continue;
        throw new Error(
            `§6 E3a2: the fallback for "${pending.plan_id}" is still pending at war week ${warWeek}, `
            + `inside the window of "${plan.id}"; deferring it would skip that plan`,
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the pending close-week fallback with the player's answer (PeacePlanModal /
 * `resolve-peace-plan` IPC). The other sides' answers are the pointer's.
 *
 * @param state - The current game state
 * @param planId - The peace plan ID being resolved
 * @param playerResponse - The player's decision ('accepted' or 'rejected')
 * @returns Summary of what happened
 */
export function resolvePeacePlan(
    state: GameState,
    planId: string,
    playerResponse: 'accepted' | 'rejected'
): { all_accepted: boolean; rejection_factions: FactionId[] } {
    const neg = ensureNegotiationState(state);
    const plan = getPeacePlanById(planId);

    if (!plan) {
        throw new Error(`Unknown peace plan ID: ${planId}`);
    }

    if (!neg.pending_peace_plan || neg.pending_peace_plan.plan_id !== planId) {
        throw new Error(`No pending peace plan with ID: ${planId}`);
    }

    const playerFaction = state.meta.player_faction ?? 'RBiH';
    const responses = {} as Record<FactionId, PlanResponse>;
    for (const faction of CANONICAL_FACTIONS) {
        responses[faction] = faction === playerFaction
            ? playerResponse
            : neg.pending_peace_plan.bot_responses[faction] ?? 'rejected';
    }
    return recordResolvedPlan(state, plan, responses, neg.pending_peace_plan.turn_offered);
}

/**
 * The one row writer: one complete, resolved row, then the consequences. Clears the pointer
 * for this plan if one is pending. `turn_offered` is the plan's trigger week (war_start +
 * trigger_week), or the pointer's own stamp on the fallback path.
 */
function recordResolvedPlan(
    state: GameState,
    plan: PeacePlanDefinition,
    responses: Record<FactionId, PlanResponse>,
    turnOffered: number = (state.meta.war_start_turn ?? 0) + plan.trigger_week,
): { all_accepted: boolean; rejection_factions: FactionId[] } {
    const neg = ensureNegotiationState(state);
    const allResponses: Record<string, 'accepted' | 'rejected' | 'pending'> = {};
    for (const faction of CANONICAL_FACTIONS) allResponses[faction] = responses[faction];

    const historyEntry: PeacePlanResponse = {
        plan_id: plan.id,
        turn_offered: turnOffered,
        responses: allResponses,
        resolved: true,
        // DC A1: stamp the toll at the moment of the answer, so the Dayton delegation
        // folder can state the dead since each refusal from the Verdict's own sources.
        resolved_turn: state.meta.turn,
        dead_at_resolution: warDeadTotals(state),
    };
    neg.peace_plan_history.push(historyEntry);

    if (neg.pending_peace_plan?.plan_id === plan.id) {
        neg.pending_peace_plan = undefined;
    }

    // Check if all factions accepted
    const rejectionFactions: FactionId[] = [];
    let allAccepted = true;
    for (const faction of CANONICAL_FACTIONS) {
        if (allResponses[faction] !== 'accepted') {
            allAccepted = false;
            rejectionFactions.push(faction);
        }
    }

    if (allAccepted) {
        // All factions accepted — game ends with peace plan outcome.
        state.meta.game_over = true;
        state.meta.outcome = `negotiated_peace:${plan.id}`;
        // LANE-2026-05-02-D1-WAR-ENDED-EARLY-PRODUCER:
        // Also set the `war_ended_early` event flag that
        // `src/sim/war_termination.ts:62` reads. The direct
        // `meta.game_over=true` write above already terminates the game
        // (war_termination short-circuits at the same-turn check), but
        // downstream consumers (UI, AAR, Cost Ledger, future event
        // pipelines) may read the flag rather than the meta state.
        // Setting both keeps the signal consistent across all consumers,
        // and converts a previously-phantom `flags.war_ended_early` branch
        // into a real producer. Faction-agnostic; only fires when ALL
        // factions accept the plan.
        if (!state.military.event_flags) state.military.event_flags = {};
        state.military.event_flags['war_ended_early'] = true;
        state.military.event_flags['early_peace_implemented'] = plan.id;
        // Owner, 2026-11-07: the parties agreed to the plan's MAP, not the front line.
        // Record the settlement (plan map + constitutional status) before the endgame
        // snapshot freezes the verdict. Wartime control is not rewritten.
        if (isSettlementPlan(plan.id)) applyPeaceSettlement(state, plan.id);
        // LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): freeze endgame snapshot so
        // verdict / cost ledger / historical comparison are preserved across
        // save/load round-trip even if subsequent engine activity perturbs
        // the state. Idempotent.
        freezeEndgameSnapshot(state);
    } else {
        // Apply rejection consequences
        applyRejectionConsequences(state, plan, rejectionFactions);
    }

    return {
        all_accepted: allAccepted,
        rejection_factions: rejectionFactions,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Rejection consequences
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The patron support cost and the relationship event, per refusal, at resolution.
 *
 * - Standing: carried by the record alone. The standing base reads each resolved refusal's
 *   graded `credibility_change_on_reject` (strategic_dimensions.ts); this writer no longer
 *   touches `event_modifier` (§6 E3a2 ruling item 5).
 * - Patron: the plan's −5 support is the one patron carrier of a refusal (§6 E3a2 ruling
 *   item 6; a routed R option carries no patron effect of its own), plus any patron act
 *   scripted on the record (CONTACT_GROUP_REJECTION, patron_events.ts).
 * - `override_change_on_reject` was retired by §6 E3a2 ruling item 7: update-patron-pressure
 *   rebuilt the override from scratch the same turn, so the bump only lived between turns
 *   on the player path.
 */
function applyRejectionConsequences(
    state: GameState,
    plan: PeacePlanDefinition,
    rejectionFactions: FactionId[]
): void {
    const neg = state.military.negotiation;
    if (!neg) return;

    for (const faction of rejectionFactions) {
        const pr = neg.patron_relationships[faction];
        if (pr) {
            // The one support writer (§6 E4 round 3): a cost below the floor spills into patron_confidence.
            applyPatronSupportDelta(neg, faction, -PEACE_PLAN_REJECTION_SUPPORT_COST);
            pr.relationship_events.push(`rejected_${plan.id}`);
        }
    }

    // §6 E3a1 D3: no capital.peace_plans_accepted/rejected pushes here. The entry already
    // recorded in peace_plan_history is the single source; computeNegotiationBreakdown rebuilds
    // those lists from it every turn, and the standing base reads the history directly.
}
