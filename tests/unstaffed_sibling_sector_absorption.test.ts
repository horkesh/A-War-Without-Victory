import { describe, expect, it } from 'vitest';

import { absorbUnstaffedSiblingFrontSectors } from '../src/sim/combat/corps_front_sectors';
import { MAX_SECTOR_EDGES } from '../src/sim/combat/corps_front_sectors_constants';

type SectorLike = {
    sector_id: string;
    corps_id: string;
    faction: string;
    opposing_factions: string[];
    assigned_brigade_ids: string[];
    reserve_brigade_ids: string[];
    rear_brigade_ids: string[];
    edge_ids: string[];
    length_edges: number;
    territory_osids: string[];
    density: number;
    threat_ratio: number;
    defensive_power: number;
    sector_stance: 'defend' | 'probe' | 'attack';
    stance_source: 'bot' | 'player' | 'script';
    sub_segments: Array<{
        sub_segment_id: string;
        friendly_osids: string[];
        enemy_osids: string[];
        edge_ids: string[];
        length_edges: number;
        primary_brigade_ids: string[];
    }>;
};

function makeSector(overrides: Partial<SectorLike>): SectorLike {
    const sectorId = overrides.sector_id ?? 'sector:test:0';
    const edgeIds = overrides.edge_ids ?? [];
    return {
        sector_id: sectorId,
        corps_id: overrides.corps_id ?? 'corps:test',
        faction: overrides.faction ?? 'RS',
        opposing_factions: overrides.opposing_factions ?? ['RBiH'],
        assigned_brigade_ids: overrides.assigned_brigade_ids ?? [],
        reserve_brigade_ids: overrides.reserve_brigade_ids ?? [],
        rear_brigade_ids: overrides.rear_brigade_ids ?? [],
        edge_ids: edgeIds,
        length_edges: overrides.length_edges ?? edgeIds.length,
        territory_osids: overrides.territory_osids ?? [],
        density: overrides.density ?? 0,
        threat_ratio: overrides.threat_ratio ?? 0,
        defensive_power: overrides.defensive_power ?? 0,
        sector_stance: overrides.sector_stance ?? 'defend',
        stance_source: overrides.stance_source ?? 'bot',
        sub_segments: overrides.sub_segments ?? [
            {
                sub_segment_id: `subseg:${sectorId}:0`,
                friendly_osids: overrides.territory_osids ?? [],
                enemy_osids: ['op:enemy:0'],
                edge_ids: edgeIds,
                length_edges: edgeIds.length,
                primary_brigade_ids: [],
            },
        ],
    };
}

