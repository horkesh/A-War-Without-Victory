/**
 * War phase: OSID-native column (undeployed) movement.
 *
 * Terrain-weighted multi-hop movement for brigades redeploying through rear areas.
 * Column brigades cannot fight but move faster than deployed brigades.
 *
 * Flow:
 *   1. Bot AI writes column march order: { destination_sids: [target], stance: 'column' }
 *   2. This step detects 'column' stance, computes Dijkstra path through friendly OSIDs
 *   3. Sets brigade_movement_state: { status: 'in_transit', stance: 'column', turns_remaining, path }
 *   4. Each turn, decrements turns_remaining; brigade skips bot orders while in transit
 *   5. On arrival (turns_remaining ≤ 0) → set location_osid, mark deployed, reset entrenchment
 *
 * Movement rates by composition:
 *   - Heavy (VRS): 2 budget/turn — road-dependent, slower column
 *   - Mixed (HVO): 3 budget/turn — balanced
 *   - Light (ARBiH): 4 budget/turn — faster through any terrain
 *
 * Terrain cost per OSID edge: ~0.6 (flat, good roads) to ~3.5 (steep mountains, no roads, river)
 *
 * Deterministic: sorted iteration, Dijkstra with stable tie-breaking, no randomness.
 * Canon: Brigade Movement & Initial Placement Overhaul plan §Part 2.
 */

