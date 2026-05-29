/**
 * TG pre-planned reservation regression test (ADR-0005 issue #40, Lane A).
 *
 * Guards against the 188w flag-on strand where a not-yet-injected pre-planned op's
 * anchor brigade (e.g. `rs_trnovo_brigade`, Op Trnovo, available_from=69) was
 * consumed as a TG donor before its op injected, so the op failed with
 * `zero_eligible_axis` when it finally fired (pre_planned_operations.ts §getReservedPrePlannedBrigadeIds).
 *
 * Two protections, two assertions:
 *   (a) `getReservedPrePlannedBrigadeIds(turn)` reserves the brigade while the op
 *       has not yet injected (turn < available_from) and releases it once injected
 *       (turn >= available_from). `selectDonors` already filters on this set, so a
 *       reserved brigade can never be picked as a donor.
 *   (b) Phase-ordering pin. NOTE — within a single turn the engine runs TG formation
 *       inside `advance-sector-offensives` (tickPreparation → formTgsAtReadyTransition)
 *       BEFORE `inject-queued-operations`. So the reservation guard in (a), NOT phase
 *       ordering, is the structural fix: it must hold regardless of relative phase
 *       position. We pin the actual observed ordering so a future reorder that would
 *       silently change the reservation contract surfaces as a test failure here.
 */

import { describe, expect, it } from 'vitest';
import { getReservedPrePlannedBrigadeIds } from '../src/sim/combat/pre_planned_operations.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';

// Op Trnovo (pre_planned_operations.ts) — anchor brigade + injection turn.
const TRNOVO_ANCHOR = 'rs_trnovo_brigade';
const TRNOVO_AVAILABLE_FROM = 69;

describe('issue #40 — pre-planned reservation excludes not-yet-injected op brigades from donors', () => {
    it('(a) reserves the op anchor while the op has not yet injected (turn < available_from)', () => {
        const reserved = getReservedPrePlannedBrigadeIds(TRNOVO_AVAILABLE_FROM - 1);
        expect(reserved.has(TRNOVO_ANCHOR)).toBe(true);
    });

    it('(a) reserves the op anchor at very early turns (turn 0)', () => {
        const reserved = getReservedPrePlannedBrigadeIds(0);
        expect(reserved.has(TRNOVO_ANCHOR)).toBe(true);
    });

    it('(a) releases the op anchor once the op injects (turn >= available_from)', () => {
        // At/after available_from the active op owns the brigade (Hard Invariant #1
        // / current_operation_id), so it is no longer "reserved" by the pre-planned guard.
        expect(getReservedPrePlannedBrigadeIds(TRNOVO_AVAILABLE_FROM).has(TRNOVO_ANCHOR)).toBe(false);
        expect(getReservedPrePlannedBrigadeIds(TRNOVO_AVAILABLE_FROM + 5).has(TRNOVO_ANCHOR)).toBe(false);
    });

    it('(b) pins the actual war-phase ordering of TG formation vs queued-op injection', () => {
        const names = warPhases.map(p => p.name);
        const formationPhase = names.indexOf('advance-sector-offensives'); // hosts tickPreparation → formTgsAtReadyTransition
        const injectPhase = names.indexOf('inject-queued-operations');
        expect(formationPhase).toBeGreaterThanOrEqual(0);
        expect(injectPhase).toBeGreaterThanOrEqual(0);
        // Observed contract: TG formation runs BEFORE queued-op injection within a turn.
        // The reservation guard (a) — not phase ordering — is what prevents the #40 strand;
        // this pin makes any future reorder of these two phases a deliberate, reviewed change.
        expect(formationPhase).toBeLessThan(injectPhase);
    });
});
