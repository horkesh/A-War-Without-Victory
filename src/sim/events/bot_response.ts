import type { EventResponseOption, EventDefinition } from './event_types.js';

interface CommanderProfile {
    aggressiveness: number;  // 1-5
    competence: number;      // 1-5
}

/**
 * Personality-weighted bot response selection.
 * Deterministic: same profile + same options = same choice.
 */
export function pickBotResponseV1(
    options: EventResponseOption[],
    logic: EventDefinition['bot_response_logic'],
    commander: CommanderProfile
): EventResponseOption {
    if (options.length === 0) throw new Error('No options to pick from');
    if (options.length === 1) return options[0];

    // Historical: always first option (the historical choice)
    if (logic === 'historical' || logic === 'accept_first') return options[0];

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

    // Default fallback (capital_based, capital_weighted, strategic_weighted): first option
    return options[0];
}
