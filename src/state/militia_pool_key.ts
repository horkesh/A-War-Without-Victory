/**
 * Composite key for militia_pools: (mun_id, faction).
 * Keys are stored as "mun_id:faction" for deterministic Record iteration.
 */

import type { FactionId, MunicipalityId } from './game_state.js';

const SEP = ':';

/**
 * Build composite key for militia pool. Deterministic.
 */
export function militiaPoolKey(mun_id: MunicipalityId, faction: FactionId): string {
    return `${mun_id}${SEP}${faction}`;
}

/**
 * Parse composite key. Returns null if key does not contain exactly one ':'.
 */
export function parseMilitiaPoolKey(key: string): { mun_id: string; faction: string } | null {
    const i = key.indexOf(SEP);
    if (i <= 0 || i === key.length - 1) return null;
    if (key.indexOf(SEP, i + 1) >= 0) return null; // no second colon
    return { mun_id: key.slice(0, i), faction: key.slice(i + 1) };
}

/**
 * Returns true if key is in composite form "mun_id:faction".
 */
export function isCompositeMilitiaPoolKey(key: string): boolean {
    return parseMilitiaPoolKey(key) !== null;
}
