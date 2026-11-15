/**
 * Endgame comparison — downstream reflection, not an owner.
 *
 * Compares the player's war costs against historical BiH war baseline.
 * Produces divergence notes for narrative surfaces.
 *
 * Deterministic: no Math.random(), no timestamps, sorted iteration via strictCompare.
 */

import type { CostLedger } from './cost_ledger.js';
import type { GameState } from '../../state/game_state.js';
import type { HistoricalBaseline, HistoricalBaselineMilestone, HistoricalEndingBasis } from '../../state/negotiation_types.js';
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
    /**
     * Player total military killed / historical military killed (RDC 2007, 57,523).
     * Before the R8 ending truth pass this divided by all deaths (97,207); saves frozen
     * then carry that older ratio.
     */
    casualty_ratio: number;
    /** Player total civilian killed / historical civilian killed (RDC 2007, 39,684). Additive. */
    civilian_ratio?: number;
    /** The historical figures the ratios read (additive; absent on older saves). */
    historical_military_killed?: number;
    historical_civilian_killed?: number;
    /** The historical week the duration was compared with, and which endpoint it is (additive). */
    historical_reference_week?: number;
    historical_reference_basis?: HistoricalEndingBasis;
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

function statusFromDelta(deltaWeeks: number | null): MilestoneComparisonStatus {
    if (deltaWeeks === null) return 'absent';
    if (deltaWeeks < 0) return 'early';
    if (deltaWeeks > 0) return 'late';
    return 'on_time';
}

function compareMilestones(a: HistoricalBaselineMilestone, b: HistoricalBaselineMilestone): number {
    if (a.historical_week !== b.historical_week) return a.historical_week - b.historical_week;
    return strictCompare(a.id, b.id);
}

/**
 * How a campaign ended, for like-for-like comparison: a recorded settlement (an accepted plan
 * or a signed or imposed Dayton) or a Dayton result is 'settlement'; anything else is
 * 'no_settlement'. Pure read of state.
 */
export function endingBasisForState(state: GameState): HistoricalEndingBasis {
    const negotiation = state.military?.negotiation;
    return negotiation?.settlement || negotiation?.dayton_result ? 'settlement' : 'no_settlement';
}

/** The historical week a campaign of this ending is compared with (189 initialling, 183 ceasefire). */
export function historicalReferenceWeek(baseline: HistoricalBaseline, ending: HistoricalEndingBasis): number {
    return ending === 'no_settlement'
        ? baseline.fighting_end_week ?? baseline.war_duration_weeks
        : baseline.war_duration_weeks;
}

/** Historical military killed, all sides, from the same source as the civilian line. */
export function historicalMilitaryKilled(baseline: HistoricalBaseline): number {
    if (typeof baseline.military_killed_total === 'number') return baseline.military_killed_total;
    return Object.values(baseline.military_killed ?? {}).reduce((sum, value) => sum + value, 0);
}

function buildMilestoneComparison(
    costLedger: CostLedger,
    baseline: HistoricalBaseline,
    ending: HistoricalEndingBasis,
): MilestoneComparison[] | undefined {
    const milestones = baseline.milestones ?? [];
    if (milestones.length === 0) return undefined;

    return milestones
        .filter(m => Number.isFinite(m.historical_week))
        // No rupture as an early/late timing row (§4 sensitive-copy panel, 2026-11-14): only the
        // historical killings are dated, in the record, never against an in-campaign fall
        // (Sensitive History Design Gate §1 Ring 1, §4). The baseline keeps the record row.
        .filter(m => m.kind !== 'rupture')
        // Like for like: a war-end milestone is compared only with the ending it describes.
        .filter(m => m.kind !== 'war_end' || m.ending === undefined || m.ending === ending)
        .slice()
        .sort(compareMilestones)
        .map((milestone): MilestoneComparison => {
            let playerWeek: number | null = null;
            if (milestone.kind === 'war_end') {
                playerWeek = costLedger.war_duration_weeks;
            } else if (milestone.kind === 'rupture' && milestone.event_id) {
                const rupture = costLedger.rupture_consequences.find(r => r.id === milestone.event_id);
                const recordedTurn = rupture?.recorded_turn;
                playerWeek = typeof recordedTurn === 'number' && Number.isFinite(recordedTurn) ? recordedTurn : null;
            }

            const deltaWeeks = playerWeek === null ? null : playerWeek - milestone.historical_week;
            const status = statusFromDelta(deltaWeeks);
            const summary = playerWeek === null
                ? `${milestone.label} did not occur in this run.`
                : `${milestone.label} occurred at player week ${playerWeek} against historical week ${milestone.historical_week}.`;

            return {
                id: milestone.id,
                label: milestone.label,
                historical_week: milestone.historical_week,
                player_week: playerWeek,
                delta_weeks: deltaWeeks,
                status,
                summary,
            };
        });
}

