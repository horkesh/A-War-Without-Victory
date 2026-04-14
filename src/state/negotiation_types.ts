/**
 * Types for the Negotiation Capital, Patron Pressure, and Peace Plan systems.
 *
 * Negotiation capital is accumulated per-turn during war phase and determines
 * what each faction can demand (or must concede) at the Dayton negotiation.
 *
 * Deterministic: all computations formula-based, no randomness.
 */

import type { FactionId } from './game_state.js';
import type { DimensionStore } from '../sim/events/strategic_dimensions.js';

// ═══════════════════════════════════════════════════════════════════════════
// Negotiation Breakdown (raw war-data per faction)
// ═══════════════════════════════════════════════════════════════════════════

export interface NegotiationBreakdown {
    // ── Detailed breakdown (raw data, not clamped) ──
    territory_controlled_pct: number;
    territory_controlled_km2: number;
    civilians_under_protection: number;
    refugees_created: number;
    refugees_received: number;
    military_casualties_inflicted: number;
    military_casualties_taken: number;
    civilian_casualties_caused: number;
    enclaves_held: string[];
    enclaves_lost: string[];
    peace_plans_accepted: string[];
    peace_plans_rejected: string[];
    operations_launched: number;
    operations_successful: number;
    war_crimes_events: number;
    /** Count of brigades meeting combat effectiveness threshold this turn.
     *  Written by compute-combat-effective-brigades pipeline step.
     *  Sentinel -1 = not yet computed. Fallback in computePoliticalAssessment uses 0.5. */
    combat_effective_brigades?: number;
}

// CAPITAL_WEIGHTS removed — replaced by DIMENSION_WEIGHTS in strategic_dimensions.ts

// ═══════════════════════════════════════════════════════════════════════════
// Patron Relationships
// ═══════════════════════════════════════════════════════════════════════════

export interface PatronRelationship {
    /** Patron identifier. */
    patron_id: 'serbia' | 'croatia' | 'international_community';
    /** Overall support level 0-100. Drives supply, diplomatic cover. */
    support_level: number;
    /** How much the patron can force the client to accept peace terms. 0-100. */
    override_authority: number;
    /** Whether patron has imposed sanctions on the client faction. */
    sanctions_active: boolean;
    /** Key events affecting the relationship. */
    relationship_events: string[];
}

/** Default patron mappings. */
export const FACTION_PATRONS: Record<string, 'serbia' | 'croatia' | 'international_community'> = {
    RS: 'serbia',
    HRHB: 'croatia',
    RBiH: 'international_community',
};

// ═══════════════════════════════════════════════════════════════════════════
// Peace Plans
// ═══════════════════════════════════════════════════════════════════════════

export interface PeacePlanDefinition {
    id: string;
    name: string;
    /** Week (from April 1992) when the plan is offered. */
    trigger_week: number;
    /** Proposed territorial split (% per faction). */
    proposed_split: Record<string, number>;
    /** Institutional model description. */
    institutional_model: string;
    /** Override authority change on rejection (per faction). */
    override_change_on_reject: Record<string, number>;
    /** International credibility change on rejection (per faction). */
    credibility_change_on_reject: Record<string, number>;
    /** Narrative text shown to player. */
    narrative: string;
}

