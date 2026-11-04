import { describe, expect, it } from 'vitest';

import {
    ensureMinimumSectorCoverage,
    type EnsureMinimumSectorCoverageOccupancyStrategy,
} from '../src/sim/combat/brigade_assignment.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type {
    SectorTopologyNarrowBrigadeMovementOrder,
    SectorTopologyNarrowBrigadeMovementState,
    SectorTopologyNarrowBrigadePostureOrder,
    SectorTopologyNarrowOperation,
    SectorTopologyNarrowReadState,
} from '../src/sim/combat/sector_topology_narrow_reads.js';
import type { SectorTopologyWorkingFormation } from '../src/sim/combat/sector_topology_narrow_formation.js';

function makeSubSegment(id: string, friendlyOsids: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: friendlyOsids.map((osid, index) => `${id}:edge:${index}:${osid}`),
        friendly_osids: friendlyOsids,
        enemy_osids: friendlyOsids.map((_, index) => `${id}:enemy:${index}`),
        length_edges: friendlyOsids.length,
        primary_brigade_ids: [],
    };
}

function makeSector(overrides: {
    sectorId: string;
    frontOsids: string[];
    assigned: string[];
    threatRatio?: number;
}): CorpsFrontSector {
    const subSegment = makeSubSegment(`subseg:${overrides.sectorId}`, overrides.frontOsids);
    return {
        sector_id: overrides.sectorId,
        corps_id: 'corps_a',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [...subSegment.edge_ids],
        sub_segments: [subSegment],
        length_edges: subSegment.length_edges,
        territory_osids: [...overrides.frontOsids],
        assigned_brigade_ids: [...overrides.assigned],
        reserve_brigade_ids: [],
        density: overrides.assigned.length / Math.max(1, subSegment.length_edges),
        threat_ratio: overrides.threatRatio ?? 500,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeFormation(id: string, location_osid: string, personnel = 1200): FormationState {
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
        personnel,
        cohesion: 65,
        morale: 70,
        disrupted_turns: 0,
    } as FormationState;
}

function makeAdjacency(edges: Array<[string, string]>): Map<Osid, Osid[]> {
    const adjacency = new Map<string, Set<string>>();
    const add = (left: string, right: string): void => {
        const bucket = adjacency.get(left) ?? new Set<string>();
        bucket.add(right);
        adjacency.set(left, bucket);
    };

    for (const [left, right] of edges) {
        add(left, right);
        add(right, left);
    }

    return new Map(
        [...adjacency.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([osid, neighbors]) => [osid as Osid, [...neighbors].sort()] as const),
    );
}

describe('ensureMinimumSectorCoverage severe undercoverage rebalance', () => {
    it('promotes an own-sector rear brigade to the front when the sector is below floor', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
            ],
            assigned: ['brig_front'],
            threatRatio: 20,
        });
        recipient.rear_brigade_ids = ['brig_rear'];

        const formations: Record<FormationId, FormationState> = {
            brig_front: makeFormation('brig_front', 'op:recipient:f1'),
            brig_rear: makeFormation('brig_rear', 'op:recipient:rear_1', 1800),
        };
        const adjacency = makeAdjacency([
            ['op:recipient:rear_1', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            'op:recipient:rear_1',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front', 'brig_rear']);
        expect(recipient.rear_brigade_ids).toEqual([]);
        expect(formations.brig_rear.location_osid).toBe('op:recipient:f2');
    });

    it('moves a local reserve onto the front instead of paper-promoting it into a gap sector', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        recipient.reserve_brigade_ids = ['brig_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_reserve: makeFormation('brig_reserve', 'op:recipient:rear_1'),
        };
        const adjacency = makeAdjacency([
            ['op:recipient:rear_1', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            'op:recipient:rear_1',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_reserve']);
        expect(recipient.reserve_brigade_ids).toEqual([]);
        expect(formations.brig_reserve.location_osid).toBe('op:recipient:f2');
    });

    it('moves an own-sector rear brigade onto the front when the sector is empty', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        recipient.rear_brigade_ids = ['brig_rear'];
        recipient.territory_osids.push('op:recipient:rear_1');

        const formations: Record<FormationId, FormationState> = {
            brig_rear: makeFormation('brig_rear', 'op:recipient:rear_1'),
        };
        const adjacency = makeAdjacency([
            ['op:recipient:rear_1', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_rear']);
        expect(recipient.rear_brigade_ids).toEqual([]);
        expect(formations.brig_rear.location_osid).toBe('op:recipient:f2');
    });

    it('does not paper-promote a reserve that is more than three hops from the sector front', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1'],
            assigned: [],
            threatRatio: 900,
        });
        recipient.reserve_brigade_ids = ['brig_far_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_far_reserve: makeFormation('brig_far_reserve', 'op:recipient:rear_4'),
        };
        const adjacency = makeAdjacency([
            ['op:recipient:f1', 'op:recipient:rear_1'],
            ['op:recipient:rear_1', 'op:recipient:rear_2'],
            ['op:recipient:rear_2', 'op:recipient:rear_3'],
            ['op:recipient:rear_3', 'op:recipient:rear_4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            'op:recipient:rear_1',
            'op:recipient:rear_2',
            'op:recipient:rear_3',
            'op:recipient:rear_4',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual([]);
        expect(recipient.reserve_brigade_ids).toEqual(['brig_far_reserve']);
        expect(formations.brig_far_reserve.location_osid).toBe('op:recipient:rear_4');
    });

    it('peels a nearby low-pressure front donor into an empty same-corps sector', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3', 'op:recipient:f4'],
            assigned: [],
            threatRatio: 0,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 40,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front_a']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:recipient:f2');
    });

    it('does not peel a front donor into an empty sector when the target would create brigade drift', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3', 'op:recipient:f4'],
            assigned: [],
            threatRatio: 0,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 40,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };
        formations.brig_front_a.home_osid = 'op:home:h0';
        formations.brig_front_b.home_osid = 'op:home:h0';
        formations.brig_front_c.home_osid = 'op:home:h0';

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:home:h0', 'op:home:h1'],
            ['op:home:h1', 'op:home:h2'],
            ['op:home:h2', 'op:home:h3'],
            ['op:home:h3', 'op:home:h4'],
            ['op:home:h4', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:home:h0',
            'op:home:h1',
            'op:home:h2',
            'op:home:h3',
            'op:home:h4',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual([]);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b', 'brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:donor:f1');
    });

    it('can directly reposition a nearby same-corps rear/reserve brigade into a critically thin sector front', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_front_a', 'brig_front_b'],
            threatRatio: 120,
        });
        donor.reserve_brigade_ids = ['brig_reserve'];
        donor.rear_brigade_ids = ['brig_rear'];

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 900),
            brig_reserve: makeFormation('brig_reserve', 'op:donor:rear_1', 2000),
            brig_rear: makeFormation('brig_rear', 'op:donor:rear_2', 1100),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f1', 'op:donor:rear_1'],
            ['op:donor:f2', 'op:donor:rear_2'],
            ['op:donor:rear_1', 'op:recipient:f2'],
            ['op:donor:rear_2', 'op:recipient:f3'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:rear_1',
            'op:donor:rear_2',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toHaveLength(3);
        expect(recipient.assigned_brigade_ids).toEqual(['brig_rear', 'brig_recipient', 'brig_reserve']);
        expect(donor.reserve_brigade_ids).toEqual([]);
        expect(donor.rear_brigade_ids).toEqual([]);
        expect(formations.brig_reserve.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_rear.location_osid).toBe('op:recipient:f3');
    });

    it('can peel nearby front donors from a low-pressure sibling sector when no rear or reserve relief exists', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 40,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f2', 'op:recipient:f3'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b', 'brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_front_b.location_osid).toBe('op:recipient:f3');
    });

    it('can peel a front donor from a moderately pressured sibling when the recipient is materially worse', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 984,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: [
                'op:donor:f1',
                'op:donor:f2',
                'op:donor:f3',
                'op:donor:f4',
                'op:donor:f5',
                'op:donor:f6',
                'op:donor:f7',
                'op:donor:f8',
                'op:donor:f9',
                'op:donor:f10',
                'op:donor:f11',
                'op:donor:f12',
                'op:donor:f13',
                'op:donor:f14',
                'op:donor:f15',
                'op:donor:f16',
            ],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 212,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:recipient:f2');
    });

    it('can fill a one-brigade floor deficit from a slightly less-pressured sibling sector', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 192,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: [
                'op:donor:f1',
                'op:donor:f2',
                'op:donor:f3',
                'op:donor:f4',
                'op:donor:f5',
                'op:donor:f6',
                'op:donor:f7',
                'op:donor:f8',
                'op:donor:f9',
                'op:donor:f10',
                'op:donor:f11',
                'op:donor:f12',
                'op:donor:f13',
                'op:donor:f14',
                'op:donor:f15',
                'op:donor:f16',
            ],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c', 'brig_front_d'],
            threatRatio: 157,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
            brig_front_d: makeFormation('brig_front_d', 'op:donor:f4', 800),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c', 'brig_front_d']);
        expect(formations.brig_front_a.location_osid).toBe('op:recipient:f2');
    });

    it('does not peel front donors from a sibling sector that is already under pressure', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 500,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f2', 'op:recipient:f3'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b', 'brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:donor:f1');
        expect(formations.brig_front_b.location_osid).toBe('op:donor:f2');
    });

    it('does not overdraw a front donor below its own floor when the recipient can still accept more relief', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: [
                'op:donor:f1',
                'op:donor:f2',
                'op:donor:f3',
                'op:donor:f4',
                'op:donor:f5',
                'op:donor:f6',
                'op:donor:f7',
                'op:donor:f8',
                'op:donor:f9',
                'op:donor:f10',
            ],
            assigned: ['brig_front_a', 'brig_front_b', 'brig_front_c'],
            threatRatio: 40,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f2', 'op:recipient:f3'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
        expect(formations.brig_front_a.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_front_b.location_osid).toBe('op:donor:f2');
    });

    it('pulls a second front donor once the first donor reaches its floor', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donorA = makeSector({
            sectorId: 'sector:corps_a:donor_a',
            frontOsids: [
                'op:donor_a:f1',
                'op:donor_a:f2',
                'op:donor_a:f3',
                'op:donor_a:f4',
                'op:donor_a:f5',
                'op:donor_a:f6',
                'op:donor_a:f7',
                'op:donor_a:f8',
                'op:donor_a:f9',
                'op:donor_a:f10',
            ],
            assigned: ['brig_a1', 'brig_a2', 'brig_a3'],
            threatRatio: 40,
        });
        const donorB = makeSector({
            sectorId: 'sector:corps_a:donor_b',
            frontOsids: [
                'op:donor_b:f1',
                'op:donor_b:f2',
                'op:donor_b:f3',
                'op:donor_b:f4',
                'op:donor_b:f5',
                'op:donor_b:f6',
                'op:donor_b:f7',
                'op:donor_b:f8',
                'op:donor_b:f9',
                'op:donor_b:f10',
            ],
            assigned: ['brig_b1', 'brig_b2', 'brig_b3'],
            threatRatio: 35,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_a1: makeFormation('brig_a1', 'op:donor_a:f1', 1200),
            brig_a2: makeFormation('brig_a2', 'op:donor_a:f2', 1100),
            brig_a3: makeFormation('brig_a3', 'op:donor_a:f3', 900),
            brig_b1: makeFormation('brig_b1', 'op:donor_b:f1', 1250),
            brig_b2: makeFormation('brig_b2', 'op:donor_b:f2', 1150),
            brig_b3: makeFormation('brig_b3', 'op:donor_b:f3', 950),
        };

        const adjacency = makeAdjacency([
            ['op:donor_a:f1', 'op:recipient:f2'],
            ['op:donor_a:f1', 'op:donor_a:f2'],
            ['op:donor_a:f2', 'op:donor_a:f3'],
            ['op:donor_b:f1', 'op:recipient:f3'],
            ['op:donor_b:f1', 'op:donor_b:f2'],
            ['op:donor_b:f2', 'op:donor_b:f3'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donorA.territory_osids,
            ...donorB.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donorA, donorB],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_a1', 'brig_b1', 'brig_recipient']);
        expect(donorA.assigned_brigade_ids).toEqual(['brig_a2', 'brig_a3']);
        expect(donorB.assigned_brigade_ids).toEqual(['brig_b2', 'brig_b3']);
        expect(formations.brig_a1.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_b1.location_osid).toBe('op:recipient:f3');
    });

    it('fills a nearby below-floor sector from a quiet donor that is still above its own floor', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 25,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: [
                'op:donor:f1',
                'op:donor:f2',
                'op:donor:f3',
                'op:donor:f4',
                'op:donor:f5',
                'op:donor:f6',
                'op:donor:f7',
                'op:donor:f8',
                'op:donor:f9',
                'op:donor:f10',
                'op:donor:f11',
                'op:donor:f12',
                'op:donor:f13',
            ],
            assigned: ['brig_donor_a', 'brig_donor_b', 'brig_donor_c', 'brig_donor_d'],
            threatRatio: 54,
        });

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_donor_a: makeFormation('brig_donor_a', 'op:donor:f1', 1500),
            brig_donor_b: makeFormation('brig_donor_b', 'op:donor:f2', 1200),
            brig_donor_c: makeFormation('brig_donor_c', 'op:donor:f3', 1100),
            brig_donor_d: makeFormation('brig_donor_d', 'op:donor:f4', 1000),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f2', 'op:recipient:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_donor_a', 'brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_donor_b', 'brig_donor_c', 'brig_donor_d']);
        expect(formations.brig_donor_a.location_osid).toBe('op:recipient:f2');
    });

    it('fills a nearby below-floor sector from a quiet same-corps donor reserve', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
                'op:recipient:f18',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 100,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            assigned: ['brig_donor_front'],
            threatRatio: 0,
        });
        donor.reserve_brigade_ids = ['brig_donor_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_donor_front: makeFormation('brig_donor_front', 'op:donor:f1'),
            brig_donor_reserve: makeFormation('brig_donor_reserve', 'op:donor:reserve_1', 1500),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:donor:reserve_1'],
            ['op:donor:reserve_1', 'op:donor:reserve_2'],
            ['op:donor:reserve_2', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:reserve_1',
            'op:donor:reserve_2',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_donor_reserve', 'brig_recipient']);
        expect(donor.reserve_brigade_ids).toEqual([]);
        expect(formations.brig_donor_reserve.location_osid).toBe('op:recipient:f2');
    });

    it('does not teleport same-corps relief that is still more than three hops away', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 900,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1'],
            assigned: ['brig_front_a'],
            threatRatio: 120,
        });
        donor.reserve_brigade_ids = ['brig_far_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', 'op:donor:f1'),
            brig_far_reserve: makeFormation('brig_far_reserve', 'op:donor:rear_4'),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:donor:rear_1'],
            ['op:donor:rear_1', 'op:donor:rear_2'],
            ['op:donor:rear_2', 'op:donor:rear_3'],
            ['op:donor:rear_3', 'op:donor:rear_4'],
            ['op:donor:rear_1', 'op:recipient:f1'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:rear_1',
            'op:donor:rear_2',
            'op:donor:rear_3',
            'op:donor:rear_4',
        ]);
        const componentOf = new Map<string, number>([
            ...[...friendlyOsids].map((osid) => [osid, 0] as const),
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
        expect(donor.reserve_brigade_ids).toEqual(['brig_far_reserve']);
        expect(formations.brig_far_reserve.location_osid).toBe('op:donor:rear_4');
    });

    it('does not borrow from a surplus donor in another friendly component', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: [
                'op:recipient:f1',
                'op:recipient:f2',
                'op:recipient:f3',
                'op:recipient:f4',
                'op:recipient:f5',
                'op:recipient:f6',
                'op:recipient:f7',
                'op:recipient:f8',
                'op:recipient:f9',
                'op:recipient:f10',
                'op:recipient:f11',
                'op:recipient:f12',
                'op:recipient:f13',
                'op:recipient:f14',
                'op:recipient:f15',
                'op:recipient:f16',
                'op:recipient:f17',
            ],
            assigned: ['brig_recipient'],
            threatRatio: 4800,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: [
                'op:donor:f1',
                'op:donor:f2',
                'op:donor:f3',
                'op:donor:f4',
                'op:donor:f5',
                'op:donor:f6',
                'op:donor:f7',
                'op:donor:f8',
            ],
            assigned: ['brig_donor_a', 'brig_donor_b', 'brig_donor_c'],
            threatRatio: 20,
        });
        donor.reserve_brigade_ids = ['brig_donor_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_donor_a: makeFormation('brig_donor_a', 'op:donor:f1', 1500),
            brig_donor_b: makeFormation('brig_donor_b', 'op:donor:f2', 1200),
            brig_donor_c: makeFormation('brig_donor_c', 'op:donor:f3', 1100),
            brig_donor_reserve: makeFormation('brig_donor_reserve', 'op:donor:rear_1', 1800),
        };

        const adjacency = makeAdjacency([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:rear_1', 'op:recipient:f3'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:rear_1'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:rear_1',
        ]);
        const componentOf = new Map<string, number>([
            ...recipient.territory_osids.map((osid) => [osid, 1] as const),
            ...donor.territory_osids.map((osid) => [osid, 0] as const),
            ['op:donor:rear_1', 0],
        ]);

        ensureMinimumSectorCoverage(
            [recipient, donor],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_donor_a', 'brig_donor_b', 'brig_donor_c']);
        expect(donor.reserve_brigade_ids).toEqual(['brig_donor_reserve']);
        expect(formations.brig_donor_a.location_osid).toBe('op:donor:f1');
        expect(formations.brig_donor_reserve.location_osid).toBe('op:donor:rear_1');
    });
});

