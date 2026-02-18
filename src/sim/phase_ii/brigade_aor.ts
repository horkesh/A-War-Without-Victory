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
import {
  BRIGADE_OPERATIONAL_AOR_HARD_CAP,
  getMaxBrigadesPerMun,
  getPersonnelBasedAoRCap,
  MAX_MUNICIPALITIES_PER_BRIGADE
} from '../../state/formation_constants.js';
import {
  computeBrigadeOperationalCoverageCapFromFormation,
  getFormationHomeMunFromTags
} from '../../state/brigade_operational_cap.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';
import { areRbihHrhbAllied } from '../phase_i/alliance_update.js';
import { assignCorpsDirectedAoR, enforceContiguity, enforceCorpsLevelContiguity } from './corps_directed_aor.js';
import { checkBrigadeContiguity } from './aor_contiguity.js';
import { detectDisconnectedTerritories, getFormationCorpsId } from './corps_sector_partition.js';

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
    if (!controlA || !controlB || controlA === controlB) continue;
    const isRbihHrhbPair =
      (controlA === 'RBiH' && controlB === 'HRHB') || (controlA === 'HRHB' && controlB === 'RBiH');
    if (isRbihHrhbPair) {
      const turn = state.meta?.turn ?? 0;
      const earliestWar = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
      if (turn < earliestWar || areRbihHrhbAllied(state)) continue;
    }
    frontActive.add(edge.a);
    frontActive.add(edge.b);
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

function isActiveBrigade(f: FormationState | null | undefined): f is FormationState {
  return !!f && f.status === 'active' && (f.kind ?? 'brigade') === 'brigade';
}

/** Get active brigades for a faction, sorted by ID. */
function getActiveBrigades(state: GameState, faction: FactionId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  const ids = Object.keys(formations).sort(strictCompare);
  for (const id of ids) {
    const f = formations[id];
    if (!f || f.faction !== faction || !isActiveBrigade(f)) continue;
    result.push(f);
  }
  return result;
}

function uniqueSortedMunicipalities(values: MunicipalityId[]): MunicipalityId[] {
  return Array.from(new Set(values)).sort(strictCompare);
}

