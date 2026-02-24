/**
 * Phase II: Zone of Control (ZoC) for HoI-style OSID model.
 *
 * ZoC = set of adjacent OSIDs (from operational_contact_graph).
 * Only deployed brigades (movement_state === 'deployed') project ZoC.
 * A brigade is ZoC-locked if its location_osid is in the ZoC of any enemy brigade.
 *
 * Linked ZoC: when two or more friendly brigades' ZoC connect through the OSID
 * adjacency graph (brigade → zoc → zoc → brigade), all intermediate ZoC OSIDs
 * form a "linked front" that blocks enemy movement. This models the extended
 * frontline between brigades: enemies cannot slip through the gap when brigades
 * are close enough for their control zones to chain together.
 *
 * Determinism: stable ordering (sorted formation IDs, OSIDs); no randomness.
 * Canon: docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';

export type Osid = string;

/**
 * Build OSID → sorted list of adjacent OSIDs from edge list.
 * Determinism: each neighbor list is sorted with localeCompare.
 */
export function buildOsidAdjacency(edges: EdgeRecord[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const e of edges) {
        if (!e?.a || !e?.b) continue;
        const listA = adj.get(e.a) ?? [];
        if (!listA.includes(e.b)) listA.push(e.b);
        adj.set(e.a, listA);
        const listB = adj.get(e.b) ?? [];
        if (!listB.includes(e.a)) listB.push(e.a);
        adj.set(e.b, listB);
    }
    for (const list of adj.values()) list.sort(strictCompare);
    return adj;
}

/** Brigade is deployed if movement_state (from brigade_movement_state) is 'deployed' or absent. */
export function isBrigadeDeployed(state: GameState, formationId: FormationId): boolean {
    const status = state.brigade_movement_state?.[formationId]?.status;
    return status === 'deployed' || status === undefined;
}

/**
 * Set of OSIDs that lie in the ZoC of any enemy brigade for the given faction
 * (adjacent to at least one deployed brigade of another faction).
 * Used to test ZoC-lock: our brigade at O is locked iff O is in this set.
 */
export function computeEnemyZocOsidsForFaction(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    factionId: FactionId
): Set<Osid> {
    const formations = state.formations ?? {};
    const enemyZoc = new Set<Osid>();
    for (const [, f] of Object.entries(formations)) {
        if (f.faction === factionId) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        if (!isBrigadeDeployed(state, f.id)) continue;
        const neighbors = adjacency.get(loc);
        if (!neighbors) continue;
        for (const n of neighbors) enemyZoc.add(n);
    }
    return enemyZoc;
}

/**
 * All OSIDs that are in ZoC of any deployed brigade (any faction).
 * Convenience when you need a single set for "is this OSID in any enemy ZoC" per formation (use faction of formation).
 */
export function computeEnemyZocOsids(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    brigadeFactionId: FactionId
): Set<Osid> {
    return computeEnemyZocOsidsForFaction(state, adjacency, brigadeFactionId);
}

// ═══════════════════════════════════════════════════════════════════════════
// Linked ZoC: extended frontline between friendly brigades
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the "linked ZoC" for a faction: ZoC OSIDs that form a connected front
 * between two or more friendly brigades. Enemy brigades cannot move into these OSIDs.
 *
 * A ZoC OSID is "linked" when it belongs to a connected component (in the
 * adjacency graph restricted to ZoC ∪ brigade-occupied OSIDs) that contains
 * at least two distinct brigade-occupied OSIDs.
 *
 * This models the historical reality that ground between two deployed brigades
 * within mutual ZoC range is effectively controlled: the enemy cannot simply
 * walk through the gap. When the ZoC chain is broken (brigades too far apart),
 * the gap is open and enemy movement is unrestricted.
 *
 * Example (4-node chain): A → A_zoc → B_zoc → B
 * A and B are brigade OSIDs; A_zoc and B_zoc are in the linked ZoC set.
 * Enemies cannot enter A_zoc or B_zoc — they must attack A or B directly.
 *
 * Determinism: BFS with sorted expansion, sorted component collection.
 */
export function computeLinkedZocForFaction(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    factionId: FactionId
): Set<Osid> {
    const formations = state.formations ?? {};
    const linkedZoc = new Set<Osid>();

    // Step 1: Collect all deployed brigade OSIDs for this faction
    const brigadeOsids = new Set<Osid>();
    for (const [, f] of Object.entries(formations)) {
        if (f.faction !== factionId) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        if (!isBrigadeDeployed(state, f.id)) continue;
        brigadeOsids.add(loc);
    }

    if (brigadeOsids.size < 2) return linkedZoc; // Need 2+ brigades to link

    // Step 2: Compute ZoC OSIDs for this faction (neighbors of brigade OSIDs)
    const zocOsids = new Set<Osid>();
    for (const bLoc of brigadeOsids) {
        const neighbors = adjacency.get(bLoc);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!brigadeOsids.has(n)) { // Don't count brigade positions as ZoC
                zocOsids.add(n);
            }
        }
    }

    // Step 3: Build the "ZoC subgraph" — OSIDs that are either brigade-occupied or in ZoC
    const zocSubgraph = new Set<Osid>();
    for (const o of brigadeOsids) zocSubgraph.add(o);
    for (const o of zocOsids) zocSubgraph.add(o);

    // Step 4: Find connected components via BFS through the ZoC subgraph
    const visited = new Set<Osid>();
    const sortedSubgraph = [...zocSubgraph].sort(strictCompare);

    for (const startOsid of sortedSubgraph) {
        if (visited.has(startOsid)) continue;

        // BFS to find this connected component
        const component: Osid[] = [];
        let brigadesInComponent = 0;
        const queue: Osid[] = [startOsid];
        visited.add(startOsid);

        while (queue.length > 0) {
            const current = queue.shift()!;
            component.push(current);
            if (brigadeOsids.has(current)) brigadesInComponent++;

            const neighbors = adjacency.get(current) ?? [];
            for (const n of neighbors) {
                if (visited.has(n)) continue;
                if (!zocSubgraph.has(n)) continue; // Only traverse within ZoC subgraph
                visited.add(n);
                queue.push(n);
            }
        }

        // Step 5: If component has 2+ brigades, all ZoC OSIDs in it are "linked"
        if (brigadesInComponent >= 2) {
            for (const osid of component) {
                if (zocOsids.has(osid)) { // Only ZoC OSIDs, not brigade positions
                    linkedZoc.add(osid);
                }
            }
        }
    }

    return linkedZoc;
}

