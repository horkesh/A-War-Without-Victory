/**
 * Corps AI sector rearrangement.
 *
 * Three triggers:
 *   1. Thin sector consolidation — merge 0-brigade sectors into adjacent neighbor (capped at MAX_SECTOR_EDGES)
 *   2. Enemy pocket containment — create dedicated sector around enemy pockets in corps interior
 *   3. Operation concentration — merge op target sector with adjacent small sectors
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import { MAX_SECTOR_EDGES, splitNonContiguousSectors } from './corps_front_sectors.js';

// Thin sector consolidation: any 0-brigade sector is eligible for merge.

export interface RearrangeContext {
    politicalControllers?: Record<string, string>;
    faction?: FactionId;
}

/** Check if two sectors are OSID-adjacent (any friendly OSID in one is adjacent to any friendly OSID in the other). */
function areSectorsAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    osidAdjacency: Map<Osid, Osid[]>,
): boolean {
    const bFriendly = new Set<string>();
    for (const ss of b.sub_segments) {
        for (const o of ss.friendly_osids) bFriendly.add(o);
    }
    for (const ss of a.sub_segments) {
        for (const o of ss.friendly_osids) {
            if (bFriendly.has(o)) return true;
            for (const nb of osidAdjacency.get(o) ?? []) {
                if (bFriendly.has(nb)) return true;
            }
        }
    }
    return false;
}

/** Merge sector `from` into sector `into`. Mutates `into`. */
function mergeSectorInto(into: CorpsFrontSector, from: CorpsFrontSector): void {
    const edgeSet = new Set(into.edge_ids);
    for (const eid of from.edge_ids) {
        if (!edgeSet.has(eid)) {
            into.edge_ids.push(eid);
            edgeSet.add(eid);
        }
    }
    into.edge_ids.sort(strictCompare);
    into.length_edges = into.edge_ids.length;

    into.sub_segments.push(...from.sub_segments);

    // Merge territory_osids
    const territorySet = new Set(into.territory_osids);
    for (const o of from.territory_osids) {
        if (!territorySet.has(o)) {
            into.territory_osids.push(o);
            territorySet.add(o);
        }
    }
    into.territory_osids.sort(strictCompare);

    const assignedSet = new Set(into.assigned_brigade_ids);
    for (const bid of from.assigned_brigade_ids) {
        if (!assignedSet.has(bid)) {
            into.assigned_brigade_ids.push(bid);
            assignedSet.add(bid);
        }
    }
    into.assigned_brigade_ids.sort(strictCompare);

    const reserveSet = new Set(into.reserve_brigade_ids);
    for (const bid of from.reserve_brigade_ids) {
        if (!reserveSet.has(bid) && !assignedSet.has(bid)) {
            into.reserve_brigade_ids.push(bid);
            reserveSet.add(bid);
        }
    }
    into.reserve_brigade_ids.sort(strictCompare);

    const opSet = new Set(into.opposing_factions);
    for (const f of from.opposing_factions) {
        if (!opSet.has(f)) {
            into.opposing_factions.push(f);
            opSet.add(f);
        }
    }
    into.opposing_factions.sort(strictCompare);

    into.density = into.length_edges > 0
        ? into.assigned_brigade_ids.length / into.length_edges
        : 0;
}

function collectSectorEnemyOsids(sector: CorpsFrontSector): string[] {
    const enemyOsids: string[] = [];
    for (const ss of sector.sub_segments) {
        for (const eo of ss.enemy_osids) {
            if (!enemyOsids.includes(eo)) {
                enemyOsids.push(eo);
            }
        }
    }
    enemyOsids.sort(strictCompare);
    return enemyOsids;
}

function renumberSectors(sectors: CorpsFrontSector[], corpsId: string): CorpsFrontSector[] {
    sectors.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < sectors.length; i++) {
        sectors[i]!.sector_id = `sector:${corpsId}:${i}`;
    }
    return sectors;
}

