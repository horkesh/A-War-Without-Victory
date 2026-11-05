import { describe, expect, it } from 'vitest';

import { estimateForceRatio, getOperationIntelConfidence } from '../src/sim/combat/operation_preparation.js';
import { getPreparationObjectiveView } from '../src/sim/combat/sector_offensive_axis_helpers.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { evaluateOpeningAttackReadiness } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';
import type { CorpsOperation, GameState, OperationAxis } from '../src/state/game_state.js';

const SOURCE = 'op:test:source';
const FUTURE = 'op:test:future';

function axis(overrides: Partial<OperationAxis>): OperationAxis {
    return {
        axis_id: 'source',
        name: 'Source Axis',
        assigned_brigades: ['attacker'],
        objectives: [SOURCE],
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...overrides,
    } as OperationAxis;
}

function operation(): CorpsOperation {
    return {
        name: 'Operation Preparation View',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 180,
        phase_started_turn: 180,
        participating_brigades: ['attacker'],
        sector_id: 'own',
        objectives: [SOURCE, FUTURE],
        axes: [
            axis({}),
            axis({
                axis_id: 'future',
                name: 'Future Handoff Axis',
                assigned_brigades: [],
                objectives: [FUTURE],
                late_phase: {
                    phase: 'holding',
                    main_axis_id: 'source',
                    requires: [SOURCE],
                    gated_objectives: [FUTURE],
                    receipts: [],
                    handoff: { brigade_id: 'attacker', source_axis_id: 'source' },
                },
            }),
        ],
        attack_attempt_count: 0,
        objective_capture_count: 0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    } as CorpsOperation;
}

function state(): GameState {
    return {
        meta: { turn: 182, phase: 'war' },
        political: {
            political_controllers: {
                [SOURCE]: 'RS',
                [FUTURE]: 'RS',
            },
        },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {
                own: {
                    sector_id: 'own', corps_id: 'hvo_tomislavgrad', faction: 'HRHB',
                    opposing_factions: ['RS'], edge_ids: [], sub_segments: [],
                },
                enemy_source: {
                    sector_id: 'enemy_source', corps_id: 'vrs_1kk', faction: 'RS',
                    opposing_factions: ['HRHB'], edge_ids: [],
                    sub_segments: [{ friendly_osids: [SOURCE], enemy_osids: [] }],
                },
                enemy_future: {
                    sector_id: 'enemy_future', corps_id: 'vrs_1kk', faction: 'RS',
                    opposing_factions: ['HRHB'], edge_ids: [],
                    sub_segments: [{ friendly_osids: [FUTURE], enemy_osids: [] }],
                },
            },
            sector_intel: {
                own: [
                    { enemy_sector_id: 'enemy_source', confidence: 0.25 },
                    { enemy_sector_id: 'enemy_future', confidence: 0.9 },
                ],
            },
        },
    } as unknown as GameState;
}