/** Divergence note for a Srebrenica enclave overrun with no rupture recorded (the Chronicle localizes it). */
export const SREBRENICA_OVERRUN_NOTE = 'Srebrenica enclave was overrun';

/** First turn of the Srebrenica rupture window (Sensitive History Design Gate §1 Ring 1). */
export const SREBRENICA_RUPTURE_FIRST_TURN = 160;

/**
 * Compare player war against historical baseline. Pure, deterministic.
 * Both inputs are explicit, serializable values — no hidden state.
 */
export function compareToHistorical(
    costLedger: CostLedger,
    baseline: HistoricalBaseline,
    ending: HistoricalEndingBasis = 'settlement',
): ComparisonResult {
    const notes: string[] = [];

    // Duration delta, like for like (R8 council B8/H2): a settled campaign against the Dayton
    // initialling (week 189), any other ending against the ceasefire in force (week 183).
    // No "N weeks shorter/longer" note (§4 panel 2026-11-14: "shorter" beside an early peace
    // invites a shorter-means-lesser reading); surfaces date the end of the war instead.
    const referenceWeek = historicalReferenceWeek(baseline, ending);
    const durationDelta = costLedger.war_duration_weeks - referenceWeek;

    // Territory divergence — compare per-faction territory from cost ledger entries against
    // the Dayton shares, or the ceasefire line for a campaign ended without a settlement.
    const territoryReference = ending === 'no_settlement' && baseline.territory_ceasefire
        ? baseline.territory_ceasefire
        : baseline.territory_final;
    const territoryDivergence: Record<string, number> = {};
    const baselineKeys = Object.keys(territoryReference).sort(strictCompare);
    for (const key of baselineKeys) {
        const historicalPct = territoryReference[key];
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

    // Casualty ratios — military against military, civilian against civilian, one source (RDC
    // 2007). The R8 council (B6/H3) found the military line divided by all deaths. The notes
    // state both counts as integers, never as a percentage of history (Sensitive History Design
    // Gate §4: no "X% as bad as history" comparisons).
    const historicalMilitary = historicalMilitaryKilled(baseline);
    const casualtyRatio = historicalMilitary > 0
        ? costLedger.total_military_killed / historicalMilitary
        : 0;
    const civilianRatio = baseline.civilian_killed > 0
        ? costLedger.total_civilian_killed / baseline.civilian_killed
        : 0;
    notes.push(`Military killed: ${formatCount(costLedger.total_military_killed)} in this campaign; ${formatCount(historicalMilitary)} in the historical war`);
    notes.push(`Civilians killed: ${formatCount(costLedger.total_civilian_killed)} in this campaign; ${formatCount(baseline.civilian_killed)} in the historical war`);

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
    // DC A6 follow-up 1 (Pyrrhic panel 2026-11-09): "survived" only while RBiH holds the
    // enclave's capital at the end. An enclave overrun before the genocide window (no rupture)
    // reads as overrun: a counterfactual line, never the July 1995 record. The recorded
    // rupture keeps precedence.
    const srebrenicaLost = costLedger.entries.find(e => e.faction === 'RBiH')?.enclaves_lost.includes('srebrenica') === true;
    if (hasSrebrenicaRupture) {
        ruptureDivergence.push('srebrenica_genocide_1995');
        notes.push('Srebrenica genocide occurred');
    } else if (srebrenicaLost) {
        notes.push(SREBRENICA_OVERRUN_NOTE);
    } else if (costLedger.war_duration_weeks >= SREBRENICA_RUPTURE_FIRST_TURN) {
        // Only a war that reached the rupture window can say the enclave "survived" (§4 panel).
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
        civilian_ratio: civilianRatio,
        historical_military_killed: historicalMilitary,
        historical_civilian_killed: baseline.civilian_killed,
        historical_reference_week: referenceWeek,
        historical_reference_basis: ending,
        displacement_ratio: displacementRatio,
        rupture_divergence: ruptureDivergence,
        divergence_notes: notes,
        milestone_comparison: buildMilestoneComparison(costLedger, baseline, ending),
    };
}

/** Integer with thousands separators, fixed to en-US so the notes are byte-stable. */
function formatCount(value: number): string {
    return Math.trunc(Math.max(0, value)).toLocaleString('en-US');
}
