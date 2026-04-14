import { describe, expect, it } from 'vitest';

import { ensureMinimumSectorCoverage } from '../src/sim/combat/brigade_assignment.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

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
});
