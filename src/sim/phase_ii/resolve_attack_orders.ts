/**
 * Phase II: Resolve brigade attack orders (one target per brigade per turn).
 * Uses garrison-based combat: attacker strength = sum of garrison at brigade's
 * AoR settlements adjacent to target; defender strength = garrison at target.
 * Deterministic: orders processed in sorted formation ID order; orders consumed after resolution.
 */

import type { GameState, FactionId, FormationId, SettlementId } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { MIN_BRIGADE_SPAWN } from '../../state/formation_constants.js';
import { getBrigadeAoRSettlements, getSettlementGarrison } from './brigade_aor.js';

export interface ResolveAttackOrdersReport {
  orders_processed: number;
  flips_applied: number;
  casualty_attacker: number;
  casualty_defender: number;
  details: Array<{ brigade_id: FormationId; target_sid: SettlementId; attacker_won: boolean }>;
}

/** Attacker must exceed defender strength by this ratio to flip (e.g. 1.0 = strict majority). */
const ATTACKER_ADVANTAGE_RATIO = 1.0;

/** Deterministic personnel loss per flip: attacker and defender each lose this many (Brigade Realism §3.2). */
const CASUALTY_PER_FLIP_ATTACKER = 40;
const CASUALTY_PER_FLIP_DEFENDER = 60;

function buildAdjacency(edges: EdgeRecord[]): Map<SettlementId, SettlementId[]> {
  const adj = new Map<SettlementId, SettlementId[]>();
  for (const e of edges) {
    if (!e?.a || !e?.b) continue;
    const listA = adj.get(e.a) ?? [];
    if (!listA.includes(e.b)) listA.push(e.b);
    adj.set(e.a, listA);
    const listB = adj.get(e.b) ?? [];
    if (!listB.includes(e.a)) listB.push(e.a);
    adj.set(e.b, listB);
  }
  for (const list of adj.values()) list.sort(strictCompare);
  return adj;
}

/**
 * Resolve brigade_attack_orders: for each (brigade_id, target_sid), compute attacker vs defender
 * strength (garrison-based); if attacker wins, flip target to attacker faction. Mutates state
 * (political_controllers, clears brigade_attack_orders). Requires edges for adjacency.
 */
export function resolveAttackOrders(
  state: GameState,
  edges: EdgeRecord[]
): ResolveAttackOrdersReport {
  const report: ResolveAttackOrdersReport = {
    orders_processed: 0,
    flips_applied: 0,
    casualty_attacker: 0,
    casualty_defender: 0,
    details: []
  };
  const orders = state.brigade_attack_orders;
  if (!orders || typeof orders !== 'object') return report;

  const adjacency = buildAdjacency(edges);
  const pc = state.political_controllers ?? {};
  const formations = state.formations ?? {};
  const brigadeAor = state.brigade_aor ?? {};

  const orderEntries = (Object.entries(orders) as [FormationId, SettlementId | null][])
    .filter(([, target]) => target != null && target !== '')
    .sort((a, b) => strictCompare(a[0], b[0]));

  for (const [formationId, targetSid] of orderEntries) {
    const formation = formations[formationId];
    if (!formation || formation.faction == null) continue;
    const attackerFaction = formation.faction as FactionId;
    const defenderFaction = pc[targetSid] as FactionId | null | undefined;
    if (!defenderFaction || defenderFaction === attackerFaction) continue;

    const aorSettlements = getBrigadeAoRSettlements(state, formationId);
    const neighbors = adjacency.get(targetSid) ?? [];
    const frontlineSids = aorSettlements.filter((sid) => neighbors.includes(sid));
    const attackerStrength = frontlineSids.reduce((sum, sid) => sum + getSettlementGarrison(state, sid), 0);
    const defenderStrength = getSettlementGarrison(state, targetSid);

    const attackerWon = defenderStrength <= 0 ? attackerStrength > 0 : attackerStrength > defenderStrength * ATTACKER_ADVANTAGE_RATIO;
    report.orders_processed += 1;
    report.details.push({ brigade_id: formationId, target_sid: targetSid, attacker_won: attackerWon });

    if (attackerWon) {
      (state.political_controllers as Record<SettlementId, FactionId>)[targetSid] = attackerFaction;
      report.flips_applied += 1;
      // Casualties (Brigade Realism §3.2): deterministic personnel loss
      const attackerFormation = formations[formationId];
      const defenderBrigadeId = brigadeAor[targetSid];
      if (attackerFormation && typeof attackerFormation.personnel === 'number') {
        const loss = Math.min(CASUALTY_PER_FLIP_ATTACKER, Math.max(0, attackerFormation.personnel - MIN_BRIGADE_SPAWN));
        (attackerFormation as { personnel: number }).personnel -= loss;
        report.casualty_attacker += loss;
      }
      if (defenderBrigadeId) {
        const defFormation = formations[defenderBrigadeId];
        if (defFormation && typeof defFormation.personnel === 'number') {
          const loss = Math.min(CASUALTY_PER_FLIP_DEFENDER, Math.max(0, defFormation.personnel - MIN_BRIGADE_SPAWN));
          (defFormation as { personnel: number }).personnel -= loss;
          report.casualty_defender += loss;
        }
      }
    }
  }

  report.details.sort((a, b) => {
    const c = strictCompare(a.brigade_id, b.brigade_id);
    if (c !== 0) return c;
    return strictCompare(a.target_sid, b.target_sid);
  });
  delete state.brigade_attack_orders;
  return report;
}
