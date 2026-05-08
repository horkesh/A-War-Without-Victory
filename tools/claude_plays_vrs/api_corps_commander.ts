/**
 * API-powered corps commander decisions using Claude.
 * Each corps commander gets a Claude API call per turn.
 * Produces sector stances, operation assessments, and in-character briefings.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { FactionId, GameState, CorpsFrontSector } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
// D1 persona splice (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS): when
// CLAUDE_AS_CORPS_CO_<faction>_<corps>=true and a persona file exists for
// the requested corps (named-officer or archetype fallback), splice the
// persona system_prompt_template. Default-off path unchanged.
import { loadPersona, type PersonaFaction } from './persona_loader.js';
// LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): emit one
// PersonaDecisionRecord per API call so the side-channel JSONL at
// `data/derived/_debug/d_lane_persona_decisions.jsonl` becomes observable.
// `emitDecision` is a no-op when CLAUDE_PERSONA_TELEMETRY_DISABLED=true.
import { emitDecision } from './persona_telemetry.js';

/**
 * Map a corps_id to its persona filename id. Named-officer personas exist
 * for VRS Drina, SRK, and 1KK (per parent's Q5 priority); all other corps
 * fall through to the `default_corps_co` archetype via loadPersona's
 * role-based fallback chain.
 */
function corpsIdToPersonaId(corpsId: string): string {
    if (corpsId === 'vrs_drina') return 'vrs_drina_corps_co';
    if (corpsId === 'vrs_sarajevo_romanija') return 'vrs_srk_corps_co';
    if (corpsId === 'vrs_1st_krajina') return 'vrs_1kk_corps_co';
    return `${corpsId}_co`; // will miss; loadPersona archetype-fallback handles it
}

/**
 * D1 corps-CO env-flag gate. Returns true iff
 * CLAUDE_AS_CORPS_CO_<faction>_<corps>=true OR
 * CLAUDE_AS_CORPS_CO_<faction>=true OR
 * CLAUDE_AS_ALL_LAYERS_<faction>=true OR CLAUDE_AS_ALL=true.
 *
 * The corps_id in the env-var name uses the canonical corps_id form
 * (e.g. CLAUDE_AS_CORPS_CO_RS_VRS_DRINA=true). Determinism: pure env-read.
 */
export function isCorpsCoPersonaLayerEnabled(faction: FactionId, corpsId: string): boolean {
    if (process.env.CLAUDE_AS_ALL === 'true') return true;
    if (process.env[`CLAUDE_AS_ALL_LAYERS_${faction}`] === 'true') return true;
    if (process.env[`CLAUDE_AS_CORPS_CO_${faction}`] === 'true') return true;
    const upperCorps = corpsId.toUpperCase();
    if (process.env[`CLAUDE_AS_CORPS_CO_${faction}_${upperCorps}`] === 'true') return true;
    return false;
}

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

    // D1 persona splice (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS): when the
    // per-(faction, corps) corps-CO env flag is set AND a persona JSON
    // exists for the corps (named-officer for Drina/SRK/1KK, archetype
    // default_corps_co for all others), prefer the persona's
    // system_prompt_template. Default-off path: unchanged below.
    if (isCorpsCoPersonaLayerEnabled(faction, corpsId)) {
        const personaId = corpsIdToPersonaId(corpsId);
        const persona = loadPersona(personaId, { role: 'corps_co' });
        if (persona) {
            return `${persona.system_prompt_template}

ARMY COMMANDER'S BRIEFING:
${armyBriefing}

Respond with ONLY valid JSON matching the schema in the user prompt. No markdown outside JSON.`;
        }
    }

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

