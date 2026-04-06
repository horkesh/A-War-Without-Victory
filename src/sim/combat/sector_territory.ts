/**
 * Territory mapping: OSID-to-corps BFS, front edge partitioning, cross-corps consolidation.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { munFromOsid, type Osid } from './osid_adjacency.js';
import { buildEdgeAdjacency } from './sector_edge_adjacency.js';

/**
 * Corps territory exclusions: municipalities that should NEVER be claimed by a specific corps,
 * even if the BFS reaches them. Prevents siege corps from absorbing distant fronts.
 * Example: SRK should not claim Gorazde/Rogatica (Drina/Herzegovina responsibility).
 */
const CORPS_EXCLUDED_MUNICIPALITIES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ['vrs_sarajevo_romanija', new Set([
        'gorazde', 'rogatica', 'cajnice', 'kalinovik', 'foca', 'visegrad', 'rudo',
        'han_pijesak', 'vlasenica', 'bratunac', 'srebrenica', 'zvornik', 'sekovici',
    ])],
    // Kalinovik municipality was 4th Corps operational area throughout the war.
    // 1st Corps never deployed brigades to Kalinovik — all op:kalinovik:* OSIDs
    // are 4th Corps responsibility (443rd/444th Mountain). Without this exclusion,
    // 1st Corps BFS from Hadzici/Trnovo wins the race to golubici_2 (geographically
    // closer than Jablanica), creating an unstaffable ghost sector:arbih_1st_corps:3.
    // Confirmed by Historian: canonical 1st/4th Corps boundary excludes Kalinovik from 1st.
    ['arbih_1st_corps', new Set(['kalinovik'])],
]);

/**
 * Multi-source BFS from all corps HQ locations through friendly-controlled territory.
 * Each OSID is assigned to the nearest corps by hop count.
 * Deterministic: corps sorted by ID, neighbors sorted by strictCompare.
 */
