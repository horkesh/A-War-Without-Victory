// src/sim/ai_commander/war_dispatches.ts
/**
 * War Dispatches: monthly outside-perspective reports on the conflict.
 *
 * Generates cosmetic dispatches from UNHCR officers, NATO analysts,
 * Bosnian civilians, and UN mediators based on actual game data.
 * COSMETIC ONLY — never affects gameplay.
 *
 * Fires every 4 turns (monthly). Rolling buffer of 10 dispatches on state.
 * Silent on API errors — this is a flavour feature.
 */

import type { GameState } from '../../state/game_state.js';
import type { AiClient } from './ai_client.js';
import type { AiPrompt } from './ai_types.js';
import { AI_TEMPERATURE } from './ai_config.js';

// --- Types ---

export type DispatchPerspective = 'humanitarian' | 'military' | 'civilian' | 'diplomatic';

export interface WarDispatch {
    turn: number;
    source: string;
    headline: string;
    body: string;
    perspective: DispatchPerspective;
}

/** Input data gathered from GameState for building the dispatch prompt. */
export interface DispatchPromptInput {
    turn: number;
    perspective: DispatchPerspective;
    totalDisplaced: number;
    recentDisplaced: number;
    siegedCities: string[];
    recentBattleCount: number;
    territoryPct: Record<string, number>;
    yearLabel: string;
    monthLabel: string;
}

// --- Constants ---

const PERSPECTIVES: DispatchPerspective[] = ['humanitarian', 'military', 'civilian', 'diplomatic'];

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// --- Core Logic ---

/** Returns true when a dispatch should be generated (every 4 turns). */
export function shouldGenerateDispatch(turn: number): boolean {
    return turn % 4 === 0;
}

/** Rotate perspective deterministically by turn. */
export function getPerspectiveForTurn(turn: number): DispatchPerspective {
    return PERSPECTIVES[Math.floor(turn / 4) % PERSPECTIVES.length];
}

/** Build the AiPrompt for a war dispatch. */
export function buildDispatchPrompt(input: DispatchPromptInput): AiPrompt {
    const { perspective } = input;

    const systemVoice: Record<DispatchPerspective, string> = {
        humanitarian: 'You are a senior UNHCR field officer reporting from Bosnia. Write with clinical precision and humanitarian urgency. Focus on civilian suffering, displacement, and access constraints.',
        military: 'You are a NATO intelligence analyst preparing a confidential assessment. Write with detached analytical precision. Focus on military movements, territorial changes, and operational tempo.',
        civilian: 'You are a Bosnian civilian — a teacher from Sarajevo — writing a letter to a relative abroad. Write in first person, personal and emotional. Focus on daily life under siege, loss, and small moments of humanity.',
        diplomatic: 'You are a UN mediator briefing the Security Council. Write in formal diplomatic language. Focus on negotiation prospects, ceasefire violations, and international response.',
    };

    const territoryLines = Object.entries(input.territoryPct)
        .map(([faction, pct]) => `  ${faction}: ${(pct * 100).toFixed(1)}%`)
        .join('\n');

    const userPrompt = `Generate a war dispatch for week ${input.turn} (${input.monthLabel} ${input.yearLabel}).

GROUND SITUATION:
- Total displaced persons: ${input.totalDisplaced.toLocaleString()}
- Newly displaced this month: ${input.recentDisplaced.toLocaleString()}
- Sieged cities: ${input.siegedCities.join(', ') || 'none confirmed'}
- Battles this period: ${input.recentBattleCount}
- Territorial control:
${territoryLines}

Write a dispatch from your assigned perspective. Be specific and grounded in the data above.

Respond with ONLY valid JSON in this exact format:
{
  "source": "<your title/name/organization>",
  "headline": "<one-line headline, max 100 chars>",
  "body": "<2-3 paragraph dispatch body>",
  "perspective": "${perspective}"
}`;

    return {
        system: systemVoice[perspective],
        user: userPrompt,
        model: HAIKU_MODEL,
        max_tokens: 384,
        temperature: AI_TEMPERATURE,
    };
}

