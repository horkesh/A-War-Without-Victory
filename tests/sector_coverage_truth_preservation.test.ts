import { describe, expect, it } from 'vitest';

import { ensureMinimumSectorCoverage } from '../src/sim/combat/brigade_assignment.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string,
    frontOsids: string[],
    territoryOsids: string[],
    assigned: string[],
): CorpsFrontSector {
    const subSegment: CorpsFrontSubSegment = {
        sub_segment_id: `subseg:${sectorId}`,
        edge_ids: frontOsids.map((frontOsid, index) => `${frontOsid}__enemy:${index}`),
        friendly_osids: frontOsids,
        enemy_osids: frontOsids.map((_, index) => `enemy:${sectorId}:${index}`),
        length_edges: frontOsids.length,
        primary_brigade_ids: [],
    };
    return {
        sector_id: sectorId,
        corps_id: 'corps_a',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [...subSegment.edge_ids],
        sub_segments: [subSegment],
        length_edges: frontOsids.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 500,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeFormation(id: string, location_osid: string): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        corps_id: 'corps_a',
        location_osid,
        home_osid: location_osid,
        personnel: 1200,
        cohesion: 65,
        morale: 70,
    } as FormationState;
}

function makeAdjacency(): Map<Osid, Osid[]> {
    return new Map<Osid, Osid[]>([
        ['op:donor:front' as Osid, ['op:donor:rear' as Osid, 'op:recipient:front' as Osid]],
        ['op:donor:rear' as Osid, ['op:donor:front' as Osid]],
        ['op:recipient:front' as Osid, ['op:donor:front' as Osid]],
    ]);
}

