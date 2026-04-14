import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    collectAssignmentCompletenessIssues,
    collectAdjacentUncontestedTerritoryIssues,
    collectEmptyContestedSectorIssues,
    collectSectorFloorShortfallIssues,
    collectSectorGeometryIssues,
    collectWarFrontSectorCoverageIssues,
    collectUndefendedFrontSubsegmentIssues,
    collectPhysicalSectorOwnershipIssues,
    collectSectorRoleBucketSyncIssues,
    validateState,
} = require('../tools/validate_run_consistency.cjs') as {
    collectAssignmentCompletenessIssues: (state: any) => Array<{ id: string; corps: string; faction: string }>;
    collectAdjacentUncontestedTerritoryIssues: (state: any) => Array<{ osid: string; enemy_osid: string; enemy_brigades: string[] }>;
    collectEmptyContestedSectorIssues: (state: any) => Array<{ sector: string; length_edges: number }>;
    collectSectorFloorShortfallIssues: (state: any) => {
        missed_reinforcement: Array<{ sector: string; assigned: number; needed: number; donor_candidates: Array<{ brigade_id: string; donor_sector_id: string; donor_role: string; distance: number }> }>;
        unavoidable_shortfall: Array<{ sector: string; assigned: number; needed: number; donor_candidates: Array<{ brigade_id: string; donor_sector_id: string; donor_role: string; distance: number }> }>;
    };
    collectSectorGeometryIssues: (state: any) => Array<{ sector: string; pieces: number; osids: string[] }>;
    collectWarFrontSectorCoverageIssues: (state: any) => { missing: string[]; extra: string[] };
    collectUndefendedFrontSubsegmentIssues: (state: any) => Array<{ sector: string; sub_segment_id: string; length_edges: number }>;
    collectPhysicalSectorOwnershipIssues: (state: any) => Array<{ id: string; sector: string; role: string; location: string | null }>;
    collectSectorRoleBucketSyncIssues: (state: any) => Array<{ id: string; sector: string; bucket: string; expected_role: string; assignment_role: string | null; physical_role: string | null; location: string | null }>;
    validateState: (state: any, runLabel: string) => { failures: number; lines: string[] };
};

function makeBrigade(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: 'vrs_drina',
        personnel: 1200,
        assignment: null,
        ...overrides,
    };
}

