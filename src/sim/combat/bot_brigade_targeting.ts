/**
 * Bot brigade AI — target scoring and combat prediction helpers.
 *
 * Extracted from bot_brigade_ai_osid.ts (behavior-preserving refactor).
 * Deterministic: no randomness, no timestamps.
 */

import type {
    FactionId,
} from '../../state/game_state.js';
import {
    OUTCOME_SCORE,
    type CombatPrediction,
    type PredictedOutcome
} from './combat_predictor.js';
import type { Osid } from './osid_adjacency.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import { getCoEthnicScore } from './bot_brigade_supply_ethnic.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type DirectiveOutcome = 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum brigades that can attack the same target OSID per turn.
 * Set high (12 = MAX_PARTICIPATING_BRIGADES) — the coordination penalty
 * (0.8× for 3+) handles diminishing returns naturally. Historical: VRS
 * massed 4-6+ brigades for major ops (Corridor 92, Srebrenica 1995). */
export const MAX_ATTACKERS_PER_TARGET = 12;

/** Outcome ranking for threshold comparison. */
export const OUTCOME_RANK: Record<PredictedOutcome, number> = {
    decisive_victory: 6,
    victory: 5,
    costly_victory: 4,
    stalemate: 3,
    repulsed: 2,
    catastrophic: 1
};

// ═══════════════════════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════════════════════

export function outcomeRank(outcome: string): number {
    return OUTCOME_RANK[outcome as PredictedOutcome] ?? 1;
}

export function outcomeFromRank(rank: number): DirectiveOutcome {
    if (rank >= 6) return 'decisive_victory';
    if (rank >= 5) return 'victory';
    if (rank >= 4) return 'costly_victory';
    if (rank >= 3) return 'stalemate';
    return 'repulsed';
}

export function isOutcomeSufficientForAttack(actual: PredictedOutcome, minimum: PredictedOutcome): boolean {
    return (OUTCOME_RANK[actual] ?? 0) >= (OUTCOME_RANK[minimum] ?? 0);
}

/**
 * Estimate whether a coordinated attack (with already-assigned co-attackers)
 * would achieve a better outcome than the individual prediction.
 *
 * When evaluating a target that already has 1+ brigade assigned to attack it,
 * estimate the combined power ratio. Each additional attacker contributes
 * roughly 65% of one attacker's power (after coordination penalty).
 *
 * Returns the estimated combined outcome, or null if no improvement.
 */
export function estimateConcentratedOutcome(
    individualRatio: number,
    existingAttackers: number
): PredictedOutcome | null {
    if (existingAttackers <= 0) return null;
    // Each additional attacker adds ~85% of one brigade's power (mild coord penalty).
    // Actual attack resolution sums attacker powers independently, so the true ratio for
    // N equal brigades is N × individual_ratio. 0.85 accounts for sequential resolution
    // losses (each battle weakens the defender, but also costs the attacker).
    // N=1: ×1.85 (2 brigades)  N=2: ×2.70 (3 brigades)  N=3: ×3.55 (4 brigades)
    const combinedRatioMult = 1 + existingAttackers * 0.85;
    const estimatedRatio = individualRatio * combinedRatioMult;
    // Classify using same thresholds as combat predictor
    if (estimatedRatio >= 2.0) return 'decisive_victory';
    if (estimatedRatio >= 1.5) return 'victory';
    if (estimatedRatio >= 1.0) return 'costly_victory';
    if (estimatedRatio >= 0.7) return 'stalemate';
    if (estimatedRatio >= 0.5) return 'repulsed';
    return 'catastrophic';
}

/**
 * Score a target OSID based on corps directive + tactical factors.
 * Strategic priorities come from the directive (offensive_targets, avoid_osids).
 * Tactical factors: combat prediction, co-ethnic bonus, supply, counter-attack.
 *
 * This replaces the three faction-specific scoring functions.
 * Faction personality is embedded in the corps directive (what targets, what thresholds).
 */
