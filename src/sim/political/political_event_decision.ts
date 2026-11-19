/**
 * v0.8.2 Phase 2 — Political Event Decision Engine
 *
 * Scores and selects event response options using PoliticalPersonality + PoliticalAssessment.
 * Routes strategic_weighted, capital_based, capital_weighted logic types.
 * Falls back to pickBotResponseV1 for all other logic types.
 *
 * Contract:
 * - All inputs are pre-computed by the caller. No GameState reads in this file.
 * - Same inputs → same output (deterministic).
 * - No Math.random(), no Date.now().
 * - Ties broken by option.id lexicographic ascending.
 */

import type { EventResponseOption } from '../events/event_types.js';
import type { FactionId } from '../../state/game_state.js';
import type { PoliticalAssessment, PoliticalPersonality } from './political_personality.js';

/** Sum of an option's `patron_support` deltas for one faction (§6 E4 round 3). */
export function patronSupportDelta(option: EventResponseOption, faction: string): number {
    let sum = 0;
    for (const effect of option.effects ?? []) {
        if (effect.kind === 'patron_support' && effect.faction === faction) sum += effect.delta;
    }
    return sum;
}

/**
 * Scores a single response option for a given faction, using personality weights
 * and the current political assessment.
 *
 * Components:
 *   dimensionScore — weighted sum of dimension_shifts that apply to respondingFaction,
 *                    plus its patron_support delta at the patron_confidence weight
 *   riskScore      — bonus when personality tolerates more risk than the option demands
 *   aggressionScore — positive when (winning + aggressive option) or (losing + defensive option)
 *   patronScore    — high patron pressure + sensitive faction → prefer low-aggression options
 *
 * No clamping — only relative ordering between options matters.
 */
export function scorePoliticalOption(
    option: EventResponseOption,
    respondingFaction: FactionId,
    assessment: PoliticalAssessment,
    personality: PoliticalPersonality,
): number {
    // dimensionScore: sum over shifts that belong to this faction
    let dimensionScore = 0;
    if (option.dimension_shifts && option.dimension_shifts.length > 0) {
        for (const shift of option.dimension_shifts) {
            if (shift.faction !== respondingFaction) continue;
            const weight = personality.dimension_weights[shift.dimension] ?? 0;
            dimensionScore += shift.delta * weight;
        }
    }
    // §6 E4 round 3 (Q1, one carrier per patron change): a scope that carries patron_support
    // carries no patron_confidence twin, so the responding faction's patron_support delta is
    // scored at that faction's patron_confidence weight, as the dimension shift it replaces.
    dimensionScore += patronSupportDelta(option, respondingFaction)
        * (personality.dimension_weights['patron_confidence'] ?? 0);

    // riskScore: positive when personality tolerates more risk than option requires
    const riskScore = (personality.risk_tolerance - (option.risk_level ?? 0.5)) * 2.0;

    // aggressionScore: positive when (winning + aggressive) OR (losing + defensive)
    const aggressionScore =
        (option.aggression_affinity ?? 0)
        * ((assessment.blended_score / 100) - 0.5)
        * 1.5;

    // patronScore: high patron pressure + sensitive faction → prefer lower-aggression options.
    // A neutral option (aggression_affinity 0) is neither rewarded nor penalised.
    const affinity = option.aggression_affinity ?? 0;
    const patronScore =
        (assessment.patron_pressure / 100)
        * personality.patron_sensitivity
        * (affinity < 0 ? 0.5 : affinity > 0 ? -0.5 : 0);

    // survivalScore: survival-internationalist factions (RBiH) favor defiant options when weak,
    // because international legitimacy substitutes for military strength.
    // Historian-verified: Izetbegovic rejected Cutileiro, Owen-Stoltenberg from weakness via
    // international_standing, not military position (ICTY IT-95-5/18 paras. 54-56).
    const defianceIntensity =
        personality.archetype === 'survival_internationalist' && assessment.situation_score < 50
            ? Math.max(0, (50 - assessment.situation_score) / 50)
            : 0;
    const intStandingWeight = personality.dimension_weights['international_standing'] ?? 0;
    const survivalScore =
        (option.aggression_affinity ?? 0) > 0
            ? defianceIntensity * intStandingWeight * 0.40
            : 0;

    // trendScore: gaining territory → prefer aggressive options; losing → prefer defensive
    const TREND_MAGNITUDE = 0.25;
    const trendRaw =
        assessment.territory_trend === 'gaining' ? TREND_MAGNITUDE
        : assessment.territory_trend === 'losing' ? -TREND_MAGNITUDE
        : 0;
    const trendScore = trendRaw * (option.aggression_affinity ?? 0);

    return dimensionScore + riskScore + aggressionScore + patronScore + survivalScore + trendScore;
}

/**
 * Picks the best response option for a faction using political personality scoring.
 *
 * - All options are scored via scorePoliticalOption().
 * - Highest score wins.
 * - Tie-break: lexicographically smaller option.id wins (deterministic).
 *
 * Throws if options array is empty.
 */
export function pickPoliticalResponse(
    options: EventResponseOption[],
    respondingFaction: FactionId,
    assessment: PoliticalAssessment,
    personality: PoliticalPersonality,
): EventResponseOption {
    if (options.length === 0) {
        throw new Error('[political_event_decision] pickPoliticalResponse called with no options');
    }

    let bestOption = options[0];
    let bestScore = scorePoliticalOption(options[0], respondingFaction, assessment, personality);

    for (let i = 1; i < options.length; i++) {
        const opt = options[i];
        const score = scorePoliticalOption(opt, respondingFaction, assessment, personality);

        if (score > bestScore || (score === bestScore && opt.id < bestOption.id)) {
            bestScore = score;
            bestOption = opt;
        }
    }

    return bestOption;
}

/**
 * The divergence rule (B5 fix 4; `divergence_threshold` in political_personality.ts).
 *
 * An emergent bot keeps to the historical choice unless BOTH hold:
 *  - `warOffHistory`: the war's map has left history's territory band
 *    (historical_territory_band.ts `isWarOutsideHistoricalBand`);
 *  - the alternative beats the historical choice by MORE than the faction's
 *    `divergence_threshold` (a tie or a smaller margin keeps history).
 */
export function divergesFromHistory(
    bestScore: number,
    historicalScore: number,
    personality: PoliticalPersonality,
    warOffHistory: boolean,
): boolean {
    if (!warOffHistory) return false;
    return bestScore - historicalScore > personality.divergence_threshold;
}

/**
 * pickPoliticalResponse with an authored historical response as the reference.
 * Returns the historical option unless `divergesFromHistory` lets the best-scoring one through.
 * Without a matching historical option it is plain pickPoliticalResponse.
 */
export function pickPoliticalResponseWithHistory(
    options: EventResponseOption[],
    respondingFaction: FactionId,
    assessment: PoliticalAssessment,
    personality: PoliticalPersonality,
    historicalOptionId: string | undefined,
    warOffHistory: boolean,
): EventResponseOption {
    const best = pickPoliticalResponse(options, respondingFaction, assessment, personality);
    const historical = historicalOptionId != null ? options.find((o) => o.id === historicalOptionId) : undefined;
    if (!historical || best.id === historical.id) return best;
    const bestScore = scorePoliticalOption(best, respondingFaction, assessment, personality);
    const historicalScore = scorePoliticalOption(historical, respondingFaction, assessment, personality);
    return divergesFromHistory(bestScore, historicalScore, personality, warOffHistory) ? best : historical;
}
