/**
 * Phase H1.9: Baseline operations scheduler (scenario-only, run-only).
 * Computes engagement level from activity counts and applies deterministic
 * exhaustion and displacement deltas to existing state fields. No new state fields.
 * No serialization of derived state; no timestamps; no randomness.
 */

import { strictCompare } from '../state/validateGameState.js';
import type { GameState, FactionId, SettlementId } from '../state/game_state.js';
import type { EngagementSignal } from './baseline_ops_types.js';
import {
  FRONT_ACTIVE_NORM,
  PRESSURE_EDGES_NORM,
  ENGAGEMENT_WEIGHT_FRONT,
  ENGAGEMENT_WEIGHT_PRESSURE,
  BASELINE_OPS_EXHAUSTION_RATE,
  BASELINE_OPS_DISPLACEMENT_RATE
} from './baseline_ops_types.js';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Compute normalized engagement level in [0, 1] from signal.
 * Deterministic: fixed norms and weights.
 */
export function computeEngagementLevel(signal: EngagementSignal): number {
  if (signal.front_active === 0 && signal.pressure_edges === 0) {
    return 0;
  }
  const term1 = (signal.front_active / FRONT_ACTIVE_NORM) * ENGAGEMENT_WEIGHT_FRONT;
  const term2 = (signal.pressure_edges / PRESSURE_EDGES_NORM) * ENGAGEMENT_WEIGHT_PRESSURE;
  return clamp01(signal.intensity * (term1 + term2));
}

/**
 * Apply baseline-ops exhaustion delta to state (phase_ii_exhaustion and profile.exhaustion).
 * Monotonic, irreversible. Phase II exhaustion is unbounded; we add delta only (no clamp to 1).
 * H1.11: optional scalar multiplies delta (harness-only; default 1).
 */
export function applyBaselineOpsExhaustion(
  state: GameState,
  level: number,
  scalar: number = 1
): void {
  if (state.meta?.phase !== 'phase_ii') return;

  const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
  if (!state.phase_ii_exhaustion) {
    (state as GameState & { phase_ii_exhaustion: Record<FactionId, number> }).phase_ii_exhaustion = {};
  }
  const exhaustion = state.phase_ii_exhaustion!;

  const delta = BASELINE_OPS_EXHAUSTION_RATE * level * Math.max(0, scalar);
  for (const fid of factionIds) {
    const current = typeof exhaustion[fid] === 'number' ? exhaustion[fid]! : 0;
    exhaustion[fid] = Math.max(0, current + delta);

    const faction = state.factions?.find((f) => f.id === fid);
    if (faction?.profile) {
      const profileCurrent = typeof faction.profile.exhaustion === 'number' ? faction.profile.exhaustion : 0;
      faction.profile.exhaustion = Math.max(0, profileCurrent + delta);
    }
  }
}

/**
 * Apply baseline-ops displacement deltas to front-active settlements only.
 * Per-settlement delta = (DISPLACEMENT_RATE * level * scalar) / max(1, |S|). Monotonic; clamp [0, 1].
 * H1.11: optional scalar multiplies total delta (harness-only; default 1).
 */
export function applyBaselineOpsDisplacement(
  state: GameState,
  frontActiveIds: SettlementId[],
  level: number,
  scalar: number = 1
): void {
  if (state.meta?.phase !== 'phase_ii') return;
  if (frontActiveIds.length === 0) return;

  const sortedIds = [...frontActiveIds].sort(strictCompare);
  const totalDelta = BASELINE_OPS_DISPLACEMENT_RATE * level * Math.max(0, scalar);
  const perSettlement = totalDelta / sortedIds.length;

  if (!state.settlement_displacement) {
    (state as GameState & { settlement_displacement: Record<SettlementId, number> }).settlement_displacement = {};
  }
  if (!state.settlement_displacement_started_turn) {
    (state as GameState & { settlement_displacement_started_turn: Record<SettlementId, number> }).settlement_displacement_started_turn = {};
  }
  const sd = state.settlement_displacement!;
  const started = state.settlement_displacement_started_turn!;
  const turn = state.meta.turn;

  for (const sid of sortedIds) {
    const current = sd[sid] ?? 0;
    const newVal = clamp01(current + perSettlement);
    sd[sid] = newVal;
    if (!(sid in started)) {
      started[sid] = turn;
    }
  }
}
