/**
 * Phase H1.9: Baseline operations scheduler (scenario-only, run-only).
 * Computes engagement level from activity counts and applies deterministic
 * exhaustion and displacement deltas to existing state fields. No new state fields.
 * No serialization of derived state; no timestamps; no randomness.
 */

import type { GameState, SettlementId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { clamp01 } from '../utils/math.js';
import type { EngagementSignal } from './baseline_ops_types.js';
import {
    BASELINE_OPS_DISPLACEMENT_RATE,
    BASELINE_OPS_EXHAUSTION_RATE,
    ENGAGEMENT_WEIGHT_FRONT,
    ENGAGEMENT_WEIGHT_PRESSURE,
    FRONT_ACTIVE_NORM,
    PRESSURE_EDGES_NORM
} from './baseline_ops_types.js';

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
 * Apply baseline-ops pressure-"work" delta to each faction's `profile.exhaustion`.
 * Monotonic, irreversible. H1.11: optional scalar multiplies delta (harness-only; default 1).
 *
 * R6 Phase 0 fix #1 (2026-08-06): this function NO LONGER writes
 * `political.war_exhaustion`. That field's real, faction-differentiated, clamped
 * writer is `updateExhaustion` (src/sim/combat/exhaustion.ts, run every war turn
 * from war_phases.ts). The delta added here was faction-UNIFORM (identical for
 * every faction) and applied AFTER the pipeline's per-faction clamp — it added no
 * differentiation and violated the invariant that per-turn `war_exhaustion` deltas
 * differ across factions with different inputs. Because `updateExhaustion` already
 * populates the field, removing this write does NOT empty it; it only removes a
 * redundant, faction-agnostic add. `profile.exhaustion` (semantically pressure
 * "work", pending the pressure_work rename) is left as-is — its differentiated
 * writer is `accumulateExhaustion` (src/state/exhaustion.ts); the baseline add
 * here is that field's designed harness signal and is out of scope for this fix.
 */
export function applyBaselineOpsExhaustion(
    state: GameState,
    level: number,
    scalar: number = 1
): void {
    if (state.meta?.phase !== 'war') return;

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    const delta = BASELINE_OPS_EXHAUSTION_RATE * level * Math.max(0, scalar);
    for (const fid of factionIds) {
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
    if (state.meta?.phase !== 'war') return;
    if (frontActiveIds.length === 0) return;

    const sortedIds = [...frontActiveIds].sort(strictCompare);
    const totalDelta = BASELINE_OPS_DISPLACEMENT_RATE * level * Math.max(0, scalar);
    const perSettlement = totalDelta / sortedIds.length;

    if (!state.displacement.settlement_displacement) {
        (state as GameState & { settlement_displacement: Record<SettlementId, number> }).displacement.settlement_displacement = {};
    }
    if (!state.displacement.settlement_displacement_started_turn) {
        (state as GameState & { settlement_displacement_started_turn: Record<SettlementId, number> }).displacement.settlement_displacement_started_turn = {};
    }
    const sd = state.displacement.settlement_displacement!;
    const started = state.displacement.settlement_displacement_started_turn!;
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

