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
import { attributeOperationCasualties } from '../src/sim/combat/operation_casualty_attribution.js';
import type { CorpsOperation } from '../src/state/game_state.js';
import type { AttackResolutionOsidReport } from '../src/sim/combat/attack_resolution_osid.js';

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
            objectives_captured: 4,
            casualties_suffered: 50,
            casualties_inflicted: 200,
            initial_strength: 5000,
            final_strength: 4800,
            duration_turns: 3,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(5);
        expect(grade.verdict).toBe('Brilliant Victory');
        expect(grade.factors.objective_completion).toBe(100);
        expect(grade.factors.preservation).toBeGreaterThan(90);
    });

    it('1-star total disaster', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 0,
            casualties_suffered: 500,
            casualties_inflicted: 100,
            initial_strength: 5000,
            final_strength: 3000,
            duration_turns: 20,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(1);
        expect(grade.verdict).toBe('Catastrophic Failure');
        expect(grade.factors.objective_completion).toBe(0);
    });

    it('2-star pyrrhic advance', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 2,
            casualties_suffered: 400,
            casualties_inflicted: 150,
            initial_strength: 5000,
            final_strength: 3200,
            duration_turns: 10,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(1);
        expect(grade.verdict).toBe('Disaster');
    });

    it('2-star pyrrhic with some objectives but heavy losses', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 3,
            casualties_suffered: 400,
            casualties_inflicted: 150,
            initial_strength: 5000,
            final_strength: 3200,
            duration_turns: 10,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(2);
        expect(grade.verdict).toBe('Costly Stalemate');
    });

    it('3-star baseline mediocre operation', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 2,
            casualties_suffered: 100,
            casualties_inflicted: 120,
            initial_strength: 5000,
            final_strength: 4200,
            duration_turns: 10,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(3);
        expect(grade.verdict).toBe('Partial Success');
    });

    it('clamping: worst-case stays at 1', () => {
        const grade = gradeOperation({
            objectives_targeted: 10,
            objectives_captured: 0,
            casualties_suffered: 1000,
            casualties_inflicted: 50,
            initial_strength: 5000,
            final_strength: 1000,
            duration_turns: 50,
            expected_duration: 4,
        });
        expect(grade.stars).toBe(1);
    });

    it('clamping: best-case stays at 5', () => {
        const grade = gradeOperation({
            objectives_targeted: 4,
            objectives_captured: 4,
            casualties_suffered: 10,
            casualties_inflicted: 500,
            initial_strength: 5000,
            final_strength: 4990,
            duration_turns: 1,
            expected_duration: 4,
        });
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
        expect(withCaptures.verdict).toBe('Partial Success');
        expect(withoutCaptures.verdict).toBe('Pyrrhic Advance');
        expect(withCaptures.verdict).not.toBe(withoutCaptures.verdict);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// attributeOperationCasualties
// ═══════════════════════════════════════════════════════════════════════════

function makeOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Op Test',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 1,
        phase_started_turn: 1,
        participating_brigades: ['bde_att'],
        ...overrides,
    };
}

function makeState(ops: Record<string, CorpsOperation>, formations: Record<string, any>) {
    const corps_command: Record<string, any> = {};
    for (const [corpsId, op] of Object.entries(ops)) {
        corps_command[corpsId] = {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operation: op,
        };
    }
    return { military: { formations, corps_command } } as any;
}

function makeReport(battles: AttackResolutionOsidReport['battles']): AttackResolutionOsidReport {
    return {
        orders_processed: battles.length,
        unique_attack_targets: 1,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        battles,
    };
}

