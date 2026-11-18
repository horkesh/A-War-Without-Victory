/**
 * Exhaustion gate tests for operation and probe launch paths.
 *
 * Plans stop above MAX_EXHAUSTION_FOR_OPERATION (30). Package P3, consult 4 step 3
 * (2026-11-18): the commander's no-plan fallback (probe or local occupation) stops at the
 * same threshold. The old PROBE_EXHAUSTION_MARGIN (+10) is retired: a corps between 30 and
 * 40 could probe but not plan, and its probes kept it there.
 */

import { describe, it, expect } from 'vitest';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../src/sim/combat/bot_constants.js';
import * as directives from '../src/sim/combat/bot_corps_directives.js';
import { noPlanFallbackAllowedAtExhaustion } from '../src/sim/combat/bot_corps_directives.js';

describe('Exhaustion gate constants', () => {
    it('MAX_EXHAUSTION_FOR_OPERATION is 30', () => {
        expect(MAX_EXHAUSTION_FOR_OPERATION).toBe(30);
    });

    it('PROBE_EXHAUSTION_MARGIN is retired', () => {
        expect('PROBE_EXHAUSTION_MARGIN' in directives).toBe(false);
    });
});

describe('Sector offensive exhaustion gate', () => {
    function isBlockedForOffensive(corpsExhaustion: number): boolean {
        return corpsExhaustion > MAX_EXHAUSTION_FOR_OPERATION;
    }

    it('blocks above 30 and allows at or below it', () => {
        expect(isBlockedForOffensive(31)).toBe(true);
        expect(isBlockedForOffensive(50)).toBe(true);
        expect(isBlockedForOffensive(30)).toBe(false);
        expect(isBlockedForOffensive(0)).toBe(false);
    });
});

describe('No-plan fallback (probe) exhaustion gate', () => {
    it('stops where plans stop: blocked above 30, allowed at or below it', () => {
        expect(noPlanFallbackAllowedAtExhaustion(0)).toBe(true);
        expect(noPlanFallbackAllowedAtExhaustion(MAX_EXHAUSTION_FOR_OPERATION)).toBe(true);
        expect(noPlanFallbackAllowedAtExhaustion(31)).toBe(false);
        expect(noPlanFallbackAllowedAtExhaustion(60)).toBe(false);
    });

    it('closes the old 30-40 probe band', () => {
        expect(noPlanFallbackAllowedAtExhaustion(35)).toBe(false);
        expect(noPlanFallbackAllowedAtExhaustion(40)).toBe(false);
    });
});
