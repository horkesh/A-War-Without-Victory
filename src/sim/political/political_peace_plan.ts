/**
 * v0.8.2 Phase 7 — Political Peace Plan Response (Dayton plan + CG RBiH bonus)
 *
 * Computes personality-weighted accept/reject response for bot factions on peace plan events.
 *
 * Replaces the dumb territory-percentage + patron-override logic in peace_plans.ts.
 *
 * Historian-verified design:
 * - RS has per-plan territory floors (replaces single RS_TERRITORY_FLOOR_GAP=18 constant):
 *     vance_owen: 18pp floor (96-2 Bosnian Serb Assembly, May 1993 — ICTY IT-95-5/18-T §3526-3530)
 *     owen_stoltenberg: 18pp floor (51% assembly, Sep 1993 — routes to scoring when gap ~13pp)
 *     contact_group: 10pp floor (96% RS referendum, Aug 1994 — ICTY IT-95-5/18-T §3587)
 *     dayton: 3pp floor (post-Krajina post-Deliberate Force — RS held ~52%, proposed ~49%)
 *     default: 18pp (all other plans)
 * - Patron override immunity: vance_owen and contact_group are referendum-based — patron cannot override.
 *   Dayton is NOT immune — patron can override at >= 80.
 * - HRHB CG + Dayton alignment: post-Washington Agreement (w102), patron ≥ 60 → accepts CG and Dayton.
 *   Sources: ICTY Prlic et al. IT-04-74-T Vol. 3 §480-520; Washington Agreement (1 March 1994);
 *   Dayton GFAP (December 1995).
 * - RBiH Dayton endgame acceptance: warWeek >= 180 + patron >= 50 → accepts Dayton.
 *   Source: Holbrooke To End a War pp. 298-305; ICTY IT-95-5/18-T Vol. 4.
 * - RBiH CG acceptance bonus: +8 international_standing delta pushed into accept option.
 *   Source: UNSCR 942 (23 September 1994); Holbrooke p. 44; Burg & Shoup pp. 311-315.
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

// RS TERRITORY FLOOR — CANONICAL CONSTRAINTS
// Calibrated to documented RS legislative/referendum acts, not tuning.
// VOPP: 96–2 Bosnian Serb Assembly (May 1993) — ICTY IT-95-5/18-T paras. 3526-3530
//   Sim gap ~22pp (RS ~65%, VOPP proposes ~43%). Floor 18pp → 22 > 18 → hard-reject.
// O-S: 51% Bosnian Serb Assembly (September 1993) — PLAUSIBLE; gap ~13pp < 18pp → routes to scoring (correct)
// CG: 96% RS referendum (August 1994) — ICTY IT-95-5/18-T §3587 period
//   Sim gap ~14pp (RS ~63%, CG proposes 49%). Floor 10pp → 14 > 10 → hard-reject.
const RS_PLAN_FLOOR_GAPS: Record<string, number> = {
    vance_owen:        18,  // gap ~22pp >> 18pp floor → hard-reject
    owen_stoltenberg:  18,  // gap ~13pp < 18pp floor → routes to scoring
    contact_group:     10,  // gap ~14pp >> 10pp floor → hard-reject (96% referendum)
    dayton:             3,  // Gap ~3pp at w185 post-Krajina post-Deliberate Force. RS held ~52%, proposed ~49%.
                            // Source: Dayton Annex 2; Holbrooke To End a War pp. 217-221; ICTY IT-04-81-T §§1480-1510.
                            // Calibration note: if RS holds 60%+ at w185 (Operation Storm not modelled), raise to 10pp.
};
const RS_FLOOR_GAP_DEFAULT = 18;

const PATRON_HARD_OVERRIDE_THRESHOLD = 80; // override_authority >= this → always accept

// PATRON OVERRIDE IMMUNITY
// Plans where the RS constitutional act was referendum-based — patron pressure cannot override.
// 96-2 Bosnian Serb Assembly (VOPP) and 96% referendum (CG) are patron-proof.
// Source: ICTY IT-95-5/18-T; Owen Balkan Odyssey
const RS_PATRON_OVERRIDE_IMMUNE = new Set(['vance_owen', 'contact_group']);

// HRHB WASHINGTON AGREEMENT ALIGNMENT
// Washington Agreement (March 1994, ~w102) created institutional alignment pressure on HRHB
// to accept the Contact Group plan alongside RBiH. Zagreb fully aligned with CG acceptance.
// Source: ICTY Prlic et al. IT-04-74-T Vol. 3 paras. 480-520; Washington Agreement (1 March 1994)
const WASHINGTON_AGREEMENT_WEEK = 102;
const HRHB_CG_ALIGNMENT_THRESHOLD = 60; // lowered from 80: post-Washington, patron confidence ≥ 60 → override

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
    warWeek: number = 0,
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

    // RBiH Dayton endgame acceptance branch.
    // By November 1995 (w185), Izetbegovic accepted Dayton under US pressure and war exhaustion.
    // Not a weakness acceptance (unlike O-S tactical branch) — acceptance from constrained leverage
    // with US patron actively pressing. Gate: warWeek >= 180 (Dayton proximity talks)
    // and patron >= 50 (requires credible US/IC backing).
    // Source: Holbrooke To End a War pp. 298-305; ICTY IT-95-5/18-T Vol. 4.
    if (faction === 'RBiH' && plan.id === 'dayton' && warWeek >= 180 && patronOverrideAuthority >= 50) {
        return 'accepted';
    }

    // RS territory floor: per-plan gap threshold → hard reject.
    // Uses per-plan floor from RS_PLAN_FLOOR_GAPS; defaults to RS_FLOOR_GAP_DEFAULT (18pp).
    // High negotiation pressure erodes the floor — accumulated war suffering makes factions
    // willing to accept deals they would have rejected earlier. At pressure ~4000 (typical w40),
    // the floor drops by up to 15 points. This is the core negative-sum mechanic: fighting
    // longer doesn't win, it just makes the eventual deal worse.
    if (faction === 'RS') {
        const proposedPct = plan.proposed_split['RS'] ?? 0;
        const territoryGap = currentTerritoryPct - proposedPct;
        const basePlanFloor = RS_PLAN_FLOOR_GAPS[plan.id] ?? RS_FLOOR_GAP_DEFAULT;
        const factionPressure = assessment.negotiation_pressure ?? 0;
        const pressureFloorReduction = Math.min(15, factionPressure / 267);
        const planFloor = Math.max(0, basePlanFloor - pressureFloorReduction);
        if (territoryGap > planFloor) {
            return 'rejected'; // RS territory floor — canonical constraint (pressure-adjusted)
        }
    }

    // Patron override immunity (RS only): referendum-based rejections are patron-proof.
    // vance_owen and contact_group cannot be overridden by patron pressure.
    const effectiveOverrideThreshold = (faction === 'RS' && RS_PATRON_OVERRIDE_IMMUNE.has(plan.id))
        ? Infinity  // patron cannot override; hard-reject fires on floor or scoring
        : PATRON_HARD_OVERRIDE_THRESHOLD; // 80 — unchanged for all other cases

    // HRHB CG + Dayton alignment — Washington Agreement structural bonus.
    // Post-Washington (w102), Zagreb-aligned HRHB accepts CG at lower patron threshold (60).
    // HRHB CG + Dayton alignment: Washington Agreement (March 1994, ~w102) created institutional
    // pressure on HRHB to accept both the Contact Group plan and Dayton (which ratified the same
    // territorial framework). Zagreb fully aligned with Western diplomatic track post-Washington.
    // Source: Prlic IT-04-74-T Vol. 3 paras. 480-520; Dayton GFAP (December 1995).
    // This block is completely separate from RS immunity above.
    const isPostWashington = warWeek > WASHINGTON_AGREEMENT_WEEK;
    const isHrhbCgAlignment =
        faction === 'HRHB'
        && (plan.id === 'contact_group' || plan.id === 'dayton')
        && isPostWashington;

    if (isHrhbCgAlignment && patronOverrideAuthority >= HRHB_CG_ALIGNMENT_THRESHOLD) {
        return 'accepted'; // Zagreb-aligned acceptance under Washington Agreement terms
    }

    // Patron hard override: extreme patron authority forces acceptance.
    // Only fires when territory floor has NOT already forced rejection (checked above).
    // For RS immune plans, effectiveOverrideThreshold = Infinity → never fires.
    if (patronOverrideAuthority >= effectiveOverrideThreshold) {
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

    // Contact Group asymmetric acceptance bonus for RBiH.
    // RBiH accepted CG (July 1994) while RS rejected by 96% referendum (August 1994).
    // This produced documented asymmetric diplomatic capital: UNSCR 942 imposed specific RS sanctions,
    // arms embargo discussion activated, international standing of RBiH as cooperative party established.
    // Bonus is unconditional (structural): evaluation order (HRHB→RBiH→RS) means RS decision is
    // unavailable at RBiH evaluation time; bonus is warranted whenever RBiH accepts CG.
    // Source: UNSCR 942 (23 September 1994); Holbrooke To End a War p. 44; Burg & Shoup pp. 311-315.
    if (faction === 'RBiH' && plan.id === 'contact_group') {
        // dimension_shifts is initialised as an array in the acceptOption literal above.
        acceptOption.dimension_shifts!.push({
            faction: 'RBiH',
            dimension: 'international_standing',
            delta: 8,
        });
    }

    const acceptScore = scorePoliticalOption(acceptOption, faction, assessment, personality);
    const rejectScore = scorePoliticalOption(rejectOption, faction, assessment, personality);

    // Higher score wins. Tie-break: 'accept' < 'reject' lexicographically → accept wins ties.
    if (rejectScore > acceptScore) {
        return 'rejected';
    }
    return 'accepted';
}
