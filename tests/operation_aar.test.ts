import { describe, it, expect } from 'vitest';
import {
    emptyPendingCasualties,
    type CasualtyTally,
    type EquipmentTally,
    type OperationWeeklyEntry,
    type AxisWeeklyEntry,
    type AxisAAR,
    type OperationGrade,
    type OperationAAR,
    type PendingOperationCasualties,
} from '../src/sim/combat/operation_aar.js';

describe('operation_aar types', () => {
    it('emptyPendingCasualties returns zeroed accumulator', () => {
        const pc = emptyPendingCasualties();
        expect(pc.suffered.killed).toBe(0);
        expect(pc.suffered.wounded).toBe(0);
        expect(pc.inflicted.killed).toBe(0);
        expect(pc.inflicted.wounded).toBe(0);
        expect(pc.equipment_lost.tanks).toBe(0);
        expect(pc.equipment_lost.artillery).toBe(0);
        expect(pc.equipment_destroyed.tanks).toBe(0);
        expect(pc.equipment_destroyed.artillery).toBe(0);
        expect(pc.equipment_captured.tanks).toBe(0);
        expect(pc.equipment_captured.artillery).toBe(0);
        expect(pc.attacks).toBe(0);
        expect(pc.by_axis).toBeUndefined();
    });

    it('emptyPendingCasualties returns independent instances', () => {
        const a = emptyPendingCasualties();
        const b = emptyPendingCasualties();
        a.suffered.killed = 5;
        a.attacks = 3;
        expect(b.suffered.killed).toBe(0);
        expect(b.attacks).toBe(0);
    });

    it('CasualtyTally type compiles correctly', () => {
        const tally: CasualtyTally = { killed: 10, wounded: 25 };
        expect(tally.killed + tally.wounded).toBe(35);
    });

    it('EquipmentTally type compiles correctly', () => {
        const eq: EquipmentTally = { tanks: 3, artillery: 7 };
        expect(eq.tanks + eq.artillery).toBe(10);
    });

    it('OperationWeeklyEntry type compiles correctly', () => {
        const entry: OperationWeeklyEntry = {
            turn: 5,
            phase: 'execution',
            attacks_this_turn: 2,
            objectives_captured_this_turn: ['op:bihac:bihac_1'],
            objectives_lost_this_turn: [],
            casualties_suffered: { killed: 10, wounded: 20 },
            casualties_inflicted: { killed: 15, wounded: 30 },
            equipment_lost: { tanks: 1, artillery: 0 },
            equipment_destroyed: { tanks: 2, artillery: 1 },
            equipment_captured: { tanks: 0, artillery: 0 },
            brigade_count: 6,
            momentum: 2,
            notable_events: ['Breakthrough at sector 3'],
        };
        expect(entry.turn).toBe(5);
        expect(entry.phase).toBe('execution');
    });

    it('OperationGrade type compiles correctly', () => {
        const grade: OperationGrade = {
            stars: 4,
            verdict: 'Successful operation with acceptable losses',
            factors: {
                objective_completion: 0.8,
                exchange_ratio: 1.5,
                tempo: 0.9,
                preservation: 0.7,
            },
        };
        expect(grade.stars).toBe(4);
    });

    it('OperationAAR type compiles correctly', () => {
        const aar: OperationAAR = {
            operation_id: 'op_test_1',
            operation_name: 'Op Corridor',
            corps_id: 'corps_1kr',
            faction: 'RS',
            type: 'sector_attack',
            started_turn: 4,
            ended_turn: 8,
            outcome: 'success',
            objectives_targeted: ['op:brcko:brcko_1'],
            objectives_captured: ['op:brcko:brcko_1'],
            duration_turns: 4,
            total_attacks: 6,
            casualties_suffered: { killed: 50, wounded: 120 },
            casualties_inflicted: { killed: 80, wounded: 180 },
            equipment_lost: { tanks: 2, artillery: 1 },
            equipment_destroyed: { tanks: 5, artillery: 3 },
            equipment_captured: { tanks: 1, artillery: 0 },
            participating_brigades: ['bde_1', 'bde_2', 'bde_3'],
            initial_strength: 4500,
            final_strength: 4100,
            grade: {
                stars: 4,
                verdict: 'Objectives secured',
                factors: {
                    objective_completion: 1.0,
                    exchange_ratio: 1.6,
                    tempo: 0.8,
                    preservation: 0.91,
                },
            },
            weekly_log: [],
        };
        expect(aar.outcome).toBe('success');
        expect(aar.duration_turns).toBe(4);
    });

    it('AxisAAR type compiles correctly', () => {
        const axis: AxisAAR = {
            axis_id: 'axis_north',
            axis_name: 'Northern Approach',
            brigades: ['bde_1', 'bde_2'],
            objectives_targeted: ['op:brcko:brcko_1'],
            objectives_captured: ['op:brcko:brcko_1'],
            total_attacks: 3,
            casualties_suffered: { killed: 20, wounded: 50 },
            casualties_inflicted: { killed: 30, wounded: 70 },
            equipment_lost: { tanks: 1, artillery: 0 },
            equipment_destroyed: { tanks: 2, artillery: 1 },
            equipment_captured: { tanks: 0, artillery: 0 },
        };
        expect(axis.axis_id).toBe('axis_north');
    });
});
