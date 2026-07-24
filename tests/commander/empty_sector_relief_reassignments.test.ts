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
});
