import { describe, expect, it } from 'vitest';

import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { GameState } from '../src/state/game_state.js';

describe('uncontested occupation priority', () => {
    it('lets a front brigade walk into adjacent undefended enemy territory before passive defense logic', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'uncontested-occupation-priority' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:empty_enemy': 'RBiH',
                    'op:test:friendly_escape': 'RS',
                    'op:test:friendly_escape_2': 'RS',
                },
            },
            military: {
                formations: {
                    rs_test_brigade: {
                        id: 'rs_test_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front',
                    },
                },
                corps_command: {
                    vrs_test: {
                        stance: 'balanced',
                        active_operations: [],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RS'], {
            edges: [
                { a: 'op:test:front', b: 'op:test:empty_enemy' },
                { a: 'op:test:front', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front' as any, ['op:test:empty_enemy' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_enemy' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:front' as any, 'op:test:empty_enemy' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:empty_enemy' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.rs_test_brigade).toBe('op:test:empty_enemy');
    });

    it('lets a defensive corps brigade walk into adjacent undefended enemy territory instead of passively digging in', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'defensive-uncontested-occupation-priority' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:empty_enemy': 'RBiH',
                    'op:test:friendly_escape': 'RS',
                    'op:test:friendly_escape_2': 'RS',
                },
            },
            military: {
                formations: {
                    rs_test_brigade: {
                        id: 'rs_test_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front',
                    },
                },
                corps_command: {
                    vrs_test: {
                        stance: 'defensive',
                        active_operations: [],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RS'], {
            edges: [
                { a: 'op:test:front', b: 'op:test:empty_enemy' },
                { a: 'op:test:front', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front' as any, ['op:test:empty_enemy' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_enemy' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:front' as any, 'op:test:empty_enemy' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:empty_enemy' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.rs_test_brigade).toBe('op:test:empty_enemy');
    });

    it('keeps defensive counterattacks ahead of a different undefended walkover target', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'defensive-counterattack-priority' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:counter_target': 'RBiH',
                    'op:test:walkover_target': 'RBiH',
                    'op:test:friendly_escape': 'RS',
                    'op:test:friendly_escape_2': 'RS',
                },
            },
            military: {
                formations: {
                    rs_test_brigade: {
                        id: 'rs_test_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front',
                        last_retreat_from: { osid: 'op:test:counter_target', turn: 2 },
                    },
                },
                corps_command: {
                    vrs_test: {
                        stance: 'defensive',
                        active_operations: [],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RS'], {
            edges: [
                { a: 'op:test:front', b: 'op:test:counter_target' },
                { a: 'op:test:front', b: 'op:test:walkover_target' },
                { a: 'op:test:counter_target', b: 'op:test:friendly_escape' },
                { a: 'op:test:walkover_target', b: 'op:test:friendly_escape' },
                { a: 'op:test:walkover_target', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front' as any, ['op:test:counter_target' as any, 'op:test:walkover_target' as any]],
                ['op:test:counter_target' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any]],
                ['op:test:walkover_target' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:counter_target' as any, 'op:test:walkover_target' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:walkover_target' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.rs_test_brigade).toBe('op:test:counter_target');
    });

    it('lets a hold-position brigade walk into adjacent undefended enemy territory before hold logic freezes it in place', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'hold-uncontested-occupation-priority' },
            corps_front_directives: {
                vrs_test: {
                    hold_osids: ['op:test:front'],
                    offensive_targets: [],
                    reserve_fraction: 0,
                    max_attackers_per_target: 2,
                },
            },
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:empty_enemy': 'RBiH',
                    'op:test:friendly_escape': 'RS',
                    'op:test:friendly_escape_2': 'RS',
                },
            },
            military: {
                formations: {
                    rs_test_brigade: {
                        id: 'rs_test_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front',
                        assignment: {
                            kind: 'sector',
                            role: 'front',
                            sector_id: 'sector:vrs_test:0',
                        },
                    },
                },
                corps_command: {
                    vrs_test: {
                        stance: 'defensive',
                        active_operations: [],
                    },
                },
                corps_front_sectors: {
                    'sector:vrs_test:0': {
                        sector_id: 'sector:vrs_test:0',
                        corps_id: 'vrs_test',
                        faction: 'RS',
                        opposing_factions: ['RBiH'],
                        edge_ids: ['op:test:front__op:test:empty_enemy'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:vrs_test:0',
                            edge_ids: ['op:test:front__op:test:empty_enemy'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:empty_enemy'],
                            length_edges: 1,
                            primary_brigade_ids: ['rs_test_brigade'],
                        }],
                        territory_osids: ['op:test:front'],
                        assigned_brigade_ids: ['rs_test_brigade'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        length_edges: 1,
                        density: 1,
                        threat_ratio: 1,
                        defensive_power: 1000,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RS'], {
            edges: [
                { a: 'op:test:front', b: 'op:test:empty_enemy' },
                { a: 'op:test:front', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front' as any, ['op:test:empty_enemy' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_enemy' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:front' as any, 'op:test:empty_enemy' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:empty_enemy' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.rs_test_brigade).toBe('op:test:empty_enemy');
    });

    it('does not trim uncontested walkover orders behind formal operation attack slots', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'uncontested-walkover-cap-exempt' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:op_front': 'RS',
                    'op:test:walkover_front': 'RS',
                    'op:test:op_target': 'RBiH',
                    'op:test:empty_enemy': 'RBiH',
                    'op:test:friendly_escape': 'RS',
                    'op:test:friendly_escape_2': 'RS',
                },
            },
            military: {
                formations: {
                    rs_op_brigade: {
                        id: 'rs_op_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'attack',
                        cohesion: 80,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:op_front',
                    },
                    rs_walkover_brigade: {
                        id: 'rs_walkover_brigade',
                        kind: 'brigade',
                        faction: 'RS',
                        status: 'active',
                        corps_id: 'vrs_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:walkover_front',
                    },
                },
                corps_command: {
                    vrs_test: {
                        stance: 'balanced',
                        active_operations: [{
                            name: 'Test Operation',
                            type: 'sector_attack',
                            phase: 'execution',
                            started_turn: 2,
                            staging_osid: 'op:test:op_front',
                            participating_brigades: ['rs_op_brigade'],
                            objectives: ['op:test:op_target'],
                            current_objective_index: 0,
                        }],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RS'], {
            edges: [
                { a: 'op:test:op_front', b: 'op:test:op_target' },
                { a: 'op:test:walkover_front', b: 'op:test:empty_enemy' },
                { a: 'op:test:walkover_front', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:op_front' as any, ['op:test:op_target' as any]],
                ['op:test:op_target' as any, ['op:test:op_front' as any]],
                ['op:test:walkover_front' as any, ['op:test:empty_enemy' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_enemy' as any, ['op:test:walkover_front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:walkover_front' as any, 'op:test:empty_enemy' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:empty_enemy' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.rs_op_brigade).toBe('op:test:op_target');
        expect(state.military.brigade_attack_orders?.rs_walkover_brigade).toBe('op:test:empty_enemy');
    });

    it('does not let ARBiH warlord friction cancel uncontested walkover orders', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'uncontested-walkover-friction-exempt' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:front_a': 'RBiH',
                    'op:test:front_b': 'RBiH',
                    'op:test:empty_a': 'RS',
                    'op:test:empty_b': 'RS',
                    'op:test:friendly_escape': 'RBiH',
                    'op:test:friendly_escape_2': 'RBiH',
                },
            },
            military: {
                war_timeline: {
                    officer_config: {
                        RBiH: { warlord_friction_end_week: 78 },
                    },
                },
                formations: {
                    arbih_walkover_a: {
                        id: 'arbih_walkover_a',
                        kind: 'brigade',
                        faction: 'RBiH',
                        status: 'active',
                        corps_id: 'arbih_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front_a',
                    },
                    arbih_walkover_b: {
                        id: 'arbih_walkover_b',
                        kind: 'brigade',
                        faction: 'RBiH',
                        status: 'active',
                        corps_id: 'arbih_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front_b',
                    },
                },
                corps_command: {
                    arbih_test: {
                        stance: 'defensive',
                        active_operations: [],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [
                { a: 'op:test:front_a', b: 'op:test:empty_a' },
                { a: 'op:test:front_b', b: 'op:test:empty_b' },
                { a: 'op:test:empty_a', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_b', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front_a' as any, ['op:test:empty_a' as any, 'op:test:friendly_escape' as any]],
                ['op:test:front_b' as any, ['op:test:empty_b' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:empty_a' as any, ['op:test:front_a' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_b' as any, ['op:test:front_b' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:front_a' as any, 'op:test:empty_a' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:front_b' as any, 'op:test:empty_b' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.arbih_walkover_a).toBe('op:test:empty_a');
        expect(state.military.brigade_attack_orders?.arbih_walkover_b).toBe('op:test:empty_b');
    });

    it('lets a home-defense brigade occupy adjacent empty enemy territory instead of freezing on the line', () => {
        const state = {
            meta: { turn: 3, phase: 'war', seed: 'home-defense-walkover' },
            corps_front_directives: {},
            political: {
                political_controllers: {
                    'op:test:front': 'RBiH',
                    'op:test:empty_enemy': 'RS',
                    'op:test:friendly_escape': 'RBiH',
                    'op:test:friendly_escape_2': 'RBiH',
                },
            },
            military: {
                formations: {
                    arbih_home_guard: {
                        id: 'arbih_home_guard',
                        kind: 'brigade',
                        faction: 'RBiH',
                        status: 'active',
                        corps_id: 'arbih_test',
                        posture: 'defend',
                        cohesion: 70,
                        morale: 70,
                        personnel: 1000,
                        location_osid: 'op:test:front',
                        home_defense_active: true,
                    },
                },
                corps_command: {
                    arbih_test: {
                        stance: 'defensive',
                        active_operations: [],
                    },
                },
                brigade_posture_orders: [],
            },
        } as unknown as GameState;

        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [
                { a: 'op:test:front', b: 'op:test:empty_enemy' },
                { a: 'op:test:front', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape' },
                { a: 'op:test:empty_enemy', b: 'op:test:friendly_escape_2' },
            ] as any,
            adjacency: new Map([
                ['op:test:front' as any, ['op:test:empty_enemy' as any, 'op:test:friendly_escape' as any]],
                ['op:test:empty_enemy' as any, ['op:test:front' as any, 'op:test:friendly_escape' as any, 'op:test:friendly_escape_2' as any]],
                ['op:test:friendly_escape' as any, ['op:test:front' as any, 'op:test:empty_enemy' as any]],
                ['op:test:friendly_escape_2' as any, ['op:test:empty_enemy' as any]],
            ]),
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        });

        expect(state.military.brigade_attack_orders?.arbih_home_guard).toBe('op:test:empty_enemy');
    });
});
