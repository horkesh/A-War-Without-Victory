/**
 * Phase II Brigade AoR Assignment.
 *
 * Assigns each front-active settlement to exactly one brigade of the controlling faction.
 * Uses multi-source BFS (Voronoi on graph) from brigade HQ locations.
 * Rear settlements (not front-active) get null assignment.
 *
 * Deterministic: sorted brigade seeds, BFS with deterministic tie-breaking by formation ID.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  SettlementId,
  FormationState
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

// --- Types ---

export interface BrigadeAoRReport {
  /** Number of front-active settlements assigned. */
  front_active_assigned: number;
  /** Number of rear settlements (null assignment). */
  rear_settlements: number;
  /** Per-brigade settlement counts. */
  brigade_counts: Record<FormationId, number>;
}

// --- Front-active detection ---

/**
 * Identify front-active settlements: settlements on edges where opposing factions meet.
 * A settlement is front-active if it has at least one adjacent settlement controlled by a different faction.
 */
export function identifyFrontActiveSettlements(
  state: GameState,
  edges: EdgeRecord[]
): Set<SettlementId> {
  const pc = state.political_controllers ?? {};
  const frontActive = new Set<SettlementId>();

  for (const edge of edges) {
    const controlA = pc[edge.a];
    const controlB = pc[edge.b];
    if (controlA && controlB && controlA !== controlB) {
      frontActive.add(edge.a);
      frontActive.add(edge.b);
    }
  }

  return frontActive;
}

/**
 * Expand front-active set to include limited rear depth.
 * Includes settlements 1 hop behind the front line (controlled by same faction as the front settlement).
 * This provides operational depth for brigades.
 */
export function expandFrontActiveWithDepth(
  frontActive: Set<SettlementId>,
  edges: EdgeRecord[],
  pc: Record<SettlementId, FactionId | null>,
  depth: number = 1
): Set<SettlementId> {
  const expanded = new Set(frontActive);
  // Build adjacency
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    let listA = adj.get(edge.a);
    if (!listA) { listA = []; adj.set(edge.a, listA); }
    listA.push(edge.b);
    let listB = adj.get(edge.b);
    if (!listB) { listB = []; adj.set(edge.b, listB); }
    listB.push(edge.a);
  }

  let current = new Set(frontActive);
  for (let d = 0; d < depth; d++) {
    const next = new Set<SettlementId>();
    for (const sid of current) {
      const faction = pc[sid];
      if (!faction) continue;
      const neighbors = adj.get(sid) ?? [];
      for (const neighbor of neighbors) {
        if (expanded.has(neighbor)) continue;
        if (pc[neighbor] === faction) {
          next.add(neighbor);
          expanded.add(neighbor);
        }
      }
    }
    current = next;
  }

  return expanded;
}

// --- Brigade collection ---

/** Get active brigades for a faction, sorted by ID. */
function getActiveBrigades(state: GameState, faction: FactionId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  const ids = Object.keys(formations).sort(strictCompare);
  for (const id of ids) {
    const f = formations[id];
    if (!f) continue;
    if (f.faction !== faction) continue;
    if (f.status !== 'active') continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    result.push(f);
  }
  return result;
}

// --- Multi-source BFS (Voronoi on graph) ---

/**
 * Assign front-active settlements to brigades using multi-source BFS.
 * Each brigade starts from its HQ settlement (or closest settlement in its faction's territory).
 * Settlements are claimed by the first brigade to reach them.
 * Tie-breaking: formation ID (lexicographic).
 */
