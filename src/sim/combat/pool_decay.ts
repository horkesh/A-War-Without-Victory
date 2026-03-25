/**
 * War phase: Per-turn pool decay modeling war weariness (desertion, draft evasion, emigration).
 * Runs AFTER ongoing-mobilization and BEFORE reroute-pool-surplus so freshly mobilized
 * manpower is subject to decay before being routed or consumed.
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 *
 * Historical basis:
 *   - HVO had exit-to-Croatia pipeline (highest drain), smallest demographic base
 *   - VRS had endemic desertion crisis, Belgrade competing demands
 *   - ARBiH had geographic entrapment limiting drain (lowest rate)
 *   - Enclave municipalities (Srebrenica, Gorazde, Zepa) are exempt — no escape route
 */

import type { GameState, MilitiaPoolState } from '../../state/game_state.js';
import { parseMilitiaPoolKey } from '../../state/militia_pool_key.js';
import { ENCLAVE_MUNICIPALITY_IDS } from '../../state/formation_constants.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Faction-differentiated pool decay rates (per turn, i.e. per week).
 * Applied to pool.available only — committed and exhausted are untouched.
 */
const POOL_DECAY_RATE: Record<string, number> = {
    HRHB: 0.025,  // 2.5% — exit-to-Croatia, smallest demographic base
    RS:   0.020,  // 2.0% — desertion crisis, Belgrade competing demands
    RBiH: 0.012,  // 1.2% — geographic entrapment limits drain
};

const DEFAULT_DECAY_RATE = 0.015;

export interface PoolDecayReport {
    total_decayed: number;
    by_faction: Record<string, number>;
    pools_affected: number;
    enclaves_skipped: number;
}

/**
 * Apply per-turn war weariness decay to all militia pools.
 * Decayed men vanish entirely (desertion/emigration) — NOT added to pool.exhausted.
 * Enclave municipalities are exempt (no escape route).
 */
export function applyPoolWarWearinessDecay(state: GameState): PoolDecayReport {
    const report: PoolDecayReport = {
        total_decayed: 0,
        by_faction: {},
        pools_affected: 0,
        enclaves_skipped: 0,
    };

    if (!state.military.militia_pools || typeof state.military.militia_pools !== 'object') return report;
    const pools = state.military.militia_pools as Record<string, MilitiaPoolState>;

    const keys = Object.keys(pools).slice().sort(strictCompare);

    for (const key of keys) {
        const parsed = parseMilitiaPoolKey(key);
        if (!parsed) continue;

        const { mun_id, faction } = parsed;

        // Enclave municipalities exempt — no escape route
        if (ENCLAVE_MUNICIPALITY_IDS.has(mun_id)) {
            report.enclaves_skipped++;
            continue;
        }

        const pool = pools[key];
        if (!pool || pool.available <= 0) continue;

        const rate = POOL_DECAY_RATE[faction] ?? DEFAULT_DECAY_RATE;
        const decayed = Math.floor(pool.available * rate);
        if (decayed <= 0) continue;

        pool.available = Math.max(0, pool.available - decayed);
        pool.updated_turn = state.meta.turn;

        report.total_decayed += decayed;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + decayed;
        report.pools_affected++;
    }

    return report;
}