import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getTerrainScalarsForSid, type TerrainScalars } from '../../map/terrain_scalars.js';
import type { FactionId, FormationId, FormationState, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { ensureBrigadeComposition } from './equipment_effects.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base OSID column movement budget per turn (mixed composition). */
export const OSID_COLUMN_BASE_RATE = 3;

// ═══════════════════════════════════════════════════════════════════════════
// Terrain-weighted edge cost
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Average terrain scalars across all canonical SIDs that map to an OSID.
 * Returns default scalars if OSID has no canonical mappings.
 */
export function averageTerrainForOsid(
    osid: Osid,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData: TerrainScalarsData
): TerrainScalars {
    const sids = reverseMap.get(osid);
    if (!sids || sids.length === 0) {
        return {
            road_access_index: 0.5,
            river_crossing_penalty: 0,
            elevation_mean_m: 200,
            elevation_stddev_m: 10,
            slope_index: 0.1,
            terrain_friction_index: 0.1
        };
    }
    let road = 0, river = 0, elevation = 0, elevStddev = 0, slope = 0, friction = 0;
    for (const sid of sids) {
        const t = getTerrainScalarsForSid(terrainData, sid);
        road += t.road_access_index;
        river += t.river_crossing_penalty;
        elevation += t.elevation_mean_m;
        elevStddev += t.elevation_stddev_m;
        slope += t.slope_index;
        friction += t.terrain_friction_index;
    }
    const n = sids.length;
    return {
        road_access_index: road / n,
        river_crossing_penalty: river / n,
        elevation_mean_m: elevation / n,
        elevation_stddev_m: elevStddev / n,
        slope_index: slope / n,
        terrain_friction_index: friction / n
    };
}

/**
 * Terrain-weighted OSID edge movement cost for column transit.
 *
 * Factors:
 *   - Road quality (lower cost on good roads)
 *   - Slope/mountains (higher cost)
 *   - Terrain friction (forests, rough ground)
 *   - River crossings
 *   - Uphill penalty
 *
 * Range: ~0.6 (flat, good roads) to ~3.5 (steep mountains, no roads, river crossing).
 */
export function getOsidEdgeMovementCost(
    fromOsid: Osid,
    toOsid: Osid,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData: TerrainScalarsData
): number {
    const fromScalars = averageTerrainForOsid(fromOsid, reverseMap, terrainData);
    const toScalars = averageTerrainForOsid(toOsid, reverseMap, terrainData);

    // Road bonus: good roads reduce cost
    const roadAvg = (fromScalars.road_access_index + toScalars.road_access_index) / 2;
    const roadFactor = 1.0 - roadAvg * 0.4; // [0.6 – 1.0]; good roads = 0.6x cost

    // Terrain penalty: mountains, forests increase cost
    const slopeFactor = 1.0 + ((fromScalars.slope_index + toScalars.slope_index) / 2) * 0.8;
    const frictionFactor = 1.0 + ((fromScalars.terrain_friction_index + toScalars.terrain_friction_index) / 2) * 0.6;

    // River crossing penalty (use max — one river crossing between the two OSIDs dominates)
    const riverPenalty = Math.max(fromScalars.river_crossing_penalty, toScalars.river_crossing_penalty) * 0.5;

    // Uphill penalty (significant elevation gain)
    const uphillM = Math.max(0, toScalars.elevation_mean_m - fromScalars.elevation_mean_m);
    const uphillFactor = 1.0 + uphillM / 500;

    return roadFactor * slopeFactor * frictionFactor * uphillFactor + riverPenalty;
}

// ═══════════════════════════════════════════════════════════════════════════
// Column movement rate by composition
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Column movement budget per turn, adjusted by composition.
 * Heavy equipment = road-dependent = slower column; light infantry = faster.
 *
 * | heavyShare | Rate | Typical faction |
 * |-----------|------|-----------------|
 * | > 0.05    |  2   | RS              |
 * | < 0.015   |  4   | RBiH            |
 * | else      |  3   | HRHB            |
 */
export function getOsidColumnRate(formation: FormationState): number {
    const comp = ensureBrigadeComposition(formation);
    const total = Math.max(1, comp.infantry + comp.tanks + comp.artillery + (comp.aa_systems ?? 0));
    const heavyShare = (comp.tanks + comp.artillery) / total;

    if (heavyShare > 0.05) return 2;   // Heavy mech: slower column, road-dependent
    if (heavyShare < 0.015) return 4;  // Light infantry: faster column through any terrain
    return OSID_COLUMN_BASE_RATE;       // Mixed: base rate
}

// ═══════════════════════════════════════════════════════════════════════════
// Dijkstra pathfinding through friendly OSIDs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dijkstra shortest path from source OSID to destination OSID through friendly territory,
 * using terrain-weighted edge costs.
 *
 * Returns: { path: Osid[], totalCost: number } or null if unreachable.
 * path includes both source and destination.
 *
 * Deterministic: priority queue tie-breaks by OSID sort order.
 */
export function dijkstraFriendlyPath(
    fromOsid: Osid,
    toOsid: Osid,
    factionId: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData: TerrainScalarsData
): { path: Osid[]; totalCost: number } | null {
    if (fromOsid === toOsid) return { path: [fromOsid], totalCost: 0 };

    // Simple priority queue via sorted array (sufficient for 753-node graph)
    const dist = new Map<Osid, number>();
    const parent = new Map<Osid, Osid>();
    const visited = new Set<Osid>();

    dist.set(fromOsid, 0);

    // Queue entries: [cost, osid]
    const queue: Array<[number, Osid]> = [[0, fromOsid]];

    while (queue.length > 0) {
        // Find minimum cost entry (deterministic: tie-break by OSID sort)
        let minIdx = 0;
        for (let i = 1; i < queue.length; i++) {
            const [costA, osidA] = queue[minIdx]!;
            const [costB, osidB] = queue[i]!;
            if (costB < costA || (costB === costA && strictCompare(osidB, osidA) < 0)) {
                minIdx = i;
            }
        }
        const [currentCost, current] = queue.splice(minIdx, 1)[0]!;

        if (visited.has(current)) continue;
        visited.add(current);

        if (current === toOsid) {
            // Reconstruct path
            const path: Osid[] = [];
            let node: Osid | undefined = toOsid;
            while (node !== undefined) {
                path.unshift(node);
                node = parent.get(node);
            }
            return { path, totalCost: currentCost };
        }

        const neighbors = adjacency.get(current) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            // Traverse through friendly or unoccupied territory (or the destination itself)
            const controller = getPoliticalControllerOSID(state, n, reverseMap);
            if (controller !== factionId && controller !== null && n !== toOsid) continue;

            const edgeCost = getOsidEdgeMovementCost(current, n, reverseMap, terrainData);
            const newCost = currentCost + edgeCost;
            const oldCost = dist.get(n);

            if (oldCost === undefined || newCost < oldCost) {
                dist.set(n, newCost);
                parent.set(n, current);
                queue.push([newCost, n]);
            }
        }
    }

    return null; // Unreachable
}

// ═══════════════════════════════════════════════════════════════════════════
// OSID column movement step
// ═══════════════════════════════════════════════════════════════════════════

export interface OsidColumnMovementReport {
    /** Brigades that started column transit this turn. */
    column_starts: number;
    /** Brigades that advanced in column this turn (decremented turns_remaining). */
    column_advances: number;
    /** Brigades that arrived at destination this turn. */
    column_arrivals: number;
    /** Brigades whose column order was blocked (no path, not friendly, etc.). */
    column_blocked: number;
}