function assignByVoronoiBFS(
  brigades: FormationState[],
  frontActive: Set<SettlementId>,
  edges: EdgeRecord[],
  pc: Record<SettlementId, FactionId | null>,
  faction: FactionId
): Map<SettlementId, FormationId> {
  const assignment = new Map<SettlementId, FormationId>();
  if (brigades.length === 0) return assignment;

  // Build adjacency restricted to faction-controlled settlements
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    if (pc[edge.a] !== faction && pc[edge.b] !== faction) continue;
    if (pc[edge.a] === faction) {
      let list = adj.get(edge.a);
      if (!list) { list = []; adj.set(edge.a, list); }
      if (pc[edge.b] === faction) list.push(edge.b);
    }
    if (pc[edge.b] === faction) {
      let list = adj.get(edge.b);
      if (!list) { list = []; adj.set(edge.b, list); }
      if (pc[edge.a] === faction) list.push(edge.a);
    }
  }

  // Initialize BFS queues from brigade seeds
  // Each queue entry: [settlement, brigade_id, distance]
  type QueueEntry = [SettlementId, FormationId, number];
  const queue: QueueEntry[] = [];
  const visited = new Map<SettlementId, { brigade: FormationId; dist: number }>();

  for (const brigade of brigades) {
    const seed = brigade.hq_sid;
    if (!seed || pc[seed] !== faction) continue;
    if (visited.has(seed)) {
      // Tie-break: keep earlier brigade (already sorted by ID)
      continue;
    }
    visited.set(seed, { brigade: brigade.id, dist: 0 });
    queue.push([seed, brigade.id, 0]);
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const [current, brigadeId, dist] = queue[head++];
    const neighbors = adj.get(current) ?? [];
    // Sort neighbors for determinism
    neighbors.sort(strictCompare);
    for (const neighbor of neighbors) {
      const existing = visited.get(neighbor);
      if (existing) {
        // Already claimed — skip (first to arrive wins; ties broken by earlier brigade in sorted order)
        continue;
      }
      visited.set(neighbor, { brigade: brigadeId, dist: dist + 1 });
      queue.push([neighbor, brigadeId, dist + 1]);
    }
  }

  // Extract assignments for front-active settlements only
  for (const sid of frontActive) {
    if (pc[sid] !== faction) continue;
    const claim = visited.get(sid);
    if (claim) {
      assignment.set(sid, claim.brigade);
    }
  }

  return assignment;
}

// --- Public API ---

/**
 * Initialize per-brigade AoR assignment at Phase II entry.
 * Each front-active settlement is assigned to exactly one brigade.
 * Rear settlements get null.
 */
export function initializeBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[]
): BrigadeAoRReport {
  const pc = state.political_controllers ?? {};
  const frontActive = identifyFrontActiveSettlements(state, edges);

  // Expand with 1-hop rear depth for operational buffer
  const expandedFrontActive = expandFrontActiveWithDepth(frontActive, edges, pc, 1);

  // Initialize brigade_aor
  const brigadeAor: Record<SettlementId, FormationId | null> = {};
  const brigadeCounts: Record<FormationId, number> = {};

  // Get unique factions
  const factions = new Set<FactionId>();
  for (const faction of state.factions ?? []) {
    factions.add(faction.id);
  }

  let frontActiveAssigned = 0;
  let rearCount = 0;

  for (const faction of factions) {
    const brigades = getActiveBrigades(state, faction);
    const factionAssignment = assignByVoronoiBFS(brigades, expandedFrontActive, edges, pc, faction);

    for (const [sid, brigadeId] of factionAssignment) {
      brigadeAor[sid] = brigadeId;
      brigadeCounts[brigadeId] = (brigadeCounts[brigadeId] ?? 0) + 1;
      frontActiveAssigned++;
    }
  }

  // All settlements not assigned are rear (null)
  for (const sid of Object.keys(pc)) {
    if (!(sid in brigadeAor)) {
      brigadeAor[sid] = null;
      rearCount++;
    }
  }

  state.brigade_aor = brigadeAor;

  return {
    front_active_assigned: frontActiveAssigned,
    rear_settlements: rearCount,
    brigade_counts: brigadeCounts
  };
}

/**
 * Per-turn validation and repair of brigade AoR.
 * - Reassign settlements from dissolved/inactive brigades to nearest surviving brigade.
 * - Assign newly front-active settlements to nearest brigade.
 */
