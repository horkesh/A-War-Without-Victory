/**
 * Tests for the faction-exhaustion op-launch willingness drag (Design B v2 —
 * collapse repurpose, AWWV_EXHAUSTION_DRAG_V2).
 *
 * v2 drives the ON-branch drag from a per-faction CASUALTY-LOAD signal
 * (cumulative casualties ÷ fielded personnel) which — unlike the saturated
 * `war_exhaustion` field v1 used — keeps rising late-war. The drag FALLS as load
 * rises (sign-corrected: higher load → lower drag → smaller additive op-launch
 * term → fewer launches), flooring BELOW the legacy saturated 0.3.
 *
 * Contract:
 *   (a) Flag OFF (default) → `computeFactionExhaustionDrag` equals the EXACT
 *       legacy degenerate expression `max(0.3, 1 - raw/600)` for all raw inputs,
 *       IGNORING the casualty-load argument (byte-identity proof at the unit
 *       level → flag-off == current 649 floor, incl the IEEE754 detail).
 *   (b) Flag ON → casualty-load ramp: 1.0 at load<=1.0, linear DOWN to the
 *       0.20 floor at load>=2.5, interpolated between; div-by-zero/absent
 *       load (0) → 1.0 (no drag).
 *   (c) Symmetric across factions (pure function of the numerics — no faction
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
    EXHAUSTION_DRAG_V2_LOAD_START,
    EXHAUSTION_DRAG_V2_LOAD_FULL,
} from '../../src/sim/combat/commander/plan.js';

/** The EXACT legacy degenerate expression that the 649 floor was built on. */
function legacyDrag(rawExhaustion: number): number {
    return Math.max(0.3, 1.0 - rawExhaustion / 600);
}

/** Independent reference for the ON-branch casualty-load ramp. */
function refLoadRamp(load: number): number {
    const l = load > 0 ? load : 0;
    if (l <= EXHAUSTION_DRAG_V2_LOAD_START) return 1.0;
    if (l >= EXHAUSTION_DRAG_V2_LOAD_FULL) return EXHAUSTION_DRAG_V2_FLOOR;
    const span = EXHAUSTION_DRAG_V2_LOAD_FULL - EXHAUSTION_DRAG_V2_LOAD_START;
    return 1.0 - ((l - EXHAUSTION_DRAG_V2_LOAD_START) / span) * (1.0 - EXHAUSTION_DRAG_V2_FLOOR);
}

