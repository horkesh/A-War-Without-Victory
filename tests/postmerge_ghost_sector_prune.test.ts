import { describe, expect, it } from 'vitest';

import { pruneGhostArtifactSectors } from '../src/sim/combat/corps_front_sectors.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
} from '../src/state/game_state.js';

function makeSubSegment(
    id: string,
    friendlyOsids: string[],
    edgeCount: number,
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, index) => `edge:${id}:${index}`),
        friendly_osids: friendlyOsids,
        enemy_osids: Array.from({ length: edgeCount }, (_, index) => `enemy:${id}:${index}`),
        length_edges: edgeCount,
        primary_brigade_ids: [],
    };
}

function makeSector(opts: {
    sectorId: string;
    friendlyOsids: string[];
    territoryOsids?: string[];
    assignedBrigadeIds?: string[];
    reserveBrigadeIds?: string[];
    edgeCount: number;
}): CorpsFrontSector {
    const subSegment = makeSubSegment(`subseg:${opts.sectorId}`, opts.friendlyOsids, opts.edgeCount);
    return {
        sector_id: opts.sectorId,
        corps_id: 'arbih_1st_corps',
        faction: 'RBiH' as FactionId,
        opposing_factions: ['RS' as FactionId],
        edge_ids: [...subSegment.edge_ids],
        sub_segments: [subSegment],
        length_edges: opts.edgeCount,
        territory_osids: opts.territoryOsids ?? [],
        assigned_brigade_ids: opts.assignedBrigadeIds ?? [],
        reserve_brigade_ids: opts.reserveBrigadeIds ?? [],
        density: 0,
        threat_ratio: 9999,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

describe('pruneGhostArtifactSectors', () => {
    it('removes late ghost sectors that still have edges but no territory or brigades', () => {
        const keeper = makeSector({
            sectorId: 'sector:arbih_1st_corps:1',
            friendlyOsids: ['op:foca:donje_zesce'],
            territoryOsids: ['op:foca:donje_zesce'],
            assignedBrigadeIds: ['arbih_843rd_light'],
            edgeCount: 9,
        });
        const ghost = makeSector({
            sectorId: 'sector:arbih_1st_corps:8',
            friendlyOsids: ['op:foca:izbisno', 'op:kalinovik:varos_2'],
            territoryOsids: [],
            assignedBrigadeIds: [],
            reserveBrigadeIds: [],
            edgeCount: 8,
        });

        const sectors = {
            [keeper.sector_id]: keeper,
            [ghost.sector_id]: ghost,
        };

        pruneGhostArtifactSectors(sectors);

        expect(Object.keys(sectors).sort()).toEqual(['sector:arbih_1st_corps:1']);
    });

    it('keeps contested sectors that still own territory or brigades', () => {
        const reserveOnly = makeSector({
            sectorId: 'sector:arbih_1st_corps:6',
            friendlyOsids: ['op:rogatica:varosiste_2'],
            territoryOsids: ['op:rogatica:varosiste_2'],
            reserveBrigadeIds: ['arbih_802nd_light'],
            edgeCount: 16,
        });
        const territoryOnly = makeSector({
            sectorId: 'sector:arbih_1st_corps:9',
            friendlyOsids: ['op:hadzici:lokve'],
            territoryOsids: ['op:hadzici:lokve'],
            edgeCount: 9,
        });

        const sectors = {
            [reserveOnly.sector_id]: reserveOnly,
            [territoryOnly.sector_id]: territoryOnly,
        };

        pruneGhostArtifactSectors(sectors);

        expect(Object.keys(sectors).sort()).toEqual([
            'sector:arbih_1st_corps:6',
            'sector:arbih_1st_corps:9',
        ]);
    });
});
