/**
 * API-powered commander decisions using Claude.
 * Each faction's army commander gets a Claude API call per turn.
 * Produces structured decisions + natural language briefing + diagnostic observations.
 *
 * LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE (2026-05-06): The deterministic C1
 * substrate persists per-corps role overlays at
 * `state.military.army_corps_directives_by_faction[faction][corpsId]`, and the
 * B1 producer writes the originating political verb at
 * `state.military.political_directives_by_faction[faction]`. This file bridges
 * those persisted slots into the Claude API commander's user prompt so the API
 * path sees the same political→army chain context the deterministic corps
 * commander gets via `briefing.campaign_role`.
 *
 * Refs:
 *   • C1 (persistence): commit 5084071d — re-applied as c084dd86. See
 *     `src/sim/combat/army_order_interpretation.ts:persistCorpsDirectives`.
 *   • C-lane DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
 *   • B-lane DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 *
 * Env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits the
 * chain-context section to the no-directive fallback (mirrors C1 persist
 * short-circuit — when set, the slots will be empty anyway, but explicit).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { FactionId, GameState, CorpsStance } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
// D1 persona splice (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS): when
// CLAUDE_AS_ARMY_CO_<faction>=true and a persona file exists for the
// currently-active army CO (per A4 roster tenure), splice the persona
// system_prompt_template into the prompt construction. Default-off path
// unchanged.
import { loadPersonaByTenure, type PersonaFaction } from './persona_loader.js';
// LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): emit one
// PersonaDecisionRecord per API call so the side-channel JSONL at
// `data/derived/_debug/d_lane_persona_decisions.jsonl` becomes observable.
// `emitDecision` is a no-op when CLAUDE_PERSONA_TELEMETRY_DISABLED=true.
import { emitDecision } from './persona_telemetry.js';

// ═══════════════════════════════════════════════════════════════════════════
// Political → Army chain context (LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loose-typed accessor for the persisted C1 slot. The slot is optional on
 * `state.military` (post-C1, opt-in via env flag); we read defensively.
 */
type LooseMilitaryWithDirectives = GameState['military'] & {
    political_directives_by_faction?: Record<string, {
        verb: string;
        target_corps_id?: string;
        directive_id?: string;
    } | undefined>;
    army_corps_directives_by_faction?: Record<string, Record<string, {
        corps_id: string;
        role: 'primary' | 'secondary' | 'economy' | 'contain';
        deviated: boolean;
        // Q2 (LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON): canonical
        // reason code emitted by A3 when `deviated=true`. Surfaced into the
        // API prompt's chain-context section so the API commander can
        // reason about WHY the army CO deviated, not just THAT it did.
        // Closed enum mirrored from
        // `src/sim/combat/army_order_interpretation.ts:ArmyCorpsDirectiveDeviationReason`.
        deviation_reason?: 'aggressive_preference' | 'cautious_preference' | 'compliance_score_low';
    }>>;
};

/**
 * Build the "Political-Army Chain Context" prompt section. Surfaces:
 *   • the political directive verb issued to this faction (B1 producer slot)
 *   • the army CO's per-corps translation: role + deviation flag (C1 slot)
 *
 * Backward-compat: when neither slot is populated (pre-substrate state, env
 * flag disabled, or factions B1 hasn't reached) emits a single fallback line
 * "(no political directive issued this turn)".
 *
 * Determinism: corps_id iteration sorted via `strictCompare`. Plain text only.
 *
 * Env flag: when `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` we emit the
 * fallback section regardless of slot contents (the persist path is already
 * short-circuited upstream so the slot would be empty anyway, but we are
 * explicit here for clarity in tests).
 */