function ratioFixture(includeFutureAxis: boolean): { state: GameState; op: CorpsOperation; supply: SupplyStateByOsidReport } {
    const op = operation();
    const intermediate = 'op:test:intermediate';
    const futureStaging = 'op:test:future_staging';
    if (!includeFutureAxis) {
        op.objectives = [SOURCE];
        op.axes = [op.axes![0]!];
    } else {
        op.axes![1]!.staging_osid = futureStaging;
    }
    const fixture = state();
    fixture.military.formations = {
        attacker: {
            id: 'attacker', name: 'Attacker', kind: 'brigade', faction: 'HRHB',
            corps_id: 'hvo_tomislavgrad', status: 'active', assignment: null,
            personnel: 1600, cohesion: 75, morale: 75, fatigue: 0,
            equipment_class: 'light_infantry', posture: 'attack', location_osid: intermediate,
        },
        defender_source: {
            id: 'defender_source', name: 'Source Defender', kind: 'brigade', faction: 'RS',
            corps_id: 'vrs_1kk', status: 'active', assignment: null,
            personnel: 900, cohesion: 65, morale: 65, fatigue: 0,
            equipment_class: 'light_infantry', posture: 'defend', location_osid: SOURCE,
        },
        defender_future: {
            id: 'defender_future', name: 'Future Defender', kind: 'brigade', faction: 'RS',
            corps_id: 'vrs_1kk', status: 'active', assignment: null,
            personnel: 2200, cohesion: 80, morale: 80, fatigue: 0,
            equipment_class: 'light_infantry', posture: 'defend', location_osid: FUTURE,
        },
    } as unknown as GameState['military']['formations'];
    fixture.military.corps_command = {
        hvo_tomislavgrad: {
            command_span: 7, subordinate_count: 1, og_slots: 0, active_ogs: [],
            corps_exhaustion: 0, stance: 'offensive', active_operations: [],
        },
        vrs_1kk: {
            command_span: 7, subordinate_count: 2, og_slots: 0, active_ogs: [],
            corps_exhaustion: 0, stance: 'defensive', active_operations: [],
        },
    };
    fixture.military.corps_front_sectors!.enemy_source!.assigned_brigade_ids = ['defender_source'];
    fixture.military.corps_front_sectors!.enemy_source!.reserve_brigade_ids = [];
    fixture.military.corps_front_sectors!.enemy_future!.assigned_brigade_ids = ['defender_future'];
    fixture.military.corps_front_sectors!.enemy_future!.reserve_brigade_ids = [];
    fixture.military.brigade_movement_state = {
        attacker: {
            status: 'in_transit', stance: 'column', destination_sids: [futureStaging], turns_remaining: 1,
        },
    } as GameState['military']['brigade_movement_state'];
    const supply = {
        factions: [{
            faction_id: 'HRHB',
            by_osid: [
                { osid: intermediate, state: 'critical' },
                { osid: futureStaging, state: 'adequate' },
            ],
        }],
    } as unknown as SupplyStateByOsidReport;
    return { state: fixture, op, supply };
}

