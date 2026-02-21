import type { EdgeRecord } from '../../map/settlements.js';
import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import type { FactionId, FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    COLUMN_BASE_MOVEMENT_RATE,
    COLUMN_MAX_MOVEMENT_RATE,
    COLUMN_MIN_MOVEMENT_RATE,
    MOVEMENT_RATE,
    shortestPathThroughFriendly,
    transitTurnsForPath,
} from './brigade_movement.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';

export interface MovementRangeQuery {
    start_sid: SettlementId | null;
    reachable_deployed: SettlementId[];
    reachable_column: SettlementId[];
}

export interface MovementPathQuery {
    path: SettlementId[];
    eta_turns: number;
    terrain_costs: number[];
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function getStartSid(state: GameState, brigadeId: FormationId): SettlementId | null {
    const aor = getBrigadeAoRSettlements(state, brigadeId);
    if (aor.length > 0) return aor[0]!;
    const formation = state.formations?.[brigadeId];
    return formation?.hq_sid ?? null;
}

function getColumnMovementRate(state: GameState, brigadeId: FormationId): number {
    const formation = state.formations?.[brigadeId];
    const c = formation?.composition;
    if (!c) return COLUMN_BASE_MOVEMENT_RATE;
    const infantry = Math.max(0, c.infantry ?? 0);
    const tanks = Math.max(0, c.tanks ?? 0);
    const artillery = Math.max(0, c.artillery ?? 0);
    const aa = Math.max(0, c.aa_systems ?? 0);
    const denominator = Math.max(1, infantry + tanks + artillery + aa);
    const heavyShare = (tanks + artillery + 0.5 * aa) / denominator;
    const infantryBonus = clamp(infantry / 2200, 0, 1);
    const rawRate = COLUMN_BASE_MOVEMENT_RATE - Math.round(heavyShare * 4) + infantryBonus;
    return Math.round(clamp(rawRate, COLUMN_MIN_MOVEMENT_RATE, COLUMN_MAX_MOVEMENT_RATE));
}

function getColumnEdgeCost(
    fromSid: SettlementId,
    toSid: SettlementId,
    terrainData: TerrainScalarsData
): number {
    const from = getTerrainScalarsForSid(terrainData, fromSid);
    const to = getTerrainScalarsForSid(terrainData, toSid);
    const roadAccessAvg = clamp((from.road_access_index + to.road_access_index) / 2, 0, 1);
    const roadPenalty = (1 - roadAccessAvg) * 0.9;
    const slopePenalty = clamp((from.slope_index + to.slope_index) / 2, 0, 1) * 0.8;
    const frictionPenalty = clamp((from.terrain_friction_index + to.terrain_friction_index) / 2, 0, 1) * 0.9;
    const riverPenalty = clamp(Math.max(from.river_crossing_penalty, to.river_crossing_penalty), 0, 1) * 1.2;
    const uphillMeters = Math.max(0, to.elevation_mean_m - from.elevation_mean_m);
    const uphillPenalty = uphillMeters / 400;
    return 1 + roadPenalty + slopePenalty + frictionPenalty + riverPenalty + uphillPenalty;
}

function computeReachable(
    state: GameState,
    edges: EdgeRecord[],
    terrainData: TerrainScalarsData,
    brigadeId: FormationId,
    mode: 'deployed' | 'column'
): SettlementId[] {
    const formation = state.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) return [];
    const factionId = formation.faction as FactionId;
    const pc = state.political_controllers ?? {};
    const startSid = getStartSid(state, brigadeId);
    if (!startSid || pc[startSid] !== factionId) return [];

    const adjacency = buildAdjacencyFromEdges(edges);
    const budget = mode === 'column' ? getColumnMovementRate(state, brigadeId) : MOVEMENT_RATE;
    const bestCost = new Map<SettlementId, number>();
    const queue: Array<{ sid: SettlementId; cost: number }> = [{ sid: startSid, cost: 0 }];
    bestCost.set(startSid, 0);

    while (queue.length > 0) {
        queue.sort((a, b) => (a.cost - b.cost) || strictCompare(a.sid, b.sid));
        const current = queue.shift()!;
        if (current.cost > (bestCost.get(current.sid) ?? Number.POSITIVE_INFINITY)) continue;
        const neighbors = adjacency.get(current.sid) ?? [];
        for (const next of neighbors) {
            if (pc[next] !== factionId) continue;
            const edgeCost = mode === 'column' ? getColumnEdgeCost(current.sid, next, terrainData) : 1;
            const nextCost = current.cost + edgeCost;
            if (nextCost > budget) continue;
            const prev = bestCost.get(next);
            if (prev === undefined || nextCost < prev - 1e-9) {
                bestCost.set(next, nextCost);
                queue.push({ sid: next, cost: nextCost });
            }
        }
    }

    return [...bestCost.keys()].sort(strictCompare);
}

export function queryMovementRange(
    state: GameState,
    edges: EdgeRecord[],
    terrainData: TerrainScalarsData,
    brigadeId: FormationId
): MovementRangeQuery {
    const start_sid = getStartSid(state, brigadeId);
    return {
        start_sid,
        reachable_deployed: computeReachable(state, edges, terrainData, brigadeId, 'deployed'),
        reachable_column: computeReachable(state, edges, terrainData, brigadeId, 'column'),
    };
}

export function queryMovementPath(
    state: GameState,
    edges: EdgeRecord[],
    terrainData: TerrainScalarsData,
    brigadeId: FormationId,
    destinationSid: SettlementId
): MovementPathQuery | null {
    const formation = state.formations?.[brigadeId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade' || !formation.faction) return null;
    const factionId = formation.faction as FactionId;
    const startSid = getStartSid(state, brigadeId);
    if (!startSid) return null;

    const path = shortestPathThroughFriendly(state, edges, startSid, [destinationSid], factionId);
    if (!path) return null;

    const movementState = state.brigade_movement_state?.[brigadeId];
    const stance = movementState?.stance ?? (movementState?.status === 'packing' ? 'column' : 'combat');
    const movementRate = stance === 'column' ? getColumnMovementRate(state, brigadeId) : MOVEMENT_RATE;
    const edgeCost = stance === 'column'
        ? (fromSid: SettlementId, toSid: SettlementId) => getColumnEdgeCost(fromSid, toSid, terrainData)
        : null;
    const terrain_costs: number[] = [];
    for (let i = 1; i < path.length; i++) {
        terrain_costs.push(edgeCost ? edgeCost(path[i - 1]!, path[i]!) : 1);
    }
    const eta_turns = transitTurnsForPath(path, state, { movementRate, edgeCost });
    return { path, eta_turns, terrain_costs };
}
