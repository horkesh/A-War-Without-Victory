/**
 * Siege bombardment attrition — besieged formations take passive casualties
 * from enemy artillery bombardment, scaled by siege duration and firepower ratio.
 *
 * This models the Sarajevo siege, enclave shelling, and other persistent
 * bombardment that caused casualties without formal battle resolution.
 *
 * Deterministic: sorted iteration, no randomness.
 */

import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import type { GameState, MilitiaPoolState } from '../../state/game_state.js';
import { initializeCasualtyLedger, recordBattleCasualties } from '../../state/casualty_ledger.js';
import { strictCompare } from '../../state/validateGameState.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { ensureBrigadeComposition } from './equipment_effects.js';

// --- Constants ---

/** Base attrition rate per turn for besieged formations (fraction of personnel). */
export const BASE_SIEGE_ATTRITION_RATE = 0.004;

/** Per-siege-turn escalation factor. Counter=10 → 1.5x, counter=20 → 2.0x (capped). */
export const SIEGE_ATTRITION_ESCALATION = 0.05;

/** Maximum siege escalation multiplier. */
export const SIEGE_ATTRITION_CAP = 2.0;

/** KIA fraction of siege bombardment casualties (lower than combat — more WIA from shelling). */
export const SIEGE_KIA_FRACTION = 0.20;

/** WIA fraction of siege bombardment casualties. */
export const SIEGE_WIA_FRACTION = 0.65;

// --- Types ---

export interface SiegeAttritionReport {
    brigades_affected: number;
    total_casualties: number;
    by_faction: Record<string, number>;
}

// --- Main ---

/**
 * Apply passive siege bombardment casualties to formations in besieged OSIDs.
 * Uses siege_turn_counters to identify besieged positions and their duration.
 * Casualties scale with:
 *   - Siege duration (escalation over time)
 *   - Enemy firepower at adjacent OSIDs (artillery advantage)
 *   - Defender's lack of counter-battery capability
 */
export function applySiegeBombardmentAttrition(state: GameState): SiegeAttritionReport {
    const report: SiegeAttritionReport = {
        brigades_affected: 0,
        total_casualties: 0,
        by_faction: {}
    };

    const counters = state.military.siege_turn_counters;
    if (!counters) return report;

    const formations = state.military.formations ?? {};
    const pools = (state.military.militia_pools ?? {}) as Record<string, MilitiaPoolState>;
    if (!state.military.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.military.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    // Build map: osid → list of formation IDs located there
    const formationsByOsid: Record<string, string[]> = {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const osid = f.location_osid;
        if (!osid) continue;
        if (!formationsByOsid[osid]) formationsByOsid[osid] = [];
        formationsByOsid[osid].push(fid);
    }

    // Compute per-faction average firepower for bombardment scaling
    const factionFirepower: Record<string, { totalFP: number; count: number }> = {};
    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || !f.faction) continue;
        const comp = f.composition ?? ensureBrigadeComposition(f);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        const fp = artEff + tankEff * 0.5;
        if (!factionFirepower[f.faction]) factionFirepower[f.faction] = { totalFP: 0, count: 0 };
        factionFirepower[f.faction].totalFP += fp;
        factionFirepower[f.faction].count += 1;
    }

    // Process siege counters — each key is "factionId:osid"
    const counterKeys = Object.keys(counters).sort(strictCompare);
    for (const key of counterKeys) {
        const counter = counters[key];
        if (counter <= 0) continue;

        const colonIdx = key.indexOf(':');
        if (colonIdx < 0) continue;
        const besiegedFaction = key.substring(0, colonIdx);
        const osid = key.substring(colonIdx + 1);

        const brigadesAtOsid = formationsByOsid[osid];
        if (!brigadesAtOsid || brigadesAtOsid.length === 0) continue;

        // Siege duration escalation
        const escalation = Math.min(SIEGE_ATTRITION_CAP, 1.0 + SIEGE_ATTRITION_ESCALATION * counter);

        // Enemy firepower ratio — compare besieging faction's average FP to besieged
        // Determine besieging factions (any faction != besiegedFaction that has formations)
        let enemyFP = 0;
        let ownFP = 0;
        for (const [fac, fp] of Object.entries(factionFirepower)) {
            if (fac === besiegedFaction) {
                ownFP = fp.count > 0 ? fp.totalFP / fp.count : 1;
            } else {
                enemyFP = Math.max(enemyFP, fp.count > 0 ? fp.totalFP / fp.count : 0);
            }
        }
        // Firepower ratio scales casualties (capped at 3x)
        const fpRatio = Math.min(3.0, Math.max(0.1, enemyFP / Math.max(1, ownFP)));

        for (const fid of brigadesAtOsid) {
            const f = formations[fid];
            if (!f || f.status !== 'active') continue;
            if (f.faction !== besiegedFaction) continue;

            const personnel = f.personnel ?? 0;
            if (personnel <= MIN_COMBAT_PERSONNEL) continue;

            // Calculate casualties
            const available = personnel - MIN_COMBAT_PERSONNEL;
            const rawCas = Math.round(personnel * BASE_SIEGE_ATTRITION_RATE * escalation * fpRatio);
            const casualties = Math.min(rawCas, available);
            if (casualties <= 0) continue;

            // Apply
            f.personnel = personnel - casualties;

            const killed = Math.floor(casualties * SIEGE_KIA_FRACTION);
            const wounded = Math.floor(casualties * SIEGE_WIA_FRACTION);
            const missing = casualties - killed - wounded;

            recordBattleCasualties(state.military.casualty_ledger!, besiegedFaction, fid, {
                killed, wounded, missing_captured: missing
            });

            // Feed into pool.exhausted for demographic gating (75% rate — matches applyCasualtyPoolExhaustion)
            const originMun = f.origin_mun;
            if (originMun) {
                const poolKey = militiaPoolKey(originMun, besiegedFaction);
                const pool = pools[poolKey];
                if (pool) {
                    const permanentLoss = killed + missing;
                    pool.exhausted = (pool.exhausted ?? 0) + Math.round(permanentLoss * 0.75);
                }
            }

            report.brigades_affected++;
            report.total_casualties += casualties;
            report.by_faction[besiegedFaction] = (report.by_faction[besiegedFaction] ?? 0) + casualties;
        }
    }

    return report;
}