/** Parse raw AI response string into a WarDispatch fields object (sans turn). Returns null on failure. */
export function parseDispatchResponse(raw: string): Omit<WarDispatch, 'turn'> | null {
    try {
        // Strip markdown code blocks if present
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        const parsed = JSON.parse(cleaned);
        if (
            typeof parsed.source === 'string' &&
            typeof parsed.headline === 'string' &&
            typeof parsed.body === 'string' &&
            typeof parsed.perspective === 'string' &&
            PERSPECTIVES.includes(parsed.perspective as DispatchPerspective)
        ) {
            return {
                source: parsed.source,
                headline: parsed.headline,
                body: parsed.body,
                perspective: parsed.perspective as DispatchPerspective,
            };
        }
        return null;
    } catch {
        return null;
    }
}

/** Gather data from GameState and generate a WarDispatch. Returns null on failure. */
export async function generateWarDispatch(
    state: GameState,
    client: AiClient
): Promise<WarDispatch | null> {
    const turn = state.meta.turn;
    const perspective = getPerspectiveForTurn(turn);

    // --- Displacement data ---
    const displacementLog = (state as any).displacement?.displacement_event_log as Array<{ turn: number; displaced_count: number }> | undefined;
    let totalDisplaced = 0;
    let recentDisplaced = 0;
    if (displacementLog) {
        for (const entry of displacementLog) {
            totalDisplaced += entry.displaced_count ?? 0;
            if (entry.turn >= turn - 4) {
                recentDisplaced += entry.displaced_count ?? 0;
            }
        }
    }

    // --- Territory control ---
    const politicalControllers = state.political?.political_controllers;
    const territoryPct: Record<string, number> = {};
    if (politicalControllers) {
        const counts: Record<string, number> = {};
        let total = 0;
        for (const faction of Object.values(politicalControllers)) {
            if (faction) {
                counts[faction] = (counts[faction] ?? 0) + 1;
                total++;
            }
        }
        if (total > 0) {
            for (const [faction, count] of Object.entries(counts)) {
                territoryPct[faction] = count / total;
            }
        }
    }

    // --- Sieged cities ---
    const siegedCities = ['Sarajevo'];
    const enclaveState = (state as any).military?.enclave_state as Record<string, { status?: string }> | undefined;
    if (enclaveState) {
        for (const [name, enc] of Object.entries(enclaveState)) {
            if (enc?.status && enc.status !== 'relief' && name !== 'sarajevo') {
                const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                if (!siegedCities.includes(displayName)) {
                    siegedCities.push(displayName);
                }
            }
        }
    }

    // --- Recent battle count (from control events as proxy) ---
    const controlEvents = (state as any).political?.control_events as Array<{ turn: number; mechanism: string }> | undefined;
    let recentBattleCount = 0;
    if (controlEvents) {
        recentBattleCount = controlEvents.filter(e => e.turn >= turn - 4).length;
    }

    // --- Date label ---
    const warStartTurn = state.meta.war_start_turn ?? 0;
    const weeksSinceStart = turn - warStartTurn;
    const year = 1992 + Math.floor(weeksSinceStart / 52);
    const monthIndex = Math.floor((weeksSinceStart % 52) / (52 / 12));
    const monthLabel = MONTH_NAMES[Math.min(monthIndex, 11)];

    const input: DispatchPromptInput = {
        turn,
        perspective,
        totalDisplaced,
        recentDisplaced,
        siegedCities,
        recentBattleCount,
        territoryPct,
        yearLabel: String(year),
        monthLabel,
    };

    try {
        const prompt = buildDispatchPrompt(input);
        const response = await client.generateDecision(prompt);
        const parsed = parseDispatchResponse(response.content);
        if (!parsed) {
            console.warn(`[WarDispatches] Failed to parse dispatch response at turn ${turn}`);
            return null;
        }
        return { turn, ...parsed };
    } catch (error) {
        console.warn(`[WarDispatches] API error at turn ${turn}:`, error);
        return null;
    }
}
