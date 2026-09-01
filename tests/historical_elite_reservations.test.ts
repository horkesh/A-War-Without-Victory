import { describe, expect, it } from 'vitest';
import { isEliteReservedForHistoricalOperation } from '../src/sim/combat/historical_elite_reservations.js';

describe('historical elite reservations', () => {
    it('holds both VRS Main Staff assault formations through Cerska-Kamenica injection', () => {
        expect(isEliteReservedForHistoricalOperation('rs_1st_guards_motorized', 1)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_65th_protection_motorized_regiment', 40)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_1st_guards_motorized', 41)).toBe(false);
        expect(isEliteReservedForHistoricalOperation('rs_other' as never, 1)).toBe(false);
    });
});
