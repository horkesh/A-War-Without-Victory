/**
 * War phase: Per-turn morale drift for all active formations.
 * Population affinity (census-driven), encirclement reversal, exhaustion penalty.
 * Called from turn pipeline after cohesion drift.
 * Deterministic: formations in sorted order, no randomness.
 */

import type { FactionId, FormationId, FormationState, GameState } from '../../state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../state/population_share.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getFactionAlignedPopulationShare } from '../../state/population_share.js';
import { strictCompare } from '../../state/validateGameState.js';
import { CRITICAL_MORALE_THRESHOLD } from './combat_math.js';
import { munFromOsid } from './osid_adjacency.js';

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

/**
 * LANE-NIGHTSHIFT-N4-CANON-AMENDMENT (Engine Invariants v0.7.0 §6.2.4 +
 * Systems Manual v0.7.0 §6.4, 2026-05-03): morale-collapse override
 * thresholds. The streak counter is incremented every turn the brigade's
 * final morale is ≤ MORALE_OVERRIDE_THRESHOLD (15); reset to 0 when morale
 * rises above MORALE_OVERRIDE_RESET (20). When the streak reaches
 * MORALE_OVERRIDE_TURNS (8), brigade_dissolution.ts dissolves regardless
 * of personnel count — but only when env flag MORALE_OVERRIDE_ENABLED is
 * true (shadow-flag default-off). The counter increments either way for
 * diagnostic visibility.
 */
const MORALE_OVERRIDE_THRESHOLD = 15;
const MORALE_OVERRIDE_RESET = 20;

/** Morale drift from recent battle outcomes. Victory boosts morale, defeat drains it.
 * Historical: VRS morale was high in 1992 because they were winning everywhere.
 * ARBiH morale plummeted initially, recovered as they organized and won small victories.
 * Applied once per turn based on most recent battle outcome, then cleared. */
const BATTLE_MORALE_DRIFT: Record<string, number> = {
    'decisive_victory': 5,
    'victory': 3,
    'costly_victory': 1,
    'stalemate': 0,
    'repulsed': -2,
    'catastrophic': -4,
};

/** Battle habituation: diminishing morale returns from repeated combat.
 * Formula: 1 / (1 + battle_outcome_count * RATE).
 * At 0 battles: 1.00×, at 10: 0.77×, at 20: 0.62×, at 40: 0.45×.
 * Historical: all factions became "numb" to combat by late 1993 (BB2). */
const BATTLE_HABITUATION_RATE = 0.03;

/** Faction-differentiated morale sensitivity to VICTORIES (positive drift).
 * RS 0.8: winning is expected (JNA inheritance) — each victory matters less.
 * RBiH 1.3: each victory proves the army is real — huge morale boost.
 * HRHB 1.0: baseline. */
const FACTION_VICTORY_SENSITIVITY: Record<string, number> = {
    RS: 0.8,
    RBiH: 1.3,
    HRHB: 1.0,
};

/** Faction-differentiated morale sensitivity to DEFEATS (negative drift).
 * RS 1.3: losing is shocking for a professional army — defeats hit harder.
 * RBiH 0.7: existential determination — expect to suffer, absorb losses.
 * HRHB 1.0: baseline. */
const FACTION_DEFEAT_SENSITIVITY: Record<string, number> = {
    RS: 1.3,
    RBiH: 0.7,
    HRHB: 1.0,
};

/** Faction-differentiated home defense morale floors.
 * Replaces flat HOME_GROUND_MORALE_FLOOR (15) from combat_math.ts.
 * RBiH 30: nowhere to go — fight or die.
 * HRHB 25: Croatian homeland, but Croatia exists as fallback.
 * RS 20: can desert home to Serbia proper. */
const FACTION_HOME_MORALE_FLOOR: Record<string, number> = {
    RS: 20,
    RBiH: 30,
    HRHB: 25,
};

/** RBiH existential floor: ARBiH formations in co-ethnic majority areas (>50% Bosniak)
 * get morale floor 25 even without home_defense_active.
 * Models the "cornered rat" — no surrender option for Bosniaks. */