describe('validate_run_consistency assignment completeness', () => {
    it('uses canonical final unresolved-sector truth instead of treating every unassigned brigade as a failure', () => {
        const state = {
            meta: { turn: 10 },
            military: {
                formations: {
                    hrhb_travnik_brigade: makeBrigade('hrhb_travnik_brigade', {
                        faction: 'HRHB',
                        corps_id: 'hvo_central_bosnia',
                        location_osid: 'op:novi_travnik:rat_2',
                        home_osid: 'op:novi_travnik:rat_2',
                    }),
                    brig_truthful_unresolved: makeBrigade('brig_truthful_unresolved', {
                        location_osid: 'op:rogatica:rogatica_2',
                    }),
                },
                corps_front_sectors: {
                    'sector:hvo_central_bosnia:0': {
                        sector_id: 'sector:hvo_central_bosnia:0',
                        corps_id: 'hvo_central_bosnia',
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                    },
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                    },
                },
                unresolved_sector_brigades: ['brig_truthful_unresolved'],
                sector_intel: {
                    'sector:vrs_drina:0': [{ offensive_signs: true }],
                },
            },
        };

        expect(collectAssignmentCompletenessIssues(state)).toEqual([
            {
                id: 'brig_truthful_unresolved',
                corps: 'vrs_drina',
                faction: 'RS',
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('brig_truthful_unresolved'))).toBe(true);
        expect(result.lines.some((line) => line.includes('hrhb_travnik_brigade'))).toBe(false);
    });

    it('fails when a sector packet keeps a brigade it does not physically own', () => {
        const state = {
            meta: { turn: 10 },
            __contact_graph_edges: [
                { a: 'op:test:front', b: 'op:test:territory' },
                { a: 'op:test:front', b: 'op:test:enemy' },
            ],
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:territory': 'RS',
                    'op:test:other_sector': 'RS',
                    'op:test:enemy': 'RBiH',
                },
            },
            military: {
                formations: {
                    brig_false_owner: makeBrigade('brig_false_owner', {
                        location_osid: 'op:test:other_sector',
                        assignment: null,
                    }),
                },
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        edge_ids: ['op:test:front__op:test:enemy'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['op:test:front__op:test:enemy'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                        territory_osids: ['op:test:front', 'op:test:territory'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: ['brig_false_owner'],
                        rear_brigade_ids: [],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectPhysicalSectorOwnershipIssues(state)).toEqual([
            {
                id: 'brig_false_owner',
                sector: 'sector:vrs_drina:0',
                role: 'reserve',
                location: 'op:test:other_sector',
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('brig_false_owner'))).toBe(true);
        expect(result.lines.some((line) => line.includes('physically own'))).toBe(true);
    });

    it('fails when a sector front bucket serializes a physical reserve as a line holder', () => {
        const state = {
            meta: { turn: 10 },
            __contact_graph_edges: [
                { a: 'op:test:front', b: 'op:test:reserve' },
                { a: 'op:test:front', b: 'op:test:enemy' },
            ],
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:reserve': 'RS',
                    'op:test:enemy': 'RBiH',
                },
            },
            military: {
                formations: {
                    brig_reserve_as_front: makeBrigade('brig_reserve_as_front', {
                        location_osid: 'op:test:reserve',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'reserve' },
                    }),
                },
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        edge_ids: ['op:test:front__op:test:enemy'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['op:test:front__op:test:enemy'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                        territory_osids: ['op:test:front', 'op:test:reserve'],
                        assigned_brigade_ids: ['brig_reserve_as_front'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectSectorRoleBucketSyncIssues(state)).toEqual([
            {
                id: 'brig_reserve_as_front',
                sector: 'sector:vrs_drina:0',
                bucket: 'assigned_brigade_ids',
                expected_role: 'front',
                assignment_role: 'reserve',
                physical_role: 'reserve',
                location: 'op:test:reserve',
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('Sector Role Buckets'))).toBe(true);
        expect(result.lines.some((line) => line.includes('brig_reserve_as_front'))).toBe(true);
    });

    it('allows rear bucket overflow brigades to sit in the one-hop reserve band when formation role is rear', () => {
        const state = {
            meta: { turn: 10 },
            __contact_graph_edges: [
                { a: 'op:test:front', b: 'op:test:reserve' },
                { a: 'op:test:front', b: 'op:test:enemy' },
            ],
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:reserve': 'RS',
                    'op:test:enemy': 'RBiH',
                },
            },
            military: {
                formations: {
                    brig_rear_overflow: makeBrigade('brig_rear_overflow', {
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'rear' },
                        location_osid: 'op:test:reserve',
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:test:front__op:test:enemy', a: 'op:test:front', b: 'op:test:enemy', side_a: 'RS', side_b: 'RBiH' },
                ],
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        edge_ids: ['op:test:front__op:test:enemy'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['op:test:front__op:test:enemy'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                        territory_osids: ['op:test:front', 'op:test:reserve'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: ['brig_rear_overflow'],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectSectorRoleBucketSyncIssues(state)).toEqual([]);
    });

    it('fails when a serialized sector spans disconnected frontline/territory pieces', () => {
        const state = {
            meta: { turn: 10 },
            __contact_graph_edges: [
                { a: 'op:test:a', b: 'op:test:b' },
                { a: 'op:test:c', b: 'op:test:d' },
                { a: 'op:test:a', b: 'op:test:enemy_1' },
                { a: 'op:test:c', b: 'op:test:enemy_2' },
            ],
            military: {
                war_front_edges_osid: [
                    { edge_id: 'op:test:a__op:test:enemy_1', a: 'op:test:a', b: 'op:test:enemy_1', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:c__op:test:enemy_2', a: 'op:test:c', b: 'op:test:enemy_2', side_a: 'RS', side_b: 'RBiH' },
                ],
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        edge_ids: ['op:test:a__op:test:enemy_1', 'op:test:c__op:test:enemy_2'],
                        sub_segments: [
                            {
                                sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                                edge_ids: ['op:test:a__op:test:enemy_1'],
                                friendly_osids: ['op:test:a'],
                                enemy_osids: ['op:test:enemy_1'],
                                length_edges: 1,
                                primary_brigade_ids: [],
                            },
                            {
                                sub_segment_id: 'subseg:sector:vrs_drina:0:1',
                                edge_ids: ['op:test:c__op:test:enemy_2'],
                                friendly_osids: ['op:test:c'],
                                enemy_osids: ['op:test:enemy_2'],
                                length_edges: 1,
                                primary_brigade_ids: [],
                            },
                        ],
                        territory_osids: ['op:test:a', 'op:test:b', 'op:test:c', 'op:test:d'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectSectorGeometryIssues(state)).toEqual([
            {
                sector: 'sector:vrs_drina:0',
                pieces: 2,
                osids: ['op:test:a', 'op:test:b', 'op:test:c', 'op:test:d'],
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('sector:vrs_drina:0'))).toBe(true);
        expect(result.lines.some((line) => line.includes('disconnected frontline/territory pieces'))).toBe(true);
    });

    it('fails when a below-floor sector had a legal same-corps donor available', () => {
        const state = {
            meta: { turn: 40 },
            __contact_graph_edges: [
                { a: 'op:test:donor_front', b: 'op:test:donor_rear' },
                { a: 'op:test:donor_rear', b: 'op:test:recipient_rear' },
                { a: 'op:test:recipient_rear', b: 'op:test:recipient_front_a' },
                { a: 'op:test:recipient_front_b', b: 'op:test:recipient_rear' },
                { a: 'op:test:donor_front', b: 'op:test:enemy_donor' },
                { a: 'op:test:recipient_front_a', b: 'op:test:enemy_recipient_a' },
                { a: 'op:test:recipient_front_b', b: 'op:test:enemy_recipient_b' },
            ],
            political: {
                political_controllers: {
                    'op:test:donor_front': 'RS',
                    'op:test:donor_rear': 'RS',
                    'op:test:recipient_rear': 'RS',
                    'op:test:recipient_front_a': 'RS',
                    'op:test:recipient_front_b': 'RS',
                    'op:test:enemy_donor': 'RBiH',
                    'op:test:enemy_recipient_a': 'RBiH',
                    'op:test:enemy_recipient_b': 'RBiH',
                },
            },
            military: {
                formations: {
                    donor_a: makeBrigade('donor_a', {
                        location_osid: 'op:test:donor_front',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'front' },
                    }),
                    donor_b: makeBrigade('donor_b', {
                        location_osid: 'op:test:donor_front',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'front' },
                    }),
                    recipient_only: makeBrigade('recipient_only', {
                        location_osid: 'op:test:recipient_front_a',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:1', role: 'front' },
                    }),
                },
                corps_command: {},
                unresolved_sector_brigades: [],
                war_front_edges_osid: [
                    { edge_id: 'op:test:donor_front__op:test:enemy_donor', a: 'op:test:donor_front', b: 'op:test:enemy_donor', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:recipient_front_a__op:test:enemy_recipient_a', a: 'op:test:recipient_front_a', b: 'op:test:enemy_recipient_a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:recipient_front_b__op:test:enemy_recipient_b', a: 'op:test:recipient_front_b', b: 'op:test:enemy_recipient_b', side_a: 'RS', side_b: 'RBiH' },
                ],
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 4,
                        threat_ratio: 10,
                        edge_ids: ['op:test:donor_front__op:test:enemy_donor'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['op:test:donor_front__op:test:enemy_donor'],
                            friendly_osids: ['op:test:donor_front'],
                            enemy_osids: ['op:test:enemy_donor'],
                            length_edges: 4,
                            primary_brigade_ids: ['donor_a', 'donor_b'],
                        }],
                        territory_osids: ['op:test:donor_front', 'op:test:donor_rear', 'op:test:recipient_rear', 'op:test:recipient_front_a', 'op:test:recipient_front_b'],
                        assigned_brigade_ids: ['donor_a', 'donor_b'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                    'sector:vrs_drina:1': {
                        sector_id: 'sector:vrs_drina:1',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 16,
                        threat_ratio: 300,
                        edge_ids: [
                            'op:test:recipient_front_a__op:test:enemy_recipient_a',
                            'op:test:recipient_front_b__op:test:enemy_recipient_b',
                        ],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:1:0',
                            edge_ids: [
                                'op:test:recipient_front_a__op:test:enemy_recipient_a',
                                'op:test:recipient_front_b__op:test:enemy_recipient_b',
                            ],
                            friendly_osids: ['op:test:recipient_front_a', 'op:test:recipient_front_b'],
                            enemy_osids: ['op:test:enemy_recipient_a', 'op:test:enemy_recipient_b'],
                            length_edges: 16,
                            primary_brigade_ids: ['recipient_only'],
                        }],
                        territory_osids: ['op:test:recipient_front_a', 'op:test:recipient_front_b', 'op:test:recipient_rear'],
                        assigned_brigade_ids: ['recipient_only'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                },
                sector_intel: {
                    'sector:vrs_drina:1': [{ offensive_signs: true }],
                },
            },
        };

        expect(collectSectorFloorShortfallIssues(state)).toEqual({
            missed_reinforcement: [
                expect.objectContaining({
                    sector: 'sector:vrs_drina:1',
                    assigned: 1,
                    needed: 2,
                    donor_candidates: [
                        expect.objectContaining({
                            brigade_id: 'donor_a',
                            donor_sector_id: 'sector:vrs_drina:0',
                            donor_role: 'front',
                            distance: 3,
                        }),
                        expect.objectContaining({
                            brigade_id: 'donor_b',
                            donor_sector_id: 'sector:vrs_drina:0',
                            donor_role: 'front',
                            distance: 3,
                        }),
                    ],
                }),
            ],
            unavoidable_shortfall: [],
        });

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('below floor 1/2'))).toBe(true);
        expect(result.lines.some((line) => line.includes('legal donor'))).toBe(true);
    });

    it('treats an own-sector reachable rear brigade as a missed floor-completion donor', () => {
        const state = {
            meta: { turn: 40 },
            __contact_graph_edges: [
                { a: 'op:test:recipient_front_a', b: 'op:test:recipient_rear' },
                { a: 'op:test:recipient_front_b', b: 'op:test:recipient_rear' },
                { a: 'op:test:recipient_front_a', b: 'op:test:enemy_a' },
                { a: 'op:test:recipient_front_b', b: 'op:test:enemy_b' },
            ],
            political: {
                political_controllers: {
                    'op:test:recipient_front_a': 'RS',
                    'op:test:recipient_front_b': 'RS',
                    'op:test:recipient_rear': 'RS',
                    'op:test:enemy_a': 'RBiH',
                    'op:test:enemy_b': 'RBiH',
                },
            },
            military: {
                formations: {
                    recipient_front: makeBrigade('recipient_front', {
                        location_osid: 'op:test:recipient_front_a',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:1', role: 'front' },
                    }),
                    recipient_rear: makeBrigade('recipient_rear', {
                        location_osid: 'op:test:recipient_rear',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:1', role: 'rear' },
                    }),
                },
                corps_command: {},
                unresolved_sector_brigades: [],
                war_front_edges_osid: [
                    { edge_id: 'op:test:recipient_front_a__op:test:enemy_a', a: 'op:test:recipient_front_a', b: 'op:test:enemy_a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:recipient_front_b__op:test:enemy_b', a: 'op:test:recipient_front_b', b: 'op:test:enemy_b', side_a: 'RS', side_b: 'RBiH' },
                ],
                corps_front_sectors: {
                    'sector:vrs_drina:1': {
                        sector_id: 'sector:vrs_drina:1',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 16,
                        threat_ratio: 20,
                        edge_ids: [
                            'op:test:recipient_front_a__op:test:enemy_a',
                            'op:test:recipient_front_b__op:test:enemy_b',
                        ],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:1:0',
                            edge_ids: [
                                'op:test:recipient_front_a__op:test:enemy_a',
                                'op:test:recipient_front_b__op:test:enemy_b',
                            ],
                            friendly_osids: ['op:test:recipient_front_a', 'op:test:recipient_front_b'],
                            enemy_osids: ['op:test:enemy_a', 'op:test:enemy_b'],
                            length_edges: 16,
                            primary_brigade_ids: ['recipient_front'],
                        }],
                        territory_osids: ['op:test:recipient_front_a', 'op:test:recipient_front_b', 'op:test:recipient_rear'],
                        assigned_brigade_ids: ['recipient_front'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: ['recipient_rear'],
                    },
                },
                sector_intel: {
                    'sector:vrs_drina:1': [{ offensive_signs: true }],
                },
            },
        };

        expect(collectSectorFloorShortfallIssues(state)).toEqual({
            missed_reinforcement: [
                expect.objectContaining({
                    sector: 'sector:vrs_drina:1',
                    donor_candidates: [
                        expect.objectContaining({
                            brigade_id: 'recipient_rear',
                            donor_sector_id: 'sector:vrs_drina:1',
                            donor_role: 'rear',
                            distance: 1,
                        }),
                    ],
                }),
            ],
            unavoidable_shortfall: [],
        });
    });

    it('classifies below-floor sectors with no legal donor as unavoidable shortfall instead of missed reinforcement', () => {
        const state = {
            meta: { turn: 40 },
            __contact_graph_edges: [
                { a: 'op:test:isolated_a', b: 'op:test:isolated_b' },
                { a: 'op:test:isolated_a', b: 'op:test:enemy_a' },
                { a: 'op:test:recipient_front', b: 'op:test:recipient_rear' },
                { a: 'op:test:recipient_front_b', b: 'op:test:recipient_rear' },
                { a: 'op:test:recipient_front', b: 'op:test:enemy_b' },
                { a: 'op:test:recipient_front_b', b: 'op:test:enemy_c' },
            ],
            political: {
                political_controllers: {
                    'op:test:isolated_a': 'RS',
                    'op:test:isolated_b': 'RS',
                    'op:test:recipient_front': 'RS',
                    'op:test:recipient_front_b': 'RS',
                    'op:test:recipient_rear': 'RS',
                    'op:test:enemy_a': 'RBiH',
                    'op:test:enemy_b': 'RBiH',
                    'op:test:enemy_c': 'RBiH',
                },
            },
            military: {
                formations: {
                    donor_only: makeBrigade('donor_only', {
                        location_osid: 'op:test:isolated_a',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'front' },
                    }),
                    recipient_only: makeBrigade('recipient_only', {
                        location_osid: 'op:test:recipient_front',
                        assignment: { kind: 'sector', sector_id: 'sector:vrs_drina:1', role: 'front' },
                    }),
                },
                corps_command: {},
                unresolved_sector_brigades: [],
                war_front_edges_osid: [
                    { edge_id: 'op:test:isolated_a__op:test:enemy_a', a: 'op:test:isolated_a', b: 'op:test:enemy_a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:recipient_front__op:test:enemy_b', a: 'op:test:recipient_front', b: 'op:test:enemy_b', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:recipient_front_b__op:test:enemy_c', a: 'op:test:recipient_front_b', b: 'op:test:enemy_c', side_a: 'RS', side_b: 'RBiH' },
                ],
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 4,
                        threat_ratio: 10,
                        edge_ids: ['op:test:isolated_a__op:test:enemy_a'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['op:test:isolated_a__op:test:enemy_a'],
                            friendly_osids: ['op:test:isolated_a'],
                            enemy_osids: ['op:test:enemy_a'],
                            length_edges: 4,
                            primary_brigade_ids: ['donor_only'],
                        }],
                        territory_osids: ['op:test:isolated_a', 'op:test:isolated_b'],
                        assigned_brigade_ids: ['donor_only'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                    'sector:vrs_drina:1': {
                        sector_id: 'sector:vrs_drina:1',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 16,
                        threat_ratio: 300,
                        edge_ids: ['op:test:recipient_front__op:test:enemy_b', 'op:test:recipient_front_b__op:test:enemy_c'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:1:0',
                            edge_ids: ['op:test:recipient_front__op:test:enemy_b', 'op:test:recipient_front_b__op:test:enemy_c'],
                            friendly_osids: ['op:test:recipient_front', 'op:test:recipient_front_b'],
                            enemy_osids: ['op:test:enemy_b', 'op:test:enemy_c'],
                            length_edges: 16,
                            primary_brigade_ids: ['recipient_only'],
                        }],
                        territory_osids: ['op:test:recipient_front', 'op:test:recipient_front_b', 'op:test:recipient_rear'],
                        assigned_brigade_ids: ['recipient_only'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                    },
                },
                sector_intel: {
                    'sector:vrs_drina:1': [{ offensive_signs: true }],
                },
            },
        };

        expect(collectSectorFloorShortfallIssues(state)).toEqual({
            missed_reinforcement: [],
            unavoidable_shortfall: [
                expect.objectContaining({
                    sector: 'sector:vrs_drina:1',
                    assigned: 1,
                    needed: 2,
                    donor_candidates: [],
                }),
            ],
        });

        const result = validateState(state, 'synthetic');
        expect(result.lines.some((line) => line.includes('below floor 1/2 with no legal same-corps donor'))).toBe(true);
        expect(result.lines.some((line) => line.includes('legal donor(s) available'))).toBe(false);
    });

    it('fails hard on empty contested sectors and wide undefended subsegments', () => {
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {},
                corps_front_sectors: {
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        length_edges: 3,
                        edge_ids: ['e1', 'e2', 'e3'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        territory_osids: ['op:test:front'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:vrs_drina:0:0',
                            edge_ids: ['e1', 'e2', 'e3'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                            primary_brigade_ids: [],
                            length_edges: 3,
                            gap: true,
                        }],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectEmptyContestedSectorIssues(state)).toEqual([
            { sector: 'sector:vrs_drina:0', length_edges: 3 },
        ]);
        expect(collectUndefendedFrontSubsegmentIssues(state)).toEqual([
            { sector: 'sector:vrs_drina:0', sub_segment_id: 'subseg:sector:vrs_drina:0:0', length_edges: 3 },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(2);
        expect(result.lines.some((line) => line.includes('Empty Contested Sectors'))).toBe(true);
        expect(result.lines.some((line) => line.includes('Undefended Front Subsegments'))).toBe(true);
    });

    it('does not accuse canonical unstaffed-front packets as empty contested sectors', () => {
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {},
                corps_front_sectors: {
                    'sector:hvo_central_bosnia:2': {
                        sector_id: 'sector:hvo_central_bosnia:2',
                        corps_id: 'hvo_central_bosnia',
                        faction: 'HRHB',
                        length_edges: 1,
                        edge_ids: ['e1'],
                        unstaffed_front: true,
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        territory_osids: ['op:test:front'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:hvo_central_bosnia:2:0',
                            edge_ids: ['e1'],
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                            primary_brigade_ids: [],
                            length_edges: 1,
                            gap: true,
                        }],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectEmptyContestedSectorIssues(state)).toEqual([]);
    });

    it('fails hard when undefended territory sits adjacent to an enemy brigade on a live war edge', () => {
        const state = {
            meta: { turn: 40 },
            political: {
                political_controllers: {
                    'op:test:friendly': 'RBiH',
                    'op:test:enemy': 'RS',
                },
            },
            military: {
                formations: {
                    rs_attacker: makeBrigade('rs_attacker', {
                        faction: 'RS',
                        corps_id: 'vrs_drina',
                        location_osid: 'op:test:enemy',
                    }),
                },
                war_front_edges_osid: [{
                    edge_id: 'op:test:enemy__op:test:friendly',
                    a: 'op:test:enemy',
                    b: 'op:test:friendly',
                    side_a: 'RS',
                    side_b: 'RBiH',
                }],
                corps_front_sectors: {},
                unresolved_sector_brigades: [],
            },
        };

        expect(collectAdjacentUncontestedTerritoryIssues(state)).toEqual([
            {
                osid: 'op:test:friendly',
                faction: 'RBiH',
                enemy_osid: 'op:test:enemy',
                enemy_faction: 'RS',
                enemy_brigades: ['rs_attacker'],
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('Adjacent Uncontested Territory'))).toBe(true);
        expect(result.lines.some((line) => line.includes('op:test:friendly'))).toBe(true);
    });

    it('fails when a live war-edge faction side is missing a same-faction sector owner even if the physical edge exists', () => {
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {},
                war_front_edges_osid: [{
                    edge_id: 'op:test:hrhb_front__op:test:rs_front',
                    a: 'op:test:hrhb_front',
                    b: 'op:test:rs_front',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
                corps_front_sectors: {
                    'sector:vrs_1st_krajina:0': {
                        sector_id: 'sector:vrs_1st_krajina:0',
                        corps_id: 'vrs_1st_krajina',
                        faction: 'RS',
                        edge_ids: ['op:test:hrhb_front__op:test:rs_front'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        territory_osids: ['op:test:rs_front'],
                        sub_segments: [],
                    },
                },
                unresolved_sector_brigades: [],
            },
        };

        expect(collectWarFrontSectorCoverageIssues(state)).toEqual({
            missing: ['HRHB::op:test:hrhb_front__op:test:rs_front'],
            extra: [],
        });

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBeGreaterThanOrEqual(1);
        expect(result.lines.some((line) => line.includes('War-Front Faction-Side Coverage'))).toBe(true);
        expect(result.lines.some((line) => line.includes('war-front faction-side missing from sector layer: HRHB::op:test:hrhb_front__op:test:rs_front'))).toBe(true);
    });
});
