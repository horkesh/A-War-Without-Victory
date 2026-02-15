/**
 * Corps-Directed AoR Assignment.
 *
 * Replaces the Voronoi BFS approach with a corps-command-driven system:
 * 1. Detect disconnected territories (main + enclaves)
 * 2. Partition main territory frontline into corps sectors
 * 3. Per-corps: walk front municipalities, allocate brigades sequentially
 * 4. Derive settlement-level AoR from municipality assignment
 * 5. Validate and repair contiguity (hard invariant)
 *
 * Key design: sparse coverage is expected at war start. Not every front settlement
 * will have brigade coverage — uncovered settlements rely on militia/TO defense.
 * Brigades are tied to their home municipality from OOB data.
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type {
  GameState,
  FactionId,
  FormationId,
  SettlementId,
  MunicipalityId,
  FormationState,
} from '../../state/game_state.js';
import type { EdgeRecord, SettlementRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { MAX_MUNICIPALITIES_PER_BRIGADE } from '../../state/formation_constants.js';
import { getFormationHomeMunFromTags } from '../../state/brigade_operational_cap.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';
import {
  identifyFrontActiveSettlements,
  expandFrontActiveWithDepth,
  resolveMunicipalityForSid,
  buildSidToMunMap,
  buildMunicipalityAdjacency,
} from './brigade_aor.js';
import {
  detectDisconnectedTerritories,
  partitionFrontIntoCorpsSectors,
  orderFrontMunicipalitiesForCorps,
  getFormationCorpsId,
} from './corps_sector_partition.js';
import {
  checkBrigadeContiguity,
  repairContiguity,
  checkCorpsContiguity,
  repairCorpsContiguity,
} from './aor_contiguity.js';

// --- Helpers (locally scoped) ---

function isActiveBrigade(f: FormationState | null | undefined): f is FormationState {
  return !!f && f.status === 'active' && (f.kind ?? 'brigade') === 'brigade';
}

function getHqMunicipality(
  brigade: FormationState,
  sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId | null {
  const hq = brigade.hq_sid;
  if (!hq) return null;
  return resolveMunicipalityForSid(hq, sidToMun);
}

// --- Per-corps brigade allocation along the front ---

/**
 * Allocate brigades to front municipalities within a corps sector.
 *
 * Each brigade starts at its home municipality, then gets up to 2 contiguous
 * neighbor municipalities. Allocation walks the front in order, filling gaps
 * adjacent to each brigade's home. Gaps (uncovered municipalities) are expected.
 *
 * Returns per-brigade municipality arrays (contiguous, max 3, home-anchored).
 */
function allocateBrigadesToFrontMunicipalities(
  brigades: FormationState[],
  orderedFrontMuns: MunicipalityId[],
  munAdj: Map<MunicipalityId, Set<MunicipalityId>>,
  sidToMun: Record<SettlementId, MunicipalityId>
): Record<FormationId, MunicipalityId[]> {
  const result: Record<FormationId, MunicipalityId[]> = {};
  if (brigades.length === 0) return result;

  // Build brigade home municipalities
  const brigadeHomeMun = new Map<FormationId, MunicipalityId>();
  for (const brigade of brigades) {
    const homeMun = getFormationHomeMunFromTags(brigade.tags) ?? getHqMunicipality(brigade, sidToMun);
    if (homeMun) brigadeHomeMun.set(brigade.id, homeMun);
  }

  const frontMunSet = new Set(orderedFrontMuns);
  const assignedMuns = new Set<MunicipalityId>();

  // Phase 1: Each brigade gets its home municipality
  for (const brigade of brigades) {
    const homeMun = brigadeHomeMun.get(brigade.id);
    if (homeMun) {
      result[brigade.id] = [homeMun];
      assignedMuns.add(homeMun);
    } else {
      result[brigade.id] = [];
    }
  }

  // Phase 2: Extend each brigade with up to 2 contiguous neighbors from the front
  // Priority: fill the largest uncovered gap adjacent to the brigade's home
  for (const brigade of brigades) {
    const current = result[brigade.id];
    if (!current || current.length === 0) continue;
    const homeMun = current[0];
    const needed = MAX_MUNICIPALITIES_PER_BRIGADE - current.length;
    if (needed <= 0) continue;

    // Find front municipalities that are neighbors of the home AND not yet assigned
    const homeNeighbors = munAdj.get(homeMun) ?? new Set<MunicipalityId>();
    const candidateSet = new Set(
      Array.from(homeNeighbors).filter((mun) => frontMunSet.has(mun) && !assignedMuns.has(mun))
    );

    // Pick the first `needed` candidates from the front walk order (preserves front coherence)
    const picked: MunicipalityId[] = [];
    for (const mun of orderedFrontMuns) {
      if (picked.length >= needed) break;
      if (candidateSet.has(mun)) {
        picked.push(mun);
      }
    }

    for (const mun of picked) {
      current.push(mun);
      assignedMuns.add(mun);
    }
  }

  return result;
}

