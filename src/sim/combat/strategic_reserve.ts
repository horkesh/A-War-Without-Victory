/**
 * Strategic Reserve: faction-level manpower redistribution.
 *
 * Problem: municipality-locked pools create a topology mismatch — rear municipalities
 * accumulate large surplus pools (brigades at max capacity) while front-line municipalities
 * have empty pools (brigades consume faster than mobilization generates). Increasing
 * mobilization surge factors only adds to the rear surplus.
 *
 * Solution: after brigade reinforcement, sweep excess pool.available above a threshold
 * into a faction-wide strategic reserve. Then run a second reinforcement pass where
 * under-strength brigades draw from the reserve at reduced rate (logistics friction).
 *
 * Historical basis: all three factions redistributed manpower across their territory.
 * VRS rotated units between fronts, ARBiH moved forces to Sarajevo/corridor operations,
 * HVO shuttled between Herzegovina and Central Bosnia.
 *
 * Pipeline order:
 *   phase-ii-ongoing-mobilization → phase-ii-brigade-reinforcement →
 *   phase-ii-strategic-reserve-collection → phase-ii-strategic-reserve-reinforcement
 *
 * Deterministic: sorted pool keys, sorted formation ids, strictCompare throughout.
 */

import {
    COMBAT_REINFORCEMENT_RATE,
    getFactionReinforcementMult,
    MAX_BRIGADE_PERSONNEL,
    MIN_BRIGADE_SPAWN,
    REINFORCEMENT_RATE
} from '../../state/formation_constants.js';
import type { FormationState, GameState, MilitiaPoolState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Pool.available above this flows to faction reserve after reinforcement.
 * Keeps a local buffer so the municipality can still support local spawn/reinforcement.
 */
const OVERFLOW_THRESHOLD = 5000;

/**
 * Fraction of normal reinforcement rate when drawing from reserve.
 * Represents logistics friction — moving manpower across municipality boundaries
 * is slower than local reinforcement.
 *
 * Faction-specific: ARBiH had poor logistics/command structure until mid-1994
 * professionalization. VRS/HVO had better redistribution capacity (JNA inheritance
 * and Croatian support respectively).
 */
const RESERVE_DRAW_RATE_MULT_DEFAULT = 0.25;
const FACTION_RESERVE_DRAW_RATE: Record<string, number> = {
    RBiH: 0.02,    // poor early logistics until 1994 professionalization; limits redistribution
    RS: 0.25,      // JNA logistics inheritance
    HRHB: 0.25     // Croatian support, compact territory
};

// ─── Collection ─────────────────────────────────────────────────────────────

export interface StrategicReserveCollectionReport {
    pools_overflowed: number;
    manpower_collected: number;
    by_faction: Record<string, number>;
}

/**
 * Collect excess pool.available into faction strategic reserves.
 * Runs AFTER brigade reinforcement — whatever's left above threshold is genuine surplus.
 * Mutates state.militia_pools and state.strategic_reserves.
 */
export function collectStrategicReserves(state: GameState): StrategicReserveCollectionReport {
    const report: StrategicReserveCollectionReport = {
        pools_overflowed: 0,
        manpower_collected: 0,
        by_faction: {}
    };

    if (!state.militia_pools) return report;
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    if (!state.strategic_reserves) state.strategic_reserves = {};
    const reserves = state.strategic_reserves as Record<string, number>;

    const poolKeys = Object.keys(pools).sort(strictCompare);
    for (const key of poolKeys) {
        const pool = pools[key];
        if (!pool || pool.available <= OVERFLOW_THRESHOLD) continue;
        const faction = pool.faction;
        if (!faction) continue;

        const excess = pool.available - OVERFLOW_THRESHOLD;
        pool.available -= excess;
        reserves[faction] = (reserves[faction] ?? 0) + excess;

        report.pools_overflowed += 1;
        report.manpower_collected += excess;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + excess;
    }

    return report;
}

// ─── Reinforcement from Reserve ─────────────────────────────────────────────

export interface StrategicReserveReinforcementReport {
    formations_reinforced: number;
    manpower_distributed: number;
    by_faction: Record<string, number>;
}

/**
 * Second reinforcement pass: under-strength brigades draw from faction strategic reserve.
 * Only brigades that couldn't fully reinforce from their home pool benefit.
 * Rate-limited at RESERVE_DRAW_RATE_MULT of normal reinforcement rate.
 *
 * Runs AFTER reserve collection so freshly collected surplus is available same turn.
 * Deterministic: formations sorted by id.
 */
export function reinforceFromStrategicReserves(state: GameState): StrategicReserveReinforcementReport {
    const report: StrategicReserveReinforcementReport = {
        formations_reinforced: 0,
        manpower_distributed: 0,
        by_faction: {}
    };

    if (!state.strategic_reserves) return report;
    const reserves = state.strategic_reserves as Record<string, number>;
    const formations = state.formations ?? {};
    const currentTurn = state.meta?.turn ?? 0;

    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const id of formationIds) {
        const f = formations[id] as FormationState | undefined;
        if (!f) continue;

        // Only brigades (not militia detachments/battalions — those are local by nature)
        if (f.kind !== 'brigade') continue;

        // Same gates as normal reinforcement
        if (f.readiness === 'degraded' || f.readiness === 'forming') continue;
        if (Array.isArray(f.tags) && f.tags.includes('enclave')) continue;

        const faction = f.faction;
        if (!faction) continue;

        const current = f.personnel ?? MIN_BRIGADE_SPAWN;
        if (current >= MAX_BRIGADE_PERSONNEL) continue;

        // Check if faction has reserve available
        const poolFaction = f.recruit_pool_faction ?? faction;
        const reserveAvail = reserves[poolFaction] ?? 0;
        if (reserveAvail <= 0) continue;

        // Rate limit: reduced rate for reserve draws (logistics friction)
        const inCombat = f.posture === 'attack' || f.disrupted === true;
        const factionMult = getFactionReinforcementMult(faction, currentTurn, state.war_timeline);
        const drawMult = FACTION_RESERVE_DRAW_RATE[poolFaction] ?? RESERVE_DRAW_RATE_MULT_DEFAULT;
        const baseRate = inCombat ? COMBAT_REINFORCEMENT_RATE : REINFORCEMENT_RATE;
        const rate = Math.max(1, Math.floor(baseRate * factionMult * drawMult));

        const need = Math.min(MAX_BRIGADE_PERSONNEL - current, rate);
        const transfer = Math.min(need, reserveAvail);
        if (transfer <= 0) continue;

        (f as FormationState & { personnel: number }).personnel = current + transfer;
        reserves[poolFaction] -= transfer;

        report.formations_reinforced += 1;
        report.manpower_distributed += transfer;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + transfer;
    }

    return report;
}