function getHqMunicipality(
  brigade: FormationState,
  sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId | null {
  const hq = brigade.hq_sid;
  if (!hq) return null;
  return resolveMunicipalityForSid(hq, sidToMun);
}

function normalizeMunicipalityAssignmentForBrigade(
  brigade: FormationState,
  values: MunicipalityId[],
  munAdj: Map<MunicipalityId, Set<MunicipalityId>>,
  sidToMun: Record<SettlementId, MunicipalityId>,
  enforceHqNeighborRule: boolean
): MunicipalityId[] {
  const unique = uniqueSortedMunicipalities(values);
  if (!enforceHqNeighborRule) {
    return unique.slice(0, MAX_MUNICIPALITIES_PER_BRIGADE);
  }
  if (unique.length === 0) {
    const hqMun = getHqMunicipality(brigade, sidToMun);
    return hqMun ? [hqMun] : [];
  }
  const hqMun = getHqMunicipality(brigade, sidToMun);
  if (!hqMun) return unique.slice(0, MAX_MUNICIPALITIES_PER_BRIGADE);
  const neighbors = munAdj.get(hqMun);
  const allowedNeighbors = unique
    .filter((munId) => munId !== hqMun && (neighbors?.has(munId) ?? false))
    .sort(strictCompare)
    .slice(0, Math.max(0, MAX_MUNICIPALITIES_PER_BRIGADE - 1));
  return [hqMun, ...allowedNeighbors];
}

function canAssignMunicipalityToBrigade(
  brigade: FormationState,
  current: MunicipalityId[],
  candidate: MunicipalityId,
  munAdj: Map<MunicipalityId, Set<MunicipalityId>>,
  sidToMun: Record<SettlementId, MunicipalityId>,
  enforceHqNeighborRule: boolean
): boolean {
  if (current.includes(candidate)) return true;
  if (current.length >= MAX_MUNICIPALITIES_PER_BRIGADE) return false;
  if (!enforceHqNeighborRule) return true;
  const hqMun = getHqMunicipality(brigade, sidToMun);
  if (!hqMun) return true;
  if (candidate === hqMun) return true;
  return munAdj.get(hqMun)?.has(candidate) ?? false;
}

/** Resolve a settlement's municipality ID from the lookup, falling back to the SID itself. */
export function resolveMunicipalityForSid(
  sid: SettlementId,
  sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId {
  return sidToMun[sid] ?? sid;
}

/** Build a settlement→municipality lookup from settlement records + fallback to SID. */
export function buildSidToMunMap(
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

function hasMunicipalityMetadata(sidToMun: Record<SettlementId, MunicipalityId>): boolean {
  return Object.entries(sidToMun).some(([sid, mun]) => sid !== mun);
}

/** Build municipality adjacency graph from settlement edges and SID→municipality lookup. */
export function buildMunicipalityAdjacency(
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
  // Corps-directed path: when corps_command exists (Phase II normal flow)
  const corpsCommand = state.corps_command;
  if (corpsCommand && Object.keys(corpsCommand).length > 0) {
    return assignCorpsDirectedAoR(state, edges);
  }
  // Legacy Voronoi fallback: Phase I, tests without corps, backward compat
  return legacyVoronoiMunicipalityAssignment(state, edges, sidToMun);
}

/** Legacy Voronoi-based municipality assignment (backward compat). */
function legacyVoronoiMunicipalityAssignment(
  state: GameState,
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>
): Record<FormationId, MunicipalityId[]> {
  const existing = state.brigade_municipality_assignment ?? {};
  const normalized: Record<FormationId, MunicipalityId[]> = {};
  const formations = state.formations ?? {};
  const pc = state.political_controllers ?? {};
  const allFrontActive = expandFrontActiveWithDepth(identifyFrontActiveSettlements(state, edges), edges, pc, 1);
  const munAdj = buildMunicipalityAdjacency(edges, sidToMun);
  const enforceMunicipalityRule = hasMunicipalityMetadata(sidToMun);

  // Keep valid existing assignments for active brigades.
  for (const formationId of Object.keys(formations).sort(strictCompare)) {
    const f = formations[formationId];
    if (!isActiveBrigade(f)) continue;
    const raw = existing[formationId] ?? [];
    if (!Array.isArray(raw)) continue;
    const clean = uniqueSortedMunicipalities(
      raw.filter((mun): mun is MunicipalityId => typeof mun === 'string' && mun.length > 0)
    );
    if (clean.length > 0) {
      normalized[formationId] = normalizeMunicipalityAssignmentForBrigade(
        f,
        clean,
        munAdj,
        sidToMun,
        enforceMunicipalityRule
      );
    }
  }

  // Bootstrap from current brigade_aor when present.
  const currentAoR = state.brigade_aor ?? {};
  for (const [sid, brigadeId] of Object.entries(currentAoR)) {
    if (!brigadeId) continue;
    const f = formations[brigadeId];
    if (!isActiveBrigade(f)) continue;
    const mun = resolveMunicipalityForSid(sid as SettlementId, sidToMun);
    const list = normalized[brigadeId] ?? [];
    list.push(mun);
    normalized[brigadeId] = list;
  }
  for (const brigadeId of Object.keys(normalized)) {
    const f = formations[brigadeId];
    if (!isActiveBrigade(f)) continue;
    normalized[brigadeId] = normalizeMunicipalityAssignmentForBrigade(
      f,
      normalized[brigadeId]!,
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
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
      const f = formations[brigadeId];
      if (!isActiveBrigade(f)) continue;
      normalized[brigadeId] = normalizeMunicipalityAssignmentForBrigade(
        f,
        normalized[brigadeId]!,
        munAdj,
        sidToMun,
        enforceMunicipalityRule
      );
    }
  }

  // Final fallback: use brigade HQ municipality.
  for (const formationId of Object.keys(formations).sort(strictCompare)) {
    const f = formations[formationId];
    if (!isActiveBrigade(f) || (normalized[formationId]?.length ?? 0) > 0) continue;
    const hq = f.hq_sid;
    if (!hq) continue;
    if (pc[hq] && pc[hq] !== f.faction) continue;
    normalized[formationId] = normalizeMunicipalityAssignmentForBrigade(
      f,
      [resolveMunicipalityForSid(hq, sidToMun)],
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
  }

  // Ensure every front-active (faction, municipality) has at least one brigade assignment
  // only for municipalities that have a brigade (home) in them — i.e. mun is the home municipality
  // of at least one active brigade of that faction. We do not assign random uncovered muns to brigades.
  const homeMunsByFaction = new Map<FactionId, Set<MunicipalityId>>();
  for (const f of Object.values(formations)) {
    if (!isActiveBrigade(f)) continue;
    const homeMun = getFormationHomeMunFromTags(f.tags);
    if (!homeMun) continue;
    const set = homeMunsByFaction.get(f.faction) ?? new Set<MunicipalityId>();
    set.add(homeMun);
    homeMunsByFaction.set(f.faction, set);
  }
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
    const homeMuns = homeMunsByFaction.get(faction);
    if (!homeMuns || !homeMuns.has(munId)) continue;
    const candidates = getActiveBrigades(state, faction).sort((a, b) => {
      const ca = normalized[a.id]?.length ?? 0;
      const cb = normalized[b.id]?.length ?? 0;
      if (ca !== cb) return ca - cb;
      return strictCompare(a.id, b.id);
    });
    // Prefer brigade below municipality cap so no single brigade gets 200+ settlements.
    const pick =
      candidates.find((c) =>
        canAssignMunicipalityToBrigade(
          c,
          normalized[c.id] ?? [],
          munId,
          munAdj,
          sidToMun,
          enforceMunicipalityRule
        )
      ) ?? candidates[0];
    if (!pick) continue;
    const list = normalized[pick.id] ?? [];
    if (!canAssignMunicipalityToBrigade(pick, list, munId, munAdj, sidToMun, enforceMunicipalityRule)) continue;
    list.push(munId);
    normalized[pick.id] = normalizeMunicipalityAssignmentForBrigade(
      pick,
      list,
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
    coveredFactionMun.add(key);
  }

  // Same-HQ robustness: if a brigade still has no municipality, transfer one from largest same-faction donor.
  for (const brigade of Object.values(formations).sort((a, b) => strictCompare(a.id, b.id))) {
    if (!isActiveBrigade(brigade) || (normalized[brigade.id]?.length ?? 0) > 0) continue;
    const donors = Object.values(formations)
      .filter((f) => {
        if (!f || f.id === brigade.id) return false;
        if (!isActiveBrigade(f) || f.faction !== brigade.faction) return false;
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
    if (!isActiveBrigade(brigade)) continue;
    const frontMuns = frontActiveMunsByFaction.get(brigade.faction);
    if (!frontMuns || frontMuns.size === 0) continue;
    const own = normalized[brigade.id] ?? [];
    if (own.some((mun) => frontMuns.has(mun))) continue;
    const donors = Object.values(formations)
      .filter((f) => {
        if (!f || f.id === brigade.id) return false;
        if (!isActiveBrigade(f) || f.faction !== brigade.faction) return false;
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
    normalized[brigade.id] = normalizeMunicipalityAssignmentForBrigade(
      brigade,
      [...(normalized[brigade.id] ?? []), pick],
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
  }

  // Hard rule: HQ municipality + up to two neighboring municipalities.
  for (const formationId of Object.keys(formations).sort(strictCompare)) {
    const f = formations[formationId];
    if (!isActiveBrigade(f)) continue;
    normalized[formationId] = normalizeMunicipalityAssignmentForBrigade(
      f,
      normalized[formationId] ?? [],
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
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
        if (!isActiveBrigade(f) || f.faction !== faction) return false;
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
  const enforceMunicipalityRule = hasMunicipalityMetadata(sidToMun);

  const countByMunFaction = new Map<string, number>();
  const inc = (munId: MunicipalityId, faction: FactionId, delta: number): void => {
    const key = `${munId}::${faction}`;
    const next = (countByMunFaction.get(key) ?? 0) + delta;
    countByMunFaction.set(key, next);
  };
  for (const [formationId, munIds] of Object.entries(assignments)) {
    const f = forms[formationId];
    if (!isActiveBrigade(f)) continue;
    for (const munId of munIds) inc(munId, f.faction, 1);
  }

  const orderEntries = Object.entries(orders).sort((a, b) => strictCompare(a[0], b[0]));
  for (const [formationId, raw] of orderEntries) {
    const f = forms[formationId];
    if (!isActiveBrigade(f)) {
      report.orders_rejected += 1;
      report.rejected_reasons.push(`${formationId}: invalid brigade`);
      continue;
    }
    const current = assignments[formationId] ?? [];
    for (const munId of current) inc(munId, f.faction, -1);

    const desired = raw == null
      ? []
      : uniqueSortedMunicipalities(raw.filter((mun): mun is MunicipalityId => typeof mun === 'string' && mun.length > 0));
    let invalidReason: string | null = null;
    const hqMun = getHqMunicipality(f, sidToMun);
    if (desired.length > MAX_MUNICIPALITIES_PER_BRIGADE) {
      invalidReason = `exceeds ${MAX_MUNICIPALITIES_PER_BRIGADE} municipalities per brigade`;
    }
    if (!invalidReason && enforceMunicipalityRule && hqMun && !desired.includes(hqMun)) {
      invalidReason = `must include HQ municipality ${hqMun}`;
    }
    if (!invalidReason && enforceMunicipalityRule && hqMun) {
      const neighbors = munAdj.get(hqMun) ?? new Set<MunicipalityId>();
      const invalidTarget = desired.find((munId) => munId !== hqMun && !neighbors.has(munId));
      if (invalidTarget) invalidReason = `${invalidTarget} is not neighboring HQ municipality ${hqMun}`;
    }

    const currentSet = new Set(current);
    const accepted = new Set(current.filter((mun) => desired.includes(mun)));

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

    assignments[formationId] = normalizeMunicipalityAssignmentForBrigade(
      f,
      desired,
      munAdj,
      sidToMun,
      enforceMunicipalityRule
    );
    for (const munId of assignments[formationId] ?? []) inc(munId, f.faction, 1);
    report.orders_applied += 1;
  }

  state.brigade_municipality_assignment = assignments;
  state.brigade_mun_orders = {};
  return report;
}

// --- Settlement-level AoR init (Brigade AoR Redesign Phase A) ---

/**
 * Initialize brigade_aor from OOB: each active brigade gets 1–4 contiguous settlements
 * by personnel-based cap (BFS from HQ through faction-controlled territory). Deterministic.
 */
function initializeBrigadeAoRSettlementLevel(
  state: GameState,
  edges: EdgeRecord[]
): BrigadeAoRReport {
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const adj = buildAdjacency(edges);
  const brigadeAor: Record<SettlementId, FormationId | null> = {};
  const assigned = new Set<SettlementId>();
  const brigadeCounts: Record<FormationId, number> = {};

  const allSettlementIds = Object.keys(pc).sort(strictCompare) as SettlementId[];
  const factionControlled = (sid: SettlementId, faction: FactionId) => pc[sid] === faction;

  const brigades = Object.values(formations)
    .filter((f): f is FormationState => isActiveBrigade(f))
    .sort((a, b) => strictCompare(a.id, b.id));

  for (const formation of brigades) {
    const faction = formation.faction;
    const maxAoR = getPersonnelBasedAoRCap(formation.personnel ?? 800);
    if (maxAoR <= 0) continue;

    let seed: SettlementId | null = null;
    if (formation.hq_sid && factionControlled(formation.hq_sid, faction) && !assigned.has(formation.hq_sid)) {
      seed = formation.hq_sid;
    }
    if (!seed) {
      for (const sid of allSettlementIds) {
        if (factionControlled(sid, faction) && !assigned.has(sid)) {
          seed = sid;
          break;
        }
      }
    }
    if (!seed) continue;

    const queue: SettlementId[] = [seed];
    const visited = new Set<SettlementId>([seed]);
    const thisAoR: SettlementId[] = [seed];
    assigned.add(seed);

    let head = 0;
    while (head < queue.length && thisAoR.length < maxAoR) {
      const sid = queue[head++]!;
      const neighbors = (adj.get(sid) ?? []).filter(
        (n) => factionControlled(n, faction) && !assigned.has(n) && !visited.has(n)
      );
      neighbors.sort(strictCompare);
      for (const n of neighbors) {
        if (thisAoR.length >= maxAoR) break;
        visited.add(n);
        queue.push(n);
        thisAoR.push(n);
        assigned.add(n);
      }
    }

    for (const sid of thisAoR.sort(strictCompare)) {
      brigadeAor[sid] = formation.id;
    }
    brigadeCounts[formation.id] = thisAoR.length;
  }

  state.brigade_aor = brigadeAor;
  const frontAssigned = Object.values(brigadeAor).filter((v) => v != null).length;
  const rearCount = allSettlementIds.length - frontAssigned;
  return {
    front_active_assigned: frontAssigned,
    rear_settlements: rearCount,
    brigade_counts: brigadeCounts
  };
}

// --- Public API ---

/**
 * Initialize per-brigade AoR assignment at Phase II entry.
 * Settlement-level redesign: each brigade gets 1–4 contiguous settlements (personnel-based cap).
 */
export function initializeBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[],
  settlements?: Map<SettlementId, SettlementRecord>
): BrigadeAoRReport {
  const report = initializeBrigadeAoRSettlementLevel(state, edges);

  if (state.brigade_aor && Object.keys(state.brigade_aor).length > 0) {
    const frontActive = identifyFrontActiveSettlements(state, edges);
    const adj = buildAdjacencyFromEdges(edges);
    enforceContiguity(state, frontActive, adj);
    enforceCorpsLevelContiguity(state, edges);
  }

  return report;
}

/**
 * Per-turn validation and repair of brigade AoR (settlement-level redesign).
 * - Clear entries for dissolved/inactive brigades.
 * - Enforce contiguity (repair islands).
 */
export function validateBrigadeAoR(
  state: GameState,
  edges: EdgeRecord[],
  _settlements?: Map<SettlementId, SettlementRecord>
): void {
  const brigadeAor = state.brigade_aor;
  const formations = state.formations ?? {};
  if (!brigadeAor) return;

  for (const sid of Object.keys(brigadeAor).sort(strictCompare)) {
    const formationId = brigadeAor[sid as SettlementId];
    if (!formationId) continue;
    const f = formations[formationId];
    if (!isActiveBrigade(f)) {
      brigadeAor[sid as SettlementId] = null;
    }
  }

  const frontActive = identifyFrontActiveSettlements(state, edges);
  const adj = buildAdjacencyFromEdges(edges);
  enforceContiguity(state, frontActive, adj);
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

const SORTED_ADJACENCY_BY_EDGES = new WeakMap<EdgeRecord[], Map<SettlementId, readonly SettlementId[]>>();

function getSortedAdjacency(edges: EdgeRecord[]): Map<SettlementId, readonly SettlementId[]> {
  const cached = SORTED_ADJACENCY_BY_EDGES.get(edges);
  if (cached) return cached;

  const adjacency = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    const listA = adjacency.get(edge.a) ?? [];
    listA.push(edge.b);
    adjacency.set(edge.a, listA);

    const listB = adjacency.get(edge.b) ?? [];
    listB.push(edge.a);
    adjacency.set(edge.b, listB);
  }
  for (const [sid, neighbors] of adjacency.entries()) {
    neighbors.sort(strictCompare);
    adjacency.set(sid, neighbors);
  }

  SORTED_ADJACENCY_BY_EDGES.set(edges, adjacency);
  return adjacency;
}

/**
 * Return the settlements actively covered by this brigade this turn.
 * Settlement-level redesign: AoR IS the coverage (1–4 settlements); no separate operational cap.
 */
export function getBrigadeOperationalCoverageSettlements(
  state: GameState,
  formationId: FormationId,
  _edges?: EdgeRecord[]
): SettlementId[] {
  return getBrigadeAoRSettlements(state, formationId);
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
 * Garrison strength at a settlement: brigade personnel split across AoR, or militia garrison if no brigade (Phase B).
 * Defender strength at that settlement = this value (Brigade Realism plan §3.3).
 */
export function getSettlementGarrison(
  state: GameState,
  sid: SettlementId,
  edges?: EdgeRecord[]
): number {
  const brigadeAor = state.brigade_aor ?? {};
  const formationId = brigadeAor[sid];
  if (formationId) {
    const coveredSettlements = getBrigadeOperationalCoverageSettlements(state, formationId, edges);
    if (coveredSettlements.includes(sid)) {
      const formation = state.formations?.[formationId];
      if (formation) {
        const personnel = formation.personnel ?? 1000;
        return personnel / Math.max(1, coveredSettlements.length);
      }
    }
  }
  return state.militia_garrison?.[sid] ?? 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Surrounded-brigade reform (reform in home territory)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect brigades whose entire AoR is in an enclave (not main territory) and
 * apply "reform in home territory": clear their AoR, set HQ to a faction-controlled
 * settlement in main territory (prefer home municipality). If no main-territory
 * settlement exists for the faction, set formation status to inactive (stranded).
 *
 * Deterministic: sorted iteration over factions, brigades, settlements.
 */
export function applySurroundedBrigadeReform(
  state: GameState,
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>
): void {
  const brigadeAor = state.brigade_aor;
  const formations = state.formations ?? {};
  const pc = state.political_controllers ?? {};
  if (!brigadeAor) return;

  const factionIds = Array.from(new Set((state.factions ?? []).map((f) => f.id))).sort(strictCompare);

  for (const factionId of factionIds) {
    const { mainTerritory } = detectDisconnectedTerritories(factionId, pc, edges);
    const mainList = Array.from(mainTerritory).sort(strictCompare);

    // Brigade -> settlements in its AoR
    const brigadeToSettlements = new Map<FormationId, SettlementId[]>();
    for (const [sid, brigadeId] of Object.entries(brigadeAor) as [SettlementId, FormationId | null][]) {
      if (!brigadeId) continue;
      const f = formations[brigadeId];
      if (!f || f.faction !== factionId || (f.kind ?? 'brigade') !== 'brigade') continue;
      const list = brigadeToSettlements.get(brigadeId) ?? [];
      list.push(sid);
      brigadeToSettlements.set(brigadeId, list);
    }

    const brigadeIds = Array.from(brigadeToSettlements.keys()).sort(strictCompare);
    for (const brigadeId of brigadeIds) {
      const settlements = brigadeToSettlements.get(brigadeId)!;
      if (settlements.length === 0) continue;

      const inMain = settlements.some((sid) => mainTerritory.has(sid));
      if (inMain) continue; // at least one settlement in main → not surrounded

      // Surrounded: entire AoR is in enclave(s). Reform in home territory.
      const formation = formations[brigadeId];
      if (!formation) continue;

      for (const sid of settlements) {
        brigadeAor[sid] = null;
      }

      const homeMun = getFormationHomeMunFromTags(formation.tags) ?? (formation.hq_sid ? sidToMun[formation.hq_sid] : null);
      // First faction-controlled in main territory, prefer home mun, by SID sort
      let newHq: SettlementId | null = null;
      for (const sid of mainList) {
        if (pc[sid] !== factionId) continue;
        if (homeMun && sidToMun[sid] === homeMun) {
          newHq = sid;
          break;
        }
        if (!newHq) newHq = sid;
      }

      if (newHq) {
        formation.hq_sid = newHq;
      } else {
        formation.status = 'inactive';
      }
    }
  }
}
