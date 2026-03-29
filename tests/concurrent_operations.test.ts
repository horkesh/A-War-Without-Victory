import { describe, it, expect } from 'vitest';
import {
    getMaxOperationSlots,
    hasAvailableSlot,
    findBrigadeOperation,
    getAvailableBrigades,
    hasActiveOperation,
    getPrimaryOperation,
    removeOperation,
} from '../src/sim/combat/corps_operation_helpers.js';
import type { CorpsCommandState, CorpsOperation } from '../src/state/game_state.js';

function makeOp(name: string, brigades: string[]): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 1,
        phase_started_turn: 1,
        participating_brigades: brigades,
    } as CorpsOperation;
}

function makeCmd(ops: CorpsOperation[] = []): CorpsCommandState {
    return { active_operations: ops } as CorpsCommandState;
}

// ---------------------------------------------------------------------------
// 1. Slot capacity
// ---------------------------------------------------------------------------
describe('Slot capacity', () => {
    it('corps with 8 brigades gets 1 slot max', () => {
        expect(getMaxOperationSlots(8)).toBe(1);
    });

    it('corps with 24 brigades gets 2 slots max', () => {
        expect(getMaxOperationSlots(24)).toBe(2);
    });

    it('corps with 36 brigades gets 3 slots max', () => {
        expect(getMaxOperationSlots(36)).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// 2. Concurrent launch
// ---------------------------------------------------------------------------
describe('Concurrent launch', () => {
    it('corps with 24 brigades and 1 active op can launch a 2nd', () => {
        const cmd = makeCmd([makeOp('Op Alpha', ['b1', 'b2'])]);
        expect(hasAvailableSlot(cmd, 24)).toBe(true);
    });

    it('corps with 8 brigades and 1 active op cannot launch another', () => {
        const cmd = makeCmd([makeOp('Op Alpha', ['b1', 'b2'])]);
        expect(hasAvailableSlot(cmd, 8)).toBe(false);
    });

    it('corps with 24 brigades and 2 active ops has no slot left', () => {
        const cmd = makeCmd([
            makeOp('Op Alpha', ['b1', 'b2']),
            makeOp('Op Beta', ['b3', 'b4']),
        ]);
        expect(hasAvailableSlot(cmd, 24)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 3. Brigade exclusion
// ---------------------------------------------------------------------------
describe('Brigade exclusion', () => {
    const opA = makeOp('Op Alpha', ['b1', 'b2', 'b3']);
    const cmd = makeCmd([opA]);
    const allBrigades = ['b1', 'b2', 'b3', 'b4', 'b5'];

    it('brigade in Op A is not available', () => {
        const available = getAvailableBrigades(cmd, allBrigades);
        expect(available).toEqual(['b4', 'b5']);
    });

    it('findBrigadeOperation returns Op A for committed brigade', () => {
        expect(findBrigadeOperation(cmd, 'b1')).toBe(opA);
    });

    it('findBrigadeOperation returns null for a free brigade', () => {
        expect(findBrigadeOperation(cmd, 'b4')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// 4. Operation completion
// ---------------------------------------------------------------------------
describe('Operation completion', () => {
    it('completing Op A frees its brigades while Op B remains', () => {
        const opA = makeOp('Op Alpha', ['b1', 'b2']);
        const opB = makeOp('Op Beta', ['b3', 'b4']);
        const cmd = makeCmd([opA, opB]);

        removeOperation(cmd, opA);

        expect(cmd.active_operations).toHaveLength(1);
        expect(cmd.active_operations[0]).toBe(opB);
        expect(hasActiveOperation(cmd)).toBe(true);

        // Brigades from Op A are now available
        const available = getAvailableBrigades(cmd, ['b1', 'b2', 'b3', 'b4']);
        expect(available).toEqual(['b1', 'b2']);
    });

    it('hasActiveOperation returns false when last op removed', () => {
        const opA = makeOp('Op Alpha', ['b1']);
        const cmd = makeCmd([opA]);

        removeOperation(cmd, opA);

        expect(hasActiveOperation(cmd)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 5. Pre-planned queue behavior
// ---------------------------------------------------------------------------
describe('Pre-planned queue behavior', () => {
    it('queued op in slot 0 makes hasActiveOperation true', () => {
        const queuedOp = makeOp('Op Queued', ['b1', 'b2']);
        queuedOp.phase = 'planning';
        const cmd = makeCmd([queuedOp]);

        expect(hasActiveOperation(cmd)).toBe(true);
    });

    it('hasAvailableSlot with 24+ brigades still true when slot 0 occupied', () => {
        const queuedOp = makeOp('Op Queued', ['b1', 'b2']);
        queuedOp.phase = 'planning';
        const cmd = makeCmd([queuedOp]);

        expect(hasAvailableSlot(cmd, 24)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 6. Operation isolation
// ---------------------------------------------------------------------------
describe('Operation isolation', () => {
    it('two ops track independent battle counts', () => {
        const opA = makeOp('Op Alpha', ['b1', 'b2']);
        const opB = makeOp('Op Beta', ['b3', 'b4']);
        opA.attack_attempt_count = 3;
        opA.objective_capture_count = 1;
        opB.attack_attempt_count = 5;
        opB.objective_capture_count = 2;

        const cmd = makeCmd([opA, opB]);

        expect(cmd.active_operations[0].attack_attempt_count).toBe(3);
        expect(cmd.active_operations[0].objective_capture_count).toBe(1);
        expect(cmd.active_operations[1].attack_attempt_count).toBe(5);
        expect(cmd.active_operations[1].objective_capture_count).toBe(2);
    });

    it('removing one op does not affect the other ops participating_brigades', () => {
        const opA = makeOp('Op Alpha', ['b1', 'b2']);
        const opB = makeOp('Op Beta', ['b3', 'b4']);
        const cmd = makeCmd([opA, opB]);

        removeOperation(cmd, opA);

        expect(opB.participating_brigades).toEqual(['b3', 'b4']);
        expect(cmd.active_operations[0].participating_brigades).toEqual(['b3', 'b4']);
    });
});

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
    it('getAvailableBrigades with empty active_operations returns all brigades', () => {
        const cmd = makeCmd([]);
        const all = ['b1', 'b2', 'b3'];
        expect(getAvailableBrigades(cmd, all)).toEqual(all);
    });

    it('findBrigadeOperation with empty active_operations returns null', () => {
        const cmd = makeCmd([]);
        expect(findBrigadeOperation(cmd, 'b1')).toBeNull();
    });

    it('removeOperation with op not in list is a no-op', () => {
        const opA = makeOp('Op Alpha', ['b1']);
        const opB = makeOp('Op Beta', ['b2']);
        const cmd = makeCmd([opA]);

        removeOperation(cmd, opB);

        expect(cmd.active_operations).toHaveLength(1);
        expect(cmd.active_operations[0]).toBe(opA);
    });

    it('getPrimaryOperation returns first op', () => {
        const opA = makeOp('Op Alpha', ['b1']);
        const opB = makeOp('Op Beta', ['b2']);
        const cmd = makeCmd([opA, opB]);

        expect(getPrimaryOperation(cmd)).toBe(opA);
    });

    it('getPrimaryOperation returns null when no ops', () => {
        const cmd = makeCmd([]);
        expect(getPrimaryOperation(cmd)).toBeNull();
    });
});
