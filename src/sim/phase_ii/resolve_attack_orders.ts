/**
 * Phase II: Resolve brigade attack orders (one target per brigade per turn).
 *
 * Delegates to battle_resolution.ts for multi-factor combat with terrain,
 * equipment, experience, corps command, and snap events.
 *
 * Backward-compatible: ResolveAttackOrdersReport retains the flat
 * casualty_attacker/casualty_defender fields; new battle_report field
 * provides full BattleResolutionReport with per-battle details.
 *
 * Deterministic: orders processed in sorted formation ID order; orders consumed after resolution.
 */

import type { GameState, FormationId, SettlementId } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { resolveBattleOrders, type BattleResolutionReport } from './battle_resolution.js';

export interface ResolveAttackOrdersReport {
  orders_processed: number;
  flips_applied: number;
  casualty_attacker: number;
  casualty_defender: number;
  details: Array<{ brigade_id: FormationId; target_sid: SettlementId; attacker_won: boolean }>;
  /** Full battle resolution report with per-battle breakdowns. */
  battle_report?: BattleResolutionReport;
}

/**
 * Resolve brigade_attack_orders via the multi-factor battle resolution engine.
 * Mutates state (political_controllers, formations, casualty_ledger, clears brigade_attack_orders).
 *
 * When terrainData and settlementToMun are provided, uses full terrain-aware combat.
 * When omitted, uses empty terrain (backward compat for tests not yet wired).
 */
export function resolveAttackOrders(
  state: GameState,
  edges: EdgeRecord[],
  terrainData?: TerrainScalarsData,
  settlementToMun?: Map<string, string>
): ResolveAttackOrdersReport {
  const terrain: TerrainScalarsData = terrainData ?? { by_sid: {} };
  const munMap: Map<string, string> = settlementToMun ?? new Map();

  const battleReport = resolveBattleOrders(state, edges, terrain, munMap);

  // Backfill flat fields for backward compatibility
  const details = battleReport.battles.map(b => ({
    brigade_id: b.attacker_brigade,
    target_sid: b.location,
    attacker_won: b.settlement_flipped
  }));

  const totalAttackerCas = battleReport.total_attacker_casualties;
  const totalDefenderCas = battleReport.total_defender_casualties;

  return {
    orders_processed: battleReport.battles_fought,
    flips_applied: battleReport.flips_applied,
    casualty_attacker: totalAttackerCas.killed + totalAttackerCas.wounded + totalAttackerCas.missing_captured,
    casualty_defender: totalDefenderCas.killed + totalDefenderCas.wounded + totalDefenderCas.missing_captured,
    details,
    battle_report: battleReport
  };
}
