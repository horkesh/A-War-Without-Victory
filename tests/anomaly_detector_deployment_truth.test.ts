import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    detectBrigadeFarFromHome,
    detectUnassignedFrontlineBrigades,
} from '../src/scenario/anomaly_detector.js';

function makeAdjacency(pairs: Array<[string, string]>): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const [a, b] of pairs) {
        if (!adjacency.has(a)) adjacency.set(a, []);
        if (!adjacency.has(b)) adjacency.set(b, []);
        adjacency.get(a)!.push(b);
        adjacency.get(b)!.push(a);
    }
    for (const neighbors of adjacency.values()) neighbors.sort();
    return adjacency;
}

describe('anomaly detector deployment truth', () => {
    it('does not let placement:fixed_home_osid suppress unassigned frontline brigades', () => {
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
                corps_front_sectors: {
                    'sector:arbih_1st_corps:0': {
                        sector_id: 'sector:arbih_1st_corps:0',
                        corps_id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        assigned_brigade_ids: [],
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
                    arbih_1st_corps: {
                        active_operations: [],
                    },
                },
                brigade_movement_state: {},
                brigade_movement_orders: {},
            },
            political: {
                political_controllers: {
                    'op:test:rear': 'RBiH',
                    'op:test:front': 'RBiH',
                    'op:test:home': 'RBiH',
                },
            },
        } as unknown as GameState;

        const anomalies = detectUnassignedFrontlineBrigades(state);
        expect(anomalies).toHaveLength(1);
        expect(anomalies[0]?.type).toBe('unassigned_frontline_brigades');
        expect(anomalies[0]?.entities).toContain('brig_fixed');
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
            },
            political: {
                political_controllers: controllers,
            },
        } as unknown as GameState;

        const anomalies = detectBrigadeFarFromHome(state, adjacency);
        const redeployed = anomalies.find((report) => report.type === 'brigade_far_from_home_redeployed');
        const unassigned = anomalies.find((report) => report.type === 'brigade_far_from_home_unassigned');

        expect(redeployed).toBeDefined();
        expect(redeployed?.entities).toEqual(['brig_loaned', 'brig_redeployed']);
        expect(redeployed?.severity).toBe('info');

        expect(unassigned).toBeDefined();
        expect(unassigned?.entities).toEqual(['brig_unassigned']);
        expect(unassigned?.severity).toBe('warning');

        expect(anomalies.some((report) => report.type === 'brigade_far_from_home')).toBe(false);
    });
});
