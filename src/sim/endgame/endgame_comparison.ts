/**
 * Endgame comparison — downstream reflection, not an owner.
 *
 * Compares the player's war costs against historical BiH war baseline.
 * Produces divergence notes for narrative surfaces.
 *
 * Deterministic: no Math.random(), no timestamps, sorted iteration via strictCompare.
 */

import type { CostLedger } from './cost_ledger.js';
import type { HistoricalBaseline } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type MilestoneComparisonStatus = 'early' | 'late' | 'on_time' | 'absent';

export interface MilestoneComparison {
    /** Stable milestone id, e.g. washington_agreement or dayton_accords. */
    id: string;
    /** Player-facing milestone label. */
    label: string;
    /** Historical reference week counted from April 1992. */
    historical_week: number;
    /** Player-run week, or null when the milestone did not occur. */
    player_week: number | null;
    /** Positive = later than history, negative = earlier, null = absent. */
    delta_weeks: number | null;
    /** Canonical timing classification for presentation surfaces. */
    status: MilestoneComparisonStatus;
    /** Short downstream explanation; authored by comparison producer. */
    summary: string;
}

export interface ComparisonResult {
    /** Positive = longer than history, negative = shorter. */
    duration_delta_weeks: number;
    /** Faction or entity key -> delta from historical %. */
    territory_divergence: Record<string, number>;
    /** Player total military killed / historical total killed. */
    casualty_ratio: number;
    /** Player total displaced (refugees_created sum) / historical displaced. */
    displacement_ratio: number;
    /** Rupture events that differ from history (IDs present in player run). */
    rupture_divergence: string[];
    /** Human-readable divergence descriptions, sorted deterministically. */
    divergence_notes: string[];
    /** Optional milestone-level timing comparison rows for endgame surfaces. */
    milestone_comparison?: MilestoneComparison[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Comparison
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compare player war against historical baseline. Pure, deterministic.
 * Both inputs are explicit, serializable values — no hidden state.
 */
export function compareToHistorical(
    costLedger: CostLedger,
    baseline: HistoricalBaseline,
): ComparisonResult {
    const notes: string[] = [];

    // Duration delta
    const durationDelta = costLedger.war_duration_weeks - baseline.war_duration_weeks;
    if (durationDelta > 0) {
        notes.push(`War lasted ${durationDelta} weeks longer than the historical ${baseline.war_duration_weeks} weeks`);
    } else if (durationDelta < 0) {
        notes.push(`War lasted ${Math.abs(durationDelta)} weeks shorter than the historical ${baseline.war_duration_weeks} weeks`);
    } else {
        notes.push(`War lasted exactly the historical ${baseline.war_duration_weeks} weeks`);
    }

    // Territory divergence — compare per-faction territory from cost ledger entries
    // against historical baseline territory_final
    const territoryDivergence: Record<string, number> = {};
    const baselineKeys = Object.keys(baseline.territory_final).sort(strictCompare);
    for (const key of baselineKeys) {
        const historicalPct = baseline.territory_final[key];
        // Find matching entry in cost ledger; for RS, compare directly;
        // for Federation, sum RBiH + HRHB territory
        if (key === 'RBiH_HRHB_Federation') {
            const rbih = costLedger.entries.find(e => e.faction === 'RBiH');
            const hrhb = costLedger.entries.find(e => e.faction === 'HRHB');
            const playerPct = (rbih?.territory_controlled_pct ?? 0) + (hrhb?.territory_controlled_pct ?? 0);
            const delta = playerPct - historicalPct;
            territoryDivergence[key] = delta;
            if (Math.abs(delta) >= 1) {
                notes.push(`Federation controlled ${playerPct.toFixed(1)}% territory vs historical ${historicalPct}%`);
            }
        } else {
            const entry = costLedger.entries.find(e => e.faction === key);
            const playerPct = entry?.territory_controlled_pct ?? 0;
            const delta = playerPct - historicalPct;
            territoryDivergence[key] = delta;
            if (Math.abs(delta) >= 1) {
                notes.push(`${key} controlled ${playerPct.toFixed(1)}% territory vs historical ${historicalPct}%`);
            }
        }
    }

    // Casualty ratio — player total military killed vs historical total killed
    const casualtyRatio = baseline.total_killed > 0
        ? costLedger.total_military_killed / baseline.total_killed
        : 0;
    const casualtyPct = Math.round(casualtyRatio * 100);
    notes.push(`Total military casualties were ${casualtyPct}% of historical levels`);

    // Displacement ratio — sum of refugees_created across all factions vs historical displaced
    let totalRefugees = 0;
    for (const entry of costLedger.entries) {
        totalRefugees += entry.refugees_created;
    }
    const displacementRatio = baseline.total_displaced > 0
        ? totalRefugees / baseline.total_displaced
        : 0;

    // Rupture divergence — check for Srebrenica genocide specifically
    const ruptureDivergence: string[] = [];
    const hasSrebrenicaRupture = costLedger.rupture_consequences.some(
        r => r.id === 'srebrenica_genocide_1995'
    );
    if (hasSrebrenicaRupture) {
        ruptureDivergence.push('srebrenica_genocide_1995');
        notes.push('Srebrenica genocide occurred');
    } else {
        notes.push('Srebrenica enclave survived');
    }
    ruptureDivergence.sort(strictCompare);

    // Sort notes deterministically
    // (they are already in a deterministic insertion order, but explicit sort
    //  ensures stability across any future additions)
    notes.sort(strictCompare);

    return {
        duration_delta_weeks: durationDelta,
        territory_divergence: territoryDivergence,
        casualty_ratio: casualtyRatio,
        displacement_ratio: displacementRatio,
        rupture_divergence: ruptureDivergence,
        divergence_notes: notes,
    };
}