export interface PeacePlanResponse {
    plan_id: string;
    turn_offered: number;
    responses: Record<string, 'accepted' | 'rejected' | 'pending'>;
    resolved: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Negotiation State (on GameState)
// ═══════════════════════════════════════════════════════════════════════════

export interface NegotiationState {
    /** Per-faction negotiation capital, updated each turn. */
    capital: Record<string, NegotiationBreakdown>;
    /** Per-faction patron relationship. */
    patron_relationships: Record<string, PatronRelationship>;
    /** History of peace plan offers and responses. */
    peace_plan_history: PeacePlanResponse[];
    /** Currently pending peace plan (awaiting player response). */
    pending_peace_plan?: {
        plan_id: string;
        turn_offered: number;
        bot_responses: Record<string, 'accepted' | 'rejected'>;
    };
    /** Composite Pyrrhic Score per faction (computed at game end). */
    pyrrhic_scores?: Record<string, number>;
    /** Result of the Dayton negotiation (set when Dayton resolves). */
    dayton_result?: DaytonResult;
    /** Pending Dayton negotiation menu, persisted by pipeline when trigger fires.
     *  UI adapter reads this — never computes it. Cleared implicitly when dayton_result is set. */
    pending_dayton?: PendingDaytonPacket;
    /** v0.6.0: Strategic dimensions per faction — hybrid base_value + event_modifier. */
    strategic_dimensions?: DimensionStore;
}

/** Persisted Dayton negotiation menu — set by pipeline, read by adapter. */
export interface PendingDaytonPacket {
    territorial_packages: Array<{
        id: string;
        name: string;
        default_holder: string;
        demand_cost: number;
        concede_cost: number;
    }>;
    institutional_packages: Array<{
        id: string;
        name: string;
        centralized_cost: number;
        decentralized_cost: number;
    }>;
    faction_capital: Record<string, number>;
    patron_override: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dayton Negotiation
// ═══════════════════════════════════════════════════════════════════════════

/** A territorial package that can be demanded or conceded at Dayton. */
export interface TerritorialPackage {
    id: string;
    name: string;
    description: string;
    /** Faction that holds this area by default (based on front lines). */
    default_holder: string;
    /** Capital cost for the non-holder to demand this package. */
    capital_cost_to_demand: number;
    /** Capital cost for the holder to concede this package. */
    capital_cost_to_concede: number;
    /** OSID keyword fragments for map matching. */
    osid_keywords: string[];
}

/** An institutional negotiation point at Dayton. */
export interface InstitutionalPackage {
    id: string;
    name: string;
    description: string;
    /** Capital cost to RS if centralized outcome is chosen. */
    centralized_cost: number;
    /** Capital cost to RBiH if decentralized outcome is chosen. */
    decentralized_cost: number;
}

/** A proposal containing territorial demands and institutional choices. */
export interface DaytonProposal {
    /** Territorial package IDs the proposing faction demands. */
    territorial_demands: string[];
    /** Territorial package IDs the proposing faction concedes. */
    territorial_concessions: string[];
    /** Institutional choices: package id -> 'centralized' | 'decentralized'. */
    institutional_choices: Record<string, 'centralized' | 'decentralized'>;
}

/** Bot response to a Dayton proposal. */
export interface DaytonBotResponse {
    decision: 'accept' | 'reject' | 'counter';
    /** If counter, the bot's counter-proposal. */
    counter_proposal?: DaytonProposal;
    /** Reason for the decision (for UI display). */
    reason: string;
    /** Total capital cost of the proposal to this bot faction. */
    proposal_cost: number;
    /** Bot's available capital. */
    available_capital: number;
}

/** Final result of the Dayton negotiation. */
export interface DaytonResult {
    /** Territorial packages that were accepted in the final agreement. */
    territorial_packages_accepted: string[];
    /** Territorial packages that were rejected (remain with default holder). */
    territorial_packages_rejected: string[];
    /** Institutional outcome for each negotiation point. */
    institutional_choices: Record<string, 'centralized' | 'decentralized'>;
    /** Final territory percentage per faction (approximate, from packages). */
    final_territory_split: Record<string, number>;
    /** Items where patron override forced acceptance. */
    patron_overrides_applied: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Verdict & Scoring Types (Phase 5)
// ═══════════════════════════════════════════════════════════════════════════

/** Outcome classification for faction endgame verdict.
 *  Ordered from best to worst. Used by verdict packet, not by termination. */
export type OutcomeClass =
    | 'strategic_success'
    | 'survival'
    | 'negotiated_escape'
    | 'pyrrhic_success'
    | 'hollow_victory'
    | 'failure'
    | 'collapse';

/** Per-dimension grade (one of the 5 capital dimensions). */
export interface DimensionGrade {
    dimension: string;
    label: string;
    score: number;
    grade: string;
}

/** Complete verdict for a single faction. */
export interface FactionVerdict {
    faction: string;
    /** Composite score 0-100, weighted by faction-specific DIMENSION_WEIGHTS. */
    pyrrhic_score: number;
    /** Letter grade: 'A+', 'A', 'B', 'C', 'D', 'F'. */
    grade: string;
    /** Human-readable description of the grade anchor matched. */
    grade_description: string;
    /** Full negotiation capital breakdown. */
    capital_breakdown: NegotiationBreakdown;
    /** Per-dimension letter grades (5 dimensions). */
    dimension_grades: DimensionGrade[];
    /** Classified outcome — primary narrative driver, not a naked number. */
    outcome_class: OutcomeClass;
    /** Condemnation flags that cap or taint the verdict regardless of score. */
    condemnation_flags: string[];
}

/** Complete game verdict covering all factions and the overall outcome. */
export interface GameVerdict {
    outcome_type: 'dayton' | 'peace_plan' | 'termination';
    outcome_label: string;
    turn: number;
    date: string;
    duration_weeks: number;
    faction_verdicts: Record<string, FactionVerdict>;
    dayton_result?: DaytonResult;
}

/** Create empty negotiation breakdown for a faction. */
export function createEmptyCapital(): NegotiationBreakdown {
    return {
        territory_controlled_pct: 0,
        territory_controlled_km2: 0,
        civilians_under_protection: 0,
        refugees_created: 0,
        refugees_received: 0,
        military_casualties_inflicted: 0,
        military_casualties_taken: 0,
        civilian_casualties_caused: 0,
        enclaves_held: [],
        enclaves_lost: [],
        peace_plans_accepted: [],
        peace_plans_rejected: [],
        operations_launched: 0,
        operations_successful: 0,
        war_crimes_events: 0,
    };
}

/** Create default patron relationship for a faction. */
export function createDefaultPatronRelationship(factionId: string): PatronRelationship {
    const patronId = FACTION_PATRONS[factionId] ?? 'international_community';
    const defaults: Record<string, { support: number; override: number }> = {
        RS: { support: 80, override: 10 },
        HRHB: { support: 70, override: 25 },
        RBiH: { support: 40, override: 5 },
    };
    const d = defaults[factionId] ?? { support: 50, override: 10 };
    return {
        patron_id: patronId,
        support_level: d.support,
        override_authority: d.override,
        sanctions_active: false,
        relationship_events: [],
    };
}
