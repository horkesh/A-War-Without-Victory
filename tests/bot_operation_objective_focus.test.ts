import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    applySectorOffensiveDirectiveOverride,
    generateAllBotOrdersOsid
} from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { CorpsDirective, CorpsOperation, GameState } from '../src/state/game_state.js';

test('execution-phase sector offensive narrows brigade directive to current objective', () => {
    const directive: CorpsDirective = {
        assigned_front_ids: ['front:1'],
        offensive_targets: ['op:other:easy_target', 'op:target:current_objective', 'op:other:second_target'],
        hold_osids: [],
        avoid_osids: [],
        max_attackers_per_target: 2,
        reserve_fraction: 0.2,
        min_attack_outcome: 'stalemate',
        aggression_modifier: 0.1
    };
    const operation: CorpsOperation = {
        name: 'Operacija Test',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 0,
        phase_started_turn: 1,
        participating_brigades: ['b1' as any],
        objectives: ['op:target:current_objective', 'op:target:follow_on'],
        current_objective_index: 0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0
    };

    const overridden = applySectorOffensiveDirectiveOverride(directive, operation);

    assert.deepEqual(overridden.offensive_targets, ['op:target:current_objective']);
    assert.equal(overridden.min_attack_outcome, directive.min_attack_outcome);
});

test('non-execution sector offensive leaves directive targets unchanged', () => {
    const directive: CorpsDirective = {
        assigned_front_ids: [],
        offensive_targets: ['op:other:easy_target'],
        hold_osids: [],
        avoid_osids: [],
        max_attackers_per_target: 2,
        reserve_fraction: 0.2,
        min_attack_outcome: 'stalemate',
        aggression_modifier: 0
    };
    const operation: CorpsOperation = {
        name: 'Operacija Test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 0,
        phase_started_turn: 0,
        participating_brigades: ['b1' as any],
        objectives: ['op:target:current_objective'],
        current_objective_index: 0
    };

    const overridden = applySectorOffensiveDirectiveOverride(directive, operation);

    assert.deepEqual(overridden.offensive_targets, directive.offensive_targets);
});

