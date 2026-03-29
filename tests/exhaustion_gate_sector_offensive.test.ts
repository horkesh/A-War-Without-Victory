/**
 * Exhaustion gate tests for sector offensive and probe launch paths.
 *
 * Verifies that corps exhaustion blocks sector offensive launches (>30)
 * and probe launches (>40), matching the catalog-based operations path
 * in bot_corps_operations.ts.
 */

import { describe, it, expect } from 'vitest';
import {
    MAX_EXHAUSTION_FOR_OPERATION,
} from '../src/sim/combat/bot_constants.js';
import {
    PROBE_EXHAUSTION_MARGIN,
} from '../src/sim/combat/bot_corps_directives.js';

// ── Constants under test ────────────────────────────────────────────────────

describe('Exhaustion gate constants', () => {
    it('MAX_EXHAUSTION_FOR_OPERATION is 30', () => {
        expect(MAX_EXHAUSTION_FOR_OPERATION).toBe(30);
    });

    it('PROBE_EXHAUSTION_MARGIN is 10', () => {
        expect(PROBE_EXHAUSTION_MARGIN).toBe(10);
    });

    it('probe threshold is MAX_EXHAUSTION + PROBE_MARGIN = 40', () => {
        expect(MAX_EXHAUSTION_FOR_OPERATION + PROBE_EXHAUSTION_MARGIN).toBe(40);
    });
});

// ── Gate logic tests ────────────────────────────────────────────────────────
// The actual gate logic is inline in bot_corps_directives.ts (not a standalone
// function), so we test the boolean expressions directly using the same
// threshold comparisons the production code uses.

describe('Sector offensive exhaustion gate', () => {
    function isBlockedForOffensive(corpsExhaustion: number): boolean {
        return corpsExhaustion > MAX_EXHAUSTION_FOR_OPERATION;
    }

    it('corps with exhaustion 31 is blocked from sector offensive', () => {
        expect(isBlockedForOffensive(31)).toBe(true);
    });

    it('corps with exhaustion 50 is blocked from sector offensive', () => {
        expect(isBlockedForOffensive(50)).toBe(true);
    });

    it('corps with exhaustion 30 can launch sector offensive', () => {
        expect(isBlockedForOffensive(30)).toBe(false);
    });

    it('corps with exhaustion 0 can launch sector offensive', () => {
        expect(isBlockedForOffensive(0)).toBe(false);
    });

    it('corps with exhaustion exactly at threshold (30) is NOT blocked', () => {
        expect(isBlockedForOffensive(MAX_EXHAUSTION_FOR_OPERATION)).toBe(false);
    });
});

describe('Probe exhaustion gate', () => {
    const PROBE_THRESHOLD = MAX_EXHAUSTION_FOR_OPERATION + PROBE_EXHAUSTION_MARGIN;

    function isBlockedForProbe(corpsExhaustion: number): boolean {
        return corpsExhaustion > PROBE_THRESHOLD;
    }

    it('corps with exhaustion 41 is blocked from probe', () => {
        expect(isBlockedForProbe(41)).toBe(true);
    });

    it('corps with exhaustion 60 is blocked from probe', () => {
        expect(isBlockedForProbe(60)).toBe(true);
    });

    it('corps with exhaustion 40 can launch probe', () => {
        expect(isBlockedForProbe(40)).toBe(false);
    });

    it('corps with exhaustion 35 can launch probe (between offensive and probe thresholds)', () => {
        expect(isBlockedForProbe(35)).toBe(false);
    });

    it('corps with exhaustion 0 can launch probe', () => {
        expect(isBlockedForProbe(0)).toBe(false);
    });

    it('corps with exhaustion exactly at probe threshold (40) is NOT blocked', () => {
        expect(isBlockedForProbe(PROBE_THRESHOLD)).toBe(false);
    });
});

describe('Offensive vs probe threshold relationship', () => {
    it('probe threshold is more permissive than offensive threshold', () => {
        const offensiveThreshold = MAX_EXHAUSTION_FOR_OPERATION;
        const probeThreshold = MAX_EXHAUSTION_FOR_OPERATION + PROBE_EXHAUSTION_MARGIN;
        expect(probeThreshold).toBeGreaterThan(offensiveThreshold);
    });

    it('corps at exhaustion 35 is blocked for offensive but allowed for probe', () => {
        const exhaustion = 35;
        const blockedForOffensive = exhaustion > MAX_EXHAUSTION_FOR_OPERATION;
        const blockedForProbe = exhaustion > (MAX_EXHAUSTION_FOR_OPERATION + PROBE_EXHAUSTION_MARGIN);
        expect(blockedForOffensive).toBe(true);
        expect(blockedForProbe).toBe(false);
    });
});
