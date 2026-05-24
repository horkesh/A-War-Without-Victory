import { AdjacencyMap } from '../map/adjacency_map.js';
import { GameState } from './game_state.js';
import { getSettlementControlStatus } from './settlement_control.js';


export interface FactionSupplyReachability {
    faction_id: string;
    sources: string[]; // sorted unique
    controlled: string[]; // sorted unique (AoR)
    reachable_controlled: string[]; // sorted
    isolated_controlled: string[]; // sorted (controlled minus reachable)
    // Phase 12C.3: Supply rights usage
    rights_edges_used_count?: number;
    rights_nodes_used_count?: number;
    corridors_active_count?: number;
    // H7.x: edges traversed in BFS (supply corridor derivation)
    edges_used: string[]; // edge_id format "sid1__sid2", sorted
}

export interface SupplyReachabilityReport {
    schema: 1;
    turn: number;
    factions: FactionSupplyReachability[]; // sorted by faction_id asc
}

// --- Shared BFS core (used by both SID and OSID variants) ---

export interface SupplyBfsParams {
    /** Controlled nodes for the report (reachable = controlled ∩ visited) */
    controlled: string[];
    /** Supply source nodes */
    sources: string[];
    /** Returns true if the node can be traversed in normal (non-corridor) BFS */
    isTraversable: (node: string) => boolean;
    /** Returns neighbor list for a node */
    getNeighbors: (node: string) => string[];
    /** Optional: corridor traversal check (SID variant supply rights) */
    canTraverseCorridor?: (edgeId: string, neighbor: string) => { edge: boolean; node: boolean };
}

export interface SupplyBfsResult {
    reachable: string[];   // sorted: controlled ∩ visited
    isolated: string[];    // sorted: controlled - visited
    edgesUsed: string[];   // sorted edge IDs "a__b"
    rightsEdgesUsed: number;
    rightsNodesUsed: number;
}

/**
 * Generic BFS for supply reachability, shared by SID and OSID implementations.
 * Deterministic: sorted iteration, no randomness.
 */
export function runSupplyBfs(params: SupplyBfsParams): SupplyBfsResult {
    const { controlled, sources, isTraversable, getNeighbors, canTraverseCorridor } = params;
    const visited = new Set<string>();
    const edgesUsed = new Set<string>();
    const queue: string[] = [];
    let rightsEdgesUsed = 0;
    let rightsNodesUsed = 0;

    // Seed BFS from traversable sources
    for (const source of sources) {
        if (isTraversable(source) && !visited.has(source)) {
            visited.add(source);
            queue.push(source);
        }
    }

    // BFS: traverse controlled neighbors + optional corridor edges
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++]!;
        for (const neighbor of getNeighbors(current)) {
            if (visited.has(neighbor)) continue;
            const edgeId = current < neighbor ? `${current}__${neighbor}` : `${neighbor}__${current}`;

            if (isTraversable(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
                edgesUsed.add(edgeId);
            } else if (canTraverseCorridor) {
                const c = canTraverseCorridor(edgeId, neighbor);
                if (c.edge || c.node) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                    edgesUsed.add(edgeId);
                    if (c.edge) rightsEdgesUsed++;
                    if (c.node) rightsNodesUsed++;
                }
            }
        }
    }

    return {
        reachable: controlled.filter(n => visited.has(n)),
        isolated: controlled.filter(n => !visited.has(n)),
        edgesUsed: [...edgesUsed].sort((a, b) => a.localeCompare(b)),
        rightsEdgesUsed,
        rightsNodesUsed,
    };
}

/**
 * Terrain scalars (H6.6-PREP): In a future phase, terrain scalars (e.g. road_access_index,
 * terrain_friction_index) MAY be consumed to modulate edge traversal or supply effectiveness.
 * They are currently INERT; no terrain data is read or applied.
 */

/**
 * Computes supply reachability for all factions.
 * 
 * Rules:
 * - controlled set for a faction = unique AoR sids
 * - sources set for a faction = unique supply_sources sids
 * - BFS starting from sources, but traversal is restricted to settlements controlled by that faction:
 *   - you can traverse from a controlled node to a neighbor only if neighbor is also controlled
 * - Phase 12C.3: Supply rights allow traversal through corridor scopes even if not controlled
 *   - Corridor edges/nodes can be traversed for supply, but endpoints are NOT treated as controlled
 * - reachable_controlled = controlled ∩ visited
 * - isolated_controlled = controlled - reachable_controlled
 * 
 * Edge cases:
 * - if sources is empty => reachable_controlled empty, isolated_controlled = controlled
 * - if a source sid is not controlled by the faction, still treat it as a starting point ONLY if it is controlled;
 *   otherwise ignore it (report still lists it in sources, but BFS seed excludes it)
 */
