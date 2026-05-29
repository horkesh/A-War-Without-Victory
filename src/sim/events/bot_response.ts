import type { EventResponseOption, EventDefinition, EventEffect } from './event_types.js';
import { DIMENSION_WEIGHTS } from './strategic_dimensions.js';

interface CommanderProfile {
    aggressiveness: number;  // 1-5
    competence: number;      // 1-5
}

function getNumericDelta(effect: EventEffect): number | undefined {
    return 'delta' in effect && typeof effect.delta === 'number'
        ? effect.delta
        : undefined;
}

/**
 * Personality-weighted bot response selection.
 * Deterministic: same profile + same options = same choice.
 */
export function pickBotResponseV1(
    options: EventResponseOption[],
    logic: EventDefinition['bot_response_logic'],
    commander: CommanderProfile,
    historicalDefaultResponseId?: string,
): EventResponseOption {
    if (options.length === 0) throw new Error('No options to pick from');
    if (options.length === 1) return options[0];

    if (logic === 'historical') {
        const historicalDefault = historicalDefaultResponseId
            ? options.find((option) => option.id === historicalDefaultResponseId)
            : undefined;
        return historicalDefault ?? options[0];
    }

    // accept_first is a legacy invariant: always first option.
    if (logic === 'accept_first') return options[0];

    // Reject all: always last option
    if (logic === 'reject_all') return options[options.length - 1];

    // Personality weighted
    if (logic === 'personality_weighted') {
        const aggrNorm = (commander.aggressiveness - 3) / 2; // [-1, 1]
        const compNorm = (commander.competence - 3) / 2;     // [-1, 1]

        let bestScore = -Infinity;
        let bestOption = options[0];

        for (const opt of options) {
            const aggrAffinity = opt.aggression_affinity ?? 0;
            const risk = opt.risk_level ?? 0.5;

            // Aggressive commanders like high aggression_affinity
            // Competent commanders avoid high risk
            const score = aggrAffinity * aggrNorm * 2 + (1 - risk) * compNorm;

            if (score > bestScore) {
                bestScore = score;
                bestOption = opt;
            }
        }

        return bestOption;
    }

    // Capital-based: score options by their dimension_shifts weighted by faction priorities.
    // The faction is derived from the first dimension_shift, or defaults to first option.
    if (logic === 'capital_based' || logic === 'capital_weighted' || logic === 'strategic_weighted') {
        let bestScore = -Infinity;
        let bestOption = options[0];

        for (const opt of options) {
            let score = 0;

            // Score dimension shifts by faction weights
            if (opt.dimension_shifts && opt.dimension_shifts.length > 0) {
                for (const shift of opt.dimension_shifts) {
                    const factionWeights = DIMENSION_WEIGHTS[shift.faction];
                    const weight = factionWeights?.[shift.dimension] ?? 0.10;
                    score += shift.delta * weight;
                }
            }

            // Score mechanical effects as tiebreaker
            if (opt.effects) {
                for (const eff of opt.effects) {
                    const delta = getNumericDelta(eff);
                    if (delta !== undefined) {
                        score += delta * 0.05;
                    }
                }
            }

            // For strategic_weighted, also factor in commander personality
            if (logic === 'strategic_weighted') {
                const aggrAffinity = opt.aggression_affinity ?? 0;
                const aggrNorm = (commander.aggressiveness - 3) / 2;
                score += aggrAffinity * aggrNorm;
            }

            if (score > bestScore) {
                bestScore = score;
                bestOption = opt;
            }
        }

        return bestOption;
    }

    // Default fallback: first option (historical)
    return options[0];
}
