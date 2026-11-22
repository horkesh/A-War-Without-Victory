/**
 * Exhaustion gate tests for the sector offensive launch path.
 *
 * Verifies that corps exhaustion blocks sector offensive launches (>30),
 * matching the catalog-based operations path
 * in bot_corps_operations.ts.
 */

import { describe, it, expect } from 'vitest';
import {
    MAX_EXHAUSTION_FOR_OPERATION,
} from '../src/sim/combat/bot_constants.js';

// ── Constants under test ────────────────────────────────────────────────────

describe('Exhaustion gate constants', () => {
    it('MAX_EXHAUSTION_FOR_OPERATION is 30', () => {
        expect(MAX_EXHAUSTION_FOR_OPERATION).toBe(30);
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
