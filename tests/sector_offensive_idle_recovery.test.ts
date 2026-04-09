import { describe, expect, it } from 'vitest';
import { advanceSectorOffensives, updateSectorOffensiveResults, getEquipmentOffensivePriority } from '../src/sim/combat/sector_offensive.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    edgeIds: string[],
    friendlyOsids: string[],
    enemyOsids: string[]
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [],
        edge_ids: edgeIds,
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: edgeIds,
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            primary_brigade_ids: [],
            length_edges: edgeIds.length,
        }],
        length_edges: edgeIds.length,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function makeBrigade(id: string, locationOsid: string): FormationState {
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
        posture: 'hold',
        tags: [],
    };
}

describe('equipment offensive priority', () => {
    it('mechanized > motorized > mountain > light_infantry priority', () => {
        expect(getEquipmentOffensivePriority('mechanized')).toBeGreaterThan(getEquipmentOffensivePriority('motorized'));
        expect(getEquipmentOffensivePriority('motorized')).toBeGreaterThan(getEquipmentOffensivePriority('mountain'));
        expect(getEquipmentOffensivePriority('mountain')).toBeGreaterThan(getEquipmentOffensivePriority('light_infantry'));
        expect(getEquipmentOffensivePriority('light_infantry')).toBe(getEquipmentOffensivePriority(undefined));
    });
});

