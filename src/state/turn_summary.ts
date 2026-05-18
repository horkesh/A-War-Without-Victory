/**
 * TurnSummary: after-action report compiled at the end of each war turn.
 *
 * Written by `compile-turn-summary` pipeline step; stored in GameState.turn_summaries[].
 * Trimmed to last 3 turns. Persists through save/load.
 * Read-only to all systems after compilation — used by GUI only.
 */

import type { FactionId, FormationId } from './game_state.js';
import type { CombatOutcome } from './brigade_history.js';
import type { NarrativeArc } from '../sim/war_stories.js';
import type { BrigadeDecoration } from './decoration_types.js';
import type { PublicIntelFrictionAnnotation } from '../sim/combat/attack_resolution_types.js';

/** A single battle that occurred this turn. One entry per OSID (concentrated assaults merged). */
export interface TurnBattle {
    osid: string;
    mun_id?: string;
    attacker_faction: FactionId;
    defender_faction: FactionId;
    /** Pioneer brigade (first/lead attacker). */
    primary_attacker_id: FormationId;
    primary_defender_id: FormationId | null;
    /** All participating attacker IDs (for concentrated assaults). */
    all_attacker_ids: FormationId[];
    /** Outcome from attacker's perspective. */
    outcome: CombatOutcome;
    attacker_casualties: number;
    defender_casualties: number;
    territory_flipped: boolean;
    was_concentrated: boolean;
    /** Public-safe execution-friction annotation; no hidden enemy truth. */
    execution_friction?: PublicIntelFrictionAnnotation;
    /** Per-brigade defender contributions from distance-weighted defense (Layer A). */
    defender_contributions?: Array<{
        brigade_id: string;
        distance_hops: number;
        is_home_municipality: boolean;
        reactive_weight: number;
        casualties_taken: number;
    }>;
}

/** A territory control change deemed notable. */
export interface NotableFlip {
    osid: string;
    mun_id?: string;
    from: FactionId | null;
    to: FactionId | null;
    significance: 'municipality_seat' | 'enclave_breach' | 'enclave_relief' | 'corridor' | 'generic';
}

/** A brigade decoration newly awarded this turn. */
export interface DecorationAward {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    decoration: BrigadeDecoration;
}

/** A formation whose narrative arc changed this turn. */
export interface ArcTransition {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    from_arc: NarrativeArc;
    to_arc: NarrativeArc;
}

/** A formation that spawned this turn. */
export interface FormationSpawn {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
    kind: string;
}

/** A formation destroyed or disbanded this turn. */
export interface FormationDestruction {
    formation_id: FormationId;
    formation_name: string;
    faction: FactionId;
}

/** A notable non-combat event. */
export interface TurnNotableEvent {
    kind:
        | 'graz_accords_activated'
        | 'truce_broken'
        | 'washington_agreement'
        | 'rbih_hrhb_framework_activated'
        | 'operation_storm'
        | 'ceasefire_activated'
        | 'siege_formed'
        | 'siege_broken'
        | 'first_battle';
    description: string;
    faction?: FactionId;
    osid?: string;
}

/** Complete after-action report for one simulation turn. */
export interface TurnSummary {
    turn: number;

    // --- Combat ---
    /** All battles that occurred this turn, deduplicated per OSID, sorted by osid. */
    battles: TurnBattle[];

    // --- Territory ---
    /** Net OSID gain/loss per faction (positive = gained). */
    territory_net: Partial<Record<FactionId, number>>;
    /** Notable territory flips (municipality seats, enclave events, corridors). */
    notable_flips: NotableFlip[];

    // --- Displacement ---
    displacement_total: number;
    displacement_by_ethnicity: Partial<Record<FactionId, number>>;
    /** Municipality ID with highest displacement volume this turn. */
    displacement_hotspot?: string;

    // --- Unit events ---
    decoration_awards: DecorationAward[];
    arc_transitions: ArcTransition[];
    formation_spawns: FormationSpawn[];
    formation_destructions: FormationDestruction[];

    // --- Faction pulse ---
    /** Change in general_supply_reserve per faction this turn (positive = gained). */
    supply_deltas: Partial<Record<FactionId, number>>;
    heavy_munitions_deltas: Partial<Record<FactionId, number>>;

    // --- Movement ---
    /** Brigade movements this turn (location_osid changed from snapshot). */
    movements: Array<{ formation_id: string; formation_name: string; from_osid: string; to_osid: string }>;

    // --- Supply ---
    /** Supply state transitions this turn (adequate→strained, strained→critical, etc.). */
    supply_transitions: Array<{ osid: string; from: string; to: string }>;

    // --- Historical events ---
    /** Historical events that fired this turn (from scenario event definitions). */
    events_fired: Array<{ id: string; text: string }>;

    // --- Notable events ---
    notable_events: TurnNotableEvent[];

    // --- Snapshots (for Chronicle / trend tracking) ---
    /** Area-weighted territory % per faction at end of this turn. */
    territory_snapshot?: Partial<Record<FactionId, number>>;
    /** General supply reserve per faction at end of this turn. */
    supply_snapshot?: Partial<Record<FactionId, number>>;
}

/** Keep all turn summaries — battle history feeds the settlement timeline. */
export const MAX_TURN_SUMMARIES = 9999;