describe('ensureMinimumSectorCoverage truth preservation', () => {
    it('promotes a reserve brigade to the stable nearest vacant front target', () => {
        const sector = makeSector(
            'sector:corps_a:0',
            ['op:recipient:front:b', 'op:recipient:front:a'],
            ['op:recipient:front:a', 'op:recipient:front:b', 'op:reserve:start'],
            [],
        );
        sector.reserve_brigade_ids = ['brig_reserve'];
        const formations: Record<FormationId, FormationState> = {
            brig_reserve: makeFormation('brig_reserve', 'op:reserve:start'),
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:reserve:start' as Osid, ['op:recipient:front:b' as Osid, 'op:recipient:front:a' as Osid]],
            ['op:recipient:front:a' as Osid, ['op:reserve:start' as Osid]],
            ['op:recipient:front:b' as Osid, ['op:reserve:start' as Osid]],
        ]);
        const friendlyOsids = new Set<string>([
            'op:reserve:start',
            'op:recipient:front:a',
            'op:recipient:front:b',
        ]);
        const componentOf = new Map<string, number>([
            ['op:reserve:start', 0],
            ['op:recipient:front:a', 0],
            ['op:recipient:front:b', 0],
        ]);

        ensureMinimumSectorCoverage(
            [sector],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(sector.assigned_brigade_ids).toEqual(['brig_reserve']);
        expect(sector.reserve_brigade_ids).toEqual([]);
        expect(formations.brig_reserve?.location_osid).toBe('op:recipient:front:a');
    });

    it('does not steal a brigade that is already truthfully anchored in donor territory', () => {
        const donor = makeSector(
            'sector:corps_a:0',
            ['op:donor:front'],
            ['op:donor:front', 'op:donor:rear'],
            ['brig_donor', 'brig_front_anchor'],
        );
        const recipient = makeSector(
            'sector:corps_a:1',
            ['op:recipient:front'],
            ['op:recipient:front'],
            [],
        );
        const formations: Record<FormationId, FormationState> = {
            brig_donor: makeFormation('brig_donor', 'op:donor:rear'),
            brig_front_anchor: makeFormation('brig_front_anchor', 'op:donor:front'),
        };
        const adjacency = makeAdjacency();
        const friendlyOsids = new Set<string>([
            'op:donor:front',
            'op:donor:rear',
            'op:recipient:front',
        ]);
        const componentOf = new Map<string, number>([
            ['op:donor:front', 0],
            ['op:donor:rear', 0],
            ['op:recipient:front', 0],
        ]);

        ensureMinimumSectorCoverage(
            [donor, recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toHaveLength(0);
        expect(donor.assigned_brigade_ids).toContain('brig_donor');
    });

    it('does not let low-threat equalization steal a brigade truthfully held in donor territory', () => {
        const donor = makeSector(
            'sector:corps_a:0',
            ['op:donor:front:a', 'op:donor:front:b'],
            ['op:donor:front:a', 'op:donor:front:b', 'op:donor:rear'],
            ['brig_front_anchor', 'brig_truthful_rear'],
        );
        donor.threat_ratio = 10;

        const recipient = makeSector(
            'sector:corps_a:1',
            [
                'op:recipient:front:1',
                'op:recipient:front:2',
                'op:recipient:front:3',
                'op:recipient:front:4',
                'op:recipient:front:5',
                'op:recipient:front:6',
                'op:recipient:front:7',
                'op:recipient:front:8',
                'op:recipient:front:9',
                'op:recipient:front:10',
            ],
            ['op:recipient:front:1'],
            ['brig_recipient'],
        );
        recipient.threat_ratio = 10;

        const formations: Record<FormationId, FormationState> = {
            brig_front_anchor: makeFormation('brig_front_anchor', 'op:donor:front:a'),
            brig_truthful_rear: makeFormation('brig_truthful_rear', 'op:donor:rear'),
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:front:1'),
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:donor:front:a' as Osid, ['op:donor:rear' as Osid, 'op:donor:front:b' as Osid, 'op:recipient:front:1' as Osid]],
            ['op:donor:front:b' as Osid, ['op:donor:front:a' as Osid]],
            ['op:donor:rear' as Osid, ['op:donor:front:a' as Osid]],
            ['op:recipient:front:1' as Osid, ['op:donor:front:a' as Osid]],
            ['op:recipient:front:2' as Osid, []],
            ['op:recipient:front:3' as Osid, []],
            ['op:recipient:front:4' as Osid, []],
            ['op:recipient:front:5' as Osid, []],
            ['op:recipient:front:6' as Osid, []],
            ['op:recipient:front:7' as Osid, []],
            ['op:recipient:front:8' as Osid, []],
            ['op:recipient:front:9' as Osid, []],
            ['op:recipient:front:10' as Osid, []],
        ]);
        const friendlyOsids = new Set<string>([
            'op:donor:front:a',
            'op:donor:front:b',
            'op:donor:rear',
            'op:recipient:front:1',
            'op:recipient:front:2',
            'op:recipient:front:3',
            'op:recipient:front:4',
            'op:recipient:front:5',
            'op:recipient:front:6',
            'op:recipient:front:7',
            'op:recipient:front:8',
            'op:recipient:front:9',
            'op:recipient:front:10',
        ]);
        const componentOf = new Map<string, number>([
            ['op:donor:front:a', 0],
            ['op:donor:front:b', 0],
            ['op:donor:rear', 0],
            ['op:recipient:front:1', 0],
            ['op:recipient:front:2', 0],
            ['op:recipient:front:3', 0],
            ['op:recipient:front:4', 0],
            ['op:recipient:front:5', 0],
            ['op:recipient:front:6', 0],
            ['op:recipient:front:7', 0],
            ['op:recipient:front:8', 0],
            ['op:recipient:front:9', 0],
            ['op:recipient:front:10', 0],
        ]);

        ensureMinimumSectorCoverage(
            [donor, recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(donor.assigned_brigade_ids).toContain('brig_truthful_rear');
        expect(recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
    });

    it('does not let moderate-pressure reinforcement steal a brigade truthfully held in donor territory', () => {
        const donor = makeSector(
            'sector:corps_a:0',
            ['op:donor:front:1', 'op:donor:front:2', 'op:donor:front:3', 'op:donor:front:4'],
            ['op:donor:front:1', 'op:donor:front:2', 'op:donor:front:3', 'op:donor:front:4', 'op:donor:rear'],
            ['brig_front_a', 'brig_front_b', 'brig_front_c', 'brig_truthful_rear'],
        );
        donor.threat_ratio = 20;

        const recipient = makeSector(
            'sector:corps_a:1',
            ['op:recipient:front:1', 'op:recipient:front:2', 'op:recipient:front:3', 'op:recipient:front:4'],
            ['op:recipient:front:1'],
            ['brig_recipient'],
        );
        recipient.threat_ratio = 100;

        const formations: Record<FormationId, FormationState> = {
            brig_front_a: makeFormation('brig_front_a', 'op:donor:front:1'),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:front:2'),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:front:3'),
            brig_truthful_rear: makeFormation('brig_truthful_rear', 'op:donor:rear'),
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:front:1'),
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:donor:front:1' as Osid, ['op:donor:front:2' as Osid, 'op:donor:rear' as Osid, 'op:recipient:front:1' as Osid]],
            ['op:donor:front:2' as Osid, ['op:donor:front:1' as Osid, 'op:donor:front:3' as Osid]],
            ['op:donor:front:3' as Osid, ['op:donor:front:2' as Osid, 'op:donor:front:4' as Osid]],
            ['op:donor:front:4' as Osid, ['op:donor:front:3' as Osid]],
            ['op:donor:rear' as Osid, ['op:donor:front:1' as Osid]],
            ['op:recipient:front:1' as Osid, ['op:donor:front:1' as Osid]],
            ['op:recipient:front:2' as Osid, []],
            ['op:recipient:front:3' as Osid, []],
            ['op:recipient:front:4' as Osid, []],
        ]);
        const friendlyOsids = new Set<string>([
            'op:donor:front:1',
            'op:donor:front:2',
            'op:donor:front:3',
            'op:donor:front:4',
            'op:donor:rear',
            'op:recipient:front:1',
            'op:recipient:front:2',
            'op:recipient:front:3',
            'op:recipient:front:4',
        ]);
        const componentOf = new Map<string, number>([
            ['op:donor:front:1', 0],
            ['op:donor:front:2', 0],
            ['op:donor:front:3', 0],
            ['op:donor:front:4', 0],
            ['op:donor:rear', 0],
            ['op:recipient:front:1', 0],
            ['op:recipient:front:2', 0],
            ['op:recipient:front:3', 0],
            ['op:recipient:front:4', 0],
        ]);

        ensureMinimumSectorCoverage(
            [donor, recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(donor.assigned_brigade_ids).toContain('brig_truthful_rear');
        expect(recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
    });
});