/** Trigger 1: Thin sector consolidation — merge 0-brigade sectors into adjacent neighbor. */
function consolidateThinSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
): CorpsFrontSector[] {
    const pool = sectors.map(s => structuredClone(s));
    let changed = true;

    // Track sectors that have no adjacent neighbor and can't be merged
    const unmergeable = new Set<string>();

    while (changed) {
        changed = false;
        pool.sort((a, b) => strictCompare(a.sector_id, b.sector_id));

        // Find the thinnest eligible sector (0 brigades, not already marked unmergeable)
        let thinIdx = -1;
        let thinSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            const s = pool[i]!;
            if (s.assigned_brigade_ids.length === 0 && !unmergeable.has(s.sector_id)) {
                if (
                    s.length_edges < thinSize ||
                    (s.length_edges === thinSize &&
                        thinIdx >= 0 &&
                        strictCompare(s.sector_id, pool[thinIdx]!.sector_id) < 0)
                ) {
                    thinSize = s.length_edges;
                    thinIdx = i;
                }
            }
        }
        if (thinIdx === -1) break;

        const thin = pool[thinIdx]!;

        // Find the best adjacent neighbor to merge into (smallest first, then alphabetical).
        // Skip neighbors that would exceed MAX_SECTOR_EDGES after merge.
        let bestIdx = -1;
        let bestSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            if (i === thinIdx) continue;
            if (areSectorsAdjacent(thin, pool[i]!, osidAdjacency)) {
                const size = pool[i]!.length_edges;
                if (size + thin.length_edges > MAX_SECTOR_EDGES) continue;
                if (
                    size < bestSize ||
                    (size === bestSize &&
                        bestIdx >= 0 &&
                        strictCompare(pool[i]!.sector_id, pool[bestIdx]!.sector_id) < 0)
                ) {
                    bestSize = size;
                    bestIdx = i;
                }
            }
        }

        if (bestIdx === -1) {
            // No adjacent neighbor for this sector — mark it and try others
            unmergeable.add(thin.sector_id);
            changed = true; // re-enter loop to find next thinnest
            continue;
        }

        mergeSectorInto(pool[bestIdx]!, thin);
        pool.splice(thinIdx, 1);
        changed = true;
    }

    return pool;
}

/** Trigger 2: Enemy pocket containment — detect enemy OSIDs fully surrounded by corps territory. */
function createPocketContainmentSectors(
    sectors: CorpsFrontSector[],
    corpsId: string,
    osidAdjacency: Map<Osid, Osid[]>,
    politicalControllers: Record<string, string>,
    faction: FactionId,
): CorpsFrontSector[] {
    // Collect all friendly OSIDs across all sectors
    const corpsFriendlyOsids = new Set<string>();
    for (const s of sectors) {
        for (const ss of s.sub_segments) {
            for (const o of ss.friendly_osids) corpsFriendlyOsids.add(o);
        }
    }

    // Collect OSIDs already tracked as enemy in existing sectors
    const existingEnemyOsids = new Set<string>();
    for (const s of sectors) {
        for (const ss of s.sub_segments) {
            for (const o of ss.enemy_osids) existingEnemyOsids.add(o);
        }
    }

    // Find pocket OSIDs: non-friendly, non-already-enemy, controlled by non-faction,
    // where ALL adjacency neighbors are in corpsFriendlyOsids
    const pocketOsids = new Set<string>();
    for (const friendlyOsid of [...corpsFriendlyOsids].sort(strictCompare)) {
        for (const nb of osidAdjacency.get(friendlyOsid) ?? []) {
            if (corpsFriendlyOsids.has(nb)) continue;
            if (existingEnemyOsids.has(nb)) continue;
            if (pocketOsids.has(nb)) continue;
            const ctrl = politicalControllers[nb];
            if (ctrl === faction) continue;

            const nbNeighbors = osidAdjacency.get(nb) ?? [];
            if (nbNeighbors.length > 0 && nbNeighbors.every(n => corpsFriendlyOsids.has(n))) {
                pocketOsids.add(nb);
            }
        }
    }

    if (pocketOsids.size === 0) return sectors;

    // Group pocket OSIDs into connected components
    const pocketGroups = findConnectedComponents(
        pocketOsids,
        (osid) => osidAdjacency.get(osid) ?? [],
    );

    const result = sectors.map(s => structuredClone(s));

    for (let gi = 0; gi < pocketGroups.length; gi++) {
        const pocket = pocketGroups[gi]!;

        // Friendly OSIDs adjacent to the pocket
        const containmentFriendly = new Set<string>();
        for (const enemyOsid of [...pocket].sort(strictCompare)) {
            for (const nb of osidAdjacency.get(enemyOsid) ?? []) {
                if (corpsFriendlyOsids.has(nb)) containmentFriendly.add(nb);
            }
        }

        // Determine opposing factions from pocket controllers
        const opposingFactions = new Set<string>();
        for (const osid of pocket) {
            const ctrl = politicalControllers[osid];
            if (ctrl && ctrl !== faction) opposingFactions.add(ctrl);
        }

        const subSeg: CorpsFrontSubSegment = {
            sub_segment_id: `subseg:${corpsId}:pocket${gi}`,
            edge_ids: [],
            friendly_osids: [...containmentFriendly].sort(strictCompare),
            enemy_osids: [...pocket].sort(strictCompare),
            length_edges: 0,
        };

        result.push({
            sector_id: `sector:${corpsId}:pocket${gi}`,
            corps_id: corpsId,
            faction,
            opposing_factions: [...opposingFactions].sort(strictCompare) as FactionId[],
            edge_ids: [],
            sub_segments: [subSeg],
            length_edges: 0,
            territory_osids: [...containmentFriendly].sort(strictCompare),
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        });
    }

    return result;
}