export function mapOsidsToCorps(
    state: GameState,
    faction: FactionId,
    corpsIds: FormationId[],
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null
): Map<Osid, FormationId> {
    const result = new Map<Osid, FormationId>();

    // Pre-compute friendly OSIDs for fast membership checks.
    // Include BOTH edge-graph OSIDs and political_controllers entries so that
    // corps/brigades at deep-interior locations can seed BFS.
    const friendlyOsids = new Set<Osid>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }
    // Also add all OSIDs from political_controllers that belong to this faction.
    // These may not appear in the adjacency graph (interior OSIDs with no edges)
    // but are needed for BFS seeding from corps HQ / subordinate locations.
    const pc = state.political.political_controllers ?? {};
    for (const [osid, ctrl] of Object.entries(pc)) {
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // ── Phase 1: Lock OSIDs by brigade HOME positions ──
    // Corps territory is defined by where brigades BELONG (home_osid), not where
    // they happen to be standing. A displaced 4th Corps brigade in Visoko doesn't
    // make Visoko 4th Corps territory — Visoko belongs to 1st Corps because
    // 1st Corps brigades are FROM there.
    const osidCorpsVotes = new Map<Osid, Map<FormationId, number>>();
    const sortedBrigadeIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId || !corpsIds.includes(fCorpsId)) continue;

        // Primary seed: home_osid (where the brigade belongs)
        const homeOsid = f.home_osid;
        if (homeOsid && friendlyOsids.has(homeOsid)) {
            let votes = osidCorpsVotes.get(homeOsid);
            if (!votes) { votes = new Map(); osidCorpsVotes.set(homeOsid, votes); }
            votes.set(fCorpsId, (votes.get(fCorpsId) ?? 0) + 1);
        }
    }

    // Lock: assign each home-OSID to the majority corps
    const lockedSeeds: Array<{ corpsId: FormationId; osid: Osid }> = [];
    const sortedOccupiedOsids = [...osidCorpsVotes.keys()].sort(strictCompare);
    for (const osid of sortedOccupiedOsids) {
        const votes = osidCorpsVotes.get(osid)!;
        const sorted = [...votes.entries()].sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return strictCompare(a[0], b[0]);
        });
        const winner = sorted[0]![0];
        result.set(osid, winner);
        lockedSeeds.push({ corpsId: winner, osid });
    }

    // ── Phase 1b: Lock OSIDs by brigade CURRENT position (secondary) ──
    // Only claims unclaimed OSIDs — home-based territory always wins.
    // This handles brigades that have moved into genuinely new territory
    // (captured areas not covered by any brigade's home).
    // GUARD: Build municipality→corps map from ALL brigade home_mun fields,
    // not just locked seeds. This prevents BFS from stealing municipalities where
    // a corps has brigades homed, even if those home OSIDs are in enemy territory.
    // Key case: Herzegovina Corps has rs_foa_brigade homed in Foča, but Foča city
    // is initially RBiH-controlled. Without this, SRK's BFS from Pale reaches Foča
    // first and claims all of eastern Bosnia that should be Herzegovina/Drina.
    const homeMunCorps = new Map<string, Set<FormationId>>();
    // Phase A: from locked seeds (as before)
    for (const seed of lockedSeeds) {
        const mun = munFromOsid(seed.osid);
        if (!mun) continue;
        let corps = homeMunCorps.get(mun);
        if (!corps) { corps = new Set(); homeMunCorps.set(mun, corps); }
        corps.add(seed.corpsId);
    }
    // Phase B: from ALL brigade home_mun fields (even if home_osid is in enemy territory)
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId || !corpsIds.includes(fCorpsId)) continue;
        // Extract municipality from home_osid (even if enemy-controlled)
        const homeOsid = f.home_osid;
        if (homeOsid) {
            const homeMun = munFromOsid(homeOsid);
            if (homeMun) {
                let corps = homeMunCorps.get(homeMun);
                if (!corps) { corps = new Set(); homeMunCorps.set(homeMun, corps); }
                corps.add(fCorpsId);
            }
        }
    }
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue; // Home-based claim takes precedence
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId || !corpsIds.includes(fCorpsId)) continue;
        // Skip if another corps has home seeds in this municipality
        const locMun = munFromOsid(f.location_osid);
        if (locMun) {
            const munCorps = homeMunCorps.get(locMun);
            if (munCorps && !munCorps.has(fCorpsId)) continue;
        }
        result.set(f.location_osid, fCorpsId);
        lockedSeeds.push({ corpsId: fCorpsId, osid: f.location_osid });
    }

    // ── Phase 2: BFS gap fill from locked seeds ──
    // Fill unoccupied friendly OSIDs by expanding from home + position seeds.
    // Nearest seed determines ownership of interior territory.
    const queue: Array<{ osid: Osid; corpsId: FormationId }> = [];
    for (const seed of lockedSeeds) {
        queue.push(seed);
    }

    // Fallback: if a corps has zero locked seeds (no brigades at all), use HQ
    for (const corpsId of corpsIds) {
        if (lockedSeeds.some(s => s.corpsId === corpsId)) continue;
        const corpsFormation = formations[corpsId];
        if (corpsFormation?.location_osid && friendlyOsids.has(corpsFormation.location_osid) && !result.has(corpsFormation.location_osid)) {
            result.set(corpsFormation.location_osid, corpsId);
            queue.push({ corpsId, osid: corpsFormation.location_osid });
        } else {
            const subOsid = findSubordinateOsid(formations, corpsId, friendlyOsids);
            if (subOsid && !result.has(subOsid)) {
                result.set(subOsid, corpsId);
                queue.push({ corpsId, osid: subOsid });
            }
        }
    }

    let head = 0;
    while (head < queue.length) {
        const { osid, corpsId } = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const neighbor of neighbors) {
            if (result.has(neighbor)) continue;
            if (!friendlyOsids.has(neighbor)) continue;
            // Don't expand into municipalities where ANOTHER corps has home seeds.
            // Prevents BFS race from stealing territory: e.g. 1st Corps BFS from
            // Olovo reaching Kladanj before 2nd Corps, when 2nd Corps brigades are
            // FROM Kladanj. Same guard as Phase 1b location seeds.
            const neighborMun = munFromOsid(neighbor);
            if (neighborMun) {
                const munCorps = homeMunCorps.get(neighborMun);
                if (munCorps && !munCorps.has(corpsId)) continue;
                // Corps-specific municipality exclusions (e.g. SRK excluded from Gorazde)
                const excluded = CORPS_EXCLUDED_MUNICIPALITIES.get(corpsId);
                if (excluded?.has(neighborMun)) continue;
            }
            result.set(neighbor, corpsId);
            queue.push({ osid: neighbor, corpsId });
        }
    }

    // Post-BFS: claim disconnected friendly OSIDs where corps brigades are located.
    // Handles pockets/enclaves not reachable through contiguous friendly territory.
    for (const fid of sortedBrigadeIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!f.location_osid || !fCorpsId) continue;
        if (!friendlyOsids.has(f.location_osid)) continue;
        if (result.has(f.location_osid)) continue;
        if (!corpsIds.includes(fCorpsId)) continue;
        result.set(f.location_osid, fCorpsId);
        const pocketQueue: Osid[] = [f.location_osid];
        let pHead = 0;
        while (pHead < pocketQueue.length) {
            const po = pocketQueue[pHead++]!;
            const pNeighbors = adjacency.get(po) ?? [];
            for (const pn of pNeighbors) {
                if (result.has(pn)) continue;
                if (!friendlyOsids.has(pn)) continue;
                result.set(pn, fCorpsId);
                pocketQueue.push(pn);
            }
        }
    }

    return result;
}

