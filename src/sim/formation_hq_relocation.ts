/**
 * Formation HQ relocation: when a formation's HQ settlement is in enemy-controlled
 * territory, relocate HQ to a friendly settlement (same mun or nearest friendly mun).
 * Deterministic: sorted formation IDs, sorted candidate settlements.
 */

import type { GameState, FactionId, FormationId, MunicipalityId, SettlementId } from '../state/game_state.js';
import type { EdgeRecord, SettlementRecord } from '../map/settlements.js';
import { strictCompare } from '../state/validateGameState.js';

export interface FormationHqRelocationReport {
  relocated: number;
  formation_ids: FormationId[];
}

function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, SettlementId[]> {
  const byMun = new Map<MunicipalityId, SettlementId[]>();
  for (const [sid, rec] of settlements.entries()) {
    const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
    const list = byMun.get(munId) ?? [];
    list.push(sid);
    byMun.set(munId, list);
  }
  for (const list of byMun.values()) {
    list.sort(strictCompare);
  }
  return byMun;
}

function buildSidToMun(byMun: Map<MunicipalityId, SettlementId[]>): Map<SettlementId, MunicipalityId> {
  const sidToMun = new Map<SettlementId, MunicipalityId>();
  for (const [munId, sids] of byMun.entries()) {
    for (const sid of sids) {
      sidToMun.set(sid, munId);
    }
  }
  return sidToMun;
}

function buildMunAdjacency(
  sidToMun: Map<SettlementId, MunicipalityId>,
  edges: EdgeRecord[]
): Map<MunicipalityId, MunicipalityId[]> {
  const adj = new Map<MunicipalityId, Set<MunicipalityId>>();
  for (const edge of edges) {
    const munA = sidToMun.get(edge.a);
    const munB = sidToMun.get(edge.b);
    if (!munA || !munB || munA === munB) continue;
    let setA = adj.get(munA);
    if (!setA) {
      setA = new Set();
      adj.set(munA, setA);
    }
    setA.add(munB);
    let setB = adj.get(munB);
    if (!setB) {
      setB = new Set();
      adj.set(munB, setB);
    }
    setB.add(munA);
  }
  const result = new Map<MunicipalityId, MunicipalityId[]>();
  for (const [mun, set] of adj.entries()) {
    result.set(mun, Array.from(set).sort(strictCompare));
  }
  return result;
}

/**
 * Find a friendly settlement for the formation: same mun first, then adjacent muns (sorted).
 * Returns first settlement ID where political_controllers[sid] === faction, or null.
 */
function findFriendlySettlement(
  pc: Record<SettlementId, FactionId | null>,
  faction: FactionId,
  byMun: Map<MunicipalityId, SettlementId[]>,
  sidToMun: Map<SettlementId, MunicipalityId>,
  munAdjacency: Map<MunicipalityId, MunicipalityId[]>,
  currentHqSid: SettlementId
): SettlementId | null {
  const currentMun = sidToMun.get(currentHqSid);
  if (currentMun) {
    const sidsInMun = byMun.get(currentMun) ?? [];
    for (const sid of sidsInMun) {
      if (pc[sid] === faction) return sid;
    }
    const neighborMuns = munAdjacency.get(currentMun) ?? [];
    for (const neighborMun of neighborMuns) {
      const sids = byMun.get(neighborMun) ?? [];
      for (const sid of sids) {
        if (pc[sid] === faction) return sid;
      }
    }
  }
  return null;
}

/**
 * Run formation HQ relocation: for any formation whose hq_sid is in enemy-controlled
 * territory, set hq_sid to a friendly settlement (same or nearest friendly mun).
 * Deterministic: formations and candidate lists sorted.
 */
export function runFormationHqRelocation(
  state: GameState,
  settlements: Map<string, SettlementRecord>,
  edges: EdgeRecord[]
): FormationHqRelocationReport {
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const report: FormationHqRelocationReport = { relocated: 0, formation_ids: [] };

  const byMun = buildSettlementsByMun(settlements);
  const sidToMun = buildSidToMun(byMun);
  const munAdjacency = buildMunAdjacency(sidToMun, edges);

  const formationIds = Object.keys(formations).sort(strictCompare);
  for (const id of formationIds) {
    const f = formations[id];
    if (!f || !f.hq_sid) continue;
    const controllerAtHq = pc[f.hq_sid] ?? null;
    if (controllerAtHq === f.faction) continue;

    const newSid = findFriendlySettlement(
      pc,
      f.faction,
      byMun,
      sidToMun,
      munAdjacency,
      f.hq_sid
    );
    if (newSid) {
      f.hq_sid = newSid;
      report.relocated++;
      report.formation_ids.push(id);
    }
  }
  report.formation_ids.sort(strictCompare);
  return report;
}
