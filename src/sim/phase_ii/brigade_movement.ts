/**
 * Phase II: Brigade movement (Brigade AoR Redesign Phase C).
 *
 * Pack → in_transit → unpack cycle; pathfinding through friendly territory only.
 * Deterministic: BFS with sorted neighbor expansion; formation ID order.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import type { FactionId, FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';

/** Settlements per turn (infantry march rate). Study: 3 settlements per turn. */
export const MOVEMENT_RATE = 3;
export const COLUMN_BASE_MOVEMENT_RATE = 12;
export const COLUMN_MIN_MOVEMENT_RATE = 8;
export const COLUMN_MAX_MOVEMENT_RATE = 14;

function collapseAoRToSingleSettlement(
    brigadeAor: Record<SettlementId, FormationId | null>,
    formationId: FormationId,
    keepSid: SettlementId,
    fromSids: SettlementId[],
): void {
    for (const sid of fromSids) {
        if (sid !== keepSid && brigadeAor[sid] === formationId) brigadeAor[sid] = null;
    }
    brigadeAor[keepSid] = formationId;
}

function getHoldSid(state: GameState, formationId: FormationId): SettlementId | null {
    const formation = state.formations?.[formationId];
    if (formation?.hq_sid) return formation.hq_sid;
    const aor = getBrigadeAoRSettlements(state, formationId);
    return aor.length > 0 ? aor[0]! : null;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Column movement rate (undeployed) derived from brigade composition.
 * Baseline 12, reduced for heavy equipment density, slightly boosted for infantry-heavy mix.
 */
function getColumnMovementRateForFormation(state: GameState, formationId: FormationId): number {
    const formation = state.formations?.[formationId];
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

function getColumnEdgeTraversalCost(
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

/**
 * Shortest path from fromSid to any of toSids through friendly-controlled settlements only.
 * Returns path including start and end, or null if unreachable.
 * Deterministic: neighbors expanded in sorted order.
 */
export function shortestPathThroughFriendly(
    state: GameState,
    edges: EdgeRecord[],
    fromSid: SettlementId,
    toSids: SettlementId[],
    factionId: FactionId
): SettlementId[] | null {
    const pc = state.political_controllers ?? {};
    const adj = buildAdjacencyFromEdges(edges);
    const goalSet = new Set(toSids);
    if (goalSet.has(fromSid)) return [fromSid];

    const queue: SettlementId[] = [fromSid];
    const visited = new Set<SettlementId>([fromSid]);
    const parent = new Map<SettlementId, SettlementId>();

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adj.get(current);
        if (!neighbors) continue;
        const sorted = [...neighbors].sort(strictCompare);
        for (const n of sorted) {
            if (visited.has(n)) continue;
            if (pc[n] !== factionId) continue;
            visited.add(n);
            parent.set(n, current);
            if (goalSet.has(n)) {
                const path: SettlementId[] = [];
                let p: SettlementId | undefined = n;
                while (p) {
                    path.unshift(p);
                    p = parent.get(p);
                }
                return path;
            }
            queue.push(n);
        }
    }
    return null;
}

/**
 * Transit turns for a path (path includes start and end; steps = path.length - 1).
 * Study: transit_turns = max(1, ceil(graph_distance / MOVEMENT_RATE)).
 * Phase I: +1 turn per settlement with battle_damage > 0 in path.
 */
export function transitTurnsForPath(
    path: SettlementId[],
    state?: GameState,
    options?: {
        movementRate?: number;
        edgeCost?: ((fromSid: SettlementId, toSid: SettlementId) => number) | null;
    }
): number {
    const movementRate = Math.max(1, options?.movementRate ?? MOVEMENT_RATE);
    const edgeCost = options?.edgeCost;
    let travelCost = 0;
    if (!edgeCost) {
        travelCost = Math.max(0, path.length - 1);
    } else {
        for (let i = 1; i < path.length; i++) {
            travelCost += edgeCost(path[i - 1]!, path[i]!);
        }
    }
    let turns = Math.max(1, Math.ceil(travelCost / movementRate));
    if (state?.battle_damage) {
        for (let i = 0; i < path.length; i++) {
            if ((state.battle_damage[path[i]] ?? 0) > 0) turns += 1;
        }
    }
    return turns;
}

/**
 * Process brigade movement state: advance packing → in_transit → unpacking → deployed.
 * Consumes brigade_movement_orders (set packing for ordered brigades). Packing lasts one turn.
 * When entering in_transit, clears brigade from AoR; when entering unpacking, assigns destination_sids to AoR.
 * Deterministic: iterate formation IDs in sorted order.
 */
export function processBrigadeMovement(
    state: GameState,
    edges: EdgeRecord[],
    terrainData?: TerrainScalarsData | null
): void {
    const movementState = { ...(state.brigade_movement_state ?? {}) };
    const movementOrders = state.brigade_movement_orders ?? {};
    const deployOrders = state.brigade_deploy_orders ?? {};
    const brigadeAor = state.brigade_aor ?? {};
    const formations = state.formations ?? {};
    const pc = state.political_controllers ?? {};

    // Pass 0: apply deploy/undeploy posture orders.
    for (const formationId of Object.keys(deployOrders).sort(strictCompare) as FormationId[]) {
        const action = deployOrders[formationId];
        const formation = formations[formationId];
        if (!action || !formation || (formation.kind ?? 'brigade') !== 'brigade') continue;

        if (action === 'undeploy') {
            const holdSid = getHoldSid(state, formationId);
            if (!holdSid) continue;
            const fromSids = getBrigadeAoRSettlements(state, formationId);
            collapseAoRToSingleSettlement(brigadeAor, formationId, holdSid, fromSids);
            movementState[formationId] = {
                status: 'packing',
                stance: 'column',
                destination_sids: [holdSid],
            };
            continue;
        }

        if (action === 'deploy') {
            const current = movementState[formationId];
            if (!current || current.status !== 'packing') continue;
            const holdSid = current.destination_sids?.[0] ?? getHoldSid(state, formationId);
            if (!holdSid) continue;
            movementState[formationId] = {
                status: 'in_transit',
                stance: 'combat',
                destination_sids: [holdSid],
                path: [holdSid],
                turns_remaining: 1,
            };
        }
    }

    // Pass 1: apply orders (set packing for this turn; brigade will advance next turn). Phase G: encircled brigades cannot receive new movement orders.
    for (const formationId of Object.keys(movementOrders).sort(strictCompare) as FormationId[]) {
        const formation = formations[formationId];
        if (!formation || formation.faction == null || (formation.kind ?? 'brigade') !== 'brigade') continue;
        if (state.brigade_encircled?.[formationId]) continue;
        const factionId = formation.faction as FactionId;
        const order = movementOrders[formationId];
        const dest = order?.destination_sids;
        if (dest?.length && dest.every(sid => pc[sid] === factionId)) {
            const previousStance = movementState[formationId]?.stance ?? 'combat';
            movementState[formationId] = {
                status: 'packing',
                stance: previousStance,
                destination_sids: [...dest].sort(strictCompare)
            };
        }
    }

    // Pass 2: advance state (packing → in_transit, in_transit → decrement or unpacking, unpacking → deployed)
    const sortedIds = [...Object.keys(movementState)].sort(strictCompare) as FormationId[];
    for (const formationId of sortedIds) {
        const current = movementState[formationId];
        if (!current) continue;
        const formation = formations[formationId];
        if (!formation || formation.faction == null || (formation.kind ?? 'brigade') !== 'brigade') {
            delete movementState[formationId];
            continue;
        }
        const factionId = formation.faction as FactionId;

        if (current.status === 'packing') {
            const dest = current.destination_sids ?? [];
            const fromSids = getBrigadeAoRSettlements(state, formationId);
            const fromSid = fromSids[0];
            if (!fromSid || dest.length === 0) {
                delete movementState[formationId];
                continue;
            }
            // Column hold mode (undeployed): stay packed at a single hold settlement until explicit deploy or move.
            if (current.stance === 'column' && dest.length === 1 && dest[0] === fromSid) {
                collapseAoRToSingleSettlement(brigadeAor, formationId, fromSid, fromSids);
                movementState[formationId] = {
                    status: 'packing',
                    stance: 'column',
                    destination_sids: [fromSid],
                };
                continue;
            }
            const path = shortestPathThroughFriendly(state, edges, fromSid, dest, factionId);
            if (!path || path.length <= 1) {
                delete movementState[formationId];
                continue;
            }
            const movementRate = current.stance === 'column'
                ? getColumnMovementRateForFormation(state, formationId)
                : MOVEMENT_RATE;
            const edgeCost = current.stance === 'column' && terrainData
                ? (fromSid: SettlementId, toSid: SettlementId) => getColumnEdgeTraversalCost(fromSid, toSid, terrainData)
                : null;
            const turns = transitTurnsForPath(path, state, { movementRate, edgeCost });
            for (const sid of fromSids) {
                if (brigadeAor[sid] === formationId) brigadeAor[sid] = null;
            }
            movementState[formationId] = {
                status: 'in_transit',
                stance: current.stance ?? 'combat',
                destination_sids: current.destination_sids,
                path,
                turns_remaining: turns
            };
            continue;
        }

        if (current.status === 'in_transit') {
            const remaining = (current.turns_remaining ?? 1) - 1;
            if (remaining <= 0) {
                const dest = current.destination_sids ?? [];
                for (const sid of dest) {
                    brigadeAor[sid] = formationId;
                }
                movementState[formationId] = {
                    status: 'unpacking',
                    stance: current.stance ?? 'combat',
                    destination_sids: current.destination_sids,
                };
            } else {
                movementState[formationId] = { ...current, turns_remaining: remaining };
            }
            continue;
        }

        if (current.status === 'unpacking') {
            delete movementState[formationId];
        }
    }

    state.brigade_movement_state = Object.keys(movementState).length > 0 ? movementState : undefined;
    state.brigade_movement_orders = undefined;
    state.brigade_deploy_orders = undefined;
}