/**
 * Find the first subordinate brigade OSID for a corps (fallback when corps HQ has no OSID).
 */
export function findSubordinateOsid(
    formations: Record<FormationId, FormationState>,
    corpsId: FormationId,
    friendlyOsids: Set<Osid>
): Osid | null {
    const sortedIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f || getFormationCorpsId(f) !== corpsId) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.status !== 'active' || !f.location_osid) continue;
        if (friendlyOsids.has(f.location_osid)) return f.location_osid;
    }
    return null;
}

/**
 * Multi-source BFS from each sector's front-edge friendly_osids backward
 * through friendly territory. Each friendly OSID is assigned to the nearest
 * sector (by hop count). First-claim wins; sectors processed in sorted order.
 *
 * Corps boundaries are respected: each sector's BFS can only claim OSIDs
 * that mapOsidsToCorps assigned to the same corps (or unclaimed OSIDs).
 *
 * Sets each sector's `territory_osids` to the sorted list of claimed OSIDs.
 * Deterministic: sorted sector order, sorted neighbor iteration.
 */
export function assignTerritoryVoronoi(
    sectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    osidToCorps?: Map<Osid, FormationId>
): void {
    if (sectors.length === 0) return;

    // Track which sectors each OSID belongs to.
    // Front-edge OSIDs can be shared across multiple sectors (a settlement
    // at the junction of two front lines supports both). Rear territory
    // uses exclusive first-claim via BFS.
    const claimed = new Map<string, number>();          // BFS exclusive claim
    const sharedClaims = new Map<string, number[]>();   // front-edge multi-claim

    // Collect front-edge OSIDs for each sector. An OSID that appears on
    // multiple sectors' front edges belongs to ALL of them.
    const sortedIndices = sectors.map((_, i) => i);
    sortedIndices.sort((a, b) => strictCompare(sectors[a]!.sector_id, sectors[b]!.sector_id));

    for (const si of sortedIndices) {
        const sector = sectors[si]!;
        const seedOsids = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) seedOsids.add(o);
        }
        for (const osid of [...seedOsids].sort(strictCompare)) {
            if (!friendlyOsids.has(osid)) continue;
            const existing = sharedClaims.get(osid);
            if (existing) {
                existing.push(si);
            } else {
                sharedClaims.set(osid, [si]);
            }
        }
    }

    // Seed BFS from all front-edge OSIDs. Each OSID's BFS expansion
    // is driven by its FIRST claiming sector (exclusive for rear territory).
    type BfsEntry = { osid: string; sectorIdx: number };
    const queue: BfsEntry[] = [];
    for (const [osid, sectorIndices] of [...sharedClaims.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        // First sector index drives BFS expansion into rear territory
        claimed.set(osid, sectorIndices[0]!);
        queue.push({ osid, sectorIdx: sectorIndices[0]! });
    }

    // Multi-source BFS through friendly territory.
    // Corps boundary enforcement: each sector can only claim OSIDs that
    // mapOsidsToCorps assigned to its corps (or OSIDs not in the map at all).
    // No territory cap — every friendly OSID must belong to a sector.
    let head = 0;
    while (head < queue.length) {
        const { osid, sectorIdx } = queue[head++]!;
        const sectorCorps = sectors[sectorIdx]!.corps_id;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (claimed.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            // Respect corps boundaries: don't claim OSIDs owned by another corps
            if (osidToCorps) {
                const ownerCorps = osidToCorps.get(n as Osid);
                if (ownerCorps && ownerCorps !== sectorCorps) continue;
            }
            // No territory cap — every friendly OSID must belong to a sector.
            // GOLDEN RULE: Every brigade must be in a sector. To achieve this,
            // every friendly OSID must be claimed so brigade classification never
            // falls through.
            claimed.set(n, sectorIdx);
            queue.push({ osid: n, sectorIdx });
        }
    }

    // Post-Voronoi sweep: claim any unclaimed friendly OSIDs that BFS missed.
    // These are interior OSIDs not reachable from front edges because all paths
    // to them went through territory belonging to a different corps.
    //
    // IMPORTANT: this sweep must not launder an orphaned OSID into a different
    // corps simply because that corps already has the nearest claimed territory.
    // If a truthful owner corps exists in osidToCorps, only same-corps sectors
    // may claim it here. Otherwise the OSID must stay unclaimed and surface as
    // unresolved rather than silently contaminating another corps's territory.
    const unclaimed: string[] = [];
    for (const osid of friendlyOsids) {
        if (!claimed.has(osid)) unclaimed.push(osid);
    }
    if (unclaimed.length > 0) {
        // Build reverse lookup: claimed OSID → sector index (already in `claimed`)
        // BFS from each unclaimed OSID to find nearest claimed OSID
        unclaimed.sort(strictCompare);
        for (const orphan of unclaimed) {
            const ownerCorps = osidToCorps?.get(orphan as Osid) ?? null;
            const visited = new Set<string>([orphan]);
            let frontier = [orphan];
            let found = false;
            for (let hop = 0; hop < 20 && !found; hop++) {
                const next: string[] = [];
                for (const curr of frontier) {
                    const neighbors = adjacency.get(curr as Osid) ?? [];
                    for (const n of neighbors) {
                        if (visited.has(n)) continue;
                        visited.add(n);
                        if (claimed.has(n)) {
                            // Assign orphan to the same sector as this neighbor
                            const sIdx = claimed.get(n)!;
                            if (ownerCorps && sectors[sIdx]!.corps_id !== ownerCorps) continue;
                            // No territory cap — claim orphan unconditionally.
                            claimed.set(orphan, sIdx);
                            found = true;
                            break;
                        }
                        if (friendlyOsids.has(n)) next.push(n);
                    }
                    if (found) break;
                }
                frontier = next;
            }
        }
    }

    // Assign territory_osids to each sector.
    // Front-edge OSIDs that appear in multiple sectors are included in ALL
    // of those sectors' territory (shared front-edge territory). Rear OSIDs
    // from the exclusive BFS go to their single claiming sector.
    const perSector: Set<string>[] = sectors.map(() => new Set<string>());
    // 1. BFS-claimed (exclusive rear territory)
    for (const [osid, sectorIdx] of claimed) {
        perSector[sectorIdx]!.add(osid);
    }
    // 2. Shared front-edge OSIDs → exclusive ownership to primary sector
    // When multiple sectors claim the same front-edge OSID (split children),
    // assign exclusively to the sector with the most front edges (length_edges).
    // Tiebreaker: lower sector_id in strictCompare order for determinism.
    for (const [osid, sectorIndices] of sharedClaims) {
        if (sectorIndices.length === 1) {
            perSector[sectorIndices[0]!]!.add(osid);
            continue;
        }
        let winnerId = sectorIndices[0]!;
        for (let k = 1; k < sectorIndices.length; k++) {
            const si = sectorIndices[k]!;
            const candidateEdges = sectors[si]!.length_edges;
            const winnerEdges = sectors[winnerId]!.length_edges;
            if (
                candidateEdges > winnerEdges ||
                (candidateEdges === winnerEdges &&
                    strictCompare(sectors[si]!.sector_id, sectors[winnerId]!.sector_id) < 0)
            ) {
                winnerId = si;
            }
        }
        perSector[winnerId]!.add(osid);
    }
    for (let i = 0; i < sectors.length; i++) {
        sectors[i]!.territory_osids = [...perSector[i]!].sort(strictCompare);
    }
}

