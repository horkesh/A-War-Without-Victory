/**
 * Types for the Negotiation Capital, Patron Pressure, and Peace Plan systems.
 *
 * Negotiation capital is accumulated per-turn during war phase and determines
 * what each faction can demand (or must concede) at the Dayton negotiation.
 *
 * Deterministic: all computations formula-based, no randomness.
 */

import type { FactionId } from './game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Negotiation Capital
// ═══════════════════════════════════════════════════════════════════════════

export interface NegotiationCapital {
    /** Territory held, front line strength, strategic positions. 0-100. */
    military_position: number;
    /** Civilian protection, refugee management. 0-100 (negative raw = atrocities). */
    humanitarian_standing: number;
    /** Diplomatic weight, patron support, peace plan compliance. 0-100. */
    international_credibility: number;
    /** Combat performance relative to resources. 0-100. */
    military_effectiveness: number;
    /** Internal unity, authority, alliance management. 0-100. */
    political_cohesion: number;

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
}

/** Faction-specific weights for the 5 capital dimensions. Sum to 1.0. */
export const CAPITAL_WEIGHTS: Record<string, Record<string, number>> = {
    RBiH: {
        military_position: 0.15,
        humanitarian_standing: 0.30,
        international_credibility: 0.20,
        military_effectiveness: 0.20,
        political_cohesion: 0.15,
    },
    RS: {
        military_position: 0.30,
        humanitarian_standing: 0.10,
        international_credibility: 0.15,
        military_effectiveness: 0.25,
        political_cohesion: 0.20,
    },
    HRHB: {
        military_position: 0.20,
        humanitarian_standing: 0.15,
        international_credibility: 0.20,
        military_effectiveness: 0.15,
        political_cohesion: 0.30,
    },
};

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
    capital: Record<string, NegotiationCapital>;
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
}

/** Create empty negotiation capital for a faction. */
export function createEmptyCapital(): NegotiationCapital {
    return {
        military_position: 0,
        humanitarian_standing: 50, // start neutral
        international_credibility: 50,
        military_effectiveness: 50,
        political_cohesion: 50,
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
