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

export type CounterOfferFaction = 'RBiH' | 'RS' | 'HRHB';
export type CounterOfferAuthor = CounterOfferFaction | 'PLAYER';
export type CounterOfferResponse = 'accept' | 'reject' | 'conditional_accept' | 'counter';

export interface NegotiationDelta {
    plan_id: string;
    response: CounterOfferResponse;
    proposed_split: Record<CounterOfferFaction, number>;
    institutional_model?: string;
    rider?: string;
    source_citation: string;
}

export interface CounterOffer {
    id: string;
    author: CounterOfferAuthor;
    parent_offer_id: string;
    delta: NegotiationDelta;
    chain_depth: number;
    created_turn: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Rupture Consequences (Ring 2 — locked, non-reversible)
// ═══════════════════════════════════════════════════════════════════════════

/** A locked rupture consequence record — one-way, non-reversible. */
export interface RuptureConsequence {
    /** Unique identifier for this rupture event. */
    id: string;
    /** Turn when the rupture was recorded. */
    recorded_turn: number;
    /** Faction responsible (perpetrator). */
    perpetrator_faction: string;
    /** Brief historically-grounded description. Restrained wording. */
    description: string;
    /** Condemnation flag propagated to verdict. */
    condemnation_flag: string;
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
    /** Persisted counter-offer docket, sorted by id. */
    pending_counter_offers?: CounterOffer[];
    /** Composite Pyrrhic Score per faction (computed at game end). */
    pyrrhic_scores?: Record<string, number>;
    /** Result of the Dayton negotiation (set when Dayton resolves). */
    dayton_result?: DaytonResult;
    /** Pending Dayton negotiation menu, persisted by pipeline when trigger fires.
     *  UI adapter reads this — never computes it. Cleared implicitly when dayton_result is set. */
    pending_dayton?: PendingDaytonPacket;
    /** v0.6.0: Strategic dimensions per faction — hybrid base_value + event_modifier. */
    strategic_dimensions?: DimensionStore;
    /** Ring 2: Locked rupture consequences — permanent, non-reversible records. */
    rupture_consequences?: RuptureConsequence[];
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

/**
 * The master entity-autonomy dial (DIMENSION 2). Sets how much sovereignty RS
 * retains; in Phase 2 it scales the competency/constitutional deviation cost.
 * Default 'dayton-historical'. Mirror of EntityAutonomySetting in
 * institutional_packages.ts (kept here to avoid a sim→state import).
 */
export type EntityAutonomySetting =
    | 'confederation'
    | 'dayton-historical'
    | 'federalized'
    | 'unitary';

/** Competency owner (DIMENSION 3): who exercises a competency in the settlement. */
export type CompetencyOwnerChoice = 'state' | 'entity' | 'shared';

/** A proposal containing territorial demands and institutional choices. */
export interface DaytonProposal {
    /** Territorial package IDs the proposing faction demands. */
    territorial_demands: string[];
    /** Territorial package IDs the proposing faction concedes. */
    territorial_concessions: string[];
    /** Institutional choices: package id -> 'centralized' | 'decentralized'. */
    institutional_choices: Record<string, 'centralized' | 'decentralized'>;
    // ── Institutional-architecture expansion (2026-06-07) — all OPTIONAL, ──────
    //    backward-compatible (mirror the brcko_status?/entity_autonomy_index?
    //    optional pattern). Phase 1 declares them; Phase 2 wires resolution/cost.
    /** DIMENSION 2 master dial. Absent ⇒ 'dayton-historical'. */
    entity_autonomy?: EntityAutonomySetting;
    /** DIMENSION 3: competency id -> owner. Absent/partial ⇒ historical Annex-4 default. */
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    /** DIMENSION 4: constitutional choice id -> option id. Absent ⇒ historical default. */
    constitutional_choices?: Record<string, string>;
    /** DIMENSION 5: return/justice choice id -> option id. Absent ⇒ historical default. */
    return_justice?: Record<string, string>;
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
    /**
     * Brčko outcome (D1, owner ruling Opt 2a). Historically Brčko was deferred
     * to international arbitration at Dayton (Annex 2) and became the Brčko
     * District condominium of both Entities in 1999 — a THIRD state, neither
     * RBiH nor RS. When the brcko_district package is left unresolved (neither
     * cleanly demanded-and-won nor conceded), it resolves to 'arbitration'.
     * Optional/back-compat: absent on pre-D1 saves.
     */
    brcko_status?: 'federation' | 'rs' | 'arbitration';
    /** True when Brčko resolved to the international arbitration district (third state). */
    brcko_arbitration?: boolean;
    /**
     * Derived entity-autonomy index (D2, 0-100): weighted mean of the 6
     * institutional choices, where decentralized = high autonomy. 100 = maximally
     * decentralized (historical Dayton default). Read-only display + verdict input.
     * Optional/back-compat: absent on pre-D2 saves.
     */
    entity_autonomy_index?: number;
    /**
     * Peace dysfunction index (D3, 0-100): the gap between a functional
     * settlement and what was signed. Caps outcome_class. Optional/back-compat.
     */
    peace_dysfunction_index?: number;
    /**
     * Structural dysfunction flags raised by the signed settlement (D3). The
     * institutional-architecture expansion (2026-06-07) adds 'ohr_dependency' and
     * 'sejdic_finci_fault' to the existing five (7 total).
     */
    peace_dysfunction_flags?: string[];
    // ── Institutional-architecture expansion (2026-06-07) — all OPTIONAL. ──────
    //    Persisted mirrors of the proposal's new dimensions so the dysfunction
    //    index sees deviations after resolution (Phase 2 writes these; Phase 1
    //    only declares them). Absent ⇒ historical Annex-4 default.
    /** DIMENSION 2 master dial that was signed. Absent ⇒ 'dayton-historical'. */
    entity_autonomy?: EntityAutonomySetting;
    /** DIMENSION 3: final competency id -> owner allocation. */
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    /** DIMENSION 4: final constitutional choice id -> option id. */
    constitutional_choices?: Record<string, string>;
    /** DIMENSION 5: final return/justice choice id -> option id. */
    return_justice?: Record<string, string>;
}

/**
 * Deterministic breakdown of the peace_dysfunction_index (D3). Pure read of the
 * frozen settlement + endgame state; never mutates. Exposed for display / tests.
 */
export interface PeaceDysfunctionBreakdown {
    /** Composite 0-100. Higher = more dysfunctional (further from a functional peace). */
    index: number;
    /** Sub-component 0-100: entity autonomy (decentralization) above a functional floor. */
    autonomy_component: number;
    /** Sub-component 0-100: territorial fragmentation of the signed map. */
    fragmentation_component: number;
    /** Sub-component 0-100: constitutional gridlock-by-design (DIMENSION 4, 2026-06-07). */
    gridlock_component: number;
    /** Sub-component 0-100: Brčko left unresolved (arbitration) rather than cleanly assigned. */
    brcko_component: number;
    /** Sub-component 0-100: refugees created during the war and not returned. */
    refugees_component: number;
    /** Sub-component 0-100: condemnation flags (locked ruptures) entrenched by the settlement. */
    condemnation_component: number;
    /** Structural flags raised (e.g. frozen_partition, gridlock_by_design). */
    flags: string[];
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
    capital_breakdown: NegotiationBreakdown | null;
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
    /**
     * Derived entity-autonomy index (D2, 0-100) of the signed settlement, surfaced
     * at the top level for display. Mirror of dayton_result.entity_autonomy_index;
     * absent for non-Dayton endings and pre-D2 saves.
     */
    entity_autonomy_index?: number;
    /**
     * Peace dysfunction index (D3, 0-100) of the signed settlement, surfaced at the
     * top level for display. Mirror of dayton_result.peace_dysfunction_index.
     */
    peace_dysfunction_index?: number;
    /** Structural dysfunction flags (D3) of the signed settlement. */
    peace_dysfunction_flags?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Historical Baseline (endgame comparison reference data)
// ═══════════════════════════════════════════════════════════════════════════

/** Historical baseline data for endgame comparison.
 *  Loaded from data/reference/historical_baseline.json — not computed. */
export interface HistoricalBaselineMilestone {
    id: string;
    label: string;
    /** Week counted from April 1992. */
    historical_week: number;
    /** How the player-side week is resolved. */
    kind: 'war_end' | 'rupture';
    /** Required when kind is rupture. */
    event_id?: string;
    source_notes: string;
}

export interface HistoricalBaseline {
    war_duration_weeks: number;
    territory_final: Record<string, number>;
    total_killed: number;
    military_killed: Record<string, number>;
    civilian_killed: number;
    total_displaced: number;
    srebrenica_killed: number;
    milestones?: HistoricalBaselineMilestone[];
    source_notes: string;
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
