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
  FormationState,
  MunicipalityId
} from '../../state/game_state.js';
import type { EdgeRecord, SettlementRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { BRIGADE_OPERATIONAL_AOR_HARD_CAP } from '../../state/formation_constants.js';
import { getMaxBrigadesPerMun } from '../../state/formation_constants.js';
import { computeBrigadeOperationalCoverageCapFromFormation } from '../../state/brigade_operational_cap.js';

// --- Types ---

export interface BrigadeAoRReport {
  /** Number of front-active settlements assigned. */
  front_active_assigned: number;
  /** Number of rear settlements (null assignment). */
  rear_settlements: number;
  /** Per-brigade settlement counts. */
  brigade_counts: Record<FormationId, number>;
}

export interface MunicipalityOrderReport {
  orders_applied: number;
  orders_rejected: number;
  rejected_reasons: string[];
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

function getFormationCorpsId(formation: FormationState): FormationId | null {
  if (formation.corps_id) return formation.corps_id;
  const tags = formation.tags ?? [];
  for (const tag of tags) {
    if (tag.startsWith('corps:')) {
      const id = tag.slice(6).trim();
      if (id) return id;
    }
  }
  return null;
}

function uniqueSortedMunicipalities(values: MunicipalityId[]): MunicipalityId[] {
  return Array.from(new Set(values)).sort(strictCompare);
}

function resolveMunicipalityForSid(
  sid: SettlementId,
  sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId {
  return sidToMun[sid] ?? sid;
}

function buildSidToMunMap(
  settlementIds: Iterable<SettlementId>,
  settlements?: Map<SettlementId, SettlementRecord>
): Record<SettlementId, MunicipalityId> {
  const sidToMun: Record<SettlementId, MunicipalityId> = {};
  if (settlements) {
    for (const [sid, s] of settlements.entries()) {
      sidToMun[sid] = (s.mun1990_id ?? s.mun_code ?? sid) as MunicipalityId;
    }
  }
  for (const sid of settlementIds) {
    if (!(sid in sidToMun)) sidToMun[sid] = sid as MunicipalityId;
  }
  return sidToMun;
}

function buildMunicipalityAdjacency(
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>
): Map<MunicipalityId, Set<MunicipalityId>> {
  const adj = new Map<MunicipalityId, Set<MunicipalityId>>();
  for (const edge of edges) {
    const a = resolveMunicipalityForSid(edge.a, sidToMun);
    const b = resolveMunicipalityForSid(edge.b, sidToMun);
    if (a === b) continue;
    const aSet = adj.get(a) ?? new Set<MunicipalityId>();
    aSet.add(b);
    adj.set(a, aSet);
    const bSet = adj.get(b) ?? new Set<MunicipalityId>();
    bSet.add(a);
    adj.set(b, bSet);
  }
  return adj;
}

function ensureBrigadeMunicipalityAssignment(
  state: GameState,
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>
): Record<FormationId, MunicipalityId[]> {
  const existing = state.brigade_municipality_assignment ?? {};
  const normalized: Record<FormationId, MunicipalityId[]> = {};
  const formations = state.formations ?? {};
  const pc = state.political_controllers ?? {};
  const allFrontActive = expandFrontActiveWithDepth(identifyFrontActiveSettlements(state, edges), edges, pc, 1);

  // Keep valid existing assignments for active brigades.
  for (const formationId of Object.keys(formations).sort(strictCompare)) {
    const f = formations[formationId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') continue;
    const raw = existing[formationId] ?? [];
    if (!Array.isArray(raw)) continue;
    const clean = uniqueSortedMunicipalities(
      raw.filter((mun): mun is MunicipalityId => typeof mun === 'string' && mun.length > 0)
    );
    if (clean.length > 0) normalized[formationId] = clean;
  }

  // Bootstrap from current brigade_aor when present.
  const currentAoR = state.brigade_aor ?? {};
  for (const [sid, brigadeId] of Object.entries(currentAoR)) {
    if (!brigadeId) continue;
    const f = formations[brigadeId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') continue;
    const mun = resolveMunicipalityForSid(sid as SettlementId, sidToMun);
    const list = normalized[brigadeId] ?? [];
    list.push(mun);
    normalized[brigadeId] = list;
  }
  for (const brigadeId of Object.keys(normalized)) {
    normalized[brigadeId] = uniqueSortedMunicipalities(normalized[brigadeId]!);
  }

  // Bootstrap from Voronoi fallback when nothing exists.
  if (Object.keys(normalized).length === 0) {
    const factions = new Set<FactionId>((state.factions ?? []).map((f) => f.id));
    for (const faction of factions) {
      const brigades = getActiveBrigades(state, faction);
      const factionAssignment = assignByVoronoiBFS(
        brigades,
        allFrontActive,
        edges,
        pc,
        faction,
        state.formations
      );
      for (const [sid, brigadeId] of factionAssignment) {
        const mun = resolveMunicipalityForSid(sid, sidToMun);
        const list = normalized[brigadeId] ?? [];
        list.push(mun);
        normalized[brigadeId] = list;
      }
    }
    for (const brigadeId of Object.keys(normalized)) {
      normalized[brigadeId] = uniqueSortedMunicipalities(normalized[brigadeId]!);
    }
  }

  // Final fallback: use brigade HQ municipality.
  for (const formationId of Object.keys(formations).sort(strictCompare)) {
    const f = formations[formationId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') continue;
    if ((normalized[formationId]?.length ?? 0) > 0) continue;
    const hq = f.hq_sid;
    if (!hq) continue;
    if (pc[hq] && pc[hq] !== f.faction) continue;
    normalized[formationId] = [resolveMunicipalityForSid(hq, sidToMun)];
  }

  // Ensure every front-active (faction, municipality) has at least one brigade assignment.
  const coveredFactionMun = new Set<string>();
  for (const [formationId, munIds] of Object.entries(normalized)) {
    const faction = formations[formationId]?.faction;
    if (!faction) continue;
    for (const munId of munIds) coveredFactionMun.add(`${faction}::${munId}`);
  }
  for (const sid of Array.from(allFrontActive).sort(strictCompare)) {
    const faction = pc[sid];
    if (!faction) continue;
    const munId = resolveMunicipalityForSid(sid, sidToMun);
    const key = `${faction}::${munId}`;
    if (coveredFactionMun.has(key)) continue;
    const candidates = getActiveBrigades(state, faction).sort((a, b) => {
      const ca = normalized[a.id]?.length ?? 0;
      const cb = normalized[b.id]?.length ?? 0;
      if (ca !== cb) return ca - cb;
      return strictCompare(a.id, b.id);
    });
    const pick = candidates[0];
    if (!pick) continue;
    const list = normalized[pick.id] ?? [];
    list.push(munId);
    normalized[pick.id] = uniqueSortedMunicipalities(list);
    coveredFactionMun.add(key);
  }

  // Same-HQ robustness: if a brigade still has no municipality, transfer one from largest same-faction donor.
  for (const brigade of Object.values(formations).sort((a, b) => strictCompare(a.id, b.id))) {
    if (!brigade || brigade.status !== 'active' || (brigade.kind ?? 'brigade') !== 'brigade') continue;
    if ((normalized[brigade.id]?.length ?? 0) > 0) continue;
    const donors = Object.values(formations)
      .filter((f) => {
        if (!f || f.id === brigade.id) return false;
        if (f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') return false;
        if (f.faction !== brigade.faction) return false;
        return (normalized[f.id]?.length ?? 0) > 1;
      })
      .sort((a, b) => {
        const ca = normalized[a.id]?.length ?? 0;
        const cb = normalized[b.id]?.length ?? 0;
        if (ca !== cb) return cb - ca;
        return strictCompare(a.id, b.id);
      });
    const donor = donors[0];
    if (!donor) continue;
    const donorMuns = normalized[donor.id] ?? [];
    const transferred = donorMuns[donorMuns.length - 1];
    if (!transferred) continue;
    normalized[donor.id] = donorMuns.slice(0, donorMuns.length - 1);
    normalized[brigade.id] = [transferred];
  }

  // Ensure each active brigade has at least one front-active municipality when possible.
  const frontActiveMunsByFaction = new Map<FactionId, Set<MunicipalityId>>();
  for (const sid of Array.from(allFrontActive).sort(strictCompare)) {
    const faction = pc[sid];
    if (!faction) continue;
    const set = frontActiveMunsByFaction.get(faction) ?? new Set<MunicipalityId>();
    set.add(resolveMunicipalityForSid(sid, sidToMun));
    frontActiveMunsByFaction.set(faction, set);
  }
  for (const brigade of Object.values(formations).sort((a, b) => strictCompare(a.id, b.id))) {
    if (!brigade || brigade.status !== 'active' || (brigade.kind ?? 'brigade') !== 'brigade') continue;
    const frontMuns = frontActiveMunsByFaction.get(brigade.faction);
    if (!frontMuns || frontMuns.size === 0) continue;
    const own = normalized[brigade.id] ?? [];
    if (own.some((mun) => frontMuns.has(mun))) continue;
    const donors = Object.values(formations)
      .filter((f) => {
        if (!f || f.id === brigade.id) return false;
        if (f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') return false;
        if (f.faction !== brigade.faction) return false;
        const donorMuns = normalized[f.id] ?? [];
        const frontOwned = donorMuns.filter((mun) => frontMuns.has(mun));
        return frontOwned.length > 1;
      })
      .sort((a, b) => {
        const ca = (normalized[a.id] ?? []).filter((mun) => frontMuns.has(mun)).length;
        const cb = (normalized[b.id] ?? []).filter((mun) => frontMuns.has(mun)).length;
        if (ca !== cb) return cb - ca;
        return strictCompare(a.id, b.id);
      });
    const donor = donors[0];
    if (!donor) continue;
    const donorMuns = normalized[donor.id] ?? [];
    const transferable = donorMuns.filter((mun) => frontMuns.has(mun)).sort(strictCompare);
    const pick = transferable[transferable.length - 1];
    if (!pick) continue;
    normalized[donor.id] = donorMuns.filter((mun) => mun !== pick);
    normalized[brigade.id] = uniqueSortedMunicipalities([...(normalized[brigade.id] ?? []), pick]);
  }

  state.brigade_municipality_assignment = normalized;
  return normalized;
}

function assignSharedMunicipalitySettlements(
  settlementIds: SettlementId[],
  brigadeIds: FormationId[],
  formations: Record<FormationId, FormationState>,
  adjacency: Map<SettlementId, SettlementId[]>
): Record<SettlementId, FormationId> {
  const sortedSids = [...settlementIds].sort(strictCompare);
  const sortedBrigades = [...brigadeIds].sort(strictCompare);
  const sidSet = new Set(sortedSids);
  const claims: Record<SettlementId, FormationId> = {};
  const usedSeeds = new Set<SettlementId>();
  const queue: Array<{ sid: SettlementId; brigadeId: FormationId }> = [];

  for (const brigadeId of sortedBrigades) {
    const hq = formations[brigadeId]?.hq_sid;
    let seed: SettlementId | undefined;
    if (hq && sidSet.has(hq) && !usedSeeds.has(hq)) {
      seed = hq;
    } else {
      seed = sortedSids.find((sid) => !usedSeeds.has(sid));
    }
    if (!seed) continue;
    usedSeeds.add(seed);
    claims[seed] = brigadeId;
    queue.push({ sid: seed, brigadeId });
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const neighbors = (adjacency.get(current.sid) ?? []).filter((n) => sidSet.has(n)).sort(strictCompare);
    for (const n of neighbors) {
      if (claims[n]) continue;
      claims[n] = current.brigadeId;
      queue.push({ sid: n, brigadeId: current.brigadeId });
    }
  }

  // Deterministic fallback for any disconnected leftovers.
  let rr = 0;
  for (const sid of sortedSids) {
    if (claims[sid]) continue;
    claims[sid] = sortedBrigades[rr % sortedBrigades.length]!;
    rr += 1;
  }
  return claims;
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
  faction: FactionId,
  formations: Record<string, FormationState> | undefined
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

  function buildCorpsLookup(): Map<SettlementId, FormationId> {
    const out = new Map<SettlementId, FormationId>();
    const corpsToSeed = new Map<FormationId, SettlementId>();
    const brigadesSorted = [...brigades].sort((a, b) => a.id.localeCompare(b.id));

    for (const brigade of brigadesSorted) {
      const corpsId = getFormationCorpsId(brigade);
      if (!corpsId || corpsToSeed.has(corpsId)) continue;
      const corps = formations?.[corpsId];
      const corpsSeed = typeof corps?.hq_sid === 'string' ? corps.hq_sid : undefined;
      if (corpsSeed && pc[corpsSeed] === faction) {
        corpsToSeed.set(corpsId, corpsSeed);
        continue;
      }
      const brigadeSeed = typeof brigade.hq_sid === 'string' ? brigade.hq_sid : undefined;
      if (brigadeSeed && pc[brigadeSeed] === faction) {
        corpsToSeed.set(corpsId, brigadeSeed);
      }
    }

    if (corpsToSeed.size === 0) return out;

    type CorpsQueueEntry = [SettlementId, FormationId, number];
    const queue: CorpsQueueEntry[] = [];
    const visited = new Map<SettlementId, { corps: FormationId; dist: number }>();
    const corpsIds = Array.from(corpsToSeed.keys()).sort(strictCompare);
    for (const corpsId of corpsIds) {
      const seed = corpsToSeed.get(corpsId)!;
      if (visited.has(seed)) continue;
      visited.set(seed, { corps: corpsId, dist: 0 });
      queue.push([seed, corpsId, 0]);
    }

    let head = 0;
    while (head < queue.length) {
      const [current, corpsId, dist] = queue[head++];
      out.set(current, corpsId);
      const neighbors = (adj.get(current) ?? []).slice().sort(strictCompare);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.set(neighbor, { corps: corpsId, dist: dist + 1 });
        queue.push([neighbor, corpsId, dist + 1]);
      }
    }

    return out;
  }

  const corpsBySettlement = buildCorpsLookup();
  const brigadeTraits = new Map<FormationId, { isRear: boolean; corpsId: FormationId | null }>();
  for (const brigade of brigades) {
    const seed = brigade.hq_sid;
    const isRear = !seed || !frontActive.has(seed);
    brigadeTraits.set(brigade.id, { isRear, corpsId: getFormationCorpsId(brigade) });
  }

  function pickFallbackSeed(
    visited: Map<SettlementId, { brigade: FormationId; dist: number }>
  ): SettlementId | undefined {
    const frontCandidates = Array.from(frontActive)
      .filter((sid) => pc[sid] === faction && !visited.has(sid))
      .sort(strictCompare);
    if (frontCandidates.length > 0) return frontCandidates[0];
    const factionCandidates = Object.keys(pc)
      .filter((sid) => pc[sid] === faction && !visited.has(sid))
      .sort(strictCompare);
    return factionCandidates[0];
  }

  /**
   * When primary seed is already claimed, find nearest unvisited settlement in faction territory.
   * Used for brigades sharing same HQ (e.g. same home municipality).
   * Deterministic: BFS with sorted neighbor iteration.
   * adj is faction-restricted, so all neighbors are faction-controlled.
   */
  function findAlternativeSeed(
    seed: SettlementId,
    visited: Map<SettlementId, { brigade: FormationId; dist: number }>,
    adj: Map<SettlementId, SettlementId[]>,
    frontActive: Set<SettlementId>
  ): SettlementId | undefined {
    const q: SettlementId[] = [seed];
    const seen = new Set<SettlementId>([seed]);
    let fallback: SettlementId | undefined;
    let head = 0;
    while (head < q.length) {
      const current = q[head++];
      const neighbors = (adj.get(current) ?? []).slice().sort(strictCompare);
      for (const n of neighbors) {
        if (seen.has(n)) continue;
        seen.add(n);
        if (!visited.has(n)) {
          if (frontActive.has(n)) return n;
          if (fallback == null) fallback = n;
        }
        q.push(n);
      }
    }
    return fallback;
  }

  function findNearestCorpsSettlement(
    seed: SettlementId | undefined,
    corpsId: FormationId
  ): SettlementId | undefined {
    if (corpsBySettlement.size === 0) return undefined;
    if (seed && corpsBySettlement.get(seed) === corpsId) return seed;

    const fallbackStarts = Object.keys(pc)
      .filter((sid) => pc[sid] === faction)
      .sort(strictCompare);
    const starts = seed ? [seed] : fallbackStarts;
    const visited = new Set<SettlementId>();
    const queue: SettlementId[] = [];
    for (const s of starts) {
      if (!visited.has(s)) {
        visited.add(s);
        queue.push(s);
      }
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (corpsBySettlement.get(current) === corpsId) return current;
      const neighbors = (adj.get(current) ?? []).slice().sort(strictCompare);
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
      }
    }
    return undefined;
  }

  // Initialize BFS queues from brigade seeds
  // Each queue entry: [settlement, brigade_id, distance]
  type QueueEntry = [SettlementId, FormationId, number];
  const queue: QueueEntry[] = [];
  const visited = new Map<SettlementId, { brigade: FormationId; dist: number }>();

  for (const brigade of brigades) {
    const trait = brigadeTraits.get(brigade.id);
    const seedRaw = brigade.hq_sid && pc[brigade.hq_sid] === faction ? brigade.hq_sid : undefined;
    const initialSeed = seedRaw ?? pickFallbackSeed(visited);
    if (!initialSeed) continue;
    let seed =
      trait != null &&
      trait.isRear &&
      trait.corpsId != null
        ? (findNearestCorpsSettlement(initialSeed, trait.corpsId) ?? initialSeed)
        : initialSeed;
    if (visited.has(seed)) {
      // Same-seed collision: multiple brigades share HQ (e.g. same home municipality).
      // Find nearest unclaimed settlement so this brigade gets a valid AoR.
      const alt = findAlternativeSeed(seed, visited, adj, frontActive);
      if (!alt) continue;
      seed = alt;
    }
    visited.set(seed, { brigade: brigade.id, dist: 0 });
    queue.push([seed, brigade.id, 0]);
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const [current, brigadeId, dist] = queue[head++];
    const trait = brigadeTraits.get(brigadeId);
    const restrictToCorps =
      trait != null &&
      trait.isRear &&
      trait.corpsId != null &&
      corpsBySettlement.size > 0;
    const neighbors = adj.get(current) ?? [];
    // Sort neighbors for determinism
    neighbors.sort(strictCompare);
    for (const neighbor of neighbors) {
      if (restrictToCorps) {
        const targetCorps = corpsBySettlement.get(neighbor);
        if (targetCorps != null && targetCorps !== trait.corpsId) continue;
      }
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

function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, SettlementId[]> {
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    const listA = adj.get(edge.a) ?? [];
    listA.push(edge.b);
    adj.set(edge.a, listA);
    const listB = adj.get(edge.b) ?? [];
    listB.push(edge.a);
    adj.set(edge.b, listB);
  }
  for (const list of adj.values()) list.sort(strictCompare);
  return adj;
}

function deriveBrigadeAoRFromMunicipalities(
  state: GameState,
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>,
  assignments: Record<FormationId, MunicipalityId[]>
): BrigadeAoRReport {
  const pc = state.political_controllers ?? {};
  const frontActive = identifyFrontActiveSettlements(state, edges);
  const expandedFrontActive = expandFrontActiveWithDepth(frontActive, edges, pc, 1);
  const forms = state.formations ?? {};
  const brigadeAor: Record<SettlementId, FormationId | null> = {};
  const brigadeCounts: Record<FormationId, number> = {};

  // Default all settlements to rear.
  for (const sid of Object.keys(pc).sort(strictCompare)) {
    brigadeAor[sid as SettlementId] = null;
  }

  const byFactionMun = new Map<string, SettlementId[]>();
  for (const sid of Array.from(expandedFrontActive).sort(strictCompare)) {
    const faction = pc[sid];
    if (!faction) continue;
    const mun = resolveMunicipalityForSid(sid, sidToMun);
    const key = `${faction}::${mun}`;
    const list = byFactionMun.get(key) ?? [];
    list.push(sid);
    byFactionMun.set(key, list);
  }

  const adjacency = buildAdjacency(edges);
  for (const [key, sids] of Array.from(byFactionMun.entries()).sort((a, b) => strictCompare(a[0], b[0]))) {
    const [faction, mun] = key.split('::') as [FactionId, MunicipalityId];
    const candidateBrigades = Object.keys(assignments)
      .filter((formationId) => {
        const f = forms[formationId];
        if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') return false;
        if (f.faction !== faction) return false;
        return (assignments[formationId] ?? []).includes(mun);
      })
      .sort(strictCompare);
    if (candidateBrigades.length === 0) continue;
    if (candidateBrigades.length === 1) {
      const brigadeId = candidateBrigades[0]!;
      for (const sid of sids) {
        brigadeAor[sid] = brigadeId;
        brigadeCounts[brigadeId] = (brigadeCounts[brigadeId] ?? 0) + 1;
      }
      continue;
    }
    const claims = assignSharedMunicipalitySettlements(sids, candidateBrigades, forms, adjacency);
    for (const sid of Object.keys(claims).sort(strictCompare)) {
      const brigadeId = claims[sid as SettlementId]!;
      brigadeAor[sid as SettlementId] = brigadeId;
      brigadeCounts[brigadeId] = (brigadeCounts[brigadeId] ?? 0) + 1;
    }
  }

  state.brigade_aor = brigadeAor;
  const frontAssigned = Object.values(brigadeAor).filter((v) => v != null).length;
  const rearCount = Object.values(brigadeAor).length - frontAssigned;
  return {
    front_active_assigned: frontAssigned,
    rear_settlements: rearCount,
    brigade_counts: brigadeCounts
  };
}

export function applyBrigadeMunicipalityOrders(
  state: GameState,
  edges: EdgeRecord[],
  settlements?: Map<SettlementId, SettlementRecord>
): MunicipalityOrderReport {
  const report: MunicipalityOrderReport = {
    orders_applied: 0,
    orders_rejected: 0,
    rejected_reasons: []
  };
  const orders = state.brigade_mun_orders;
  if (!orders || typeof orders !== 'object') {
    state.brigade_mun_orders = {};
    return report;
  }

  const pc = state.political_controllers ?? {};
  const sidToMun = buildSidToMunMap(Object.keys(pc), settlements);
  const assignments = ensureBrigadeMunicipalityAssignment(state, edges, sidToMun);
  const forms = state.formations ?? {};
  const munAdj = buildMunicipalityAdjacency(edges, sidToMun);

  const countByMunFaction = new Map<string, number>();
  const inc = (munId: MunicipalityId, faction: FactionId, delta: number): void => {
    const key = `${munId}::${faction}`;
    const next = (countByMunFaction.get(key) ?? 0) + delta;
    countByMunFaction.set(key, next);
  };
  for (const [formationId, munIds] of Object.entries(assignments)) {
    const f = forms[formationId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') continue;
    for (const munId of munIds) inc(munId, f.faction, 1);
  }

  const orderEntries = Object.entries(orders).sort((a, b) => strictCompare(a[0], b[0]));
  for (const [formationId, raw] of orderEntries) {
    const f = forms[formationId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') {
      report.orders_rejected += 1;
      report.rejected_reasons.push(`${formationId}: invalid brigade`);
      continue;
    }
    const current = assignments[formationId] ?? [];
    for (const munId of current) inc(munId, f.faction, -1);

    const desired = raw == null
      ? []
      : uniqueSortedMunicipalities(raw.filter((mun): mun is MunicipalityId => typeof mun === 'string' && mun.length > 0));

    const currentSet = new Set(current);
    const accepted = new Set(current.filter((mun) => desired.includes(mun)));
    let invalidReason: string | null = null;

    for (const munId of desired) {
      if (currentSet.has(munId)) continue;
      const adjacencyPool = new Set<MunicipalityId>([...current, ...Array.from(accepted)]);
      const hasAdjacency =
        adjacencyPool.size === 0 ||
        Array.from(adjacencyPool).some((base) => munAdj.get(base)?.has(munId) === true);
      if (!hasAdjacency) {
        invalidReason = `target municipality ${munId} is not adjacent`;
        break;
      }
      accepted.add(munId);
    }

    if (!invalidReason) {
      for (const munId of desired) {
        const max = getMaxBrigadesPerMun(munId);
        const next = (countByMunFaction.get(`${munId}::${f.faction}`) ?? 0) + 1;
        if (next > max) {
          invalidReason = `${munId} exceeds max brigades per mun for ${f.faction}`;
          break;
        }
      }
    }

    if (invalidReason) {
      for (const munId of current) inc(munId, f.faction, 1);
      report.orders_rejected += 1;
      report.rejected_reasons.push(`${formationId}: ${invalidReason}`);
      continue;
    }

    assignments[formationId] = desired;
    for (const munId of desired) inc(munId, f.faction, 1);
    report.orders_applied += 1;
  }

  state.brigade_municipality_assignment = assignments;
  state.brigade_mun_orders = {};
  return report;
}

export function syncBrigadeMunicipalityAssignmentFromAoR(
  state: GameState,
  settlements?: Map<SettlementId, SettlementRecord>
): void {
  const brigadeAor = state.brigade_aor ?? {};
  const forms = state.formations ?? {};
  const pc = state.political_controllers ?? {};
  const sidToMun = buildSidToMunMap(Object.keys(pc), settlements);
  const next: Record<FormationId, MunicipalityId[]> = {};

  for (const [sid, brigadeId] of Object.entries(brigadeAor)) {
    if (!brigadeId) continue;
    const f = forms[brigadeId];
    if (!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade') continue;
    const munId = resolveMunicipalityForSid(sid as SettlementId, sidToMun);
    const list = next[brigadeId] ?? [];
    list.push(munId);
    next[brigadeId] = list;
  }
  for (const formationId of Object.keys(next)) {
    next[formationId] = uniqueSortedMunicipalities(next[formationId]!);
  }
  state.brigade_municipality_assignment = next;
}

// --- Public API ---

/**
 * Initialize per-brigade AoR assignment at Phase II entry.
 * Each front-active settlement is assigned to exactly one brigade.
 * Rear settlements get null.
 */
export function initializeBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[],
  settlements?: Map<SettlementId, SettlementRecord>
): BrigadeAoRReport {
  const pc = state.political_controllers ?? {};
  const sidToMun = buildSidToMunMap(Object.keys(pc), settlements);
  const assignments = ensureBrigadeMunicipalityAssignment(state, edges, sidToMun);
  return deriveBrigadeAoRFromMunicipalities(state, edges, sidToMun, assignments);
}

/**
 * Per-turn validation and repair of brigade AoR.
 * - Reassign settlements from dissolved/inactive brigades to nearest surviving brigade.
 * - Assign newly front-active settlements to nearest brigade.
 */
export function validateBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[],
  settlements?: Map<SettlementId, SettlementRecord>
): void {
  const pc = state.political_controllers ?? {};
  const sidToMun = buildSidToMunMap(Object.keys(pc), settlements);
  const assignments = ensureBrigadeMunicipalityAssignment(state, edges, sidToMun);
  deriveBrigadeAoRFromMunicipalities(state, edges, sidToMun, assignments);
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
 * Compute dynamic operational coverage cap for a brigade.
 * - Base cap scales with personnel.
 * - Readiness/posture reduce effective frontage capacity.
 * - Urban fortress/home-defense (e.g. Sarajevo core) may collapse to 1-2 settlements.
 */
export function computeBrigadeOperationalCoverageCap(
  state: GameState,
  formationId: FormationId
): number {
  const formation = state.formations?.[formationId];
  if (!formation) return 0;
  return computeBrigadeOperationalCoverageCapFromFormation(formation);
}

/**
 * Return the capped subset of AoR settlements treated as actively covered this turn.
 * Deterministic ordering:
 * - Prefer front-touching settlements, then expand inward by BFS inside the brigade AoR.
 * - Fall back to SID-sorted AoR when graph context is unavailable.
 */
export function getBrigadeOperationalCoverageSettlements(
  state: GameState,
  formationId: FormationId,
  edges?: EdgeRecord[]
): SettlementId[] {
  const aor = getBrigadeAoRSettlements(state, formationId);
  const cap = computeBrigadeOperationalCoverageCap(state, formationId);
  if (cap <= 0) return [];
  if (aor.length <= cap) return aor;
  if (!edges || edges.length === 0) return aor.slice(0, cap);

  const pc = state.political_controllers ?? {};
  const formation = state.formations?.[formationId];
  const faction = formation?.faction;
  const aorSet = new Set(aor);
  const adj = new Map<SettlementId, SettlementId[]>();
  const frontSeeds = new Set<SettlementId>();

  for (const e of edges) {
    if (aorSet.has(e.a) || aorSet.has(e.b)) {
      if (aorSet.has(e.a)) {
        const list = adj.get(e.a) ?? [];
        if (aorSet.has(e.b)) list.push(e.b);
        adj.set(e.a, list);
      }
      if (aorSet.has(e.b)) {
        const list = adj.get(e.b) ?? [];
        if (aorSet.has(e.a)) list.push(e.a);
        adj.set(e.b, list);
      }
      if (aorSet.has(e.a) && !aorSet.has(e.b) && pc[e.a] && pc[e.b] && pc[e.a] !== pc[e.b]) {
        frontSeeds.add(e.a);
      }
      if (aorSet.has(e.b) && !aorSet.has(e.a) && pc[e.a] && pc[e.b] && pc[e.a] !== pc[e.b]) {
        frontSeeds.add(e.b);
      }
      if (aorSet.has(e.a) && aorSet.has(e.b) && pc[e.a] && pc[e.b] && pc[e.a] !== pc[e.b]) {
        frontSeeds.add(e.a);
        frontSeeds.add(e.b);
      }
    }
  }

  for (const list of adj.values()) list.sort(strictCompare);

  const seedCandidates = Array.from(frontSeeds).sort(strictCompare);
  if (seedCandidates.length === 0) {
    const hq = formation?.hq_sid;
    if (hq && aorSet.has(hq)) seedCandidates.push(hq);
    else seedCandidates.push(aor[0]);
  }

  const visited = new Set<SettlementId>();
  const queue: SettlementId[] = [];
  const covered: SettlementId[] = [];

  for (const seed of seedCandidates) {
    if (!visited.has(seed)) {
      visited.add(seed);
      queue.push(seed);
      covered.push(seed);
      if (covered.length >= cap) return covered.sort(strictCompare);
    }
  }

  while (queue.length > 0 && covered.length < cap) {
    const current = queue.shift()!;
    const neighbors = adj.get(current) ?? [];
    for (const n of neighbors) {
      if (visited.has(n)) continue;
      if (faction && pc[n] && pc[n] !== faction) continue;
      visited.add(n);
      queue.push(n);
      covered.push(n);
      if (covered.length >= cap) break;
    }
  }

  if (covered.length < cap) {
    for (const sid of aor) {
      if (covered.length >= cap) break;
      if (!visited.has(sid)) {
        visited.add(sid);
        covered.push(sid);
      }
    }
  }

  return covered.sort(strictCompare);
}

/**
 * Compute brigade density: personnel / AoR settlement count.
 * Higher density = more concentrated force = more pressure per edge.
 * Equals per-settlement garrison when manpower is split equally across AoR (Brigade Realism plan §3.3).
 */
export function computeBrigadeDensity(
  state: GameState,
  formationId: FormationId,
  edges?: EdgeRecord[]
): number {
  const settlements = getBrigadeOperationalCoverageSettlements(state, formationId, edges);
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
  sid: SettlementId,
  edges?: EdgeRecord[]
): number {
  const brigadeAor = state.brigade_aor ?? {};
  const formationId = brigadeAor[sid];
  if (!formationId) return 0;
  const covered = new Set(getBrigadeOperationalCoverageSettlements(state, formationId, edges));
  if (!covered.has(sid)) return 0;
  return computeBrigadeDensity(state, formationId, edges);
}
