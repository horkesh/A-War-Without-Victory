/**
 * Peace plan evaluation engine.
 *
 * Checks whether a historical peace plan should fire on the current turn,
 * computes bot responses, and resolves accept/reject consequences.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { PeacePlanDefinition, PeacePlanResponse, NegotiationState } from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { PEACE_PLANS, getPeacePlanById } from './peace_plan_data.js';
import { PEACE_PLAN_REJECTION_SUPPORT_COST } from './patron_pressure.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPoliticalPersonality, computePoliticalAssessment } from '../political/political_personality.js';
import { computePoliticalPeacePlanResponse } from '../political/political_peace_plan.js';
import { freezeEndgameSnapshot } from '../endgame/endgame_snapshot.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

// ═══════════════════════════════════════════════════════════════════════════
// War week helper
// ═══════════════════════════════════════════════════════════════════════════

/** Compute the current war week (turns since war start). */
function getWarWeek(state: GameState): number {
    const warStart = state.meta.war_start_turn ?? 0;
    return state.meta.turn - warStart;
}

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
    return state.military.negotiation;
}

// ═══════════════════════════════════════════════════════════════════════════
// Territory computation (for bot decisions)
// ═══════════════════════════════════════════════════════════════════════════

/** Get faction's current territory percentage from political_controllers. */
function getFactionTerritoryPct(state: GameState, faction: FactionId): number {
    const controllers = state.political?.political_controllers;
    if (!controllers) return 0;

    const osids = Object.keys(controllers).sort(strictCompare);
    if (osids.length === 0) return 0;

    let factionCount = 0;
    for (const osid of osids) {
        if (controllers[osid] === faction) factionCount++;
    }

    // Simple OSID-count ratio (not area-weighted, but sufficient for bot decisions)
    return (factionCount / osids.length) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bot response logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine whether a bot faction accepts or rejects a peace plan.
 *
 * Phase 3: routes through the political personality engine for Vance-Owen,
 * Owen-Stoltenberg, and Contact Group. Cutileiro uses legacy fallback in
 * computePoliticalPeacePlanResponse.
 *
 * Historian-verified design:
 * - RS territory floor (gap > 18pp) → hard reject; patron override bypassed.
 * - RBiH defiance from weakness via survivalScore in scorePoliticalOption.
 * - HRHB patron_sensitivity = 0.80 (confirmed correct for all plans).
 * - Patron hard override at >= 80 override_authority (raised from legacy 50).
 */
function computeBotResponse(
    state: GameState,
    plan: PeacePlanDefinition,
    faction: FactionId
): 'accepted' | 'rejected' {
    const personality = getPoliticalPersonality(faction);
    const assessment = computePoliticalAssessment(state, faction, personality);
    const currentTerritoryPct = getFactionTerritoryPct(state, faction);

    const neg = state.military.negotiation;
    const patronOverrideAuthority = neg?.patron_relationships[faction]?.override_authority ?? 0;

    const warWeek = getWarWeek(state);

    return computePoliticalPeacePlanResponse(
        plan,
        faction,
        currentTerritoryPct,
        patronOverrideAuthority,
        assessment,
        personality,
        warWeek,
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main evaluation (called from pipeline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate whether a peace plan should trigger this turn.
 *
 * Called once per turn from the war_phases pipeline. If a plan's trigger_week
 * matches the current war week AND the plan hasn't been offered before,
 * creates a pending peace plan with bot responses pre-computed.
 *
 * The player faction's response remains 'pending' until resolved via
 * resolvePeacePlan().
 */
export function evaluatePeacePlans(state: GameState): void {
    if (state.meta.phase !== 'war') return;
    if (state.meta.game_over) return;

    const neg = ensureNegotiationState(state);

    // Don't trigger a new plan if one is already pending
    if (neg.pending_peace_plan) return;

    const warWeek = getWarWeek(state);

    // Check each plan in chronological order
    for (const plan of PEACE_PLANS) {
        if (plan.trigger_week !== warWeek) continue;

        // Skip if this plan was already offered
        const alreadyOffered = neg.peace_plan_history.some(h => h.plan_id === plan.id);
        if (alreadyOffered) continue;

        // Determine player faction (defaults to RBiH if not set)
        const playerFaction = state.meta.player_faction ?? 'RBiH';

        // Compute bot responses for non-player factions
        const botResponses: Record<string, 'accepted' | 'rejected'> = {};
        for (const faction of CANONICAL_FACTIONS) {
            if (faction === playerFaction) continue;
            botResponses[faction] = computeBotResponse(state, plan, faction);
        }

        // Create pending peace plan
        neg.pending_peace_plan = {
            plan_id: plan.id,
            turn_offered: state.meta.turn,
            bot_responses: botResponses,
        };

        // Only one plan per turn
        break;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolution (called when player responds)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve a pending peace plan after the player responds.
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

    // Build complete response map: bot responses + player response
    const allResponses: Record<string, 'accepted' | 'rejected' | 'pending'> = {};
    for (const faction of CANONICAL_FACTIONS) {
        if (faction === playerFaction) {
            allResponses[faction] = playerResponse;
        } else {
            allResponses[faction] = neg.pending_peace_plan.bot_responses[faction] ?? 'rejected';
        }
    }

    // Record in history
    const historyEntry: PeacePlanResponse = {
        plan_id: planId,
        turn_offered: neg.pending_peace_plan.turn_offered,
        responses: allResponses,
        resolved: true,
    };
    neg.peace_plan_history.push(historyEntry);

    // Clear pending plan
    neg.pending_peace_plan = undefined;

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
        state.meta.outcome = `peace_plan:${planId}`;
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
        state.military.event_flags['early_peace_implemented'] = planId;
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
 * Apply credibility and override authority changes to factions that rejected.
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
            const overrideChange = plan.override_change_on_reject[faction] ?? 0;
            pr.override_authority = clamp(pr.override_authority + overrideChange, 0, 100);
            pr.support_level = clamp(pr.support_level - PEACE_PLAN_REJECTION_SUPPORT_COST, 0, 100);
            pr.relationship_events.push(`rejected_${plan.id}`);
        }

        // Apply international credibility change → strategic_dimensions international_standing
        const credChange = plan.credibility_change_on_reject[faction] ?? 0;
        if (credChange !== 0) {
            if (neg.strategic_dimensions?.[faction]?.['international_standing']) {
                const dim = neg.strategic_dimensions[faction]['international_standing'];
                dim.event_modifier = clamp(dim.event_modifier + credChange, -100, 100);
                dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
            }
            if (neg.capital[faction]) {
                neg.capital[faction].peace_plans_rejected.push(plan.id);
            }
        }
    }

    // Factions that accepted get credit
    for (const faction of CANONICAL_FACTIONS) {
        if (rejectionFactions.includes(faction)) continue;
        if (neg.capital[faction]) {
            neg.capital[faction].peace_plans_accepted.push(plan.id);
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
