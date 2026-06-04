import { describe, expect, it } from 'vitest';

import {
    absorbUnstaffedSiblingFrontSectors,
    sealWarFrontFactionSideCoverage,
} from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, FactionId } from '../src/state/game_state.js';

function makeSector(overrides: Partial<CorpsFrontSector>): CorpsFrontSector {
    return {
        sector_id: 'sector:arbih_2nd_corps:0',
        corps_id: 'arbih_2nd_corps' as never,
        faction: 'RBiH' as FactionId,
        sub_segments: [{
            sub_segment_id: 'subseg:rbih:0',
            edge_ids: ['op:ilijas:krivajevici__op:vares:ravne'],
            friendly_osids: ['op:vares:ravne'],
            enemy_osids: ['op:ilijas:krivajevici'],
            length_edges: 1,
            primary_brigade_ids: [],
        }],
        edge_ids: ['op:ilijas:krivajevici__op:vares:ravne'],
        territory_osids: ['op:vares:ravne', 'op:olovo:olovo_2'],
        length_edges: 1,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        opposing_factions: ['RS' as FactionId],
        density: 0,
        defensive_power: 0,
        threat_ratio: 1,
        sector_stance: 'balanced',
        stance_source: 'bot',
        ...overrides,
    } as CorpsFrontSector;
}