/**
 * Verify and repair territory contiguity for all sectors.
 *
 * After territory assignment (Voronoi BFS or merge), a sector's territory_osids
 * can become disconnected — e.g. when front edges are separated and BFS claims
 * OSIDs on both sides, or when mergeSmallAdjacentSectors unions non-contiguous
 * territory sets.
 *
 * For each sector:
 *   1. BFS through territory_osids using the OSID adjacency graph (filtered to
 *      friendly OSIDs) to find connected components.
 *   2. Keep the largest component in the original sector.
 *   3. Orphaned components are reassigned to the nearest adjacent sector (by
 *      OSID adjacency between the orphan and another sector's territory).
 *   4. If no adjacent sector exists, orphaned OSIDs are dropped (picked up by
 *      ensureMinimumSectorCoverage or post-Voronoi sweep on subsequent turns).
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */
export function repairDisconnectedTerritory(
    sectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): void {
    if (sectors.length === 0) return;

    // Build a reverse index: OSID → sector indices that claim it as territory.
    // (Needed to find adjacent sectors for orphan reassignment.)
    const rebuildTerritoryIndex = (): Map<string, number[]> => {
        const idx = new Map<string, number[]>();
        for (let si = 0; si < sectors.length; si++) {
            for (const osid of sectors[si]!.territory_osids) {
                let list = idx.get(osid);
                if (!list) { list = []; idx.set(osid, list); }
                list.push(si);
            }
        }
        return idx;
    };

    let territoryIndex = rebuildTerritoryIndex();
    let anyRepair = false;

    for (let si = 0; si < sectors.length; si++) {
        const sector = sectors[si]!;
        if (sector.territory_osids.length <= 1) continue;

        // BFS connected components through this sector's territory using OSID adjacency,
        // restricted to OSIDs that are both in this sector's territory AND friendly.
        const territorySet = new Set(sector.territory_osids);
        const components = findConnectedComponents(
            territorySet,
            (osid) => (adjacency.get(osid as Osid) ?? []).filter(
                n => territorySet.has(n) && friendlyOsids.has(n)
            ),
        );

        if (components.length <= 1) continue;

        // Find the largest component (ties broken by first OSID in sort order for determinism).
        let largestIdx = 0;
        for (let ci = 1; ci < components.length; ci++) {
            if (components[ci]!.size > components[largestIdx]!.size) {
                largestIdx = ci;
            } else if (components[ci]!.size === components[largestIdx]!.size) {
                const minA = [...components[largestIdx]!].sort(strictCompare)[0]!;
                const minB = [...components[ci]!].sort(strictCompare)[0]!;
                if (strictCompare(minB, minA) < 0) largestIdx = ci;
            }
        }

        // Keep the largest component in this sector.
        const kept = components[largestIdx]!;
        sector.territory_osids = [...kept].sort(strictCompare);
        anyRepair = true;

            // Reassign orphaned components to adjacent sectors.
            // Never hand a disconnected orphan to another corps here; if the
            // original corps cannot retain it contiguously, surfacing the gap
            // is more truthful than laundering the territory across corps lines.
            for (let ci = 0; ci < components.length; ci++) {
                if (ci === largestIdx) continue;
                const orphan = components[ci]!;
                const orphanOsids = [...orphan].sort(strictCompare);

            // Find the best adjacent sector for this orphan component.
            // "Adjacent" = any OSID in the orphan has an adjacency neighbor that
            // belongs to another sector's territory.
            let bestSectorIdx = -1;
            let bestSectorSize = -1;
            for (const osid of orphanOsids) {
                    const neighbors = adjacency.get(osid as Osid) ?? [];
                    for (const n of neighbors) {
                        if (orphan.has(n)) continue; // same orphan component
                        const claimingSectors = territoryIndex.get(n);
                        if (!claimingSectors) continue;
                        for (const candidateSi of claimingSectors) {
                            if (candidateSi === si) continue; // skip the sector we just split from
                            if (sectors[candidateSi]!.corps_id !== sector.corps_id) continue;
                            // Prefer the sector with the most territory (stable reassignment).
                            const candidateSize = sectors[candidateSi]!.territory_osids.length;
                            if (candidateSize > bestSectorSize ||
                            (candidateSize === bestSectorSize && bestSectorIdx >= 0 &&
                                strictCompare(sectors[candidateSi]!.sector_id, sectors[bestSectorIdx]!.sector_id) < 0)) {
                            bestSectorSize = candidateSize;
                            bestSectorIdx = candidateSi;
                        }
                    }
                }
            }

            if (bestSectorIdx >= 0) {
                // Add orphan OSIDs to the best adjacent sector.
                const target = sectors[bestSectorIdx]!;
                const targetSet = new Set(target.territory_osids);
                for (const osid of orphanOsids) targetSet.add(osid);
                target.territory_osids = [...targetSet].sort(strictCompare);
            }
            // If no adjacent sector found, orphan OSIDs are simply dropped.
            // They'll be picked up by ensureMinimumSectorCoverage or re-claimed
            // on subsequent turns.
        }

        // Rebuild the index after modifications.
        territoryIndex = rebuildTerritoryIndex();
    }

    // No explicit logging — callers can compare territory counts before/after
    // if diagnostics are needed.
}