describe('absorbUnstaffedSiblingFrontSectors', () => {
    it('merges multiple empty sibling sectors into the live recipient without dropping earlier edges', () => {
        const recipient = makeSector({
            sector_id: 'sector:rs:test:0',
            assigned_brigade_ids: ['rs_test_brigade'],
            edge_ids: ['op:test:shared__op:enemy:a'],
            territory_osids: ['op:test:shared'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:0:0',
                friendly_osids: ['op:test:shared'],
                enemy_osids: ['op:enemy:a'],
                edge_ids: ['op:test:shared__op:enemy:a'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });
        const targetA = makeSector({
            sector_id: 'sector:rs:test:1',
            edge_ids: ['op:test:shared__op:enemy:b'],
            territory_osids: ['op:test:shared'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:1:0',
                friendly_osids: ['op:test:shared'],
                enemy_osids: ['op:enemy:b'],
                edge_ids: ['op:test:shared__op:enemy:b'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });
        const targetB = makeSector({
            sector_id: 'sector:rs:test:2',
            edge_ids: ['op:test:shared__op:enemy:c'],
            territory_osids: ['op:test:shared'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:2:0',
                friendly_osids: ['op:test:shared'],
                enemy_osids: ['op:enemy:c'],
                edge_ids: ['op:test:shared__op:enemy:c'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });

        const sectors = {
            [recipient.sector_id]: recipient,
            [targetA.sector_id]: targetA,
            [targetB.sector_id]: targetB,
        } as Record<string, any>;
        const factionSectors = [recipient, targetA, targetB] as any[];

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            factionSectors,
            new Map(),
            new Map(),
            new Map(),
            new Map(),
        );

        expect(changed).toBe(true);
        expect(sectors[targetA.sector_id]).toBeUndefined();
        expect(sectors[targetB.sector_id]).toBeUndefined();
        expect(new Set(sectors[recipient.sector_id].edge_ids)).toEqual(
            new Set(['op:test:shared__op:enemy:a', 'op:test:shared__op:enemy:b', 'op:test:shared__op:enemy:c']),
        );
    });

    it('refuses to absorb a sibling fragment when the merged front would become non-contiguous', () => {
        const recipient = makeSector({
            sector_id: 'sector:rs:test:0',
            assigned_brigade_ids: ['rs_test_brigade'],
            edge_ids: ['op:a:one__op:e:one'],
            territory_osids: ['op:a:one'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:0:0',
                friendly_osids: ['op:a:one'],
                enemy_osids: ['op:e:one'],
                edge_ids: ['op:a:one__op:e:one'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });
        const target = makeSector({
            sector_id: 'sector:rs:test:1',
            edge_ids: ['op:b:two__op:e:two'],
            territory_osids: ['op:b:two'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:1:0',
                friendly_osids: ['op:b:two'],
                enemy_osids: ['op:e:two'],
                edge_ids: ['op:b:two__op:e:two'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });

        const sectors = {
            [recipient.sector_id]: recipient,
            [target.sector_id]: target,
        } as Record<string, any>;

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            [recipient, target] as any[],
            new Map(),
            new Map([
                ['op:a:one__op:e:one', { a: 'op:a:one', b: 'op:e:one', side_a: 'RS', side_b: 'RBiH' }],
                ['op:b:two__op:e:two', { a: 'op:b:two', b: 'op:e:two', side_a: 'RS', side_b: 'RBiH' }],
            ]),
            new Map(),
            new Map(),
        );

        expect(changed).toBe(false);
        expect(Object.keys(sectors).sort()).toEqual(['sector:rs:test:0', 'sector:rs:test:1']);
    });

    it('refuses to absorb a sibling fragment when the merged front would exceed the hard edge cap', () => {
        const recipientEdges = Array.from({ length: MAX_SECTOR_EDGES }, (_, i) => `op:test:shared__op:enemy:${i}`);
        const recipient = makeSector({
            sector_id: 'sector:rs:test:0',
            assigned_brigade_ids: ['rs_test_brigade'],
            edge_ids: recipientEdges,
            length_edges: recipientEdges.length,
            territory_osids: ['op:test:shared'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:0:0',
                friendly_osids: ['op:test:shared'],
                enemy_osids: recipientEdges.map((_, i) => `op:enemy:${i}`),
                edge_ids: recipientEdges,
                length_edges: recipientEdges.length,
                primary_brigade_ids: [],
            }],
        });
        const target = makeSector({
            sector_id: 'sector:rs:test:1',
            edge_ids: ['op:test:shared__op:enemy:overflow'],
            territory_osids: ['op:test:shared'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:rs:test:1:0',
                friendly_osids: ['op:test:shared'],
                enemy_osids: ['op:enemy:overflow'],
                edge_ids: ['op:test:shared__op:enemy:overflow'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
        });

        const sectors = {
            [recipient.sector_id]: recipient,
            [target.sector_id]: target,
        } as Record<string, any>;
        const factionSectors = [recipient, target] as any[];

        const changed = absorbUnstaffedSiblingFrontSectors(
            sectors,
            factionSectors,
            new Map(),
            new Map(
                [...recipientEdges, 'op:test:shared__op:enemy:overflow'].map((edgeId) => [
                    edgeId,
                    { a: 'op:test:shared', b: edgeId.split('__')[1]!, side_a: 'RS', side_b: 'RBiH' },
                ]),
            ),
            new Map(),
            new Map(),
        );

        expect(changed).toBe(false);
        expect(Object.keys(sectors).sort()).toEqual(['sector:rs:test:0', 'sector:rs:test:1']);
        expect(sectors[recipient.sector_id].edge_ids).toHaveLength(MAX_SECTOR_EDGES);
    });
});
