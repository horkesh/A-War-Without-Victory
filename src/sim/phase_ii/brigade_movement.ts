/**
 * Phase II: Brigade movement (Brigade AoR Redesign Phase C).
 *
 * Pack → in_transit → unpack cycle; pathfinding through friendly territory only.
 * Deterministic: BFS with sorted neighbor expansion; formation ID order.
 */

import type { GameState, FactionId, FormationId, SettlementId } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';

/** Settlements per turn (infantry march rate). Study: 3 settlements per turn. */
export const MOVEMENT_RATE = 3;

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
export function transitTurnsForPath(path: SettlementId[], state?: GameState): number {
  const steps = Math.max(0, path.length - 1);
  let turns = Math.max(1, Math.ceil(steps / MOVEMENT_RATE));
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
export function processBrigadeMovement(state: GameState, edges: EdgeRecord[]): void {
  const movementState = { ...(state.brigade_movement_state ?? {}) };
  const movementOrders = state.brigade_movement_orders ?? {};
  const brigadeAor = state.brigade_aor ?? {};
  const formations = state.formations ?? {};
  const pc = state.political_controllers ?? {};

  // Pass 1: apply orders (set packing for this turn; brigade will advance next turn). Phase G: encircled brigades cannot receive new movement orders.
  for (const formationId of Object.keys(movementOrders).sort(strictCompare) as FormationId[]) {
    const formation = formations[formationId];
    if (!formation || formation.faction == null || (formation.kind ?? 'brigade') !== 'brigade') continue;
    if (state.brigade_encircled?.[formationId]) continue;
    const factionId = formation.faction as FactionId;
    const order = movementOrders[formationId];
    const dest = order?.destination_sids;
    if (dest?.length && dest.every(sid => pc[sid] === factionId)) {
      movementState[formationId] = {
        status: 'packing',
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
      const path = shortestPathThroughFriendly(state, edges, fromSid, dest, factionId);
      if (!path || path.length <= 1) {
        delete movementState[formationId];
        continue;
      }
      const turns = transitTurnsForPath(path, state);
      for (const sid of fromSids) {
        if (brigadeAor[sid] === formationId) brigadeAor[sid] = null;
      }
      movementState[formationId] = {
        status: 'in_transit',
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
        movementState[formationId] = { status: 'unpacking', destination_sids: current.destination_sids };
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
}