describe('current preparation objective view', () => {
    it('keeps a future empty handoff branch out of the real confidence consumer', () => {
        expect(getOperationIntelConfidence(state(), operation())).toBe(0.25);
    });

    it('preserves flat fallback order, duplicates, and its input', () => {
        const flat = operation();
        delete flat.axes;
        const input = [SOURCE, FUTURE, SOURCE];
        const before = structuredClone(input);

        expect(getPreparationObjectiveView(flat, input)).toEqual(input);
        expect(input).toEqual(before);
    });

    it.each([
        ['ordinary', axis({ axis_id: 'ordinary' })],
        ['capture', axis({
            axis_id: 'capture',
            late_phase: {
                phase: 'capture', main_axis_id: 'source', requires: [SOURCE],
                gated_objectives: [SOURCE], receipts: [],
                handoff: { brigade_id: 'attacker', source_axis_id: 'source' },
            },
        })],
        ['staffed holding', axis({
            axis_id: 'staffed',
            assigned_brigades: ['attacker'],
            late_phase: {
                phase: 'holding', main_axis_id: 'source', requires: [SOURCE],
                gated_objectives: [SOURCE], receipts: [],
                handoff: { brigade_id: 'attacker', source_axis_id: 'source' },
            },
        })],
    ])('does not change %s axes', (_label, candidate) => {
        const op = operation();
        op.axes = [candidate];
        const input = [SOURCE, FUTURE, SOURCE];
        expect(getPreparationObjectiveView(op, input)).toEqual(input);
    });

    it('removes only exclusively owned empty-handoff targets and retains shared duplicates', () => {
        const op = operation();
        op.axes![0]!.objectives = [SOURCE, 'op:test:shared'];
        op.axes![1]!.objectives = [FUTURE, 'op:test:shared'];
        const input = [FUTURE, SOURCE, 'op:test:shared', FUTURE, SOURCE];
        const serializedBefore = JSON.stringify(op);

        expect(getPreparationObjectiveView(op, input)).toEqual([
            SOURCE, 'op:test:shared', SOURCE,
        ]);
        expect(JSON.stringify(op)).toBe(serializedBefore);
        expect(op.objectives).toEqual([SOURCE, FUTURE]);
        expect(op.axes![1]!.objectives).toEqual([FUTURE, 'op:test:shared']);
    });

    it('includes the target immediately after the lawful handoff changes the axis to capture', () => {
        const op = operation();
        const future = op.axes![1]!;
        future.assigned_brigades = ['attacker'];
        future.late_phase!.phase = 'capture';

        expect(getPreparationObjectiveView(op, op.objectives!)).toEqual([SOURCE, FUTURE]);
    });

    it('keeps defender, terrain representative, and in-transit relevance equal to the staffed source task', () => {
        const baseline = ratioFixture(false);
        const futureBranch = ratioFixture(true);
        const terrain = { [SOURCE]: 1, [FUTURE]: 1.8 };

        const baselineRatio = estimateForceRatio(
            baseline.state, baseline.op, 5, 0.9, baseline.supply, terrain,
        );
        const branchRatio = estimateForceRatio(
            futureBranch.state, futureBranch.op, 5, 0.9, futureBranch.supply, terrain,
        );

        expect(branchRatio).toBeGreaterThan(0);
        expect(branchRatio).toBeCloseTo(baselineRatio, 10);
    });

    it('anchors the real sector-offensive caller on the staffed source objective', () => {
        const op = operation();
        op.phase = 'recovery';
        op.sector_id = undefined;
        op.participating_brigades = [];
        for (const candidate of op.axes!) candidate.assigned_brigades = [];
        op.axes![0]!.assigned_brigades = ['source_brigade'];
        op.participating_brigades = ['source_brigade'];
        const fixture = state();
        fixture.military.formations = {
            hvo_tomislavgrad: { id: 'hvo_tomislavgrad', faction: 'HRHB', status: 'active' },
            source_brigade: {
                id: 'source_brigade', faction: 'HRHB', status: 'active',
                location_osid: 'op:test:source_approach', corps_id: 'hvo_tomislavgrad',
            },
        } as unknown as GameState['military']['formations'];
        fixture.military.corps_front_sectors = {
            own_future: {
                sector_id: 'own_future', corps_id: 'hvo_tomislavgrad', faction: 'HRHB',
                opposing_factions: ['RS'], edge_ids: [],
                sub_segments: [{ friendly_osids: ['op:test:future_approach'], enemy_osids: [FUTURE] }],
            },
            own_source: {
                sector_id: 'own_source', corps_id: 'hvo_tomislavgrad', faction: 'HRHB',
                opposing_factions: ['RS'], edge_ids: [],
                sub_segments: [{ friendly_osids: ['op:test:source_approach'], enemy_osids: [SOURCE] }],
            },
        } as unknown as GameState['military']['corps_front_sectors'];
        fixture.military.corps_command = {
            hvo_tomislavgrad: {
                command_span: 7, subordinate_count: 1, og_slots: 0, active_ogs: [],
                corps_exhaustion: 0, stance: 'offensive', active_operations: [op],
            },
        };
        fixture.operation_history = [];

        advanceSectorOffensives(fixture);

        expect(op.sector_id).toBe('own_source');
    });

    it('does not treat an enemy target on an empty held axis as opening readiness', () => {
        const op = operation();
        const fixture = state();
        fixture.political!.political_controllers![SOURCE] = 'HRHB';
        fixture.political!.political_controllers![FUTURE] = 'RS';
        fixture.political!.political_controllers!['op:test:source_approach'] = 'HRHB';
        fixture.military.formations = {
            attacker: {
                id: 'attacker', name: 'Attacker', kind: 'brigade', faction: 'HRHB',
                corps_id: 'hvo_tomislavgrad', status: 'active', assignment: null,
                personnel: 1600, cohesion: 75, morale: 75, fatigue: 0,
                location_osid: 'op:test:source_approach',
            },
        } as unknown as GameState['military']['formations'];
        fixture.military.war_front_edges_osid = [{
            edge_id: 'source-edge', a: 'op:test:source_approach', b: SOURCE,
            side_a: 'HRHB', side_b: 'RS',
        }] as GameState['military']['war_front_edges_osid'];
        const adjacency = new Map<string, string[]>([
            [SOURCE, ['op:test:source_approach']],
            ['op:test:source_approach', [SOURCE]],
        ]);

        expect(evaluateOpeningAttackReadiness(
            fixture, 'hvo_tomislavgrad', 'HRHB', op, adjacency,
        ).executable).toBe(false);
    });
});
