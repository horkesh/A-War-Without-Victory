// src/sim/ai_commander/ai_types.ts
/**
 * Shared types for the AI Command Layer.
 * These types define the structured output schemas that AI responses are parsed into.
 * They map onto existing game types (CorpsDirective, CorpsOperation) after validation.
 */

import type { FactionId } from '../../state/game_state.js';

/** Army-level decision output from AI. Maps to corps directives + operation decisions. */
export interface ArmyDecision {
    faction: FactionId;
    turn: number;
    corps_directives: Record<string, ArmyCorpsDirective>;
    operation_decisions: {
        approve: string[];
        postpone: string[];
        abort: string[];
    };
    peace_plan_response?: 'accept' | 'reject' | null;
    reserve_deployment?: {
        deploy_to: string;
        reason: string;
    } | null;
    strategic_reasoning: string;
    briefing_text: string;
}

/** Army's directive to a specific corps. */
export interface ArmyCorpsDirective {
    stance: 'offensive' | 'balanced' | 'defensive';
    priority?: string;
    hold_municipalities?: string[];
    offensive_targets?: string[];
}

/** Corps-level decision output from AI. Maps directly to CorpsDirective. */
export interface CorpsDecision {
    corps_id: string;
    faction: FactionId;
    turn: number;
    sector_stances: Record<string, string>;
    operation_plan?: {
        target: string;
        force: string[];
        approach: 'concentrated_assault' | 'broad_front' | 'probing' | 'envelopment';
        timing: 'immediate' | 'next_turn' | 'after_preparation';
    } | null;
    brigade_movements: Record<string, { destination: string; reason: string }>;
    assessment: string;
}

/** v0.8.4: Political/event decision logged for replay and audit. API integration in Phase C. */
export interface PoliticalDecision {
    faction: FactionId;
    turn: number;
    event_responses: Record<string, { choice: string; reasoning: string }>;
    peace_plan_response?: 'accept' | 'reject' | null;
    alliance_posture?: 'maintain' | 'distance' | 'break';
    reasoning: string;
}

/** Logged decision for replay determinism. */
export interface CommandDecisionLogEntry {
    turn: number;
    level: 'army' | 'corps' | 'advisor' | 'political' | 'event';
    faction: FactionId;
    corps_id?: string;
    decision: ArmyDecision | CorpsDecision | AdvisorResponse | PoliticalDecision;
    model_used: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    latency_ms?: number;
}

/** Player advisor response. */
export interface AdvisorResponse {
    commander_name: string;
    faction: FactionId;
    assessment: string;
    recommendations: Array<{
        priority: number;
        action: string;
        reasoning: string;
    }>;
    context_type: 'situation_analysis' | 'operation_planning' | 'peace_plan';
}

/** AI prompt structure passed to the client. */
export interface AiPrompt {
    system: string;
    user: string;
    model: string;
    max_tokens: number;
    temperature: number;
}

/** Parsed AI response. */
export interface AiResponse {
    content: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    /** Optional deterministic diagnostic supplied by test/offline clients; live wall-clock timing is never persisted. */
    latency_ms?: number;
}
