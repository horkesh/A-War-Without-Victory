/**
 * OP-CAS-LEAD (ruling §47, folded into CAS-ATTACKER-SHARES §42): operation casualty
 * attribution credits each brigade's own applied loss to that brigade's own operation.
 * Before, the whole stack's loss (and an equipment estimate built from it) went to the
 * LEAD attacker's operation, and every other operation in the stack got nothing.
 * Same for a multi-brigade defence. Totals are preserved exactly (largest remainder,
 * strictCompare order).
 */
import { describe, expect, it } from 'vitest';
import {
    apportionLargestRemainder,
    attributeOperationCasualties,
    sharesPreservingTotal,
} from '../src/sim/combat/operation_casualty_attribution.js';
import type { CorpsOperation } from '../src/state/game_state.js';
import type { AttackResolutionOsidReport } from '../src/sim/combat/attack_resolution_osid.js';

type Battle = AttackResolutionOsidReport['battles'][number];

function op(name: string, brigades: string[]): CorpsOperation {
    return {
        name, type: 'sector_attack', phase: 'execution', started_turn: 1, phase_started_turn: 1,
        participating_brigades: brigades,
    } as CorpsOperation;
}

function stateWith(ops: Record<string, CorpsOperation>, formations: Record<string, unknown>) {
    const corps_command: Record<string, unknown> = {};
    for (const [corpsId, o] of Object.entries(ops)) {
        corps_command[corpsId] = {
            command_span: 5, subordinate_count: 3, og_slots: 2, active_ogs: [],
            corps_exhaustion: 0, stance: 'offensive', active_operations: [o],
        };
    }
    return { military: { formations, corps_command } } as never;
}

function report(battle: Partial<Battle>): AttackResolutionOsidReport {
    return {
        orders_processed: 1, unique_attack_targets: 1, flips_applied: 0, casualty_attacker: 0,
        casualty_defender: 0, orders_by_faction: {}, engaged_formation_ids: [], snap_events: [],
        snap_event_counts: {},
        battles: [{
            battle_id: 'x', attacker_faction: 'RS', defender_faction: 'RBiH', target_osid: 'op:t:t_1',
            outcome: 'victory', power_ratio: 1.5, attacker_won: true, snap_events: [],
            defender_brigade: null, attacker_casualties: 0, defender_casualties: 0,
            ...battle,
        } as Battle],
    } as AttackResolutionOsidReport;
}

describe('apportionLargestRemainder', () => {
    it('preserves the total exactly, remainders to the largest fractions, ties to the earlier entry', () => {
        expect(apportionLargestRemainder(10, [1, 1, 1])).toEqual([4, 3, 3]);
        expect(apportionLargestRemainder(44, [120, 80])).toEqual([26, 18]);
        expect(apportionLargestRemainder(7, [0, 0], 1)).toEqual([0, 7]);
        const out = apportionLargestRemainder(296, [300, 100, 3]);
        expect(out.reduce((a, b) => a + b, 0)).toBe(296);
    });
});

describe('sharesPreservingTotal', () => {
    it('falls back to the lead alone when there are no contributions', () => {
        expect(sharesPreservingTotal(400, undefined, 'b_lead')).toEqual([{ brigade_id: 'b_lead', casualties: 400 }]);
    });
    it('gives a positive remainder to the lead and takes a negative one from the lead first, never below 0', () => {
        expect(sharesPreservingTotal(400, [
            { brigade_id: 'b_z', casualties_taken: 100 },
            { brigade_id: 'b_a', casualties_taken: 299 },
        ], 'b_z')).toEqual([{ brigade_id: 'b_a', casualties: 299 }, { brigade_id: 'b_z', casualties: 101 }]);
        expect(sharesPreservingTotal(398, [
            { brigade_id: 'b_a', casualties_taken: 300 },
            { brigade_id: 'b_z', casualties_taken: 1 },
            { brigade_id: 'b_m', casualties_taken: 100 },
        ], 'b_z')).toEqual([
            { brigade_id: 'b_a', casualties: 298 },
            { brigade_id: 'b_m', casualties: 100 },
            { brigade_id: 'b_z', casualties: 0 },
        ]);
    });
});

