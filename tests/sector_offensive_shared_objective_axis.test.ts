import { describe, expect, it } from 'vitest';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import type { GameState, FormationState, OperationAxis } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeBrigade(id: string, locationOsid: string, posture: 'hold' | 'attack' = 'hold'): FormationState {
    return {
        id,
        faction: 'RS',
        corps_id: 'rs_corps',
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 70,
        hq_sid: 'S1',
        location_osid: locationOsid,
        posture,
        tags: [],
    };
}

function makeAxis(
    axisId: string,
    brigades: string[],
    objectives: string[],
    overrides: Partial<OperationAxis> = {}
): OperationAxis {
    return {
        axis_id: axisId,
        name: axisId,
        assigned_brigades: brigades,
        objectives,
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
    };
}

function makeSharedAxisState(overrides: {
    sharedObjController?: 'RS' | 'RBiH';
    waitingAxisOverrides?: Partial<OperationAxis>;
    advancingAxisOverrides?: Partial<OperationAxis>;
}): GameState {
    const sharedObj = 'op:target:shared_obj';
    const nextObj = 'op:target:next_obj';

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, phase: 'war', seed: 'shared-axis-test' } as any,
        military: {
            formations: {
                rs_corps: {
                    id: 'rs_corps',
                    faction: 'RS',
                    name: 'Corps',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'corps',
                    personnel: 50,
                    cohesion: 80,
                    hq_sid: 'S1',
                    tags: [],
                },
                w1: makeBrigade('w1', 'op:rear:staging', 'hold'),
                w2: makeBrigade('w2', 'op:rear:staging', 'hold'),
                a1: makeBrigade('a1', 'op:front:approach', 'attack'),
                a2: makeBrigade('a2', 'op:front:approach', 'attack'),
            },
            corps_front_sectors: {
                rs_sector: {
                    sector_id: 'rs_sector',
                    corps_id: 'rs_corps',
                    faction: 'RS',
                    opposing_factions: [],
                    edge_ids: ['e1'],
                    sub_segments: [{
                        sub_segment_id: 'subseg:rs_sector:0',
                        edge_ids: ['e1'],
                        friendly_osids: ['op:front:approach'],
                        enemy_osids: [sharedObj],
                        primary_brigade_ids: [],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:front:approach'],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'defend',
                    stance_source: 'bot' as const,
                },
            },
            corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 2,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Shared Axis Test',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 15,
                        phase_started_turn: 15,
                        participating_brigades: ['w1', 'w2', 'a1', 'a2'],
                        objectives: [sharedObj, nextObj],
                        current_objective_index: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        axes: [
                            makeAxis('axis:waiting', ['w1', 'w2'], [sharedObj, nextObj], overrides.waitingAxisOverrides),
                            makeAxis('axis:advancing', ['a1', 'a2'], [sharedObj, nextObj], overrides.advancingAxisOverrides),
                        ],
                    }],
                },
            },
            war_front_edges_osid: [],
        } as any,
        political: {
            political_controllers: {
                'op:rear:staging': 'RS',
                'op:front:approach': 'RS',
                [sharedObj]: overrides.sharedObjController ?? 'RBiH',
                [nextObj]: 'RBiH',
            },
        } as any,
    } as unknown as GameState;
}

function makeMarchingAxisState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, phase: 'war', seed: 'marching-axis-test' } as any,
        military: {
            formations: {
                rs_corps: {
                    id: 'rs_corps',
                    faction: 'RS',
                    name: 'Corps',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'corps',
                    personnel: 50,
                    cohesion: 80,
                    hq_sid: 'S1',
                    tags: [],
                },
                m1: makeBrigade('m1', 'op:rear:staging', 'hold'),
            },
            corps_front_sectors: {
                rs_sector: {
                    sector_id: 'rs_sector',
                    corps_id: 'rs_corps',
                    faction: 'RS',
                    opposing_factions: [],
                    edge_ids: ['e1'],
                    sub_segments: [{
                        sub_segment_id: 'subseg:rs_sector:0',
                        edge_ids: ['e1'],
                        friendly_osids: ['op:front:approach'],
                        enemy_osids: ['op:target:objective'],
                        primary_brigade_ids: [],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:front:approach'],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'defend',
                    stance_source: 'bot' as const,
                },
            },
            corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Marching Axis Test',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 15,
                        phase_started_turn: 15,
                        participating_brigades: ['m1'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        axes: [
                            makeAxis('axis:marching', ['m1'], ['op:target:objective']),
                        ],
                    }],
                },
            },
            brigade_movement_state: {
                m1: {
                    status: 'in_transit',
                    destination_sids: ['op:front:approach'],
                    path: ['op:rear:staging', 'op:front:approach'],
                    stance: 'column',
                    turns_remaining: 3,
                } as any,
            },
            war_front_edges_osid: [],
        } as any,
        political: {
            political_controllers: {
                'op:rear:staging': 'RS',
                'op:front:approach': 'RS',
                'op:target:objective': 'RBiH',
            },
        } as any,
    } as unknown as GameState;
}

