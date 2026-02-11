/**
 * Phase C Step 7: Displacement initiation hooks (Phase_I_Specification_v0_3_0.md §4.4).
 * Deterministic hooks when control flip triggers displacement (Hostile_Population_Share > 0.30).
 * No population totals change unless explicitly authorized by spec.
 */

import type { GameState, MunicipalityId } from '../../state/game_state.js';
import type { ControlFlipReport } from './control_flip.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Phase I §4.4.1: displacement begins when Hostile_Population_Share > 0.30. Stub when no census: treat as true. */
const HOSTILE_SHARE_THRESHOLD = 0.3;

export interface DisplacementHooksReport {
  hooks_created: number;
  by_mun: Array<{ mun_id: MunicipalityId; initiated_turn: number }>;
}

/**
 * Create displacement initiation hooks for municipalities that flipped and meet trigger (Phase I §4.4.1).
 * Does not alter displacement_state or any population totals.
 */
export function runDisplacementHooks(
  state: GameState,
  turn: number,
  controlFlipReport: ControlFlipReport
): DisplacementHooksReport {
  const report: DisplacementHooksReport = { hooks_created: 0, by_mun: [] };

  if (!controlFlipReport.flips.length) return report;

  if (!state.phase_i_displacement_initiated) {
    (state as GameState & { phase_i_displacement_initiated: Record<string, number> }).phase_i_displacement_initiated = {};
  }
  const initiated = state.phase_i_displacement_initiated!;

  const flipsSorted = [...controlFlipReport.flips].sort((a, b) => strictCompare(a.mun_id, b.mun_id));
  for (const flip of flipsSorted) {
    const munId = flip.mun_id;
    if (initiated[munId] !== undefined) continue;
    const hostileShareStub = 0.5;
    if (hostileShareStub <= HOSTILE_SHARE_THRESHOLD) continue;
    initiated[munId] = turn;
    report.by_mun.push({ mun_id: munId, initiated_turn: turn });
    report.hooks_created += 1;
  }

  return report;
}
