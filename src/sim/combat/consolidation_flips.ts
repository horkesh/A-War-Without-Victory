/**
 * Consolidation flips (52w plan Step 5, Option B).
 * One brigade in "consolidation" posture in a municipality with no enemy brigades
 * can flip multiple civilian/undefended settlements in one turn (deterministic cap).
 * Per canon: consolidation as a flip-causing mechanic is Phase I only. In Phase II
 * this function no-ops (returns 0 flips) so control changes in Phase II remain
 * breach-based / battle-resolution only (Phase_II_Specification §2.3).
 *
 * NOTE (8-posture migration): The 'consolidation' posture has been removed from
 * BrigadePosture. This function is permanently disabled and always returns 0 flips.
 */

import type { SettlementRecord } from '../../map/settlements.js';
import type { FormationId, GameState, MunicipalityId, SettlementId } from '../../state/game_state.js';

/** Max settlements one brigade can flip per turn via consolidation (Option B cap). */
export const CONSOLIDATION_FLIPS_CAP_PER_BRIGADE = 3;

export interface ConsolidationFlipsReport {
    flips_applied: number;
    by_formation: Record<FormationId, number>;
}

/**
 * Apply consolidation flips — permanently disabled in the 8-posture system.
 * The 'consolidation' posture no longer exists; returns 0 flips unconditionally.
 * Kept as a stub so callers in the pipeline do not need to be updated.
 */
export function applyConsolidationFlips(
    _state: GameState,
    _settlements: Map<SettlementId, SettlementRecord>,
    _sidToMun: Record<SettlementId, MunicipalityId>
): ConsolidationFlipsReport {
    return { flips_applied: 0, by_formation: {} };
}
