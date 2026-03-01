/**
 * Phase II: Per-turn morale drift for all active formations.
 * Population affinity (census-driven), encirclement reversal, exhaustion penalty.
 * Called from turn pipeline after cohesion drift.
 * Deterministic: formations in sorted order, no randomness.
 */

import type { FactionId, FormationId, FormationState, GameState } from '../../state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../state/population_share.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getFactionAlignedPopulationShare } from '../../state/population_share.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Extract municipality ID from OSID (format: op:municipality:slug). */
function munFromOsid(osid: string): string | undefined {
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Affinity thresholds for morale drift direction. */
const HIGH_AFFINITY_THRESHOLD = 0.70;
const LOW_AFFINITY_THRESHOLD = 0.30;
const ENCIRCLEMENT_AFFINITY_THRESHOLD = 0.50;

/** Morale drift magnitudes per turn. */
const AFFINITY_DRIFT_UP = 2;
const AFFINITY_DRIFT_DOWN = -2;
const ENCIRCLEMENT_OWN_POP_DRIFT = 3;      // Cornered rat — morale UP
const ENCIRCLEMENT_ENEMY_POP_DRIFT = -3;   // Standard demoralization

/** Supply-CRITICAL morale suppression (L26 in CALIBRATION_MASTER).
 * Brigades at CRITICAL supply (besieged enclaves, cut-off units) cannot gain morale
 * from affinity or encirclement. Instead, starvation drains morale.
 * This prevents enclave brigades from drifting back to morale 70 (resist floor)
 * and counterattacking outward despite zero supply. */
const CRITICAL_SUPPLY_DRAIN = -1;

/** Exhaustion thresholds and penalties (mirrors cohesion_drift.ts pattern). */
const EXHAUSTION_THRESHOLD = 0.80;
const EXHAUSTION_MORALE_PENALTY = -0.5;
const CRITICAL_EXHAUSTION_THRESHOLD = 0.95;
const CRITICAL_EXHAUSTION_PENALTY = -1.5;

export interface MoraleDriftReport {
    formations_updated: number;
    by_faction: Record<string, number>;
}

/**
 * Apply per-turn morale drift to all active brigades/OGs not engaged in combat.
 * Mutates state.formations[*].morale. Deterministic.
 *
 * Drift sources:
 * 1. Population affinity: +2 when defending own-ethnicity OSID (>70%), -2 when in enemy territory (<30%).
 * 2. Encirclement reversal: +3 when encircled defending own population (>50%), -3 otherwise.
 * 3. Exhaustion penalty: -0.5 at 80%+ ops fatigue, -1.5 at 95%+.
 */
export function runPhaseIIMoraleDrift(
    state: GameState,
    engagedFormationIds: FormationId[] | Set<string>,
    munPopulation?: MunicipalityPopulation1991Map,
    supplyStateByOsid?: SupplyStateByOsidReport
): MoraleDriftReport {
    // Build OSID→supply level lookup for critical supply check
    const osidSupplyLevel = new Map<string, string>();
    if (supplyStateByOsid?.factions) {
        for (const fEntry of supplyStateByOsid.factions) {
            for (const osidEntry of fEntry.by_osid) {
                osidSupplyLevel.set(`${fEntry.faction_id}:${osidEntry.osid}`, osidEntry.state);
            }
        }
    }
    const report: MoraleDriftReport = { formations_updated: 0, by_faction: {} };
    const engagedSet = engagedFormationIds instanceof Set
        ? engagedFormationIds
        : new Set(engagedFormationIds);
    const formations = state.formations ?? {};
    const formationIds = (Object.keys(formations) as FormationId[]).sort(strictCompare);

    for (const fId of formationIds) {
        if (engagedSet.has(fId)) continue;
        const f = formations[fId] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'operational_group') continue;
        if (f.morale === undefined) f.morale = 60;

        const osid = f.location_osid;
        if (!osid) continue;
        const munId = munFromOsid(osid);

        let drift = 0;

        // 1. Population affinity drift
        const affinity = munId
            ? getFactionAlignedPopulationShare(munId, f.faction, munPopulation, 0.5)
            : 0.5;
        if (affinity > HIGH_AFFINITY_THRESHOLD) {
            drift += AFFINITY_DRIFT_UP;
        } else if (affinity < LOW_AFFINITY_THRESHOLD) {
            drift += AFFINITY_DRIFT_DOWN;
        }

        // 2. Encirclement reversal
        const isEncircled = state.brigade_encircled?.[fId] === true;
        if (isEncircled) {
            if (affinity > ENCIRCLEMENT_AFFINITY_THRESHOLD) {
                drift += ENCIRCLEMENT_OWN_POP_DRIFT;
            } else {
                drift += ENCIRCLEMENT_ENEMY_POP_DRIFT;
            }
        }

        // 2b. Supply-CRITICAL suppression: starving brigades cannot gain morale from
        // affinity or encirclement — starvation overrides determination (L26).
        const supplyKey = `${f.faction}:${osid}`;
        const supplyLevel = osidSupplyLevel.get(supplyKey);
        if (supplyLevel === 'critical') {
            // Suppress all positive drift (affinity + encirclement)
            if (drift > 0) drift = 0;
            // Apply starvation drain
            drift += CRITICAL_SUPPLY_DRAIN;
        }

        // 3. Exhaustion penalty
        const fatigue = f.ops?.fatigue ?? 0;
        if (fatigue >= CRITICAL_EXHAUSTION_THRESHOLD * 100) {
            drift += CRITICAL_EXHAUSTION_PENALTY;
        } else if (fatigue >= EXHAUSTION_THRESHOLD * 100) {
            drift += EXHAUSTION_MORALE_PENALTY;
        }

        if (drift === 0) continue;

        const prev = f.morale;
        f.morale = Math.max(0, Math.min(100, f.morale + drift));
        if (f.morale !== prev) {
            report.formations_updated++;
            report.by_faction[f.faction] = (report.by_faction[f.faction] ?? 0) + 1;
        }
    }
    return report;
}
