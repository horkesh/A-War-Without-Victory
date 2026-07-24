/**
 * v0.8.4 Phase C+D: Level 1 Assisted proposal generation.
 * Generates PendingProposalReview[] for the player to accept/reject before they take effect.
 * Called from the `generate-level1-proposals` and `generate-level1-op-proposals` pipeline steps.
 *
 * DETERMINISM: iterates corps sorted by strictCompare. No Math.random(), no Date.now().
 * Proposal IDs: `PROP_<turn>_<domain>_<seq>` where seq is 0-based index in this call's output.
 * proposed_action IDs:
 *   - Stance:  `SET_STANCE:<corps_id>:<stance_value>` (colon-delimited)
 *   - Op:      `APPROVE_OP:<corps_id>:<plan_id>` (colon-delimited)
 */

import type { FactionId, GameState, PendingProposalReview } from '../../state/game_state.js';
import type { CommanderState } from '../combat/commander/commander_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFactionCorps } from '../combat/bot_corps_helpers.js';
import { formatPlayerFacingZoneLabel } from '../../utils/player_facing_zone_label.js';

// ---------------------------------------------------------------------------
// Description enrichment helpers
// ---------------------------------------------------------------------------

/**
 * Formats a zone/staging_zone ID into a human-readable name.
 * Replaces underscores with spaces and title-cases each word.
 * Pure — no side effects, no randomness.
 */
function formatZoneName(zoneId: string): string {
    return formatPlayerFacingZoneLabel(zoneId);
}

/**
 * Maps ThreatAssessment.overall_pressure to a display label.
 * The type is already 'low' | 'moderate' | 'heavy' | 'critical' —
 * we normalise 'heavy' to 'High' for player-facing copy.
 */
function formatThreatLabel(pressure: string): string {
    switch (pressure) {
        case 'low':      return 'Low';
        case 'moderate': return 'Moderate';
        case 'heavy':    return 'High';
        case 'critical': return 'Critical';
        default:         return pressure;
    }
}

function playerFacingCommandName(name: string): string {
    return /(?:^|[_:])(corps|korpus)(?:[_:]|$)/i.test(name) || /^[a-z0-9]+(?:[_:][a-z0-9]+)+$/i.test(name)
        ? 'Assigned command'
        : name;
}

function playerFacingObjective(objective: string): string {
    const parts = objective.split(':').filter(Boolean);
    if ((parts[0] === 'op' || parts[0] === 'zone') && parts[1]) {
        return formatPlayerFacingZoneLabel(parts[1]);
    }
    if (/^plan[_:-]|^[a-z0-9]+(?:[_:][a-z0-9]+)+$/i.test(objective)) {
        return 'offensive operation';
    }
    return objective;
}

/**
 * Builds an enriched single-string description for an op proposal.
 *
 * Format (omits any segment where data is unavailable):
 *   "Zone: <name>. Force: <N> brigades. Threat: <label>. Plan: <objectiveDesc>"
 *
 * Graceful fallback: if no enrichment data is available at all, returns
 * objectiveDesc unchanged. Never returns an empty string.
 */
export function buildOpProposalDescription(
    corpsName: string,
    cs: CommanderState,
    objectiveDesc: string,
): string {
    const parts: string[] = [];

    // Zone: derive from current_plan.staging_zone (ZoneId branded string).
    const stagingZone = cs.current_plan?.staging_zone;
    if (stagingZone) {
        parts.push(`Zone: ${formatZoneName(stagingZone)}`);
    }

    // Force: count assigned brigades on the current plan.
    const assignedBrigades = cs.current_plan?.assigned_brigades;
    if (assignedBrigades != null && assignedBrigades.length > 0) {
        const n = assignedBrigades.length;
        parts.push(`Force: ${n} ${n === 1 ? 'brigade' : 'brigades'}`);
    }

    // Threat: use ThreatAssessment.overall_pressure (already a string label).
    const pressure = cs.threat_assessment?.overall_pressure;
    if (pressure) {
        parts.push(`Threat: ${formatThreatLabel(pressure)}`);
    }

    // Existing objective description always appended last.
    if (objectiveDesc) {
        parts.push(`Plan: ${playerFacingObjective(objectiveDesc)}`);
    }

    // If enrichment added nothing and objectiveDesc is empty, fall back to corps name.
    if (parts.length === 0) {
        return `${playerFacingCommandName(corpsName)} offensive operation`;
    }

    return parts.join('. ');
}

