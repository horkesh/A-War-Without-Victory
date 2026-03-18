// src/sim/ai_commander/aar_narrative.ts
/**
 * After-Action Report (AAR) Narrative system.
 * Significant battles are narrated in the corps commander's voice via Haiku.
 * COSMETIC ONLY — never affects gameplay.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { AiPrompt } from './ai_types.js';
import type { AiClient } from './ai_client.js';
import { AI_TEMPERATURE } from './ai_config.js';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const AAR_MAX_TOKENS = 384;
const AAR_PER_TURN_CAP = 5;
const AAR_ROLLING_BUFFER = 20;

/** A finalized battle narrative stored on state. */
export interface BattleNarrative {
    turn: number;
    target_osid: string;
    corps_id: string;
    faction: FactionId;
    officer_name: string;
    narrative: string;
    tone: string;
    outcome: string;
}

/** Input data for constructing an AAR prompt. */
export interface AARPromptInput {
    officerName: string;
    faction: FactionId;
    corpsId: string;
    targetOsid: string;
    outcome: string;
    attackerCasualties: number;
    defenderCasualties: number;
    attackerBrigades: string[];
    defenderBrigades: string[];
    territoryChanged: boolean;
}

/** Queue entry accumulated during synchronous combat resolution. */
export interface NarrativeQueueEntry {
    faction: FactionId;
    corpsId: string;
    input: AARPromptInput;
}

/**
 * Returns true if a battle is significant enough to warrant a narrative.
 * Criteria: decisive/catastrophic outcome, OR territory changed, OR ≥200 total casualties.
 */
export function isSignificantBattle(info: {
    outcome: string;
    territoryChanged: boolean;
    attackerCasualties: number;
    defenderCasualties: number;
}): boolean {
    const totalCasualties = info.attackerCasualties + info.defenderCasualties;
    if (info.outcome === 'decisive_victory' || info.outcome === 'catastrophic') return true;
    if (info.territoryChanged) return true;
    if (totalCasualties >= 200) return true;
    return false;
}

/**
 * Builds an AiPrompt asking Haiku to write a short field report in the
 * commander's voice. Returns JSON with `{ narrative, tone }`.
 */
export function buildAARPrompt(input: AARPromptInput): AiPrompt {
    const locationLabel = input.targetOsid.split(':').slice(1).join(' ').replace(/_/g, ' ');
    const factionLabel = input.faction === 'RS' ? 'VRS' : input.faction === 'RBiH' ? 'ARBiH' : 'HVO';
    const outcomeLabel = input.outcome.replace(/_/g, ' ');
    const territoryNote = input.territoryChanged ? 'Territory changed hands.' : 'No territory changed hands.';
    const casualtyNote = `Attacker losses: ${input.attackerCasualties}. Defender losses: ${input.defenderCasualties}.`;

    const system = `You are ${input.officerName}, a ${factionLabel} corps commander in the 1992-1995 Bosnian War. Write a terse field report about a battle just concluded. 2-4 sentences, first person, military register. No embellishment — just the facts as a tired commander would write them. Output ONLY valid JSON with exactly two keys: "narrative" (string) and "tone" (one of: grim, resolute, bitter, satisfied, exhausted, relieved).`;

    const user = `Battle at ${locationLabel} (${input.corpsId}). Outcome: ${outcomeLabel}. ${territoryNote} ${casualtyNote} Attacking brigades: ${input.attackerBrigades.join(', ') || 'unknown'}. Defending brigades: ${input.defenderBrigades.join(', ') || 'unknown'}.`;

    return {
        system,
        user,
        model: HAIKU_MODEL,
        max_tokens: AAR_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
    };
}

/**
 * Parses a raw Haiku response into `{ narrative, tone }`.
 * Strips markdown code fences if present. Returns null on failure.
 */
export function parseAARResponse(raw: string): { narrative: string; tone: string } | null {
    try {
        // Strip code blocks
        let cleaned = raw.trim();
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        const parsed = JSON.parse(cleaned);
        if (typeof parsed.narrative !== 'string' || typeof parsed.tone !== 'string') return null;
        if (!parsed.narrative.trim() || !parsed.tone.trim()) return null;
        return { narrative: parsed.narrative.trim(), tone: parsed.tone.trim() };
    } catch {
        return null;
    }
}

/**
 * Processes the narrative queue (capped at AAR_PER_TURN_CAP), calls the AI client,
 * and returns finalized BattleNarrative records.
 *
 * @param state  Current game state (read-only, used for turn number).
 * @param queue  Queue entries accumulated this turn.
 * @param client  AI client with a `complete(prompt)` method.
 */
export async function generateBattleNarratives(
    state: GameState,
    queue: NarrativeQueueEntry[],
    client: AiClient
): Promise<BattleNarrative[]> {
    const turn = state.meta?.turn ?? 0;
    const toProcess = queue.slice(0, AAR_PER_TURN_CAP);
    const results: BattleNarrative[] = [];

    for (const entry of toProcess) {
        try {
            const prompt = buildAARPrompt(entry.input);
            const response = await client.generateDecision(prompt);
            const parsed = parseAARResponse(response.content);
            if (!parsed) continue;

            results.push({
                turn,
                target_osid: entry.input.targetOsid,
                corps_id: entry.corpsId,
                faction: entry.faction,
                officer_name: entry.input.officerName,
                narrative: parsed.narrative,
                tone: parsed.tone,
                outcome: entry.input.outcome,
            });
        } catch {
            // Non-fatal: a failed narrative is just omitted
        }
    }

    return results;
}

export { AAR_ROLLING_BUFFER };