describe('sector offensive idle recovery', () => {
    it('records failed objective cooldowns for no-attempt probes when recovery completes', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 12, phase: 'war', seed: 'probe-failure-cooldown' } as any,
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
                b1: makeBrigade('b1', 'op:front:approach'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Failed Probe',
                        type: 'probe',
                        phase: 'recovery',
                        started_turn: 10,
                        phase_started_turn: 11,
                        participating_brigades: ['b1'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 1,
                        failure_count: 1,
                        consecutive_failures_on_current: 1,
                        recovery_reason: 'no_logged_attempt',
                        sector_id: 'rs_sector',
                    }],
                },
            }
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:front:approach': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const failed = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective'];
        expect(failed?.failure_count).toBe(1);
        expect(failed?.cooldown_until_turn ?? 0).toBe(0);
        expect(state.military.corps_command?.rs_corps?.active_operations).toHaveLength(0);
    });

    it('moves a zero-eligibility execution operation into recovery after four consecutive idle turns', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 9, phase: 'war', seed: 'idle-recovery' } as any,
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
                b1: makeBrigade('b1', 'op:rear:staging'),
                b2: makeBrigade('b2', 'op:rear:staging'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Stalled Attack',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 8,
                        phase_started_turn: 8,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 3,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                    }],
                },
            }
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:rear:staging': 'RS',
            }
  } as any,
} as unknown as GameState;

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('no_logged_attempt');
        expect(op?.movement_only_execution_turns).toBe(1);
    });

    it('moves a truce-blocked execution probe into one-turn political recovery instead of stalling in execution', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 9, phase: 'war', seed: 'political-blocked-probe' } as any,
  military: {
    formations: {
                hvo_southeast_herzegovina: {
                    id: 'hvo_southeast_herzegovina',
                    faction: 'HRHB',
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
                b1: {
                    ...makeBrigade('b1', 'op:front:approach'),
                    faction: 'HRHB',
                    corps_id: 'hvo_southeast_herzegovina',
                },
            },
    corps_front_sectors: {
                hvo_sector: makeSector('hvo_sector', 'hvo_southeast_herzegovina', 'RBiH' as any, ['e1'], ['op:front:approach'], ['op:target:objective']) as any,
            },
    corps_command: {
                hvo_southeast_herzegovina: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Blocked Probe',
                        type: 'probe',
                        phase: 'execution',
                        started_turn: 8,
                        phase_started_turn: 8,
                        participating_brigades: ['b1'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        axes: [{
                            axis_id: 'probe_axis',
                            name: 'Probe',
                            assigned_brigades: ['b1'],
                            objectives: ['op:target:objective'],
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
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'hvo_sector',
                    }],
                },
            }
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RS',
                'op:front:approach': 'HRHB',
            },
            vienna_declaration_turn: 4,
            vienna_accepted: { RS: true, HRHB: true },
            vienna_herzegovina_broken_by: null,
            graz_east_herzegovina_active_turn: 8,
} as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.hvo_southeast_herzegovina?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('political_blocked');
    });

    it('never promotes a planning operation into execution when participants never reach staging', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'planning-invalidated' } as any,
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
                b1: makeBrigade('b1', 'op:rear:staging'),
                b2: makeBrigade('b2', 'op:rear:staging'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Never Staged',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        planning_duration: 1,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        staging_osid: 'op:front:approach',
                    }],
                },
            }
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:rear:staging': 'RS',
                'op:front:approach': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });

    it('invalidates probes that miss their immediate launch window instead of aging into no-attempt recovery', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'probe-planning-invalidation' } as any,
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
                b1: makeBrigade('b1', 'op:rear:staging'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Missed Probe',
                        type: 'probe',
                        phase: 'planning',
                        started_turn: 7,
                        phase_started_turn: 7,
                        participating_brigades: ['b1'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        planning_duration: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                    }],
                },
            }
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:rear:staging': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });

    it('never promotes a planning operation into execution when positioned participants are combat-ineffective', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'planning-zero-eligible' } as any,
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
                b1: {
                    ...makeBrigade('b1', 'op:front:approach'),
                    personnel: 300,
                },
                b2: {
                    ...makeBrigade('b2', 'op:front:approach'),
                    disrupted_turns: 2,
                },
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Positioned But Spent',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        planning_duration: 1,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        staging_osid: 'op:front:approach',
                    }],
                },
            },
    brigade_movement_state: {},
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:front:approach': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });

    it('never promotes a planning operation when brigades only sit on a later-objective approach', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'planning-wrong-objective' } as any,
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
                b1: makeBrigade('b1', 'op:front:later_approach'),
                b2: makeBrigade('b2', 'op:front:later_approach'),
            },
    corps_front_sectors: {
                rs_sector: {
                    ...makeSector('rs_sector', 'rs_corps', 'RS', ['e1', 'e2'], ['op:front:first_approach', 'op:front:later_approach'], ['op:target:first', 'op:target:later']),
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:first',
                            edge_ids: ['e1'],
                            friendly_osids: ['op:front:first_approach'],
                            enemy_osids: ['op:target:first'],
                            primary_brigade_ids: [],
                            length_edges: 1,
                        },
                        {
                            sub_segment_id: 'subseg:later',
                            edge_ids: ['e2'],
                            friendly_osids: ['op:front:later_approach'],
                            enemy_osids: ['op:target:later'],
                            primary_brigade_ids: [],
                            length_edges: 1,
                        },
                    ],
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
                        name: 'Wrong Opening Axis',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:first', 'op:target:later'],
                        current_objective_index: 0,
                        planning_duration: 1,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        staging_osid: 'op:front:first_approach',
                    }],
                },
            },
    brigade_movement_state: {},
  } as any,
  political: {
    political_controllers: {
                'op:target:first': 'RBiH',
                'op:target:later': 'RBiH',
                'op:front:first_approach': 'RS',
                'op:front:later_approach': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });

    it('invalidates planning when coarse subsegment membership makes non-adjacent brigades look execution-ready', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'planning-coarse-approach-membership' } as any,
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
                b1: makeBrigade('b1', 'op:front:rear_approach_a'),
                b2: makeBrigade('b2', 'op:front:rear_approach_b'),
            },
    corps_front_sectors: {
                rs_sector: {
                    ...makeSector(
                        'rs_sector',
                        'rs_corps',
                        'RS',
                        ['e1'],
                        ['op:front:valid_approach', 'op:front:rear_approach_a', 'op:front:rear_approach_b'],
                        ['op:target:objective'],
                    ),
                },
            },
    war_front_edges_osid: [
                { edge_id: 'front:valid', a: 'op:front:valid_approach', b: 'op:target:objective' },
            ],
    brigade_movement_state: {},
    corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 2,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'False Ready From Coarse Sector Membership',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        planning_duration: 1,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        staging_osid: 'op:front:valid_approach',
                    }],
                },
            },
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:front:valid_approach': 'RS',
                'op:front:rear_approach_a': 'RS',
                'op:front:rear_approach_b': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });

    it('never promotes a planning operation when brigades are only assembled at rear staging', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, phase: 'war', seed: 'planning-rear-staging' } as any,
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
                b1: makeBrigade('b1', 'op:rear:staging'),
                b2: makeBrigade('b2', 'op:rear:staging'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
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
                        name: 'Rear Assembly Only',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        planning_duration: 1,
                        preparation_sub_phase: 'ready',
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                        staging_osid: 'op:rear:staging',
                    }],
                },
            },
    brigade_movement_state: {},
  } as any,
  political: {
    political_controllers: {
                'op:target:objective': 'RBiH',
                'op:front:approach': 'RS',
                'op:rear:staging': 'RS',
            }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('planning_invalidated');
    });
});
