/**
 * v0.8.4 Phase C: Level 1 Assisted proposal generation.
 * Generates PendingProposalReview[] for the player to accept/reject before they take effect.
 * Called from the `generate-level1-proposals` pipeline step.
 *
 * DETERMINISM: iterates corps sorted by strictCompare. No Math.random(), no Date.now().
 * Proposal IDs: `PROP_<turn>_<domain>_<seq>` where seq is 0-based index in this call's output.
 * proposed_action IDs: `SET_STANCE:<corps_id>:<stance_value>` (colon-delimited).
 */

import type { FactionId, GameState, PendingProposalReview } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFactionCorps } from '../combat/bot_corps_helpers.js';

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
