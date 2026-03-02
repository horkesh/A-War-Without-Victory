/**
 * Corps/Army aggregate combat summary.
 *
 * Aggregates brigade_history data from subordinate brigades into
 * a single CombatSummary for corps and army_hq formations.
 *
 * Pure functions, deterministic, sorted iteration.
 */

import type { FormationState } from './game_state.js';

/** Aggregate combat statistics for a corps or army HQ. */
export interface CombatSummary {
    // Aggregate tallies (sum of subordinate brigade_history fields)
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

    // Derived ratios
    /** victories / battles_fought (0 if no battles). */
    win_rate: number;
    /** inflicted / taken (0 if no casualties taken). */
    casualty_exchange_ratio: number;

    // Personnel snapshot
    current_personnel: number;
    /** Sum of peak_personnel across subordinates. */
    peak_aggregate_personnel: number;
    /** Sum of nadir_personnel across subordinates. */
    nadir_aggregate_personnel: number;

    // War story arc distribution (from subordinate war_story.arc)
    arc_distribution: Record<string, number>;

    // Subordinate counts
    brigade_count: number;
    active_brigade_count: number;

    // Notable subordinates (tie-broken by sorted ID)
    most_casualties_brigade_id: string | null;
    most_victories_brigade_id: string | null;
}

/** Create an empty combat summary with all fields zeroed. */
export function createEmptyCombatSummary(): CombatSummary {
    return {
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
        win_rate: 0,
        casualty_exchange_ratio: 0,
        current_personnel: 0,
        peak_aggregate_personnel: 0,
        nadir_aggregate_personnel: 0,
        arc_distribution: {},
        brigade_count: 0,
        active_brigade_count: 0,
        most_casualties_brigade_id: null,
        most_victories_brigade_id: null,
    };
}

/**
 * Aggregate brigade histories into a single CombatSummary.
 *
 * Pure function. Brigades must be pre-sorted by ID for determinism.
 * Only brigades with brigade_history contribute to tallies.
 */
export function aggregateBrigadeHistories(brigades: FormationState[]): CombatSummary {
    const summary = createEmptyCombatSummary();

    let maxCasualties = -1;
    let maxVictories = -1;

    for (const b of brigades) {
        summary.brigade_count++;
        if (b.status === 'active') {
            summary.active_brigade_count++;
        }

        summary.current_personnel += b.personnel ?? 0;

        const h = b.brigade_history;
        if (h) {
            summary.battles_fought += h.battles_fought;
            summary.battles_as_attacker += h.battles_as_attacker;
            summary.battles_as_defender += h.battles_as_defender;
            summary.victories += h.victories;
            summary.defeats += h.defeats;
            summary.stalemates += h.stalemates;
            summary.total_casualties_taken += h.total_casualties_taken;
            summary.total_casualties_inflicted += h.total_casualties_inflicted;
            summary.total_osids_captured += h.total_osids_captured;
            summary.total_osids_lost += h.total_osids_lost;
            summary.peak_aggregate_personnel += h.peak_personnel;
            summary.nadir_aggregate_personnel += h.nadir_personnel;

            // Track most casualties (deterministic: first by value desc, then by sorted ID)
            if (h.total_casualties_taken > maxCasualties) {
                maxCasualties = h.total_casualties_taken;
                summary.most_casualties_brigade_id = b.id;
            }
            // Track most victories
            if (h.victories > maxVictories) {
                maxVictories = h.victories;
                summary.most_victories_brigade_id = b.id;
            }
        }

        // Arc distribution from war_story
        const arc = b.war_story?.arc;
        if (arc) {
            summary.arc_distribution[arc] = (summary.arc_distribution[arc] ?? 0) + 1;
        }
    }

    // Derived ratios
    if (summary.battles_fought > 0) {
        summary.win_rate = summary.victories / summary.battles_fought;
    }
    if (summary.total_casualties_taken > 0) {
        summary.casualty_exchange_ratio = summary.total_casualties_inflicted / summary.total_casualties_taken;
    }

    return summary;
}