export function computeSupplyReachability(
    state: GameState,
    adjacencyMap: AdjacencyMap
): SupplyReachabilityReport {
    const turn = state.meta.turn;
    const factions = [...(state.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));

    // Phase 12C.3: Build active corridor rights by beneficiary
    const activeCorridorsByBeneficiary = new Map<string, Array<{ scope: { kind: 'region'; region_id: string } | { kind: 'edges'; edge_ids: string[] } | { kind: 'settlements'; sids: string[] }; edgeIds: Set<string>; nodeIds: Set<string> }>>();
    if (state.political.supply_rights?.corridors) {
        for (const corridor of state.political.supply_rights.corridors) {
            // Check if corridor is active (not expired)
            if (corridor.until_turn !== null && corridor.until_turn <= turn) {
                continue; // expired
            }
            if (corridor.since_turn > turn) {
                continue; // not yet active
            }

            // Convert scope to edge IDs and node IDs for traversal
            const edgeIds = new Set<string>();
            const nodeIds = new Set<string>();

            if (corridor.scope.kind === 'edges') {
                for (const edgeId of corridor.scope.edge_ids) {
                    edgeIds.add(edgeId);
                    // Parse edge_id format: "sid1__sid2" (normalized, a < b)
                    const parts = edgeId.split('__');
                    if (parts.length === 2) {
                        nodeIds.add(parts[0]);
                        nodeIds.add(parts[1]);
                    }
                }
            } else if (corridor.scope.kind === 'settlements') {
                for (const sid of corridor.scope.sids) {
                    nodeIds.add(sid);
                    // Find all edges connected to this settlement
                    const neighbors = adjacencyMap[sid] ?? [];
                    for (const neighbor of neighbors) {
                        const edgeId = sid < neighbor ? `${sid}__${neighbor}` : `${neighbor}__${sid}`;
                        edgeIds.add(edgeId);
                    }
                }
            } else if (corridor.scope.kind === 'region') {
                // For region scope, we need front regions to resolve edge IDs
                // For now, we'll skip region-based corridors in reachability (they require front regions)
                // This is acceptable as region corridors are less common
                continue;
            }

            if (!activeCorridorsByBeneficiary.has(corridor.beneficiary)) {
                activeCorridorsByBeneficiary.set(corridor.beneficiary, []);
            }
            activeCorridorsByBeneficiary.get(corridor.beneficiary)!.push({
                scope: corridor.scope,
                edgeIds,
                nodeIds
            });
        }
    }

    const factionResults: FactionSupplyReachability[] = [];

    for (const faction of factions) {
        // Get controlled settlements (unique, sorted)
        const controlled = [...new Set(faction.areasOfResponsibility ?? [])].sort();

        // Get sources (unique, sorted)
        const sourcesRaw = faction.supply_sources ?? [];
        const sources = [...new Set(sourcesRaw)].sort();

        // Build controlled set for quick lookup
        const controlledSet = new Set(controlled);

        // Phase 12C.3: Get active corridors for this beneficiary
        const activeCorridors = activeCorridorsByBeneficiary.get(faction.id) ?? [];
        const allowedEdges = new Set<string>();
        const allowedNodes = new Set<string>();
        for (const corridor of activeCorridors) {
            for (const edgeId of corridor.edgeIds) {
                allowedEdges.add(edgeId);
            }
            for (const nodeId of corridor.nodeIds) {
                allowedNodes.add(nodeId);
            }
        }

        // Traversal check: AoR membership + political control
        const isTraversable = (node: string): boolean => {
            if (!controlledSet.has(node)) return false;
            const status = getSettlementControlStatus(state, node);
            return status.kind === 'known' && status.side === faction.id;
        };

        // Corridor traversal adapter (Phase 12C.3 supply rights)
        const corridorCheck = (allowedEdges.size > 0 || allowedNodes.size > 0)
            ? (edgeId: string, neighbor: string) => ({
                edge: allowedEdges.has(edgeId),
                node: allowedNodes.has(neighbor),
            })
            : undefined;

        const bfs = runSupplyBfs({
            controlled,
            sources,
            isTraversable,
            getNeighbors: (node) => adjacencyMap[node] ?? [],
            canTraverseCorridor: corridorCheck,
        });

        factionResults.push({
            faction_id: faction.id,
            sources,
            controlled,
            reachable_controlled: bfs.reachable,
            isolated_controlled: bfs.isolated,
            rights_edges_used_count: bfs.rightsEdgesUsed,
            rights_nodes_used_count: bfs.rightsNodesUsed,
            corridors_active_count: activeCorridors.length,
            edges_used: bfs.edgesUsed
        });
    }

    return {
        schema: 1,
        turn,
        factions: factionResults
    };
}