/**
 * For a set of enclave settlements with brigades, run a simplified local AoR assignment.
 * Brigades in the enclave get their home municipality; no corps-level coordination.
 */
function assignEnclaveAoR(
  enclaveBrigades: FormationState[],
  enclaveSettlements: Set<SettlementId>,
  frontActive: Set<SettlementId>,
  edges: EdgeRecord[],
  sidToMun: Record<SettlementId, MunicipalityId>,
  munAdj: Map<MunicipalityId, Set<MunicipalityId>>
): Record<FormationId, MunicipalityId[]> {
  const result: Record<FormationId, MunicipalityId[]> = {};
  if (enclaveBrigades.length === 0) return result;

  // Get front municipalities within the enclave
  const enclaveFrontMuns: MunicipalityId[] = [];
  const seenMuns = new Set<MunicipalityId>();
  for (const sid of Array.from(enclaveSettlements).sort(strictCompare)) {
    if (!frontActive.has(sid)) continue;
    const mun = sidToMun[sid];
    if (mun && !seenMuns.has(mun)) {
      seenMuns.add(mun);
      enclaveFrontMuns.push(mun);
    }
  }

  return allocateBrigadesToFrontMunicipalities(
    enclaveBrigades,
    enclaveFrontMuns,
    munAdj,
    sidToMun
  );
}

// --- Main entry point ---

/**
 * Corps-directed AoR assignment. Replaces the Voronoi BFS approach.
 *
 * Returns the municipality assignment AND writes state.brigade_aor and
 * state.brigade_municipality_assignment.
 */
