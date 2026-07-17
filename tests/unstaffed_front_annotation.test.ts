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
        } as Record<string, any>;

        const state = {
            factions: [{ id: 'RS' }],
            political: {
                political_controllers: {
                    'op:rs:front': 'RS',
                    'op:rs:rear': 'RS',
                    'op:rs:isolated_front': 'RS',
                    'op:enemy:front': 'RBiH',
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
