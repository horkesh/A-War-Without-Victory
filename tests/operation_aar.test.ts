import { describe, it, expect } from 'vitest';
import {
    emptyPendingCasualties,
    gradeOperation,
    recordOperationWeeklyEntries,
    finalizeOperationAAR,
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
            active_operations: [op],
        };
    }
    return { military: { formations, corps_command } } as any;
}

type PartialBattle = Omit<AttackResolutionOsidReport['battles'][number], 'battle_id'> & { battle_id?: string };
function makeReport(battles: PartialBattle[]): AttackResolutionOsidReport {
    // Auto-fill battle_id if missing in test data
    const filled = battles.map(b => ({
        ...b,
        battle_id: b.battle_id ?? `0:${b.target_osid}:${b.attacker_brigade}:${b.defender_brigade ?? 'null'}`,
    }));
    return {
        orders_processed: filled.length,
        unique_attack_targets: 1,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        battles: filled,
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
                attacker_casualties: 24,
                defender_casualties: 27,
            },
        ]);

        attributeOperationCasualties(state, report);

        expect(op.pending_casualties).toBeDefined();
        const pc = op.pending_casualties!;
        expect(pc.attacks).toBe(1);
        // Attacker suffered losses: 24 total -> killed=Math.round(24*0.30)=7, wounded=Math.round(24*0.55)=13
        expect(pc.suffered.killed).toBe(7);
        expect(pc.suffered.wounded).toBe(13);
        // Attacker inflicted on defender: 27 total -> killed=Math.round(27*0.30)=8, wounded=Math.round(27*0.55)=15
        expect(pc.inflicted.killed).toBe(8);
        expect(pc.inflicted.wounded).toBe(15);
        // Equipment lost: lossFraction=24/1000=0.024, tanks=round(10*0.08*0.024*1.0*10)=0, art=round(5*0.04*0.024*1.0*10)=0
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
            attacker_casualties: 16,
            defender_casualties: 100,
        }]);

        attributeOperationCasualties(stateRBiH, reportWin);
        const pcWin = opRBiH.pending_casualties!;
        // Defender equipment captured: lossFraction=100/800=0.125, tanks=round(20*0.08*0.125*0.5*10)=1
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
            attacker_casualties: 52,
            defender_casualties: 13,
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
            attacker_casualties: 16,
            defender_casualties: 36,
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
                attacker_casualties: 24,
                defender_casualties: 20,
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
                attacker_casualties: 32,
                defender_casualties: 16,
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
            attacker_casualties: 24,
            defender_casualties: 27,
        }]);

        attributeOperationCasualties(state, report);
        expect(op.pending_casualties).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// recordOperationWeeklyEntries
// ═══════════════════════════════════════════════════════════════════════════

function makeWeeklyState(
    ops: Record<string, CorpsOperation>,
    formations: Record<string, any>,
    politicalControllers: Record<string, string> = {},
    turn = 5,
) {
    const corps_command: Record<string, any> = {};
    for (const [corpsId, op] of Object.entries(ops)) {
        corps_command[corpsId] = {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [op],
        };
    }
    return {
        meta: { turn, phase: 'war' },
        military: { formations, corps_command },
        political: { political_controllers: politicalControllers },
    } as any;
}