const RBIH_EXISTENTIAL_FLOOR = 25;
const EXISTENTIAL_AFFINITY_THRESHOLD = 0.50;

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
export function runMoraleDrift(
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
    const formations = state.military.formations ?? {};
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
        const isEncircled = state.military.brigade_encircled?.[fId] === true;
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

        // 4. Battle outcome morale drift (with habituation + faction sensitivity)
        const recentOutcome = (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        if (recentOutcome) {
            const baseDrift = BATTLE_MORALE_DRIFT[recentOutcome] ?? 0;

            // Habituation: combat-hardened troops become numb to battle outcomes
            const battleCount = (f as { battle_outcome_count?: number }).battle_outcome_count ?? 0;
            const habituation = 1 / (1 + battleCount * BATTLE_HABITUATION_RATE);

            // Faction sensitivity: asymmetric reaction to victory vs defeat
            const sensitivity = baseDrift >= 0
                ? (FACTION_VICTORY_SENSITIVITY[f.faction] ?? 1.0)
                : (FACTION_DEFEAT_SENSITIVITY[f.faction] ?? 1.0);

            drift += Math.round(baseDrift * habituation * sensitivity);

            // Increment battle counter (persists, never resets)
            (f as { battle_outcome_count?: number }).battle_outcome_count = battleCount + 1;

            // Clear after consumption — one-shot per battle
            delete (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        }

        if (drift === 0) continue;

        const prev = f.morale;
        f.morale = Math.max(0, Math.min(100, f.morale + drift));

        // Home ground morale floor: faction-differentiated.
        // RBiH 30 (nowhere to go), HRHB 25 (Croatia fallback), RS 20 (Serbia fallback).
        if (f.home_defense_active === true) {
            const factionFloor = FACTION_HOME_MORALE_FLOOR[f.faction] ?? 15;
            f.morale = Math.max(f.morale, factionFloor);
        }

        // RBiH existential floor: Bosniak troops in co-ethnic majority areas
        // get morale floor 25 even without home_defense_active.
        // Models the "cornered rat" — no surrender option for Bosniaks.
        if (f.faction === 'RBiH' && affinity > EXISTENTIAL_AFFINITY_THRESHOLD) {
            f.morale = Math.max(f.morale, RBIH_EXISTENTIAL_FLOOR);
        }

        // Critically demoralized formations lose cohesion — organic path to surrender.
        // Morale collapse cascade: morale drops → combat ineffective → cohesion erodes →
        // surrender triggers (existing mechanic at cohesion<10 + power ratio > 2.5).
        if ((f.morale ?? 50) < CRITICAL_MORALE_THRESHOLD) {
            f.cohesion = Math.max(0, (f.cohesion ?? 60) - 2);
        }

        // Morale collapse desertion: low morale causes personnel attrition (soldiers desert).
        // Creates organic dissolution path: morale drops → desertion → personnel drops →
        // dissolution criteria triggers (2-of-3 check in brigade_dissolution.ts).
        // Graduated rates: morale 0 = 5%/turn, morale 1-14 = 2%/turn.
        // Without this, brigades at morale 0 with 1,000+ personnel and decent cohesion
        // survive indefinitely — a 1,000-man unit at zero morale is a mob, not a brigade.
        const MIN_COMBAT = 100; // matches MIN_COMBAT_PERSONNEL from formation_constants
        if (f.morale <= 0) {
            // Morale collapse: 5% personnel loss per turn — rapid disintegration
            f.personnel = Math.max(MIN_COMBAT, Math.floor((f.personnel ?? 0) * 0.95));
        } else if ((f.morale ?? 50) < CRITICAL_MORALE_THRESHOLD) {
            // Low morale desertion: 2% personnel loss per turn — steady hemorrhage
            f.personnel = Math.max(MIN_COMBAT, Math.floor((f.personnel ?? 0) * 0.98));
        }

        if (f.morale !== prev) {
            report.formations_updated++;
            report.by_faction[f.faction] = (report.by_faction[f.faction] ?? 0) + 1;
        }
    }

    // LANE-NIGHTSHIFT-N4-CANON-AMENDMENT: update morale_low_streak counter
    // for ALL active brigade-kind formations regardless of engaged status.
    // Final morale at end of drift is the canonical "this turn's morale"
    // for streak purposes. Engaged brigades had their morale set during
    // battle resolution earlier in the pipeline; the streak counter respects
    // whatever value lives on f.morale at this point. Increment when
    // morale ≤ 15; reset when morale > 20; preserve unchanged in the 16-20
    // hysteresis band. Counter increments unconditionally — the env-flag
    // gate lives in brigade_dissolution.ts so the streak data is available
    // for diagnostics even when the dissolution path is suppressed.
    for (const fId of formationIds) {
        const f = formations[fId] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'operational_group') continue;
        const morale = typeof f.morale === 'number' ? f.morale : 60;
        const streak = typeof f.morale_low_streak === 'number' ? f.morale_low_streak : 0;
        if (morale <= MORALE_OVERRIDE_THRESHOLD) {
            f.morale_low_streak = streak + 1;
        } else if (morale > MORALE_OVERRIDE_RESET) {
            if (streak !== 0) f.morale_low_streak = 0;
        }
        // 16-20 hysteresis band: leave streak unchanged.
    }

    return report;
}
