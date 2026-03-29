// src/sim/ai_commander/prompt_builder.ts
/**
 * Builds prompts from GameState for AI commander decisions.
 * Serializes ~6KB of context: current state + last 10 turns summary.
 */

import type { GameState, FactionId, CorpsFrontSector } from '../../state/game_state.js';
import type { AiPrompt } from './ai_types.js';
import type { ArmyCorpsDirective } from './ai_types.js';
import { getArmyCommanderProfile, getCorpsCommanderProfile } from './personality_profiles.js';
import { AI_TEMPERATURE, MAX_TOKENS, MODEL_ROUTING } from './ai_config.js';
import type { AiCommanderMode } from './ai_config.js';
import { getArmyCommander, getCorpsCommander } from '../combat/officer_system.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { EventConstraints } from '../events/event_constraints.js';

/** Read AI mode from GameState config. Defaults to 'officer' if not set. */
function getMode(state: GameState): AiCommanderMode {
    return (state.meta as unknown as Record<string, { mode?: AiCommanderMode }>).ai_commander_config?.mode ?? 'officer';
}

export function buildArmyPrompt(state: GameState, faction: FactionId): AiPrompt {
    const commander = getArmyCommander(faction, state);
    const commanderName = commander?.data.name ?? `${faction} Army Commander`;
    const system = getArmyCommanderProfile(faction, commanderName);
    const user = buildArmyUserPrompt(state, faction);
    const model = MODEL_ROUTING[getMode(state)].army;

    return {
        system,
        user,
        model,
        max_tokens: MAX_TOKENS.army,
        temperature: AI_TEMPERATURE,
    };
}

export function buildCorpsPrompt(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    armyDirective: ArmyCorpsDirective
): AiPrompt {
    const commander = getCorpsCommander(corpsId, state);
    const name = commander?.data.name ?? corpsId;
    const competence = commander?.data.competence ?? 3;
    const aggressiveness = commander?.data.aggressiveness ?? 3;
    const defensiveSkill = commander?.data.defensive_skill ?? 3;

    const hasActiveOp = (state.military.corps_command?.[corpsId]?.active_operations?.length ?? 0) > 0;
    const modelKey = hasActiveOp ? 'corps_ops' : 'corps_routine';
    const model = MODEL_ROUTING[getMode(state)][modelKey];

    const system = getCorpsCommanderProfile(name, faction, competence, aggressiveness, defensiveSkill);
    const user = buildCorpsUserPrompt(state, faction, corpsId, armyDirective);

    return {
        system,
        user,
        model,
        max_tokens: hasActiveOp ? MAX_TOKENS.corps_ops : MAX_TOKENS.corps_routine,
        temperature: AI_TEMPERATURE,
    };
}

