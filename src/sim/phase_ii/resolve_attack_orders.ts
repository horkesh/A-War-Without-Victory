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

import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import type { FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { resolveBattleOrders, type BattleResolutionReport } from './battle_resolution.js';

export interface ResolveAttackOrdersReport {
    orders_processed: number;
    /** Distinct settlement IDs targeted by attack orders this turn (diagnostic: orders_processed vs unique_attack_targets vs flips_applied). */
    unique_attack_targets: number;
    flips_applied: number;
    casualty_attacker: number;
    casualty_defender: number;
    /** Orders processed per attacker faction (keys in sorted order for determinism). */
    orders_by_faction: Record<string, number>;
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

    const orders = state.brigade_attack_orders ?? {};
    const battleReport = resolveBattleOrders(state, edges, terrain, munMap);

    // Backfill flat fields for backward compatibility
    const details = battleReport.battles.map(b => ({
        brigade_id: b.attacker_brigade,
        target_sid: b.location,
        attacker_won: b.settlement_flipped
    }));

    const totalAttackerCas = battleReport.total_attacker_casualties;
    const totalDefenderCas = battleReport.total_defender_casualties;

    const ordersByFaction: Record<string, number> = {};
    const formations = state.formations ?? {};
    for (const b of battleReport.battles) {
        const faction = (formations[b.attacker_brigade] as { faction?: string } | undefined)?.faction ?? 'unknown';
        ordersByFaction[faction] = (ordersByFaction[faction] ?? 0) + 1;
    }
    const ordersByFactionSorted: Record<string, number> = {};
    for (const fid of Object.keys(ordersByFaction).sort()) {
        ordersByFactionSorted[fid] = ordersByFaction[fid];
    }

    return {
        orders_processed: battleReport.battles_fought,
        unique_attack_targets: new Set(Object.values(orders).filter((v): v is SettlementId => v != null)).size,
        flips_applied: battleReport.flips_applied,
        casualty_attacker: totalAttackerCas.killed + totalAttackerCas.wounded + totalAttackerCas.missing_captured,
        casualty_defender: totalDefenderCas.killed + totalDefenderCas.wounded + totalDefenderCas.missing_captured,
        orders_by_faction: ordersByFactionSorted,
        details,
        battle_report: battleReport
    };
}
