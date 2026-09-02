import { describe, expect, it } from 'vitest';
import {
    isEliteAuthoredForHistoricalOperation,
    isEliteReservedForHistoricalOperation,
} from '../src/sim/combat/historical_elite_reservations.js';

describe('historical elite reservations', () => {
    it('holds both VRS Main Staff assault formations between Cerska-Kamenica and Zvezda 94', () => {
        expect(isEliteReservedForHistoricalOperation('rs_1st_guards_motorized', 1)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_65th_protection_motorized_regiment', 40)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_1st_guards_motorized', 54)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_65th_protection_motorized_regiment', 95)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_1st_guards_motorized', 96)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_65th_protection_motorized_regiment', 97)).toBe(true);
        expect(isEliteReservedForHistoricalOperation('rs_65th_protection_motorized_regiment', 98)).toBe(false);
        expect(isEliteReservedForHistoricalOperation('rs_other' as never, 1)).toBe(false);
        expect(isEliteAuthoredForHistoricalOperation('rs_1st_guards_motorized', 'Operation Cerska-Kamenica')).toBe(true);
        expect(isEliteAuthoredForHistoricalOperation('rs_1st_guards_motorized', 'Operation Lukavac 93')).toBe(true);
        expect(isEliteAuthoredForHistoricalOperation('rs_65th_protection_motorized_regiment', 'Operation Lukavac 93')).toBe(true);
        expect(isEliteAuthoredForHistoricalOperation('rs_65th_protection_motorized_regiment', 'Operation Zvezda 94')).toBe(true);
        expect(isEliteAuthoredForHistoricalOperation('rs_1st_guards_motorized', 'Operation Pracha River')).toBe(false);
    });
});
