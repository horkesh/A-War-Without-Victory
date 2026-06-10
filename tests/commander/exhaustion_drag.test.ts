/**
 * Tests for the faction-exhaustion op-launch willingness drag (Design B —
 * collapse repurpose, AWWV_EXHAUSTION_DRAG_V2).
 *
 * Contract:
 *   (a) Flag OFF (default) → `computeFactionExhaustionDrag` equals the EXACT
 *       legacy degenerate expression `max(0.3, 1 - raw/600)` for all raw inputs
 *       (byte-identity proof at the unit level → flag-off == current 649 floor).
 *   (b) Flag ON → late-war ramp on the recovered 0..100 scale: 1.0 below
 *       cracking (recovered 65), linear down to floor 0.55 at/above collapsing
 *       (recovered 85), interpolated between.
 *   (c) Symmetric across factions (pure function of the raw value — no faction
 *       input at all) and deterministic (same input → same output).
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
    computeFactionExhaustionDrag,
    setEnableExhaustionDragV2,
    resetEnableExhaustionDragV2,
    getEnableExhaustionDragV2,
    EXHAUSTION_DRAG_V2_FLOOR,
    EXHAUSTION_DRAG_V2_RAMP_START,
    EXHAUSTION_DRAG_V2_RAMP_FULL,
} from '../../src/sim/combat/commander/plan.js';
import {
    recoveredExhaustionLevel,
    WAR_WEARINESS_BAND_THRESHOLDS,
} from '../../src/state/war_weariness_bands.js';

/** The EXACT legacy degenerate expression that the 649 floor was built on. */
function legacyDrag(rawExhaustion: number): number {
    return Math.max(0.3, 1.0 - rawExhaustion / 600);
}