/**
 * Compute linked ZoC per faction: which OSIDs are blocked by each faction's
 * connected brigade chains. Returns the set of OSIDs that block ENEMIES of
 * each faction (i.e., linkedZocBlockingByFaction.get('RS') = OSIDs that RS
 * brigades' linked ZoC blocks — enemies of RS cannot enter these).
 */
export function computeLinkedZocByFaction(
    state: GameState,
    adjacency: Map<Osid, Osid[]>
): Map<FactionId, Set<Osid>> {
    const result = new Map<FactionId, Set<Osid>>();
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare) as FactionId[];
    for (const fid of factions) {
        result.set(fid, computeLinkedZocForFaction(state, adjacency, fid));
    }
    return result;
}

/** True if the brigade's location_osid is in any enemy ZoC (ZoC-locked). */
export function isBrigadeInEnemyZoc(
    state: GameState,
    formationId: FormationId,
    enemyZocOsids: Set<Osid>
): boolean {
    const f = state.formations?.[formationId];
    if (!f) return false;
    const loc = (f as { location_osid?: string }).location_osid;
    return loc != null && enemyZocOsids.has(loc);
}

/**
 * Compute ZoC state for the turn: adjacency, per-faction enemy ZoC, and linked ZoC.
 * Call once per turn for movement/attack steps.
 *
 * linkedZocByFaction: for each faction F, the set of OSIDs that F's brigades
 * project as linked ZoC (connected chain between 2+ brigades). These block
 * enemy movement — an enemy of F cannot enter any OSID in this set.
 */
export function computeZoCState(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): {
    adjacency: Map<Osid, Osid[]>;
    enemyZocByFaction: Map<FactionId, Set<Osid>>;
    linkedZocByFaction: Map<FactionId, Set<Osid>>;
} {
    const adjacency = buildOsidAdjacency(edges);
    const enemyZocByFaction = new Map<FactionId, Set<Osid>>();
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare) as FactionId[];
    for (const fid of factions) {
        enemyZocByFaction.set(fid, computeEnemyZocOsidsForFaction(state, adjacency, fid));
    }
    const linkedZocByFaction = computeLinkedZocByFaction(state, adjacency);
    return { adjacency, enemyZocByFaction, linkedZocByFaction };
}

/**
 * Count of adjacent OSIDs that are enemy-controlled (or in enemy ZoC from another source).
 * Used for retreat tie-break: prefer fewer enemy adjacencies.
 */
function countEnemyAdjacentOsids(
    osid: Osid,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    factionId: FactionId
): number {
    const neighbors = adjacency.get(osid) ?? [];
    let count = 0;
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c !== null && c !== factionId) count += 1;
    }
    return count;
}

/**
 * Valid retreat destinations for a brigade: friendly OSIDs adjacent to current.
 * Prefer: not in enemy ZoC; tie-break: enemy adjacency count (asc), then OSID sort.
 * Deterministic.
 */
export function getValidRetreatDestinations(
    state: GameState,
    formationId: FormationId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    enemyZocOsids: Set<Osid>
): Osid[] {
    const f = state.formations?.[formationId];
    if (!f) return [];
    const loc = (f as { location_osid?: string }).location_osid;
    const factionId = f.faction as FactionId;
    if (!loc) return [];
    const neighbors = adjacency.get(loc) ?? [];
    const friendly: Osid[] = [];
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c === factionId) friendly.push(n);
    }
    const inEnemyZoc = (o: Osid) => enemyZocOsids.has(o);
    const enemyAdjCount = (o: Osid) => countEnemyAdjacentOsids(o, adjacency, state, reverseMap, factionId);
    friendly.sort((a, b) => {
        const aInZoc = inEnemyZoc(a) ? 1 : 0;
        const bInZoc = inEnemyZoc(b) ? 1 : 0;
        if (aInZoc !== bInZoc) return aInZoc - bInZoc;
        const aAdj = enemyAdjCount(a);
        const bAdj = enemyAdjCount(b);
        if (aAdj !== bAdj) return aAdj - bAdj;
        return strictCompare(a, b);
    });
    return friendly;
}
