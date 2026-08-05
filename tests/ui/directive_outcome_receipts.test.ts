import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/state/game_state.js';
import {
    buildDirectiveOutcomeReceipts,
    directiveOutcomeReceiptsRealizedOnTurn,
} from '../../src/ui/map/data/directiveOutcomeReceipts.js';
import { plainReason } from '../../src/ui/map/data/opDirectiveObjection.js';

// R4 Phase 6 Task 6.2 — the pure directive-outcome receipt builder. Surfaces the
// `op_directive_rejection` the engine persists and (before this task) threw away.

function stateWith(rejections: Record<string, { target_osid: string; reason: string; turn: number } | undefined>): GameState {
    const corps_command: Record<string, any> = {};
    for (const [corpsId, rejection] of Object.entries(rejections)) {
        corps_command[corpsId] = rejection ? { op_directive_rejection: rejection } : {};
    }
    return { military: { corps_command } } as unknown as GameState;
}

describe('buildDirectiveOutcomeReceipts (Task 6.2)', () => {
    it('projects a persisted rejection into a receipt', () => {
        const receipts = buildDirectiveOutcomeReceipts(
            stateWith({
                vrs_1st_krajina: { target_osid: 'op:tuzla:tuzla_2', reason: 'objective_unreachable', turn: 42 },
            }),
        );
        expect(receipts).toEqual([
            {
                id: 'directive-rejection:vrs_1st_krajina:42',
                corpsId: 'vrs_1st_krajina',
                targetOsid: 'op:tuzla:tuzla_2',
                reason: 'objective_unreachable',
                turn: 42,
            },
        ]);
    });

    it('every rejection reason code has player-safe prose via plainReason (no bare code leaks)', () => {
        // The reason codes the engine emits (planDirectiveOperation / hasAvailableSlot).
        const reasonCodes = [
            'no_available_force',
            'objective_unreachable',
            'objective_already_owned',
            'objective_uncontrolled',
            'no_available_slot',
            'no_adjacency',
            'corps_not_found',
        ];
        for (const reason of reasonCodes) {
            const prose = plainReason(reason);
            expect(typeof prose).toBe('string');
            expect(prose.length).toBeGreaterThan(0);
            expect(prose).not.toBe(reason); // never render the raw code
        }
        // An unknown code still degrades to safe prose (never undefined / raw token).
        expect(plainReason('some_future_code')).toBe('the operation cannot be formed as ordered');
    });

    it('is deterministic — sorted by turn then corps id', () => {
        const receipts = buildDirectiveOutcomeReceipts(
            stateWith({
                vrs_2nd_krajina: { target_osid: 'a', reason: 'no_available_force', turn: 50 },
                vrs_1st_krajina: { target_osid: 'b', reason: 'no_adjacency', turn: 50 },
                vrs_drina: { target_osid: 'c', reason: 'no_available_slot', turn: 30 },
            }),
        );
        expect(receipts.map((r) => `${r.turn}:${r.corpsId}`)).toEqual([
            '30:vrs_drina',
            '50:vrs_1st_krajina',
            '50:vrs_2nd_krajina',
        ]);
    });

    it('collapses to [] defensively (no corps_command / no field / malformed shape)', () => {
        expect(buildDirectiveOutcomeReceipts(undefined)).toEqual([]);
        expect(buildDirectiveOutcomeReceipts({} as GameState)).toEqual([]);
        expect(buildDirectiveOutcomeReceipts(stateWith({ vrs_drina: undefined }))).toEqual([]);
        // Missing/wrong-typed required fields are dropped (guard is type-shape).
        expect(
            buildDirectiveOutcomeReceipts(stateWith({ vrs_drina: { target_osid: 'a', reason: 'x' } as any })),
        ).toEqual([]);
    });

    it('turn-scope filter shows only the current turn (stale rejections do not haunt the desk)', () => {
        const receipts = buildDirectiveOutcomeReceipts(
            stateWith({
                vrs_1st_krajina: { target_osid: 'a', reason: 'no_adjacency', turn: 40 },
                vrs_drina: { target_osid: 'b', reason: 'no_available_slot', turn: 42 },
            }),
        );
        expect(directiveOutcomeReceiptsRealizedOnTurn(receipts, 42).map((r) => r.corpsId)).toEqual(['vrs_drina']);
        expect(directiveOutcomeReceiptsRealizedOnTurn(receipts, 41)).toEqual([]);
    });
});