describe('computeFactionExhaustionDrag — Design B exhaustion drag', () => {
    afterEach(() => {
        // Always restore the default-OFF flag so no test leaks the override.
        resetEnableExhaustionDragV2();
    });

    it('defaults to OFF (byte-identical legacy behavior unless explicitly enabled)', () => {
        expect(getEnableExhaustionDragV2()).toBe(false);
    });

    it('reuses Design A band thresholds as the single source of truth', () => {
        expect(EXHAUSTION_DRAG_V2_RAMP_START).toBe(WAR_WEARINESS_BAND_THRESHOLDS.cracking);
        expect(EXHAUSTION_DRAG_V2_RAMP_FULL).toBe(WAR_WEARINESS_BAND_THRESHOLDS.collapsing);
        expect(EXHAUSTION_DRAG_V2_RAMP_START).toBe(65);
        expect(EXHAUSTION_DRAG_V2_RAMP_FULL).toBe(85);
        expect(EXHAUSTION_DRAG_V2_FLOOR).toBe(0.55);
    });

    describe('(a) flag OFF → exact legacy expression (byte-identity)', () => {
        // Sweep across the whole raw 0..10000 accumulator domain plus boundaries.
        const rawValues = [
            0, 1, 100, 299, 300, 599, 600, 601, 1000, 2700, 3000, 6500,
            8000, 8500, 9999, 10000, 12345,
        ];

        for (const raw of rawValues) {
            it(`raw=${raw} matches max(0.3, 1 - raw/600)`, () => {
                resetEnableExhaustionDragV2(); // default OFF
                expect(computeFactionExhaustionDrag(raw)).toBe(legacyDrag(raw));
            });
        }

        it('saturates the legacy floor near raw 420 (degenerate early tax)', () => {
            // The legacy form is `max(0.3, 1 - raw/600)`. Byte-identity is the
            // contract (verified against legacyDrag above), so we assert the
            // EXACT legacy result here — note 1 - 420/600 = 0.30000000000000004
            // in IEEE754, which is what the legacy 649 floor actually computed.
            expect(computeFactionExhaustionDrag(420)).toBe(legacyDrag(420));
            // For raw well past the floor, 1 - raw/600 < 0.3 so max() clamps to exactly 0.3.
            expect(computeFactionExhaustionDrag(5000)).toBe(0.3);
            expect(computeFactionExhaustionDrag(10000)).toBe(0.3);
        });
    });

    describe('(b) flag ON → late-war ramp on the recovered 0..100 scale', () => {
        it('is 1.0 below cracking (recovered <= 65)', () => {
            setEnableExhaustionDragV2(true);
            // recovered level = raw/100. raw 0..6500 → level 0..65.
            expect(computeFactionExhaustionDrag(0)).toBe(1.0);
            expect(computeFactionExhaustionDrag(100)).toBe(1.0); // level 1
            expect(computeFactionExhaustionDrag(4000)).toBe(1.0); // level 40 (strained)
            expect(computeFactionExhaustionDrag(6400)).toBe(1.0); // level 64
            expect(computeFactionExhaustionDrag(6500)).toBe(1.0); // level 65 exactly (boundary → 1.0)
        });

        it('is the 0.55 floor at/above collapsing (recovered >= 85)', () => {
            setEnableExhaustionDragV2(true);
            expect(computeFactionExhaustionDrag(8500)).toBe(0.55); // level 85 exactly
            expect(computeFactionExhaustionDrag(9000)).toBe(0.55); // level 90
            expect(computeFactionExhaustionDrag(10000)).toBe(0.55); // level 100
            expect(computeFactionExhaustionDrag(50000)).toBe(0.55); // clamped >100 → 0.55
        });

        it('interpolates linearly between cracking and collapsing', () => {
            setEnableExhaustionDragV2(true);
            // Midpoint: level 75 → 1 - (10/20)*0.45 = 1 - 0.225 = 0.775
            expect(computeFactionExhaustionDrag(7500)).toBeCloseTo(0.775, 10);
            // level 70 → 1 - (5/20)*0.45 = 1 - 0.1125 = 0.8875
            expect(computeFactionExhaustionDrag(7000)).toBeCloseTo(0.8875, 10);
            // level 80 → 1 - (15/20)*0.45 = 1 - 0.3375 = 0.6625
            expect(computeFactionExhaustionDrag(8000)).toBeCloseTo(0.6625, 10);
        });

        it('matches an independent reference formula across the ramp', () => {
            setEnableExhaustionDragV2(true);
            const ref = (raw: number): number => {
                const level = recoveredExhaustionLevel(raw);
                if (level <= 65) return 1.0;
                if (level >= 85) return 0.55;
                return 1.0 - ((level - 65) / 20) * 0.45;
            };
            for (let raw = 0; raw <= 10000; raw += 137) {
                expect(computeFactionExhaustionDrag(raw)).toBeCloseTo(ref(raw), 10);
            }
        });

        it('is monotonically non-increasing as exhaustion rises (a ramp, not a step-tax)', () => {
            setEnableExhaustionDragV2(true);
            let prev = computeFactionExhaustionDrag(0);
            for (let raw = 0; raw <= 10000; raw += 50) {
                const cur = computeFactionExhaustionDrag(raw);
                expect(cur).toBeLessThanOrEqual(prev + 1e-12);
                prev = cur;
            }
        });

        it('never goes below the 0.55 floor (spent, not paralyzed)', () => {
            setEnableExhaustionDragV2(true);
            for (let raw = 0; raw <= 20000; raw += 250) {
                expect(computeFactionExhaustionDrag(raw)).toBeGreaterThanOrEqual(0.55);
            }
        });
    });

    describe('(c) symmetric across factions + deterministic', () => {
        it('is a pure function of the raw value (no faction parameter → identical for all factions)', () => {
            // The signature takes only the raw numeric; supplying the same
            // raw value yields the same drag regardless of which faction it came
            // from. Symmetry is structural.
            for (const flag of [false, true]) {
                if (flag) setEnableExhaustionDragV2(true);
                else resetEnableExhaustionDragV2();
                const rbihRaw = 7200;
                const rsRaw = 7200;
                const hrhbRaw = 7200;
                const a = computeFactionExhaustionDrag(rbihRaw);
                const b = computeFactionExhaustionDrag(rsRaw);
                const c = computeFactionExhaustionDrag(hrhbRaw);
                expect(a).toBe(b);
                expect(b).toBe(c);
            }
        });

        it('is deterministic — same input yields same output across repeated calls', () => {
            setEnableExhaustionDragV2(true);
            for (const raw of [0, 6500, 7300, 8500, 10000]) {
                const first = computeFactionExhaustionDrag(raw);
                for (let i = 0; i < 5; i++) {
                    expect(computeFactionExhaustionDrag(raw)).toBe(first);
                }
            }
        });
    });
});