/**
 * LANE-NIGHTSHIFT-V097-PERSONA-C3-STRUCTURAL-AND-PRESIDENT-CUE (2026-05-08):
 * "Decision-relevant" filter for corps operations. Routine lifecycle states
 * (planning/recovery with no diagnostic status_reason and no execution
 * progress) are pruned from the briefing prompt — they are visible-state
 * noise, not a decision the corps CO must take this turn. The C3 noise
 * cluster (op-lifecycle commentary) was structurally resistant to
 * prompt-side suppression because the briefing surfaces these states
 * verbatim; the structural fix is to surface only what's actionable.
 *
 * Rule: a CorpsOperation is decision-relevant iff:
 *   - phase === 'execution' (active fighting always relevant), OR
 *   - last_result === 'failed' (recent setback warrants commander attention), OR
 *   - status_reason is set to something other than 'unknown' / empty
 *     (engine has flagged a meaningful condition).
 *
 * Routine ops (phase='planning' or 'recovery' with no status_reason and no
 * failed last_result) are summarised as "<name> (<phase>)" without verbose
 * status/trace fields. When ALL ops are routine, we emit a single
 * "Operations: routine (no decisions required this turn)" line.
 *
 * Faction-symmetric (no per-faction branches). Deterministic
 * (sorted iteration where order matters).
 */
function isOpDecisionRelevant(op: { phase?: string; last_result?: string } | undefined): boolean {
    if (!op) return false;
    if (op.phase === 'execution') return true;
    if (op.last_result === 'failed') return true;
    return false;
}

function isStatusReasonMeaningful(statusReason: string | undefined): boolean {
    if (!statusReason) return false;
    const sr = String(statusReason).trim();
    if (sr.length === 0) return false;
    if (sr === 'unknown') return false;
    return true;
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

    // LANE-NIGHTSHIFT-V097-PERSONA-C3-STRUCTURAL: only emit Status/Trace line
    // when the engine has populated a meaningful status_reason. The default
    // 'unknown' value with empty trace is the dominant C3 noise driver — we
    // suppress it here so the LLM has nothing to comment on.
    const statusReason = (cc as any)?.status_reason as string | undefined;
    const traceArr = ((cc as any)?.op_launch_trace ?? []) as string[];
    if (isStatusReasonMeaningful(statusReason) || traceArr.length > 0) {
        const trace = traceArr.join(', ');
        lines.push(`Status: ${statusReason ?? 'unknown'} | Trace: ${trace}`);
    }

    // LANE-NIGHTSHIFT-V097-PERSONA-C3-STRUCTURAL: prune routine op-lifecycle
    // states from the prompt. When ALL ops are routine, emit a single line.
    // When some are decision-relevant, list those verbosely and summarise
    // routine ones as "<name> (<phase>)" with no status spew.
    const ops = cc?.active_operations ?? [];
    if (ops.length > 0) {
        const decisionRelevant = ops.filter(isOpDecisionRelevant);
        const routine = ops.filter(op => !isOpDecisionRelevant(op));
        if (decisionRelevant.length === 0) {
            // All routine — single summary line, no per-op enumeration.
            lines.push(`Operations: ${ops.length} active (all routine planning/recovery — no decisions required this turn)`);
        } else {
            for (const op of decisionRelevant) {
                const lr = (op as any).last_result ? `, last_result=${(op as any).last_result}` : '';
                lines.push(`Active operation: ${op.name} (${op.phase}${lr})`);
            }
            if (routine.length > 0) {
                const names = routine.map(o => o.name).join(', ');
                lines.push(`Other operations (routine): ${names}`);
            }
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

    // LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): resolve persona id
    // for the officer_id field. Falls back to the canonical corps-derived
    // persona id when no persona JSON is registered. Faction-symmetric.
    const personaId = corpsIdToPersonaId(corpsId);
    const persona = loadPersona(personaId, { role: 'corps_co' });
    const officerId = persona ? persona.id : personaId;

    // LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): emit per-decision
    // record to the D2 side-channel JSONL. Determinism: append-only, no
    // GameState mutation.
    const assessmentStr = String(parsed?.assessment ?? '');
    const sectorCount = Object.keys(sectorStances).length;
    emitDecision({
        turn: state.meta.turn,
        faction: faction as PersonaFaction,
        role: 'corps_co',
        officer_id: officerId,
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
        decision_summary: `assessment_len=${assessmentStr.length};sectors=${sectorCount}`,
        chain_context_section_present: false,
    });

    return {
        corps_id: corpsId,
        faction,
        commander_name: commanderName,
        turn: state.meta.turn,
        sector_stances: sectorStances,
        assessment: assessmentStr,
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