/**
 * Assign each hostile-boundary front edge to the corps that owns its friendly-side OSID.
 * When an edge is on an OSID not reachable by the main BFS (disconnected pockets/islands),
 * BFS outward through OSID adjacency to find the nearest already-claimed OSID and inherit
 * its corps. This correctly assigns Bihać, Srebrenica, etc. to the geographically nearest
 * corps rather than the alphabetically-first one.
 */
export function partitionFrontEdges(
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    osidToCorps: Map<Osid, FormationId>,
    state: GameState,
    reverseMap: Map<string, string[]> | null,
    corpsIds: FormationId[],
    adjacency: Map<Osid, Osid[]>
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();

    // Sort front edges for deterministic processing
    const sorted = [...osidFrontEdges]
        .filter(e => e.side_a === faction || e.side_b === faction)
        .sort((a, b) => strictCompare(a.edge_id, b.edge_id));

    for (const edge of sorted) {
        // Identify the friendly-side OSID
        const friendlyOsid = edge.side_a === faction ? edge.a : edge.b;
        let corpsId = osidToCorps.get(friendlyOsid);

        // Edge on unclaimed or disconnected OSID (pocket/island). BFS outward through
        // OSID adjacency (ignoring control, any territory) to find nearest claimed OSID.
        if (!corpsId) {
            corpsId = bfsNearestClaimedCorps(friendlyOsid, osidToCorps, adjacency) ?? corpsIds[0];
            if (!corpsId) continue; // Only if faction has NO corps at all
        }

        let list = result.get(corpsId);
        if (!list) { list = []; result.set(corpsId, list); }
        list.push(edge.edge_id);
    }

    return result;
}

