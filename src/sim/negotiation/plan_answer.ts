/**
 * §6 E3a2: the peace-plan answer carrier (ruling items 1-3, 2026-11-17).
 *
 * A routed card declares `plan_answer` on every response option (null = no write). The
 * applier of a choice never writes the plan record: it only logs the choice in
 * `military.event_decision_log`, as every applier already does (bot path, player path,
 * Observer sweep). evaluate-peace-plans reads each side's answer back from that log through
 * the catalog's `plan_answer` and is the only resolver (peace_plans.ts).
 *
 * This module holds the reading rules (write-once; a routed row whose option the catalog
 * lacks throws; the conditional form), the plan owner (today's fallback: historical_responses
 * in historical mode and at Observer, the plan scorer in emergent mode, with the RBiH
 * Owen-Stoltenberg lock) and the bot rule (the owner decides A/R, the card applies the
 * data-declared option for that answer). It imports no event applier and no resolver, so
 * evaluate_events.ts and peace_plans.ts can both use it without a cycle.
 *
 * Deterministic: the log is read in its persisted order; options in authored order.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { PeacePlanDefinition } from '../../state/negotiation_types.js';
import type { EventDefinition, EventResponseOption, PlanAnswer } from '../events/event_types.js';
import { getPeacePlanById } from './peace_plan_data.js';
import { computePoliticalAssessment, getPoliticalPersonality } from '../political/political_personality.js';
import { computePoliticalPeacePlanResponse } from '../political/political_peace_plan.js';
import { pickPoliticalResponse } from '../political/political_event_decision.js';
import { getFactionTerritoryAreaPct } from '../osid_areas.js';
import { isWarOutsideHistoricalBand } from '../political/historical_territory_band.js';
import { isPoliticsOffHistoryFor } from '../political/political_departure_markers.js';

export type PlanResponse = 'accepted' | 'rejected';

export const PLAN_FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];

const OWEN_STOLTENBERG_PLAN_ID = 'owen_stoltenberg';

function isPlanFaction(value: unknown): value is FactionId {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

/** War week (turns since war start). */
export function planWarWeek(state: GameState): number {
    return state.meta.turn - (state.meta.war_start_turn ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Routed cards
// ═══════════════════════════════════════════════════════════════════════════

/** A card is routed when its response options declare `plan_answer` (a value or null). */
export function isRoutedPeacePlanCard(def: Pick<EventDefinition, 'response_options'>): boolean {
    return (def.response_options ?? []).some((option) => Object.prototype.hasOwnProperty.call(option, 'plan_answer'));
}

/** The plan a routed card answers: the one plan its non-null answers name. Throws on two. */
export function routedCardPlanId(def: Pick<EventDefinition, 'id' | 'response_options'>): string | null {
    let planId: string | null = null;
    for (const option of def.response_options ?? []) {
        const answer = option.plan_answer;
        if (answer == null) continue;
        if (planId !== null && planId !== answer.plan_id) {
            throw new Error(`§6 E3a2: routed card ${def.id} answers two plans (${planId}, ${answer.plan_id})`);
        }
        planId = answer.plan_id;
    }
    return planId;
}

/** Routed cards by event id (first catalog occurrence wins, as in evaluate_events). */
export function collectRoutedPeacePlanCards(defs: readonly EventDefinition[]): Map<string, EventDefinition> {
    const routed = new Map<string, EventDefinition>();
    for (const def of defs) {
        if (routed.has(def.id) || !isRoutedPeacePlanCard(def)) continue;
        routed.set(def.id, def);
    }
    return routed;
}

/** Does a pending decision for `faction` declare an answer to `planId` (from its stored options)? */
export function hasPendingRoutedDecision(state: GameState, planId: string, faction: FactionId): boolean {
    return (state.military.pending_event_decisions ?? []).some((decision) => (
        decision.faction === faction
        && (decision.response_options ?? []).some((option) => option.plan_answer?.plan_id === planId)
    ));
}

// ═══════════════════════════════════════════════════════════════════════════
// Reading the record (ruling item 1)
// ═══════════════════════════════════════════════════════════════════════════

export interface RecordedPlanAnswer {
    faction: FactionId;
    answer: PlanAnswer;
    event_id: string;
    response_id: string;
    turn: number;
}

/**
 * Each side's recorded answer to `planId`, read from `event_decision_log` in its persisted
 * order through the catalog's `plan_answer`.
 *
 * - A logged routed choice whose option the catalog lacks throws (no silent fallback).
 * - A `null` answer records nothing (the Owen-Stoltenberg Presidency accept).
 * - Write-once: a second non-null answer for one (plan, side) throws.
 */
export function readRecordedPlanAnswers(
    state: GameState,
    routedCards: ReadonlyMap<string, EventDefinition>,
    planId: string,
): Map<FactionId, RecordedPlanAnswer> {
    const recorded = new Map<FactionId, RecordedPlanAnswer>();
    for (const row of state.military.event_decision_log ?? []) {
        const def = routedCards.get(row.event_id);
        if (!def || routedCardPlanId(def) !== planId) continue;
        const option = (def.response_options ?? []).find((candidate) => candidate.id === row.response_id);
        if (!option) {
            throw new Error(
                `§6 E3a2: routed decision ${row.event_id}#${row.response_id} is not in the event catalog; `
                + 'the plan answer cannot be read',
            );
        }
        const answer = option.plan_answer;
        if (answer == null) continue;
        const faction = row.faction ?? def.responding_faction ?? null;
        if (!isPlanFaction(faction)) {
            throw new Error(`§6 E3a2: routed decision ${row.event_id}#${row.response_id} has no canonical faction`);
        }
        const previous = recorded.get(faction);
        if (previous) {
            throw new Error(
                `§6 E3a2 write-once: second answer for (${planId}, ${faction}): `
                + `${previous.event_id}#${previous.response_id} (turn ${previous.turn}) then `
                + `${row.event_id}#${row.response_id} (turn ${row.turn})`,
            );
        }
        recorded.set(faction, { faction, answer, event_id: row.event_id, response_id: row.response_id, turn: row.turn });
    }
    return recorded;
}

/**
 * Evaluate a complete answer set (ruling item 2). Unconditional answers stand; a conditional
 * answer reads the other side's answer in the same set. A side missing from `answers` reads as
 * `rejected` for a condition (it has not accepted).
 */
export function finalizePlanAnswers(answers: Partial<Record<FactionId, PlanAnswer>>): Partial<Record<FactionId, PlanResponse>> {
    const plain: Partial<Record<FactionId, PlanResponse>> = {};
    for (const faction of PLAN_FACTIONS) {
        const answer = answers[faction];
        if (answer) plain[faction] = answer.response;
    }
    const final: Partial<Record<FactionId, PlanResponse>> = {};
    for (const faction of PLAN_FACTIONS) {
        const answer = answers[faction];
        if (!answer) continue;
        const condition = answer.accepted_if;
        if (!condition) {
            final[faction] = answer.response;
            continue;
        }
        final[faction] = (plain[condition.faction] ?? 'rejected') === condition.response ? 'accepted' : answer.response;
    }
    return final;
}

// ═══════════════════════════════════════════════════════════════════════════
// The plan owner (today's fallback) and the bot rule (ruling item 3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The plan scorer (formerly peace_plans.ts computeBotResponse).
 *
 * Historian-verified design (political_peace_plan.ts):
 * - RS territory floor (gap > per-plan floor) → hard reject; patron override bypassed.
 * - RBiH defiance from weakness via survivalScore in scorePoliticalOption.
 * - HRHB patron_sensitivity = 0.80 (confirmed correct for all plans).
 * - Patron hard override at >= 80 override_authority.
 */
export function computeBotPlanResponse(state: GameState, plan: PeacePlanDefinition, faction: FactionId): PlanResponse {
    const personality = getPoliticalPersonality(faction);
    const assessment = computePoliticalAssessment(state, faction, personality);
    const patronOverrideAuthority = state.military.negotiation?.patron_relationships[faction]?.override_authority ?? 0;
    return computePoliticalPeacePlanResponse(
        plan,
        faction,
        getFactionTerritoryAreaPct(state, faction),
        patronOverrideAuthority,
        assessment,
        personality,
        planWarWeek(state),
        plan.historical_responses[faction],
        isWarOutsideHistoricalBand(state) || isPoliticsOffHistoryFor(state, faction),
    );
}

/**
 * The plan owner's answer for a side (today's fallback): historical_responses in historical
 * mode and when `forceHistorical` (Observer), the plan scorer in emergent mode.
 *
 * Owen-Stoltenberg's RBiH position is owned by the documented Presidency -> Assembly
 * sequence, so it keeps the historical (terminal Assembly) answer even in an emergent
 * campaign: a generic political score could otherwise pre-accept and end the war before that
 * faction-owned final disposition is reached (the "RBiH OS lock").
 */
export function planOwnerResponse(
    state: GameState,
    plan: PeacePlanDefinition,
    faction: FactionId,
    forceHistorical: boolean,
): PlanResponse {
    const historical = forceHistorical
        || state.meta.decision_mode !== 'emergent'
        || (plan.id === OWEN_STOLTENBERG_PLAN_ID && faction === 'RBiH');
    if (!historical) return computeBotPlanResponse(state, plan, faction);
    const response = plan.historical_responses[faction];
    if (response == null) throw new Error(`Peace plan ${plan.id} has no historical response for ${faction}`);
    return response;
}

export interface RoutedBotSelection {
    chosen: EventResponseOption;
    decisionSource: 'bot_political' | 'bot_ai_default';
}

/**
 * The bot rule for a routed card (ruling item 3). The plan owner decides A or R when the card
 * fires (a plan already on the record is matched instead: its answer is ignored anyway). The
 * card then applies an option whose data declares that answer, or that writes nothing (null):
 * the authored default when it qualifies, else (emergent) the card scorer among the qualifying
 * options, else the first in authored order. A conditional option has no fixed answer of its
 * own, so a bot never picks it.
 */
export function selectRoutedBotOption(
    state: GameState,
    def: EventDefinition,
    faction: FactionId,
    forceHistorical: boolean,
): RoutedBotSelection {
    const planId = routedCardPlanId(def);
    const plan = planId == null ? undefined : getPeacePlanById(planId);
    if (!plan) throw new Error(`§6 E3a2: routed card ${def.id} names no known peace plan (${String(planId)})`);

    const resolvedRow = (state.military.negotiation?.peace_plan_history ?? [])
        .find((row) => row.plan_id === plan.id && row.resolved);
    const onRecord = resolvedRow?.responses[faction];
    const answer: PlanResponse = onRecord === 'accepted' || onRecord === 'rejected'
        ? onRecord
        : planOwnerResponse(state, plan, faction, forceHistorical);

    const options = def.response_options ?? [];
    const eligible = options.filter((option) => (
        option.plan_answer === null
        || (option.plan_answer != null && option.plan_answer.accepted_if == null && option.plan_answer.response === answer)
    ));
    if (eligible.length === 0) {
        throw new Error(`§6 E3a2: routed card ${def.id} has no option for the answer "${answer}"`);
    }

    const scored = state.meta.decision_mode === 'emergent' && !forceHistorical;
    const authoredDefault = options.find((option) => option.id === def.historical_default_response_id);
    if (authoredDefault && eligible.includes(authoredDefault)) {
        return { chosen: authoredDefault, decisionSource: scored ? 'bot_political' : 'bot_ai_default' };
    }
    if (scored) {
        const personality = getPoliticalPersonality(faction);
        const assessment = computePoliticalAssessment(state, faction, personality);
        return { chosen: pickPoliticalResponse(eligible, faction, assessment, personality), decisionSource: 'bot_political' };
    }
    return { chosen: eligible[0]!, decisionSource: 'bot_ai_default' };
}
