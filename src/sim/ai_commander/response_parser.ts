// src/sim/ai_commander/response_parser.ts
/**
 * Validates and maps AI JSON responses into game types.
 * Handles malformed JSON, missing fields, invalid values gracefully.
 * Returns null on unrecoverable parse failure (triggers formula bot fallback).
 */

import type { ArmyDecision, CorpsDecision, AdvisorResponse } from './ai_types.js';
import { CANONICAL_FACTIONS, type FactionId } from '../../state/game_state.js';

const VALID_STANCES = new Set(['offensive', 'balanced', 'defensive']);
const VALID_SECTOR_STANCES = new Set(['fortify', 'defend', 'elastic', 'active_defense', 'screening']);
const VALID_ADVISOR_CONTEXT_TYPES = new Set<AdvisorResponse['context_type']>([
    'situation_analysis',
    'operation_planning',
    'peace_plan',
]);

/** Narrow an unknown advisor-response value to a canonical FactionId, falling back on invalid input. */
function parseFactionId(value: unknown, fallback: FactionId): FactionId {
    return typeof value === 'string' && CANONICAL_FACTIONS.includes(value) ? value : fallback;
}

/** Narrow an unknown advisor-response value to a valid AdvisorResponse context type. */
function parseAdvisorContextType(value: unknown): AdvisorResponse['context_type'] {
    if (typeof value === 'string' && VALID_ADVISOR_CONTEXT_TYPES.has(value as AdvisorResponse['context_type'])) {
        return value as AdvisorResponse['context_type'];
    }
    return 'situation_analysis';
}

/** Strip markdown code block wrappers if present. */
function stripCodeBlock(text: string): string {
    const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    return match ? match[1].trim() : text.trim();
}

/** Safely parse JSON, returning null on failure. */
function safeParseJson(text: string): Record<string, unknown> | null {
    try {
        return JSON.parse(stripCodeBlock(text));
    } catch {
        return null;
    }
}

export function parseArmyResponse(raw: string, faction: FactionId, turn: number): ArmyDecision | null {
    const data = safeParseJson(raw);
    if (!data) return null;

    // Required fields check
    if (!data.strategic_reasoning || !data.briefing_text) return null;
    if (!data.operation_decisions) return null;

    // Sanitize corps directives
    const corps_directives: ArmyDecision['corps_directives'] = {};
    if (data.corps_directives && typeof data.corps_directives === 'object') {
        for (const [corpsId, dir] of Object.entries(data.corps_directives as Record<string, unknown>)) {
            const d = dir as Record<string, unknown> | undefined;
            const rawStance = d?.stance;
            const stance: 'offensive' | 'balanced' | 'defensive' =
                typeof rawStance === 'string' && VALID_STANCES.has(rawStance)
                    ? rawStance as 'offensive' | 'balanced' | 'defensive'
                    : 'balanced';
            corps_directives[corpsId] = {
                stance,
                priority: typeof d?.priority === 'string' ? d.priority : undefined,
                hold_municipalities: Array.isArray(d?.hold_municipalities) ? d.hold_municipalities as string[] : undefined,
                offensive_targets: Array.isArray(d?.offensive_targets) ? d.offensive_targets as string[] : undefined,
            };
        }
    }

    const opDec = data.operation_decisions as Record<string, unknown>;
    return {
        faction,
        turn,
        corps_directives,
        operation_decisions: {
            approve: Array.isArray(opDec.approve) ? opDec.approve as string[] : [],
            postpone: Array.isArray(opDec.postpone) ? opDec.postpone as string[] : [],
            abort: Array.isArray(opDec.abort) ? opDec.abort as string[] : [],
        },
        peace_plan_response: data.peace_plan_response === 'accept' || data.peace_plan_response === 'reject'
            ? data.peace_plan_response as 'accept' | 'reject' : null,
        reserve_deployment: (data.reserve_deployment as ArmyDecision['reserve_deployment']) ?? null,
        strategic_reasoning: String(data.strategic_reasoning),
        briefing_text: String(data.briefing_text),
    };
}

export function parseCorpsResponse(raw: string, faction: FactionId, corpsId: string, turn: number): CorpsDecision | null {
    const data = safeParseJson(raw);
    if (!data) return null;
    if (!data.assessment) return null;

    // Sanitize sector stances
    const sector_stances: Record<string, string> = {};
    if (data.sector_stances && typeof data.sector_stances === 'object') {
        for (const [sid, stance] of Object.entries(data.sector_stances as Record<string, unknown>)) {
            sector_stances[sid] = VALID_SECTOR_STANCES.has(stance as string) ? (stance as string) : 'defend';
        }
    }

    return {
        corps_id: corpsId,
        faction,
        turn,
        sector_stances,
        operation_plan: (data.operation_plan as CorpsDecision['operation_plan']) ?? null,
        brigade_movements: data.brigade_movements && typeof data.brigade_movements === 'object'
            ? data.brigade_movements as CorpsDecision['brigade_movements'] : {},
        assessment: String(data.assessment),
    };
}

export function parseAdvisorResponse(raw: string): AdvisorResponse | null {
    const data = safeParseJson(raw);
    if (!data) return null;
    if (!data.assessment || !Array.isArray(data.recommendations)) return null;

    return {
        commander_name: String(data.commander_name ?? 'Commander'),
        faction: parseFactionId(data.faction, 'RBiH'),
        assessment: String(data.assessment),
        recommendations: (data.recommendations as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
            priority: typeof r.priority === 'number' ? r.priority : 0,
            action: String(r.action ?? ''),
            reasoning: String(r.reasoning ?? ''),
        })),
        context_type: parseAdvisorContextType(data.context_type),
    };
}
