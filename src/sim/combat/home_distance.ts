/**
 * Home distance effectiveness: brigades fight worse the further they are
 * from their home OSID. Universal curve, not faction-differentiated.
 *
 * Curve: 1.0 within 3 hops, then ~3-5% drop per hop, floor at 0.70.
 * Most brigades operate within 3-5 hops of home (no penalty).
 * Long-range redeployments (8+ hops) hurt noticeably.
 *
 * Deterministic: BFS uses sorted adjacency lists.
 */

import type { Osid } from './osid_adjacency.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Hops within which there is no penalty. */
export const HOME_DISTANCE_FREE_RANGE = 3;

/** Multiplier floor — minimum effectiveness at any distance. */
export const HOME_DISTANCE_FLOOR = 0.70;

/** Floor for elite/professional brigades — trained for expeditionary ops. */
export const HOME_DISTANCE_FLOOR_ELITE = 0.85;

/** Per-hop penalty beyond FREE_RANGE. Reaches floor at ~10 hops. */
const PER_HOP_PENALTY = 0.04;

/** Per-hop penalty for elite brigades. Reaches floor at ~10 hops. */
const PER_HOP_PENALTY_ELITE = 0.02;

// ═══════════════════════════════════════════════════════════════════════════
// BFS distance computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS hop distance between two OSIDs through any connected territory.
 * Ignores political control — measures raw graph distance.
 * Returns hop count, or Infinity if unreachable.
 */
export function computeOsidGraphDistance(
    fromOsid: Osid,
    toOsid: Osid,
    adjacency: Map<Osid, Osid[]>
): number {
    if (fromOsid === toOsid) return 0;

    const visited = new Set<Osid>([fromOsid]);
    const queue: Array<{ osid: Osid; depth: number }> = [{ osid: fromOsid, depth: 0 }];
    let head = 0;

    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (n === toOsid) return depth + 1;
            if (visited.has(n)) continue;
            visited.add(n);
            queue.push({ osid: n, depth: depth + 1 });
        }
    }

    return Infinity;
}

// ═══════════════════════════════════════════════════════════════════════════
// Effectiveness multiplier
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Home distance effectiveness multiplier.
 *
 * | Hops | Mult |
 * |------|------|
 * | 0-3  | 1.00 |
 * | 4    | 0.96 |
 * | 5    | 0.92 |
 * | 6    | 0.88 |
 * | 7    | 0.84 |
 * | 8    | 0.80 |
 * | 9    | 0.76 |
 * | 10+  | 0.70 |
 *
 * Elite/professional brigades (is_elite flag):
 * | Hops | Mult |
 * |------|------|
 * | 0-3  | 1.00 |
 * | 4    | 0.98 |
 * | 5    | 0.96 |
 * | 6    | 0.94 |
 * | 7    | 0.92 |
 * | 8    | 0.90 |
 * | 10+  | 0.85 |
 */
export function getHomeDistanceMult(hops: number, isElite = false): number {
    if (hops <= HOME_DISTANCE_FREE_RANGE) return 1.0;
    const perHop = isElite ? PER_HOP_PENALTY_ELITE : PER_HOP_PENALTY;
    const floor = isElite ? HOME_DISTANCE_FLOOR_ELITE : HOME_DISTANCE_FLOOR;
    const penalty = (hops - HOME_DISTANCE_FREE_RANGE) * perHop;
    return Math.max(floor, 1.0 - penalty);
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-turn cache
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a distance cache for all active brigades with home_osid.
 * Key: formationId, value: hop distance from home_osid to location_osid.
 * Recomputed each turn (derived state, not serialized).
 */
export function buildHomeDistanceCache(
    formations: Record<string, { home_osid?: string; location_osid?: string; status?: string; kind?: string }>,
    adjacency: Map<Osid, Osid[]>,
    sortedFormationIds: string[]
): Record<string, number> {
    const cache: Record<string, number> = {};
    for (const fid of sortedFormationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.home_osid || !f.location_osid) continue;
        if (f.home_osid === f.location_osid) {
            cache[fid] = 0;
            continue;
        }
        const dist = computeOsidGraphDistance(f.home_osid as Osid, f.location_osid as Osid, adjacency);
        cache[fid] = dist;
    }
    return cache;
}
