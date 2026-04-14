import { describe, expect, it } from 'vitest';

import { ensureMinimumSectorCoverage, reclassifyRearBrigades, syncSectorAssignmentsToFormations } from '../src/sim/combat/brigade_assignment.js';
import type { CorpsFrontSector, CorpsFrontSubSegment, FormationId, FormationState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeAdjacency(pairs: Array<[string, string]>): Map<Osid, Osid[]> {
    const map = new Map<Osid, Osid[]>();
    for (const [a, b] of pairs) {
        const left = map.get(a as Osid) ?? [];
        if (!left.includes(b as Osid)) left.push(b as Osid);
        map.set(a as Osid, left);
        const right = map.get(b as Osid) ?? [];
        if (!right.includes(a as Osid)) right.push(a as Osid);
        map.set(b as Osid, right);
    }
    return map;
}

function makeFormation(id: string, location_osid: string): FormationState {
    return {
        id: id as FormationId,
        faction: 'RS',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'vrs_test',
        location_osid,
        personnel: 1000,
    };
}

function makeSector(): CorpsFrontSector {
    const subSegment: CorpsFrontSubSegment = {
        sub_segment_id: 'subseg:sector:vrs_test:0:0',
        edge_ids: ['op:test:front__op:test:enemy'],
        friendly_osids: ['op:test:front'],
        enemy_osids: ['op:test:enemy'],
        length_edges: 1,
        primary_brigade_ids: [],
    };
    return {
        sector_id: 'sector:vrs_test:0',
        corps_id: 'vrs_test',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: ['op:test:front__op:test:enemy'],
        sub_segments: [subSegment],
        length_edges: 1,
        territory_osids: ['op:test:front', 'op:test:rear1', 'op:test:rear2'],
        assigned_brigade_ids: ['brig_front', 'brig_deep_rear'],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

describe('rear brigade sector bucket truth', () => {
    it('keeps deep rear brigades sector-owned when they remain in a sector rear bucket', () => {
        const sector = makeSector();
        const formations: Record<FormationId, FormationState> = {
            brig_front: makeFormation('brig_front', 'op:test:front'),
            brig_deep_rear: makeFormation('brig_deep_rear', 'op:test:rear2'),
        };
        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear1'],
            ['op:test:rear1', 'op:test:rear2'],
        ]);
        const friendlyOsids = new Set(['op:test:front', 'op:test:rear1', 'op:test:rear2']);

        reclassifyRearBrigades([sector], formations, adjacency, friendlyOsids);
        syncSectorAssignmentsToFormations({ [sector.sector_id]: sector }, formations, adjacency);

        expect(sector.assigned_brigade_ids).toEqual(['brig_front']);
        expect(sector.rear_brigade_ids).toEqual(['brig_deep_rear']);
        expect(sector.reserve_brigade_ids).toEqual([]);
        expect(formations.brig_deep_rear.assignment).toEqual({
            kind: 'sector',
            sector_id: sector.sector_id,
            role: 'rear',
        });
    });

    it('keeps one-hop rear bucket brigades serialized as rear rather than reserve', () => {
        const sector = makeSector();
        sector.assigned_brigade_ids = ['brig_front'];
        sector.rear_brigade_ids = ['brig_one_hop_rear'];

        const formations: Record<FormationId, FormationState> = {
            brig_front: makeFormation('brig_front', 'op:test:front'),
            brig_one_hop_rear: makeFormation('brig_one_hop_rear', 'op:test:rear1'),
        };
        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear1'],
            ['op:test:rear1', 'op:test:rear2'],
        ]);

        syncSectorAssignmentsToFormations({ [sector.sector_id]: sector }, formations, adjacency);

        expect(formations.brig_one_hop_rear.assignment).toEqual({
            kind: 'sector',
            sector_id: sector.sector_id,
            role: 'rear',
        });
    });

    it('promotes a reachable rear brigade into an otherwise empty same-corps sector', () => {
        const donor = makeSector();
        donor.sector_id = 'sector:vrs_test:donor';
        donor.assigned_brigade_ids = ['brig_front'];
        donor.reserve_brigade_ids = [];
        donor.rear_brigade_ids = ['brig_rear'];

        const recipient: CorpsFrontSector = {
            ...makeSector(),
            sector_id: 'sector:vrs_test:recipient',
            edge_ids: ['op:test:recipient_front__op:test:enemy2'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:vrs_test:recipient:0',
                edge_ids: ['op:test:recipient_front__op:test:enemy2'],
                friendly_osids: ['op:test:recipient_front'],
                enemy_osids: ['op:test:enemy2'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
            territory_osids: ['op:test:recipient_front', 'op:test:rear2'],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            rear_brigade_ids: [],
        };

        const formations: Record<FormationId, FormationState> = {
            brig_front: makeFormation('brig_front', 'op:test:front'),
            brig_rear: makeFormation('brig_rear', 'op:test:rear2'),
        };
        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear1'],
            ['op:test:rear1', 'op:test:rear2'],
            ['op:test:rear2', 'op:test:recipient_front'],
        ]);
        const friendlyOsids = new Set(['op:test:front', 'op:test:rear1', 'op:test:rear2', 'op:test:recipient_front']);
        const componentOf = new Map([
            ['op:test:front', 0],
            ['op:test:rear1', 0],
            ['op:test:rear2', 0],
            ['op:test:recipient_front', 0],
        ]);

        ensureMinimumSectorCoverage([donor, recipient], formations, adjacency, friendlyOsids, componentOf);

        expect(donor.rear_brigade_ids).toEqual([]);
        expect(recipient.assigned_brigade_ids).toEqual(['brig_rear']);
    });
});