describe('attributeOperationCasualties: OP-CAS-LEAD', () => {
    it('a stack from two operations: each operation gets its own brigade\'s loss and its share of what the stack inflicted', () => {
        const opA = op('Op A', ['bde_a']);
        const opB = op('Op B', ['bde_b']);
        const st = stateWith({ corps_a: opA, corps_b: opB }, {
            bde_a: { personnel: 3000, corps_id: 'corps_a', composition: { tanks: 10, artillery: 10 } },
            bde_b: { personnel: 1000, corps_id: 'corps_b', composition: { tanks: 0, artillery: 0 } },
            bde_def: { personnel: 800, corps_id: 'corps_x' },
        });
        attributeOperationCasualties(st, report({
            attacker_brigade: 'bde_a', attacker_brigades: ['bde_a', 'bde_b'],
            attacker_contributions: [
                { brigade_id: 'bde_a', casualties_taken: 300 },
                { brigade_id: 'bde_b', casualties_taken: 100 },
            ],
            attacker_casualties: 400, defender_brigade: 'bde_def', defender_casualties: 200,
        }));
        // 400 → KIA round(88) / WIA round(296), split 3:1; inflicted 200 → 44 / 148, split 3:1.
        expect(opA.pending_casualties!.suffered).toEqual({ killed: 66, wounded: 222 });
        expect(opB.pending_casualties!.suffered).toEqual({ killed: 22, wounded: 74 });
        expect(opA.pending_casualties!.inflicted).toEqual({ killed: 33, wounded: 111 });
        expect(opB.pending_casualties!.inflicted).toEqual({ killed: 11, wounded: 37 });
        expect(opA.pending_casualties!.attacks).toBe(1);
        expect(opB.pending_casualties!.attacks).toBe(1);
        // Equipment lost is each brigade's own estimate: bde_b has no heavy weapons.
        expect(opB.pending_casualties!.equipment_lost).toEqual({ tanks: 0, artillery: 0 });
        // bde_a: lossFraction 300/3000 → tanks round(10*0.08*0.1*10)=1, art round(10*0.04*0.1*10)=0.
        expect(opA.pending_casualties!.equipment_lost).toEqual({ tanks: 1, artillery: 0 });
    });

    it('a brigade with no operation keeps its share out of every operation', () => {
        const opA = op('Op A', ['bde_a']);
        const st = stateWith({ corps_a: opA }, {
            bde_a: { personnel: 3000, corps_id: 'corps_a' },
            bde_free: { personnel: 3000, corps_id: 'corps_a' },
        });
        attributeOperationCasualties(st, report({
            attacker_brigade: 'bde_free', attacker_brigades: ['bde_a', 'bde_free'],
            attacker_contributions: [
                { brigade_id: 'bde_a', casualties_taken: 100 },
                { brigade_id: 'bde_free', casualties_taken: 100 },
            ],
            attacker_casualties: 200, defender_casualties: 0,
        }));
        expect(opA.pending_casualties!.suffered).toEqual({ killed: 22, wounded: 74 });
    });

    it('a defence from two operations: each defending operation gets its own brigade\'s loss', () => {
        const opD1 = op('Op D1', ['bde_d1']);
        const opD2 = op('Op D2', ['bde_d2']);
        const st = stateWith({ corps_d1: opD1, corps_d2: opD2 }, {
            bde_att: { personnel: 3000, corps_id: 'corps_x' },
            bde_d1: { personnel: 2000, corps_id: 'corps_d1' },
            bde_d2: { personnel: 2000, corps_id: 'corps_d2' },
        });
        attributeOperationCasualties(st, report({
            attacker_brigade: 'bde_att', attacker_casualties: 100,
            defender_brigade: 'bde_d1', defender_casualties: 200,
            defender_contributions: [
                { brigade_id: 'bde_d1', casualties_taken: 150 },
                { brigade_id: 'bde_d2', casualties_taken: 50 },
            ] as never,
        }));
        expect(opD1.pending_casualties!.suffered).toEqual({ killed: 33, wounded: 111 });
        expect(opD2.pending_casualties!.suffered).toEqual({ killed: 11, wounded: 37 });
        // Inflicted (the attacker's 100 → 22 / 74) is split 3:1 between the defenders.
        expect(opD1.pending_casualties!.inflicted.killed + opD2.pending_casualties!.inflicted.killed).toBe(22);
        expect(opD1.pending_casualties!.inflicted.wounded + opD2.pending_casualties!.inflicted.wounded).toBe(74);
    });
});