/**
 * Rearrange corps front sectors for better operational coherence.
 *
 * @param sectors     Current sectors for this corps
 * @param corpsId     Corps formation ID
 * @param osidAdjacency  OSID adjacency graph
 * @param context     Optional context with political controllers and faction
 * @returns           Rearranged sectors with renumbered IDs
 */
export function rearrangeSectorsForCorps(
    sectors: CorpsFrontSector[],
    corpsId: string,
    osidAdjacency: Map<Osid, Osid[]>,
    context?: RearrangeContext,
): CorpsFrontSector[] {
    if (sectors.length === 0) return [];

    // 1. Thin sector consolidation
    let result = consolidateThinSectors(sectors, osidAdjacency);

    // 1b. Re-split non-contiguous sectors that consolidation may have created
    result = splitNonContiguousSectors(result, osidAdjacency);

    // 2. Enemy pocket containment
    if (context?.politicalControllers && context?.faction) {
        result = createPocketContainmentSectors(
            result,
            corpsId,
            osidAdjacency,
            context.politicalControllers,
            context.faction,
        );
    }

    // 3. Operation concentration — deferred

    // Final prune: remove 0-edge ghost sectors (e.g. pocket containment with no front).
    const pruned = result.filter(s => s.length_edges > 0);

    // Reserve cap removed: corps needs full visibility of all manpower for
    // planning, threat balancing, and proactive mech/moto staging.

    return renumberSectors(pruned, corpsId);
}

/**
 * Merge adjacent target-rich sectors until the corps regains a launchable offensive lane.
 * This preserves live rearrangement while preventing late-war starvation from one-brigade
 * sectors that all overlap valid offensive targets but never individually satisfy launch gates.
 */
export function concentrateSectorsForOffensive(
    sectors: CorpsFrontSector[],
    corpsId: string,
    osidAdjacency: Map<Osid, Osid[]>,
    offensiveTargets: string[],
    minAssignedBrigades = 3,
): CorpsFrontSector[] {
    if (sectors.length <= 1 || offensiveTargets.length === 0) {
        return sectors.map((sector) => structuredClone(sector));
    }

    const targetSet = new Set(offensiveTargets);
    const result = sectors.map((sector) => structuredClone(sector));
    const hasLaunchableTargetSector = result.some((sector) => {
        const overlap = collectSectorEnemyOsids(sector).filter((eo) => targetSet.has(eo)).length;
        return sector.length_edges > 0 && overlap > 0 && sector.assigned_brigade_ids.length >= minAssignedBrigades;
    });
    if (hasLaunchableTargetSector) {
        return result;
    }

    const anchorCandidates = result
        .map((sector) => ({
            sector,
            overlap: collectSectorEnemyOsids(sector).filter((eo) => targetSet.has(eo)).length,
        }))
        .filter((entry) => entry.sector.length_edges > 0 && entry.overlap > 0)
        .sort((a, b) => {
            if (b.overlap !== a.overlap) return b.overlap - a.overlap;
            if (b.sector.assigned_brigade_ids.length !== a.sector.assigned_brigade_ids.length) {
                return b.sector.assigned_brigade_ids.length - a.sector.assigned_brigade_ids.length;
            }
            if (a.sector.length_edges !== b.sector.length_edges) {
                return a.sector.length_edges - b.sector.length_edges;
            }
            return strictCompare(a.sector.sector_id, b.sector.sector_id);
        });
    const anchor = anchorCandidates[0]?.sector;
    if (!anchor) {
        return result;
    }

    while (anchor.assigned_brigade_ids.length < minAssignedBrigades) {
        const donorCandidates = result
            .filter((sector) =>
                sector !== anchor &&
                sector.length_edges > 0 &&
                areSectorsAdjacent(anchor, sector, osidAdjacency) &&
                anchor.length_edges + sector.length_edges <= MAX_SECTOR_EDGES
            )
            .map((sector) => ({
                sector,
                overlap: collectSectorEnemyOsids(sector).filter((eo) => targetSet.has(eo)).length,
            }))
            .sort((a, b) => {
                if (b.overlap !== a.overlap) return b.overlap - a.overlap;
                if (b.sector.assigned_brigade_ids.length !== a.sector.assigned_brigade_ids.length) {
                    return b.sector.assigned_brigade_ids.length - a.sector.assigned_brigade_ids.length;
                }
                if (a.sector.length_edges !== b.sector.length_edges) {
                    return a.sector.length_edges - b.sector.length_edges;
                }
                return strictCompare(a.sector.sector_id, b.sector.sector_id);
            });
        const donor = donorCandidates[0]?.sector;
        if (!donor) {
            break;
        }
        mergeSectorInto(anchor, donor);
        const donorIndex = result.indexOf(donor);
        if (donorIndex >= 0) {
            result.splice(donorIndex, 1);
        }
    }

    return renumberSectors(result, corpsId);
}
