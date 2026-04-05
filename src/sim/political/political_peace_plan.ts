/**
 * v0.8.2 Phase 3 — Political Peace Plan Response
 *
 * Computes personality-weighted accept/reject response for bot factions on peace plan events.
 *
 * Replaces the dumb territory-percentage + patron-override logic in peace_plans.ts.
 *
 * Historian-verified design:
 * - RS has a territory floor: gap > 18pp → hard reject regardless of patron pressure
 *   (ICTY: Vance-Owen 35pp gap = 96-2 assembly rejection; Contact Group 21pp gap = 96% referendum)
 * - RBiH defiance modifier fires in scorePoliticalOption (survivalScore component)
 * - HRHB patron_sensitivity = 0.80 confirmed correct across all plans
 * - Cutileiro (plan.id === 'cutileiro') excluded from personality scoring; use legacy bot
 * - Patron hard override at >= 80 (raised from 50; at 50 patron already dominates via patronScore)
 *
 * Deterministic: no Math.random(), no Date.now(). Tie-break: 'accept' < 'reject' lexicographically.
 */

import type { FactionId } from '../../state/game_state.js';
import type { PeacePlanDefinition } from '../../state/negotiation_types.js';
import type { PoliticalAssessment, PoliticalPersonality } from './political_personality.js';
import { scorePoliticalOption } from './political_event_decision.js';
import type { EventResponseOption } from '../events/event_types.js';

const RS_TERRITORY_FLOOR_GAP = 18; // pp gap above which RS hard-rejects (Historian: VOPP=35pp, CG=21pp, O-S=13pp)
const PATRON_HARD_OVERRIDE_THRESHOLD = 80; // override_authority >= this → always accept

/**
 * Compute a bot faction's accept/reject response to a peace plan using political personality scoring.
 *
 * Call site contract: caller (peace_plans.ts computeBotResponse) passes:
 *   - plan: the PeacePlanDefinition
 *   - faction: the responding bot faction
 *   - currentTerritoryPct: faction's current OSID-count territory percentage (caller computes via getFactionTerritoryPct)
 *   - patronOverrideAuthority: the faction's patron override_authority from NegotiationState
 *   - assessment: computed by computePoliticalAssessment
 *   - personality: from getPoliticalPersonality
 *
 * Returns 'accepted' or 'rejected'.
 */
export function computePoliticalPeacePlanResponse(
    plan: PeacePlanDefinition,
    faction: FactionId,
    currentTerritoryPct: number,
    patronOverrideAuthority: number,
    assessment: PoliticalAssessment,
    personality: PoliticalPersonality,
): 'accepted' | 'rejected' {
    // Cutileiro exclusion: pre-war plan with non-genuine acceptance dynamics.
    // Use legacy bot (caller should handle this before calling here, but guard defensively).
    if (plan.id === 'cutileiro') {
        // Fallback: accept if plan gives >= current territory OR patron override active.
        // This matches the historical reality that all three sides initially signed.
        return (plan.proposed_split[faction] ?? 0) >= currentTerritoryPct || patronOverrideAuthority > 50
            ? 'accepted'
            : 'rejected';
    }

    // RBiH Owen-Stoltenberg tactical acceptance branch.
    // When RBiH is in a weak position (situation_score < 50) and evaluates O-S, it accepts for
    // international optics: O-S is always evaluated when RS controls ~63%+ of territory (well above
    // any RS accept threshold), so RS will hard-reject. Izetbegovic's initialing on HMS Invincible
    // (August 1993) was precisely this calculation — accept knowing RS will refuse, isolating RS
    // diplomatically. Sources: ICTY IT-95-5/18-T (Karadzic trial, O-S initialing); Owen "Balkan Odyssey".
    if (faction === 'RBiH' && plan.id === 'owen_stoltenberg' && assessment.situation_score < 50) {
        return 'accepted';
    }

    // RS territory floor: gap > 18pp → hard reject (patron override cannot override this).
    // Historian: RS assembly voted 96-2 against VOPP (35pp gap), 96% referendum against Contact Group (21pp gap).
    if (faction === 'RS') {
        const proposedPct = plan.proposed_split['RS'] ?? 0;
        const territoryGap = currentTerritoryPct - proposedPct;
        if (territoryGap > RS_TERRITORY_FLOOR_GAP) {
            return 'rejected';
        }
    }

    // Patron hard override: extreme patron authority forces acceptance.
    // Only fires when territory floor has NOT already forced rejection (checked above).
    if (patronOverrideAuthority >= PATRON_HARD_OVERRIDE_THRESHOLD) {
        return 'accepted';
    }

    // Construct two synthetic options and score via the political personality engine.
    // Territory signal: proposed gain adjusts accept option's aggression_affinity.
    const proposedPct = plan.proposed_split[faction] ?? 0;
    const territoryGain = proposedPct - currentTerritoryPct;
    // Normalize territory gain to [-0.3, +0.3] bias on accept option's aggression.
    // Positive gain → accept looks less aggressive (more attractive to conciliatory personalities).
    const territoryBias = Math.max(-0.3, Math.min(0.3, territoryGain / 100));
    // Accept becomes less aggressive if plan is generous; cap at 0.0 (never actively aggressive to accept).
    const acceptAggression = Math.max(-1.0, Math.min(0.0, -0.5 - territoryBias));

    // Credibility signal: accepting avoids the reject penalty; rejecting incurs it.
    const credentialityChangeOnReject = plan.credibility_change_on_reject[faction] ?? 0;

    const acceptOption: EventResponseOption = {
        id: 'accept',
        label: 'Accept',
        effects: [],
        aggression_affinity: acceptAggression,
        risk_level: 0.3,
        dimension_shifts: [
            {
                faction,
                dimension: 'international_standing',
                // Accepting avoids the reject penalty (flip sign)
                delta: -credentialityChangeOnReject,
            },
        ],
    };

    const rejectOption: EventResponseOption = {
        id: 'reject',
        label: 'Reject',
        effects: [],
        aggression_affinity: 0.5,
        risk_level: 0.7,
        dimension_shifts: [
            {
                faction,
                dimension: 'international_standing',
                // Rejecting incurs the credibility cost
                delta: credentialityChangeOnReject,
            },
        ],
    };

    const acceptScore = scorePoliticalOption(acceptOption, faction, assessment, personality);
    const rejectScore = scorePoliticalOption(rejectOption, faction, assessment, personality);

    // Higher score wins. Tie-break: 'accept' < 'reject' lexicographically → accept wins ties.
    if (rejectScore > acceptScore) {
        return 'rejected';
    }
    return 'accepted';
}
