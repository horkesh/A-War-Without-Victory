// src/sim/ai_commander/army_commander_ai.ts
/**
 * Army-level AI decision orchestrator.
 * Runs once per bot faction per turn. Produces ArmyDecision.
 * Falls back to formula bot on API failure.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { AiClient } from './ai_client.js';
import type { ArmyDecision } from './ai_types.js';
import { buildArmyPrompt } from './prompt_builder.js';
import { parseArmyResponse } from './response_parser.js';
import { logDecision, getLoggedDecision } from './decision_log.js';

/**
 * Generate army-level decisions for a bot faction.
 * Returns ArmyDecision if AI succeeds, null if fallback to formula bot needed.
 */
export async function generateArmyDecision(
    state: GameState,
    faction: FactionId,
    client: AiClient | null
): Promise<ArmyDecision | null> {
    const turn = state.meta.turn;

    // Check replay log first
    const logged = getLoggedDecision(state, turn, 'army', faction);
    if (logged) return logged as ArmyDecision;

    // No client = formula bot
    if (!client || !client.isAvailable()) return null;

    try {
        const prompt = buildArmyPrompt(state, faction);
        if (prompt.model === 'formula') return null;

        const response = await client.generateDecision(prompt);
        const parsed = parseArmyResponse(response.content, faction, turn);

        if (!parsed) {
            console.warn(`[AI Commander] Failed to parse army response for ${faction} at turn ${turn}. Falling back to formula bot.`);
            return null;
        }

        // Log for replay
        logDecision(state, {
            turn,
            level: 'army',
            faction,
            decision: parsed,
            model_used: response.model,
            prompt_tokens: response.prompt_tokens,
            completion_tokens: response.completion_tokens,
            ...(response.latency_ms != null ? { latency_ms: response.latency_ms } : {}),
        });

        return parsed;
    } catch (error) {
        console.warn(`[AI Commander] API error for ${faction} army at turn ${turn}:`, error);
        return null;
    }
}