describe('zero-sector rescue ownership', () => {
    const componentMap = (friendlyOsids: Set<string>): Map<string, number> => new Map(
        [...friendlyOsids].map((osid) => [osid, 0] as const),
    );

    const makeState = (input: {
        formations: Record<FormationId, SectorTopologyWorkingFormation>;
        movementState?: Record<FormationId, SectorTopologyNarrowBrigadeMovementState>;
        movementOrders?: Record<FormationId, SectorTopologyNarrowBrigadeMovementOrder>;
        postureOrders?: SectorTopologyNarrowBrigadePostureOrder[];
        activeOperations?: SectorTopologyNarrowOperation[];
    }): SectorTopologyNarrowReadState => ({
        meta: { turn: 7 },
        political: {},
        factions: [{ id: 'RS' }],
        military: {
            formations: input.formations,
            brigade_movement_state: input.movementState,
            brigade_movement_orders: input.movementOrders,
            brigade_posture_orders: input.postureOrders,
            corps_command: input.activeOperations
                ? { corps_a: { active_operations: input.activeOperations } }
                : undefined,
        },
    });

    const run = (
        sectors: CorpsFrontSector[],
        formations: Record<FormationId, SectorTopologyWorkingFormation>,
        adjacency: Map<Osid, Osid[]>,
        friendlyOsids: Set<string>,
        state?: SectorTopologyNarrowReadState,
        occupancyStrategy: EnsureMinimumSectorCoverageOccupancyStrategy = 'dense-index',
    ): void => {
        ensureMinimumSectorCoverage(
            sectors,
            formations,
            adjacency,
            friendlyOsids,
            componentMap(friendlyOsids),
            state,
            (_label, fn) => fn(),
            occupancyStrategy,
        );
    };

    it('promotes only an uncommitted own-sector reserve when commitments cover every other candidate', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        const protectedIds = [
            'brig_op_planning',
            'brig_op_execution',
            'brig_disrupted',
            'brig_dig_current',
            'brig_dig_pending',
            'brig_loaned',
            'brig_pending_order',
            'brig_packing',
            'brig_transit',
        ];
        recipient.reserve_brigade_ids = [...protectedIds, 'brig_reserve_ok'];

        const formations: Record<FormationId, SectorTopologyWorkingFormation> = {};
        for (const bid of [...protectedIds, 'brig_reserve_ok']) {
            formations[bid] = makeFormation(bid, 'op:recipient:rear_1');
        }
        formations.brig_disrupted.disrupted_turns = 2;
        formations.brig_dig_current.posture = 'dig_in';
        formations.brig_loaned.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'corps_b',
            loan_start_turn: 1,
        };

        const movementState: Record<FormationId, SectorTopologyNarrowBrigadeMovementState> = {
            brig_packing: { status: 'packing', destination_sids: ['op:recipient:f2'] },
            brig_transit: { status: 'in_transit', stance: 'combat', destination_sids: ['op:recipient:f2'] },
        };
        const movementOrders: Record<FormationId, SectorTopologyNarrowBrigadeMovementOrder> = {
            brig_pending_order: { destination_sids: ['op:recipient:f2'], stance: 'combat' },
        };
        const postureOrders: SectorTopologyNarrowBrigadePostureOrder[] = [
            { brigade_id: 'brig_dig_pending', posture: 'dig_in' },
        ];
        const state = makeState({
            formations,
            movementState,
            movementOrders,
            postureOrders,
            activeOperations: [
                { type: 'attack', phase: 'planning', participating_brigades: ['brig_op_planning'] },
                { type: 'attack', phase: 'execution', participating_brigades: ['brig_op_execution'] },
            ],
        });

        const adjacency = makeAdjacency([
            ['op:recipient:rear_1', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            'op:recipient:rear_1',
        ]);

        run([recipient], formations, adjacency, friendlyOsids, state);

        expect(recipient.assigned_brigade_ids).toEqual(['brig_reserve_ok']);
        expect(recipient.reserve_brigade_ids).toEqual(protectedIds);
        expect(formations.brig_reserve_ok.location_osid).toBe('op:recipient:f2');
        for (const bid of protectedIds) {
            expect(formations[bid]?.location_osid).toBe('op:recipient:rear_1');
        }
        expect(state.military.brigade_movement_orders).toEqual(movementOrders);
        expect(state.military.brigade_movement_state).toEqual(movementState);
        expect(state.military.brigade_posture_orders).toEqual(postureOrders);
    });

    it('promotes only an uncommitted own-sector rear when the rear group holds an operation participant', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        recipient.rear_brigade_ids = ['brig_op_rear_planning', 'brig_rear_ok'];

        const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
            brig_op_rear_planning: makeFormation('brig_op_rear_planning', 'op:recipient:rear_1'),
            brig_rear_ok: makeFormation('brig_rear_ok', 'op:recipient:rear_1'),
        };
        const state = makeState({
            formations,
            activeOperations: [
                { type: 'attack', phase: 'planning', participating_brigades: ['brig_op_rear_planning'] },
            ],
        });

        const adjacency = makeAdjacency([
            ['op:recipient:rear_1', 'op:recipient:f2'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            'op:recipient:rear_1',
        ]);

        run([recipient], formations, adjacency, friendlyOsids, state);

        expect(recipient.assigned_brigade_ids).toEqual(['brig_rear_ok']);
        expect(recipient.rear_brigade_ids).toEqual(['brig_op_rear_planning']);
        expect(formations.brig_op_rear_planning.location_osid).toBe('op:recipient:rear_1');
        expect(formations.brig_rear_ok.location_osid).toBe('op:recipient:f2');
    });

    it('pulls only an uncommitted sibling rear onto the recipient front', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2'],
            assigned: ['brig_donor_front'],
            threatRatio: 40,
        });
        donor.rear_brigade_ids = ['brig_op_rear_execution', 'brig_rear_ok'];

        const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
            brig_donor_front: makeFormation('brig_donor_front', 'op:donor:f1'),
            brig_op_rear_execution: makeFormation('brig_op_rear_execution', 'op:donor:rear_1'),
            brig_rear_ok: makeFormation('brig_rear_ok', 'op:donor:rear_1'),
        };
        const state = makeState({
            formations,
            activeOperations: [
                { type: 'attack', phase: 'execution', participating_brigades: ['brig_op_rear_execution'] },
            ],
        });

        const adjacency = makeAdjacency([
            ['op:donor:rear_1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:rear_1'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:rear_1',
        ]);

        run([recipient, donor], formations, adjacency, friendlyOsids, state);

        expect(recipient.assigned_brigade_ids).toEqual(['brig_rear_ok']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_donor_front']);
        expect(donor.rear_brigade_ids).toEqual(['brig_op_rear_execution']);
        expect(formations.brig_op_rear_execution.location_osid).toBe('op:donor:rear_1');
        expect(formations.brig_rear_ok.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_donor_front.location_osid).toBe('op:donor:f1');
    });

    it('pulls only an uncommitted sibling reserve onto the recipient front', () => {
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
            assigned: [],
            threatRatio: 900,
        });
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: ['op:donor:f1', 'op:donor:f2'],
            assigned: ['brig_donor_front'],
            threatRatio: 40,
        });
        donor.reserve_brigade_ids = [
            'brig_op_reserve_execution',
            'brig_dig_pending_reserve',
            'brig_reserve_ok',
        ];

        const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
            brig_donor_front: makeFormation('brig_donor_front', 'op:donor:f1'),
            brig_op_reserve_execution: makeFormation('brig_op_reserve_execution', 'op:donor:rear_1'),
            brig_dig_pending_reserve: makeFormation('brig_dig_pending_reserve', 'op:donor:rear_1'),
            brig_reserve_ok: makeFormation('brig_reserve_ok', 'op:donor:rear_1'),
        };
        const state = makeState({
            formations,
            postureOrders: [
                { brigade_id: 'brig_dig_pending_reserve', posture: 'dig_in' },
            ],
            activeOperations: [
                { type: 'attack', phase: 'execution', participating_brigades: ['brig_op_reserve_execution'] },
            ],
        });

        const adjacency = makeAdjacency([
            ['op:donor:rear_1', 'op:recipient:f2'],
            ['op:donor:f1', 'op:donor:rear_1'],
        ]);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            'op:donor:rear_1',
        ]);

        run([recipient, donor], formations, adjacency, friendlyOsids, state);

        expect(recipient.assigned_brigade_ids).toEqual(['brig_reserve_ok']);
        expect(donor.assigned_brigade_ids).toEqual(['brig_donor_front']);
        expect(donor.reserve_brigade_ids).toEqual([
            'brig_op_reserve_execution',
            'brig_dig_pending_reserve',
        ]);
        expect(formations.brig_op_reserve_execution.location_osid).toBe('op:donor:rear_1');
        expect(formations.brig_dig_pending_reserve.location_osid).toBe('op:donor:rear_1');
        expect(formations.brig_reserve_ok.location_osid).toBe('op:recipient:f2');
        expect(formations.brig_donor_front.location_osid).toBe('op:donor:f1');
    });

    it.each(['dense-index', 'test-only-legacy-scan'] as const)(
        'keeps planning and execution operation participants out of the zero-sector pull (%s occupancy)',
        (occupancyStrategy) => {
            const recipient = makeSector({
                sectorId: 'sector:corps_a:recipient',
                frontOsids: ['op:recipient:f1', 'op:recipient:f2', 'op:recipient:f3'],
                assigned: [],
                threatRatio: 900,
            });
            const donor = makeSector({
                sectorId: 'sector:corps_a:donor',
                frontOsids: ['op:donor:f1', 'op:donor:f2'],
                assigned: ['brig_donor_front'],
                threatRatio: 40,
            });
            donor.reserve_brigade_ids = [
                'brig_a_planning',
                'brig_a_execution',
                'brig_z_free',
            ];

            const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
                brig_donor_front: makeFormation('brig_donor_front', 'op:donor:f1'),
                brig_a_planning: makeFormation('brig_a_planning', 'op:donor:rear_1'),
                brig_a_execution: makeFormation('brig_a_execution', 'op:donor:rear_1'),
                brig_z_free: makeFormation('brig_z_free', 'op:donor:rear_1'),
            };
            const state = makeState({
                formations,
                activeOperations: [
                    { type: 'attack', phase: 'planning', participating_brigades: ['brig_a_planning'] },
                    { type: 'attack', phase: 'execution', participating_brigades: ['brig_a_execution'] },
                ],
            });

            const adjacency = makeAdjacency([
                ['op:donor:rear_1', 'op:recipient:f2'],
                ['op:donor:f1', 'op:donor:rear_1'],
            ]);
            const friendlyOsids = new Set<string>([
                ...recipient.territory_osids,
                ...donor.territory_osids,
                'op:donor:rear_1',
            ]);

            run([recipient, donor], formations, adjacency, friendlyOsids, state, occupancyStrategy);

            expect(recipient.assigned_brigade_ids).toEqual(['brig_z_free']);
            expect(donor.assigned_brigade_ids).toEqual(['brig_donor_front']);
            expect(donor.reserve_brigade_ids).toEqual(['brig_a_planning', 'brig_a_execution']);
            expect(formations.brig_a_planning.location_osid).toBe('op:donor:rear_1');
            expect(formations.brig_a_execution.location_osid).toBe('op:donor:rear_1');
            expect(formations.brig_z_free.location_osid).toBe('op:recipient:f2');
            expect(formations.brig_donor_front.location_osid).toBe('op:donor:f1');
        },
    );
});