/**
 * Process OSID column movement orders and advance in-transit brigades.
 *
 * Pass 1: Advance existing column transits (decrement turns_remaining, arrive at destination).
 * Pass 2: Process new column march orders (compute path, set in_transit).
 *
 * Pass order matters: advance FIRST, then start new. This way new orders don't get
 * an immediate advance on the same turn they're issued (realistic 1-turn delay).
 *
 * Mutates: state.formations[*].location_osid, state.brigade_movement_state, state.military.brigade_movement_orders.
 * Deterministic: formations processed in sorted ID order.
 */
export function processOsidColumnMovement(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData: TerrainScalarsData
): OsidColumnMovementReport {
    const report: OsidColumnMovementReport = {
        column_starts: 0,
        column_advances: 0,
        column_arrivals: 0,
        column_blocked: 0
    };
    const formations = state.military.formations ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const movementOrders = state.military.brigade_movement_orders ?? {};
    if (!state.military.brigade_movement_state) state.military.brigade_movement_state = {};
    const movementState = state.military.brigade_movement_state;

    // Pass 1: Advance existing column transits (before processing new orders)
    const transitIds = Object.keys(movementState).sort(strictCompare) as FormationId[];
    for (const formationId of transitIds) {
        const ms = movementState[formationId];
        if (!ms || ms.stance !== 'column' || ms.status !== 'in_transit') continue;

        const f = formations[formationId];
        if (!f || f.status !== 'active') {
            delete movementState[formationId];
            continue;
        }

        const remaining = (ms.turns_remaining ?? 1) - 1;

        if (remaining <= 0) {
            // Arrived at destination — only complete move if destination is still friendly
            const dest = ms.destination_sids?.[0];
            const factionId = f.faction as FactionId;
            const destController = dest ? getPoliticalControllerOSID(state, dest, reverseMap) : null;
            if (dest && (destController === factionId || destController === null)) {
                (f as { location_osid?: string }).location_osid = dest;
                (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
                report.column_arrivals += 1;
            } else if (dest && (ms.path?.length ?? 0) >= 2) {
                // Destination flipped to enemy: stop at previous step on path (friendly when we left)
                const prevStep = ms.path![ms.path!.length - 2];
                (f as { location_osid?: string }).location_osid = prevStep;
                (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
                report.column_arrivals += 1;
            }
            delete movementState[formationId];
        } else {
            movementState[formationId] = { ...ms, turns_remaining: remaining };
            report.column_advances += 1;
        }
    }

    // Pass 2: Process new column march orders
    const orderIds = Object.keys(movementOrders).sort(strictCompare) as FormationId[];
    for (const formationId of orderIds) {
        const order = movementOrders[formationId] as { destination_sids?: string[]; stance?: string } | undefined;
        if (!order || order.stance !== 'column') continue;

        const f = formations[formationId];
        if (!f || f.status !== 'active') {
            delete movementOrders[formationId];
            continue;
        }
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') {
            delete movementOrders[formationId];
            continue;
        }

        // dig_in lockout: brigades actively fortifying cannot be ordered to move
        if (f.posture === 'dig_in') {
            report.column_blocked += 1;
            delete movementOrders[formationId];
            continue;
        }

        const loc = (f as { location_osid?: string }).location_osid as Osid | undefined;
        if (!loc) {
            delete movementOrders[formationId];
            continue;
        }

        const destOsid = order.destination_sids?.[0] as Osid | undefined;
        if (!destOsid || destOsid === loc) {
            delete movementOrders[formationId];
            continue;
        }

        const factionId = f.faction as FactionId;

        // Compute terrain-weighted path through friendly territory
        const result = dijkstraFriendlyPath(loc, destOsid, factionId, adjacency, state, reverseMap, terrainData);
        if (!result || result.path.length <= 1) {
            report.column_blocked += 1;
            delete movementOrders[formationId];
            continue;
        }

        // Calculate transit turns from path cost and column rate
        const columnRate = getOsidColumnRate(f);
        const transitTurns = Math.max(1, Math.ceil(result.totalCost / columnRate));

        // Set column transit state
        movementState[formationId] = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: [destOsid],
            path: result.path,
            turns_remaining: transitTurns
        };

        // Remove consumed order
        delete movementOrders[formationId];
        report.column_starts += 1;
    }

    // Update state — clean up empty movement state
    if (Object.keys(movementState).length === 0) {
        state.military.brigade_movement_state = undefined;
    }

    return report;
}
