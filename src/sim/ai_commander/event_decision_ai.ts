// src/sim/ai_commander/event_decision_ai.ts
/**
 * AI-driven event decision making.
 * Builds prompts for Claude to respond to events in character,
 * with fallback to formula bot when AI client is unavailable.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { EventDefinition, EventResponseOption } from '../events/event_types.js';
import type { AiClient } from './ai_client.js';
import type { AiPrompt } from './ai_types.js';
import { AI_TEMPERATURE } from './ai_config.js';

const EVENT_DECISION_MODEL = 'claude-haiku-4-5-20251001';
const EVENT_DECISION_MAX_TOKENS = 256;

/** Prompt structure returned by buildEventDecisionPrompt. Extends AiPrompt. */
export type EventDecisionPrompt = AiPrompt;

const FACTION_PERSONALITY: Record<string, string> = {
    RS: 'You are the political-military leadership of Republika Srpska. Think strategically about Serbian interests, territorial consolidation, and military advantage. You value decisive action and territorial control.',
    RBiH: 'You are the Bosnian government leadership. Think about defending sovereignty, international legitimacy, and protecting the civilian population. You seek international support and value proportionate responses.',
    HRHB: 'You are the Croatian Defence Council leadership. Think about Croatian interests in Bosnia, alliance management with both Zagreb and the Bosnian government, and territorial control in Herzegovina.',
};

/**
 * Build a prompt for the AI to decide how to respond to a game event.
 * Returns a structured prompt suitable for the AiClient.
 */
export function buildEventDecisionPrompt(
    state: GameState,
    faction: FactionId,
    eventDef: EventDefinition,
): EventDecisionPrompt {
    const personality = FACTION_PERSONALITY[faction] ?? `You are the ${faction} faction leadership.`;
    const turn = state.meta?.turn ?? 0;

    const options = (eventDef.response_options ?? [])
        .map((o, i) => `${i + 1}. "${o.id}" — ${o.label}${o.description ? ` (${o.description})` : ''}`)
        .join('\n');

    const userLines: string[] = [];
    userLines.push(`Turn: ${turn}. Faction: ${faction}.`);
    userLines.push('');
    userLines.push(`EVENT: ${eventDef.title ?? eventDef.id}`);
    if (eventDef.narrative) {
        userLines.push(eventDef.narrative);
    }

    if (options) {
        userLines.push('');
        userLines.push('OPTIONS:');
        userLines.push(options);
        userLines.push('');
        userLines.push('Respond with ONLY valid JSON: { "choice": "<option_id>", "reasoning": "<1-2 sentences>" }');
    } else {
        userLines.push('');
        userLines.push('This is a notification event. No action required.');
    }

    return {
        system: personality,
        user: userLines.join('\n'),
        model: EVENT_DECISION_MODEL,
        max_tokens: EVENT_DECISION_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
    };
}

/**
 * Generate an AI-driven event decision, with fallback to null (formula bot handles it).
 *
 * @param state - Current game state
 * @param faction - Faction that must respond
 * @param eventDef - The event definition requiring a response
 * @param client - AI client (null = formula bot fallback)
 * @returns The chosen response option, or null to fall back to formula bot
 */
export async function generateEventDecision(
    state: GameState,
    faction: FactionId,
    eventDef: EventDefinition,
    client: AiClient | null,
): Promise<EventResponseOption | null> {
    if (!client?.isAvailable() || !eventDef.response_options?.length) return null;

    const prompt = buildEventDecisionPrompt(state, faction, eventDef);
    try {
        const response = await client.generateDecision(prompt);
        const parsed = JSON.parse(response.content) as { choice?: string; reasoning?: string };
        if (!parsed.choice) return null;

        const chosen = eventDef.response_options.find(o => o.id === parsed.choice);
        // If AI returned unrecognized option, fall back to first option rather than null
        return chosen ?? eventDef.response_options[0];
    } catch {
        // Any failure (network, parse, etc.) — fall back to formula bot
        return null;
    }
}
