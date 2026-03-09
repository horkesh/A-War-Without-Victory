import { describe, it, expect } from 'vitest';
import {
    emptyPendingCasualties,
    gradeOperation,
    type CasualtyTally,
    type EquipmentTally,
    type OperationWeeklyEntry,
    type AxisWeeklyEntry,
    type AxisAAR,
    type OperationGrade,
    type OperationAAR,
    type PendingOperationCasualties,
    type GradeInput,
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

describe('gradeOperation', () => {
    it('5-star perfect operation', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 4,       // 100% capture → +1
            casualties_suffered: 50,
            casualties_inflicted: 200,     // 4.0 exchange → +1
            initial_strength: 5000,
            final_strength: 4800,          // 4% lost → no penalty
            duration_turns: 3,
            expected_duration: 4,          // within 1.5× → +1
        });
        // 3 + 1(capture) + 1(exchange) + 1(swift) = 6 → clamped to 5
        expect(grade.stars).toBe(5);
        expect(grade.verdict).toBe('Brilliant Victory');
        expect(grade.factors.objective_completion).toBe(100);
        expect(grade.factors.preservation).toBeGreaterThan(90);
    });

    it('1-star total disaster', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 0,        // 0 captured → -1
            casualties_suffered: 500,
            casualties_inflicted: 100,     // 0.2 exchange → -1
            initial_strength: 5000,
            final_strength: 3000,          // 40% lost → -1
            duration_turns: 20,
            expected_duration: 4,          // over 1.5× → no bonus
        });
        // 3 - 1(no capture) - 1(bad exchange) - 1(force lost) = 0 → clamped to 1
        expect(grade.stars).toBe(1);
        expect(grade.verdict).toBe('Catastrophic Failure');
        expect(grade.factors.objective_completion).toBe(0);
    });

    it('2-star pyrrhic advance', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 2,        // 50% → no +1
            casualties_suffered: 400,
            casualties_inflicted: 150,     // 0.375 exchange → -1
            initial_strength: 5000,
            final_strength: 3200,          // 36% lost → -1
            duration_turns: 10,
            expected_duration: 4,          // over 1.5× → no bonus
        });
        // 3 - 1(bad exchange) - 1(force lost) = 1, but captured > 0
        // Actually: no capture bonus, no swift bonus = 3 - 1 - 1 = 1
        // With 2 captured, verdict uses first variant
        expect(grade.stars).toBe(1);
        expect(grade.verdict).toBe('Disaster');
    });

    it('2-star pyrrhic with some objectives but heavy losses', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 3,        // 75% → +1
            casualties_suffered: 400,
            casualties_inflicted: 150,     // 0.375 → -1
            initial_strength: 5000,
            final_strength: 3200,          // 36% lost → -1
            duration_turns: 10,
            expected_duration: 4,          // over 1.5× → no bonus
        });
        // 3 + 1(capture) - 1(exchange) - 1(force) = 2
        expect(grade.stars).toBe(2);
        expect(grade.verdict).toBe('Costly Stalemate');
    });

    it('3-star baseline mediocre operation', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 2,        // 50% → no bonus
            casualties_suffered: 100,
            casualties_inflicted: 120,     // 1.2 → no bonus, no penalty
            initial_strength: 5000,
            final_strength: 4200,          // 16% lost → no penalty
            duration_turns: 10,
            expected_duration: 4,          // over 1.5× → no bonus
        });
        // 3 + 0 = 3
        expect(grade.stars).toBe(3);
        expect(grade.verdict).toBe('Partial Success');
    });

    it('clamping: worst-case stays at 1', () => {
        const grade = gradeOperation({
            objectives_targeted: 10,
            objectives_captured: 0,        // -1
            casualties_suffered: 1000,
            casualties_inflicted: 50,      // 0.05 → -1
            initial_strength: 5000,
            final_strength: 1000,          // 80% lost → -1
            duration_turns: 50,
            expected_duration: 4,          // no bonus
        });
        // 3 - 1 - 1 - 1 = 0 → clamped to 1
        expect(grade.stars).toBe(1);
    });

    it('clamping: best-case stays at 5', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 4,        // +1
            casualties_suffered: 10,
            casualties_inflicted: 500,     // 50.0 → +1
            initial_strength: 5000,
            final_strength: 4990,          // 0.2% lost → no penalty
            duration_turns: 1,
            expected_duration: 4,          // +1
        });
        // 3 + 1 + 1 + 1 = 6 → clamped to 5
        expect(grade.stars).toBe(5);
    });

    it('verdict label changes based on whether objectives were captured', () => {
        const withCaptures = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 2,
            casualties_suffered: 100,
            casualties_inflicted: 120,
            initial_strength: 5000,
            final_strength: 4200,
            duration_turns: 10,
            expected_duration: 4,
        });
        const withoutCaptures = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 0,
            casualties_suffered: 100,
            casualties_inflicted: 120,
            initial_strength: 5000,
            final_strength: 4200,
            duration_turns: 10,
            expected_duration: 4,
        });
        // withCaptures: 3 stars (no bonuses/penalties except none)
        expect(withCaptures.verdict).toBe('Partial Success');
        // withoutCaptures: 3 - 1(no capture) = 2 stars
        expect(withoutCaptures.verdict).toBe('Pyrrhic Advance');
        // Verify they use different verdict variants
        expect(withCaptures.verdict).not.toBe(withoutCaptures.verdict);
    });
});