export function buildAdvisorPrompt(
    state: GameState,
    faction: FactionId,
    contextType: 'situation_analysis' | 'operation_planning' | 'peace_plan'
): AiPrompt {
    const commander = getArmyCommander(faction, state);
    const commanderName = commander?.data.name ?? `${faction} Commander`;

    const system = `You are an advisor to the player who commands the ${faction} faction. Your name is ${commanderName}. Analyze the situation and provide actionable recommendations. Be direct and specific. Reference specific corps, sectors, and municipalities by name.`;
    const user = buildAdvisorUserPrompt(state, faction, contextType);

    return {
        system,
        user,
        model: MODEL_ROUTING[getMode(state)].advisor,
        max_tokens: MAX_TOKENS.advisor,
        temperature: AI_TEMPERATURE,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// User prompt builders (state serialization)
// ═══════════════════════════════════════════════════════════════════════════

function buildArmyUserPrompt(state: GameState, faction: FactionId): string {
    const turn = state.meta.turn;
    const lines: string[] = [];

    lines.push(`Turn: ${turn}. Faction: ${faction}.`);
    lines.push('');

    // Territory summary
    const controllers = state.political?.political_controllers ?? {};
    const osids = Object.keys(controllers).sort(strictCompare);
    const totalOsids = osids.length;
    const factionOsids = osids.filter(o => controllers[o] === faction).length;
    const pct = totalOsids > 0 ? ((factionOsids / totalOsids) * 100).toFixed(1) : '0';
    lines.push(`Territory: ${pct}% (${factionOsids}/${totalOsids} OSIDs)`);

    // Corps status
    lines.push('');
    lines.push('Corps Status:');
    const corpsCommand = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cc = corpsCommand[corpsId];
        if (!cc) continue;
        // Check if this corps belongs to the faction
        const corpsFormation = state.military.formations?.[corpsId];
        if (!corpsFormation || corpsFormation.faction !== faction) continue;
        const stance = cc.stance ?? 'balanced';
        const ops = cc.active_operations ?? [];
        const opStatus = ops.length > 0
            ? ops.map(op => `"${op.name}" (${op.phase})`).join(', ')
            : 'no active operation';
        lines.push(`  ${corpsId}: stance=${stance}, ${opStatus}`);
    }

    // Supply summary
    const generalSupply = state.military.general_supply_reserve?.[faction] ?? 'unknown';
    const heavySupply = state.military.heavy_munitions_reserve?.[faction] ?? 'unknown';
    lines.push('');
    lines.push(`Supply: general=${generalSupply}, heavy=${heavySupply}`);

    // Negotiation breakdown (raw data)
    const breakdown = state.military.negotiation?.capital?.[faction];
    if (breakdown) {
        lines.push('');
        lines.push(`Negotiation Breakdown: territory=${breakdown.territory_controlled_pct?.toFixed(1)}%, ops_launched=${breakdown.operations_launched}, ops_successful=${breakdown.operations_successful}, war_crimes=${breakdown.war_crimes_events}`);
    }

    // Pending decisions
    const pendingOps = Object.values(corpsCommand)
        .flatMap((cc) => (cc?.active_operations ?? []).filter(op => op.commander_assessment === 'postpone' || op.preparation_sub_phase === 'assessment'))
        .map((op) => op.name)
        .filter(Boolean);
    if (pendingOps.length > 0) {
        lines.push('');
        lines.push(`Pending operation decisions: ${pendingOps.join(', ')}`);
    }

    // Event context (fired events, aggression, constraints)
    appendEventContext(lines, state, faction);

    // Output schema
    lines.push('');
    lines.push('Respond with ONLY valid JSON in this exact schema:');
    lines.push(`{
  "corps_directives": { "<corps_id>": { "stance": "offensive|balanced|defensive", "priority": "<municipality or objective>" } },
  "operation_decisions": { "approve": ["<op_name>"], "postpone": [], "abort": [] },
  "peace_plan_response": null,
  "reserve_deployment": null,
  "strategic_reasoning": "<your analysis>",
  "briefing_text": "<in-character briefing, 2-3 sentences>"
}`);

    return lines.join('\n');
}

function buildCorpsUserPrompt(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    armyDirective: ArmyCorpsDirective
): string {
    const turn = state.meta.turn;
    const lines: string[] = [];

    lines.push(`Turn: ${turn}. Corps: ${corpsId}. Faction: ${faction}.`);
    lines.push('');
    lines.push(`Army Directive: stance=${armyDirective.stance}${armyDirective.priority ? `, priority=${armyDirective.priority}` : ''}`);

    // Brigade summary
    const formations = state.military.formations ?? {};
    const brigades = Object.entries(formations)
        .filter(([, f]) => f.faction === faction && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active')
        .sort(([a], [b]) => strictCompare(a, b));

    lines.push('');
    lines.push(`Brigades (${brigades.length}):`);
    for (const [bid, b] of brigades.slice(0, 10)) {
        lines.push(`  ${bid}: personnel=${b.personnel}, morale=${b.morale}, cohesion=${b.cohesion}`);
    }
    if (brigades.length > 10) lines.push(`  ... and ${brigades.length - 10} more`);

    // Sector summary
    const sectors = state.military.corps_front_sectors;
    if (sectors) {
        const corpsSectors = Object.values(sectors).filter((s: CorpsFrontSector) => s.corps_id === corpsId);
        lines.push('');
        lines.push(`Sectors (${corpsSectors.length}):`);
        for (const s of corpsSectors.slice(0, 5)) {
            lines.push(`  ${s.sector_id}: edges=${s.length_edges}, brigades=${s.assigned_brigade_ids.length}, stance=${s.sector_stance}`);
        }
    }

    // Event context (fired events, aggression, constraints)
    appendEventContext(lines, state, faction);

    // Output schema
    lines.push('');
    lines.push('Respond with ONLY valid JSON:');
    lines.push(`{
  "sector_stances": { "<sector_id>": "fortify|defend|elastic|active_defense|screening" },
  "operation_plan": null,
  "brigade_movements": {},
  "assessment": "<1-2 sentence assessment>"
}`);

    return lines.join('\n');
}

function buildAdvisorUserPrompt(
    state: GameState,
    faction: FactionId,
    contextType: string
): string {
    // Reuse army prompt data but frame as advisory
    const armyData = buildArmyUserPrompt(state, faction);
    return `Context: ${contextType}\n\nThe player commands ${faction}. Analyze this situation and recommend the top 3 priorities.\n\n${armyData}\n\nRespond with JSON:\n{\n  "commander_name": "<your name>",\n  "faction": "${faction}",\n  "assessment": "<overall situation assessment>",\n  "recommendations": [\n    { "priority": 1, "action": "<specific action>", "reasoning": "<why>" },\n    { "priority": 2, "action": "<specific action>", "reasoning": "<why>" },\n    { "priority": 3, "action": "<specific action>", "reasoning": "<why>" }\n  ],\n  "context_type": "${contextType}"\n}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Event context — shared across army + corps prompts
// ═══════════════════════════════════════════════════════════════════════════

const MAX_RECENT_EVENTS = 8;

/**
 * Append event-driven context to prompt lines: fired events, aggression
 * modifiers, operation blocks, and doctrine overrides for the given faction.
 */
function appendEventContext(lines: string[], state: GameState, faction: FactionId): void {
    const turn = state.meta?.turn ?? 0;

    // Recent fired events (last 8)
    const firedEvents = state.military.fired_event_ids ?? [];
    if (firedEvents.length > 0) {
        const recent = firedEvents.slice(-MAX_RECENT_EVENTS);
        lines.push('');
        lines.push(`Recent events fired: ${recent.join(', ')}`);
    }

    // Active aggression modifiers for this faction
    const allMods = state.military.event_aggression_modifiers ?? [];
    const activeMods = allMods
        .filter(m => m.faction === faction && m.expires_turn > turn)
        .sort((a, b) => strictCompare(String(a.expires_turn), String(b.expires_turn)));
    for (const mod of activeMods) {
        const sign = mod.delta >= 0 ? '+' : '';
        lines.push(`Aggression modifier: ${sign}${mod.delta} (expires turn ${mod.expires_turn})`);
    }

    // Active constraints from events
    const constraints: EventConstraints | undefined = state.military.event_constraints;
    if (constraints) {
        // Operation blocks
        const blocks = (constraints.operation_blocks ?? [])
            .filter(b => b.faction === faction && b.expires_turn > turn)
            .sort((a, b) => strictCompare(a.reason, b.reason));
        for (const block of blocks) {
            lines.push(`OPERATION BLOCKED: ${block.reason} until turn ${block.expires_turn}`);
        }

        // Doctrine overrides
        const overrides = (constraints.doctrine_overrides ?? [])
            .filter(d => d.faction === faction && d.expires_turn > turn)
            .sort((a, b) => strictCompare(a.reason, b.reason));
        for (const ov of overrides) {
            lines.push(`FORCED STANCE: ${ov.forced_stance} until turn ${ov.expires_turn}`);
        }
    }
}