describe('final sector war-front faction-side coverage', () => {
    it('recovers a missing faction-side edge for an unstaffed friendly salient', () => {
        const sectors: Record<string, CorpsFrontSector> = {
            'sector:arbih_2nd_corps:0': makeSector({}),
            'sector:vrs_sarajevo_romanija:0': makeSector({
                sector_id: 'sector:vrs_sarajevo_romanija:0',
                corps_id: 'vrs_sarajevo_romanija' as never,
                faction: 'RS' as FactionId,
                edge_ids: ['op:vares:ravne__op:vares:toljenak'],
                territory_osids: ['op:vares:toljenak', 'op:ilijas:krivajevici'],
                sub_segments: [{
                    sub_segment_id: 'subseg:rs:0',
                    edge_ids: ['op:vares:ravne__op:vares:toljenak'],
                    friendly_osids: ['op:vares:toljenak'],
                    enemy_osids: ['op:vares:ravne'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
            }),
        };
        const osidFrontEdges = [
            {
                edge_id: 'op:vares:ravne__op:vares:toljenak',
                a: 'op:vares:ravne',
                b: 'op:vares:toljenak',
                side_a: 'RBiH' as FactionId,
                side_b: 'RS' as FactionId,
            },
            {
                edge_id: 'op:ilijas:krivajevici__op:vares:ravne',
                a: 'op:ilijas:krivajevici',
                b: 'op:vares:ravne',
                side_a: 'RS' as FactionId,
                side_b: 'RBiH' as FactionId,
            },
        ];
        const edgeMeta = new Map(osidFrontEdges.map((edge) => [edge.edge_id, edge]));
        const adjacency = new Map<string, string[]>([
            ['op:vares:ravne', ['op:vares:toljenak', 'op:ilijas:krivajevici']],
            ['op:vares:toljenak', ['op:vares:ravne']],
            ['op:ilijas:krivajevici', ['op:vares:ravne']],
        ]);

        sealWarFrontFactionSideCoverage(
            sectors,
            osidFrontEdges,
            adjacency as never,
            edgeMeta,
        );

        expect(sectors['sector:arbih_2nd_corps:0']!.edge_ids).toContain('op:vares:ravne__op:vares:toljenak');
        expect(sectors['sector:arbih_2nd_corps:0']!.sub_segments[0]!.friendly_osids).toContain('op:vares:ravne');
        expect(sectors['sector:arbih_2nd_corps:0']!.sub_segments[0]!.enemy_osids).toContain('op:vares:toljenak');
        expect(sectors['sector:vrs_sarajevo_romanija:0']!.edge_ids).toContain('op:vares:ravne__op:vares:toljenak');
    });

    it('does not attach a missing edge to an unrelated same-faction sector', () => {
        const sectors: Record<string, CorpsFrontSector> = {
            'sector:arbih_2nd_corps:0': makeSector({
                edge_ids: ['op:somewhere:front__op:somewhere:enemy'],
                territory_osids: ['op:somewhere:front'],
                sub_segments: [{
                    sub_segment_id: 'subseg:rbih:unrelated',
                    edge_ids: ['op:somewhere:front__op:somewhere:enemy'],
                    friendly_osids: ['op:somewhere:front'],
                    enemy_osids: ['op:somewhere:enemy'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
            }),
        };
        const osidFrontEdges = [{
            edge_id: 'op:vares:ravne__op:vares:toljenak',
            a: 'op:vares:ravne',
            b: 'op:vares:toljenak',
            side_a: 'RBiH' as FactionId,
            side_b: 'RS' as FactionId,
        }];
        const edgeMeta = new Map<string, { a: string; b: string; side_a: FactionId | null; side_b: FactionId | null }>([
            ['op:somewhere:front__op:somewhere:enemy', {
                a: 'op:somewhere:front',
                b: 'op:somewhere:enemy',
                side_a: 'RBiH' as FactionId,
                side_b: 'RS' as FactionId,
            }],
            [osidFrontEdges[0]!.edge_id, osidFrontEdges[0]!],
        ]);

        sealWarFrontFactionSideCoverage(
            sectors,
            osidFrontEdges,
            new Map<string, string[]>(),
            edgeMeta,
        );

        expect(sectors['sector:arbih_2nd_corps:0']!.edge_ids).not.toContain('op:vares:ravne__op:vares:toljenak');
    });

    it('absorbs an empty overlapping same-corps salient into its staffed sibling after final side coverage', () => {
        const sectors: Record<string, CorpsFrontSector> = {
            'sector:arbih_3rd_corps:1': makeSector({
                sector_id: 'sector:arbih_3rd_corps:1',
                corps_id: 'arbih_3rd_corps' as never,
                edge_ids: [
                    'op:bugojno:vesela_2__op:donji_vakuf:jemanlici',
                    'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2',
                ],
                territory_osids: ['op:donji_vakuf:jemanlici'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 2,
                sub_segments: [{
                    sub_segment_id: 'subseg:sector:arbih_3rd_corps:1:0',
                    edge_ids: [
                        'op:bugojno:vesela_2__op:donji_vakuf:jemanlici',
                        'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2',
                    ],
                    friendly_osids: ['op:donji_vakuf:jemanlici'],
                    enemy_osids: ['op:bugojno:vesela_2', 'op:donji_vakuf:prusac_2'],
                    length_edges: 2,
                    primary_brigade_ids: [],
                    gap: true,
                }],
            }),
            'sector:arbih_3rd_corps:2': makeSector({
                sector_id: 'sector:arbih_3rd_corps:2',
                corps_id: 'arbih_3rd_corps' as never,
                edge_ids: [
                    'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici',
                    'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici',
                    'op:donji_vakuf:komar_2__op:donji_vakuf:korenici',
                ],
                territory_osids: ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:korenici'],
                assigned_brigade_ids: ['arbih_770th_slavna_mountain' as never],
                reserve_brigade_ids: [],
                length_edges: 3,
                sub_segments: [{
                    sub_segment_id: 'subseg:sector:arbih_3rd_corps:2:0',
                    edge_ids: [
                        'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici',
                        'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici',
                        'op:donji_vakuf:komar_2__op:donji_vakuf:korenici',
                    ],
                    friendly_osids: ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:korenici'],
                    enemy_osids: ['op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:komar_2'],
                    length_edges: 3,
                    primary_brigade_ids: ['arbih_770th_slavna_mountain' as never],
                }],
            }),
        };
        const allEdges = [
            ['op:bugojno:vesela_2__op:donji_vakuf:jemanlici', 'op:bugojno:vesela_2', 'op:donji_vakuf:jemanlici'],
            ['op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2', 'op:donji_vakuf:jemanlici', 'op:donji_vakuf:prusac_2'],
            ['op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:jemanlici'],
            ['op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:korenici'],
            ['op:donji_vakuf:komar_2__op:donji_vakuf:korenici', 'op:donji_vakuf:komar_2', 'op:donji_vakuf:korenici'],
        ] as const;
        const edgeMeta = new Map(allEdges.map(([edge_id, a, b]) => [edge_id, {
            a,
            b,
            side_a: edge_id === 'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2' ? 'RBiH' as FactionId : 'RS' as FactionId,
            side_b: edge_id === 'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2' ? 'RS' as FactionId : 'RBiH' as FactionId,
        }]));
        const adjacency = new Map<string, string[]>([
            ['op:donji_vakuf:jemanlici', ['op:bugojno:vesela_2', 'op:donji_vakuf:prusac_2', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:korenici']],
            ['op:donji_vakuf:korenici', ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:komar_2']],
        ]);
        const sharedBoundaryAdj = new Map<string, string[]>([
            ['op:bugojno:vesela_2', ['op:donji_vakuf:donji_vakuf_2']],
            ['op:donji_vakuf:donji_vakuf_2', ['op:bugojno:vesela_2', 'op:donji_vakuf:jemanlici', 'op:donji_vakuf:korenici', 'op:donji_vakuf:komar_2', 'op:donji_vakuf:prusac_2']],
            ['op:donji_vakuf:jemanlici', ['op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:korenici']],
            ['op:donji_vakuf:korenici', ['op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:jemanlici']],
            ['op:donji_vakuf:komar_2', ['op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:prusac_2']],
            ['op:donji_vakuf:prusac_2', ['op:donji_vakuf:komar_2', 'op:donji_vakuf:donji_vakuf_2']],
        ]);

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            Object.values(sectors),
            adjacency as never,
            edgeMeta,
            sharedBoundaryAdj,
            sharedBoundaryAdj,
        );

        expect(changed).toBe(true);
        expect(sectors['sector:arbih_3rd_corps:1']).toBeUndefined();
        expect(sectors['sector:arbih_3rd_corps:2']!.edge_ids).toContain('op:bugojno:vesela_2__op:donji_vakuf:jemanlici');
        expect(sectors['sector:arbih_3rd_corps:2']!.assigned_brigade_ids).toEqual(['arbih_770th_slavna_mountain']);
    });

    it('does not absorb an empty sibling when the merged front would remain disconnected', () => {
        const sectors: Record<string, CorpsFrontSector> = {
            'sector:arbih_3rd_corps:1': makeSector({
                sector_id: 'sector:arbih_3rd_corps:1',
                corps_id: 'arbih_3rd_corps' as never,
                edge_ids: [
                    'op:bugojno:vesela_2__op:donji_vakuf:jemanlici',
                    'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2',
                ],
                territory_osids: ['op:donji_vakuf:jemanlici'],
                length_edges: 2,
                sub_segments: [{
                    sub_segment_id: 'subseg:sector:arbih_3rd_corps:1:0',
                    edge_ids: [
                        'op:bugojno:vesela_2__op:donji_vakuf:jemanlici',
                        'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2',
                    ],
                    friendly_osids: ['op:donji_vakuf:jemanlici'],
                    enemy_osids: ['op:bugojno:vesela_2', 'op:donji_vakuf:prusac_2'],
                    length_edges: 2,
                    primary_brigade_ids: [],
                }],
            }),
            'sector:arbih_3rd_corps:2': makeSector({
                sector_id: 'sector:arbih_3rd_corps:2',
                corps_id: 'arbih_3rd_corps' as never,
                edge_ids: [
                    'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici',
                    'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici',
                    'op:donji_vakuf:komar_2__op:donji_vakuf:korenici',
                ],
                territory_osids: ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:korenici'],
                assigned_brigade_ids: ['arbih_770th_slavna_mountain' as never],
                length_edges: 3,
                sub_segments: [{
                    sub_segment_id: 'subseg:sector:arbih_3rd_corps:2:0',
                    edge_ids: [
                        'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici',
                        'op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici',
                        'op:donji_vakuf:komar_2__op:donji_vakuf:korenici',
                    ],
                    friendly_osids: ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:korenici'],
                    enemy_osids: ['op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:komar_2'],
                    length_edges: 3,
                    primary_brigade_ids: ['arbih_770th_slavna_mountain' as never],
                }],
            }),
        };
        const allEdges = [
            ['op:bugojno:vesela_2__op:donji_vakuf:jemanlici', 'op:bugojno:vesela_2', 'op:donji_vakuf:jemanlici'],
            ['op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2', 'op:donji_vakuf:jemanlici', 'op:donji_vakuf:prusac_2'],
            ['op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:jemanlici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:jemanlici'],
            ['op:donji_vakuf:donji_vakuf_2__op:donji_vakuf:korenici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:korenici'],
            ['op:donji_vakuf:komar_2__op:donji_vakuf:korenici', 'op:donji_vakuf:komar_2', 'op:donji_vakuf:korenici'],
        ] as const;
        const edgeMeta = new Map(allEdges.map(([edge_id, a, b]) => [edge_id, {
            a,
            b,
            side_a: edge_id === 'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2' ? 'RBiH' as FactionId : 'RS' as FactionId,
            side_b: edge_id === 'op:donji_vakuf:jemanlici__op:donji_vakuf:prusac_2' ? 'RS' as FactionId : 'RBiH' as FactionId,
        }]));
        const adjacency = new Map<string, string[]>([
            ['op:donji_vakuf:jemanlici', ['op:bugojno:vesela_2', 'op:donji_vakuf:prusac_2', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:korenici']],
            ['op:donji_vakuf:korenici', ['op:donji_vakuf:jemanlici', 'op:donji_vakuf:donji_vakuf_2', 'op:donji_vakuf:komar_2']],
        ]);

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            Object.values(sectors),
            adjacency as never,
            edgeMeta,
            new Map<string, string[]>(),
            new Map<string, string[]>(),
        );

        expect(changed).toBe(false);
        expect(sectors['sector:arbih_3rd_corps:1']).toBeDefined();
        expect(sectors['sector:arbih_3rd_corps:2']!.edge_ids).not.toContain('op:bugojno:vesela_2__op:donji_vakuf:jemanlici');
    });
});