describe('recordOperationWeeklyEntries', () => {
    it('creates weekly entry draining pending casualties', () => {
        const op = makeOp({
            participating_brigades: ['bde_1', 'bde_2'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
            pending_casualties: {
                suffered: { killed: 10, wounded: 20 },
                inflicted: { killed: 15, wounded: 30 },
                equipment_lost: { tanks: 1, artillery: 0 },
                equipment_destroyed: { tanks: 2, artillery: 1 },
                equipment_captured: { tanks: 0, artillery: 0 },
                attacks: 3,
            },
        });
        const state = makeWeeklyState(
            { corps_a: op },
            {
                bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' },
                bde_2: { personnel: 800, faction: 'RS', status: 'active', corps_id: 'corps_a' },
            },
            { 'op:test:obj_1': 'RBiH' },
        );

        recordOperationWeeklyEntries(state, null);

        expect(op.weekly_log).toBeDefined();
        expect(op.weekly_log!.length).toBe(1);
        const entry = op.weekly_log![0];
        expect(entry.turn).toBe(5);
        expect(entry.phase).toBe('execution');
        expect(entry.attacks_this_turn).toBe(3);
        expect(entry.casualties_suffered.killed).toBe(10);
        expect(entry.casualties_suffered.wounded).toBe(20);
        expect(entry.casualties_inflicted.killed).toBe(15);
        expect(entry.casualties_inflicted.wounded).toBe(30);
        expect(entry.equipment_lost.tanks).toBe(1);
        expect(entry.equipment_destroyed.tanks).toBe(2);
        expect(entry.brigade_count).toBe(2);
        // pending_casualties should be cleared
        expect(op.pending_casualties).toBeUndefined();
    });

    it('records initial_strength on first entry', () => {
        const op = makeOp({
            participating_brigades: ['bde_1', 'bde_2'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
        });
        const state = makeWeeklyState(
            { corps_a: op },
            {
                bde_1: { personnel: 1500, faction: 'RS', status: 'active', corps_id: 'corps_a' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active', corps_id: 'corps_a' },
            },
        );

        recordOperationWeeklyEntries(state, null);

        expect(op.initial_strength).toBe(2700);
        expect(op.weekly_log!.length).toBe(1);

        // Second call should not change initial_strength
        recordOperationWeeklyEntries(state, null);
        expect(op.initial_strength).toBe(2700);
        expect(op.weekly_log!.length).toBe(2);
    });

    it('detects breakthrough when objective captured', () => {
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
            _prev_objective_state: { 'op:test:obj_1': 'RBiH' },
            pending_casualties: {
                ...emptyPendingCasualties(),
                attacks: 1,
            },
        });
        // Now objective is controlled by RS (the op's faction)
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
            { 'op:test:obj_1': 'RS' },
        );

        recordOperationWeeklyEntries(state, null);

        const entry = op.weekly_log![0];
        expect(entry.objectives_captured_this_turn).toContain('op:test:obj_1');
        expect(entry.notable_events).toContain('breakthrough');
    });

    it('detects first_blood on first attack', () => {
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
            pending_casualties: {
                ...emptyPendingCasualties(),
                attacks: 1,
            },
        });
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
        );

        recordOperationWeeklyEntries(state, null);

        const entry = op.weekly_log![0];
        expect(entry.notable_events).toContain('first_blood');

        // Second turn with attacks should NOT trigger first_blood again
        op.pending_casualties = { ...emptyPendingCasualties(), attacks: 2 };
        recordOperationWeeklyEntries(state, null);
        const entry2 = op.weekly_log![1];
        expect(entry2.notable_events).not.toContain('first_blood');
    });

    it('handles op with no pending casualties (zeroed entry)', () => {
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
        });
        // No pending_casualties set at all
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
        );

        recordOperationWeeklyEntries(state, null);

        expect(op.weekly_log!.length).toBe(1);
        const entry = op.weekly_log![0];
        expect(entry.attacks_this_turn).toBe(0);
        expect(entry.casualties_suffered.killed).toBe(0);
        expect(entry.casualties_suffered.wounded).toBe(0);
        expect(entry.casualties_inflicted.killed).toBe(0);
        expect(entry.equipment_lost.tanks).toBe(0);
    });

    it('updates _prev_objective_state for next diff', () => {
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1', 'op:test:obj_2'],
            phase: 'execution',
        });
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
            { 'op:test:obj_1': 'RS', 'op:test:obj_2': 'RBiH' },
        );

        recordOperationWeeklyEntries(state, null);

        expect(op._prev_objective_state).toBeDefined();
        expect(op._prev_objective_state!['op:test:obj_1']).toBe('RS');
        expect(op._prev_objective_state!['op:test:obj_2']).toBe('RBiH');
    });

    it('detects stalled after 3+ consecutive zero-attack turns', () => {
        const zeroEntry: OperationWeeklyEntry = {
            turn: 3, phase: 'execution', attacks_this_turn: 0,
            objectives_captured_this_turn: [], objectives_lost_this_turn: [],
            casualties_suffered: { killed: 0, wounded: 0 },
            casualties_inflicted: { killed: 0, wounded: 0 },
            equipment_lost: { tanks: 0, artillery: 0 },
            equipment_destroyed: { tanks: 0, artillery: 0 },
            equipment_captured: { tanks: 0, artillery: 0 },
            brigade_count: 1, momentum: 0, notable_events: [],
        };
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
            weekly_log: [
                { ...zeroEntry, turn: 3 },
                { ...zeroEntry, turn: 4 },
            ],
        });
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
        );

        recordOperationWeeklyEntries(state, null);

        const entry = op.weekly_log![2];
        expect(entry.notable_events).toContain('stalled');
    });

    it('detects heavy_losses when casualties exceed 10% of initial_strength', () => {
        const op = makeOp({
            participating_brigades: ['bde_1'],
            objectives: ['op:test:obj_1'],
            phase: 'execution',
            initial_strength: 1000,
            pending_casualties: {
                suffered: { killed: 60, wounded: 60 },
                inflicted: { killed: 5, wounded: 10 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                attacks: 2,
            },
        });
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 880, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
        );

        recordOperationWeeklyEntries(state, null);

        const entry = op.weekly_log![0];
        expect(entry.notable_events).toContain('heavy_losses');
    });

    it('skips non-sector_attack operations', () => {
        const op = makeOp({
            type: 'general_offensive',
            participating_brigades: ['bde_1'],
        });
        const state = makeWeeklyState(
            { corps_a: op },
            { bde_1: { personnel: 1000, faction: 'RS', status: 'active', corps_id: 'corps_a' } },
        );

        recordOperationWeeklyEntries(state, null);

        expect(op.weekly_log).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// finalizeOperationAAR
// ═══════════════════════════════════════════════════════════════════════════

function makeFinalizeState(
    ops: Record<string, CorpsOperation>,
    formations: Record<string, any>,
    politicalControllers: Record<string, string> = {},
    turn = 10,
    namedOfficerData?: any[],
) {
    const corps_command: Record<string, any> = {};
    for (const [corpsId, op] of Object.entries(ops)) {
        corps_command[corpsId] = {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [op],
        };
    }
    const state: any = {
        meta: { turn, phase: 'war' },
        military: { formations, corps_command },
        political: { political_controllers: politicalControllers },
    };
    if (namedOfficerData) {
        state.military.named_officer_data = namedOfficerData;
    }
    return state;
}

function makeFinalizableOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Op Corridor',
        type: 'sector_attack',
        phase: 'recovery',
        started_turn: 5,
        phase_started_turn: 9,
        participating_brigades: ['bde_1', 'bde_2'],
        objectives: ['op:brcko:brcko_1', 'op:brcko:brcko_2'],
        recovery_reason: 'completed',
        weekly_log: [
            {
                turn: 6,
                phase: 'execution',
                attacks_this_turn: 3,
                objectives_captured_this_turn: ['op:brcko:brcko_1'],
                objectives_lost_this_turn: [],
                casualties_suffered: { killed: 10, wounded: 20 },
                casualties_inflicted: { killed: 15, wounded: 30 },
                equipment_lost: { tanks: 1, artillery: 0 },
                equipment_destroyed: { tanks: 2, artillery: 1 },
                equipment_captured: { tanks: 0, artillery: 0 },
                brigade_count: 2,
                momentum: 1,
                notable_events: ['first_blood'],
            },
            {
                turn: 7,
                phase: 'execution',
                attacks_this_turn: 2,
                objectives_captured_this_turn: ['op:brcko:brcko_2'],
                objectives_lost_this_turn: [],
                casualties_suffered: { killed: 5, wounded: 10 },
                casualties_inflicted: { killed: 8, wounded: 15 },
                equipment_lost: { tanks: 0, artillery: 1 },
                equipment_destroyed: { tanks: 1, artillery: 0 },
                equipment_captured: { tanks: 1, artillery: 0 },
                brigade_count: 2,
                momentum: 2,
                notable_events: ['breakthrough'],
            },
        ],
        initial_strength: 3000,
        ...overrides,
    };
}

