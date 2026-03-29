/**
 * API-powered corps commander decisions using Claude.
 * Each corps commander gets a Claude API call per turn.
 * Produces sector stances, operation assessments, and in-character briefings.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { FactionId, GameState, CorpsFrontSector } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';

export interface ApiCorpsDecision {
    corps_id: string;
    faction: FactionId;
    commander_name: string;
    turn: number;
    sector_stances: Record<string, string>;
    assessment: string;
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
}

function getCorpsSystemPrompt(
    commanderName: string,
    faction: FactionId,
    corpsId: string,
    competence: number,
    aggressiveness: number,
    armyBriefing: string
): string {
    const FACTION_NAMES: Record<string, string> = {
        RS: 'VRS', RBiH: 'ARBiH', HRHB: 'HVO',
    };
    const style = aggressiveness >= 4 ? 'aggressive' : aggressiveness <= 1 ? 'cautious' : 'balanced';
    const skill = competence >= 4 ? 'highly competent' : competence <= 2 ? 'limited' : 'capable';

    return `You are ${commanderName}, corps commander of ${corpsId} in the ${FACTION_NAMES[faction] ?? faction}.
You are a ${skill}, ${style} officer. Competence: ${competence}/5. Aggressiveness: ${aggressiveness}/5.

ARMY COMMANDER'S BRIEFING:
${armyBriefing}

YOUR JOB:
1. Set sector stances (fortify/defend/elastic/active_defense/screening) based on your corps situation.
2. Provide a 1-2 sentence assessment IN CHARACTER.
3. Follow the army commander's direction — if they say defensive, do not launch offensives.
4. Consider your supply status and brigade health before committing.

Respond with ONLY valid JSON. No markdown outside JSON.`;
}

function buildCorpsStatePrompt(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    osidAreas: Record<string, number>
): string {
    const turn = state.meta.turn;
    const lines: string[] = [];
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const cc = corpsCommand[corpsId];

    lines.push(`Turn: ${turn}. Corps: ${corpsId}. Faction: ${faction}.`);
    lines.push(`Current stance: ${cc?.stance ?? 'balanced'}`);

    const statusReason = (cc as any)?.status_reason ?? 'unknown';
    const trace = ((cc as any)?.op_launch_trace ?? []).join(', ');
    lines.push(`Status: ${statusReason} | Trace: ${trace}`);

    // Active operation
    const ops = cc?.active_operations ?? [];
    if (ops.length > 0) {
        for (const op of ops) {
            lines.push(`Active operation: ${op.name} (${op.phase})`);
        }
    }

    // Brigades
    let brigCount = 0, totalPers = 0, totalCoh = 0, totalMor = 0;
    for (const [bid, f] of Object.entries(formations)) {
        if (f.faction === faction && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active') {
            brigCount++;
            totalPers += f.personnel ?? 0;
            totalCoh += f.cohesion ?? 50;
            totalMor += f.morale ?? 50;
        }
    }
    const avgCoh = brigCount > 0 ? (totalCoh / brigCount).toFixed(0) : '?';
    const avgMor = brigCount > 0 ? (totalMor / brigCount).toFixed(0) : '?';
    lines.push('');
    lines.push(`Brigades: ${brigCount} | Personnel: ${totalPers} | Avg Cohesion: ${avgCoh} | Avg Morale: ${avgMor}`);

    // Sectors
    const sectors = state.military.corps_front_sectors;
    const sectorIds: string[] = [];
    if (sectors) {
        const corpsSectors = Object.values(sectors)
            .filter((s: CorpsFrontSector) => s.corps_id === corpsId)
            .sort((a: CorpsFrontSector, b: CorpsFrontSector) => strictCompare(a.sector_id, b.sector_id));
        lines.push('');
        lines.push(`Sectors (${corpsSectors.length}):`);
        for (const s of corpsSectors) {
            sectorIds.push(s.sector_id);
            lines.push(`  ${s.sector_id}: edges=${s.length_edges}, brigades=${s.assigned_brigade_ids.length}, stance=${s.sector_stance}, threat=${(s.threat_ratio ?? 0).toFixed(2)}`);
        }
    }

    // Schema
    lines.push('');
    lines.push(`Respond with ONLY valid JSON:`);
    lines.push(`{`);
    lines.push(`  "sector_stances": { ${sectorIds.map(s => `"${s}": "fortify|defend|elastic|active_defense|screening"`).join(', ')} },`);
    lines.push(`  "assessment": "<1-2 sentence in-character assessment>"`);
    lines.push(`}`);

    return lines.join('\n');
}

export async function generateCorpsApiDecision(
    client: Anthropic,
    state: GameState,
    faction: FactionId,
    corpsId: string,
    commanderName: string,
    competence: number,
    aggressiveness: number,
    armyBriefing: string,
    osidAreas: Record<string, number>,
    model: string = 'claude-haiku-4-5-20251001'
): Promise<ApiCorpsDecision> {
    const systemPrompt = getCorpsSystemPrompt(commanderName, faction, corpsId, competence, aggressiveness, armyBriefing);
    const userPrompt = buildCorpsStatePrompt(state, faction, corpsId, osidAreas);

    const startMs = Date.now();
    const response = await client.messages.create({
        model,
        max_tokens: 512,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });
    const latencyMs = Date.now() - startMs;

    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');

    const parsed = safeParseJson(text);
    const VALID = new Set(['fortify', 'defend', 'elastic', 'active_defense', 'screening']);
    const sectorStances: Record<string, string> = {};
    if (parsed?.sector_stances) {
        for (const [sid, stance] of Object.entries(parsed.sector_stances)) {
            if (VALID.has(stance as string)) sectorStances[sid] = stance as string;
        }
    }

    return {
        corps_id: corpsId,
        faction,
        commander_name: commanderName,
        turn: state.meta.turn,
        sector_stances: sectorStances,
        assessment: String(parsed?.assessment ?? ''),
        model_used: response.model,
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
    };
}

function safeParseJson(text: string): any | null {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    const cleaned = match ? match[1].trim() : text.trim();
    try { return JSON.parse(cleaned); } catch { return null; }
}
