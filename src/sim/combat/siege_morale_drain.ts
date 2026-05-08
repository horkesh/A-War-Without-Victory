/**
 * Siege defender morale drain — formations besieged for prolonged durations
 * suffer cumulative morale erosion modelling siege manning fatigue.
 *
 * Faction-symmetric mechanism: reads `state.military.siege_turn_counters`
 * (already faction-keyed `${factionId}:${osid}`); applies a graduated per-turn
 * morale decrement to formations whose `location_osid` is keyed in the
 * counters AND whose faction matches the besieged-faction key.
 *
 * Schedule (LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1):
 *   counter   0–13  → 0.0   (early-siege "winning" period)
 *   counter  14–26  → -0.5  (counter-organize phase)
 *   counter  27–52  → -1.0  (sustained positional wear)
 *   counter  53–104 → -1.5  (late-war manning crisis)
 *   counter   105+  → -2.0  (endgame collapse pressure)
 *
 * Floor: SIEGE_DRAIN_MORALE_FLOOR = 25 (matches RBIH_EXISTENTIAL_FLOOR;
 * 10-point buffer above MORALE_OVERRIDE_THRESHOLD = 15).
 *
 * Default-off shadow flag: env flag SIEGE_MORALE_DRAIN_ENABLED. When unset,
 * the diagnostic counter still increments (per N4 morale-collapse override
 * precedent), but f.morale is NOT mutated — preserves byte-stability
 * invariant (FORAWWV §XIV.1 default-off byte-stability).
 *
 * Canon: Engine Invariants v0.9.0 §6.10 + Systems Manual v0.9.0 §6.10.
 *
 * Deterministic: sorted iteration via strictCompare; no random; no Date.now.
 */

