/**
 * Corps Front Sectors: partitions the hostile boundary into per-corps sectors.
 *
 * Each corps owns a contiguous slice of the OSID-level hostile boundary in its
 * area of responsibility. Multi-source BFS from corps HQ locations assigns each
 * friendly OSID to the nearest corps; front edges are then partitioned accordingly.
 *
 * GOLDEN RULES:
 *   1. Every active brigade MUST be assigned to a sector. No exceptions.
 *   2. Brigades at a sector MUST be at the frontline. Exception: one reserve
 *      brigade per sector sits 1 hop behind the front (recovery/reaction).
 *      Deep-rear brigades are kept assigned and march forward via interior movement.
 *
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { computeLocalFrontDefensivePower } from './local_front_defense.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from './osid_adjacency.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import {
    EXEMPT_CORPS_IDS,
    MAX_SECTOR_BRIGADES,
    MAX_SECTOR_EDGES,
    MIN_SECTOR_EDGES,
} from './corps_front_sectors_constants.js';

/** Extract municipality from OSID format "op:municipality:slug". */
function munFromOsid(osid: string): string | undefined {
    return osid.split(':')[1];
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build corps front sectors for all factions.
 * Requires operational edges and OSID front edges to be available.
 *
 * @param state - Current game state (must have war_front_edges_osid populated)
 * @param edges - Operational contact graph edges (for OSID adjacency)
 * @param reverseMap - operationalToCanonical map for getPoliticalControllerOSID
 */
export function buildCorpsFrontSectors(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null
): Record<string, CorpsFrontSector> {
    const osidFrontEdges = state.military.war_front_edges_osid;
    if (!osidFrontEdges || osidFrontEdges.length === 0) return {};
    if (!edges || edges.length === 0) return {};

    const adjacency = buildOsidAdjacency(edges);
    const sharedBoundaryAdj = buildSharedBoundaryAdjacency(edges);
    const formations = state.military.formations ?? {};
    const factions = getFactions(state);
    const result: Record<string, CorpsFrontSector> = {};

    for (const faction of factions) {
        const factionSectors = buildFactionSectors(
            state, faction, osidFrontEdges, adjacency, sharedBoundaryAdj, formations, reverseMap
        );
        for (const sector of factionSectors) {
            result[sector.sector_id] = sector;
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Faction Sector Building
// Pipeline steps: 1) mapOsidsToCorps (BFS), 2) partitionFrontEdges,
// 3) consolidateCrossCorpsFronts, 4) buildMultiSectorsForCorps, 5) assignTerritoryVoronoi,
// 6) classifyBrigades (frontline by position + corps distributes rest by need),
// 7) ensureMinimumSectorCoverage, 8) reclassifyRearBrigades, 9) prune empty sectors.
// ═══════════════════════════════════════════════════════════════════════════

function buildFactionSectors(
    state: GameState,
    faction: FactionId,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null
): CorpsFrontSector[] {
    // Step 1: Find corps for this faction
    const corpsIds = getCorpsForFaction(formations, faction);
    if (corpsIds.length === 0) return [];

    // Step 2: Map OSIDs to corps via multi-source BFS
    const osidToCorps = mapOsidsToCorps(
        state, faction, corpsIds, adjacency, formations, reverseMap
    );

    // Step 3: Partition front edges to corps
    const corpsEdges = partitionFrontEdges(
        osidFrontEdges, faction, osidToCorps, state, reverseMap, corpsIds, adjacency
    );
    // Step 3b: Consolidate cross-corps front splits.
    // When a contiguous front (connected component of edges via friendly-OSID
    // adjacency) is split across multiple corps by the BFS Voronoi boundary,
    // reassign the minority edges to the majority corps. Prevents pockets and
    // border settlements from being split between distant corps.
    // Brigade-locked edges (where a brigade of that corps is stationed) are protected.
    consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency, formations);
    // Step 3c: Consolidate isolated corps pockets.
    // After 3b, a corps may still have disconnected edge components (isolated
    // pockets protected by brigade presence). Reassign isolated pocket edges to
    // the neighboring majority corps — a single brigade shouldn't keep an
    // isolated pocket as a separate corps sector when surrounded by another corps.
    consolidateIsolatedCorpsPockets(corpsEdges, osidFrontEdges, faction, adjacency);

    // Pre-compute friendly OSIDs once for territory, brigade assignment, and contiguity checks.
    const friendlyOsids = new Set<string>();
    for (const osid of adjacency.keys()) {
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap ?? undefined);
        if (ctrl === faction) friendlyOsids.add(osid);
    }
    // Also include political_controllers entries not in adjacency graph (interior OSIDs).
    const pc = state.political.political_controllers ?? {};
    for (const [osid, ctrl] of Object.entries(pc)) {
        if (ctrl === faction) friendlyOsids.add(osid);
    }

    // Step 4: Build multi-sectors (sub-segments promoted to independent sectors)
    // Skip exempt corps entirely — they have no front and shouldn't produce sectors.
    const sectors: CorpsFrontSector[] = [];
    for (const corpsId of corpsIds) {
        if (EXEMPT_CORPS_IDS.has(corpsId)) continue;
        const edgeIds = corpsEdges.get(corpsId);
        if (!edgeIds || edgeIds.length === 0) continue;

        const corpsMultiSectors = buildMultiSectorsForCorps(
            state, corpsId, faction, edgeIds, osidFrontEdges,
            adjacency, sharedBoundaryAdj, formations, reverseMap, friendlyOsids
        );
        for (const sector of corpsMultiSectors) {
            sectors.push(sector);
        }
    }

    // Step 5: Territory Voronoi — BFS from each sector's front-edge OSIDs
    // backward through friendly territory. Each friendly OSID is assigned to
    // the nearest sector (by hop count). Corps boundaries are respected:
    // each sector's BFS can only claim OSIDs assigned to its corps.
    assignTerritoryVoronoi(sectors, adjacency, friendlyOsids, osidToCorps);

    // Pre-compute friendly territory connected components (used by steps 6 and 7).
    const componentOf = buildFriendlyComponents(adjacency, friendlyOsids);

    // Step 6: Classify brigades — corps-driven assignment.
    // Phase 1: Frontline brigades assigned by position (you defend where you stand).
    // Phase 2: Corps pools remaining brigades, distributes to sectors by need
    //          (proportional to front edge count). No BFS proximity — corps decides.
    // General staff units are exempt.
    classifyBrigadesByTerritory(sectors, faction, formations, adjacency, friendlyOsids, componentOf);

    // Step 7: Ensure every sector with front edges has at least one assigned brigade.
    // Transfer from adjacent surplus sectors only (geographic contiguity enforced).
    ensureMinimumSectorCoverage(sectors, formations, adjacency, friendlyOsids, componentOf);

    // Step 8: Reclassify brigades by frontline proximity.
    // Front → assigned, 1-hop → reserve (cap 1), deeper → stays assigned (marches forward).
    // GOLDEN RULE: no brigade is ever dropped from its sector.
    reclassifyRearBrigades(sectors, formations, adjacency, friendlyOsids);

    // Step 8b: Deduplicate — steps 6b/7/8 can produce cross-sector duplicates
    // when shared front OSIDs or coverage transfers create overlapping claims.
    deduplicateBrigadesAcrossSectors(sectors);

    // Final prune: remove sectors that are ghost artifacts:
    //  - 0 front edges (no enemy contact)
    //  - 0 territory AND 0 assigned/reserve brigades (isolated pocket with nobody home)
    const pruned = sectors.filter(s => {
        if (s.length_edges === 0) return false;
        if (s.territory_osids.length === 0
            && s.assigned_brigade_ids.length === 0
            && s.reserve_brigade_ids.length === 0) return false;
        return true;
    });
    pruned.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    return pruned;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 5: Territory Voronoi — BFS from Front Edges into Depth
// ═══════════════════════════════════════════════════════════════════════════

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
function assignTerritoryVoronoi(
    sectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    osidToCorps?: Map<Osid, FormationId>
): void {
    if (sectors.length === 0) return;

    // Map from OSID → sector index (first-claim wins)
    const claimed = new Map<string, number>();

    // Collect seeds: each sector's front-edge friendly OSIDs
    type BfsEntry = { osid: string; sectorIdx: number };
    const queue: BfsEntry[] = [];

    // Sort sectors deterministically for seed order
    const sortedIndices = sectors.map((_, i) => i);
    sortedIndices.sort((a, b) => strictCompare(sectors[a]!.sector_id, sectors[b]!.sector_id));

    for (const si of sortedIndices) {
        const sector = sectors[si]!;
        // Seed from all friendly_osids across sub-segments (front-edge OSIDs)
        const seedOsids = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) seedOsids.add(o);
        }
        const sortedSeeds = [...seedOsids].sort(strictCompare);
        for (const osid of sortedSeeds) {
            if (claimed.has(osid)) continue; // Another sector already claimed it
            if (!friendlyOsids.has(osid)) continue;
            claimed.set(osid, si);
            queue.push({ osid, sectorIdx: si });
        }
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
    // to them went through territory belonging to a different corps. Assign them
    // to the nearest sector (by hop count through friendly territory, ignoring
    // corps boundaries) so they get sector-pooled defense.
    const unclaimed: string[] = [];
    for (const osid of friendlyOsids) {
        if (!claimed.has(osid)) unclaimed.push(osid);
    }
    if (unclaimed.length > 0) {
        // Build reverse lookup: claimed OSID → sector index (already in `claimed`)
        // BFS from each unclaimed OSID to find nearest claimed OSID
        unclaimed.sort(strictCompare);
        for (const orphan of unclaimed) {
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

    // Assign territory_osids to each sector
    const perSector: string[][] = sectors.map(() => []);
    for (const [osid, sectorIdx] of claimed) {
        perSector[sectorIdx]!.push(osid);
    }
    for (let i = 0; i < sectors.length; i++) {
        sectors[i]!.territory_osids = perSector[i]!.sort(strictCompare);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Friendly Territory Connected Components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partition friendly OSIDs into connected components via BFS.
 * Returns a map from OSID → component index (0-based).
 * Delegates to the generic findConnectedComponents() utility.
 */
function buildFriendlyComponents(
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): Map<string, number> {
    const components = findConnectedComponents(
        friendlyOsids,
        osid => (adjacency.get(osid as Osid) ?? []).filter(n => friendlyOsids.has(n)),
    );
    const componentOf = new Map<string, number>();
    for (let i = 0; i < components.length; i++) {
        for (const osid of components[i]!) componentOf.set(osid, i);
    }
    return componentOf;
}

/**
 * Get the component ID for a sector (from its first territory OSID or friendly front OSID).
 * Returns -1 if sector has no OSIDs in the component map.
 */
function getSectorComponent(sector: CorpsFrontSector, componentOf: Map<string, number>): number {
    for (const osid of sector.territory_osids) {
        const c = componentOf.get(osid);
        if (c !== undefined) return c;
    }
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) {
            const c = componentOf.get(o);
            if (c !== undefined) return c;
        }
    }
    return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 6: Classify Brigades by Territory Membership
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify brigades into sectors based on territory membership.
 *
 * - Brigade at an OSID in a sector's territory_osids → assigned to that sector.
 * - Brigade in friendly territory but not in any sector's territory → assigned
 *   to the nearest sector (BFS through friendly territory).
 * - General staff units are exempt.
 *
 * GOLDEN RULE: Every active brigade MUST end up in a sector. If a brigade
 * falls through all classification priorities, that's a bug — investigate.
 *
 * Clears existing assigned/reserve lists and rebuilds from scratch.
 * Deterministic: sorted iteration via strictCompare.
 */
function classifyBrigadesByTerritory(
    sectors: CorpsFrontSector[],
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>
): void {
    if (sectors.length === 0) return;

    // Clear existing assignments (will be rebuilt)
    for (const s of sectors) {
        s.assigned_brigade_ids = [];
        s.reserve_brigade_ids = [];
    }

    // ── Phase 1: Assign frontline brigades by position ──────────────────
    // Brigades physically on a sector's front OSID are assigned to that sector.
    // This is positional reality — you defend where you stand.
    const frontOsidToSectorIdx = new Map<string, number>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                if (!frontOsidToSectorIdx.has(o)) frontOsidToSectorIdx.set(o, i);
            }
        }
    }

    // Per-corps unassigned brigade pool (corps decides where they go)
    const corpsPool = new Map<FormationId, FormationId[]>();

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;

        const fCorpsId = getFormationCorpsId(f);
        if (fCorpsId && EXEMPT_CORPS_IDS.has(fCorpsId)) continue;

        const loc = f.location_osid;

        // Frontline brigade → assigned to sector it's physically on
        const frontIdx = frontOsidToSectorIdx.get(loc);
        if (frontIdx !== undefined && sectors[frontIdx]!.corps_id === fCorpsId) {
            sectors[frontIdx]!.assigned_brigade_ids.push(fid);
            continue;
        }

        // Not on front — goes to corps pool for corps-level assignment
        if (fCorpsId) {
            const pool = corpsPool.get(fCorpsId) ?? [];
            pool.push(fid);
            corpsPool.set(fCorpsId, pool);
        }
    }

    // ── Phase 2: Corps distributes pooled brigades to sectors by need ───
    // The corps decides: sectors with more front edges get more brigades.
    // Constraint: a pooled brigade can only be assigned to a sector it can
    // physically reach through friendly territory (same connected component).
    // GOLDEN RULE: every brigade must end up in a sector.
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of sectors) {
        if (s.length_edges === 0) continue;
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [corpsId, pool] of [...corpsPool.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const corpsSectors = sectorsByCorps.get(corpsId);
        if (!corpsSectors || corpsSectors.length === 0) {
            // No sectors for this corps — assign to any same-faction sector (fallback)
            if (sectors.length > 0) {
                for (const bid of pool) sectors[0]!.assigned_brigade_ids.push(bid);
            }
            continue;
        }

        // Build sector → municipality set from territory_osids for home-affinity matching.
        // Brigades should defend their home municipality when possible.
        const sectorMunicipalities = new Map<CorpsFrontSector, Set<string>>();
        for (const s of corpsSectors) {
            const muns = new Set<string>();
            for (const osid of s.territory_osids) {
                const m = munFromOsid(osid);
                if (m) muns.add(m);
            }
            sectorMunicipalities.set(s, muns);
        }

        // Compute each sector's need and connected component.
        // Pooled brigades can only reach sectors in the same component of friendly territory.
        const sectorNeed: Array<{ sector: CorpsFrontSector; need: number; comp: number }> = [];
        for (const s of corpsSectors) {
            const comp = getSectorComponent(s, componentOf);
            const need = Math.max(0, s.length_edges - s.assigned_brigade_ids.length);
            sectorNeed.push({ sector: s, need, comp });
        }

        // Phase 2a: Home-affinity assignment — brigades prefer sectors covering
        // their home municipality AND reachable (same component).
        const unmatched: FormationId[] = [];
        for (const bid of pool) {
            const f = formations[bid];
            const homeOsid = f?.home_osid;
            const homeMun = homeOsid ? munFromOsid(homeOsid) : undefined;
            const brigComp = f?.location_osid ? (componentOf.get(f.location_osid) ?? -2) : -2;

            if (!homeMun) {
                unmatched.push(bid);
                continue;
            }

            // Find reachable sectors with need > 0 that cover this brigade's home municipality
            const homeSectors = sectorNeed
                .filter(sn => sn.need > 0 && sn.comp === brigComp && sectorMunicipalities.get(sn.sector)?.has(homeMun))
                .sort((a, b) => b.need - a.need || strictCompare(a.sector.sector_id, b.sector.sector_id));

            if (homeSectors.length > 0) {
                const target = homeSectors[0]!;
                target.sector.assigned_brigade_ids.push(bid);
                target.need = Math.max(0, target.need - 1);
            } else {
                unmatched.push(bid);
            }
        }

        // Phase 2b: Distribute remaining brigades round-robin to neediest
        // REACHABLE sectors (same connected component).
        for (let ri = 0; ri < unmatched.length; ri++) {
            const bid = unmatched[ri]!;
            const f = formations[bid];
            const brigComp = f?.location_osid ? (componentOf.get(f.location_osid) ?? -2) : -2;

            // Filter to reachable sectors only
            const reachable = sectorNeed.filter(sn => sn.comp === brigComp);

            // Fallback: if no reachable sector, assign to any corps sector
            // (GOLDEN RULE: every brigade must be in a sector)
            const candidates = reachable.length > 0 ? reachable : sectorNeed;

            // Sort by need descending, break ties by sector_id
            candidates.sort((a, b) => b.need - a.need || strictCompare(a.sector.sector_id, b.sector.sector_id));

            // If all have 0 need, distribute evenly by fewest assigned
            if (candidates[0]!.need === 0) {
                candidates.sort((a, b) =>
                    a.sector.assigned_brigade_ids.length - b.sector.assigned_brigade_ids.length
                    || strictCompare(a.sector.sector_id, b.sector.sector_id));
            }

            const target = candidates[0]!;
            target.sector.assigned_brigade_ids.push(bid);
            target.need = Math.max(0, target.need - 1);
        }
    }

    // Sort for determinism
    for (const s of sectors) {
        s.assigned_brigade_ids.sort(strictCompare);
        s.reserve_brigade_ids.sort(strictCompare);
    }

    // Reserve cap is applied later in reclassifyRearBrigades (Step 8),
    // after equalization and coverage have redistributed assigned brigades.

    // Update density, defensive power, and threat ratio
    const allFormIds = Object.keys(formations).sort(strictCompare);
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
        s.defensive_power = computeLocalFrontDefensivePower(
            formations, s.assigned_brigade_ids, s.length_edges
        );

        // Recalculate threat_ratio from enemy formations at sector enemy OSIDs
        const enemyOsids = new Set<string>();
        for (const ss of s.sub_segments) {
            for (const eo of ss.enemy_osids) enemyOsids.add(eo);
        }
        let enemyPower = 0;
        for (const fid of allFormIds) {
            const f = formations[fid];
            if (!f || f.faction === faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
            enemyPower += f.personnel ?? 0;
        }
        s.threat_ratio = s.defensive_power > 0 ? enemyPower / s.defensive_power : 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 8: Reclassify Rear Brigades (post-equalization)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After equalization and coverage, classify assigned brigades by position:
 * - On sector front OSID → stays assigned (frontline duty)
 * - 1 hop behind front → reserve candidate (recovery/reaction force)
 * - Deeper rear → stays assigned (will march toward front via interior movement)
 *
 * GOLDEN RULE 1: Every brigade MUST be in a sector. We never drop brigades.
 * GOLDEN RULE 2: Brigades in a sector MUST be at the frontline, except
 *   one reserve per sector (1 hop behind, recovering or reaction force).
 *   Deep-rear brigades are kept assigned and will be marched forward by
 *   evaluateInteriorMovement() each turn.
 */
function reclassifyRearBrigades(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        if (frontSet.size === 0) continue;

        // Build 1-hop set from all front OSIDs through friendly territory.
        const oneHopBehind = new Set<string>();
        for (const fo of frontSet) {
            for (const n of (adjacency.get(fo as Osid) ?? [])) {
                if (frontSet.has(n)) continue;
                if (!friendlyOsids.has(n)) continue;
                oneHopBehind.add(n);
            }
        }

        // Classify: front → assigned, 1-hop → reserve candidate, deeper → dropped.
        const keepAssigned: FormationId[] = [];
        const reserveCandidates: Array<{ bid: FormationId; personnel: number }> = [];

        for (const bid of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
            const f = formations[bid];
            if (!f?.location_osid) { keepAssigned.push(bid); continue; }
            if (frontSet.has(f.location_osid)) {
                keepAssigned.push(bid);
            } else if (oneHopBehind.has(f.location_osid)) {
                reserveCandidates.push({ bid, personnel: f.personnel ?? 0 });
            } else {
                // Deep-rear brigade: keep assigned. Interior movement will march
                // it toward the front. GOLDEN RULE: never drop a brigade from its sector.
                keepAssigned.push(bid);
            }
        }

        // Cap: 1 reserve per sector. Pick the strongest brigade.
        reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
        const reserveBrigade = reserveCandidates.length > 0 ? reserveCandidates[0]!.bid : null;

        sector.assigned_brigade_ids = keepAssigned.sort(strictCompare);
        sector.reserve_brigade_ids = reserveBrigade ? [reserveBrigade] : [];
    }

    // Recalculate density (assigned only — reserves don't count for front coverage)
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 6b: Equalize Sector Density
// ═══════════════════════════════════════════════════════════════════════════

/** Collect the set of friendly-side front OSIDs for a sector. */
function getSectorFrontOsids(sector: CorpsFrontSector): Set<string> {
    const frontSet = new Set<string>();
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) frontSet.add(o);
    }
    return frontSet;
}


// ═══════════════════════════════════════════════════════════════════════════
// Step 2: Multi-Source BFS — Map OSIDs to Nearest Corps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Multi-source BFS from all corps HQ locations through friendly-controlled territory.
 * Each OSID is assigned to the nearest corps by hop count.
 * Deterministic: corps sorted by ID, neighbors sorted by strictCompare.
 */
function mapOsidsToCorps(
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
    // GUARD: Skip location seeds in municipalities where ANOTHER corps has home
    // seeds. Prevents e.g. a 4th Corps brigade in Visoko from seeding 4th Corps
    // territory when 1st Corps has home seeds there — BFS would then steal Sarajevo.
    const homeMunCorps = new Map<string, Set<FormationId>>();
    for (const seed of lockedSeeds) {
        const mun = munFromOsid(seed.osid);
        if (!mun) continue;
        let corps = homeMunCorps.get(mun);
        if (!corps) { corps = new Set(); homeMunCorps.set(mun, corps); }
        corps.add(seed.corpsId);
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
function findSubordinateOsid(
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

// ═══════════════════════════════════════════════════════════════════════════
// Step 3: Partition Front Edges to Corps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign each hostile-boundary front edge to the corps that owns its friendly-side OSID.
 * When an edge is on an OSID not reachable by the main BFS (disconnected pockets/islands),
 * BFS outward through OSID adjacency to find the nearest already-claimed OSID and inherit
 * its corps. This correctly assigns Bihać, Srebrenica, etc. to the geographically nearest
 * corps rather than the alphabetically-first one.
 */
function partitionFrontEdges(
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
function bfsNearestClaimedCorps(
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

// ═══════════════════════════════════════════════════════════════════════════
// Step 3b: Consolidate Cross-Corps Front Splits
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After partitioning front edges to corps via BFS Voronoi, contiguous fronts
 * can be split across multiple corps at the boundary. This detects connected
 * components of edges (via friendly-OSID adjacency, ignoring corps assignment)
 * and reassigns minority edges to the majority corps in each component.
 *
 * Example: Bosanska Gradiška has two RBiH OSIDs (orahova → 5th Corps,
 * gradiska_3 → 3rd Corps). Their edges form one contiguous front but are
 * split by the BFS boundary. This merges them under whichever corps owns
 * the majority of edges in that front.
 *
 * Mutates corpsEdges in place.
 */
function consolidateCrossCorpsFronts(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>
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
    const edgeAdj = buildEdgeAdjacency(allEdgeIds, edgeMeta, faction, adjacency);

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
        // component. Protect a corps if losing this component's edges would
        // leave it with zero remaining edges (sector-less). Uses current
        // remaining count (not initial) to catch cumulative losses.
        const protectedCorps = new Set<FormationId>();
        for (const [cid, countInComponent] of corpsCounts) {
            if (cid === majorityCorps) continue;
            const remainingForCorps = corpsEdges.get(cid)?.length ?? 0;
            if (remainingForCorps <= countInComponent) {
                protectedCorps.add(cid);
            }
        }

        // Reassign minority edges to the majority corps
        for (const eid of component) {
            const currentCorps = edgeToCorps.get(eid);
            if (!currentCorps || currentCorps === majorityCorps) continue;
            if (protectedCorps.has(currentCorps)) continue;

            // Protect edges where a brigade of the current corps is on the friendly OSID
            const meta = edgeMeta.get(eid);
            if (meta) {
                const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                const brigCorps = osidBrigadeCorps.get(friendlyOsid);
                if (brigCorps && brigCorps.has(currentCorps)) continue; // Brigade presence protects
            }

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
                // Check brigade presence protection
                const meta = edgeMeta.get(eid);
                if (meta) {
                    const friendlyOsid = meta.side_a === faction ? meta.a : meta.b;
                    const brigCorps = osidBrigadeCorps.get(friendlyOsid);
                    if (brigCorps && brigCorps.has(cid)) continue;
                }
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

// ═══════════════════════════════════════════════════════════════════════════
// Step 3c: Consolidate Isolated Corps Pockets
// ═══════════════════════════════════════════════════════════════════════════

/**
 * After cross-corps consolidation, a corps may still have disconnected edge
 * components (protected by brigade presence in 3b). This pass overrides that
 * protection for isolated pockets: if a corps's edges form multiple connected
 * components, the smaller components are reassigned to whichever corps
 * dominates the neighboring area. A 1-brigade pocket in Kakanj surrounded by
 * 2nd Corps territory should become 2nd Corps's responsibility.
 *
 * "Isolated" = a connected component of a corps's edges that is NOT part of
 * the corps's largest connected component.
 */
function consolidateIsolatedCorpsPockets(
    corpsEdges: Map<FormationId, string[]>,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
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
        const edgeAdj = buildEdgeAdjacency(edges, edgeMeta, faction, adjacency);

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

// ═══════════════════════════════════════════════════════════════════════════
// Step 4: Build Multi-Sector from Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum front edges for a sub-segment to be promoted to its own sector. */
export { MIN_SECTOR_EDGES } from './corps_front_sectors_constants.js';

/** Maximum edges per sector before forced split at midpoint. */
export { MAX_SECTOR_EDGES } from './corps_front_sectors_constants.js';

/** Maximum brigades per sector before forced split. */
export { MAX_SECTOR_BRIGADES } from './corps_front_sectors_constants.js';


/** Maximum reserve brigades per sector. */
export { MAX_RESERVES_PER_SECTOR } from './corps_front_sectors_constants.js';

/**
 * Decompose a corps' front edges into connected sub-segments via BFS.
 */
function findSubSegments(
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>
): CorpsFrontSubSegment[] {
    const edgeSet = new Set(edgeIds);
    const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta, faction, osidAdjacency, sharedBoundaryAdj);
    const visited = new Set<string>();
    const subSegments: CorpsFrontSubSegment[] = [];
    let segIndex = 0;

    const sortedEdgeIds = [...edgeIds].sort(strictCompare);
    for (const seed of sortedEdgeIds) {
        if (visited.has(seed)) continue;

        const component: string[] = [];
        const stack = [seed];
        visited.add(seed);

        while (stack.length > 0) {
            const eid = stack.pop()!;
            component.push(eid);
            const neighbors = edgeAdj.get(eid) ?? [];
            for (const next of neighbors) {
                if (visited.has(next)) continue;
                if (!edgeSet.has(next)) continue;
                visited.add(next);
                stack.push(next);
            }
        }

        component.sort(strictCompare);

        const friendlyOsids = new Set<string>();
        const enemyOsids = new Set<string>();

        for (const eid of component) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            if (meta.side_a === faction) {
                friendlyOsids.add(meta.a);
                enemyOsids.add(meta.b);
            } else {
                friendlyOsids.add(meta.b);
                enemyOsids.add(meta.a);
            }
        }

        subSegments.push({
            sub_segment_id: `subseg:${corpsId}:${segIndex}`,
            edge_ids: component,
            friendly_osids: [...friendlyOsids].sort(strictCompare),
            enemy_osids: [...enemyOsids].sort(strictCompare),
            length_edges: component.length,
        });
        segIndex++;
    }

    return subSegments;
}

/**
 * Build multi-sector output for a corps from its assigned front edge IDs.
 *
 * Pipeline:
 *   1. Find connected components (sub-segments) via BFS on edge adjacency
 *   2. Split oversized components at midpoint (Phase 1D: MAX_SECTOR_EDGES)
 *   3. Build sectors, assign brigades (front + interior via BFS)
 *   4. Populate reserves from interior brigades (Phase 1C)
 *   5. Post-pass: split sectors exceeding MAX_SECTOR_BRIGADES (Phase 1E)
 *
 * Sector IDs: `sector:{corps_id}:0`, `sector:{corps_id}:1`, etc.
 */
function buildMultiSectorsForCorps(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    edgeIds: string[],
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null,
    friendlyOsids?: Set<string>
): CorpsFrontSector[] {
    if (edgeIds.length === 0) return [];

    // Build edge metadata lookup
    const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    for (const e of osidFrontEdges) {
        edgeMeta.set(e.edge_id, e);
    }

    // Step 1: Find connected components
    let subSegments = findSubSegments(corpsId, faction, edgeIds, edgeMeta, adjacency, sharedBoundaryAdj);
    // Proposal B: merge undersized sub-segments up to MIN_SECTOR_EDGES.
    // Do NOT pass friendlyOsids — merging should use direct OSID adjacency only,
    // not unbounded BFS through rear territory (which merges distant segments).
    subSegments = mergeUndersizedSubSegments(corpsId, subSegments, adjacency, sharedBoundaryAdj);
    if (subSegments.length === 0) return [];

    // Step 2 (Phase 1D): Split oversized sub-segments
    subSegments = splitOversizedSubSegments(corpsId, subSegments, edgeMeta);

    // Renumber sub-segments deterministically
    subSegments.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
    for (let i = 0; i < subSegments.length; i++) {
        subSegments[i]!.sub_segment_id = `subseg:${corpsId}:${i}`;
    }

    // Step 3: Build sectors with full brigade assignment (front + interior BFS)
    const sectors: CorpsFrontSector[] = [];
    for (let i = 0; i < subSegments.length; i++) {
        const sector = buildSectorFromSubSegments(
            state, corpsId, faction, i, [subSegments[i]!], edgeMeta,
            formations
        );
        if (sector) sectors.push(sector);
    }

    // Step 4 (Phase 1E): Recursively split sectors exceeding MAX_SECTOR_BRIGADES
    let sectorPool = sectors;
    let splitOccurred = true;
    while (splitOccurred) {
        splitOccurred = false;
        const next: CorpsFrontSector[] = [];
        for (const sector of sectorPool) {
            const total = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
            if (total > MAX_SECTOR_BRIGADES && sector.length_edges >= 4) {
                const halves = splitSubSegmentAtMidpoint(sector.sub_segments[0]!, corpsId, edgeMeta);
                if (halves) {
                    for (const half of halves) {
                        const s = buildSectorFromSubSegments(
                            state, corpsId, faction, next.length, [half],
                            edgeMeta, formations
                        );
                        if (s) next.push(s);
                    }
                    splitOccurred = true;
                    continue;
                }
            }
            sector.sector_id = `sector:${corpsId}:${next.length}`;
            next.push(sector);
        }
        sectorPool = next;
    }
    const finalSectors = sectorPool;

    // Dedup: Phase 1E splits can produce the same brigade in two sectors when
    // a junction OSID has edges on both sides of a midpoint split.
    deduplicateBrigadesAcrossSectors(finalSectors);

    // Step 4b: Split non-contiguous sectors (friendly OSIDs must form connected components via OSID adjacency)
    const contiguousSectors = splitNonContiguousSectors(finalSectors, adjacency, sharedBoundaryAdj);

    // Brigade assignment (territory_osids, assigned/reserve classification) is now
    // handled faction-wide by assignTerritoryVoronoi + classifyBrigadesByTerritory
    // in buildFactionSectors Steps 5-6.

    // Filter ghost/orphan sectors: require at least 1 front edge.
    // Sectors with territory but 0 edges are pockets that lost their front — prune them.
    return contiguousSectors.filter(s => s.length_edges > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1D: Split Oversized Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively split sub-segments exceeding MAX_SECTOR_EDGES at their midpoint.
 * After each split, decomposes halves into connected components to guarantee
 * geographic contiguity (midpoint split on branching graphs can fragment).
 */
function splitOversizedSubSegments(
    corpsId: FormationId,
    subSegments: CorpsFrontSubSegment[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): CorpsFrontSubSegment[] {
    const result: CorpsFrontSubSegment[] = [];

    for (const seg of subSegments) {
        if (seg.length_edges <= MAX_SECTOR_EDGES) {
            result.push(seg);
            continue;
        }
        // Try to split at midpoint
        const halves = splitSubSegmentAtMidpoint(seg, corpsId, edgeMeta);
        if (!halves) {
            result.push(seg); // Can't split — keep as-is
            continue;
        }
        // Ensure contiguity: decompose each half into connected components,
        // then recurse on oversized components
        for (const half of halves) {
            const components = decomposeIntoConnectedComponents(half, corpsId, edgeMeta);
            for (const comp of components) {
                if (comp.length_edges > MAX_SECTOR_EDGES) {
                    result.push(...splitOversizedSubSegments(corpsId, [comp], edgeMeta));
                } else {
                    result.push(comp);
                }
            }
        }
    }

    return result;
}

/**
 * Decompose a sub-segment into connected components via BFS on edge adjacency.
 * Returns one component if already contiguous, multiple if fragmented.
 */
function decomposeIntoConnectedComponents(
    seg: CorpsFrontSubSegment,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): CorpsFrontSubSegment[] {
    const adj = buildEdgeAdjacency(seg.edge_ids, edgeMeta);
    const edgeSet = new Set(seg.edge_ids);
    const visited = new Set<string>();
    const components: CorpsFrontSubSegment[] = [];
    let idx = 0;

    const sortedEdges = [...seg.edge_ids].sort(strictCompare);
    for (const seed of sortedEdges) {
        if (visited.has(seed)) continue;
        const component: string[] = [];
        const stack = [seed];
        visited.add(seed);
        while (stack.length > 0) {
            const eid = stack.pop()!;
            component.push(eid);
            for (const next of adj.get(eid) ?? []) {
                if (visited.has(next) || !edgeSet.has(next)) continue;
                visited.add(next);
                stack.push(next);
            }
        }
        component.sort(strictCompare);
        components.push(buildSubSegmentFromEdges(corpsId, idx++, component, edgeMeta, seg));
    }

    return components;
}

/**
 * Split a sub-segment at its edge-chain midpoint.
 * Walks from one end of the edge chain, splits at the halfway mark.
 * Returns two sub-segments, or null if the segment can't be meaningfully split.
 */
function splitSubSegmentAtMidpoint(
    seg: CorpsFrontSubSegment,
    corpsId: FormationId,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>
): [CorpsFrontSubSegment, CorpsFrontSubSegment] | null {
    if (seg.length_edges < 4) return null;

    // Build local adjacency and walk the edge chain to find ordering
    const adj = buildEdgeAdjacency(seg.edge_ids, edgeMeta);
    const chain = walkEdgeChain(seg.edge_ids, adj);
    const mid = Math.floor(chain.length / 2);
    const firstHalf = chain.slice(0, mid);
    const secondHalf = chain.slice(mid);

    if (firstHalf.length === 0 || secondHalf.length === 0) return null;

    return [
        buildSubSegmentFromEdges(corpsId, 0, firstHalf, edgeMeta, seg),
        buildSubSegmentFromEdges(corpsId, 1, secondHalf, edgeMeta, seg),
    ];
}

/**
 * BFS traversal from an endpoint edge to produce a geographic ordering.
 * BFS ensures nearby edges are visited first, giving a spatial ordering
 * suitable for midpoint splitting even on branching front graphs.
 */
function walkEdgeChain(
    edgeIds: string[],
    adj: Map<string, string[]>
): string[] {
    const edgeSet = new Set(edgeIds);
    const sorted = [...edgeIds].sort(strictCompare);

    // Find an endpoint (degree 1 in the edge graph) as starting point
    let start = sorted[0]!;
    for (const eid of sorted) {
        const neighbors = (adj.get(eid) ?? []).filter(n => edgeSet.has(n));
        if (neighbors.length <= 1) { start = eid; break; }
    }

    // BFS traversal — visits all neighbors, geographic ordering
    const visited = new Set<string>();
    const chain: string[] = [];
    const queue: string[] = [start];
    visited.add(start);

    while (queue.length > 0) {
        const eid = queue.shift()!;
        chain.push(eid);
        const neighbors = (adj.get(eid) ?? []).filter(n => edgeSet.has(n) && !visited.has(n));
        neighbors.sort(strictCompare);
        for (const n of neighbors) {
            visited.add(n);
            queue.push(n);
        }
    }

    // Safety fallback for disconnected edges (shouldn't happen in connected component)
    for (const eid of sorted) {
        if (!visited.has(eid)) chain.push(eid);
    }

    return chain;
}

/**
 * Build a CorpsFrontSubSegment from a subset of edge IDs.
 */
function buildSubSegmentFromEdges(
    corpsId: FormationId,
    indexHint: number,
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    parentSeg: CorpsFrontSubSegment
): CorpsFrontSubSegment {
    const edgeSet = new Set(edgeIds);
    const friendlyOsids = new Set<string>();
    const enemyOsids = new Set<string>();

    // Derive faction from parent segment's OSID sets
    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        // An OSID is friendly if it was in the parent's friendly set
        if (parentSeg.friendly_osids.includes(meta.a)) {
            friendlyOsids.add(meta.a);
            enemyOsids.add(meta.b);
        } else {
            friendlyOsids.add(meta.b);
            enemyOsids.add(meta.a);
        }
    }

    edgeIds.sort(strictCompare);
    return {
        sub_segment_id: `subseg:${corpsId}:split${indexHint}`,
        edge_ids: edgeIds,
        friendly_osids: [...friendlyOsids].sort(strictCompare),
        enemy_osids: [...enemyOsids].sort(strictCompare),
        length_edges: edgeIds.length,
    };
}

/**
 * Build a single CorpsFrontSector from one or more sub-segments.
 */
function buildSectorFromSubSegments(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    sectorIndex: number,
    subSegments: CorpsFrontSubSegment[],
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    formations: Record<FormationId, FormationState>
): CorpsFrontSector | null {
    if (subSegments.length === 0) return null;

    const allEdgeIds = new Set<string>();
    const allFriendlyOsids = new Set<string>();
    const allEnemyOsids = new Set<string>();
    const allOpposingFactions = new Set<string>();

    for (const ss of subSegments) {
        for (const eid of ss.edge_ids) allEdgeIds.add(eid);
        for (const o of ss.friendly_osids) allFriendlyOsids.add(o);
        for (const o of ss.enemy_osids) allEnemyOsids.add(o);
        for (const eid of ss.edge_ids) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            const enemy = meta.side_a === faction ? meta.side_b : meta.side_a;
            if (enemy) allOpposingFactions.add(enemy);
        }
    }

    const sortedEdgeIds = [...allEdgeIds].sort(strictCompare);
    const totalEdges = sortedEdgeIds.length;

    // Per-sector brigade assignment: brigade at OSID in sector's friendly_osids
    const assignedBrigadeIds: FormationId[] = [];
    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !allFriendlyOsids.has(f.location_osid)) continue;
        if (getFormationCorpsId(f) !== corpsId) continue;
        assignedBrigadeIds.push(fid);
    }

    const density = totalEdges > 0 ? assignedBrigadeIds.length / totalEdges : 0;
    const defensivePower = computeLocalFrontDefensivePower(
        formations, assignedBrigadeIds, totalEdges
    );

    let enemyPower = 0;
    for (const fid of sortedFormIds) {
        const f = formations[fid];
        if (!f || f.faction === faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !allEnemyOsids.has(f.location_osid)) continue;
        enemyPower += f.personnel ?? 0;
    }
    const threatRatio = defensivePower > 0 ? enemyPower / defensivePower : 0;

    return {
        sector_id: `sector:${corpsId}:${sectorIndex}`,
        corps_id: corpsId,
        faction,
        opposing_factions: [...allOpposingFactions].sort(strictCompare) as FactionId[],
        edge_ids: sortedEdgeIds,
        sub_segments: subSegments,
        length_edges: totalEdges,
        territory_osids: [],
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: [],
        density,
        threat_ratio: threatRatio,
        defensive_power: defensivePower,
    };
}

/**
 * BFS from startOsid through friendly territory to find the nearest OSID
 * belonging to a sector. If allowedSectorIdxs is provided, only sectors
 * in that set are considered (used for corps-strict assignment).
 * Returns the sector index, or null if unreachable.
 */
function bfsToNearestSector(
    startOsid: string,
    osidToSectorIdx: Map<string, number>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    allowedSectorIdxs?: number[]
): number | null {
    const allowed = allowedSectorIdxs ? new Set(allowedSectorIdxs) : null;

    // Quick check: already at a sector OSID?
    const direct = osidToSectorIdx.get(startOsid);
    if (direct !== undefined && (!allowed || allowed.has(direct))) return direct;

    // BFS through friendly territory (adjacency lists are pre-sorted by buildOsidAdjacency)
    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: string[] = [startOsid];
    let head = 0;

    while (head < queue.length) {
        const osid = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            visited.add(n);

            const sIdx = osidToSectorIdx.get(n);
            if (sIdx !== undefined && (!allowed || allowed.has(sIdx))) return sIdx;

            queue.push(n);
        }
    }

    return null; // Unreachable (enclave with no front edges)
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 7: Minimum Sector Coverage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ensure every sector has at least one assigned brigade.
 *
 * For sectors with 0 assigned brigades:
 *   1. Promote the first reserve brigade to assigned (if any exist).
 *   2. Otherwise, BFS from the sector's friendly OSIDs to find the nearest
 *      brigade in a surplus sector (>1 assigned) and transfer it.
 *
 * "Assigned" here means the brigade is physically present at a front OSID of
 * the sector. Reserves are interior brigades BFS-assigned as backup.
 * Deterministic: sorted iteration throughout.
 */
function ensureMinimumSectorCoverage(
    allSectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>
): void {
    // Group by corps — only transfer within the same corps
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of allSectors) {
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [, corpsSectors] of [...sectorsByCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        for (const sector of corpsSectors) {
            if (sector.assigned_brigade_ids.length > 0) continue;

            const sectorComp = getSectorComponent(sector, componentOf);

            // Step 1: promote first connected reserve to assigned
            // Only promote reserves whose location is reachable from sector
            // through friendly territory (skip disconnected pocket reserves).
            {
                const sectorFriendly = getSectorFrontOsids(sector);
                let promoted = false;
                for (let ri = 0; ri < sector.reserve_brigade_ids.length; ri++) {
                    const bid = sector.reserve_brigade_ids[ri]!;
                    const f = formations[bid];
                    if (!f?.location_osid) continue;
                    // Check connectivity: BFS from brigade location through friendly to sector
                    const reachable = bfsToNearestSector(
                        f.location_osid,
                        new Map([...sectorFriendly].map(o => [o, 0])),
                        adjacency, friendlyOsids
                    );
                    if (reachable !== null) {
                        sector.reserve_brigade_ids.splice(ri, 1);
                        sector.assigned_brigade_ids.push(bid);
                        promoted = true;
                        break;
                    }
                }
                if (promoted) continue;
            }

            // Step 2: transfer one non-front brigade from a surplus corps sector (>1 assigned).
            // Step 3 fallback: if no non-front brigade available, take any brigade from
            // the highest-surplus donor (>2 assigned preferred, >1 as last resort).
            {
                // Only transfer from sectors in the same connected component —
                // brigades can't march through enemy territory to reach a pocket.
                const surplusSectors = corpsSectors
                    .filter(s => s.assigned_brigade_ids.length > 1
                        && s.sector_id !== sector.sector_id
                        && getSectorComponent(s, componentOf) === sectorComp)
                    .sort((a, b) => b.assigned_brigade_ids.length - a.assigned_brigade_ids.length || strictCompare(a.sector_id, b.sector_id));

                let transferred = false;
                // Step 2: prefer non-front-line brigade
                for (const donor of surplusSectors) {
                    const donorFront = getSectorFrontOsids(donor);
                    for (const bid of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                        const f = formations[bid];
                        if (!f?.location_osid) continue;
                        if (donorFront.has(f.location_osid)) continue;
                        const idx = donor.assigned_brigade_ids.indexOf(bid);
                        if (idx >= 0) donor.assigned_brigade_ids.splice(idx, 1);
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                    if (transferred) break;
                }
                // Step 3: fallback — take any brigade from highest-surplus donor
                if (!transferred) {
                    for (const donor of surplusSectors) {
                        if (donor.assigned_brigade_ids.length <= 1) continue;
                        const bid = donor.assigned_brigade_ids[donor.assigned_brigade_ids.length - 1]!;
                        donor.assigned_brigade_ids.pop();
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                }
            }
        }
    }

    // Sort for determinism
    for (const s of allSectors) s.assigned_brigade_ids.sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade Deduplication
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove brigades that appear in multiple sectors, keeping only the first
 * claim in sector_id order. This fixes the Phase 1E junction-OSID bug where
 * a brigade at an OSID that spans both halves of a midpoint split gets
 * double-assigned. Applies across both assigned and reserve lists.
 */
function deduplicateBrigadesAcrossSectors(sectors: CorpsFrontSector[]): void {
    if (sectors.length <= 1) return;
    const claimed = new Set<FormationId>();
    const sorted = [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sorted) {
        sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
        sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Split Non-Contiguous Sectors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split sectors whose friendly OSIDs are not contiguous through OSID adjacency.
 * BFS through each sector's friendly OSIDs; if disconnected components exist,
 * split into one sector per component. Edges are partitioned by which component
 * their friendly-side OSID belongs to. Brigades distributed to the largest component.
 *
 * Deterministic: sorted iteration via strictCompare.
 */
export function splitNonContiguousSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): CorpsFrontSector[] {
    const result: CorpsFrontSector[] = [];

    for (const sector of sectors) {
        if (sector.edge_ids.length <= 1) {
            result.push(sector);
            continue;
        }

        // Collect all friendly OSIDs for this sector
        const allFriendly = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) allFriendly.add(o);
        }

        // Parse edge IDs ("osidA__osidB") to build friendly/hostile-side indexes.
        // Single pass populates both sides for triple-junction connectivity.
        const friendlyToEdges = new Map<string, string[]>();
        const hostileToEdges = new Map<string, string[]>();
        const edgeFriendly = new Map<string, string>();
        const edgeHostile = new Map<string, string>();
        let parsedEdgeCount = 0;
        for (const eid of sector.edge_ids) {
            const sep = eid.indexOf('__');
            if (sep < 0) continue;
            parsedEdgeCount++;
            const osidA = eid.slice(0, sep);
            const osidB = eid.slice(sep + 2);
            const friendly = allFriendly.has(osidA) ? osidA : allFriendly.has(osidB) ? osidB : null;
            if (!friendly) continue;
            const hostile = friendly === osidA ? osidB : osidA;
            edgeFriendly.set(eid, friendly);
            edgeHostile.set(eid, hostile);
            let list = friendlyToEdges.get(friendly) ?? [];
            if (list.length === 0) friendlyToEdges.set(friendly, list);
            list.push(eid);
            list = hostileToEdges.get(hostile) ?? [];
            if (list.length === 0) hostileToEdges.set(hostile, list);
            list.push(eid);
        }

        // Fallback: if edge IDs don't encode OSIDs, use OSID-level connectivity
        if (parsedEdgeCount === 0) {
            const osidComponents = findConnectedComponents(
                allFriendly,
                (osid) => osidAdjacency.get(osid) ?? [],
            );
            if (osidComponents.length <= 1) {
                result.push(sector);
            } else {
                // Split using OSID components (legacy path for non-standard edge IDs)
                let largestIdx = 0;
                for (let i = 1; i < osidComponents.length; i++) {
                    if (osidComponents[i]!.size > osidComponents[largestIdx]!.size) largestIdx = i;
                }
                for (let ci = 0; ci < osidComponents.length; ci++) {
                    const comp = osidComponents[ci]!;
                    const compEdgeIds = sector.edge_ids.slice(); // can't partition without OSID info
                    const isLargest = ci === largestIdx;
                    const subSeg: CorpsFrontSubSegment = {
                        sub_segment_id: `subseg:${sector.corps_id}:split${ci}`,
                        edge_ids: isLargest ? compEdgeIds : [],
                        friendly_osids: [...comp].sort(strictCompare),
                        enemy_osids: [...sector.sub_segments.flatMap(ss => ss.enemy_osids)].sort(strictCompare),
                        length_edges: isLargest ? compEdgeIds.length : 0,
                    };
                    result.push({
                        sector_id: `sector:${sector.corps_id}:${result.length}`,
                        corps_id: sector.corps_id,
                        faction: sector.faction,
                        opposing_factions: [...sector.opposing_factions],
                        edge_ids: isLargest ? compEdgeIds : [],
                        sub_segments: [subSeg],
                        length_edges: isLargest ? compEdgeIds.length : 0,
                        territory_osids: sector.territory_osids.filter(o => comp.has(o)),
                        assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],
                        reserve_brigade_ids: isLargest ? [...sector.reserve_brigade_ids] : [],
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                    });
                }
            }
            continue;
        }

        // Build edge adjacency using triple-junction connectivity (front-line-following).
        // Two front edges are adjacent iff they meet at a polygon triple junction:
        //   Case A: same friendly OSID, hostile OSIDs adjacent
        //   Case B: same hostile OSID, friendly OSIDs adjacent
        const edgeNeighbors = new Map<string, Set<string>>();
        const linkEdges = (ea: string, eb: string) => {
            if (ea === eb) return;
            if (!edgeNeighbors.has(ea)) edgeNeighbors.set(ea, new Set());
            if (!edgeNeighbors.has(eb)) edgeNeighbors.set(eb, new Set());
            edgeNeighbors.get(ea)!.add(eb);
            edgeNeighbors.get(eb)!.add(ea);
        };

        // Both Case A and Case B use sharedBoundaryAdj (excludes distance contacts)
        // when available. Distance contacts are near-miss polygon adjacencies, not
        // true shared boundaries — the front line doesn't pass through them.
        const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

        // Case A: same friendly OSID, hostile OSIDs share a true boundary
        for (const edges of friendlyToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const hi = edgeHostile.get(edges[i]!);
                if (!hi) continue;
                for (let j = i + 1; j < edges.length; j++) {
                    const hj = edgeHostile.get(edges[j]!);
                    if (!hj) continue;
                    if (isOsidAdjacent(hi, hj, caseAdj)) linkEdges(edges[i]!, edges[j]!);
                }
            }
        }

        // Case B: same hostile OSID, friendly OSIDs share a true boundary
        for (const edges of hostileToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const fi = edgeFriendly.get(edges[i]!);
                if (!fi) continue;
                for (let j = i + 1; j < edges.length; j++) {
                    const fj = edgeFriendly.get(edges[j]!);
                    if (!fj) continue;
                    if (isOsidAdjacent(fi, fj, caseAdj)) linkEdges(edges[i]!, edges[j]!);
                }
            }
        }

        // Find connected components of edges using front-line-following adjacency
        const edgeComponents = findConnectedComponents(
            new Set(sector.edge_ids),
            (eid) => edgeNeighbors.get(eid) ?? new Set(),
        );

        // Single component — sector is already contiguous
        if (edgeComponents.length <= 1) {
            result.push(sector);
            continue;
        }

        // Multiple components — split sector
        // Find the largest component (for brigade fallback assignment)
        let largestCompIdx = 0;
        let largestCompSize = 0;
        for (let ci = 0; ci < edgeComponents.length; ci++) {
            if (edgeComponents[ci]!.size > largestCompSize) {
                largestCompSize = edgeComponents[ci]!.size;
                largestCompIdx = ci;
            }
        }

        // Build per-component sectors
        for (let ci = 0; ci < edgeComponents.length; ci++) {
            const edgeComp = edgeComponents[ci]!;
            const compFriendly = new Set<string>();
            const compEnemy = new Set<string>();

            // Derive friendly/enemy OSIDs from the edges in this component
            for (const eid of edgeComp) {
                const sep = eid.indexOf('__');
                if (sep < 0) continue;
                const osidA = eid.slice(0, sep);
                const osidB = eid.slice(sep + 2);
                if (allFriendly.has(osidA)) {
                    compFriendly.add(osidA);
                    compEnemy.add(osidB);
                } else {
                    compFriendly.add(osidB);
                    compEnemy.add(osidA);
                }
            }

            const compEdgeIds = [...edgeComp].sort(strictCompare);
            if (compEdgeIds.length === 0 && compFriendly.size === 0) continue;

            const subSeg: CorpsFrontSubSegment = {
                sub_segment_id: `subseg:${sector.corps_id}:split${ci}`,
                edge_ids: compEdgeIds,
                friendly_osids: [...compFriendly].sort(strictCompare),
                enemy_osids: [...compEnemy].sort(strictCompare),
                length_edges: compEdgeIds.length,
            };

            // Brigades: all go to the largest component; others get empty lists
            // (classifyBrigadesByTerritory will re-populate after territory Voronoi)
            const isLargest = ci === largestCompIdx;
            // Split territory_osids by component membership
            const compTerritoryOsids = sector.territory_osids.filter(o => compFriendly.has(o));

            const newSector: CorpsFrontSector = {
                sector_id: `sector:${sector.corps_id}:${result.length}`,
                corps_id: sector.corps_id,
                faction: sector.faction,
                opposing_factions: [...sector.opposing_factions],
                edge_ids: compEdgeIds,
                sub_segments: [subSeg],
                length_edges: compEdgeIds.length,
                territory_osids: compTerritoryOsids.sort(strictCompare),
                assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],
                reserve_brigade_ids: isLargest ? [...sector.reserve_brigade_ids] : [],
                density: 0,
                threat_ratio: 0,
                defensive_power: 0,
            };

            result.push(newSector);
        }
    }

    // Renumber sector IDs deterministically
    result.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < result.length; i++) {
        result[i]!.sector_id = `sector:${result[i]!.corps_id}:${i}`;
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Proposal B: Merge Undersized Sub-Segments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if two sub-segments are adjacent on the front line (triple-junction rule).
 * Two segments are front-adjacent if any of their front edges meet at a polygon
 * triple junction — shared friendly + hostile adj, or shared hostile + friendly adj.
 */
function isSegmentAdjacent(
    a: CorpsFrontSubSegment,
    b: CorpsFrontSubSegment,
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): boolean {
    const aFriendlySet = new Set(a.friendly_osids);
    const bFriendlySet = new Set(b.friendly_osids);

    type FrontEdge = { friendly: string; hostile: string };
    const parseEdges = (seg: CorpsFrontSubSegment, friendlySet: Set<string>): FrontEdge[] => {
        const result: FrontEdge[] = [];
        for (const eid of seg.edge_ids) {
            const sep = eid.indexOf('__');
            if (sep < 0) continue;
            const osidA = eid.slice(0, sep);
            const osidB = eid.slice(sep + 2);
            if (friendlySet.has(osidA)) result.push({ friendly: osidA, hostile: osidB });
            else if (friendlySet.has(osidB)) result.push({ friendly: osidB, hostile: osidA });
        }
        return result;
    };

    const edgesA = parseEdges(a, aFriendlySet);
    const edgesB = parseEdges(b, bFriendlySet);

    // Both cases use shared-boundary adjacency to avoid bridging through distance contacts.
    const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

    // Check all pairs for triple-junction connectivity
    for (const ea of edgesA) {
        for (const eb of edgesB) {
            // Case A: same friendly, hostile OSIDs share true boundary
            if (ea.friendly === eb.friendly && (caseAdj.get(ea.hostile as Osid) ?? []).includes(eb.hostile)) return true;
            // Case B: same hostile, friendly OSIDs share true boundary
            if (ea.hostile === eb.hostile && (caseAdj.get(ea.friendly as Osid) ?? []).includes(eb.friendly)) return true;
        }
    }

    return false;
}

/**
 * Combine two sub-segments into one, merging their edge IDs and OSID sets.
 */
function mergeSubSegmentsInto(
    corpsId: FormationId,
    indexHint: number,
    a: CorpsFrontSubSegment,
    b: CorpsFrontSubSegment
): CorpsFrontSubSegment {
    const edgeIds = [...new Set([...a.edge_ids, ...b.edge_ids])].sort(strictCompare);
    const friendlyOsids = [...new Set([...a.friendly_osids, ...b.friendly_osids])].sort(strictCompare);
    const enemyOsids = [...new Set([...a.enemy_osids, ...b.enemy_osids])].sort(strictCompare);
    return {
        sub_segment_id: `subseg:${corpsId}:${indexHint}`,
        edge_ids: edgeIds,
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeIds.length,
    };
}

/**
 * Iteratively merge sub-segments below MIN_SECTOR_EDGES into their nearest
 * OSID-adjacent neighbor. Isolated segments (enclaves with no adjacent neighbor)
 * are kept as-is. Always merges the smallest segment first; ties broken by ID.
 */
function mergeUndersizedSubSegments(
    corpsId: FormationId,
    subSegments: CorpsFrontSubSegment[],
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): CorpsFrontSubSegment[] {
    if (subSegments.length <= 1) return subSegments;

    let segs = subSegments.slice();
    const unmergeableIds = new Set<string>();

    let changed = true;
    while (changed) {
        changed = false;

        let targetIdx = -1;
        let minSize = Infinity;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i]!;
            if (unmergeableIds.has(s.sub_segment_id)) continue;
            if (s.length_edges < MIN_SECTOR_EDGES) {
                if (s.length_edges < minSize ||
                    (s.length_edges === minSize && targetIdx >= 0 &&
                     strictCompare(s.sub_segment_id, segs[targetIdx]!.sub_segment_id) < 0)) {
                    minSize = s.length_edges;
                    targetIdx = i;
                }
            }
        }
        if (targetIdx === -1) break;

        const target = segs[targetIdx]!;

        let bestIdx = -1;
        let bestSize = Infinity;
        for (let i = 0; i < segs.length; i++) {
            if (i === targetIdx) continue;
            const candidate = segs[i]!;
            if (isSegmentAdjacent(target, candidate, osidAdjacency, sharedBoundaryAdj)) {
                if (candidate.length_edges < bestSize ||
                    (candidate.length_edges === bestSize && bestIdx >= 0 &&
                     strictCompare(candidate.sub_segment_id, segs[bestIdx]!.sub_segment_id) < 0)) {
                    bestSize = candidate.length_edges;
                    bestIdx = i;
                }
            }
        }

        if (bestIdx === -1) {
            unmergeableIds.add(target.sub_segment_id);
            continue;
        }

        const merged = mergeSubSegmentsInto(corpsId, segs.length, target, segs[bestIdx]!);
        const newSegs: CorpsFrontSubSegment[] = [];
        for (let i = 0; i < segs.length; i++) {
            if (i === targetIdx || i === bestIdx) continue;
            newSegs.push(segs[i]!);
        }
        newSegs.push(merged);
        segs = newSegs;
        changed = true;
    }

    segs.sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));
    for (let i = 0; i < segs.length; i++) {
        segs[i]!.sub_segment_id = `subseg:${corpsId}:${i}`;
    }
    return segs;
}

/**
 * Build adjacency map between front edges using front-line-following
 * (triple-junction connectivity).
 *
 * Two front edges are adjacent on the front line iff they meet at a polygon
 * triple junction — three mutually adjacent OSIDs forming a corner of the front.
 *
 * Case A: same friendly OSID F, hostile OSIDs H₁ adj H₂ → triple junction (F, H₁, H₂)
 * Case B: same hostile OSID H, friendly OSIDs F₁ adj F₂ → triple junction (F₁, F₂, H)
 *
 * When faction/osidAdjacency are not provided (decompose/bisect paths), falls back
 * to shared-OSID grouping without adjacency walk.
 */
function buildEdgeAdjacency(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction?: string,
    osidAdjacency?: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>
): Map<string, string[]> {
    // Use Set-based adjacency for O(1) dedup, convert to sorted arrays at end
    const adjSets = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        if (a === b) return;
        let sa = adjSets.get(a);
        if (!sa) { sa = new Set(); adjSets.set(a, sa); }
        sa.add(b);
        let sb = adjSets.get(b);
        if (!sb) { sb = new Set(); adjSets.set(b, sb); }
        sb.add(a);
    };

    if (faction !== undefined && osidAdjacency !== undefined) {
        // Triple-junction connectivity: follow the front line, not territory BFS.
        const friendlyToEdges = new Map<string, string[]>();
        const hostileToEdges = new Map<string, string[]>();
        const edgeHostile = new Map<string, string>();
        const edgeFriendly = new Map<string, string>();

        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            let friendly: string, hostile: string;
            if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
            else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
            else continue;

            edgeFriendly.set(eid, friendly);
            edgeHostile.set(eid, hostile);

            let list = friendlyToEdges.get(friendly);
            if (!list) { list = []; friendlyToEdges.set(friendly, list); }
            list.push(eid);

            list = hostileToEdges.get(hostile);
            if (!list) { list = []; hostileToEdges.set(hostile, list); }
            list.push(eid);
        }

        // Both Case A and Case B use sharedBoundaryAdj to require true shared
        // polygon boundaries (not distance contacts). Without this, degenerate
        // triple junctions through near-miss polygon adjacency bridge disconnected
        // front segments (e.g. Srebrenica ↔ Cerska via distance_contact hostiles).
        const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

        // Case A: same friendly OSID, hostile OSIDs share a true boundary.
        // Front turns along the friendly polygon boundary at a triple junction.
        for (const edges of friendlyToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const hi = edgeHostile.get(edges[i]!)!;
                for (let j = i + 1; j < edges.length; j++) {
                    const hj = edgeHostile.get(edges[j]!)!;
                    if (isOsidAdjacent(hi, hj, caseAdj)) {
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }

        // Case B: same hostile OSID, friendly OSIDs share a true boundary.
        // Front turns along the hostile polygon boundary at a triple junction.
        for (const edges of hostileToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const fi = edgeFriendly.get(edges[i]!)!;
                for (let j = i + 1; j < edges.length; j++) {
                    const fj = edgeFriendly.get(edges[j]!)!;
                    if (isOsidAdjacent(fi, fj, caseAdj)) {
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }
    } else {
        // No faction/adjacency: group by shared OSID only (decompose/bisect paths).
        const osidToEdges = new Map<string, string[]>();
        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            for (const osid of [meta.a, meta.b]) {
                let list = osidToEdges.get(osid);
                if (!list) { list = []; osidToEdges.set(osid, list); }
                list.push(eid);
            }
        }
        for (const edges of osidToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                for (let j = i + 1; j < edges.length; j++) {
                    link(edges[i]!, edges[j]!);
                }
            }
        }
    }

    // Convert Sets to sorted arrays
    const adj = new Map<string, string[]>();
    for (const [k, s] of adjSets) {
        adj.set(k, [...s].sort(strictCompare));
    }
    return adj;
}


/** Check if two OSIDs are adjacent in the OSID adjacency map. */
function isOsidAdjacent(a: Osid, b: Osid, adj: Map<Osid, Osid[]>): boolean {
    return (adj.get(a) ?? []).includes(b);
}

/**
 * Get sorted list of active corps formation IDs for a faction.
 */
function getCorpsForFaction(
    formations: Record<FormationId, FormationState>,
    faction: FactionId
): FormationId[] {
    return Object.keys(formations)
        .sort(strictCompare)
        .filter(fid => {
            const f = formations[fid];
            return f && f.faction === faction && f.status === 'active'
                && (f.kind === 'corps' || f.kind === 'corps_asset');
        });
}

/**
 * Get sorted list of faction IDs in the game.
 */
function getFactions(state: GameState): FactionId[] {
    return (state.factions ?? []).map(f => f.id).sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sector-Aware Brigade Assignment
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// Exported query helpers for attack resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the sector that DEFENDS targetOsid via sector-coverage when no brigade
 * is physically there.  That is the defender-faction sector whose sub-segment
 * lists targetOsid as a **friendly** OSID (= the sector that owns the territory).
 *
 * Previous implementation searched enemy_osids, which returned the attacker's
 * sector instead of the defender's — making the predictor treat the attacker's
 * own brigades as defenders (blocking attacks against truly undefended OSIDs).
 *
 * Returns the first matching sector in deterministic sector_id order, or null.
 */
export function findSectorForEnemyOsid(
    state: GameState,
    targetOsid: string,
    defenderFaction?: string | null,
): CorpsFrontSector | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;
    // First pass: check front-edge friendly_osids (primary — direct front defense)
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        for (const sub of sector.sub_segments) {
            if (sub.friendly_osids.includes(targetOsid)) return sector;
        }
    }
    // Second pass: check territory_osids (fallback — depth territory claimed by post-Voronoi sweep)
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        if (sector.territory_osids?.includes(targetOsid)) return sector;
    }
    return null;
}

/**
 * Get the corps HQ OSID for the brigade's corps — used as rout destination when
 * a sector-coverage defender has no valid retreat path after a flip.
 * Returns null if no corps formation is found or it has no location_osid.
 */
export function getCorpsHqOsid(
    state: GameState,
    formation: FormationState
): string | null {
    const corpsId = getFormationCorpsId(formation);
    if (!corpsId) return null;
    const corpsFormation = state.military.formations?.[corpsId];
    if (!corpsFormation) return null;
    return (corpsFormation as FormationState & { location_osid?: string }).location_osid ?? null;
}
