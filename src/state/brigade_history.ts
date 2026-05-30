/**
 * Brigade combat history tracking.
 *
 * Records engagement log (FIFO-capped) and running tallies for
 * war stories, decoration eligibility, and player-facing statistics.
 *
 * All data is deterministic — no randomness, no timestamps.
 * Turn numbers and OSID strings only.
 */

import type { ArmyHqOpId, FactionId, FormationId, TgId } from './game_state.js';

/** Combat outcome type alias (mirrors attack resolution outcomes). */
export type CombatOutcome =
    | 'decisive_victory'
    | 'victory'
    | 'costly_victory'
    | 'stalemate'
    | 'repulsed'
    | 'catastrophic';

/** A single recorded engagement for a brigade. */
export interface BrigadeEngagement {
    /** Deterministic join key: {turn}:{osid}:{attacker_brigade}:{defender_brigade|null} */
    battle_id?: string;
    /** Turn when battle occurred. */
    turn: number;
    /** OSID where battle occurred. */
    osid: string;
    /** Role this brigade played. */
    role: 'attacker' | 'defender';
    /** Battle outcome (from attacker's perspective). */
    outcome: CombatOutcome;
    /** Personnel lost by this brigade. */
    casualties_taken: number;
    /** Personnel lost by enemy in this engagement. */
    casualties_inflicted: number;
    /** Faction of the opposing force. */
    enemy_faction: FactionId;
    /** Whether OSID control changed hands. */
    territory_flipped: boolean;
    /** Whether this was part of a multi-brigade concentrated assault. */
    was_concentrated: boolean;
    /** Enemy equipment destroyed in this engagement. */
    equipment_destroyed?: { tanks: number; artillery: number };
    /** Equipment captured from the enemy in this engagement. */
    equipment_captured?: { tanks: number; artillery: number };
}

/**
 * Per-brigade TG participation record (ADR-0005 §Schema, lines 166-179).
 *
 * Telemetry the "back the officer" AAR/Chronicle UI (Phase 3B) renders: a record
 * that this brigade anchored or donated to a Tactical Group. Written at TG
 * formation (Phase 3A). Fields known only at dissolution (`dissolved_turn`,
 * `personnel_returned`, `casualties`) are optional + omitEmpty — populated later
 * if/when dissolution telemetry lands. Deterministic: no randomness, turn numbers
 * + ids only.
 */
export interface TgParticipationRecord {
    tg_id: TgId;
    /** CorpsOperation.id (or ArmyHqOpId) this TG carried out. */
    op_id: string;
    role: 'anchor' | 'donor';
    /** Turn the TG formed (= when this record was written). */
    formed_turn: number;
    /** Personnel this brigade lent at formation (donors only; 0/omitted for anchor). */
    personnel_lent?: number;
    /** Donor brigade's source corps (donors only; anchor uses its own corps). */
    donor_corps_id?: FormationId;
    /** Set when the TG is part of an Army HQ (faction-scope) op. */
    army_hq_op_id?: ArmyHqOpId;
}

/** Rolling window (turns) for live `tg_participations`; older flushed to archive (ADR-0005 §421). */
export const TG_PARTICIPATION_WINDOW_TURNS = 26;

/** Cumulative brigade service record. */
export interface BrigadeHistory {
    // --- Engagement log (FIFO cap at MAX_HISTORY_ENTRIES) ---
    engagements: BrigadeEngagement[];

    // --- Running tallies ---
    battles_fought: number;
    battles_as_attacker: number;
    battles_as_defender: number;
    victories: number;
    defeats: number;
    stalemates: number;
    total_casualties_taken: number;
    total_casualties_inflicted: number;
    total_osids_captured: number;
    total_osids_lost: number;
    total_equipment_destroyed: { tanks: number; artillery: number; aa_systems: number };
    total_equipment_captured: { tanks: number; artillery: number; aa_systems: number };

    // --- Streaks ---
    current_victory_streak: number;
    longest_victory_streak: number;
    current_defense_streak: number;
    longest_defense_streak: number;
    /** Consecutive turns defending same OSID under attack. */
    turns_under_siege: number;

    // --- Milestones ---
    first_battle_turn: number | null;
    first_battle_osid: string | null;
    worst_single_battle_casualties: number;
    worst_single_battle_turn: number | null;
    peak_personnel: number;
    nadir_personnel: number;

    // --- TG participation telemetry (ADR-0005 Phase 3A; optional/omitEmpty) ---
    /**
     * Rolling-window log of TG anchor/donor participations (ADR-0005 §178). Written
     * at TG formation (FLAG-ON only). Absent when the brigade has never joined a TG,
     * keeping flag-off serialized state byte-identical. Bounded to the most recent
     * TG_PARTICIPATION_WINDOW_TURNS by formed_turn; older entries flushed to archive.
     */
    tg_participations?: TgParticipationRecord[];
    /** Participations older than the rolling window (ADR-0005 §179); lazy-loaded. */
    archived_tg_participations?: TgParticipationRecord[];
}

/** Maximum engagement entries per brigade history. FIFO eviction beyond this. */
export const MAX_HISTORY_ENTRIES = 200;

/** Outcomes that count as attacker wins. */
export const ATTACKER_WIN_OUTCOMES: CombatOutcome[] = [
    'decisive_victory',
    'victory',
    'costly_victory',
];

/** Outcomes that count as attacker losses. */
export const ATTACKER_LOSS_OUTCOMES: CombatOutcome[] = [
    'repulsed',
    'catastrophic',
];

/** Create an empty brigade history with all tallies zeroed. */
export function createEmptyBrigadeHistory(initialPersonnel: number): BrigadeHistory {
    return {
        engagements: [],
        battles_fought: 0,
        battles_as_attacker: 0,
        battles_as_defender: 0,
        victories: 0,
        defeats: 0,
        stalemates: 0,
        total_casualties_taken: 0,
        total_casualties_inflicted: 0,
        total_osids_captured: 0,
        total_osids_lost: 0,
        total_equipment_destroyed: { tanks: 0, artillery: 0, aa_systems: 0 },
        total_equipment_captured: { tanks: 0, artillery: 0, aa_systems: 0 },
        current_victory_streak: 0,
        longest_victory_streak: 0,
        current_defense_streak: 0,
        longest_defense_streak: 0,
        turns_under_siege: 0,
        first_battle_turn: null,
        first_battle_osid: null,
        worst_single_battle_casualties: 0,
        worst_single_battle_turn: null,
        peak_personnel: initialPersonnel,
        nadir_personnel: initialPersonnel,
    };
}