import type { FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// --- Constants ---

/** Floor below which siege drain alone will not push morale.
 * Matches `RBIH_EXISTENTIAL_FLOOR` and `FACTION_HOME_MORALE_FLOOR.HRHB`.
 * Keeps a 10-point buffer above `MORALE_OVERRIDE_THRESHOLD = 15` so siege
 * drain alone cannot push a brigade into the §6.2.4 dissolution streak band.
 */
export const SIEGE_DRAIN_MORALE_FLOOR = 25;

/**
 * Stepped piecewise schedule keyed on siege duration counter (turns).
 * Each entry: { thresholdInclusive, coefficient }. The schedule is consulted
 * in order — first entry whose `thresholdInclusive` is greater than or equal
 * to the brigade's current counter value supplies the coefficient. The final
 * entry's threshold (Number.POSITIVE_INFINITY) acts as the catch-all for
 * counters at or above 105.
 *
 * Phase A (0–13)   : winning period, no drain.
 * Phase B (14–26)  : counter-organizing, slight drain.
 * Phase C (27–52)  : sustained positional wear.
 * Phase D (53–104) : late-war manning crisis.
 * Phase E (105+)   : endgame collapse pressure.
 */
export const SIEGE_DRAIN_SCHEDULE: ReadonlyArray<{ thresholdInclusive: number; coefficient: number }> = [
    { thresholdInclusive: 13, coefficient: 0.0 },
    { thresholdInclusive: 26, coefficient: -0.5 },
    { thresholdInclusive: 52, coefficient: -1.0 },
    { thresholdInclusive: 104, coefficient: -1.5 },
    { thresholdInclusive: Number.POSITIVE_INFINITY, coefficient: -2.0 },
];

// --- Types ---

export interface SiegeDrainDiagnostic {
    /** Number of formations the mechanism inspected (besieged + matching faction). */
    formations_inspected: number;
    /** Number of formations whose morale was actually mutated (flag ON path). */
    drain_applied: number;
    /** Number of formations skipped because morale already at or below floor. */
    drain_skipped_at_floor: number;
    /** Total morale points removed (sum of |coefficient| applied, rounded). */
    total_morale_removed: number;
    /** Counter increments unconditionally — number of "would-have-applied" events
     * (formations with non-zero coefficient and morale above floor), regardless
     * of whether the env flag was on. Per N4 diagnostic-counter precedent. */
    drain_pending_count: number;
}

// --- Helpers ---

/**
 * Pure function: returns the per-turn morale-drain coefficient for a given
 * siege-duration counter, per the SIEGE_DRAIN_SCHEDULE table. Coefficients
 * are non-positive (≤ 0). Counter 0 returns 0.0 (no drain).
 */
export function getSiegeDrainCoefficient(turnsBesieged: number): number {
    if (!Number.isFinite(turnsBesieged) || turnsBesieged < 0) return 0.0;
    for (const entry of SIEGE_DRAIN_SCHEDULE) {
        if (turnsBesieged <= entry.thresholdInclusive) return entry.coefficient;
    }
    // SIEGE_DRAIN_SCHEDULE's final entry has thresholdInclusive = +Infinity,
    // so the loop above always returns. This branch is unreachable; included
    // to keep the type checker happy on noImplicitReturns.
    return SIEGE_DRAIN_SCHEDULE[SIEGE_DRAIN_SCHEDULE.length - 1].coefficient;
}

// --- Main step ---

/**
 * Apply per-turn siege defender morale drain.
 *
 * For each `${faction}:${osid}` siege counter > 0, locate the active brigade-
 * kind formations of `faction` whose `location_osid` matches `osid`, look up
 * the schedule coefficient for the current counter value, and (if the env
 * flag is on) decrement morale by |coefficient|, clamped at
 * SIEGE_DRAIN_MORALE_FLOOR (25).
 *
 * The diagnostic counter `drain_pending_count` increments unconditionally
 * for visibility — flag OFF still produces a non-zero pending count when
 * brigades sit at qualifying counters. Per N4 precedent.
 */
export function applySiegeMoraleDrain(state: GameState): SiegeDrainDiagnostic {
    const report: SiegeDrainDiagnostic = {
        formations_inspected: 0,
        drain_applied: 0,
        drain_skipped_at_floor: 0,
        total_morale_removed: 0,
        drain_pending_count: 0,
    };

    const counters = state.military.siege_turn_counters;
    if (!counters) return report;

    const formations = state.military.formations ?? {};

    // Build osid → list of formationIds (sorted) for stable iteration.
    const formationsByOsid: Record<string, string[]> = {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const f = formations[fid] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'operational_group') continue;
        const osid = f.location_osid;
        if (!osid) continue;
        if (!formationsByOsid[osid]) formationsByOsid[osid] = [];
        formationsByOsid[osid].push(fid);
    }

    // Env flag gate (default OFF per FORAWWV §XIV.1).
    const flagEnabled = process.env.SIEGE_MORALE_DRAIN_ENABLED === 'true';

    // Iterate counters in deterministic sorted order.
    const counterKeys = Object.keys(counters).sort(strictCompare);
    for (const key of counterKeys) {
        const counter = counters[key];
        if (typeof counter !== 'number' || counter <= 0) continue;

        const colonIdx = key.indexOf(':');
        if (colonIdx < 0) continue;
        const besiegedFaction = key.substring(0, colonIdx);
        const osid = key.substring(colonIdx + 1);

        const coefficient = getSiegeDrainCoefficient(counter);
        if (coefficient === 0.0) continue;

        const brigadesAtOsid = formationsByOsid[osid];
        if (!brigadesAtOsid || brigadesAtOsid.length === 0) continue;

        for (const fid of brigadesAtOsid) {
            const f = formations[fid] as FormationState | undefined;
            if (!f || f.status !== 'active') continue;
            if (f.faction !== besiegedFaction) continue;

            report.formations_inspected++;

            const currentMorale = typeof f.morale === 'number' ? f.morale : 60;
            // Diagnostic: count "would have applied" events even when flag off.
            // Skip the pending count when morale already at or below the floor —
            // the mechanism would clamp to floor and produce zero delta there.
            if (currentMorale > SIEGE_DRAIN_MORALE_FLOOR) {
                report.drain_pending_count++;
            }

            if (!flagEnabled) continue;

            if (currentMorale <= SIEGE_DRAIN_MORALE_FLOOR) {
                report.drain_skipped_at_floor++;
                continue;
            }

            const proposedMorale = currentMorale + coefficient; // coefficient is ≤ 0
            const clamped = Math.max(SIEGE_DRAIN_MORALE_FLOOR, proposedMorale);
            const delta = currentMorale - clamped;
            if (delta <= 0) {
                report.drain_skipped_at_floor++;
                continue;
            }

            f.morale = clamped;
            report.drain_applied++;
            report.total_morale_removed += delta;
        }
    }

    return report;
}
