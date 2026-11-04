import { describe, expect, it } from 'vitest';

import { computeEmptySectorReliefReassignments } from '../../src/sim/combat/commander/decide.js';

function makeSector(
    sectorId: string,
    frontOsid: string,
    buckets: { assigned?: string[]; reserve?: string[]; rear?: string[] } = {},
) {
    return {
        sector_id: sectorId,
        corps_id: 'test_corps',
        faction: 'RBiH',
        edge_ids: [`${frontOsid}__enemy`],
        length_edges: 1,
        territory_osids: [frontOsid],
        assigned_brigade_ids: buckets.assigned ?? [],
        reserve_brigade_ids: buckets.reserve ?? [],
        rear_brigade_ids: buckets.rear ?? [],
        sub_segments: [{
            sub_segment_id: `${sectorId}:sub`,
            edge_ids: [`${frontOsid}__enemy`],
            friendly_osids: [frontOsid],
            enemy_osids: [`${frontOsid}:enemy`],
            primary_brigade_ids: buckets.assigned ?? [],
            length_edges: 1,
        }],
        density: 0,
        threat_ratio: 2,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeBriefing(options: {
    enclave?: boolean;
    donorPosture?: string;
    homeDefense?: boolean;
    movementStatus?: 'deployed' | 'packing' | 'in_transit' | 'unpacking';
} = {}) {
    const chain = ['op:test:rear', 'op:test:a', 'op:test:b', 'op:test:c', 'op:test:front'];
    const adjacency = new Map<string, string[]>();
    for (let index = 0; index < chain.length - 1; index++) {
        const left = chain[index]!;
        const right = chain[index + 1]!;
        adjacency.set(left, [...(adjacency.get(left) ?? []), right]);
        adjacency.set(right, [...(adjacency.get(right) ?? []), left]);
    }
    const donor = {
        id: 'relief_brigade',
        name: 'Relief Brigade',
        kind: 'brigade',
        faction: 'RBiH',
        corps_id: 'test_corps',
        status: 'active',
        readiness: 'active',
        created_turn: 0,
        assignment: null,
        location_osid: 'op:test:rear',
        home_osid: options.enclave ? 'op:gorazde:ustipraca_2' : 'op:test:rear',
        posture: options.donorPosture ?? 'hold',
        home_defense_active: options.homeDefense ?? false,
        tags: options.enclave ? ['enclave'] : [],
    };
    const sectors = [
        makeSector('sector:test:donor', 'op:test:rear', { rear: [donor.id] }),
        makeSector('sector:test:empty', 'op:test:front'),
    ];
    const state = {
        meta: { turn: 12 },
        military: {
            formations: { [donor.id]: donor },
            corps_front_sectors: Object.fromEntries(sectors.map((sector) => [sector.sector_id, sector])),
            corps_command: {},
            brigade_movement_orders: {},
            brigade_movement_state: options.movementStatus
                ? { [donor.id]: { status: options.movementStatus } }
                : {},
            brigade_posture_orders: [],
        },
    };
    return {
        corps_id: 'test_corps',
        faction: 'RBiH',
        turn: 12,
        sectors,
        brigades: [donor],
        state_ref: state,
        must_hold_osids: [],
        spatial: {
            adjacency,
            friendlyOsidsByFaction: new Map([['RBiH', new Set(chain)]]),
            componentsByFaction: new Map(),
        },
    } as any;
}

describe('empty-sector relief reassignment', () => {
    it('emits strategic intent for a distant rear donor without moving it', () => {
        const briefing = makeBriefing({ homeDefense: true, movementStatus: 'deployed' });
        const before = structuredClone(briefing.state_ref.military.formations.relief_brigade);

        const result = computeEmptySectorReliefReassignments(briefing);

        expect(result).toEqual([{
            brigade_id: 'relief_brigade',
            to_sector_id: 'sector:test:empty',
            reason: 'empty front sector requires corps relief',
        }]);
        expect(briefing.state_ref.military.formations.relief_brigade).toEqual(before);
    });

    it('does not send an enclave-locked formation outside its enclave', () => {
        const briefing = makeBriefing({ enclave: true });

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
    });

    it('does not override a dug-in donor', () => {
        const briefing = makeBriefing({ donorPosture: 'dig_in' });

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
    });

    it('does not issue competing intent for a donor already in transit', () => {
        const briefing = makeBriefing({ movementStatus: 'in_transit' });

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
    });

    it('emits intent for a plain legal rear donor', () => {
        const briefing = makeBriefing();
        const donor = briefing.state_ref.military.formations.relief_brigade;
        const before = structuredClone(donor);

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([{
            brigade_id: 'relief_brigade',
            to_sector_id: 'sector:test:empty',
            reason: 'empty front sector requires corps relief',
        }]);
        expect(donor).toEqual(before);
    });

    it('does not issue intent for a donor with a manual movement order', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.brigade_movement_orders = {
            relief_brigade: { destination_sids: ['op:test:b'], stance: 'column' },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('does not issue intent for a donor with a pending dig-in posture order', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.brigade_posture_orders = [
            { brigade_id: 'relief_brigade', posture: 'dig_in' },
        ];

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('does not issue intent for an active-operation participant', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.corps_command = {
            test_corps: {
                active_operations: [{
                    type: 'attack',
                    phase: 'execution',
                    participating_brigades: ['relief_brigade'],
                }],
            },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('does not issue intent for an elite-loaned donor', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.formations.relief_brigade.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'other_corps',
            loan_start_turn: 1,
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('does not issue intent for a line donor that is only at its own floor', () => {
        const briefing = makeBriefing();
        const donorSector = briefing.sectors.find(
            (sector: { sector_id: string }) => sector.sector_id === 'sector:test:donor',
        );
        donorSector.rear_brigade_ids = [];
        donorSector.assigned_brigade_ids = ['relief_brigade'];
        donorSector.length_edges = 8;
        donorSector.threat_ratio = 100;

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('emits intent for a line donor above its own floor and below the pressure threshold', () => {
        const briefing = makeBriefing();
        const rear2 = 'op:test:rear_2';
        briefing.spatial.adjacency.set(rear2, ['op:test:rear']);
        briefing.spatial.adjacency.set('op:test:rear', [
            ...(briefing.spatial.adjacency.get('op:test:rear') ?? []),
            rear2,
        ]);
        briefing.spatial.friendlyOsidsByFaction.get('RBiH')!.add(rear2);

        const second = structuredClone(
            briefing.state_ref.military.formations.relief_brigade,
        );
        second.id = 'brig_second';
        second.name = 'brig_second';
        second.location_osid = rear2;
        second.home_osid = rear2;
        briefing.state_ref.military.formations.brig_second = second;
        briefing.brigades.push(second);

        const donorSector = briefing.sectors.find(
            (sector: { sector_id: string }) => sector.sector_id === 'sector:test:donor',
        );
        donorSector.rear_brigade_ids = [];
        donorSector.assigned_brigade_ids = ['relief_brigade', 'brig_second'];
        donorSector.length_edges = 8;
        donorSector.threat_ratio = 100;

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([{
            brigade_id: 'relief_brigade',
            to_sector_id: 'sector:test:empty',
            reason: 'empty front sector requires corps relief',
        }]);
    });

    it('does not issue intent when the only friendly route is hostile', () => {
        const briefing = makeBriefing();
        briefing.spatial.friendlyOsidsByFaction.get('RBiH')!.delete('op:test:b');

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });

    it('does not issue intent when the friendly route is disconnected', () => {
        const briefing = makeBriefing();
        briefing.spatial.adjacency.delete('op:test:b');

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });
});
