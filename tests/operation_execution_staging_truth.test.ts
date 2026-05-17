import { describe, expect, it } from 'vitest';
import { evaluateSectorAttack } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

function makeLaunchGateState(overrides: {
    personnel?: number;
    objective?: string;
    frontEdges?: GameState['military']['war_front_edges_osid'];
} = {}): GameState {
    const objective = overrides.objective ?? 'op:target:objective';
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, phase: 'war', seed: 'operation-launch-gate' } as any,
        factions: [
            { id: 'RBiH', areasOfResponsibility: [] },
            { id: 'RS', areasOfResponsibility: [] },
        ] as any,
        military: {
            formations: {
                rbih_corps: makeCorps({ id: 'rbih_corps', faction: 'RBiH', hq_sid: 'S1' }),
                b1: makeFormation({
                    id: 'b1',
                    faction: 'RBiH',
                    corps_id: 'rbih_corps',
                    hq_sid: 'S1',
                    location_osid: 'op:front:approach_a',
                    personnel: overrides.personnel ?? 900,
                    cohesion: 65,
                    posture: 'defend',
                }),
                enemy_main: makeFormation({
                    id: 'enemy_main',
                    faction: 'RS',
                    corps_id: 'rs_corps',
                    hq_sid: 'S2',
                    location_osid: objective,
                    personnel: 3000,
                    cohesion: 70,
                }),
            },
            corps_front_sectors: {
                'sector:rbih_corps:0': {
                    sector_id: 'sector:rbih_corps:0',
                    corps_id: 'rbih_corps',
                    assigned_brigade_ids: ['b1'],
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: ['op:front:approach_a'],
                    sub_segments: [{
                        sub_segment_id: 'ss:0',
                        friendly_osids: ['op:front:approach_a'],
                        enemy_osids: [objective],
                    }],
                },
            },
            corps_command: {
                rbih_corps: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Operation Launch Gate',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 0,
                        phase_started_turn: 0,
                        planning_duration: 1,
                        participating_brigades: ['b1'],
                        objectives: [objective],
                        current_objective_index: 0,
                        sector_id: 'sector:rbih_corps:0',
                        axes: [{
                            axis_id: 'main',
                            name: 'Main Axis',
                            assigned_brigades: ['b1'],
                            objectives: [objective],
                            current_objective_index: 0,
                            status: 'executing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 0,
                            attack_attempt_count: 0,
                            objective_capture_count: 0,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                        }],
                    } as CorpsOperation],
                },
            },
            war_front_edges_osid: overrides.frontEdges ?? [{
                edge_id: 'front:approach-objective',
                a: 'op:front:approach_a',
                b: objective,
                side_a: 'RBiH',
                side_b: 'RS',
            }] as any,
        } as any,
        political: {
            political_controllers: {
                'op:front:approach_a': 'RBiH',
                [objective]: 'RS',
            },
        } as any,
    } as GameState;
}

describe('operation execution staging truth', () => {
    it('aborts launch with participants_below_attack_floor when every participant is understrength', () => {
        const state = makeLaunchGateState({ personnel: 300 });

        advanceSectorOffensives(state);

        const op = state.military.corps_command!.rbih_corps.active_operations[0]!;
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('participants_below_attack_floor');
        expect(op.axes?.[0]?.launch_blocker).toBe('participants_below_attack_floor');
    });

    it('aborts launch with no_approach_osid when the current objective has no friendly approach', () => {
        const state = makeLaunchGateState({ frontEdges: [] });
        state.military.corps_front_sectors!['sector:rbih_corps:0']!.sub_segments = [];

        advanceSectorOffensives(state);

        const op = state.military.corps_command!.rbih_corps.active_operations[0]!;
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('no_approach_osid');
        expect(op.axes?.[0]?.launch_blocker).toBe('no_approach_osid');
        expect(op.axes?.[0]?.unreachable_at_launch).toBe(true);
    });

    it('does not remarch a brigade that is already tactically adjacent to the current objective', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 35, phase: 'war', seed: 'adjacent-staging-truth' } as any,
            factions: [
                { id: 'RS', areasOfResponsibility: [] },
                { id: 'RBiH', areasOfResponsibility: [] },
            ] as any,
            military: {
                formations: {
                    rs_corps: makeCorps({ id: 'rs_corps', faction: 'RS', hq_sid: 'S1' }),
                    b1: makeFormation({
                        id: 'b1',
                        faction: 'RS',
                        corps_id: 'rs_corps',
                        hq_sid: 'S1',
                        location_osid: 'op:front:approach_a',
                        posture: 'defend',
                        personnel: 900,
                        cohesion: 65,
                    }),
                    enemy_main: makeFormation({
                        id: 'enemy_main',
                        faction: 'RBiH',
                        corps_id: 'rbih_corps',
                        hq_sid: 'S2',
                        location_osid: 'op:target:objective',
                        personnel: 6000,
                        cohesion: 85,
                    }),
                },
                corps_front_sectors: {},
                corps_command: {},
                war_front_edges_osid: [],
            } as any,
            political: {
                political_controllers: {
                    'op:front:approach_a': 'RS',
                    'op:front:approach_b': 'RS',
                    'op:rear:hub': 'RS',
                    'op:target:objective': 'RBiH',
                },
            } as any,
        } as GameState;

        const activeOp: CorpsOperation = {
            name: 'Sarajevo Rim Push',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 30,
            phase_started_turn: 34,
            participating_brigades: ['b1'],
            objectives: ['op:target:objective'],
            current_objective_index: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            sector_id: 'sector:rs_corps:0',
        };

        const ctx: BrigadeEvaluationContext = {
            state,
            faction: 'RS',
            brigade: state.military.formations!.b1!,
            loc: 'op:front:approach_a',
            corpsId: 'rs_corps',
            cmd: null,
            directive: null,
            corpsStance: 'offensive',
            activeOp,
            isActiveSectorOperationParticipant: true,
            adjEnemy: ['op:target:objective'],
            isAlliedWithRBiH: false,
            targetAdjacentCount: new Map(),
            corpsReserve: new Map(),
            chosenTargets: new Map(),
            columnAssignments: new Map(),
            counterAttackTarget: null,
            brigadeSupplyState: 'adequate',
            isHoldBrigade: false,
            sectorRecentRetreats: new Map(),
            sectorCounterAttackCount: new Map(),
            adjacency: new Map([
                ['op:front:approach_a', ['op:rear:hub']],
                ['op:rear:hub', ['op:front:approach_a', 'op:front:approach_b']],
                ['op:front:approach_b', ['op:rear:hub', 'op:target:objective']],
                ['op:target:objective', ['op:front:approach_b']],
            ]),
            reverseMap: new Map(),
            terrainCache: {},
            graphAnalysis: {} as any,
            result: {
                posture_orders: [],
                attack_orders: {},
                attack_scores: {},
                movement_orders: {},
                column_march_orders: {},
                eligible_attackers_by_corps: {},
            },
        };
        state.military.war_front_edges_osid = [
            {
                edge_id: 'front:approach-a-objective',
                a: 'op:front:approach_a',
                b: 'op:target:objective',
                side_a: 'RS',
                side_b: 'RBiH',
            },
        ] as any;

        const handled = evaluateSectorAttack(ctx);

        expect(handled).toBe(true);
        expect(ctx.result.attack_orders.b1).toBeUndefined();
        expect(ctx.result.column_march_orders.b1).toBeUndefined();
        expect(ctx.result.posture_orders).toContainEqual({ brigade_id: 'b1', posture: 'defend' });
    });
});