describe('ensureMinimumSectorCoverage home-distance target eligibility', () => {
    const HOME = 'op:home:slapasnica';
    const DONOR_LOC = 'op:donor:f1';
    const ILLEGAL = 'op:recipient:kastijelj_2';
    const LEGAL = 'op:recipient:udbina_2';
    const ALT_LEGAL = 'op:recipient:vitez_2';
    const STRATEGIES = ['dense-index', 'test-only-legacy-scan'] as const;
    const recipientBaseFront = Array.from({ length: 10 }, (_, index) => `op:recipient:f${index + 1}`);
    const donorFront = Array.from({ length: 10 }, (_, index) => `op:donor:f${index + 1}`);

    type TargetSpec = { osid: string; donorDistance: number; homeDistance: number | null };
    type CommitmentKind = 'operation' | 'in_transit' | 'movement_order';
    type Scenario = {
        recipient: CorpsFrontSector;
        donor: CorpsFrontSector;
        formations: Record<FormationId, SectorTopologyWorkingFormation>;
        adjacency: Map<Osid, Osid[]>;
        friendlyOsids: Set<string>;
    };

    const addPath = (edges: Array<[string, string]>, from: string, to: string, hops: number): void => {
        let previous = from;
        for (let hop = 1; hop < hops; hop++) {
            const node = `op:path:${from}:${to}:${hop}`;
            edges.push([previous, node]);
            previous = node;
        }
        edges.push([previous, to]);
    };

    const makeScenario = (options: {
        targets: TargetSpec[];
        donorAssignedCount?: number;
        donorHomeOsid?: string | null;
        reverseRecipientFrontOrder?: boolean;
        reverseDonorAssignedOrder?: boolean;
    }): Scenario => {
        const frontOsids = [...recipientBaseFront, ...options.targets.map((target) => target.osid)];
        if (options.reverseRecipientFrontOrder) frontOsids.reverse();
        const recipient = makeSector({
            sectorId: 'sector:corps_a:recipient',
            frontOsids,
            assigned: ['brig_recipient'],
            threatRatio: 20,
        });
        const donorAssigned = ['brig_front_a', 'brig_front_b', 'brig_front_c']
            .slice(0, options.donorAssignedCount ?? 3);
        if (options.reverseDonorAssignedOrder) donorAssigned.reverse();
        const donor = makeSector({
            sectorId: 'sector:corps_a:donor',
            frontOsids: donorFront,
            assigned: donorAssigned,
            threatRatio: 40,
        });
        const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
            brig_recipient: makeFormation('brig_recipient', 'op:recipient:f1'),
            brig_front_a: makeFormation('brig_front_a', DONOR_LOC, 1200),
            brig_front_b: makeFormation('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: makeFormation('brig_front_c', 'op:donor:f3', 900),
        };
        if (options.donorHomeOsid === null) {
            delete formations.brig_front_a.home_osid;
        } else {
            formations.brig_front_a.home_osid = options.donorHomeOsid ?? HOME;
        }
        const edges: Array<[string, string]> = [];
        for (const target of options.targets) {
            addPath(edges, DONOR_LOC, target.osid, target.donorDistance);
            if (target.homeDistance != null) addPath(edges, HOME, target.osid, target.homeDistance);
        }
        const adjacency = makeAdjacency(edges);
        const friendlyOsids = new Set<string>([
            ...recipient.territory_osids,
            ...donor.territory_osids,
            ...edges.flatMap(([left, right]) => [left, right]),
        ]);
        return { recipient, donor, formations, adjacency, friendlyOsids };
    };

    const run = (
        scenario: Scenario,
        state?: SectorTopologyNarrowReadState,
        occupancyStrategy: EnsureMinimumSectorCoverageOccupancyStrategy = 'dense-index',
    ): void => {
        ensureMinimumSectorCoverage(
            [scenario.recipient, scenario.donor],
            scenario.formations,
            scenario.adjacency,
            scenario.friendlyOsids,
            new Map([...scenario.friendlyOsids].map((osid) => [osid, 0] as const)),
            state,
            (_label, fn) => fn(),
            occupancyStrategy,
        );
    };

    const makeCommitmentState = (
        formations: Record<FormationId, SectorTopologyWorkingFormation>,
        commitment: CommitmentKind,
    ): SectorTopologyNarrowReadState => {
        const military = commitment === 'operation'
            ? {
                formations,
                corps_command: {
                    corps_a: {
                        active_operations: [
                            { type: 'attack' as const, phase: 'planning' as const, participating_brigades: ['brig_front_a'] },
                        ],
                    },
                },
            }
            : commitment === 'in_transit'
                ? {
                    formations,
                    brigade_movement_state: {
                        brig_front_a: { status: 'in_transit' as const, stance: 'combat' as const, destination_sids: [LEGAL] },
                    },
                }
                : {
                    formations,
                    brigade_movement_orders: {
                        brig_front_a: { destination_sids: [LEGAL], stance: 'combat' as const },
                    },
                };
        return {
            meta: { turn: 7 },
            political: {},
            factions: [{ id: 'RS' }],
            military,
        };
    };

    it.each(STRATEGIES)(
        'uses an equal-distance home-legal target instead of the lexicographically first home-illegal target (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 3, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 3, homeDistance: 4 },
                ],
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(LEGAL);
        },
    );

    it.each(STRATEGIES)(
        'continues BFS past a nearer home-illegal target to a farther home-legal target (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 2, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 3, homeDistance: 4 },
                ],
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(LEGAL);
        },
    );

    it.each(STRATEGIES)(
        'refuses when every reachable target violates the home-distance limit (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 2, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 4, homeDistance: 4 },
                ],
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(DONOR_LOC);
        },
    );

    it.each(STRATEGIES)(
        'keeps the existing nearest home-legal winner unchanged (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: LEGAL, donorDistance: 2, homeDistance: 4 },
                    { osid: ILLEGAL, donorDistance: 3, homeDistance: 5 },
                ],
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(LEGAL);
        },
    );

    it.each([
        ['dense-index', false],
        ['dense-index', true],
        ['test-only-legacy-scan', false],
        ['test-only-legacy-scan', true],
    ] as const)(
        'is stable under recipient and donor insertion order (%s occupancy, reversed=%s)',
        (occupancyStrategy, reverseOrder) => {
            const scenario = makeScenario({
                targets: [
                    { osid: LEGAL, donorDistance: 2, homeDistance: 4 },
                    { osid: ALT_LEGAL, donorDistance: 2, homeDistance: 4 },
                ],
                reverseRecipientFrontOrder: reverseOrder,
                reverseDonorAssignedOrder: reverseOrder,
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.formations.brig_front_a.location_osid).toBe(LEGAL);
        },
    );

    it.each(STRATEGIES)(
        'preserves nearest-target behavior for a formation with no home (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 2, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 3, homeDistance: 4 },
                ],
                donorHomeOsid: null,
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(ILLEGAL);
        },
    );

    it.each([
        ['operation', 'dense-index'],
        ['operation', 'test-only-legacy-scan'],
        ['in_transit', 'dense-index'],
        ['in_transit', 'test-only-legacy-scan'],
        ['movement_order', 'dense-index'],
        ['movement_order', 'test-only-legacy-scan'],
    ] as const)(
        'does not move a donor with a standing %s commitment (%s occupancy)',
        (commitment, occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 3, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 3, homeDistance: 4 },
                ],
            });

            run(scenario, makeCommitmentState(scenario.formations, commitment), occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b', 'brig_front_c']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(DONOR_LOC);
        },
    );

    it.each(STRATEGIES)(
        'does not overdraw a donor that is already at its floor (%s occupancy)',
        (occupancyStrategy) => {
            const scenario = makeScenario({
                targets: [
                    { osid: ILLEGAL, donorDistance: 3, homeDistance: 5 },
                    { osid: LEGAL, donorDistance: 3, homeDistance: 4 },
                ],
                donorAssignedCount: 2,
            });

            run(scenario, undefined, occupancyStrategy);

            expect(scenario.recipient.assigned_brigade_ids).toEqual(['brig_recipient']);
            expect(scenario.donor.assigned_brigade_ids).toEqual(['brig_front_a', 'brig_front_b']);
            expect(scenario.formations.brig_front_a.location_osid).toBe(DONOR_LOC);
            expect(scenario.formations.brig_front_b.location_osid).toBe('op:donor:f2');
        },
    );
});