describe('sector offensive shared-objective axis wait', () => {
    it('waiting axis survives idle stall when sibling is advancing on shared objective', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 0,
                attack_attempt_count: 1,
            },
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('executing');
        expect(waitingAxis?.shared_objective_wait_turns).toBe(1);
    });

    it('waiting axis advances via convergence when sibling captures shared objective', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RS',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 0,
                attack_attempt_count: 1,
            },
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('executing');
        expect(waitingAxis?.current_objective_index).toBe(1);
        expect(waitingAxis?.objective_capture_count).toBe(1);
        expect(waitingAxis?.idle_execution_turn_streak).toBe(0);
    });

    it('waiting axis stalls when sibling ceases advancing', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                status: 'stalled',
            },
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('stalled');
    });

    it('waiting axis stalls after strict wait cap is reached', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
                shared_objective_wait_turns: 3,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 0,
                attack_attempt_count: 1,
            },
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('stalled');
    });

    it('continuously marching axis stalls at the movement-only cap', () => {
        const state = makeMarchingAxisState();

        // Turns 1-3: marching toward the objective is approach progress, not a stall.
        for (let t = 0; t < 3; t++) {
            state.meta.turn = 20 + t;
            updateSectorOffensiveResults(state);
        }
        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const axis = op?.axes?.[0];
        expect(axis?.status).toBe('executing');
        expect(axis?.movement_only_execution_turns).toBe(3);
        expect(axis?.failure_count).toBe(0);

        // Turn 4: the movement-only cap is reached and the axis must stall.
        state.meta.turn = 23;
        updateSectorOffensiveResults(state);
        expect(axis?.status).toBe('stalled');
        expect(axis?.movement_only_execution_turns).toBe(4);
        expect(axis?.failure_count).toBe(0);
    });

    it('two idle siblings do not extend one another', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
        });
        // Both axes stand down: no attack posture, no movement — equally idle.
        const formations = state.military.formations as Record<string, FormationState>;
        formations.w1.posture = 'hold';
        formations.w2.posture = 'hold';
        formations.a1.posture = 'hold';
        formations.a2.posture = 'hold';

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const axisA = op?.axes?.[0];
        const axisB = op?.axes?.[1];
        expect(axisA?.status).toBe('stalled');
        expect(axisB?.status).toBe('stalled');
        expect(axisA?.shared_objective_wait_turns).toBeUndefined();
        expect(axisB?.shared_objective_wait_turns).toBeUndefined();
    });

    it('waiting axis qualifies when the shared objective is later in the progressing sibling\'s remaining path', () => {
        // Models the Sana Krupa→Sanski dependency: the waiting axis's current
        // objective sits later on the executing sibling's remaining path.
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 0,
                attack_attempt_count: 1,
                objectives: ['op:target:obj_a', 'op:target:shared_obj'],
            },
        });
        // Keep the sibling's current objective contested so it does not auto-claim.
        state.political.political_controllers!['op:target:obj_a'] = 'RBiH';

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('executing');
        expect(waitingAxis?.shared_objective_wait_turns).toBe(1);
    });

    it('sibling qualifies via recent activity even without a recorded attack', () => {
        const state = makeSharedAxisState({
            sharedObjController: 'RBiH',
            waitingAxisOverrides: {
                idle_execution_turn_streak: 4,
                attack_attempt_count: 0,
            },
            advancingAxisOverrides: {
                idle_execution_turn_streak: 0,
                attack_attempt_count: 0,
            },
        });
        // The sibling marched last turn (idle streak reset) but has never attacked.
        state.military.brigade_movement_state = {
            a1: { status: 'in_transit', destination_sids: ['op:front:approach'], path: ['op:front:approach', 'op:target:shared_obj'], stance: 'column', turns_remaining: 2 } as any,
        };

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        const waitingAxis = op?.axes?.[0];
        expect(waitingAxis?.status).toBe('executing');
        expect(waitingAxis?.shared_objective_wait_turns).toBe(1);
    });
});
