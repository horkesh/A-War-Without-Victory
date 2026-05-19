// src/sim/ai_commander/corps_dialogue.ts
/**
 * Corps commander dialogue responses — cosmetic flavor layer.
 * Officers acknowledge orders and surface concerns in character via Haiku API.
 * COSMETIC ONLY: never affects gameplay or state beyond storing the dialogue entries.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { AiClient } from './ai_client.js';
import type { AiPrompt } from './ai_types.js';
import { AI_TEMPERATURE } from './ai_config.js';
import { getCorpsCommander } from '../combat/officer_system.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CorpsDialogueEntry {
    turn: number;
    corps_id: string;
    faction: FactionId;
    officer_name: string;
    /** Short acknowledgment of the order in character (1–2 sentences). */
    acknowledgment: string;
    /** Optional concern or caveat raised by the officer. Empty string if none. */
    concern: string;
    /** Officer's confidence in the assigned mission: 'high' | 'medium' | 'low'. */
    confidence: 'high' | 'medium' | 'low';
}

/** Parsed shape from Haiku JSON output. */
interface DialogueRaw {
    acknowledgment: string;
    concern: string;
    confidence: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════
// Model constant
// ═══════════════════════════════════════════════════════════════════════════

const DIALOGUE_MODEL = 'claude-haiku-4-5-20251001';
const DIALOGUE_MAX_TOKENS = 256;

// ═══════════════════════════════════════════════════════════════════════════
// Faction display names
// ═══════════════════════════════════════════════════════════════════════════

const FACTION_NAMES: Record<string, string> = {
    RS: 'Army of Republika Srpska (VRS)',
    RBiH: 'Army of the Republic of Bosnia and Herzegovina (ARBiH)',
    HRHB: 'Croatian Defence Council (HVO)',
};

// ═══════════════════════════════════════════════════════════════════════════
// Prompt builder
// ═══════════════════════════════════════════════════════════════════════════

interface DialoguePromptInput {
    officerName: string;
    faction: FactionId;
    corpsId: string;
    aggressiveness: number;
    competence: number;
    stance: string;
    hasActiveOperation: boolean;
    operationName?: string;
    corpsPersonnel: number;
    corpsExhaustion: number;
    recentBattleSummary: string;
}

/**
 * Build an AiPrompt for a corps commander acknowledgment dialogue.
 * Returns a prompt ready to send to the Haiku model.
 */
export function buildCorpsDialoguePrompt(input: DialoguePromptInput): AiPrompt {
    const personalityLabel =
        input.aggressiveness >= 4 ? 'aggressive' :
        input.aggressiveness <= 1 ? 'cautious' :
        'balanced';

    const skillLabel =
        input.competence >= 4 ? 'highly competent' :
        input.competence <= 2 ? 'limited' :
        'capable';

    const factionName = FACTION_NAMES[input.faction] ?? input.faction;

    const system = `You are ${input.officerName}, a corps commander in the ${factionName}.
You are a ${skillLabel}, ${personalityLabel} officer.
Competence: ${input.competence}/5. Aggressiveness: ${input.aggressiveness}/5.

When given orders you respond in character: briefly acknowledge the order, optionally raise one practical concern, and state your confidence in success.
Keep responses short and military in tone. First-person voice. No flowery language.

You MUST respond with valid JSON only — no markdown, no commentary outside the JSON. Schema:
{
  "acknowledgment": "<1-2 sentences acknowledging the order in your voice>",
  "concern": "<one practical concern or empty string if none>",
  "confidence": "high|medium|low"
}`;

    const orderContext = input.hasActiveOperation
        ? `Current order: Execute operation "${input.operationName ?? 'unnamed'}" (${input.stance} stance).`
        : `Current order: Maintain ${input.stance} posture. No active operation.`;

    const statusLines: string[] = [
        `Corps: ${input.corpsId}`,
        `Personnel strength: ${input.corpsPersonnel}`,
        `Exhaustion level: ${input.corpsExhaustion.toFixed(1)}`,
        orderContext,
    ];

    if (input.recentBattleSummary) {
        statusLines.push(`Recent engagements: ${input.recentBattleSummary}`);
    }

    const user = statusLines.join('\n');

    return {
        system,
        user,
        model: DIALOGUE_MODEL,
        max_tokens: DIALOGUE_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Response parser
// ═══════════════════════════════════════════════════════════════════════════

/** Strip markdown code block wrappers if present. */
function stripCodeBlock(text: string): string {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    return match ? (match[1] ?? text).trim() : text.trim();
}

/**
 * Parse a raw Haiku JSON response into a DialogueRaw.
 * Returns null on any parse or validation failure (silent — cosmetic system).
 */
export function parseDialogueResponse(raw: string): DialogueRaw | null {
    try {
        const cleaned = stripCodeBlock(raw);
        const data = JSON.parse(cleaned);

        if (typeof data !== 'object' || data === null) return null;
        if (typeof data.acknowledgment !== 'string' || !data.acknowledgment.trim()) return null;
        if (typeof data.concern !== 'string') return null;

        const confidence = data.confidence;
        if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') return null;

        return {
            acknowledgment: data.acknowledgment.trim(),
            concern: (data.concern ?? '').trim(),
            confidence,
        };
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// State helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Estimate total corps personnel from assigned brigades. */
function getCorpsPersonnel(state: GameState, corpsId: string): number {
    const formations = state.military.formations ?? {};
    let total = 0;
    for (const fmn of Object.values(formations)) {
        if (fmn.corps_id === corpsId && fmn.status === 'active') {
            total += fmn.personnel ?? 0;
        }
    }
    return total;
}

/** Build a brief recent-battle summary for a corps from combat_summary if available. */
function buildRecentBattleSummary(state: GameState, corpsId: string): string {
    const summary = (state.military as unknown as Record<string, unknown>).combat_summary as
        | { battles?: Array<{ attacker_corps?: string; defender_corps?: string; outcome?: string }> }
        | undefined;
    if (!summary?.battles?.length) return '';

    const relevant = summary.battles
        .filter(b => b.attacker_corps === corpsId || b.defender_corps === corpsId)
        .slice(-3);

    if (relevant.length === 0) return '';

    const parts = relevant.map(b => {
        const role = b.attacker_corps === corpsId ? 'attacked' : 'defended';
        return `${role} (${b.outcome ?? 'unknown'})`;
    });

    return parts.join(', ');
}

// ═══════════════════════════════════════════════════════════════════════════
// Main generator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate dialogue responses for all active bot corps.
 * Skips the player faction. Silent on individual errors.
 * Returns array of CorpsDialogueEntry sorted by corps_id for determinism.
 */
export async function generateCorpsDialogues(
    state: GameState,
    client: AiClient
): Promise<CorpsDialogueEntry[]> {
    if (!client.isAvailable()) return [];

    const playerFaction = state.meta.player_faction ?? null;
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const turn = state.meta.turn;

    // Find all active bot corps (not player faction, kind=corps, status=active)
    const botCorpsIds = Object.keys(formations)
        .filter(id => {
            const fmn = formations[id];
            if (!fmn) return false;
            if (fmn.status !== 'active') return false;
            if (fmn.kind !== 'corps') return false;
            if (playerFaction && fmn.faction === playerFaction) return false;
            return true;
        })
        .sort(strictCompare);

    const entries: CorpsDialogueEntry[] = [];

    for (const corpsId of botCorpsIds) {
        try {
            const fmn = formations[corpsId]!;
            const faction = fmn.faction;
            const commander = getCorpsCommander(corpsId, state);
            if (!commander) continue;

            const cc = corpsCommand[corpsId];
            const stance = cc?.stance ?? 'balanced';
            const hasActiveOp = cc?.active_operations?.length > 0;
            const opName = cc?.active_operations?.[0]?.name;
            const exhaustion = cc?.corps_exhaustion ?? 0;
            const personnel = getCorpsPersonnel(state, corpsId);
            const recentBattles = buildRecentBattleSummary(state, corpsId);

            const prompt = buildCorpsDialoguePrompt({
                officerName: commander.data.name,
                faction,
                corpsId,
                aggressiveness: commander.data.aggressiveness ?? 3,
                competence: commander.data.competence ?? 3,
                stance,
                hasActiveOperation: hasActiveOp,
                operationName: opName ?? undefined,
                corpsPersonnel: personnel,
                corpsExhaustion: exhaustion,
                recentBattleSummary: recentBattles,
            });

            const response = await client.generateDecision(prompt);
            const parsed = parseDialogueResponse(response.content);
            if (!parsed) continue;

            entries.push({
                turn,
                corps_id: corpsId,
                faction,
                officer_name: commander.data.name,
                acknowledgment: parsed.acknowledgment,
                concern: parsed.concern,
                confidence: parsed.confidence,
            });
        } catch {
            // Silent — cosmetic system, never block pipeline
        }
    }

    return entries;
}
