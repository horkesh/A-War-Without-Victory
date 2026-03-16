// src/sim/ai_commander/player_advisor.ts
/**
 * On-demand player advisor.
 * Analyzes situation and returns recommendations when player clicks "Ask Commander".
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { AiClient } from './ai_client.js';
import type { AdvisorResponse } from './ai_types.js';
import { buildAdvisorPrompt } from './prompt_builder.js';
import { parseAdvisorResponse } from './response_parser.js';
import { logDecision } from './decision_log.js';

export async function getAdvisorRecommendation(
    state: GameState,
    faction: FactionId,
    contextType: 'situation_analysis' | 'operation_planning' | 'peace_plan',
    client: AiClient | null
): Promise<AdvisorResponse | null> {
    if (!client || !client.isAvailable()) {
        return {
            commander_name: 'Staff Officer',
            faction,
            assessment: 'AI Commander is not available. Check your API key in settings.',
            recommendations: [],
            context_type: contextType,
        };
    }

    try {
        const prompt = buildAdvisorPrompt(state, faction, contextType);
        if (prompt.model === 'formula') return null;

        const response = await client.generateDecision(prompt);
        const parsed = parseAdvisorResponse(response.content);

        if (!parsed) {
            return {
                commander_name: 'Staff Officer',
                faction,
                assessment: 'Failed to analyze the situation. Please try again.',
                recommendations: [],
                context_type: contextType,
            };
        }

        logDecision(state, {
            turn: state.meta.turn,
            level: 'advisor',
            faction,
            decision: parsed,
            model_used: response.model,
            prompt_tokens: response.prompt_tokens,
            completion_tokens: response.completion_tokens,
            latency_ms: response.latency_ms,
        });

        return parsed;
    } catch (error) {
        console.warn('[AI Advisor] Error:', error);
        return {
            commander_name: 'Staff Officer',
            faction,
            assessment: 'Communication error. Please try again.',
            recommendations: [],
            context_type: contextType,
        };
    }
}