export function assignCorpsDirectedAoR(
  state: GameState,
  edges: EdgeRecord[],
  settlements?: Map<SettlementId, SettlementRecord>
): Record<FormationId, MunicipalityId[]> {
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const sidToMun = buildSidToMunMap(Object.keys(pc), settlements);
  const munAdj = buildMunicipalityAdjacency(edges, sidToMun);
  const adj = buildAdjacencyFromEdges(edges);

  // Step 1: Identify front-active settlements
  const frontActive = identifyFrontActiveSettlements(state, edges);
  const expandedFrontActive = expandFrontActiveWithDepth(frontActive, edges, pc, 1);

  // Get all factions
  const factions = new Set<FactionId>((state.factions ?? []).map((f) => f.id));
  const allAssignments: Record<FormationId, MunicipalityId[]> = {};

  for (const faction of factions) {
    // Get active brigades for this faction
    const brigades: FormationState[] = [];
    for (const fid of Object.keys(formations).sort(strictCompare)) {
      const f = formations[fid];
      if (isActiveBrigade(f) && f.faction === faction) brigades.push(f);
    }

    if (brigades.length === 0) continue;

    // Step 2: Detect disconnected territories
    const territories = detectDisconnectedTerritories(faction, pc, edges);

    // Step 3: Partition main territory into corps sectors
    const { sectorByCorps, corpsBySettlement } = partitionFrontIntoCorpsSectors(
      state,
      faction,
      territories.mainTerritory,
      edges
    );

    // Group brigades by corps
    const brigadesByCorps = new Map<FormationId, FormationState[]>();
    const unattachedBrigades: FormationState[] = [];
    const enclaveBrigades = new Map<number, FormationState[]>();  // enclave index → brigades

    for (const brigade of brigades) {
      // Check if brigade is in an enclave
      const hq = brigade.hq_sid;
      let inEnclave = false;
      if (hq) {
        for (let i = 0; i < territories.enclaves.length; i++) {
          if (territories.enclaves[i].has(hq)) {
            const list = enclaveBrigades.get(i) ?? [];
            list.push(brigade);
            enclaveBrigades.set(i, list);
            inEnclave = true;
            break;
          }
        }
      }
      if (inEnclave) continue;

      const corpsId = getFormationCorpsId(brigade);
      if (corpsId && sectorByCorps.has(corpsId)) {
        const list = brigadesByCorps.get(corpsId) ?? [];
        list.push(brigade);
        brigadesByCorps.set(corpsId, list);
      } else if (corpsId) {
        // Corps exists but has no sector (no HQ in main territory) — try nearest sector
        const nearestCorps = findNearestCorpsForBrigade(brigade, corpsBySettlement, pc, faction, edges);
        if (nearestCorps) {
          const list = brigadesByCorps.get(nearestCorps) ?? [];
          list.push(brigade);
          brigadesByCorps.set(nearestCorps, list);
        } else {
          unattachedBrigades.push(brigade);
        }
      } else {
        unattachedBrigades.push(brigade);
      }
    }

    // Step 4: Per-corps allocation
    for (const [corpsId, corpsSettlements] of sectorByCorps.entries()) {
      const corpsBrigades = brigadesByCorps.get(corpsId) ?? [];
      if (corpsBrigades.length === 0) continue;

      // Sort brigades deterministically
      corpsBrigades.sort((a, b) => strictCompare(a.id, b.id));

      // Get ordered front municipalities for this corps sector
      const orderedFrontMuns = orderFrontMunicipalitiesForCorps(
        corpsSettlements,
        frontActive,
        adj,
        sidToMun
      );

      const corpsAssignment = allocateBrigadesToFrontMunicipalities(
        corpsBrigades,
        orderedFrontMuns,
        munAdj,
        sidToMun
      );

      for (const [brigadeId, muns] of Object.entries(corpsAssignment)) {
        allAssignments[brigadeId] = muns;
      }
    }

    // Step 5: Enclave brigades
    for (const [enclaveIdx, eBrigades] of enclaveBrigades.entries()) {
      const enclaveSettlements = territories.enclaves[enclaveIdx];
      if (!enclaveSettlements) continue;
      eBrigades.sort((a, b) => strictCompare(a.id, b.id));
      const enclaveAssignment = assignEnclaveAoR(
        eBrigades,
        enclaveSettlements,
        frontActive,
        edges,
        sidToMun,
        munAdj
      );
      for (const [brigadeId, muns] of Object.entries(enclaveAssignment)) {
        allAssignments[brigadeId] = muns;
      }
    }

    // Step 6: Unattached brigades — home municipality only
    for (const brigade of unattachedBrigades) {
      const homeMun = getFormationHomeMunFromTags(brigade.tags) ?? getHqMunicipality(brigade, sidToMun);
      allAssignments[brigade.id] = homeMun ? [homeMun] : [];
    }
  }

  // Step 7: Derive settlement-level AoR from municipality assignments
  deriveSettlementAoR(state, sidToMun, allAssignments, expandedFrontActive, adj);

  // Step 8: Contiguity validation and repair
  enforceContiguity(state, frontActive, adj);

  // Step 9: Corps-level contiguity enforcement (enclave-aware)
  enforceCorpsLevelContiguity(state, edges);

  state.brigade_municipality_assignment = allAssignments;
  return allAssignments;
}

// --- Settlement-level derivation ---

/**
 * Derive brigade_aor (settlement-level) from municipality assignments.
 * Only front-active and expanded-front settlements get assigned.
 * Settlements in unassigned municipalities remain null (militia/TO defense).
 */
