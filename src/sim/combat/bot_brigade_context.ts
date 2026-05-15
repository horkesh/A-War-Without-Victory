/**
 * Bot brigade AI — brigade location, context, and counting helpers.
 *
 * Extracted from bot_brigade_ai_osid.ts (behavior-preserving refactor).
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';
import {
    isBrigadeDeployed,
    type Osid
} from './osid_adjacency.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum brigades per corps that should stay at one OSID before rebalancing.
 * Per-corps threshold: each corps should have at most 2 at one position
 * (1 attacking + 1 in reserve). More means the corps has excess to redeploy
 * within its zone. At corps boundary junctions, 2+2=4 total is acceptable
 * since those are natural concentration points. */
export const MAX_CORPS_BRIGADES_PER_OSID = 2;
const ALL_FACTION_CORPS_COUNT_KEY = '__all__';

export type CorpsBrigadeCountsByOsid = Map<string, Map<Osid, number>>;

// ═══════════════════════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════════════════════

export function getFactionBrigades(state: GameState, faction: FactionId): FormationState[] {
    const formations = state.military.formations ?? {};
    const result: FormationState[] = [];
    for (const [, f] of Object.entries(formations)) {
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        // Skip brigades in column transit (they're redeploying; no new orders)
        if (!isBrigadeDeployed(state, f.id)) continue;
        result.push(f);
    }
    result.sort((a, b) => strictCompare(a.id, b.id));
    return result;
}

/**
 * Find the sector_id for a brigade based on its location_osid and corps_front_sectors.
 * Returns the sector whose friendly_osids contain the brigade's location, or the corps'
 * largest sector as fallback.
 */
export function findBrigadeSectorId(state: GameState, brigade: FormationState): string | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors || !brigade.corps_id || !brigade.location_osid) return null;

    const corpsId = brigade.corps_id;
    const loc = brigade.location_osid;
    let largestSector: string | null = null;
    let largestEdges = -1;

    for (const sectorKey of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorKey]!;
        if (sector.corps_id !== corpsId) continue;
        // Track largest for fallback
        if (sector.length_edges > largestEdges) {
            largestEdges = sector.length_edges;
            largestSector = sector.sector_id;
        }
        // Direct match: brigade at a friendly OSID of this sector
        for (const ss of sector.sub_segments) {
            if (ss.friendly_osids.includes(loc)) return sector.sector_id;
        }
    }

    return largestSector;
}

/** Return adjacent enemy-controlled OSIDs for a brigade location. */
export function getAdjacentEnemyOsids(
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    const result: Osid[] = [];
    for (const n of getTacticalAdjacentOsids(state, loc, adjacency)) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c !== null && c !== faction) result.push(n);
    }
    return result.sort(strictCompare);
}

/**
 * BFS through friendly territory from a start OSID to find the nearest OSID in a target set.
 * Used for sector operation deployment (Rule 1.5): march brigade to its assigned sector.
 */
export function findNearestFriendlyOsidInSet(
    state: GameState,
    faction: FactionId,
    startOsid: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    targetOsids: Set<string>
): Osid | null {
    const visited = new Set<string>();
    const queue: Array<{ osid: Osid; firstStep: Osid | null }> = [{ osid: startOsid, firstStep: null }];
    visited.add(startOsid);
    let head = 0;
    while (head < queue.length) {
        const { osid, firstStep } = queue[head++]!;
        if (targetOsids.has(osid)) return firstStep ?? osid;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of [...neighbors].sort(strictCompare)) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (isFriendlyFaction(ctrl, faction, state)) {
                queue.push({ osid: n, firstStep: firstStep ?? n });
            }
        }
    }
    return null;
}

/** Like findNearestFriendlyOsidInSet, but returns the actual target OSID
 *  instead of the first step. Used for column march destinations where the
 *  pathfinder (Dijkstra) handles the multi-hop route. */
export function findNearestFriendlyOsidDestination(
    state: GameState,
    faction: FactionId,
    startOsid: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    targetOsids: Set<string>
): Osid | null {
    const visited = new Set<string>();
    const queue: Osid[] = [startOsid];
    visited.add(startOsid);
    let head = 0;
    while (head < queue.length) {
        const osid = queue[head++]!;
        if (targetOsids.has(osid)) return osid;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of [...neighbors].sort(strictCompare)) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (isFriendlyFaction(ctrl, faction, state)) {
                queue.push(n as Osid);
            }
        }
    }
    return null;
}

/** Count how many active brigades from the same corps are at a given OSID.
 * Corps-level rebalancing: a corps commander manages their own zone.
 * If corpsId is null/undefined, falls back to counting all faction brigades. */
export function countCorpsBrigadesAtOsid(state: GameState, faction: FactionId, corpsId: FormationId | null | undefined, osid: Osid): number {
    const formations = state.military.formations ?? {};
    let count = 0;
    for (const fid of Object.keys(formations)) {
        const f = formations[fid]!;
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.location_osid !== osid) continue;
        if (corpsId) {
            // Corps-level: only count brigades from the same corps
            if (f.corps_id === corpsId) count++;
        } else {
            // No corps info: count all faction brigades
            count++;
        }
    }
    return count;
}

export function buildCorpsBrigadeCountsByOsid(state: GameState, faction: FactionId): CorpsBrigadeCountsByOsid {
    const counts: CorpsBrigadeCountsByOsid = new Map();
    const formations = state.military.formations ?? {};

    const increment = (key: string, osid: Osid): void => {
        let osidCounts = counts.get(key);
        if (!osidCounts) {
            osidCounts = new Map();
            counts.set(key, osidCounts);
        }
        osidCounts.set(osid, (osidCounts.get(osid) ?? 0) + 1);
    };

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid]!;
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;

        const osid = f.location_osid as Osid;
        increment(ALL_FACTION_CORPS_COUNT_KEY, osid);
        if (f.corps_id) increment(f.corps_id, osid);
    }

    return counts;
}

export function getCorpsBrigadeCountAtOsid(
    counts: CorpsBrigadeCountsByOsid | null | undefined,
    corpsId: FormationId | null | undefined,
    osid: Osid
): number {
    const key = corpsId ? corpsId : ALL_FACTION_CORPS_COUNT_KEY;
    return counts?.get(key)?.get(osid) ?? 0;
}

/** Count ALL faction brigades at an OSID (regardless of corps). Used for
 * front-line gap-fill: a brigade should move to cover an undefended neighbor
 * only if at least 1 other faction brigade remains behind. */
export function countFactionBrigadesAtOsid(state: GameState, faction: FactionId, osid: Osid): number {
    const formations = state.military.formations ?? {};
    let count = 0;
    for (const fid of Object.keys(formations)) {
        const f = formations[fid]!;
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.location_osid !== osid) continue;
        count++;
    }
    return count;
}

/** True if moving a brigade to this OSID would be risky (salient or cut-off).
 * Used to avoid sending reinforcements into positions that could be overrun or isolated. */
export function isMovementDestinationRisky(
    dest: Osid,
    graphAnalysis: FactionGraphAnalysis
): boolean {
    const analysis = graphAnalysis.osid_analysis.get(dest);
    if (!analysis) return false;
    const enemyCount = analysis.enemy_neighbors.length;
    const friendlyCount = analysis.friendly_neighbors.length;
    if (enemyCount >= 3) return true;   // salient — exposed on 3+ sides
    if (friendlyCount <= 1) return true; // cut-off risk — at most one escape route
    return false;
}
