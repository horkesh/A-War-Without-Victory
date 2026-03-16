// src/sim/ai_commander/corps_commander_ai.ts
/**
 * Corps-level AI decision orchestrator.
 * Runs once per bot corps per turn. Produces CorpsDecision.
 * Uses army decision for context. Falls back to formula bot on failure.
 */

import type { GameState, FactionId, CorpsStance } from '../../state/game_state.js';
import type { AiClient } from './ai_client.js';
import type { ArmyDecision, CorpsDecision, ArmyCorpsDirective } from './ai_types.js';
import { buildCorpsPrompt } from './prompt_builder.js';
import { parseCorpsResponse } from './response_parser.js';
import { logDecision, getLoggedDecision } from './decision_log.js';
import { strictCompare } from '../../state/validateGameState.js';

const DEFAULT_ARMY_DIRECTIVE: ArmyCorpsDirective = { stance: 'balanced' };

/**
 * Generate corps-level decisions for all bot corps of a faction.
 * Applies AI decisions directly to state.military.corps_command[corpsId].directive.
 * Returns list of corps IDs that were AI-decided (formula bot should skip these).
 */
export async function generateCorpsDecisions(
    state: GameState,
    faction: FactionId,
    armyDecision: ArmyDecision | null,
    client: AiClient | null
): Promise<string[]> {
    if (!client || !client.isAvailable()) return [];

    const corpsCommand = state.military.corps_command ?? {};
    const formations = state.military.formations ?? {};

    // Find corps belonging to this faction
    const corpsIds = Object.keys(corpsCommand)
        .filter(cid => formations[cid]?.faction === faction)
        .sort(strictCompare);

    const aiDecidedCorps: string[] = [];
    const CONCURRENCY = 5;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < corpsIds.length; i += CONCURRENCY) {
        const batch = corpsIds.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(corpsId => generateSingleCorpsDecision(state, faction, corpsId, armyDecision, client))
        );

        for (let j = 0; j < batch.length; j++) {
            const corpsId = batch[j]!;
            const result = results[j]!;
            if (result.status === 'fulfilled' && result.value) {
                applyCorpsDecisionToState(state, corpsId, result.value);
                aiDecidedCorps.push(corpsId);
            }
        }
    }

    return aiDecidedCorps;
}

async function generateSingleCorpsDecision(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    armyDecision: ArmyDecision | null,
    client: AiClient
): Promise<CorpsDecision | null> {
    const turn = state.meta.turn;

    // Check replay log
    const logged = getLoggedDecision(state, turn, 'corps', faction, corpsId);
    if (logged) return logged as CorpsDecision;

    try {
        const armyDirective = armyDecision?.corps_directives[corpsId] ?? DEFAULT_ARMY_DIRECTIVE;
        const prompt = buildCorpsPrompt(state, faction, corpsId, armyDirective);
        if (prompt.model === 'formula') return null;

        const response = await client.generateDecision(prompt);
        const parsed = parseCorpsResponse(response.content, faction, corpsId, turn);

        if (!parsed) {
            console.warn(`[AI Commander] Failed to parse corps response for ${corpsId}. Falling back.`);
            return null;
        }

        logDecision(state, {
            turn,
            level: 'corps',
            faction,
            corps_id: corpsId,
            decision: parsed,
            model_used: response.model,
            prompt_tokens: response.prompt_tokens,
            completion_tokens: response.completion_tokens,
            latency_ms: response.latency_ms,
        });

        return parsed;
    } catch (error) {
        console.warn(`[AI Commander] API error for ${corpsId}:`, error);
        return null;
    }
}

/** Map CorpsDecision into the existing CorpsDirective format on state. */
function applyCorpsDecisionToState(state: GameState, corpsId: string, decision: CorpsDecision): void {
    const cc = state.military.corps_command?.[corpsId];
    if (!cc) return;

    // Map AI sector stances to a corps-level stance for the existing bot pipeline.
    // The army-level stance is advisory; corps AI sets sector stances directly.
    const stanceValues = Object.values(decision.sector_stances);
    let derivedStance: CorpsStance;
    if (stanceValues.length === 0) {
        derivedStance = cc.stance ?? 'balanced';
    } else if (stanceValues.includes('active_defense') || stanceValues.includes('screening')) {
        derivedStance = 'offensive';
    } else if (stanceValues.includes('fortify')) {
        derivedStance = 'defensive';
    } else {
        derivedStance = 'balanced';
    }

    cc.stance = derivedStance;

    // Apply sector stance overrides
    const sectors = state.military.corps_front_sectors;
    if (sectors && decision.sector_stances) {
        for (const [sectorId, stance] of Object.entries(decision.sector_stances)) {
            const sector = Object.values(sectors).find(s => s.sector_id === sectorId);
            if (sector) {
                sector.sector_stance = stance as typeof sector.sector_stance;
                sector.stance_source = 'bot'; // AI counts as bot for persistence
            }
        }
    }

    // Store AI assessment as briefing text
    (cc as any).ai_assessment = decision.assessment;
    (cc as any).ai_decided = true;
}
