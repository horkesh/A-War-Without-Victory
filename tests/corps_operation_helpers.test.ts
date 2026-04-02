import { describe, it, expect } from 'vitest';
import {
    buildEmergencyDefenseOperation,
    derivePrimarySectorForBrigades,
    getMaxOperationSlots,
    hasAvailableSlot,
    findBrigadeOperation,
    getAvailableBrigades,
    hasActiveOperation,
    getPrimaryOperation,
    removeOperation,
} from '../src/sim/combat/corps_operation_helpers.js';

describe('getMaxOperationSlots', () => {
    it('returns 1 for small corps (8 brigades)', () => {
        expect(getMaxOperationSlots(8)).toBe(1);
    });
    it('returns 1 for 11 brigades', () => {
        expect(getMaxOperationSlots(11)).toBe(1);
    });
    it('returns 1 for 12 brigades', () => {
        expect(getMaxOperationSlots(12)).toBe(1);
    });
    it('returns 2 for 24 brigades', () => {
        expect(getMaxOperationSlots(24)).toBe(2);
    });
    it('returns 3 for 36 brigades', () => {
        expect(getMaxOperationSlots(36)).toBe(3);
    });
    it('returns 1 minimum even for 0 brigades', () => {
        expect(getMaxOperationSlots(0)).toBe(1);
    });
});

describe('hasAvailableSlot', () => {
    it('returns true when no ops active', () => {
        const cmd = { active_operations: [] } as any;
        expect(hasAvailableSlot(cmd, 10)).toBe(true);
    });
    it('returns false when all slots full', () => {
        const cmd = { active_operations: [{}] } as any;
        expect(hasAvailableSlot(cmd, 8)).toBe(false);
    });
    it('returns true when 1 of 2 slots used', () => {
        const cmd = { active_operations: [{}] } as any;
        expect(hasAvailableSlot(cmd, 24)).toBe(true);
    });
    it('returns false when 2 of 2 slots used', () => {
        const cmd = { active_operations: [{}, {}] } as any;
        expect(hasAvailableSlot(cmd, 24)).toBe(false);
    });
});

describe('findBrigadeOperation', () => {
    it('returns null when no ops', () => {
        const cmd = { active_operations: [] } as any;
        expect(findBrigadeOperation(cmd, 'brig1')).toBeNull();
    });
    it('finds the op containing the brigade', () => {
        const op1 = { name: 'Op A', participating_brigades: ['brig1', 'brig2'] };
        const op2 = { name: 'Op B', participating_brigades: ['brig3'] };
        const cmd = { active_operations: [op1, op2] } as any;
        expect(findBrigadeOperation(cmd, 'brig3')?.name).toBe('Op B');
    });
    it('returns null when brigade not in any op', () => {
        const op1 = { name: 'Op A', participating_brigades: ['brig1'] };
        const cmd = { active_operations: [op1] } as any;
        expect(findBrigadeOperation(cmd, 'brig99')).toBeNull();
    });
    it('returns first op if brigade is in multiple (should not happen)', () => {
        const op1 = { name: 'Op A', participating_brigades: ['brig1'] };
        const op2 = { name: 'Op B', participating_brigades: ['brig1'] };
        const cmd = { active_operations: [op1, op2] } as any;
        expect(findBrigadeOperation(cmd, 'brig1')?.name).toBe('Op A');
    });
});

describe('getAvailableBrigades', () => {
    it('excludes brigades in active ops', () => {
        const op = { participating_brigades: ['b1', 'b2'] };
        const cmd = { active_operations: [op] } as any;
        const all = ['b1', 'b2', 'b3', 'b4'];
        expect(getAvailableBrigades(cmd, all)).toEqual(['b3', 'b4']);
    });
    it('returns all when no ops', () => {
        const cmd = { active_operations: [] } as any;
        expect(getAvailableBrigades(cmd, ['b1', 'b2'])).toEqual(['b1', 'b2']);
    });
    it('excludes across multiple ops', () => {
        const op1 = { participating_brigades: ['b1'] };
        const op2 = { participating_brigades: ['b3'] };
        const cmd = { active_operations: [op1, op2] } as any;
        expect(getAvailableBrigades(cmd, ['b1', 'b2', 'b3'])).toEqual(['b2']);
    });
});

describe('hasActiveOperation', () => {
    it('returns false for empty', () => {
        expect(hasActiveOperation({ active_operations: [] } as any)).toBe(false);
    });
    it('returns true when ops present', () => {
        expect(hasActiveOperation({ active_operations: [{}] } as any)).toBe(true);
    });
});

describe('getPrimaryOperation', () => {
    it('returns null for empty', () => {
        expect(getPrimaryOperation({ active_operations: [] } as any)).toBeNull();
    });
    it('returns first op', () => {
        const op1 = { name: 'Op A' };
        const op2 = { name: 'Op B' };
        const cmd = { active_operations: [op1, op2] } as any;
        expect(getPrimaryOperation(cmd)?.name).toBe('Op A');
    });
});

describe('removeOperation', () => {
    it('removes the specified op', () => {
        const op1 = { name: 'Op A' } as any;
        const op2 = { name: 'Op B' } as any;
        const cmd = { active_operations: [op1, op2] } as any;
        removeOperation(cmd, op1);
        expect(cmd.active_operations).toEqual([op2]);
    });
    it('does nothing if op not found', () => {
        const op1 = { name: 'Op A' } as any;
        const other = { name: 'Op C' } as any;
        const cmd = { active_operations: [op1] } as any;
        removeOperation(cmd, other);
        expect(cmd.active_operations).toEqual([op1]);
    });
});

describe('emergency defense sector anchoring', () => {
    it('anchors emergency defense to the sector with the strongest participant overlap', () => {
        const sectorId = derivePrimarySectorForBrigades(
            [
                {
                    sector_id: 'sector:arbih_3rd:ozren',
                    corps_id: 'arbih_3rd_corps',
                    assigned_brigade_ids: ['b1', 'b2'],
                    reserve_brigade_ids: ['b5'],
                    length_edges: 6,
                },
                {
                    sector_id: 'sector:arbih_3rd:tuzla',
                    corps_id: 'arbih_3rd_corps',
                    assigned_brigade_ids: ['b3'],
                    reserve_brigade_ids: ['b4'],
                    length_edges: 4,
                },
            ] as any,
            'arbih_3rd_corps',
            ['b1', 'b2', 'b4'],
        );

        expect(sectorId).toBe('sector:arbih_3rd:ozren');
    });

    it('builds emergency defense operations with the derived sector anchor', () => {
        const operation = buildEmergencyDefenseOperation(
            'arbih_3rd_corps',
            8,
            ['b1', 'b2'],
            ['op:tuzla:center'],
            'sector:arbih_3rd:ozren',
        );

        expect(operation.type).toBe('strategic_defense');
        expect(operation.sector_id).toBe('sector:arbih_3rd:ozren');
        expect(operation.is_emergency).toBe(true);
    });
});
