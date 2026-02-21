/**
 * Phase F Step 4: Municipality-level displacement aggregation.
 *
 * Aggregates state.settlement_displacement to state.municipality_displacement deterministically.
 * Rule: mean of settlement_displacement within municipality; result is monotonic (never decreases).
 * Stable ordering: process municipalities and settlements in sorted order.
 * Engine Invariants §11.3: stable ordering; no randomness.
 */

import type { GameState, MunicipalityId, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface MunicipalityAggregationReport {
    /** Municipality IDs updated (sorted). */
    updated: MunicipalityId[];
    /** Before values (for tests). */
    before: Record<MunicipalityId, number>;
    /** After values (for tests). */
    after: Record<MunicipalityId, number>;
}

/**
 * Aggregate settlement_displacement to municipality_displacement.
 * Rule: per municipality, value = mean of settlement_displacement over settlements in that mun;
 * municipality_displacement[munId] = max(current, value) for monotonicity.
 *
 * @param state - Game state (mutated: municipality_displacement)
 * @param settlementsByMun - Map municipality ID -> sorted list of settlement IDs in that municipality
 * @returns Report for tests (not serialized)
 */
export function aggregateSettlementDisplacementToMunicipalities(
    state: GameState,
    settlementsByMun: Map<MunicipalityId, SettlementId[]>
): MunicipalityAggregationReport {
    const report: MunicipalityAggregationReport = { updated: [], before: {}, after: {} };

    if (state.meta?.phase !== 'phase_ii') {
        return report;
    }

    const sd = state.settlement_displacement ?? {};
    if (!state.municipality_displacement) {
        (state as GameState & { municipality_displacement: Record<MunicipalityId, number> }).municipality_displacement = {};
    }
    const md = state.municipality_displacement!;

    const munIds = Array.from(settlementsByMun.keys()).sort(strictCompare);

    for (const munId of munIds) {
        const sids = settlementsByMun.get(munId)!;
        if (!sids || sids.length === 0) continue;

        let sum = 0;
        let count = 0;
        for (const sid of sids) {
            const v = sd[sid];
            if (typeof v === 'number' && Number.isFinite(v)) {
                sum += v;
                count += 1;
            }
        }
        const mean = count > 0 ? sum / count : 0;
        const current = md[munId] ?? 0;
        report.before[munId] = current;

        // Monotonic: new value = max(current, aggregate)
        const newVal = Math.min(1, Math.max(current, mean));
        md[munId] = newVal;
        report.after[munId] = newVal;
        if (newVal !== current) {
            report.updated.push(munId);
        }
    }

    return report;
}