test('execution-phase operation attacks current objective even without a corps directive', () => {
    const state = {
        meta: { turn: 2, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_bratunac: {
                id: 'rs_1st_bratunac',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_drina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 1000,
                equipment: { infantry: 1000, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:bratunac:slapasnica',
            },
        },
        corps_command: {
            vrs_drina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operation Drina',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 0,
                    phase_started_turn: 1,
                    participating_brigades: ['rs_1st_bratunac'],
                    objectives: ['op:bratunac:bratunac_2'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:bratunac:slapasnica': 'RS',
            'op:bratunac:bratunac_2': 'RBiH',
            'op:bratunac:polom': 'RS',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:bratunac:slapasnica', b: 'op:bratunac:bratunac_2' },
            { a: 'op:bratunac:slapasnica', b: 'op:bratunac:polom' },
            { a: 'op:bratunac:bratunac_2', b: 'op:bratunac:polom' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(state.military.brigade_attack_orders?.rs_1st_bratunac, 'op:bratunac:bratunac_2');
});

test('execution-phase operation moves brigade toward an approach OSID for the current objective', () => {
    const state = {
        meta: { turn: 3, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_posavina_infantry: {
                id: 'rs_1st_posavina_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_east_bosnian',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 1000,
                equipment: { infantry: 1000, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:start',
            },
        },
        corps_command: {
            vrs_east_bosnian: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operation Koridor',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 0,
                    phase_started_turn: 1,
                    participating_brigades: ['rs_1st_posavina_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:base': 'RS',
            'op:test:start': 'RS',
            'op:test:approach': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:start', b: 'op:test:base' },
            { a: 'op:test:start', b: 'op:test:approach' },
            { a: 'op:test:base', b: 'op:test:approach' },
            { a: 'op:test:approach', b: 'op:test:objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_posavina_infantry?.destination_sids?.[0],
        'op:test:approach'
    );
    assert.equal(state.military.brigade_attack_orders?.rs_1st_posavina_infantry, undefined);
});

test('execution-phase operation falls back to maneuver toward a later reachable objective when the current objective has no friendly approach', () => {
    const state = {
        meta: { turn: 4, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_posavina_infantry: {
                id: 'rs_1st_posavina_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_east_bosnian',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 1000,
                equipment: { infantry: 1000, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:start',
            },
        },
        corps_command: {
            vrs_east_bosnian: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operation Koridor',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 0,
                    phase_started_turn: 1,
                    participating_brigades: ['rs_1st_posavina_infantry'],
                    objectives: ['op:test:blocked_objective', 'op:test:reachable_objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:start': 'RS',
            'op:test:approach': 'RS',
            'op:test:blocked_objective': 'RBiH',
            'op:test:reachable_objective': 'RBiH',
            'op:test:enemy_buffer': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:start', b: 'op:test:approach' },
            { a: 'op:test:approach', b: 'op:test:reachable_objective' },
            { a: 'op:test:enemy_buffer', b: 'op:test:blocked_objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_posavina_infantry?.destination_sids?.[0],
        'op:test:approach'
    );
    assert.equal(state.military.brigade_attack_orders?.rs_1st_posavina_infantry, undefined);
});

test('execution-phase operation concentrates adjacent brigades on the current objective', () => {
    const state = {
        meta: { turn: 13, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 250,
                equipment: { infantry: 250, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:approach',
            },
            rs_2nd_armored: {
                id: 'rs_2nd_armored',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 250,
                equipment: { infantry: 250, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:approach',
            },
            arbih_defender: {
                id: 'arbih_defender',
                kind: 'brigade',
                faction: 'RBiH',
                status: 'active',
                corps_id: 'arbih_test',
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:objective',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                directive: {
                    assigned_front_ids: [],
                    offensive_targets: ['op:test:objective'],
                    hold_osids: [],
                    avoid_osids: [],
                    max_attackers_per_target: 3,
                    reserve_fraction: 0,
                    min_attack_outcome: 'costly_victory',
                    aggression_modifier: 0,
                },
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 12,
                    participating_brigades: ['rs_1st_doboj_light_infantry', 'rs_2nd_armored'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:approach': 'RS',
            'op:test:rear': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:approach', b: 'op:test:objective' },
            { a: 'op:test:approach', b: 'op:test:rear' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.ok(
        state.military.brigade_attack_orders?.rs_1st_doboj_light_infantry === 'op:test:objective' ||
        state.military.brigade_attack_orders?.rs_2nd_armored === 'op:test:objective'
    );
});

test('execution-phase operation with momentum can probe the next objective from an adjacent approach', () => {
    const state = {
        meta: { turn: 14, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: false,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 250,
                equipment: { infantry: 250, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:approach',
            },
            arbih_defender: {
                id: 'arbih_defender',
                kind: 'brigade',
                faction: 'RBiH',
                status: 'active',
                corps_id: 'arbih_test',
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:objective',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 13,
                    participating_brigades: ['rs_1st_doboj_light_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 2,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:approach': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:approach', b: 'op:test:objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(state.military.brigade_attack_orders?.rs_1st_doboj_light_infantry, 'op:test:objective');
});

test('execution-phase operation still moves assigned brigades when their current OSID is critical supply', () => {
    const state = {
        meta: { turn: 14, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:start',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 13,
                    participating_brigades: ['rs_1st_doboj_light_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:start': 'RS',
            'op:test:approach': 'RS',
            'op:test:safe_rear': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:start', b: 'op:test:approach' },
            { a: 'op:test:approach', b: 'op:test:safe_rear' },
            { a: 'op:test:approach', b: 'op:test:objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {
            factions: [
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:test:start', state: 'critical' },
                        { osid: 'op:test:approach', state: 'adequate' },
                    ],
                },
            ],
        } as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_doboj_light_infantry?.destination_sids?.[0],
        'op:test:approach'
    );
});

test('execution-phase operation still moves toward a risky approach OSID when that is the path to the current objective', () => {
    const state = {
        meta: { turn: 18, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: false,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 700,
                equipment: { infantry: 700, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:start',
            },
            arbih_def_1: {
                id: 'arbih_def_1',
                kind: 'brigade',
                faction: 'RBiH',
                status: 'active',
                corps_id: 'arbih_test',
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:objective',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 10,
                    phase_started_turn: 17,
                    participating_brigades: ['rs_1st_doboj_light_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:start': 'RS',
            'op:test:approach': 'RS',
            'op:test:rear_a': 'RS',
            'op:test:rear_b': 'RS',
            'op:test:objective': 'RBiH',
            'op:test:enemy_a': 'RBiH',
            'op:test:enemy_b': 'RBiH',
            'op:test:enemy_c': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:start', b: 'op:test:approach' },
            { a: 'op:test:approach', b: 'op:test:objective' },
            { a: 'op:test:approach', b: 'op:test:rear_a' },
            { a: 'op:test:approach', b: 'op:test:rear_b' },
            { a: 'op:test:approach', b: 'op:test:enemy_a' },
            { a: 'op:test:approach', b: 'op:test:enemy_b' },
            { a: 'op:test:approach', b: 'op:test:enemy_c' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_doboj_light_infantry?.destination_sids?.[0],
        'op:test:approach'
    );
    assert.equal(state.military.brigade_attack_orders?.rs_1st_doboj_light_infantry, undefined);
});

test('planning-phase operation emits the first hop toward a distant staging OSID', () => {
    const state = {
        meta: { turn: 11, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:start',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 10,
                    phase_started_turn: 10,
                    participating_brigades: ['rs_1st_doboj_light_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    planning_duration: 5,
                    staging_osid: 'op:test:staging',
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:start': 'RS',
            'op:test:mid': 'RS',
            'op:test:staging': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:start', b: 'op:test:mid' },
            { a: 'op:test:mid', b: 'op:test:staging' },
            { a: 'op:test:staging', b: 'op:test:objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_doboj_light_infantry?.destination_sids?.[0],
        'op:test:mid'
    );
});

test('planning-phase operation keeps moving from staging into first-objective approach positions', () => {
    const state = {
        meta: { turn: 11, phase: 'war', seed: 'test-seed' },
        formations: {
            rs_1st_doboj_light_infantry: {
                id: 'rs_1st_doboj_light_infantry',
                kind: 'brigade',
                faction: 'RS',
                status: 'active',
                corps_id: 'vrs_1st_krajina',
                home_defense_active: true,
                posture: 'defend',
                cohesion: 70,
                morale: 70,
                personnel: 600,
                equipment: { infantry: 600, tanks: 0, artillery: 0, air_defense: 0 },
                location_osid: 'op:test:staging',
            },
        },
        corps_command: {
            vrs_1st_krajina: {
                stance: 'offensive',
                active_operation: {
                    name: 'Operacija Lukavac',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 10,
                    phase_started_turn: 10,
                    participating_brigades: ['rs_1st_doboj_light_infantry'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    planning_duration: 5,
                    staging_osid: 'op:test:staging',
                },
            },
        },
        corps_front_directives: {},
        political_controllers: {
            'op:test:staging': 'RS',
            'op:test:approach': 'RS',
            'op:test:objective': 'RBiH',
        },
        brigade_posture_orders: [],
    } as unknown as GameState;

    generateAllBotOrdersOsid(state, ['RS'], {
        edges: [
            { a: 'op:test:staging', b: 'op:test:approach' },
            { a: 'op:test:approach', b: 'op:test:objective' },
        ] as any,
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    });

    assert.equal(
        state.military.brigade_movement_orders?.rs_1st_doboj_light_infantry?.destination_sids?.[0],
        'op:test:approach'
    );
    assert.equal(state.military.brigade_attack_orders?.rs_1st_doboj_light_infantry, undefined);
});
