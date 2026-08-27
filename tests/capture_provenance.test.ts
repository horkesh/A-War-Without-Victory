import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { classifyCombatCapture } = require('../tools/lib/capture_provenance.cjs') as {
    classifyCombatCapture: (
        event: Record<string, unknown>,
        battle?: Record<string, unknown>,
    ) => { kind: string; gates: boolean; operation_ids?: string[] };
};

const event = {
    turn: 59,
    settlement_id: 'op:lopare:lopare_selo_2',
    mechanism: 'combat',
    to: 'RBiH',
    attacker_brigade: 'arbih_116th_mountain',
    battle_id: '59:op:lopare:lopare_selo_2:arbih_116th_mountain:defender',
};
const battle = {
    battle_id: event.battle_id,
    target_osid: event.settlement_id,
    attacker_brigade: event.attacker_brigade,
    attacker_won: true,
};

describe('capture provenance classifier', () => {
    it('accepts an exact operation-owned battle receipt', () => {
        expect(classifyCombatCapture(event, {
            ...battle,
            operation_id: 'arbih_2nd_corps:Operacija Lavina:t57',
        })).toEqual({
            kind: 'operation_owned',
            gates: false,
            operation_ids: ['arbih_2nd_corps:Operacija Lavina:t57'],
        });
    });

    it('fails closed when an operationless receipt cannot prove the counterattack exception', () => {
        expect(classifyCombatCapture(event, battle)).toEqual({
            kind: 'operationless_or_unattributed',
            gates: true,
        });
    });

    it('rejects missing, contradictory, and non-combat provenance', () => {
        expect(classifyCombatCapture(event)).toMatchObject({ kind: 'missing_battle_receipt', gates: true });
        expect(classifyCombatCapture(event, { ...battle, attacker_won: false }))
            .toMatchObject({ kind: 'contradictory_battle_receipt', gates: true });
        expect(classifyCombatCapture({ ...event, mechanism: 'consolidation' }, battle))
            .toMatchObject({ kind: 'non_combat', gates: true });
    });
});