describe('attributeOperationCasualties', () => {
    it('credits casualties when attacker is an op participant', () => {
        const op = makeOp({ participating_brigades: ['bde_att'] });
        const state = makeState(
            { corps_a: op },
            {
                bde_att: { personnel: 1000, corps_id: 'corps_a', composition: { tanks: 10, artillery: 5 } },
                bde_def: { personnel: 800, corps_id: 'corps_b' },
            },
        );
        const report = makeReport([
            {
                attacker_brigade: 'bde_att',
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:test:test_1',
                outcome: 'victory',
                power_ratio: 1.5,
                attacker_won: true,
                defender_brigade: 'bde_def',
                snap_events: [],
            },
        ]);

        attributeOperationCasualties(state, report);

        expect(op.pending_casualties).toBeDefined();
        const pc = op.pending_casualties!;
        expect(pc.attacks).toBe(1);
        // Attacker suffered losses (victory: attacker mod 0.6)
        // 1000 * 0.04 * 0.6 = 24 total -> killed=Math.round(24*0.30)=7, wounded=Math.round(24*0.55)=13
        expect(pc.suffered.killed).toBe(7);
        expect(pc.suffered.wounded).toBe(13);
        // Attacker inflicted on defender (victory: defender mod 1.2)
        // 800 * 0.028 * 1.2 = 26.88 -> 27 total -> killed=Math.round(27*0.30)=8, wounded=Math.round(27*0.55)=15
        expect(pc.inflicted.killed).toBe(8);
        expect(pc.inflicted.wounded).toBe(15);
        // Equipment lost: tanks 10*0.08*0.6=0.48->0, artillery 5*0.04*0.6=0.12->0
        expect(pc.equipment_lost.tanks).toBe(0);
        expect(pc.equipment_lost.artillery).toBe(0);
        // Equipment captured: not ARBiH so none
        expect(pc.equipment_captured.tanks).toBe(0);
    });

    it('does nothing with empty battles', () => {
        const op = makeOp();
        const state = makeState({ corps_a: op }, {
            bde_att: { personnel: 1000, corps_id: 'corps_a' },
        });
        const report = makeReport([]);

        attributeOperationCasualties(state, report);

        expect(op.pending_casualties).toBeUndefined();
    });

    it('equipment captured only applies to ARBiH attackers who won', () => {
        // ARBiH attacker wins -> captures equipment
        const opRBiH = makeOp({ participating_brigades: ['bde_arbih'] });
        const stateRBiH = makeState(
            { corps_r: opRBiH },
            {
                bde_arbih: { personnel: 1000, corps_id: 'corps_r', composition: { tanks: 5, artillery: 3 } },
                bde_vrs: { personnel: 800, corps_id: 'corps_v', composition: { tanks: 20, artillery: 10 } },
            },
        );
        const reportWin = makeReport([{
            attacker_brigade: 'bde_arbih',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            target_osid: 'op:test:test_1',
            outcome: 'decisive_victory',
            power_ratio: 2.5,
            attacker_won: true,
            defender_brigade: 'bde_vrs',
            snap_events: [],
        }]);

        attributeOperationCasualties(stateRBiH, reportWin);
        const pcWin = opRBiH.pending_casualties!;
        // Defender equipment losses at decisive: tanks 20*0.08*1.6*0.5=1.28->1, art 10*0.04*1.6*0.5=0.32->0
        expect(pcWin.equipment_captured.tanks).toBe(1);
        expect(pcWin.equipment_captured.artillery).toBe(0);

        // ARBiH attacker loses -> no capture
        const opRBiH2 = makeOp({ participating_brigades: ['bde_arbih2'] });
        const stateRBiH2 = makeState(
            { corps_r2: opRBiH2 },
            {
                bde_arbih2: { personnel: 1000, corps_id: 'corps_r2', composition: { tanks: 5, artillery: 3 } },
                bde_vrs2: { personnel: 800, corps_id: 'corps_v2', composition: { tanks: 20, artillery: 10 } },
            },
        );
        const reportLose = makeReport([{
            attacker_brigade: 'bde_arbih2',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            target_osid: 'op:test:test_1',
            outcome: 'repulsed',
            power_ratio: 0.8,
            attacker_won: false,
            defender_brigade: 'bde_vrs2',
            snap_events: [],
        }]);

        attributeOperationCasualties(stateRBiH2, reportLose);
        const pcLose = opRBiH2.pending_casualties!;
        expect(pcLose.equipment_captured.tanks).toBe(0);
        expect(pcLose.equipment_captured.artillery).toBe(0);

        // RS attacker wins -> no capture (not ARBiH)
        const opRS = makeOp({ participating_brigades: ['bde_rs'] });
        const stateRS = makeState(
            { corps_rs: opRS },
            {
                bde_rs: { personnel: 1000, corps_id: 'corps_rs', composition: { tanks: 15, artillery: 8 } },
                bde_def_rs: { personnel: 800, corps_id: 'corps_def', composition: { tanks: 5, artillery: 3 } },
            },
        );
        const reportRS = makeReport([{
            attacker_brigade: 'bde_rs',
            attacker_faction: 'RS',
            defender_faction: 'RBiH',
            target_osid: 'op:test:test_1',
            outcome: 'decisive_victory',
            power_ratio: 2.5,
            attacker_won: true,
            defender_brigade: 'bde_def_rs',
            snap_events: [],
        }]);

        attributeOperationCasualties(stateRS, reportRS);
        const pcRS = opRS.pending_casualties!;
        expect(pcRS.equipment_captured.tanks).toBe(0);
        expect(pcRS.equipment_captured.artillery).toBe(0);
    });

    it('per-axis attribution when op has axes', () => {
        const op = makeOp({
            participating_brigades: ['bde_north', 'bde_south'],
            axes: [
                {
                    axis_id: 'axis_north',
                    name: 'Northern Push',
                    assigned_brigades: ['bde_north'],
                    objectives: ['op:test:obj_1'],
                    current_objective_index: 0,
                    status: 'executing',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
                {
                    axis_id: 'axis_south',
                    name: 'Southern Push',
                    assigned_brigades: ['bde_south'],
                    objectives: ['op:test:obj_2'],
                    current_objective_index: 0,
                    status: 'executing',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
            ],
        });
        const state = makeState(
            { corps_a: op },
            {
                bde_north: { personnel: 1000, corps_id: 'corps_a', composition: { tanks: 10, artillery: 5 } },
                bde_south: { personnel: 800, corps_id: 'corps_a', composition: { tanks: 8, artillery: 4 } },
                bde_def1: { personnel: 600, corps_id: 'corps_b' },
                bde_def2: { personnel: 700, corps_id: 'corps_b' },
            },
        );
        const report = makeReport([
            {
                attacker_brigade: 'bde_north',
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:test:obj_1',
                outcome: 'victory',
                power_ratio: 1.5,
                attacker_won: true,
                defender_brigade: 'bde_def1',
                snap_events: [],
            },
            {
                attacker_brigade: 'bde_south',
                attacker_faction: 'RS',
                defender_faction: 'RBiH',
                target_osid: 'op:test:obj_2',
                outcome: 'stalemate',
                power_ratio: 1.0,
                attacker_won: false,
                defender_brigade: 'bde_def2',
                snap_events: [],
            },
        ]);

        attributeOperationCasualties(state, report);

        expect(op.pending_casualties).toBeDefined();
        const pc = op.pending_casualties!;
        expect(pc.attacks).toBe(2);
        expect(pc.by_axis).toBeDefined();
        expect(pc.by_axis!['axis_north']).toBeDefined();
        expect(pc.by_axis!['axis_south']).toBeDefined();
        expect(pc.by_axis!['axis_north'].attacks).toBe(1);
        expect(pc.by_axis!['axis_south'].attacks).toBe(1);
        // North axis: victory mod (att 0.6)
        // North: 1000*0.04*0.6=24 -> killed=7, wounded=13
        expect(pc.by_axis!['axis_north'].suffered.killed).toBe(7);
        // South: 800*0.04*1.0=32 -> killed=10, wounded=18
        expect(pc.by_axis!['axis_south'].suffered.killed).toBe(10);
        // Aggregate: both axes
        expect(pc.suffered.killed).toBe(7 + 10);
    });

    it('skips brigades not in a sector_attack operation', () => {
        const op = makeOp({
            type: 'general_offensive',
            participating_brigades: ['bde_att'],
        });
        const state = makeState(
            { corps_a: op },
            {
                bde_att: { personnel: 1000, corps_id: 'corps_a', composition: { tanks: 10, artillery: 5 } },
                bde_def: { personnel: 800, corps_id: 'corps_b' },
            },
        );
        const report = makeReport([{
            attacker_brigade: 'bde_att',
            attacker_faction: 'RS',
            defender_faction: 'RBiH',
            target_osid: 'op:test:test_1',
            outcome: 'victory',
            power_ratio: 1.5,
            attacker_won: true,
            defender_brigade: 'bde_def',
            snap_events: [],
        }]);

        attributeOperationCasualties(state, report);
        expect(op.pending_casualties).toBeUndefined();
    });
});
