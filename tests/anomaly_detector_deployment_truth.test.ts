import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    detectBrigadeFarFromHome,
    detectUnassignedFrontlineBrigades,
    runAnomalyDetection,
} from '../src/scenario/anomaly_detector.js';
import { makeAdjacency } from './_helpers/adjacency.js';

describe('anomaly detector deployment truth', () => {
    it('does not let placement:fixed_home_osid suppress canonically unresolved sector brigades', () => {
        const state = {
            meta: { turn: 8, phase: 'war' },
            military: {
                formations: {
                    brig_fixed: {
                        id: 'brig_fixed',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_1st_corps',
                        location_osid: 'op:test:rear',
                        home_osid: 'op:test:home',
                        disrupted_turns: 0,
                        assignment: null,
                        tags: ['placement:fixed_home_osid'],
                    },
                },
                unresolved_sector_brigades: ['brig_fixed'],
            },
        } as unknown as GameState;

        const anomalies = detectUnassignedFrontlineBrigades(state);
        expect(anomalies).toHaveLength(1);
        expect(anomalies[0]?.type).toBe('unassigned_frontline_brigades');
        expect(anomalies[0]?.entities).toContain('brig_fixed');
    });

    it('does not reconstruct unassigned frontline failures when canonical unresolved list is empty', () => {
        const state = {
            meta: { turn: 8, phase: 'war' },
            military: {
                formations: {
                    brig_fixed: {
                        id: 'brig_fixed',
                        faction: 'HRHB',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'hvo_central_bosnia',
                        location_osid: 'op:test:rear',
                        home_osid: 'op:test:home',
                        disrupted_turns: 0,
                        assignment: null,
                        tags: ['placement:fixed_home_osid'],
                    },
                },
                corps_front_sectors: {
                    'sector:hvo_central_bosnia:0': {
                        sector_id: 'sector:hvo_central_bosnia:0',
                        corps_id: 'hvo_central_bosnia',
                        faction: 'HRHB',
                        assigned_brigade_ids: ['other_brig'],
                        reserve_brigade_ids: [],
                        sub_segments: [],
                        edge_ids: ['edge:1'],
                        territory_osids: ['op:test:front'],
                        opposing_factions: ['RS'],
                        density: 1,
                        defensive_power: 100,
                        threat_ratio: 1,
                        sector_stance: 'balanced',
                        stance_source: 'bot',
                    },
                },
                corps_command: {
                    hvo_central_bosnia: {
                        active_operations: [],
                    },
                },
                unresolved_sector_brigades: [],
            },
        } as unknown as GameState;

        expect(detectUnassignedFrontlineBrigades(state)).toEqual([]);
    });

    it('separates far-from-home redeployments from idle unassigned drift', () => {
        const adjacency = makeAdjacency([
            ['op:home:a', 'op:path:b'],
            ['op:path:b', 'op:path:c'],
            ['op:path:c', 'op:path:d'],
            ['op:path:d', 'op:path:e'],
            ['op:path:e', 'op:path:f'],
            ['op:path:f', 'op:path:g'],
            ['op:path:g', 'op:front:h'],
        ]);

        const controllers = Object.fromEntries([...adjacency.keys()].map((osid) => [osid, 'RBiH']));

        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                formations: {
                    brig_redeployed: {
                        id: 'brig_redeployed',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_3rd_corps',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:arbih_3rd_corps:1' },
                        tags: ['placement:fixed_home_osid'],
                    },
                    brig_rear_owned: {
                        id: 'brig_rear_owned',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_3rd_corps',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'rear', sector_id: 'sector:arbih_3rd_corps:1' },
                        tags: ['placement:fixed_home_osid'],
                    },
                    brig_loaned: {
                        id: 'brig_loaned',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_general_staff',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:arbih_2nd_corps:0' },
                        elite_loan_state: {
                            on_loan: true,
                            loaned_to_corps: 'arbih_2nd_corps',
                            loan_start_turn: 8,
                            last_recall_turn: null,
                            loan_start_personnel: 1200,
                            permanently_degraded: false,
                            current_episode_id: 1,
                        },
                        tags: ['placement:fixed_home_osid'],
                    },
                    brig_unassigned: {
                        id: 'brig_unassigned',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_3rd_corps',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: null,
                        tags: ['placement:fixed_home_osid'],
                    },
                    brig_recalled: {
                        id: 'brig_recalled',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_3rd_corps',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: null,
                        tags: ['placement:fixed_home_osid'],
                    },
                    brig_hq_idle: {
                        id: 'brig_hq_idle',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_general_staff',
                        location_osid: 'op:front:h',
                        home_osid: 'op:home:a',
                        disrupted_turns: 0,
                        assignment: null,
                        tags: ['placement:fixed_home_osid'],
                    },
                },
                corps_command: {
                    arbih_3rd_corps: { active_operations: [] },
                    arbih_2nd_corps: { active_operations: [] },
                    arbih_general_staff: { active_operations: [] },
                },
                brigade_movement_orders: {
                    brig_recalled: {
                        destination_sids: ['op:home:a'],
                        stance: 'column',
                    },
                },
            },
            political: {
                political_controllers: controllers,
            },
        } as unknown as GameState;

        const anomalies = detectBrigadeFarFromHome(state, adjacency);
        const redeployed = anomalies.find((report) => report.type === 'brigade_far_from_home_redeployed');
        const unassigned = anomalies.find((report) => report.type === 'brigade_far_from_home_unassigned');

        expect(redeployed).toBeDefined();
        expect(redeployed?.entities).toEqual(['brig_loaned', 'brig_rear_owned', 'brig_recalled', 'brig_redeployed']);
        expect(redeployed?.severity).toBe('info');

        expect(unassigned).toBeDefined();
        expect(unassigned?.entities).toEqual(['brig_unassigned']);
        expect(unassigned?.severity).toBe('warning');

        expect(anomalies.some((report) => report.type === 'brigade_far_from_home')).toBe(false);
    });

    it('limits brigade_never_fights to live non-cold owners and demotes it to info', () => {
        const state = {
            meta: { turn: 40, phase: 'war' },
            military: {
                formations: {
                    brig_owned: {
                        id: 'brig_owned',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_1st_corps',
                        location_osid: 'op:test:owned',
                        home_osid: 'op:test:home',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:arbih_1st_corps:0' },
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                    brig_ownerless: {
                        id: 'brig_ownerless',
                        faction: 'HRHB',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'hvo_central_bosnia',
                        location_osid: 'op:test:idle',
                        home_osid: 'op:test:idle',
                        disrupted_turns: 0,
                        assignment: null,
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                    brig_cold: {
                        id: 'brig_cold',
                        faction: 'HRHB',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'hvo_tomislavgrad',
                        location_osid: 'op:test:cold',
                        home_osid: 'op:test:cold',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:hvo_tomislavgrad:0' },
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                    brig_loaned: {
                        id: 'brig_loaned',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_7th_corps',
                        location_osid: 'op:test:loan',
                        home_osid: 'op:test:loan',
                        disrupted_turns: 0,
                        assignment: null,
                        elite_loan_state: {
                            on_loan: true,
                            loaned_to_corps: 'arbih_2nd_corps',
                        },
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                    brig_reserve: {
                        id: 'brig_reserve',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_1st_corps',
                        location_osid: 'op:test:reserve',
                        home_osid: 'op:test:home',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'reserve', sector_id: 'sector:arbih_1st_corps:0' },
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                    brig_operation: {
                        id: 'brig_operation',
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        corps_id: 'arbih_1st_corps',
                        location_osid: 'op:test:owned',
                        home_osid: 'op:test:home',
                        disrupted_turns: 0,
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:arbih_1st_corps:0' },
                        brigade_history: { battles_fought: 0, engagements: [] },
                    },
                },
                corps_front_sectors: {
                    'sector:arbih_1st_corps:0': {
                        sector_id: 'sector:arbih_1st_corps:0',
                        corps_id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        assigned_brigade_ids: ['brig_owned', 'brig_operation'],
                        reserve_brigade_ids: ['brig_reserve'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:owned',
                            edge_ids: ['edge:owned'],
                            friendly_osids: ['op:test:owned', 'op:test:reserve'],
                            enemy_osids: ['op:test:enemy'],
                            primary_brigade_ids: ['brig_owned', 'brig_operation'],
                            length_edges: 1,
                        }],
                        edge_ids: ['edge:owned'],
                        territory_osids: ['op:test:owned', 'op:test:reserve'],
                        opposing_factions: ['RS'],
                        density: 1,
                        defensive_power: 100,
                        threat_ratio: 1,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                    'sector:hvo_tomislavgrad:0': {
                        sector_id: 'sector:hvo_tomislavgrad:0',
                        corps_id: 'hvo_tomislavgrad',
                        faction: 'HRHB',
                        assigned_brigade_ids: ['brig_cold'],
                        reserve_brigade_ids: [],
                        sub_segments: [{
                            sub_segment_id: 'subseg:cold',
                            edge_ids: ['edge:cold'],
                            friendly_osids: ['op:test:cold'],
                            enemy_osids: ['op:test:truce'],
                            primary_brigade_ids: ['brig_cold'],
                            length_edges: 1,
                        }],
                        edge_ids: ['edge:cold'],
                        territory_osids: ['op:test:cold'],
                        opposing_factions: ['RS'],
                        density: 1,
                        defensive_power: 100,
                        threat_ratio: 1,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                },
                unresolved_sector_brigades: [],
                corps_command: {
                    arbih_1st_corps: {
                        active_operations: [{
                            operation_id: 'op:test:operation',
                            participating_brigades: ['brig_operation'],
                        }],
                    },
                },
            },
            political: {
                political_controllers: {
                    'op:test:owned': 'RBiH',
                    'op:test:reserve': 'RBiH',
                    'op:test:enemy': 'RS',
                    'op:test:cold': 'HRHB',
                    'op:test:truce': 'RS',
                    'op:test:idle': 'HRHB',
                    'op:test:loan': 'RBiH',
                },
                rbih_hrhb_state: { war_started_turn: null },
                vienna_declaration_turn: 4,
                vienna_accepted: { RS: true, HRHB: true },
                vienna_herzegovina_broken_by: null,
                vienna_kiseljak_broken: false,
            },
        } as unknown as GameState;

        const reports = runAnomalyDetection(state).filter((anomaly) => anomaly.type === 'brigade_never_fights');
        const bySubtype = Object.fromEntries(reports.map((report) => [report.subtype, report]));

        expect(reports.map((report) => report.subtype)).toEqual([
            'loan',
            'operation_participant',
            'sector_front',
            'sector_reserve',
        ]);
        expect(reports.every((report) => report.severity === 'info')).toBe(true);
        expect(bySubtype.loan?.entities).toEqual(['brig_loaned']);
        expect(bySubtype.operation_participant?.entities).toEqual(['brig_operation']);
        expect(bySubtype.sector_front?.entities).toEqual(['brig_owned']);
        expect(bySubtype.sector_reserve?.entities).toEqual(['brig_reserve']);
        expect(reports.map((report) => report.entities).flat()).not.toContain('brig_cold');
        expect(reports.map((report) => report.entities).flat()).not.toContain('brig_ownerless');
        expect(bySubtype.sector_front?.description).toContain('sector-front');
        expect(bySubtype.sector_reserve?.description).toContain('reserve/rear');
        expect(bySubtype.operation_participant?.description).toContain('active operation');
    });
});
