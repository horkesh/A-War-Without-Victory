/**
 * Phase F2/F3: Central settlement control API for treaty/negotiation/control logic.
 * Single source for getSettlementControlStatus and legacy adapter.
 * Used by state modules and map/front_edges; no raw political_controller reads in consumers.
 * Phase F3: AoR fallback is explicitly gated by AorFallbackPolicy; never overrides initialized controller.
 */

import type { GameState } from './game_state.js';
import type { ControlStatus, ControlSide } from './political_control_types.js';


/** Policy for when AoR fallback may apply. Default: only when controller field is missing. */
export type AorFallbackPolicy = 'never' | 'only_when_missing_controller_field' | 'allow';

/**
 * Get explicit control status for a settlement.
 * Deterministic: null political_controller → unknown; side → known with side.
 * AoR fallback: when political_controller field is undefined (missing), may infer from AoR per policy.
 * Never applies AoR fallback when controller field exists (null or side).
 */
export function getSettlementControlStatus(
  state: GameState,
  settlementId: string,
  policy: AorFallbackPolicy = 'only_when_missing_controller_field'
): ControlStatus {
  const controller =
    state.political_controllers && settlementId in state.political_controllers
      ? state.political_controllers[settlementId]
      : undefined;

  const controllerFieldMissing = controller === undefined;

  if (!controllerFieldMissing) {
    if (controller !== null) {
      return { kind: 'known', side: controller as ControlSide };
    }
    return { kind: 'unknown' };
  }

  if (policy === 'never') {
    return { kind: 'unknown' };
  }
  for (const faction of state.factions) {
    if (faction.areasOfResponsibility.includes(settlementId)) {
      return { kind: 'known', side: faction.id as ControlSide };
    }
  }
  return { kind: 'unknown' };
}

/**
 * Legacy adapter: returns side when known, else null.
 * New code should use getSettlementControlStatus and branch on status.kind.
 */
export function getSettlementSideLegacy(
  state: GameState,
  settlementId: string
): ControlSide | null {
  const status = getSettlementControlStatus(state, settlementId);
  if (status.kind === 'known') return status.side;
  return null;
}
