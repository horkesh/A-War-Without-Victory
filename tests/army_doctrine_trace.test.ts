/**
 * F7b trace (2026-11-15): Army HQ doctrine receipts are stdout-only and absent by default.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ARMY_DOCTRINE_PREFIX,
    emitArmyDoctrineRecord,
    resetReasonCodeTopicCacheForTests,
} from '../src/sim/combat/reason_code_debug.js';

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setTopics(undefined);
    vi.restoreAllMocks();
});

describe('army_doctrine trace', () => {
    it('writes nothing on a default run', () => {
        setTopics(undefined);
        const sink = vi.spyOn(console, 'log').mockImplementation(() => {});
        emitArmyDoctrineRecord({ turn: 1, faction: 'RS', army_stance: 'balanced' });
        expect(sink).not.toHaveBeenCalled();
    });

    it('writes one prefixed, key-sorted JSON line when requested', () => {
        setTopics('army_doctrine');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line: string) => { lines.push(line); });
        emitArmyDoctrineRecord({ turn: 7, faction: 'RBiH', supply_status: 'critical', army_stance: 'general_defensive' });
        expect(lines).toHaveLength(1);
        expect(lines[0]!.startsWith(`${ARMY_DOCTRINE_PREFIX} `)).toBe(true);
        const body = JSON.parse(lines[0]!.slice(ARMY_DOCTRINE_PREFIX.length + 1));
        expect(body).toEqual({ army_stance: 'general_defensive', faction: 'RBiH', schema_version: 1, supply_status: 'critical', turn: 7 });
    });

    it('a failing stdout sink cannot affect the caller', () => {
        setTopics('army_doctrine');
        vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('sink failed'); });
        expect(() => emitArmyDoctrineRecord({ turn: 1 })).not.toThrow();
    });
});
