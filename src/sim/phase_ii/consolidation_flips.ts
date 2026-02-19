/**
 * Phase II consolidation flips (52w plan Step 5, Option B).
 * One brigade in "consolidation" posture in a municipality with no enemy brigades
 * can flip multiple civilian/undefended settlements in one turn (deterministic cap).
 */

import type { GameState, FactionId, FormationId, SettlementId, MunicipalityId } from '../../state/game_state.js';
import type { SettlementRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Max settlements one brigade can flip per turn via consolidation (Option B cap). */
export const CONSOLIDATION_FLIPS_CAP_PER_BRIGADE = 3;

export interface ConsolidationFlipsReport {
  flips_applied: number;
  by_formation: Record<FormationId, number>;
}

/**
 * Returns true if any settlement in the municipality has an enemy brigade in AoR
 * (enemy = faction that controls that settlement or has a formation there).
 */
function munHasEnemyBrigade(
  state: GameState,
  ourFaction: FactionId,
  sidsInMun: SettlementId[]
): boolean {
  const brigadeAor = state.brigade_aor ?? {};
  const formations = state.formations ?? {};
  for (const sid of sidsInMun) {
    const formationId = brigadeAor[sid];
    if (formationId == null) continue;
    const formation = formations[formationId];
    if (!formation || formation.faction === ourFaction) continue;
    return true;
  }
  return false;
}

/**
 * Apply Phase II consolidation flips: for each brigade in consolidation posture,
 * in its assigned muns with no enemy brigade, flip up to CAP undefended non-friendly settlements.
 * Deterministic: sorted formation IDs, sorted settlement IDs.
 */
export function applyConsolidationFlips(
  state: GameState,
  settlements: Map<SettlementId, SettlementRecord>,
  sidToMun: Record<SettlementId, MunicipalityId>
): ConsolidationFlipsReport {
  const report: ConsolidationFlipsReport = { flips_applied: 0, by_formation: {} };
  const assignment = state.brigade_municipality_assignment ?? {};
  const formations = state.formations ?? {};
  const brigadeAor = state.brigade_aor ?? {};
  const pc = state.political_controllers ?? {};
  if (typeof pc !== 'object') return report;

  const sidsByMun = new Map<MunicipalityId, SettlementId[]>();
  for (const [sid, munId] of Object.entries(sidToMun)) {
    if (!munId) continue;
    const list = sidsByMun.get(munId) ?? [];
    list.push(sid as SettlementId);
    sidsByMun.set(munId, list);
  }
  for (const list of sidsByMun.values()) list.sort(strictCompare);

  const formationIds = Object.keys(formations).sort(strictCompare);
  for (const formationId of formationIds) {
    const f = formations[formationId];
    if (!f || f.kind !== 'brigade' || f.status !== 'active' || f.posture !== 'consolidation') continue;
    const faction = f.faction as FactionId;
    const muns = assignment[formationId] ?? [];
    if (muns.length === 0) continue;

    let flippedThisBrigade = 0;
    for (const munId of muns) {
      if (flippedThisBrigade >= CONSOLIDATION_FLIPS_CAP_PER_BRIGADE) break;
      const sidsInMun = sidsByMun.get(munId) ?? [];
      if (sidsInMun.length === 0) continue;
      if (munHasEnemyBrigade(state, faction, sidsInMun)) continue;

      const eligible: SettlementId[] = [];
      for (const sid of sidsInMun) {
        const controller = pc[sid] as FactionId | undefined;
        if (controller === faction) continue;
        const defenderId = brigadeAor[sid];
        if (defenderId != null) {
          const defForm = formations[defenderId];
          if (defForm?.faction === controller) continue;
        }
        eligible.push(sid);
      }
      eligible.sort(strictCompare);
      const remaining = CONSOLIDATION_FLIPS_CAP_PER_BRIGADE - flippedThisBrigade;
      const toFlip = eligible.slice(0, remaining);
      for (const sid of toFlip) {
        (state.political_controllers as Record<string, string>)[sid] = faction;
        flippedThisBrigade++;
        report.flips_applied++;
      }
    }
    if (flippedThisBrigade > 0) report.by_formation[formationId] = flippedThisBrigade;
  }
  return report;
}