function deriveSettlementAoR(
  state: GameState,
  sidToMun: Record<SettlementId, MunicipalityId>,
  assignments: Record<FormationId, MunicipalityId[]>,
  expandedFrontActive: Set<SettlementId>,
  adj: Map<SettlementId, Set<SettlementId>>
): void {
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const brigadeAor: Record<SettlementId, FormationId | null> = {};

  // Default all settlements to null (unassigned / rear / militia-only)
  for (const sid of Object.keys(pc).sort(strictCompare)) {
    brigadeAor[sid as SettlementId] = null;
  }

  // Group expanded-front-active settlements by (faction, municipality)
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

  for (const [key, sids] of Array.from(byFactionMun.entries()).sort((a, b) => strictCompare(a[0], b[0]))) {
    const [faction, mun] = key.split('::') as [FactionId, MunicipalityId];
    // Find all brigades assigned to this municipality
    const candidateBrigades = Object.keys(assignments)
      .filter((fid) => {
        const f = formations[fid];
        if (!isActiveBrigade(f) || f.faction !== faction) return false;
        return (assignments[fid] ?? []).includes(mun);
      })
      .sort(strictCompare);

    if (candidateBrigades.length === 0) {
      // No brigade covers this municipality — settlements remain null (militia/TO)
      continue;
    }

    if (candidateBrigades.length === 1) {
      const brigadeId = candidateBrigades[0]!;
      for (const sid of sids) {
        brigadeAor[sid] = brigadeId;
      }
      continue;
    }

    // Multiple brigades share this municipality — BFS split from brigade HQs
    const claims = assignSharedMunSettlements(sids, candidateBrigades, formations, adj);
    for (const sid of Object.keys(claims).sort(strictCompare)) {
      brigadeAor[sid as SettlementId] = claims[sid as SettlementId]!;
    }
  }

  state.brigade_aor = brigadeAor;
}

/**
 * Split settlements in a shared municipality between multiple brigades using BFS
 * from each brigade's HQ.
 */
function assignSharedMunSettlements(
  sids: SettlementId[],
  brigadeIds: FormationId[],
  formations: Record<FormationId, FormationState>,
  adj: Map<SettlementId, Set<SettlementId>>
): Record<SettlementId, FormationId> {
  const result: Record<SettlementId, FormationId> = {};
  const memberSet = new Set(sids);
  const visited = new Map<SettlementId, FormationId>();

  // Initialize seeds from brigade HQs
  const queue: [SettlementId, FormationId][] = [];

  for (const brigadeId of brigadeIds) {
    const f = formations[brigadeId];
    const hq = f?.hq_sid;
    if (hq && memberSet.has(hq) && !visited.has(hq)) {
      visited.set(hq, brigadeId);
      queue.push([hq, brigadeId]);
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const [current, brigadeId] = queue[head++];
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (!memberSet.has(n) || visited.has(n)) continue;
      visited.set(n, brigadeId);
      queue.push([n, brigadeId]);
    }
  }

  // Assign visited settlements; unvisited go to first brigade
  for (const sid of sids) {
    result[sid] = visited.get(sid) ?? brigadeIds[0]!;
  }

  return result;
}

/**
 * Enforce contiguity on all brigade AoR assignments.
 * For any discontiguous brigade, keep the best component and transfer orphans
 * to the nearest adjacent brigade of the same faction.
 */
function enforceContiguity(
  state: GameState,
  frontActive: Set<SettlementId>,
  adj: Map<SettlementId, Set<SettlementId>>
): void {
  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) return;
  const formations = state.formations ?? {};

  // Group settlements by brigade
  const brigadeSettlements = new Map<FormationId, SettlementId[]>();
  for (const [sid, brigadeId] of Object.entries(brigadeAor)) {
    if (!brigadeId) continue;
    const list = brigadeSettlements.get(brigadeId) ?? [];
    list.push(sid as SettlementId);
    brigadeSettlements.set(brigadeId, list);
  }

  for (const [brigadeId, settlements] of brigadeSettlements.entries()) {
    const f = formations[brigadeId];
    if (!f) continue;

    const { contiguous } = checkBrigadeContiguity(settlements, adj);
    if (contiguous) continue;

    // Repair: keep best component, reassign orphans
    const { kept, orphans } = repairContiguity(
      brigadeId,
      settlements,
      f.hq_sid ?? undefined,
      frontActive,
      adj
    );

    // Clear orphans from this brigade — prefer same-corps target, then any same-faction
    const fCorpsId = getFormationCorpsId(f);
    for (const sid of orphans) {
      const neighbors = adj.get(sid);
      let sameCorpsTarget: FormationId | null = null;
      let anyFactionTarget: FormationId | null = null;
      if (neighbors) {
        for (const nSid of Array.from(neighbors).sort(strictCompare)) {
          const nBrigade = brigadeAor[nSid];
          if (nBrigade && nBrigade !== brigadeId) {
            const nf = formations[nBrigade];
            if (nf && nf.faction === f.faction) {
              if (!anyFactionTarget) anyFactionTarget = nBrigade;
              if (!sameCorpsTarget && fCorpsId && getFormationCorpsId(nf) === fCorpsId) {
                sameCorpsTarget = nBrigade;
              }
            }
          }
        }
      }

      const targetBrigade = sameCorpsTarget ?? anyFactionTarget;
      if (targetBrigade) {
        brigadeAor[sid] = targetBrigade;
      } else {
        brigadeAor[sid] = null;  // No adjacent same-faction brigade → unassigned
      }
    }
  }
}

