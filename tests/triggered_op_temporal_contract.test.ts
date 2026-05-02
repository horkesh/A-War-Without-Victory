/**
 * LANE-2026-05-02-TRIGGERED-OP-TEMPORAL-TRACE — Structural temporal contract test.
 *
 * Tests the structural temporal contract that governs when triggered-op
 * pre-stage writes can become observable to `estimateForceRatio`.
 *
 * Hypothesis under test (from predecessor handoff #5 + Codex P2 review):
 *   - Hypothesis: at trigger-turn, prestageBrigadesForTriggeredOp writes
 *     column-march orders, but estimateForceRatio runs in the same
 *     preparation sub-phase loop BEFORE apply-brigade-movement converts
 *     orders to in_transit, so isCommittedInTransitTo (status===in_transit
 *     requirement) silently rejects participants.
 *
 *   - Codex P2 counter: war_phases.ts orders the steps differently —
 *     apply-brigade-movement runs BEFORE advance-sector-offensives
 *     (estimateForceRatio caller), and check-triggered-operations
 *     (prestage caller) runs AFTER both.
 *
 * Truth this test asserts:
 *   1. Step ordering invariant (Codex P2): in `warPhases`, the index of
 *      `apply-brigade-movement` < index of `advance-sector-offensives`
 *      < index of `check-triggered-operations`.
 *   2. Single-turn within-step ordering corollary: when prestage runs at
 *      step `check-triggered-operations` of turn N, the resulting
 *      `brigade_movement_orders` entry CANNOT have been converted to
 *      `mv_state==='in_transit'` by step `advance-sector-offensives` of
 *      the SAME turn — because the prestage write happens AFTER that step.
 *      The earliest moment a prestage-written order can appear as
 *      `in_transit` is `apply-brigade-movement` on turn N+1.
 *   3. The hypothesis as written ("estimateForceRatio runs in the same
 *      preparation sub-phase loop BEFORE apply-brigade-movement") is
 *      structurally IMPOSSIBLE within a single turn under the current
 *      pipeline ordering.
 *
 * Expected outcome BEFORE implementation:
 *   - GREEN. The pipeline ordering already disproves the hypothesis as
 *     written. The test passes by asserting the structural invariant.
 *   - If the test ever turns RED, it means someone reordered the pipeline
 *     such that check-triggered-operations runs before apply-brigade-
 *     movement (which would resurrect the hypothesis), or
 *     advance-sector-offensives moved relative to check-triggered-operations.
 *
 * What this test does NOT assert (out of scope):
 *   - That `estimateForceRatio` returns the "correct" force ratio for an
 *     in-transit-with-orders participant. The IN-TRANSIT-COMBAT-POWER-
 *     CONTEXT predecessor lane already extends `isCommittedInTransitTo`
 *     usage into context overrides and is covered by its own tests.
 *   - That participants are physically capable of reaching the staging
 *     OSID within `planning_duration` turns. That is an OOB / map-distance
 *     concern, not a temporal-ordering concern.
 *
 * Determinism: pure structural assertions over a static module export.
 * No random, no timestamps, no async, no I/O.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { warPhases } from '../src/sim/turn_phases/war_phases.js';

const APPLY_MOVEMENT = 'apply-brigade-movement';
const ADVANCE_OFFENSIVES = 'advance-sector-offensives';
const CHECK_TRIGGERED = 'check-triggered-operations';
const INJECT_QUEUED = 'inject-queued-operations';

function indexOfStep(name: string): number {
    const idx = warPhases.findIndex((p) => p.name === name);
    if (idx < 0) throw new Error(`expected step "${name}" in warPhases`);
    return idx;
}

describe('LANE-2026-05-02-TRIGGERED-OP-TEMPORAL-TRACE — pipeline ordering contract', () => {
    it('exposes the four named steps the temporal hypothesis depends on', () => {
        // Defensive: if any of these vanish, the hypothesis framing must be
        // re-evaluated against whatever replaced them. Test will RED.
        const names = warPhases.map((p) => p.name);
        for (const required of [APPLY_MOVEMENT, ADVANCE_OFFENSIVES, CHECK_TRIGGERED, INJECT_QUEUED]) {
            assert.ok(
                names.includes(required),
                `expected warPhases to contain step "${required}". Found: ${names.join(', ')}`,
            );
        }
    });

    it('apply-brigade-movement runs BEFORE advance-sector-offensives within a turn', () => {
        const movementIdx = indexOfStep(APPLY_MOVEMENT);
        const offensivesIdx = indexOfStep(ADVANCE_OFFENSIVES);
        assert.ok(
            movementIdx < offensivesIdx,
            `apply-brigade-movement (idx=${movementIdx}) must precede advance-sector-offensives (idx=${offensivesIdx}). ` +
                `If this RED-fires, the in-transit-state-conversion-before-estimateForceRatio assumption no longer holds; ` +
                `the temporal hypothesis from LANE-2026-05-02-TRIGGERED-OP-TEMPORAL-TRACE may need re-evaluation.`,
        );
    });

    it('advance-sector-offensives runs BEFORE check-triggered-operations within a turn', () => {
        const offensivesIdx = indexOfStep(ADVANCE_OFFENSIVES);
        const triggeredIdx = indexOfStep(CHECK_TRIGGERED);
        assert.ok(
            offensivesIdx < triggeredIdx,
            `advance-sector-offensives (idx=${offensivesIdx}) must precede check-triggered-operations (idx=${triggeredIdx}). ` +
                `On the trigger turn, prestageBrigadesForTriggeredOp runs in check-triggered-operations and writes ` +
                `brigade_movement_orders. If this assertion fails, prestage could write before estimateForceRatio runs ` +
                `in the same turn — at which point the temporal hypothesis would become testable on the inject turn ` +
                `itself rather than only on inject_turn+1.`,
        );
    });

    it('check-triggered-operations runs AFTER apply-brigade-movement within a turn', () => {
        // Direct corollary that disproves the hypothesis as written.
        // The hypothesis claims estimateForceRatio sees prestage-written orders
        // before they can convert to in_transit. But prestage writes them in
        // check-triggered-operations, which runs LATER than the only step
        // (apply-brigade-movement) that converts orders to in_transit. So the
        // earliest in_transit observation of a prestage write is at the NEXT
        // turn's apply-brigade-movement, not at the same turn's
        // advance-sector-offensives.
        const movementIdx = indexOfStep(APPLY_MOVEMENT);
        const triggeredIdx = indexOfStep(CHECK_TRIGGERED);
        assert.ok(
            movementIdx < triggeredIdx,
            `apply-brigade-movement (idx=${movementIdx}) must precede check-triggered-operations (idx=${triggeredIdx}). ` +
                `This is the ordering that makes the hypothesis structurally impossible: prestage writes orders AFTER ` +
                `the per-turn movement-application step has already run, so any prestage-written order cannot become ` +
                `in_transit until the next turn.`,
        );
    });

    it('temporal-contract corollary: prestage writes are NEVER observable as in_transit on the inject turn', () => {
        // This is the consolidated truth statement, asserted via the same
        // step-ordering primitives but framed as the negative claim under test.
        const movementIdx = indexOfStep(APPLY_MOVEMENT);
        const offensivesIdx = indexOfStep(ADVANCE_OFFENSIVES);
        const triggeredIdx = indexOfStep(CHECK_TRIGGERED);

        // Order on inject turn N: apply-movement → advance-offensives (estimateForceRatio runs;
        //                          op may not exist yet so participants may not be evaluated) →
        //                          check-triggered (prestage writes orders + injects op).
        // Order on next turn N+1: apply-movement (NOW orders may convert to in_transit) →
        //                          advance-offensives (estimateForceRatio sees op for first
        //                          time with participants potentially in_transit).
        const orderingHolds =
            movementIdx < offensivesIdx &&
            offensivesIdx < triggeredIdx &&
            movementIdx < triggeredIdx;
        assert.equal(
            orderingHolds,
            true,
            `Combined ordering (apply-brigade-movement < advance-sector-offensives < check-triggered-operations) is ` +
                `the structural reason the in-transit-conversion-after-prestage hypothesis cannot fire on the inject ` +
                `turn. Got indices movement=${movementIdx} offensives=${offensivesIdx} triggered=${triggeredIdx}.`,
        );
    });
});