export function buildChainContextSection(state: GameState, faction: FactionId): string {
    const HEADER = '=== Political-Army Chain Context ===';
    const FALLBACK_BODY = '(no political directive issued this turn)';

    if (process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED === 'true') {
        return `${HEADER}\n${FALLBACK_BODY}`;
    }

    const mil = state.military as LooseMilitaryWithDirectives;
    const directive = mil.political_directives_by_faction?.[faction];
    const corpsMap = mil.army_corps_directives_by_faction?.[faction];

    const hasDirective = !!directive && typeof directive.verb === 'string' && directive.verb.length > 0;
    const hasCorpsMap = !!corpsMap && Object.keys(corpsMap).length > 0;

    if (!hasDirective && !hasCorpsMap) {
        return `${HEADER}\n${FALLBACK_BODY}`;
    }

    const lines: string[] = [HEADER];

    if (hasDirective) {
        const target = directive!.target_corps_id ? ` -> target corps_id=${directive!.target_corps_id}` : '';
        lines.push(`Political directive (from president): ${directive!.verb}${target}`);
    } else {
        lines.push('Political directive (from president): (none this turn)');
    }

    if (hasCorpsMap) {
        lines.push('Army CO translation (per-corps role overlays):');
        const corpsIds = Object.keys(corpsMap!).sort(strictCompare);
        for (const cid of corpsIds) {
            const cd = corpsMap![cid];
            const compliance = cd.deviated ? 'deviated' : 'full';
            // Q2 (LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON): emit the
            // canonical reason code when deviated=true and the field is
            // present. Format mirrors the existing `(compliance: <cat>)`
            // shape so the prompt remains parseable / diff-stable.
            const reasonSuffix = cd.deviated && cd.deviation_reason
                ? `, reason: ${cd.deviation_reason}`
                : '';
            lines.push(`  - ${cid}: role=${cd.role} (compliance: ${compliance}${reasonSuffix})`);
        }
    } else {
        lines.push('Army CO translation: (no corps directives persisted)');
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiCommanderDecision {
    faction: FactionId;
    commander_name: string;
    turn: number;
    corps_stances: Record<string, CorpsStance>;
    briefing: string;
    strategic_reasoning: string;
    observations: Array<{
        severity: 'bug' | 'calibration' | 'design_gap' | 'historical_divergence';
        commander: string;
        faction: string;
        turn: number;
        description: string;
        expected: string;
        actual: string;
        affected_system: string;
    }>;
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
}

interface CommanderProfile {
    faction: FactionId;
    commander: string;
    successor?: { name: string; transition_week: number };
    personality: { voice: string; competence: number; aggressiveness: number; risk_tolerance: string };
    strategic_doctrine: { priorities: string[]; red_lines: string[]; historical_expectations: Record<string, string> };
}

// ═══════════════════════════════════════════════════════════════════════════
// System prompts per faction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * D1 persona-layer env-flag gate. Returns true iff
 * CLAUDE_AS_ARMY_CO_<faction>=true OR CLAUDE_AS_ALL_LAYERS_<faction>=true OR
 * CLAUDE_AS_ALL=true. Mirrors api_president.ts gating idiom.
 *
 * Determinism: pure env-read; no IO.
 */
export function isArmyCoPersonaLayerEnabled(faction: FactionId): boolean {
    if (process.env.CLAUDE_AS_ALL === 'true') return true;
    if (process.env[`CLAUDE_AS_ALL_LAYERS_${faction}`] === 'true') return true;
    if (process.env[`CLAUDE_AS_ARMY_CO_${faction}`] === 'true') return true;
    return false;
}

function getSystemPrompt(profile: CommanderProfile, turn: number): string {
    const name = (profile.successor && turn >= profile.successor.transition_week)
        ? profile.successor.name : profile.commander;

    // D1 persona splice (LANE-NIGHTSHIFT-D1-D2-CLAUDE-PERSONAS): when the
    // per-faction army-CO env flag is set AND a persona JSON exists for the
    // currently-active army CO (per A4 roster tenure auto-swap), prefer the
    // persona's system_prompt_template over the legacy CommanderProfile-derived
    // system prompt. Default-off path: unchanged below.
    if (isArmyCoPersonaLayerEnabled(profile.faction)) {
        const persona = loadPersonaByTenure(profile.faction as PersonaFaction, 'army_co', turn);
        if (persona) {
            return `${persona.system_prompt_template}

YOUR JOB EACH TURN:
1. Analyze the game state provided.
2. Set corps stances (offensive/balanced/defensive) based on the situation.
3. Provide a briefing IN CHARACTER (2-3 sentences, your voice).
4. Provide strategic reasoning (1-2 sentences, analytical).
5. Flag any OBSERVATIONS where the game doesn't match your expectations.

Your output MUST be valid JSON matching the schema provided. No markdown outside JSON.`;
        }
    }

    const priorities = profile.strategic_doctrine.priorities.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const redLines = profile.strategic_doctrine.red_lines.map(r => `- ${r}`).join('\n');

    return `You are ${name}, army commander of the ${FACTION_NAMES[profile.faction]}.

PERSONALITY: ${profile.personality.voice}
Competence: ${profile.personality.competence}/5. Aggressiveness: ${profile.personality.aggressiveness}/5. Risk tolerance: ${profile.personality.risk_tolerance}.

STRATEGIC PRIORITIES:
${priorities}

RED LINES:
${redLines}

HISTORICAL EXPECTATIONS:
${Object.entries(profile.strategic_doctrine.historical_expectations).map(([w, e]) => `  ${w}: ${e}`).join('\n')}

YOUR JOB EACH TURN:
1. Analyze the game state provided.
2. Set corps stances (offensive/balanced/defensive) based on the situation — not rigidly, REACT to what you see.
3. Provide a briefing IN CHARACTER (2-3 sentences, your voice).
4. Provide strategic reasoning (1-2 sentences, analytical).
5. Flag any OBSERVATIONS where the game doesn't match your expectations:
   - "bug": something mechanically broken (corps with 0 brigades, etc.)
   - "calibration": numbers seem off (too many/few troops, wrong territory %, etc.)
   - "design_gap": you can't express an intent the engine should support
   - "historical_divergence": game result significantly contradicts what happened historically

Your output MUST be valid JSON matching the schema provided. No markdown outside JSON.`;
}

const FACTION_NAMES: Record<string, string> = {
    RS: 'Army of Republika Srpska (VRS)',
    RBiH: 'Army of the Republic of Bosnia and Herzegovina (ARBiH)',
    HRHB: 'Croatian Defence Council (HVO)',
};

// ═══════════════════════════════════════════════════════════════════════════
// State serialization (enhanced from prompt_builder.ts)
// ═══════════════════════════════════════════════════════════════════════════

function buildStatePrompt(state: GameState, faction: FactionId, prevTerritory: Record<string, number>, osidAreas: Record<string, number>): string {
    const turn = state.meta.turn;
    const lines: string[] = [];

    lines.push(`Turn: ${turn}. Faction: ${faction}.`);

    // Territory (area-weighted)
    const pc = state.political?.political_controllers ?? {};
    const areaByFaction: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
    let totalArea = 0;
    for (const [osid, f] of Object.entries(pc)) {
        const area = osidAreas[osid] ?? 0;
        totalArea += area;
        // Defensive: `political_controllers` value is `FactionId | null`. Null
        // means uncontrolled and is excluded from per-faction tallies. (Drive-by
        // fix for pre-existing TS2538 surfaced when this file was reformatted
        // by LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE.)
        if (f !== null && areaByFaction[f] !== undefined) areaByFaction[f] += area;
    }

    lines.push('');
    lines.push('TERRITORY:');
    for (const [f, area] of Object.entries(areaByFaction)) {
        const pct = totalArea > 0 ? ((area / totalArea) * 100).toFixed(1) : '0';
        const areaKm2 = Math.round(area);
        const delta = prevTerritory[f] !== undefined ? areaKm2 - prevTerritory[f] : 0;
        const deltaStr = delta > 0 ? ` (+${delta} km²)` : delta < 0 ? ` (${delta} km²)` : '';
        lines.push(`  ${f}: ${pct}% (${areaKm2} km²)${deltaStr}`);
    }

    // Corps status with personnel, morale, cohesion, status_reason
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    lines.push('');
    lines.push('YOUR CORPS:');

    const factionCorpsIds: string[] = [];
    for (const [corpsId, cc] of Object.entries(corpsCommand).sort(([a], [b]) => strictCompare(a, b))) {
        const cf = formations[corpsId];
        if (!cf || cf.faction !== faction || cf.kind === 'army_hq') continue;
        factionCorpsIds.push(corpsId);

        let brigCount = 0, totalPers = 0, totalCoh = 0, totalMor = 0;
        for (const [, f] of Object.entries(formations)) {
            if (f.faction === faction && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active') {
                brigCount++;
                totalPers += f.personnel ?? 0;
                totalCoh += f.cohesion ?? 50;
                totalMor += f.morale ?? 50;
            }
        }
        const avgCoh = brigCount > 0 ? (totalCoh / brigCount).toFixed(0) : '?';
        const avgMor = brigCount > 0 ? (totalMor / brigCount).toFixed(0) : '?';
        const ops = cc.active_operations ?? [];
        const op = ops[0] ?? null;
        const opStr = op ? `op: ${op.name} (${op.phase})` : 'no operation';
        const statusReason = (cc as any).status_reason ?? 'unknown';
        const trace = ((cc as any).op_launch_trace ?? []).join(', ');

        lines.push(`  ${corpsId}: stance=${cc.stance}, ${brigCount} bde, ${totalPers} pers, coh=${avgCoh}, mor=${avgMor}`);
        lines.push(`    ${opStr} | status: ${statusReason} | trace: ${trace}`);
    }

    // Supply
    const generalSupply = state.military.general_supply_reserve?.[faction] ?? 'unknown';
    const heavySupply = state.military.heavy_munitions_reserve?.[faction] ?? 'unknown';
    lines.push('');
    lines.push(`SUPPLY: general=${typeof generalSupply === 'number' ? generalSupply.toFixed(0) : generalSupply}, heavy=${typeof heavySupply === 'number' ? heavySupply.toFixed(0) : heavySupply}`);

    // Enemy strength
    lines.push('');
    lines.push('ENEMY FORCES:');
    for (const enemyFaction of (['RS', 'RBiH', 'HRHB'] as FactionId[])) {
        if (enemyFaction === faction) continue;
        let ePers = 0, eBde = 0;
        for (const [, f] of Object.entries(formations)) {
            if (f.faction === enemyFaction && f.kind === 'brigade' && f.status === 'active') {
                ePers += f.personnel ?? 0;
                eBde++;
            }
        }
        lines.push(`  ${enemyFaction}: ${ePers.toLocaleString()} personnel / ${eBde} brigades`);
    }

    // Recent events
    const firedEvents = state.military.fired_event_ids ?? [];
    if (firedEvents.length > 0) {
        lines.push('');
        lines.push(`RECENT EVENTS: ${firedEvents.slice(-5).join(', ')}`);
    }

    // Political → Army chain context (LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE)
    // Bridges the deterministic C1 substrate
    // (`state.military.army_corps_directives_by_faction[faction]`) and B1
    // producer slot (`state.military.political_directives_by_faction[faction]`)
    // into the API commander's prompt so it sees the same context the
    // deterministic corps commander gets via briefing.campaign_role.
    lines.push('');
    lines.push(buildChainContextSection(state, faction));

    // Alliance state (for HRHB/RBiH)
    if (faction === 'HRHB' || faction === 'RBiH') {
        const alliance = state.political.war_alliance_rbih_hrhb ?? 1.0;
        lines.push('');
        lines.push(`RBiH-HRHB ALLIANCE: ${alliance.toFixed(2)} (1.0=full alliance, 0.0=neutral, <0=war)`);
    }

    // Schema
    lines.push('');
    lines.push(`Respond with ONLY valid JSON:
{
  "corps_stances": { ${factionCorpsIds.map(c => `"${c}": "offensive|balanced|defensive"`).join(', ')} },
  "briefing": "<2-3 sentences in character>",
  "strategic_reasoning": "<1-2 sentences analytical>",
  "observations": [
    { "severity": "bug|calibration|design_gap|historical_divergence", "description": "...", "expected": "...", "actual": "...", "affected_system": "..." }
  ]
}`);

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// API call
// ═══════════════════════════════════════════════════════════════════════════

export async function generateApiDecision(
    client: Anthropic,
    profile: CommanderProfile,
    state: GameState,
    turn: number,
    prevTerritory: Record<string, number>,
    model: string = 'claude-haiku-4-5-20251001',
    osidAreas: Record<string, number> = {}
): Promise<ApiCommanderDecision> {
    const commanderName = (profile.successor && turn >= profile.successor.transition_week)
        ? profile.successor.name : profile.commander;

    const systemPrompt = getSystemPrompt(profile, turn);
    const userPrompt = buildStatePrompt(state, profile.faction as FactionId, prevTerritory, osidAreas);

    const startMs = Date.now();
    const response = await client.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });

    const latencyMs = Date.now() - startMs;
    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');

    // LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): resolve the active
    // army-CO persona id via A4 roster tenure for the officer_id field. Falls
    // back to the deterministic profile commander name when no persona is
    // registered (faction-symmetric; no per-faction branches).
    const activePersona = loadPersonaByTenure(profile.faction as PersonaFaction, 'army_co', turn);
    const officerId = activePersona ? activePersona.id : commanderName;

    // Parse response
    const parsed = safeParseJson(text);
    if (!parsed) {
        console.warn(`[API] Failed to parse response for ${profile.faction}. Falling back.`);
        // LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX: emit telemetry on parse-failure
        // path too, so cost / latency / failure rate is observable in JSONL.
        emitDecision({
            turn,
            faction: profile.faction as PersonaFaction,
            role: 'army_co',
            officer_id: officerId,
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            latency_ms: latencyMs,
            decision_summary: 'parse_failure',
            chain_context_section_present: true,
        });
        return {
            faction: profile.faction as FactionId,
            commander_name: commanderName,
            turn,
            corps_stances: {},
            briefing: `[API parse failure] Raw: ${text.slice(0, 200)}`,
            strategic_reasoning: '',
            observations: [],
            model_used: response.model,
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            latency_ms: latencyMs,
        };
    }

    // Extract stances
    const VALID_STANCES = new Set(['offensive', 'balanced', 'defensive', 'reorganize']);
    const corpsStances: Record<string, CorpsStance> = {};
    if (parsed.corps_stances && typeof parsed.corps_stances === 'object') {
        for (const [corpsId, stance] of Object.entries(parsed.corps_stances)) {
            if (VALID_STANCES.has(stance as string)) {
                corpsStances[corpsId] = stance as CorpsStance;
            }
        }
    }

    // Extract observations
    const observations: ApiCommanderDecision['observations'] = [];
    if (Array.isArray(parsed.observations)) {
        for (const o of parsed.observations) {
            if (o && typeof o === 'object' && o.description) {
                observations.push({
                    severity: ['bug', 'calibration', 'design_gap', 'historical_divergence'].includes(o.severity) ? o.severity : 'calibration',
                    commander: commanderName,
                    faction: profile.faction,
                    turn,
                    description: String(o.description ?? ''),
                    expected: String(o.expected ?? ''),
                    actual: String(o.actual ?? ''),
                    affected_system: String(o.affected_system ?? 'unknown'),
                });
            }
        }
    }

    // LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX (2026-05-07): emit per-decision
    // record to the D2 side-channel JSONL. Determinism: append-only, no
    // GameState mutation. Faction-symmetric (no per-faction branches).
    const stancesSummary = Object.entries(corpsStances)
        .sort(([a], [b]) => strictCompare(a, b))
        .map(([cid, st]) => `${cid}:${st}`)
        .join(',');
    const briefingStr = String(parsed.briefing ?? '');
    emitDecision({
        turn,
        faction: profile.faction as PersonaFaction,
        role: 'army_co',
        officer_id: officerId,
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
        decision_summary: `briefing_len=${briefingStr.length};stances=${stancesSummary}`,
        chain_context_section_present: true,
    });

    return {
        faction: profile.faction as FactionId,
        commander_name: commanderName,
        turn,
        corps_stances: corpsStances,
        briefing: briefingStr,
        strategic_reasoning: String(parsed.strategic_reasoning ?? ''),
        observations,
        model_used: response.model,
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        latency_ms: latencyMs,
    };
}

function safeParseJson(text: string): any | null {
    // Strip markdown code blocks if present
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    const cleaned = match ? match[1].trim() : text.trim();
    try { return JSON.parse(cleaned); } catch { return null; }
}