// --- Corps-level contiguity ---

/**
 * Enforce contiguity on corps-level AoR (union of subordinate brigade settlements).
 *
 * For each faction:
 * 1. Identify enclaves (excluded from check — legitimate disconnection)
 * 2. Build per-corps settlement sets from state.brigade_aor
 * 3. Check contiguity; reassign orphans to adjacent brigade of a different corps
 *
 * Exported for use in both assignCorpsDirectedAoR (Step 9) and the turn pipeline
 * (after rebalanceBrigadeAoR which is not corps-aware).
 *
 * Deterministic: sorted iteration via strictCompare.
 */
export function enforceCorpsLevelContiguity(
  state: GameState,
  edges: EdgeRecord[]
): void {
  const brigadeAor = state.brigade_aor;
  if (!brigadeAor) return;
  const formations = state.formations ?? {};
  const pc = state.political_controllers ?? {};

  const adj = buildAdjacencyFromEdges(edges);
  const factionIds = Array.from(new Set((state.factions ?? []).map((f) => f.id))).sort(strictCompare);

  for (const faction of factionIds) {
    // Identify enclaves for this faction — their settlements are excluded from the check
    const territories = detectDisconnectedTerritories(faction, pc, edges);
    const enclaveSettlements = new Set<SettlementId>();
    for (const enclave of territories.enclaves) {
      for (const sid of enclave) enclaveSettlements.add(sid);
    }

    // Build per-corps settlement sets from brigade_aor (excluding enclaves)
    const corpsSettlements = new Map<FormationId, SettlementId[]>();
    for (const [sid, brigadeId] of Object.entries(brigadeAor).sort((a, b) => strictCompare(a[0], b[0]))) {
      if (!brigadeId) continue;
      if (enclaveSettlements.has(sid as SettlementId)) continue;
      const brigade = formations[brigadeId];
      if (!brigade || brigade.faction !== faction) continue;
      const corpsId = getFormationCorpsId(brigade);
      if (!corpsId) continue;
      const list = corpsSettlements.get(corpsId) ?? [];
      list.push(sid as SettlementId);
      corpsSettlements.set(corpsId, list);
    }

    // Check and repair each corps
    for (const [corpsId, settlements] of Array.from(corpsSettlements.entries()).sort((a, b) => strictCompare(a[0], b[0]))) {
      const result = checkCorpsContiguity(corpsId, settlements, adj);
      if (result.contiguous) continue;
      repairCorpsContiguity(state, faction, corpsId, result.orphans, adj);
    }
  }
}

// --- Helpers ---

/**
 * Find nearest corps for a brigade whose corps has no sector.
 * BFS from brigade's HQ through faction territory, return first corps found.
 */
function findNearestCorpsForBrigade(
  brigade: FormationState,
  corpsBySettlement: Map<SettlementId, FormationId>,
  pc: Record<SettlementId, FactionId | null>,
  faction: FactionId,
  edges: EdgeRecord[]
): FormationId | null {
  const hq = brigade.hq_sid;
  if (!hq || pc[hq] !== faction) return null;

  if (corpsBySettlement.has(hq)) return corpsBySettlement.get(hq)!;

  // Build faction adjacency for BFS
  const fAdj = new Map<SettlementId, SettlementId[]>();
  for (const edge of edges) {
    if (pc[edge.a] !== faction || pc[edge.b] !== faction) continue;
    let listA = fAdj.get(edge.a);
    if (!listA) { listA = []; fAdj.set(edge.a, listA); }
    listA.push(edge.b);
    let listB = fAdj.get(edge.b);
    if (!listB) { listB = []; fAdj.set(edge.b, listB); }
    listB.push(edge.a);
  }

  const visited = new Set<SettlementId>([hq]);
  const queue: SettlementId[] = [hq];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const corps = corpsBySettlement.get(current);
    if (corps) return corps;
    const neighbors = (fAdj.get(current) ?? []).sort(strictCompare);
    for (const n of neighbors) {
      if (visited.has(n)) continue;
      visited.add(n);
      queue.push(n);
    }
  }

  return null;
}
