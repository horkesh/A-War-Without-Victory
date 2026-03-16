/**
 * Army HQ Gathering types — v0.4.7
 * Periodic command meetings producing multi-turn campaign plans.
 */

import type { FactionId } from '../../state/game_state.js';

/** Per-corps front classification set by the gathering */
export interface FrontPriority {
    corps_id: string;
    /** primary = offensive + reinforcements, secondary = supporting, economy = hold minimum, contain = siege/no offensive */
    role: 'primary' | 'secondary' | 'economy' | 'contain';
    /** Suggested stance (corps commander personality still modulates) */
    suggested_stance: 'offensive' | 'balanced' | 'defensive' | 'reorganize';
    /** Target municipalities for primary/secondary fronts */
    offensive_targets?: string[];
    /** Municipalities to hold at all costs */
    hold_targets?: string[];
}

/** Adaptive doctrine override replacing calendar-driven phases */
export interface DoctrineOverride {
    /** Army-wide stance */
    army_stance: 'general_defensive' | 'balanced' | 'general_offensive' | 'total_mobilization';
    /** Per-corps stance ceilings */
    corps_stance_ceilings?: Record<string, 'offensive' | 'balanced' | 'defensive' | 'reorganize'>;
    /** Aggression modifier applied to all corps */
    aggression_modifier: number;
}

/** A participant in a synchronized multi-corps operation */
export interface SyncOpParticipant {
    corps_id: string;
    /** main_effort gets resource priority */
    role: 'main_effort' | 'supporting' | 'feint' | 'fixing';
    /** Target OSIDs for this participant's axis */
    target_osids: string[];
    /** Minimum brigades to commit */
    min_brigades: number;
}

/** Multi-corps synchronized operation with launch window */
export interface SynchronizedOperation {
    /** Human-readable name for debugging */
    name: string;
    /** Participating corps with roles */
    participants: SyncOpParticipant[];
    /** Earliest turn any participant should launch */
    launch_window_start: number;
    /** Latest turn — launch regardless of readiness */
    launch_window_end: number;
    /** Target area (municipalities) */
    target_area: string[];
}

/** Brigade transfer between corps (typed but not fully implemented in v0.4.7) */
export interface ForceTransfer {
    brigade_id: string;
    from_corps: string;
    to_corps: string;
    march_turns: number;
    issued_turn: number;
    completed: boolean;
}

/** The output of an Army HQ Gathering */
export interface CampaignPlan {
    /** Turn this plan was created */
    issued_turn: number;
    /** Turn this plan expires */
    valid_until_turn: number;
    /** Was this an emergency session? */
    emergency: boolean;
    /** Reason for gathering */
    trigger_reason: string;
    /** Per-corps front classification */
    front_priorities: FrontPriority[];
    /** Doctrine override (replaces calendar-driven phases) */
    doctrine_override?: DoctrineOverride;
    /** Multi-corps synchronized operations */
    synchronized_operations: SynchronizedOperation[];
    /** Brigade transfers between corps (typed, not fully implemented) */
    force_transfers: ForceTransfer[];
    /** Corps that could not attend (besieged/enclaved) */
    excluded_corps: string[];
}

/** Per-corps assessment used during gathering deliberation */
export interface CorpsAssessment {
    corps_id: string;
    attendance: 'full' | 'radio' | 'excluded';
    strength_class: string;
    exhaustion: number;
    has_active_op: boolean;
    recent_territory_change: number;
    sector_threat_avg: number;
    available_brigades: number;
    officer_competence: number;
}

/** Theater-wide assessment produced before plan generation */
export interface TheaterAssessment {
    corps_assessments: CorpsAssessment[];
    territory_trend: 'gaining' | 'stable' | 'losing';
    supply_status: 'abundant' | 'adequate' | 'strained' | 'critical';
    manpower_status: 'healthy' | 'adequate' | 'strained' | 'critical';
    weakest_enemy_front: string | null;
    strongest_threat: string | null;
}