export function validateBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[]
): void {
  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) return;
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};

  // Update front-active set
  const frontActive = identifyFrontActiveSettlements(state, edges);
  const expandedFrontActive = expandFrontActiveWithDepth(frontActive, edges, pc, 1);

  // Build adjacency for repair BFS
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    let listA = adj.get(edge.a);
    if (!listA) { listA = []; adj.set(edge.a, listA); }
    listA.push(edge.b);
    let listB = adj.get(edge.b);
    if (!listB) { listB = []; adj.set(edge.b, listB); }
    listB.push(edge.a);
  }

  // Collect settlements needing reassignment
  const needsReassignment: SettlementId[] = [];

  for (const sid of Object.keys(brigadeAor).sort(strictCompare)) {
    const assignedBrigade = brigadeAor[sid];
    if (assignedBrigade === null) {
      // Was rear — check if now front-active
      if (expandedFrontActive.has(sid)) {
        needsReassignment.push(sid);
      }
      continue;
    }

    // Check if assigned brigade still exists and is active
    const brigade = formations[assignedBrigade];
    if (!brigade || brigade.status !== 'active' || (brigade.kind ?? 'brigade') !== 'brigade') {
      needsReassignment.push(sid);
      continue;
    }

    // Check faction match
    if (brigade.faction !== pc[sid]) {
      needsReassignment.push(sid);
      continue;
    }

    // Check if still front-active
    if (!expandedFrontActive.has(sid)) {
      brigadeAor[sid] = null; // Became rear
    }
  }

  // Add new settlements not yet in brigade_aor
  for (const sid of Object.keys(pc)) {
    if (!(sid in brigadeAor) && expandedFrontActive.has(sid)) {
      needsReassignment.push(sid);
    }
  }

  // Reassign by finding nearest active same-faction brigade via BFS
  for (const sid of needsReassignment.sort(strictCompare)) {
    const faction = pc[sid];
    if (!faction) {
      brigadeAor[sid] = null;
      continue;
    }

    // BFS to find nearest assigned settlement of same faction with a valid brigade
    const visited = new Set<SettlementId>();
    const queue: SettlementId[] = [sid];
    visited.add(sid);
    let foundBrigade: FormationId | null = null;

    while (queue.length > 0 && !foundBrigade) {
      const current = queue.shift()!;
      const neighbors = (adj.get(current) ?? []).sort(strictCompare);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        if (pc[neighbor] !== faction) continue;

        const neighborBrigade = brigadeAor[neighbor];
        if (neighborBrigade && formations[neighborBrigade]?.status === 'active') {
          foundBrigade = neighborBrigade;
          break;
        }
        queue.push(neighbor);
      }
    }

    brigadeAor[sid] = foundBrigade;
  }
}

/**
 * Get settlement IDs assigned to a specific brigade.
 */
export function getBrigadeAoRSettlements(
  state: GameState,
  formationId: FormationId
): SettlementId[] {
  const brigadeAor = state.brigade_aor ?? {};
  const result: SettlementId[] = [];
  for (const [sid, bid] of Object.entries(brigadeAor)) {
    if (bid === formationId) result.push(sid);
  }
  return result.sort(strictCompare);
}

/**
 * Compute brigade density: personnel / AoR settlement count.
 * Higher density = more concentrated force = more pressure per edge.
 * Equals per-settlement garrison when manpower is split equally across AoR (Brigade Realism plan §3.3).
 */
export function computeBrigadeDensity(
  state: GameState,
  formationId: FormationId
): number {
  const settlements = getBrigadeAoRSettlements(state, formationId);
  const formation = state.formations?.[formationId];
  if (!formation) return 0;
  const personnel = formation.personnel ?? 1000;
  return personnel / Math.max(1, settlements.length);
}

/**
 * Garrison strength at a settlement: personnel of the brigade holding it, split equally across its AoR.
 * Defender strength at that settlement = this value (Brigade Realism plan §3.3). Returns 0 if sid has no brigade assignment.
 */
export function getSettlementGarrison(
  state: GameState,
  sid: SettlementId
): number {
  const brigadeAor = state.brigade_aor ?? {};
  const formationId = brigadeAor[sid];
  if (!formationId) return 0;
  return computeBrigadeDensity(state, formationId);
}
