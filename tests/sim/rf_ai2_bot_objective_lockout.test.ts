/**
 * RF-AI2 bot objective lockout.
 *
 * A bot commander-planned op (buildCommanderOperation) that ends zero_eligible_axis or
 * max_failures puts its objectives on the corps' failed-objective cooldown at once.
 * Every other op (authored, triggered, pre-planned, Army HQ) keeps the old threshold
 * of two failures. The bot plan path in commander/emit.ts filters objectives on cooldown.
 */

import { describe, expect, it } from 'vitest';
import {
    buildCommanderOperation,
    isCommanderBuiltOperation,
} from '../../src/sim/combat/corps_operation_helpers.js';
import { recordFailedObjectives } from '../../src/sim/combat/sector_offensive.js';
import type { CorpsCommandState, CorpsOperation } from '../../src/state/game_state.js';

const OBJ = 'op:bihac:ripac';

function botOp(reason: CorpsOperation['recovery_reason']): CorpsOperation {
    const op = buildCommanderOperation('arbih_5th_corps', 71, ['b1', 'b2', 'b3'], 'sector:arbih_5th_corps:0', [OBJ], 3000, 'Operacija Rijeka');
    op.recovery_reason = reason;
    op.axes![0]!.status = 'failed' as never;
    return op;
}

function authoredOp(reason: CorpsOperation['recovery_reason']): CorpsOperation {
    return {
        name: 'Operation Grmeč 94',
        type: 'sector_attack',
        objectives: [OBJ],
        axes: [{ axis_id: 'grmec_94_axis_1', objectives: [OBJ], status: 'failed' }],
        is_pre_planned: true,
        recovery_reason: reason,
    } as unknown as CorpsOperation;
}

function emptyCmd(): CorpsCommandState {
    return {} as CorpsCommandState;
}

describe('isCommanderBuiltOperation', () => {
    it('recognises only the commander factory', () => {
        expect(isCommanderBuiltOperation(botOp('max_failures'))).toBe(true);
        expect(isCommanderBuiltOperation(authoredOp('max_failures'))).toBe(false);
        expect(isCommanderBuiltOperation({ axes: undefined })).toBe(false);
    });
});

describe('recordFailedObjectives with the bot lockout', () => {
    it.each(['zero_eligible_axis', 'max_failures'] as const)(
        'locks a bot objective out after one %s ending', (reason) => {
            const cmd = emptyCmd();
            recordFailedObjectives(cmd, botOp(reason), 77);
            const entry = cmd.failed_offensive_objectives![OBJ]!;
            expect(entry.failure_count).toBe(1);
            expect(entry.cooldown_until_turn).toBeGreaterThan(77);
        });

    it('lengthens the bot lockout with each repeated hard failure', () => {
        const cmd = emptyCmd();
        recordFailedObjectives(cmd, botOp('max_failures'), 77);
        const first = cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn - 77;
        recordFailedObjectives(cmd, botOp('zero_eligible_axis'), 100);
        const second = cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn - 100;
        expect(second).toBe(first * 2);
    });

    it('never shortens a longer lockout when a later soft failure is recorded', () => {
        const cmd = emptyCmd();
        recordFailedObjectives(cmd, botOp('max_failures'), 77);
        recordFailedObjectives(cmd, botOp('zero_eligible_axis'), 80); // count 2 -> until 96
        const longLock = cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn;
        recordFailedObjectives(cmd, authoredOp('max_failures'), 81); // threshold path: 81 + 8
        expect(cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn).toBe(longLock);
    });

    it('keeps the two-failure threshold for authored ops', () => {
        const cmd = emptyCmd();
        recordFailedObjectives(cmd, authoredOp('max_failures'), 77);
        expect(cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn).toBe(0);
        recordFailedObjectives(cmd, authoredOp('max_failures'), 80);
        expect(cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn).toBeGreaterThan(80);
    });

    it('keeps the two-failure threshold for softer bot endings (planning_invalidated)', () => {
        const cmd = emptyCmd();
        recordFailedObjectives(cmd, botOp('planning_invalidated'), 77);
        expect(cmd.failed_offensive_objectives![OBJ]!.cooldown_until_turn).toBe(0);
    });

    it('records nothing for a completed op', () => {
        const cmd = emptyCmd();
        recordFailedObjectives(cmd, botOp('completed'), 77);
        expect(cmd.failed_offensive_objectives).toBeUndefined();
    });
});