describe('computeFactionExhaustionDrag — Design B v2 casualty-load drag', () => {
    afterEach(() => {
        // Always restore the default-OFF flag so no test leaks the override.
        resetEnableExhaustionDragV2();
    });

    it('defaults to OFF (byte-identical legacy behavior unless explicitly enabled)', () => {
        expect(getEnableExhaustionDragV2()).toBe(false);
    });

    it('exposes the v2 casualty-load constants (floor BELOW legacy 0.3 → genuine net drag)', () => {
        expect(EXHAUSTION_DRAG_V2_LOAD_START).toBe(1.0);
        expect(EXHAUSTION_DRAG_V2_LOAD_FULL).toBe(2.5);
        expect(EXHAUSTION_DRAG_V2_FLOOR).toBe(0.20);
        // The sign correction: the floor must be BELOW the legacy saturated 0.3.
        expect(EXHAUSTION_DRAG_V2_FLOOR).toBeLessThan(0.3);
    });

    describe('(a) flag OFF → exact legacy expression (byte-identity), load ignored', () => {
        // Sweep across the whole raw 0..10000 accumulator domain plus boundaries.
        const rawValues = [
            0, 1, 100, 299, 300, 420, 599, 600, 601, 1000, 2700, 3000, 5000, 6500,
            8000, 8500, 9999, 10000, 12345,
        ];

        for (const raw of rawValues) {
            it(`raw=${raw} matches max(0.3, 1 - raw/600) (no second arg)`, () => {
                resetEnableExhaustionDragV2(); // default OFF
                expect(computeFactionExhaustionDrag(raw)).toBe(legacyDrag(raw));
            });
            it(`raw=${raw} ignores the casualty-load arg when OFF`, () => {
                resetEnableExhaustionDragV2();
                // Even a deep-in-the-ramp load must NOT change the OFF result.
                expect(computeFactionExhaustionDrag(raw, 5.0)).toBe(legacyDrag(raw));
                expect(computeFactionExhaustionDrag(raw, 0)).toBe(legacyDrag(raw));
            });
        }

        it('preserves the IEEE754 detail of the legacy floor (raw 420 → 0.30000000000000004)', () => {
            resetEnableExhaustionDragV2();
            // 1 - 420/600 = 0.30000000000000004 in IEEE754 — what the 649 floor computed.
            expect(computeFactionExhaustionDrag(420, 9.9)).toBe(legacyDrag(420));
            // Past the floor, max() clamps to exactly 0.3.
            expect(computeFactionExhaustionDrag(5000)).toBe(0.3);
            expect(computeFactionExhaustionDrag(10000)).toBe(0.3);
        });

        it('is byte-identical to legacy across the full raw 0..10000 domain (incl IEEE754)', () => {
            resetEnableExhaustionDragV2();
            for (let raw = 0; raw <= 10000; raw += 1) {
                // toBe = Object.is → exact bit-for-bit equality (the byte-identity contract).
                expect(computeFactionExhaustionDrag(raw, raw % 7)).toBe(legacyDrag(raw));
            }
        });
    });

    describe('(b) flag ON → casualty-load ramp (sign-corrected: load↑ → drag↓)', () => {
        it('is 1.0 at/below load 1.0 (early/mid war → no drag)', () => {
            setEnableExhaustionDragV2(true);
            expect(computeFactionExhaustionDrag(0, 0)).toBe(1.0);   // no casualties
            expect(computeFactionExhaustionDrag(0, 0.5)).toBe(1.0);
            expect(computeFactionExhaustionDrag(0, 1.0)).toBe(1.0); // boundary → 1.0
            // The raw war_exhaustion arg is irrelevant on the ON path.
            expect(computeFactionExhaustionDrag(10000, 1.0)).toBe(1.0);
        });

        it('is the 0.20 floor at/above load 2.5 (fully spent)', () => {
            setEnableExhaustionDragV2(true);
            expect(computeFactionExhaustionDrag(0, 2.5)).toBe(0.20); // boundary
            expect(computeFactionExhaustionDrag(0, 2.6)).toBe(0.20); // RS w188 ≈ 2.6
            expect(computeFactionExhaustionDrag(0, 5.0)).toBe(0.20);
            expect(computeFactionExhaustionDrag(0, 1000)).toBe(0.20);
        });

        it('interpolates linearly between load 1.0 and 2.5', () => {
            setEnableExhaustionDragV2(true);
            // Midpoint load 1.75 → 1 - (0.75/1.5)*0.8 = 1 - 0.4 = 0.6
            expect(computeFactionExhaustionDrag(0, 1.75)).toBeCloseTo(0.6, 12);
            // load 1.5 → 1 - (0.5/1.5)*0.8 = 1 - 0.2666… = 0.7333…
            expect(computeFactionExhaustionDrag(0, 1.5)).toBeCloseTo(0.733333333, 8);
            // load 2.0 → 1 - (1.0/1.5)*0.8 = 1 - 0.5333… = 0.46666…
            expect(computeFactionExhaustionDrag(0, 2.0)).toBeCloseTo(0.466666666, 8);
        });

        it('matches an independent reference formula across the load domain', () => {
            setEnableExhaustionDragV2(true);
            for (let load = 0; load <= 4.0; load += 0.013) {
                expect(computeFactionExhaustionDrag(0, load)).toBeCloseTo(refLoadRamp(load), 12);
            }
        });

        it('is monotonically NON-INCREASING as load rises (the sign correction)', () => {
            setEnableExhaustionDragV2(true);
            let prev = computeFactionExhaustionDrag(0, 0);
            for (let load = 0; load <= 5.0; load += 0.01) {
                const cur = computeFactionExhaustionDrag(0, load);
                expect(cur).toBeLessThanOrEqual(prev + 1e-12);
                prev = cur;
            }
        });

        it('never drops below the 0.20 floor (spent, not paralyzed)', () => {
            setEnableExhaustionDragV2(true);
            for (let load = 0; load <= 50; load += 0.25) {
                expect(computeFactionExhaustionDrag(0, load)).toBeGreaterThanOrEqual(0.20);
            }
        });

        it('treats absent/zero/negative load as 0 → drag 1.0 (div-by-zero guard)', () => {
            setEnableExhaustionDragV2(true);
            expect(computeFactionExhaustionDrag(0)).toBe(1.0);       // arg omitted → default 0
            expect(computeFactionExhaustionDrag(0, 0)).toBe(1.0);
            expect(computeFactionExhaustionDrag(0, -1)).toBe(1.0);   // negative clamped to 0
            expect(computeFactionExhaustionDrag(0, NaN)).toBe(1.0);  // NaN > 0 is false → 0
        });
    });

    describe('(c) symmetric across factions + deterministic', () => {
        it('is a pure function of the numerics (identical for all factions at equal load)', () => {
            for (const flag of [false, true]) {
                if (flag) setEnableExhaustionDragV2(true);
                else resetEnableExhaustionDragV2();
                const load = 1.9; // a value inside the ON ramp
                const raw = 7200;
                const a = computeFactionExhaustionDrag(raw, load); // "RBiH"
                const b = computeFactionExhaustionDrag(raw, load); // "RS"
                const c = computeFactionExhaustionDrag(raw, load); // "HRHB"
                expect(a).toBe(b);
                expect(b).toBe(c);
            }
        });

        it('is deterministic — same input yields same output across repeated calls', () => {
            setEnableExhaustionDragV2(true);
            for (const load of [0, 0.9, 1.0, 1.75, 2.5, 3.0]) {
                const first = computeFactionExhaustionDrag(0, load);
                for (let i = 0; i < 5; i++) {
                    expect(computeFactionExhaustionDrag(0, load)).toBe(first);
                }
            }
        });
    });
});