/**
 * BFS from startOsid through all OSID adjacency (ignoring political control) to find
 * the nearest OSID that is already assigned to a corps in osidToCorps.
 * Returns that corps ID, or null if none reachable.
 * Deterministic: adjacency lists must be sorted (buildOsidAdjacency guarantees this).
 */
export function bfsNearestClaimedCorps(
    startOsid: Osid,
    osidToCorps: Map<Osid, FormationId>,
    adjacency: Map<Osid, Osid[]>
): FormationId | null {
    const queue: Osid[] = [startOsid];
    const visited = new Set<Osid>([startOsid]);
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++]!;
        const neighbors = adjacency.get(cur) ?? [];
        for (const nb of neighbors) {
            if (visited.has(nb)) continue;
            visited.add(nb);
            const cId = osidToCorps.get(nb);
            if (cId) return cId;
            queue.push(nb);
        }
    }
    return null;
}

/** Is this edge protected from corps reassignment by brigade presence or BFS territory mapping? */
export function isEdgeProtectedFromReassignment(
    eid: string,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    osidBrigadeCorps: Map<string, Set<FormationId>>,
    osidToCorps: Map<Osid, FormationId>,
): boolean {
    const meta = edgeMeta.get(eid);
    if (!meta) return false;
    const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
    // Brigade presence protects
    const brigCorps = osidBrigadeCorps.get(friendlyOsid);
    if (brigCorps && brigCorps.has(corpsId)) return true;
    // BFS home-seed mapping is authoritative — consolidation shouldn't override it.
    const mappedCorps = osidToCorps.get(friendlyOsid as Osid);
    if (mappedCorps === corpsId) return true;
    return false;
}

/**
 * After partitioning front edges to corps via BFS Voronoi, contiguous fronts
 * can be split across multiple corps at the boundary. This detects connected
 * components of edges (via friendly-OSID adjacency, ignoring corps assignment)
 * and reassigns minority edges to the majority corps in each component.
 *
 * Mutates corpsEdges in place.
 */
