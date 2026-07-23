import { describe, expect, it } from 'vitest';

import { annotateUnstaffedFrontSectors } from '../src/sim/combat/corps_front_sectors';

function makeSector(overrides: Record<string, unknown>) {
    return {
        sector_id: 'sector:test:0',
        corps_id: 'corps:test',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: ['edge:test:0'],
        length_edges: 1,
        territory_osids: ['op:test:front'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        sub_segments: [{
            sub_segment_id: 'subseg:test:0',
            friendly_osids: ['op:test:front'],
            enemy_osids: ['op:enemy:front'],
            edge_ids: ['edge:test:0'],
            length_edges: 1,
            primary_brigade_ids: [],
        }],
        ...overrides,
    };
}

function makeAdjacency(pairs: Array<[string, string]>) {
    const adjacency = new Map<string, string[]>();
    for (const [a, b] of pairs) {
        adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
        adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
    }
    return adjacency as Map<any, any>;
}

describe('annotateUnstaffedFrontSectors', () => {
    it('does not mark an empty sector as unstaffed when a same-faction brigade can still reach its front', () => {
        const sectors = {
            'sector:rs:reachable': makeSector({
                sector_id: 'sector:rs:reachable',
                territory_osids: ['op:rs:front', 'op:rs:rear'],
                sub_segments: [{
                    sub_segment_id: 'subseg:rs:reachable:0',
                    friendly_osids: ['op:rs:front'],
                    enemy_osids: ['op:enemy:front'],
                    edge_ids: ['edge:rs:0'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['edge:rs:0'],
            }),
            'sector:rs:isolated': makeSector({
                sector_id: 'sector:rs:isolated',
                territory_osids: ['op:rs:isolated_front'],
                sub_segments: [{
                    sub_segment_id: 'subseg:rs:isolated:0',
                    friendly_osids: ['op:rs:isolated_front'],
                    enemy_osids: ['op:enemy:isolated_front'],
                    edge_ids: ['edge:rs:isolated'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['edge:rs:isolated'],
            }),
            'sector:rs:donor': makeSector({
                sector_id: 'sector:rs:donor',
                territory_osids: ['op:rs:rear', 'op:rs:donor_front'],
                reserve_brigade_ids: ['rs_relief'],
                sub_segments: [{
                    sub_segment_id: 'subseg:rs:donor:0',
                    friendly_osids: ['op:rs:donor_front'],
                    enemy_osids: ['op:enemy:donor_front'],
                    edge_ids: ['edge:rs:donor'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['edge:rs:donor'],
            }),
        } as Record<string, any>;

        const state = {
            factions: [{ id: 'RS' }],
            military: {},
            political: {
                political_controllers: {
                    'op:rs:front': 'RS',
                    'op:rs:rear': 'RS',
                    'op:rs:donor_front': 'RS',
                    'op:rs:isolated_front': 'RS',
                    'op:enemy:front': 'RBiH',
                    'op:enemy:donor_front': 'RBiH',
                    'op:enemy:isolated_front': 'RBiH',
                },
            },
        } as any;

        const formations = {
            rs_relief: {
                id: 'rs_relief',
                kind: 'brigade',
                faction: 'RS',
                corps_id: 'corps:test',
                status: 'active',
                location_osid: 'op:rs:rear',
            },
        } as any;

        const adjacency = makeAdjacency([
            ['op:rs:rear', 'op:rs:front'],
        ]);

        annotateUnstaffedFrontSectors(sectors, state, formations, adjacency);

        expect(sectors['sector:rs:reachable']!.unstaffed_front).toBeUndefined();
        expect(sectors['sector:rs:isolated']!.unstaffed_front).toBe(true);
    });

    it('marks a reachable front unstaffed when every same-corps donor must retain its line floor', () => {
        const target = makeSector({
            sector_id: 'sector:rs:target',
            territory_osids: ['op:rs:target'],
            sub_segments: [{
                sub_segment_id: 'subseg:rs:target:0',
                friendly_osids: ['op:rs:target'],
                enemy_osids: ['op:enemy:target'],
                edge_ids: ['edge:rs:target'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
            edge_ids: ['edge:rs:target'],
        }) as any;
        const donor = makeSector({
            sector_id: 'sector:rs:donor',
            territory_osids: ['op:rs:donor'],
            assigned_brigade_ids: ['rs_donor_1', 'rs_donor_2'],
            length_edges: 16,
            threat_ratio: 1,
            sub_segments: [{
                sub_segment_id: 'subseg:rs:donor:0',
                friendly_osids: ['op:rs:donor'],
                enemy_osids: ['op:enemy:donor'],
                edge_ids: ['edge:rs:donor'],
                length_edges: 16,
                primary_brigade_ids: ['rs_donor_1', 'rs_donor_2'],
            }],
            edge_ids: ['edge:rs:donor'],
        });
        const sectors = {
            'sector:rs:target': target,
            'sector:rs:donor': donor,
        } as Record<string, any>;
        const state = {
            factions: [{ id: 'RS' }],
            military: {},
            political: {
                political_controllers: {
                    'op:rs:target': 'RS',
                    'op:rs:donor': 'RS',
                    'op:enemy:target': 'RBiH',
                    'op:enemy:donor': 'RBiH',
                },
            },
        } as any;
        const formations = {
            rs_donor_1: {
                id: 'rs_donor_1',
                kind: 'brigade',
                faction: 'RS',
                corps_id: 'corps:test',
                status: 'active',
                location_osid: 'op:rs:donor',
            },
            rs_donor_2: {
                id: 'rs_donor_2',
                kind: 'brigade',
                faction: 'RS',
                corps_id: 'corps:test',
                status: 'active',
                location_osid: 'op:rs:donor',
            },
        } as any;
        const adjacency = makeAdjacency([
            ['op:rs:donor', 'op:rs:target'],
        ]);

        annotateUnstaffedFrontSectors(sectors, state, formations, adjacency);

        expect(target.unstaffed_front).toBe(true);
    });

    it('marks a connected front unstaffed when the only formation is enclave-locked outside it', () => {
        const sectors = {
            'sector:hrhb:outside-zepce': makeSector({
                sector_id: 'sector:hrhb:outside-zepce',
                corps_id: 'hvo_central_bosnia',
                faction: 'HRHB',
                territory_osids: ['op:teslic:kamenica_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:hrhb:outside-zepce:0',
                    friendly_osids: ['op:teslic:kamenica_2'],
                    enemy_osids: ['op:teslic:enemy'],
                    edge_ids: ['edge:hrhb:outside-zepce'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['edge:hrhb:outside-zepce'],
            }),
        } as Record<string, any>;

        const state = {
            factions: [{ id: 'HRHB' }],
            military: {},
            political: {
                political_controllers: {
                    'op:zepce:viniste_2': 'HRHB',
                    'op:teslic:kamenica_2': 'HRHB',
                    'op:teslic:enemy': 'RS',
                },
            },
        } as any;

        const formations = {
            hrhb_111th_brigade: {
                id: 'hrhb_111th_brigade',
                kind: 'brigade',
                faction: 'HRHB',
                corps_id: 'hvo_central_bosnia',
                status: 'active',
                location_osid: 'op:zepce:viniste_2',
                home_osid: 'op:zepce:viniste_2',
                tags: ['enclave'],
            },
        } as any;

        const adjacency = makeAdjacency([
            ['op:zepce:viniste_2', 'op:teslic:kamenica_2'],
        ]);

        annotateUnstaffedFrontSectors(sectors, state, formations, adjacency);

        expect(sectors['sector:hrhb:outside-zepce']!.unstaffed_front).toBe(true);
    });
});