export function scoreTargetFromDirective(
    osid: Osid,
    prediction: CombatPrediction,
    directive: import('../../state/game_state.js').CorpsDirective,
    faction: FactionId,
    ethnicMap?: OsidEthnicComposition,
    hasDirectiveTargetAdjacent?: boolean,
    offensiveTargetSet?: Set<Osid>,
    avoidOsidSet?: Set<Osid>
): number {
    const _offensiveTargetSet = offensiveTargetSet ?? new Set(directive.offensive_targets);
    const _avoidOsidSet = avoidOsidSet ?? new Set(directive.avoid_osids);
    let score = OUTCOME_SCORE[prediction.predicted_outcome] ?? 0;

    // Directive-driven: is this an offensive target?
    if (_offensiveTargetSet.has(osid)) {
        score += 200; // Corps wants this attacked
    }

    // Brigade conservatism: without corps offensive targets, default to territorial defense.
    // Historical brigades were territorial — only attacked when ordered by corps.
    if (_offensiveTargetSet.size === 0) {
        score -= 200; // No orders — hold position
    }

    // When corps has specific offensive targets, penalize non-priority targets.
    // Penalty scales with aggression: offensive corps (-100) let brigades grab adjacent
    // undefended territory; defensive corps (-250) lock brigades to directive targets only.
    // RS early war (aggression 0.35): -145 → undefended non-priority barely viable.
    // ARBiH defensive (aggression -0.20): -310 → non-priority fully blocked.
    if (_offensiveTargetSet.size > 0 && !_offensiveTargetSet.has(osid)) {
        const nonPriorityPenalty = Math.floor(-250 + directive.aggression_modifier * 300);
        score += Math.min(-100, nonPriorityPenalty); // Floor at -100 (never free)
    }

    // Directive-driven: avoid zone (OSID-based via directive.avoid_osids; currently empty in production)
    if (_avoidOsidSet.has(osid)) {
        score -= 500;
    }

    // Tactical bonuses (same for all factions — universal combat logic)
    if (!prediction.defender_has_brigade) score += 100; // Undefended
    if (prediction.is_counter_attack_opportunity) score += 180; // Counter-attack
    if (prediction.defender_has_brigade && (prediction.defender_cohesion < 30 || prediction.defender_casualty_percent > 0.15)) {
        score += 80; // Weak defender
    }

    // Tactical penalties — heavily reduced for directive targets (corps accepted the risk).
    // Overextension: avoid pushing into salients or positions that could be cut off.
    const isDirectiveTarget = _offensiveTargetSet.has(osid);
    const overextPenaltyScale = isDirectiveTarget ? 0.25 : 1.0;
    if (prediction.overextension_risk >= 3) score -= Math.floor(220 * overextPenaltyScale);
    if (prediction.overextension_risk >= 2) score -= Math.floor(120 * overextPenaltyScale);
    if (prediction.overextension_risk >= 1) score -= Math.floor(50 * overextPenaltyScale);
    if (prediction.attacker_casualty_percent > 0.20) score -= 150;
    // Cut-off risk: advancing to a tile with 0–1 friendly neighbors risks being isolated/cut off.
    const friendlyAfter = prediction.friendly_neighbors_after_capture ?? 2;
    if (friendlyAfter <= 1) score -= Math.floor(180 * overextPenaltyScale);
    // Line-shortening (consolidation): prefer capturing bulges — more friendly neighbors after
    // capture = shorter front (e.g. Teočak, Šapna historically). Bonus when 2+ friendly neighbors.
    if (friendlyAfter >= 3) score += 35;
    else if (friendlyAfter >= 2) score += 20;

    // Co-ethnic bonus (all factions fight harder for co-ethnic areas)
    score += getCoEthnicScore(osid, faction, ethnicMap);

    // Aggression modifier: flat bonus for offensive stances + multiplier for the whole score.
    // Flat component ensures stalemate targets (base 10) become viable when aggression is high.
    // Without this, a 1.3× multiplier on 10 only gives 13 — killed by any supply penalty.
    if (directive.aggression_modifier > 0) {
        score += Math.floor(directive.aggression_modifier * 120);
    }
    const aggressionMult = 1.0 + directive.aggression_modifier;
    score = Math.floor(score * aggressionMult);

    return score;
}
