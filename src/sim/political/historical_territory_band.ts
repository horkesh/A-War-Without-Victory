/**
 * B5 fix 4 — the historical-territory gate for emergent bot political decisions.
 *
 * Owner rule: "A finished game will reproduce history accurately if left alone, BUT also
 * allow the player to create ahistorical outcomes." The emergent political bot keeps to an
 * event's authored historical response while the war's map is historical, and may improvise
 * once the war has left history's territory (see `divergence_threshold` in
 * political_personality.ts and `pickPoliticalResponseWithHistory` in political_event_decision.ts).
 * Original design: docs/plans/2026-03-24-v080-political-leader-bot-plan.md §3.
 *
 * The band. Each faction's area share at the painted historical control checkpoints
 * (data/source/calibration/painted_control_*.json, scored against osid_areas.json), plus the
 * April 1992 starting control. Between two checkpoints, any share inside [min, max] of the two
 * counts as historical, so the timing of a real swing inside the window (spring 1992, autumn
 * 1995) does not open the gate. The gate opens when any faction sits more than
 * DIVERGENCE_GATE_MARGIN_PP outside its band. Recomputed at every decision; no state.
 *
 * Measured margin (2026-11-16, main df206642c): the largest excursion outside the band in a
 * hands-off 188w run is 0.42 pp (historical mode) and 0.24 pp (emergent), both RBiH at t73.
 * The 3 pp margin is more than twice that, so a left-alone game stays closed.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { getFactionTerritoryAreaPct } from '../osid_areas.js';

export interface HistoricalTerritoryCheckpoint {
    /** Game turn (week) of the checkpoint. */
    turn: number;
    /** Painted reference id, or 'start' for the April 1992 starting control. */
    id: string;
    /** Area share per faction, percent of the country (0..100). */
    share: Record<FactionId, number>;
}

/**
 * Area shares at the checkpoints. Turn 0 is the canonical scenario's initial control
 * (apr1992_definitive_188w initial_save); 39/104/156/188 are the painted references
 * jan1993/apr1994/apr1995/oct1995 (the calibration checkpoints). Guarded by
 * tests/sim/political/historical_territory_band.test.ts, which recomputes the painted rows.
 */
export const HISTORICAL_TERRITORY_CHECKPOINTS: readonly HistoricalTerritoryCheckpoint[] = [
    { turn: 0, id: 'start', share: { RS: 52.692, RBiH: 32.264, HRHB: 15.044 } },
    { turn: 39, id: 'jan1993', share: { RS: 63.424, RBiH: 24.215, HRHB: 12.361 } },
    { turn: 104, id: 'apr1994', share: { RS: 66.227, RBiH: 22.675, HRHB: 11.099 } },
    { turn: 156, id: 'apr1995', share: { RS: 63.677, RBiH: 24.001, HRHB: 12.322 } },
    { turn: 188, id: 'oct1995', share: { RS: 47.399, RBiH: 31.859, HRHB: 20.741 } },
] as const;

/** Percentage points outside history's band at which the gate opens. */
export const DIVERGENCE_GATE_MARGIN_PP = 3;

const GATE_FACTIONS: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];

/** History's [low, high] area share for a faction at a turn (the band between the checkpoints either side). */
export function historicalShareBand(turn: number, faction: FactionId): [number, number] {
    const cps = HISTORICAL_TERRITORY_CHECKPOINTS;
    let i = 0;
    while (i < cps.length - 2 && turn > cps[i + 1].turn) i++;
    const a = cps[i].share[faction];
    const b = cps[i + 1].share[faction];
    return [Math.min(a, b), Math.max(a, b)];
}

/** Largest distance (pp) any faction's share sits outside its band; 0 when all are inside. */
export function historicalBandOvershootPp(turn: number, shareOf: (faction: FactionId) => number): number {
    let worst = 0;
    for (const faction of GATE_FACTIONS) {
        const [lo, hi] = historicalShareBand(turn, faction);
        const v = shareOf(faction);
        const over = Math.max(0, lo - v, v - hi);
        if (over > worst) worst = over;
    }
    return worst;
}

/** True when the war's map has left history's band by more than DIVERGENCE_GATE_MARGIN_PP. */
export function isWarOutsideHistoricalBand(state: GameState): boolean {
    const turn = state.meta?.turn ?? 0;
    return historicalBandOvershootPp(turn, (f) => getFactionTerritoryAreaPct(state, f)) > DIVERGENCE_GATE_MARGIN_PP;
}