/**
 * Generates Level 1 Assisted stance proposals for the player faction.
 * Returns proposals where the formula AI recommends a stance change.
 * Returns [] when autonomy_level !== 1 or no proposals are warranted.
 *
 * Caller writes returned proposals to state.meta.pending_proposal_reviews.
 */
export function generateLevel1StanceProposals(
    state: GameState,
    playerFaction: FactionId
): PendingProposalReview[] {
    if (state.meta.autonomy_level !== 1) return [];

    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return [];

    const formations = state.military.formations ?? {};
    const corpsList = getFactionCorps(state, playerFaction);

    // Sort deterministically
    const sortedCorpsIds = corpsList.map(c => c.id).sort(strictCompare);

    const proposals: PendingProposalReview[] = [];

    for (const corpsId of sortedCorpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd) continue;

        // Skip if player already has a manual order — don't generate a competing proposal.
        if (cmd.player_ordered_stance != null) continue;

        // Requires ai_recommended_stance set by generateCorpsStanceOrders this turn.
        // If absent (e.g. corps was skipped due to no subordinates), skip.
        const proposedStance = cmd.ai_recommended_stance;
        if (!proposedStance) continue;

        const currentStance = cmd.stance;

        // Only propose when there is an actual change.
        if (proposedStance === currentStance) continue;

        // Build human-readable description using corps name if available.
        const corpsName = formations[corpsId]?.name ?? corpsId;
        const description = `Formula AI recommends ${corpsName} shift from ${currentStance} to ${proposedStance}.`;

        const seq = proposals.length;
        proposals.push({
            id: `PROP_${state.meta.turn}_military_${seq}`,
            turn: state.meta.turn,
            faction: playerFaction,
            domain: 'military',
            description,
            proposed_action: `SET_STANCE:${corpsId}:${proposedStance}`,
            current_value: currentStance,
            proposed_value: proposedStance,
            // accepted and resolved_turn left undefined (pending)
        });
    }

    return proposals;
}

/**
 * v0.8.4 Phase D: Generate Level 1 Assisted op-planning proposals for the player faction.
 * Returns proposals where a corps commander has a current plan that is ready to launch.
 * Returns [] when autonomy_level !== 1 or no corps qualifies.
 *
 * Caller writes returned proposals to state.meta.pending_proposal_reviews.
 * proposed_action format: `APPROVE_OP:<corpsId>:<planId>` (colon-delimited).
 */
export function generateLevel1OpProposals(
    state: GameState,
    playerFaction: FactionId
): PendingProposalReview[] {
    if (state.meta.autonomy_level !== 1) return [];

    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return [];

    const formations = state.military.formations ?? {};
    const corpsList = getFactionCorps(state, playerFaction);

    // Sort deterministically
    const sortedCorpsIds = corpsList.map(c => c.id).sort(strictCompare);

    const proposals: PendingProposalReview[] = [];

    for (const corpsId of sortedCorpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd) continue;

        const cs = cmd.commander_state;
        if (!cs) continue;

        // A trace records deliberation, not an issuable operation. Only a concrete
        // ready plan can cross into the presidential approval queue.
        const plan = cs.current_plan ?? null;
        const planIsReady = plan !== null && plan.status === 'ready';
        if (!planIsReady) continue;
        if (!Array.isArray(plan.target_osids) || plan.target_osids.length === 0) continue;

        // A response remains authoritative until the matching commander loop
        // consumes it. Its originating turn does not change the plan identity.
        if (
            cmd.player_op_response !== undefined &&
            cmd.player_op_response.plan_id === plan.plan_id
        ) {
            continue;
        }

        const corpsName = formations[corpsId]?.name ?? 'Assigned command';
        const planId = plan.plan_id;
        const proposedAction = `APPROVE_OP:${corpsId}:${planId}`;
        const exactPlanWasResolved = (state.meta.pending_proposal_reviews ?? []).some((review) =>
            review.faction === playerFaction
            && review.proposed_action === proposedAction
            && (review.accepted === true || review.accepted === false || review.resolved_turn != null)
        );
        if (exactPlanWasResolved) continue;
        const objectiveDesc = plan.objective_description || 'offensive operation';

        const description = buildOpProposalDescription(corpsName, cs, objectiveDesc);

        const seq = proposals.length;
        proposals.push({
            id: `PROP_${state.meta.turn}_ops_${seq}`,
            turn: state.meta.turn,
            faction: playerFaction,
            domain: 'ops',
            description,
            proposed_action: proposedAction,
            current_value: 'pending',
            proposed_value: 'approved',
        });
    }

    return proposals;
}
