/**
 * Per-turn brigade officer quality growth and loss.
 *
 * Officer quality [0, 1] on FormationState represents abstracted command competence
 * at brigade level. Growth comes from combat experience and frontline service;
 * loss comes from casualties and VRS brain drain.
 *
 * Deterministic: sorted iteration, pure arithmetic, no randomness.
 */

import type { FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFactionDefaultOfficerQuality } from './combat_math.js';
import {
    buildFrontlineAssignedFormationSet,
    hasLiveSectorFrontlineTruth,
} from './front_assignment.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base officer quality growth per turn for formations that fought this turn. */
export const COMBAT_GROWTH_BASE = 0.01;

/** Base officer quality growth per turn for formations on the front line (not fighting). */
export const FRONTLINE_GROWTH_BASE = 0.005;

/** Officer casualty multiplier — officers die disproportionately (leading from front). */
export const OFFICER_CASUALTY_MULT = 1.5;

/** Floor: officer quality never drops below this. */
export const OFFICER_QUALITY_FLOOR = 0.05;

/** Cap: officer quality never exceeds this. */
export const OFFICER_QUALITY_CAP = 0.90;

/** VRS brain drain: weekly loss after this week. */
export const VRS_BRAIN_DRAIN_START_WEEK = 40;

/** VRS brain drain rate per turn. */
export const VRS_BRAIN_DRAIN_RATE = 0.001;

/** Faction learning rate multipliers. */
export const FACTION_LEARNING_RATE: Record<string, number> = {
    RBiH: 1.5,
    RS: 0.7,
    HRHB: 1.0,
};

// ═══════════════════════════════════════════════════════════════════════════
// Report
// ═══════════════════════════════════════════════════════════════════════════

export interface OfficerQualityReport {
    formations_updated: number;
    avg_quality_by_faction: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main update function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update brigade officer quality for all active formations.
 *
 * Growth sources:
 * - Combat this turn: COMBAT_GROWTH_BASE × faction learning rate
 * - Frontline (no combat): FRONTLINE_GROWTH_BASE × faction learning rate
 * - Growth is diminished at higher quality: × (1.0 - quality × 0.5)
 *
 * Loss sources:
 * - VRS brain drain: -VRS_BRAIN_DRAIN_RATE per turn after w40
 *
 * @param engagedFormationIds — formation IDs that fought this turn (from attack resolution report)
 */
export function updateBrigadeOfficerQuality(
    state: GameState,
    engagedFormationIds: Set<string>
): OfficerQualityReport {
    const report: OfficerQualityReport = {
        formations_updated: 0,
        avg_quality_by_faction: {},
    };

    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;
    const useSectorFrontlineTruth = hasLiveSectorFrontlineTruth(state);
    const frontlineAssigned =
        useSectorFrontlineTruth ? buildFrontlineAssignedFormationSet(state) : new Set<string>();

    // Track per-faction totals for average computation
    const factionSum: Record<string, number> = {};
    const factionCount: Record<string, number> = {};

    const formationIds = Object.keys(formations).sort(strictCompare);

    for (const id of formationIds) {
        const f = formations[id] as FormationState | undefined;
        if (!f) continue;
        if (f.status !== 'active') continue;
        // Only brigade-kind and militia-kind formations have officer quality
        if (f.kind !== 'brigade' && f.kind !== 'militia' && f.kind !== 'og' && f.kind !== 'operational_group') continue;

        const faction = f.faction as string;
        // D.3: Read learning rate from war_timeline if available, else hardcoded fallback
        const timelineConfig = state.military.war_timeline?.officer_config?.[faction];
        const learningRate = timelineConfig?.learning_rate ?? (FACTION_LEARNING_RATE[faction] ?? 1.0);

        // Ensure officer_quality is initialized
        if (f.officer_quality === undefined) {
            f.officer_quality = getFactionDefaultOfficerQuality(faction, turn);
        }

        let quality = f.officer_quality;

        // Growth from combat or frontline presence
        const inCombat = engagedFormationIds.has(id);
        const onFrontline = useSectorFrontlineTruth
            ? frontlineAssigned.has(id)
            : f.posture !== undefined && f.posture !== 'defend';

        if (inCombat) {
            const growth = COMBAT_GROWTH_BASE * learningRate * (1.0 - quality * 0.5);
            quality += growth;
        } else if (onFrontline) {
            const growth = FRONTLINE_GROWTH_BASE * learningRate * (1.0 - quality * 0.5);
            quality += growth;
        }

        // VRS brain drain after configured start week
        const brainDrainStart = timelineConfig?.brain_drain_start_week ?? VRS_BRAIN_DRAIN_START_WEEK;
        const brainDrainRate = timelineConfig?.brain_drain_rate ?? VRS_BRAIN_DRAIN_RATE;
        if (faction === 'RS' && turn >= brainDrainStart) {
            quality -= brainDrainRate;
        }

        // Clamp
        quality = Math.max(OFFICER_QUALITY_FLOOR, Math.min(OFFICER_QUALITY_CAP, quality));

        f.officer_quality = quality;
        report.formations_updated++;

        // Track faction averages
        factionSum[faction] = (factionSum[faction] ?? 0) + quality;
        factionCount[faction] = (factionCount[faction] ?? 0) + 1;
    }

    // Compute averages
    for (const faction of Object.keys(factionSum).sort(strictCompare)) {
        const count = factionCount[faction] ?? 1;
        report.avg_quality_by_faction[faction] = factionSum[faction]! / count;
    }

    return report;
}
