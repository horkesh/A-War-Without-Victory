/**
 * Phase F Step 3: Settlement-level displacement accumulation.
 *
 * Applies trigger deltas to state.settlement_displacement: bounded [0, 1], monotonic (never decreases),
 * deterministic ordering. Optionally sets settlement_displacement_started_turn when first non-zero.
 * Engine Invariants §11.3: stable ordering; no randomness.
 */

import type { GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Cap for settlement_displacement (capacity degradation fraction). */
const SETTLEMENT_DISPLACEMENT_CAP = 1;

export interface SettlementAccumulationReport {
    /** Settlement IDs updated this turn (sorted). */
    updated: SettlementId[];
    /** Before values (for tests). */
    before: Record<SettlementId, number>;
    /** After values (for tests). */
    after: Record<SettlementId, number>;
}

/**
 * Apply displacement deltas to state.settlement_displacement.
 * Monotonic: new value = min(cap, current + delta); never decreases.
 * Deterministic: process settlements in sorted order by ID.
 *
 * @param state - Game state (mutated: settlement_displacement, settlement_displacement_started_turn)
 * @param deltas - Per-settlement delta from evaluateDisplacementTriggers (only entries with delta > 0)
 * @returns Report for tests (not serialized)
 */
export function applySettlementDisplacementDeltas(
    state: GameState,
    deltas: Record<SettlementId, number>
): SettlementAccumulationReport {
    const report: SettlementAccumulationReport = { updated: [], before: {}, after: {} };

    if (state.meta?.phase !== 'phase_ii') {
        return report;
    }

    const turn = state.meta.turn;
    if (!state.settlement_displacement) {
        (state as GameState & { settlement_displacement: Record<SettlementId, number> }).settlement_displacement = {};
    }
    if (!state.settlement_displacement_started_turn) {
        (state as GameState & { settlement_displacement_started_turn: Record<SettlementId, number> }).settlement_displacement_started_turn = {};
    }

    const sd = state.settlement_displacement!;
    const started = state.settlement_displacement_started_turn!;
    const sortedIds = Object.keys(deltas).filter((sid) => deltas[sid]! > 0).sort(strictCompare);

    for (const sid of sortedIds) {
        const delta = deltas[sid]!;
        if (delta <= 0) continue;

        const current = sd[sid] ?? 0;
        report.before[sid] = current;

        // Monotonic: new value >= current; cap at 1
        const added = Math.min(delta, SETTLEMENT_DISPLACEMENT_CAP - current);
        const newVal = Math.min(SETTLEMENT_DISPLACEMENT_CAP, current + added);
        sd[sid] = newVal;
        report.after[sid] = newVal;
        report.updated.push(sid);

        if (!(sid in started)) {
            started[sid] = turn;
        }
    }

    return report;
}