describe('finalizeOperationAAR', () => {
    it('creates complete AAR with all fields populated', () => {
        const op = makeFinalizableOp();
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active', corps_id: 'corps_1kr' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active', corps_id: 'corps_1kr' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history).toBeDefined();
        expect(state.operation_history.length).toBe(1);
        const aar: OperationAAR = state.operation_history[0];
        expect(aar.operation_id).toBe('corps_1kr:Op Corridor:t5');
        expect(aar.operation_name).toBe('Op Corridor');
        expect(aar.corps_id).toBe('corps_1kr');
        expect(aar.faction).toBe('RS');
        expect(aar.type).toBe('sector_attack');
        expect(aar.started_turn).toBe(5);
        expect(aar.ended_turn).toBe(10);
        expect(aar.participating_brigades).toEqual(['bde_1', 'bde_2']);
        expect(aar.initial_strength).toBe(3000);
        expect(aar.final_strength).toBe(2500);
        expect(aar.weekly_log.length).toBe(2);
        expect(aar.grade).toBeDefined();
        expect(aar.grade.stars).toBeGreaterThanOrEqual(1);
        expect(aar.grade.stars).toBeLessThanOrEqual(5);
    });

    it('derives outcome=success from completed + all objectives held', () => {
        const op = makeFinalizableOp({ recovery_reason: 'completed' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history[0].outcome).toBe('success');
    });

    it('derives outcome=failure from max_failures + 0 objectives held', () => {
        const op = makeFinalizableOp({ recovery_reason: 'max_failures' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RBiH', 'op:brcko:brcko_2': 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history[0].outcome).toBe('failure');
    });

    it('derives outcome=partial from completed + some objectives held', () => {
        const op = makeFinalizableOp({ recovery_reason: 'completed' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history[0].outcome).toBe('partial');
    });

    it('derives outcome=orphaned from orphaned_sector', () => {
        const op = makeFinalizableOp({ recovery_reason: 'orphaned_sector' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history[0].outcome).toBe('orphaned');
    });

    it('denormalizes commander name/rank from named_officer_data', () => {
        const op = makeFinalizableOp({ commander_officer_id: 'vrs_talic' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
            10,
            [
                { id: 'vrs_talic', name: 'Momir Talić', rank: 'corps_commander', faction: 'RS' },
                { id: 'vrs_mladic', name: 'Ratko Mladić', rank: 'army_commander', faction: 'RS' },
            ],
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar = state.operation_history[0];
        expect(aar.commander_officer_id).toBe('vrs_talic');
        expect(aar.commander_name).toBe('Momir Talić');
        expect(aar.commander_rank).toBe('corps_commander');
    });

    it('aggregates weekly_log totals correctly', () => {
        const op = makeFinalizableOp();
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        // 3 + 2 = 5 total attacks
        expect(aar.total_attacks).toBe(5);
        // killed: 10+5=15, wounded: 20+10=30
        expect(aar.casualties_suffered.killed).toBe(15);
        expect(aar.casualties_suffered.wounded).toBe(30);
        // killed: 15+8=23, wounded: 30+15=45
        expect(aar.casualties_inflicted.killed).toBe(23);
        expect(aar.casualties_inflicted.wounded).toBe(45);
        // eq lost: tanks 1+0=1, artillery 0+1=1
        expect(aar.equipment_lost.tanks).toBe(1);
        expect(aar.equipment_lost.artillery).toBe(1);
        // eq destroyed: tanks 2+1=3, artillery 1+0=1
        expect(aar.equipment_destroyed.tanks).toBe(3);
        expect(aar.equipment_destroyed.artillery).toBe(1);
        // eq captured: tanks 0+1=1, artillery 0+0=0
        expect(aar.equipment_captured.tanks).toBe(1);
        expect(aar.equipment_captured.artillery).toBe(0);
    });

    it('uses the canonical operation attack counter when weekly log attacks are missing', () => {
        const op = makeFinalizableOp({
            objectives: ['op:brcko:brcko_1'],
            attack_attempt_count: 7,
            weekly_log: [
                {
                    turn: 6,
                    phase: 'execution',
                    attacks_this_turn: 0,
                    objectives_captured_this_turn: [],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: 0, wounded: 0 },
                    casualties_inflicted: { killed: 0, wounded: 0 },
                    equipment_lost: { tanks: 0, artillery: 0 },
                    equipment_destroyed: { tanks: 0, artillery: 0 },
                    equipment_captured: { tanks: 0, artillery: 0 },
                    brigade_count: 2,
                    momentum: 0,
                    notable_events: [],
                },
            ],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.total_attacks).toBe(7);
        expect(aar.objectives_held_without_logged_capture).toEqual(['op:brcko:brcko_1']);
        expect(aar.capture_provenance).toBe('held_without_logged_capture');
    });

    it('uses canonical axis attack counters when weekly axis rows are missing', () => {
        const op = makeFinalizableOp({
            objectives: undefined,
            axes: [
                {
                    axis_id: 'axis_north',
                    name: 'Northern Push',
                    assigned_brigades: ['bde_1'] as any[],
                    objectives: ['op:brcko:brcko_1'],
                    current_objective_index: 0,
                    status: 'stalled',
                    failure_count: 3,
                    consecutive_failures_on_current: 3,
                    momentum: 0,
                    attack_attempt_count: 3,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
                {
                    axis_id: 'axis_south',
                    name: 'Southern Push',
                    assigned_brigades: ['bde_2'] as any[],
                    objectives: ['op:brcko:brcko_2'],
                    current_objective_index: 0,
                    status: 'stalled',
                    failure_count: 4,
                    consecutive_failures_on_current: 4,
                    momentum: 0,
                    attack_attempt_count: 4,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
            ],
            recovery_reason: 'max_failures',
            weekly_log: [
                {
                    turn: 6,
                    phase: 'execution',
                    attacks_this_turn: 0,
                    objectives_captured_this_turn: [],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: 0, wounded: 0 },
                    casualties_inflicted: { killed: 0, wounded: 0 },
                    equipment_lost: { tanks: 0, artillery: 0 },
                    equipment_destroyed: { tanks: 0, artillery: 0 },
                    equipment_captured: { tanks: 0, artillery: 0 },
                    brigade_count: 2,
                    momentum: 0,
                    notable_events: [],
                },
            ],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RBiH', 'op:brcko:brcko_2': 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.total_attacks).toBe(7);
        expect(aar.axis_summaries?.map(a => [a.axis_id, a.total_attacks])).toEqual([
            ['axis_north', 3],
            ['axis_south', 4],
        ]);
    });

    it('records logged capture provenance separately from final held objectives', () => {
        const op = makeFinalizableOp({
            objectives: ['op:brcko:brcko_1', 'op:brcko:brcko_2'],
            weekly_log: [
                {
                    turn: 6,
                    phase: 'execution',
                    attacks_this_turn: 2,
                    objectives_captured_this_turn: ['op:brcko:brcko_1'],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: 0, wounded: 0 },
                    casualties_inflicted: { killed: 0, wounded: 0 },
                    equipment_lost: { tanks: 0, artillery: 0 },
                    equipment_destroyed: { tanks: 0, artillery: 0 },
                    equipment_captured: { tanks: 0, artillery: 0 },
                    brigade_count: 2,
                    momentum: 1,
                    notable_events: [],
                },
            ],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.objectives_captured).toEqual(['op:brcko:brcko_1', 'op:brcko:brcko_2']);
        expect(aar.objectives_logged_captured).toEqual(['op:brcko:brcko_1']);
        expect(aar.objectives_held_without_logged_capture).toEqual(['op:brcko:brcko_2']);
        expect(aar.capture_provenance).toBe('mixed');
    });

    it('marks held objectives with zero logged attacks as held_without_logged_attack provenance', () => {
        const op = makeFinalizableOp({
            objectives: ['op:visegrad:center'],
            weekly_log: [
                {
                    turn: 6,
                    phase: 'planning',
                    attacks_this_turn: 0,
                    objectives_captured_this_turn: [],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: 0, wounded: 0 },
                    casualties_inflicted: { killed: 0, wounded: 0 },
                    equipment_lost: { tanks: 0, artillery: 0 },
                    equipment_destroyed: { tanks: 0, artillery: 0 },
                    equipment_captured: { tanks: 0, artillery: 0 },
                    brigade_count: 2,
                    momentum: 0,
                    notable_events: [],
                },
            ],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:visegrad:center': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.total_attacks).toBe(0);
        expect(aar.objectives_logged_captured).toEqual([]);
        expect(aar.objectives_held_without_logged_capture).toEqual(['op:visegrad:center']);
        expect(aar.capture_provenance).toBe('held_without_logged_attack');
    });

    it('builds axis_summaries for multi-axis ops', () => {
        const op = makeFinalizableOp({
            objectives: undefined,
            axes: [
                {
                    axis_id: 'axis_north',
                    name: 'Northern Push',
                    assigned_brigades: ['bde_1'] as any[],
                    objectives: ['op:brcko:brcko_1'],
                    current_objective_index: 0,
                    status: 'complete',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 2,
                    attack_attempt_count: 3,
                    objective_capture_count: 1,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
                {
                    axis_id: 'axis_south',
                    name: 'Southern Push',
                    assigned_brigades: ['bde_2'] as any[],
                    objectives: ['op:brcko:brcko_2'],
                    current_objective_index: 0,
                    status: 'complete',
                    failure_count: 1,
                    consecutive_failures_on_current: 0,
                    momentum: 1,
                    attack_attempt_count: 2,
                    objective_capture_count: 1,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                },
            ],
            weekly_log: [
                {
                    turn: 6,
                    phase: 'execution',
                    attacks_this_turn: 2,
                    objectives_captured_this_turn: [],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: 8, wounded: 16 },
                    casualties_inflicted: { killed: 12, wounded: 24 },
                    equipment_lost: { tanks: 1, artillery: 0 },
                    equipment_destroyed: { tanks: 1, artillery: 1 },
                    equipment_captured: { tanks: 0, artillery: 0 },
                    brigade_count: 2,
                    momentum: 0,
                    notable_events: [],
                    axis_entries: {
                        axis_north: {
                            attacks_this_turn: 1,
                            objectives_captured_this_turn: [],
                            objectives_lost_this_turn: [],
                            casualties_suffered: { killed: 5, wounded: 10 },
                            casualties_inflicted: { killed: 8, wounded: 16 },
                            equipment_lost: { tanks: 1, artillery: 0 },
                            equipment_destroyed: { tanks: 1, artillery: 0 },
                            equipment_captured: { tanks: 0, artillery: 0 },
                        },
                        axis_south: {
                            attacks_this_turn: 1,
                            objectives_captured_this_turn: [],
                            objectives_lost_this_turn: [],
                            casualties_suffered: { killed: 3, wounded: 6 },
                            casualties_inflicted: { killed: 4, wounded: 8 },
                            equipment_lost: { tanks: 0, artillery: 0 },
                            equipment_destroyed: { tanks: 0, artillery: 1 },
                            equipment_captured: { tanks: 0, artillery: 0 },
                        },
                    },
                },
            ],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.axis_summaries).toBeDefined();
        expect(aar.axis_summaries!.length).toBe(2);

        const north = aar.axis_summaries!.find(a => a.axis_id === 'axis_north')!;
        expect(north.axis_name).toBe('Northern Push');
        expect(north.brigades).toEqual(['bde_1']);
        expect(north.objectives_targeted).toEqual(['op:brcko:brcko_1']);
        expect(north.objectives_captured).toEqual(['op:brcko:brcko_1']);
        expect(north.total_attacks).toBe(3);
        expect(north.casualties_suffered.killed).toBe(5);

        const south = aar.axis_summaries!.find(a => a.axis_id === 'axis_south')!;
        expect(south.axis_name).toBe('Southern Push');
        expect(south.total_attacks).toBe(2);
        expect(south.casualties_suffered.killed).toBe(3);
    });

    it('grades the operation (stars 1-5)', () => {
        const op = makeFinalizableOp();
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.grade.stars).toBeGreaterThanOrEqual(1);
        expect(aar.grade.stars).toBeLessThanOrEqual(5);
        expect(aar.grade.verdict).toBeTruthy();
        expect(aar.grade.factors.objective_completion).toBeGreaterThanOrEqual(0);
        expect(aar.grade.factors.exchange_ratio).toBeGreaterThanOrEqual(0);
        expect(aar.grade.factors.tempo).toBeGreaterThanOrEqual(0);
        expect(aar.grade.factors.preservation).toBeGreaterThanOrEqual(0);
    });

    it('appends to existing operation_history', () => {
        const op = makeFinalizableOp();
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );
        state.operation_history = [{ operation_id: 'existing' } as any];

        finalizeOperationAAR(state, 'corps_1kr', op);

        expect(state.operation_history.length).toBe(2);
        expect(state.operation_history[0].operation_id).toBe('existing');
        expect(state.operation_history[1].operation_id).toBe('corps_1kr:Op Corridor:t5');
    });

    // ─── Phase B: diagnostic carryover ─────────────────────────────────────
    // Late-War Operation Combat Delivery mega-lane. Failures like Sana 95
    // (recovery_reason='max_failures') must be intelligible from the AAR alone
    // without spelunking the lifecycle.

    it('persists recovery_reason on AAR (max_failures shape)', () => {
        const op = makeFinalizableOp({ recovery_reason: 'max_failures' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RBiH', 'op:brcko:brcko_2': 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.recovery_reason).toBe('max_failures');
    });

    it('persists recovery_reason on AAR (completed shape)', () => {
        const op = makeFinalizableOp({ recovery_reason: 'completed' });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.recovery_reason).toBe('completed');
    });

    it('persists per-axis staging_osid on AxisAAR', () => {
        const op = makeFinalizableOp({
            objectives: undefined,
            recovery_reason: 'completed',
            axes: [
                {
                    axis_id: 'axis_north',
                    name: 'Northern Push',
                    assigned_brigades: ['bde_1'] as any[],
                    objectives: ['op:brcko:brcko_1'],
                    current_objective_index: 0,
                    status: 'complete',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 2,
                    attack_attempt_count: 3,
                    objective_capture_count: 1,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                    staging_osid: 'op:brcko:brcko_north_staging',
                },
                {
                    axis_id: 'axis_south',
                    name: 'Southern Push',
                    assigned_brigades: ['bde_2'] as any[],
                    objectives: ['op:brcko:brcko_2'],
                    current_objective_index: 0,
                    status: 'complete',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 1,
                    attack_attempt_count: 2,
                    objective_capture_count: 1,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                    staging_osid: 'op:brcko:brcko_south_staging',
                },
            ],
            weekly_log: [],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        expect(aar.axis_summaries).toBeDefined();
        const north = aar.axis_summaries!.find(a => a.axis_id === 'axis_north')!;
        const south = aar.axis_summaries!.find(a => a.axis_id === 'axis_south')!;
        expect(north.staging_osid).toBe('op:brcko:brcko_north_staging');
        expect(south.staging_osid).toBe('op:brcko:brcko_south_staging');
    });

    it('omits staging_osid on AxisAAR when axis lacks one', () => {
        const op = makeFinalizableOp({
            objectives: undefined,
            recovery_reason: 'completed',
            axes: [
                {
                    axis_id: 'axis_only',
                    name: 'Only Push',
                    assigned_brigades: ['bde_1'] as any[],
                    objectives: ['op:brcko:brcko_1'],
                    current_objective_index: 0,
                    status: 'complete',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 1,
                    attack_attempt_count: 1,
                    objective_capture_count: 1,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                    // no staging_osid
                },
            ],
            weekly_log: [],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            {
                bde_1: { personnel: 1300, faction: 'RS', status: 'active' },
                bde_2: { personnel: 1200, faction: 'RS', status: 'active' },
            },
            { 'op:brcko:brcko_1': 'RS', 'op:brcko:brcko_2': 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar: OperationAAR = state.operation_history[0];
        const only = aar.axis_summaries!.find(a => a.axis_id === 'axis_only')!;
        expect(only.staging_osid).toBeUndefined();
    });
});
