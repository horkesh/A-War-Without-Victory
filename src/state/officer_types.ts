/**
 * Type definitions for the Named Officers system (Tier 1).
 *
 * Named officers are historical corps and army-level commanders with individual
 * ratings that affect combat modifiers, corps directives, and succession.
 *
 * Deterministic: all data is static JSON. Mutable state is on GameState.
 */

import type { FactionId } from './game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Static officer data (loaded from JSON, immutable during simulation)
// ═══════════════════════════════════════════════════════════════════════════

export type OfficerRank = 'army_commander' | 'corps_commander' | 'deputy';
export type OfficerOrigin = 'jna' | 'hv' | 'to' | 'militia' | 'foreign' | 'political' | 'military';
export type OfficerPoolTier = 'starter' | 'tier_a' | 'tier_b' | 'tier_c';

export interface NamedOfficer {
    id: string;
    name: string;
    faction: FactionId;
    rank: OfficerRank;

    /** Overall military skill (1-5). Primary combat modifier. */
    competence: number;
    /** Attack willingness (1-5). Affects corps directive aggression. */
    aggressiveness: number;
    /** Defensive combat skill (1-5). Affects defensive modifier. */
    defensive_skill: number;
    /** Political reliability (1-5). Affects HVO succession priority. */
    political_reliability: number;

    /** Preferred corps (no assignment penalty). */
    home_corps_id?: string;
    /** Acceptable corps (small assignment penalty). */
    compatible_corps_ids?: string[];

    /** Turn when officer enters the pool. */
    available_from_turn: number;
    /** Turn when officer departs (historical departure). */
    available_until_turn?: number;
    /** True if this officer starts assigned at scenario begin. */
    is_historical_start?: boolean;
    /** Corps ID to auto-assign at scenario start (for starters). */
    historical_corps_id?: string;

    origin: OfficerOrigin;
    /** 0.0-1.0, higher = more likely to be killed/captured. */
    casualty_vulnerability: number;
    /** Whether competence can improve via combat experience. */
    can_improve: boolean;
    /** Per-battle competence gain (0.0-0.1). */
    improvement_rate: number;
    /** Pool priority tier for succession ordering. */
    pool_tier: OfficerPoolTier;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mutable officer state (on GameState, changes each turn)
// ═══════════════════════════════════════════════════════════════════════════

export type OfficerStatus = 'active' | 'reserve' | 'killed' | 'captured' | 'retired' | 'defected';

export interface NamedOfficerState {
    officer_id: string;
    status: OfficerStatus;
    assigned_corps_id: string | null;
    turns_in_command: number;
    battles: number;
    victories: number;
    /** Negative competence penalty from incompatible assignment. */
    effective_competence_penalty: number;
    /** Turns remaining on assignment penalty. 0 = no penalty. */
    penalty_turns_remaining: number;
    /** True if serving as acting commander (lower modifier). */
    acting_commander: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction officer config (from war timeline)
// ═══════════════════════════════════════════════════════════════════════════

export interface FactionOfficerConfig {
    faction: FactionId;
    /** Per-battle competence gain for faction-generated officers. */
    learning_rate: number;
    /** VRS brain drain: officers leaving per 20 turns after w40. */
    brain_drain_rate?: number;
    /** VRS brain drain start week. */
    brain_drain_start_week?: number;
    /** ARBiH pool regeneration: new officer every N turns. */
    pool_regeneration_interval?: number;
    /** ARBiH generated officer base competence. */
    pool_generated_base_competence?: number;
    /** ARBiH generated officer competence cap. */
    pool_generated_max_competence?: number;
    /** HVO Zagreb cadre: new officer every N turns. */
    zagreb_cadre_interval?: number;
    /** HVO Roso restructuring week (officers get +1 comp). */
    roso_restructuring_week?: number;
    /** ARBiH warlord friction end week. */
    warlord_friction_end_week?: number;
    /** HVO political replacement delay (turns). */
    political_replacement_delay?: number;
    /** HVO combat death replacement delay (turns). */
    combat_death_replacement_delay?: number;
    /** Competence of generic replacement officers. */
    generic_replacement_competence?: number;
}