export function consolidateCrossCorpsFronts(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    osidToCorps: Map<Osid, FormationId>,
    centroids?: OsidCentroidMap,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): void {
    // Collect all edge_ids across all corps for this faction
    const allEdgeIds: string[] = [];
    for (const edges of corpsEdges.values()) {
        allEdgeIds.push(...edges);
    }
    if (allEdgeIds.length === 0) return;

    // Build edge metadata lookup
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
    }

    // Build edge-to-corps reverse lookup
    const edgeToCorps = new Map<string, FormationId>();
    for (const [corpsId, edges] of corpsEdges) {
        for (const eid of edges) {
            edgeToCorps.set(eid, corpsId);
        }
    }

    // Build adjacency across ALL faction edges (ignoring corps boundaries).
    // Includes friendly-OSID, OSID-neighbor, same-hostile-OSID, and hostile-
    // OSID-neighbor adjacency — so connected components faithfully represent
    // contiguous front segments.
    const edgeAdj = buildEdgeAdjacency(allEdgeIds, edgeMeta, faction, adjacency, sharedBoundaryAdj, centroids);

    // Build brigade-presence lookup once: OSID → set of corps with brigades
    // stationed there. Edges where a brigade of the current corps is stationed
    // are protected from consolidation (brigade presence defines the corps
    // boundary — not edge-count majority).
    const osidBrigadeCorps = new Map<string, Set<FormationId>>();
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        const fCorpsId = getFormationCorpsId(f);
        if (!fCorpsId) continue;
        let set = osidBrigadeCorps.get(f.location_osid);
        if (!set) { set = new Set(); osidBrigadeCorps.set(f.location_osid, set); }
        set.add(fCorpsId);
    }

    // Find connected components via BFS
    const visited = new Set<string>();
    const sortedAll = [...allEdgeIds].sort(strictCompare);

    for (const seed of sortedAll) {
        if (visited.has(seed)) continue;

        // BFS to find connected component
        const component: string[] = [];
        const queue = [seed];
        visited.add(seed);
        while (queue.length > 0) {
            const eid = queue.shift()!;
            component.push(eid);
            for (const next of edgeAdj.get(eid) ?? []) {
                if (visited.has(next)) continue;
                visited.add(next);
                queue.push(next);
            }
        }

        // Count edges per corps in this component
        const corpsCounts = new Map<FormationId, number>();
        for (const eid of component) {
            const c = edgeToCorps.get(eid);
            if (c) corpsCounts.set(c, (corpsCounts.get(c) ?? 0) + 1);
        }
        if (corpsCounts.size <= 1) continue; // No split — single corps owns all

        // Find majority corps (deterministic: highest count, then lexicographic tiebreak)
        let majorityCorps: FormationId | null = null;
        let majorityCount = 0;
        for (const [cid, count] of [...corpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (count > majorityCount || (count === majorityCount && majorityCorps !== null && strictCompare(cid, majorityCorps) < 0)) {
                majorityCorps = cid;
                majorityCount = count;
            }
        }
        if (!majorityCorps) continue;

        // Identify which minority corps can safely lose their edges in this
        // component. Protect a corps if:
        // (a) losing this component's edges would leave it with zero (sector-less), OR
        // (b) the corps has brigades stationed at ANY edge in this component
        //     (brigade presence = corps has a physical claim, not just BFS territory).
        // Without (b), isolated enclave corps (e.g. hvo_central_bosnia with brigades
        // at Kiseljak) get drained edge-by-edge across multiple components until they
        // have zero sectors despite having active brigades at the front.
        const protectedCorps = new Set<FormationId>();
        for (const [cid, countInComponent] of corpsCounts) {
            if (cid === majorityCorps) continue;
            // (a) Zero-edge protection
            const remainingForCorps = corpsEdges.get(cid)?.length ?? 0;
            if (remainingForCorps <= countInComponent) {
                protectedCorps.add(cid);
                continue;
            }
            // (b) Brigade-presence protection: if ANY edge in this component
            // has a brigade of this corps stationed at its friendly OSID,
            // protect the entire corps in this component.
            for (const eid of component) {
                if (edgeToCorps.get(eid) !== cid) continue;
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                const brigCorps = osidBrigadeCorps.get(friendlyOsid);
                if (brigCorps && brigCorps.has(cid)) {
                    protectedCorps.add(cid);
                    break;
                }
            }
        }

        // Reassign minority edges to the majority corps
        for (const eid of component) {
            const currentCorps = edgeToCorps.get(eid);
            if (!currentCorps || currentCorps === majorityCorps) continue;
            if (protectedCorps.has(currentCorps)) continue;

            if (isEdgeProtectedFromReassignment(eid, currentCorps, edgeMeta, faction, osidBrigadeCorps, osidToCorps)) continue;

            // Remove from current corps
            const currentList = corpsEdges.get(currentCorps);
            if (currentList) {
                const idx = currentList.indexOf(eid);
                if (idx >= 0) currentList.splice(idx, 1);
            }

            // Add to majority corps
            let majorityList = corpsEdges.get(majorityCorps);
            if (!majorityList) {
                majorityList = [];
                corpsEdges.set(majorityCorps, majorityList);
            }
            majorityList.push(eid);
            edgeToCorps.set(eid, majorityCorps);
        }
    }

    // ── Hostile-OSID coherence pass ──
    // When edges from multiple corps face the SAME hostile OSID, consolidate
    // minority-corps edges to the majority corps. This prevents settlements
    // from being split between corps (e.g. Bijela with edges from both 1st
    // and 4th Corps). Brigade presence still protects.
    const hostileOsidToCorpsCounts = new Map<string, Map<FormationId, string[]>>();
    for (const edge of osidFrontEdges) {
        if (edge.side_a !== faction && edge.side_b !== faction) continue;
        const corps = edgeToCorps.get(edge.edge_id);
        if (!corps) continue;
        const hostileOsid = edge.side_a === faction ? edge.b : edge.a;
        let corpMap = hostileOsidToCorpsCounts.get(hostileOsid);
        if (!corpMap) { corpMap = new Map(); hostileOsidToCorpsCounts.set(hostileOsid, corpMap); }
        let list = corpMap.get(corps);
        if (!list) { list = []; corpMap.set(corps, list); }
        list.push(edge.edge_id);
    }

    for (const [_hostileOsid, corpMap] of [...hostileOsidToCorpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        if (corpMap.size <= 1) continue; // single corps — no conflict

        // Find majority corps for this hostile OSID
        let majCorps: FormationId | null = null;
        let majCount = 0;
        for (const [cid, eids] of [...corpMap.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (eids.length > majCount || (eids.length === majCount && majCorps !== null && strictCompare(cid, majCorps) < 0)) {
                majCorps = cid;
                majCount = eids.length;
            }
        }
        if (!majCorps) continue;

        // Reassign minority-corps edges (respect brigade presence)
        for (const [cid, eids] of corpMap) {
            if (cid === majCorps) continue;
            for (const eid of eids) {
                if (isEdgeProtectedFromReassignment(eid, cid, edgeMeta, faction, osidBrigadeCorps, osidToCorps)) continue;
                // Reassign
                const fromList = corpsEdges.get(cid);
                if (fromList) {
                    const idx = fromList.indexOf(eid);
                    if (idx >= 0) fromList.splice(idx, 1);
                }
                let toList = corpsEdges.get(majCorps);
                if (!toList) { toList = []; corpsEdges.set(majCorps, toList); }
                toList.push(eid);
                edgeToCorps.set(eid, majCorps);
            }
        }
    }
}

/**
 * After cross-corps consolidation, a corps may still have disconnected edge
 * components (protected by brigade presence in 3b). This pass overrides that
 * protection for isolated pockets: if a corps's edges form multiple connected
 * components, the smaller components are reassigned to whichever corps
 * dominates the neighboring area.
 *
 * "Isolated" = a connected component of a corps's edges that is NOT part of
 * the corps's largest connected component.
 */
export function consolidateIsolatedCorpsPockets(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    centroids?: OsidCentroidMap,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): void {
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    // Reverse index: friendly OSID → front edge IDs touching it
    const osidToFrontEdgeIds = new Map<Osid, string[]>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
        const friendlyOsid = e.side_a === faction ? e.a : e.side_b === faction ? e.b : null;
        if (friendlyOsid) {
            let list = osidToFrontEdgeIds.get(friendlyOsid);
            if (!list) { list = []; osidToFrontEdgeIds.set(friendlyOsid, list); }
            list.push(e.edge_id);
        }
    }

    // Build reverse lookup: edge → corps
    const edgeToCorps = new Map<string, FormationId>();
    for (const [corpsId, edges] of corpsEdges) {
        for (const eid of edges) edgeToCorps.set(eid, corpsId);
    }

    // Process each corps: find connected components of its edges
    for (const corpsId of [...corpsEdges.keys()].sort(strictCompare)) {
        const edges = corpsEdges.get(corpsId);
        if (!edges || edges.length <= 1) continue;

        // Build edge adjacency for this corps's edges only (friendly-side)
        const edgeAdj = buildEdgeAdjacency(edges, edgeMeta, faction, adjacency, sharedBoundaryAdj, centroids);

        // Find connected components
        const components = findConnectedComponents(
            new Set(edges),
            (eid) => edgeAdj.get(eid) ?? [],
        );
        if (components.length <= 1) continue; // Single component — no isolation

        // Find the largest component (the corps's "main body")
        let largestIdx = 0;
        for (let i = 1; i < components.length; i++) {
            if (components[i]!.size > components[largestIdx]!.size) largestIdx = i;
        }

        // Reassign all non-largest components to neighboring corps
        for (let ci = 0; ci < components.length; ci++) {
            if (ci === largestIdx) continue;
            const isolatedEdges = [...components[ci]!];

            // GOLDEN RULE: If a home brigade is present in the pocket, protect it.
            let homeBrigadePresent = false;
            for (const eid of isolatedEdges) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                for (const f of Object.values(formations)) {
                    if (f.faction === faction && f.location_osid === friendlyOsid && getFormationCorpsId(f) === corpsId) {
                        homeBrigadePresent = true;
                        break;
                    }
                }
                if (homeBrigadePresent) break;
            }
            if (homeBrigadePresent) continue;

            // Find the best neighboring corps by counting adjacent edges from other corps.

            // Use osidToFrontEdgeIds reverse index instead of scanning all front edges.
            const neighborCorpsCounts = new Map<FormationId, number>();
            for (const eid of isolatedEdges) {
                const meta = edgeMeta.get(eid);
                if (!meta) continue;
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                // Check OSID neighbors for edges belonging to other corps
                const osidsToCheck = [friendlyOsid, ...(adjacency.get(friendlyOsid) ?? [])];
                for (const checkOsid of osidsToCheck) {
                    for (const candidateEid of osidToFrontEdgeIds.get(checkOsid) ?? []) {
                        const candidateCorps = edgeToCorps.get(candidateEid);
                        if (!candidateCorps || candidateCorps === corpsId) continue;
                        neighborCorpsCounts.set(candidateCorps, (neighborCorpsCounts.get(candidateCorps) ?? 0) + 1);
                    }
                }
            }

            // Pick the neighbor corps with the most adjacent edges (deterministic tiebreak)
            let bestNeighbor: FormationId | null = null;
            let bestCount = 0;
            for (const [nCorps, count] of [...neighborCorpsCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
                if (count > bestCount || (count === bestCount && bestNeighbor !== null && strictCompare(nCorps, bestNeighbor) < 0)) {
                    bestNeighbor = nCorps;
                    bestCount = count;
                }
            }
            if (!bestNeighbor) continue; // No neighbor found — keep as-is (true enclave)

            // Reassign edges from isolated pocket to neighbor corps
            for (const eid of isolatedEdges) {
                const currentList = corpsEdges.get(corpsId);
                if (currentList) {
                    const idx = currentList.indexOf(eid);
                    if (idx >= 0) currentList.splice(idx, 1);
                }
                let targetList = corpsEdges.get(bestNeighbor);
                if (!targetList) { targetList = []; corpsEdges.set(bestNeighbor, targetList); }
                targetList.push(eid);
                edgeToCorps.set(eid, bestNeighbor);
            }
        }
    }
}
