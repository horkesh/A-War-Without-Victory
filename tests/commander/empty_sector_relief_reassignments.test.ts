import { describe, expect, it } from 'vitest';

import { computeEmptySectorReliefReassignments } from '../../src/sim/combat/commander/decide.js';
import * as prePlanned from '../../src/sim/combat/pre_planned_operations.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../../src/sim/combat/operation_opportunities.js';

const { _ALL_PRE_PLANNED } = prePlanned;

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

    it('takes a dug-in donor when it is the only legal one (package P2 step 1: moving forfeits dig-in)', () => {
        const briefing = makeBriefing({ donorPosture: 'dig_in' });

        expect(computeEmptySectorReliefReassignments(briefing).map((r) => r.brigade_id)).toEqual(['relief_brigade']);
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

    it('takes a donor with a pending dig-in order when it is the only legal one, as intent only', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.brigade_posture_orders = [
            { brigade_id: 'relief_brigade', posture: 'dig_in' },
        ];

        expect(computeEmptySectorReliefReassignments(briefing).map((r) => r.brigade_id)).toEqual(['relief_brigade']);
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

    describe('SE7E: a frontless sector that still lists its own reserve/rear', () => {
        // Chain: rear - a - b - c - front (empty sector's front). A deeper node hangs off rear.
        // Construction's zero-assigned rescue reaches 3 hops and skips dug-in brigades; the bot
        // sector march moves assigned and reserve brigades only. Before SE7E a frontless sector
        // that listed any own reserve/rear was not "truly empty", so T1 never acted and an
        // eligible own rear brigade beyond 3 hops never moved.
        function addDeepNode(briefing: any, osid: string) {
            briefing.spatial.adjacency.set(osid, ['op:test:rear']);
            briefing.spatial.adjacency.set('op:test:rear', [
                ...(briefing.spatial.adjacency.get('op:test:rear') ?? []),
                osid,
            ]);
            briefing.spatial.friendlyOsidsByFaction.get('RBiH')!.add(osid);
        }
        function addOwn(
            briefing: any,
            id: string,
            locationOsid: string,
            bucket: 'rear' | 'reserve',
            posture = 'defend',
        ) {
            const own = structuredClone(briefing.state_ref.military.formations.relief_brigade);
            own.id = id;
            own.name = id;
            own.location_osid = locationOsid;
            own.home_osid = locationOsid;
            own.posture = posture;
            briefing.state_ref.military.formations[id] = own;
            briefing.brigades.push(own);
            const empty = briefing.sectors.find(
                (sector: { sector_id: string }) => sector.sector_id === 'sector:test:empty',
            );
            const key = bucket === 'rear' ? 'rear_brigade_ids' : 'reserve_brigade_ids';
            empty[key] = [...(empty[key] ?? []), id];
            return own;
        }
        const relief = (brigadeId: string, sectorId = 'sector:test:empty') => ({
            brigade_id: brigadeId,
            to_sector_id: sectorId,
            reason: 'empty front sector requires corps relief',
        });

        it('commits its own eligible rear brigade beyond the construction radius, not a closer sibling', () => {
            const briefing = makeBriefing();
            // Sibling rear donor at op:test:rear: 4 hops. Own rear at op:test:deep: 5 hops.
            addDeepNode(briefing, 'op:test:deep');
            const own = addOwn(briefing, 'own_far_rear', 'op:test:deep', 'rear');
            const before = structuredClone(own);

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([relief('own_far_rear')]);
            expect(own).toEqual(before); // intent only: no location or posture write
        });

        it('commits its own rear when its own reserve is dug in', () => {
            const briefing = makeBriefing();
            addOwn(briefing, 'own_dug_in_reserve', 'op:test:c', 'reserve', 'dig_in');
            addOwn(briefing, 'own_rear', 'op:test:a', 'rear');

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([relief('own_rear')]);
        });

        it('leaves a sector with an eligible own reserve to the reserve sector march', () => {
            const briefing = makeBriefing();
            addOwn(briefing, 'own_reserve', 'op:test:c', 'reserve');
            addOwn(briefing, 'own_rear', 'op:test:a', 'rear');

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        });

        it('commits its own dug-in rear rather than borrowing a sibling (dug-in donors are legal)', () => {
            const briefing = makeBriefing();
            const own = addOwn(briefing, 'own_dug_in_rear', 'op:test:c', 'rear', 'dig_in');
            const ownBefore = structuredClone(own);

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([relief('own_dug_in_rear')]);
            expect(own).toEqual(ownBefore); // intent only: no location or posture write
        });

        it('breaks a tie between equal own rear brigades by formation id', () => {
            const briefing = makeBriefing();
            addOwn(briefing, 'own_zulu', 'op:test:b', 'rear');
            addOwn(briefing, 'own_alpha', 'op:test:b', 'rear');

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([relief('own_alpha')]);
        });

        it('leaves a sector with a front brigade alone, whatever its reserve/rear lists say', () => {
            const briefing = makeBriefing();
            addOwn(briefing, 'own_rear', 'op:test:a', 'rear');
            const empty = briefing.sectors.find(
                (sector: { sector_id: string }) => sector.sector_id === 'sector:test:empty',
            );
            empty.assigned_brigade_ids = ['line_holder'];

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        });

        it('skips a frontless sector whose own rear brigade already stands on its front', () => {
            const briefing = makeBriefing();
            addOwn(briefing, 'own_on_front', 'op:test:front', 'rear');

            // Held in fact; only the buckets lag. No relief, and no sibling is borrowed.
            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        });

        // A second, fully empty sector on the same front (no own pool).
        function addFullyEmpty(briefing: any, sectorId: string, threat = 2) {
            const other = structuredClone(
                briefing.sectors.find((s: { sector_id: string }) => s.sector_id === 'sector:test:empty'),
            );
            other.sector_id = sectorId;
            other.reserve_brigade_ids = [];
            other.rear_brigade_ids = [];
            other.threat_ratio = threat;
            other.sub_segments[0].sub_segment_id = `${sectorId}:sub`;
            briefing.sectors.push(other);
        }

        it('is additive: a sector with no own pool keeps first call, even on the frontless sector\'s rear', () => {
            // The frontless sector sorts first (higher threat), but the fully empty sector is
            // served first, exactly as before SE7E. Its nearest legal donor is the frontless
            // sector's own rear (2 hops; the sibling donor is 4), so it takes it and the
            // frontless sector, with no free own rear left, waits.
            const briefing = makeBriefing();
            addOwn(briefing, 'own_rear', 'op:test:b', 'rear');
            briefing.sectors.find((s: { sector_id: string }) => s.sector_id === 'sector:test:empty')
                .threat_ratio = 5;
            addFullyEmpty(briefing, 'sector:test:empty_2', 2);

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([
                relief('own_rear', 'sector:test:empty_2'),
            ]);
        });

        it('commits a free own rear after the fully empty sector is served, never reusing a donor', () => {
            // Own rear 5 hops out, sibling donor 4 hops: the fully empty sector takes the sibling,
            // and the frontless sector then commits its own (still free) rear.
            const briefing = makeBriefing();
            addDeepNode(briefing, 'op:test:deep');
            addOwn(briefing, 'own_far_rear', 'op:test:deep', 'rear');
            addFullyEmpty(briefing, 'sector:test:empty_2');

            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([
                relief('relief_brigade', 'sector:test:empty_2'),
                relief('own_far_rear'),
            ]);
        });
    });

    it('does not issue intent when the friendly route is disconnected', () => {
        const briefing = makeBriefing();
        briefing.spatial.adjacency.delete('op:test:b');

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
        expect(briefing.state_ref.military.formations.relief_brigade.location_osid)
            .toBe('op:test:rear');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// P3 candidate B (2026-11-22): a relief lasts until the donor arrives (G-b), and the donor filter
// skips every brigade another authority will reclaim next turn (G-a and the reservation skips).
// ═══════════════════════════════════════════════════════════════════════════

const RELIEF_TARGET = 'sector:test:empty';
const reliefFor = (brigadeId: string, sectorId = RELIEF_TARGET) => ({
    brigade_id: brigadeId,
    to_sector_id: sectorId,
    reason: 'empty front sector requires corps relief',
});

/** Last turn's corps directive, as emit writes it for an empty-sector relief. */
function setPreviousReliefDirective(briefing: any, brigadeId: string, sectorId = RELIEF_TARGET) {
    const command = briefing.state_ref.military.corps_command ?? {};
    briefing.state_ref.military.corps_command = {
        ...command,
        test_corps: {
            ...(command.test_corps ?? {}),
            active_operations: command.test_corps?.active_operations ?? [],
            directive: {
                sector_reassignment_orders: [{ brigade_id: brigadeId, to_sector_id: sectorId, empty_sector_relief: true }],
            },
        },
    };
}

/**
 * Two legal rear donors: `nearId` at op:test:rear (4 hops to the empty front) and
 * `unreserved_far` at op:test:deep (5 hops). Without any reservation the near one wins.
 */
function makeTwoDonorBriefing(nearId: string, turn = 94) {
    const briefing = makeBriefing();
    const near = briefing.state_ref.military.formations.relief_brigade;
    delete briefing.state_ref.military.formations.relief_brigade;
    near.id = nearId;
    near.name = nearId;
    briefing.state_ref.military.formations[nearId] = near;

    briefing.spatial.adjacency.set('op:test:deep', ['op:test:rear']);
    briefing.spatial.adjacency.set('op:test:rear', [...(briefing.spatial.adjacency.get('op:test:rear') ?? []), 'op:test:deep']);
    briefing.spatial.friendlyOsidsByFaction.get('RBiH')!.add('op:test:deep');
    const far = structuredClone(near);
    far.id = 'unreserved_far';
    far.name = 'unreserved_far';
    far.location_osid = 'op:test:deep';
    far.home_osid = 'op:test:deep';
    briefing.state_ref.military.formations.unreserved_far = far;
    briefing.brigades = [near, far];

    const donorSector = briefing.sectors.find((s: { sector_id: string }) => s.sector_id === 'sector:test:donor');
    donorSector.rear_brigade_ids = [nearId, 'unreserved_far'];
    briefing.turn = turn;
    briefing.state_ref.meta.turn = turn;
    return briefing;
}

/** Resolve every dated plan except Zvezda 94, so only its reservation is live in the fixture. */
function onlyZvezda94Open(state: any) {
    state.operation_history = _ALL_PRE_PLANNED
        .filter((def) => def.name !== 'Operation Zvezda 94')
        .map((def) => ({ corps_id: def.corps, operation_name: def.name }));
}

function zvezdaPrestageState(briefing: any, livePhase?: 'planning' | 'execution' | 'recovery') {
    const state = briefing.state_ref;
    state.factions = [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }];
    onlyZvezda94Open(state);
    state.military.corps_command = livePhase
        ? {
            vrs_drina: {
                queued_operations: [],
                active_operations: [{
                    name: 'Operation Zvezda 94',
                    type: 'attack',
                    phase: livePhase,
                    participating_brigades: ['rs_65th_protection_motorized_regiment'],
                }],
            },
        }
        : {};
}

describe('P3 candidate B: an empty-sector relief persists while the donor is en route (G-b)', () => {
    it('re-emits the same relief for a donor sent last turn and now in transit toward the sector', () => {
        const briefing = makeBriefing();
        setPreviousReliefDirective(briefing, 'relief_brigade');
        briefing.state_ref.military.brigade_movement_state = {
            relief_brigade: { status: 'in_transit', stance: 'column', destination_sids: ['op:test:front'] },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('relief_brigade')]);
    });

    it('re-emits the same relief while the donor still holds the pending column order toward the sector', () => {
        const briefing = makeBriefing();
        setPreviousReliefDirective(briefing, 'relief_brigade');
        briefing.state_ref.military.brigade_movement_orders = {
            relief_brigade: { destination_sids: ['op:test:front'], stance: 'column', owner: 'bot_discretionary' },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('relief_brigade')]);
    });

    it('does not adopt an order toward the sector that was not a relief (no relief tag last turn)', () => {
        const briefing = makeBriefing();
        briefing.state_ref.military.brigade_movement_state = {
            relief_brigade: { status: 'in_transit', stance: 'column', destination_sids: ['op:test:front'] },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
    });

    it('does not re-emit once the donor has arrived on the target sector roster', () => {
        const briefing = makeBriefing();
        setPreviousReliefDirective(briefing, 'relief_brigade');
        const donor = briefing.state_ref.military.formations.relief_brigade;
        donor.location_osid = 'op:test:front';
        briefing.state_ref.military.brigade_movement_state = {
            relief_brigade: { status: 'unpacking', stance: 'column', destination_sids: ['op:test:front'] },
        };
        const target = briefing.sectors.find((s: { sector_id: string }) => s.sector_id === RELIEF_TARGET);
        const donorSector = briefing.sectors.find((s: { sector_id: string }) => s.sector_id === 'sector:test:donor');
        donorSector.rear_brigade_ids = [];
        target.rear_brigade_ids = ['relief_brigade'];

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([]);
    });

    it('does not re-emit when the target sector is no longer empty, and sends no reverse order for 3 turns', () => {
        const briefing = makeBriefing();
        setPreviousReliefDirective(briefing, 'relief_brigade');
        briefing.state_ref.military.brigade_movement_state = {
            relief_brigade: { status: 'in_transit', stance: 'column', destination_sids: ['op:test:front'] },
        };
        const target = briefing.sectors.find((s: { sector_id: string }) => s.sector_id === RELIEF_TARGET);
        target.assigned_brigade_ids = ['someone_else'];
        target.sub_segments[0].primary_brigade_ids = ['someone_else'];

        for (let turn = 13; turn <= 15; turn++) {
            briefing.turn = turn;
            briefing.state_ref.meta.turn = turn;
            const result = computeEmptySectorReliefReassignments(briefing);
            expect(result.filter((r) => r.brigade_id === 'relief_brigade')).toEqual([]);
            // The movement has ended in the meantime (correction deleted it): still nothing.
            briefing.state_ref.military.brigade_movement_state = {};
        }
    });

    it('is deterministic: shuffled brigade and sector order give the identical relief', () => {
        const build = (reverse: boolean) => {
            const briefing = makeTwoDonorBriefing('second_donor', 12);
            setPreviousReliefDirective(briefing, 'second_donor');
            briefing.state_ref.military.brigade_movement_state = {
                second_donor: { status: 'in_transit', stance: 'column', destination_sids: ['op:test:front'] },
            };
            if (reverse) {
                briefing.brigades = [...briefing.brigades].reverse();
                briefing.sectors = [...briefing.sectors].reverse();
                const donorSector = briefing.sectors.find((s: { sector_id: string }) => s.sector_id === 'sector:test:donor');
                donorSector.rear_brigade_ids = [...donorSector.rear_brigade_ids].reverse();
                briefing.state_ref.military.formations = Object.fromEntries(
                    Object.entries(briefing.state_ref.military.formations).reverse(),
                );
            }
            return computeEmptySectorReliefReassignments(briefing);
        };
        const forward = build(false);
        expect(forward).toEqual([reliefFor('second_donor')]);
        expect(build(true)).toEqual(forward);
    });
});

describe('P3 candidate B: the relief donor filter skips reserved brigades (G-a + reservation skips)', () => {
    it('does not take a brigade the dated pre-staging pass reclaims (op not yet live); a farther free donor goes', () => {
        const briefing = makeTwoDonorBriefing('rs_1st_podrinje');
        zvezdaPrestageState(briefing);

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('unreserved_far')]);
    });

    it('does not take a pre-staging brigade while the dated op is live in planning and it is not a participant', () => {
        const briefing = makeTwoDonorBriefing('rs_1st_podrinje');
        zvezdaPrestageState(briefing, 'planning');

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('unreserved_far')]);
    });

    it('window closed: the brigade is a legal donor again once the op is in execution or recovery', () => {
        for (const phase of ['execution', 'recovery'] as const) {
            const briefing = makeTwoDonorBriefing('rs_1st_podrinje');
            zvezdaPrestageState(briefing, phase);
            expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('rs_1st_podrinje')]);
        }
    });

    it('window closed: the brigade is a legal donor before prestage_from', () => {
        const briefing = makeTwoDonorBriefing('rs_1st_podrinje', 78);
        zvezdaPrestageState(briefing);

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('rs_1st_podrinje')]);
    });

    it('skips a brigade named only in an active operation axis roster', () => {
        const briefing = makeTwoDonorBriefing('axis_only', 12);
        briefing.state_ref.military.corps_command = {
            other_corps: {
                active_operations: [{
                    name: 'Axis Roster Op',
                    type: 'attack',
                    phase: 'planning',
                    participating_brigades: [],
                    axes: [{ axis_id: 'main', assigned_brigades: ['axis_only'], objectives: [] }],
                }],
            },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('unreserved_far')]);
    });

    it('skips a brigade in the commander\'s own concentrating plan, but not one in a suspended plan', () => {
        const plan = (status: string) => ({ status, assigned_brigades: ['planned_brigade'] }) as any;
        const concentrating = makeTwoDonorBriefing('planned_brigade', 12);
        expect(computeEmptySectorReliefReassignments(concentrating, plan('concentrating')))
            .toEqual([reliefFor('unreserved_far')]);
        const suspended = makeTwoDonorBriefing('planned_brigade', 12);
        expect(computeEmptySectorReliefReassignments(suspended, plan('suspended')))
            .toEqual([reliefFor('planned_brigade')]);
    });

    it('skips a brigade named in a catalog opportunity with a live proposal, not one already resolved', () => {
        const def = OPERATION_OPPORTUNITY_CATALOG[0]!;
        const brigadeId = def.axes[0]!.brigades[0]!;
        const proposal = (status: string) => [{
            opportunity_id: def.opportunity_id,
            proposal_id: `OPP_10_${def.opportunity_id}`,
            eligibility_turn: 10,
            expires_turn: 40,
            status,
        }];
        const live = makeTwoDonorBriefing(brigadeId, 12);
        live.state_ref.military.operation_opportunities = proposal('eligible_pending_review');
        expect(computeEmptySectorReliefReassignments(live)).toEqual([reliefFor('unreserved_far')]);

        const declined = makeTwoDonorBriefing(brigadeId, 12);
        declined.state_ref.military.operation_opportunities = proposal('declined');
        expect(computeEmptySectorReliefReassignments(declined)).toEqual([reliefFor(brigadeId)]);
    });

    it('skips a brigade held by a due queue head (head-queued pre-planned roster)', () => {
        const briefing = makeTwoDonorBriefing('rs_1st_podrinje');
        // No staff-controlled factions: the dated pre-staging pass is off, only the queue head holds.
        briefing.state_ref.military.corps_command = {
            vrs_drina: { queued_operations: ['Operation Zvezda 94'], active_operations: [] },
        };

        expect(computeEmptySectorReliefReassignments(briefing)).toEqual([reliefFor('unreserved_far')]);
    });

    it('skips a brigade under a historical elite reservation, and takes it once the reservation lapses', () => {
        const held = makeTwoDonorBriefing('rs_1st_guards_motorized', 100);
        expect(computeEmptySectorReliefReassignments(held)).toEqual([reliefFor('unreserved_far')]);
        const released = makeTwoDonorBriefing('rs_1st_guards_motorized', 114);
        expect(computeEmptySectorReliefReassignments(released)).toEqual([reliefFor('rs_1st_guards_motorized')]);
    });

    it('parity: the predicate returns exactly the brigades whose order the pre-staging pass deletes or replaces', () => {
        const state: any = {
            meta: { turn: 94 },
            factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
            military: {
                formations: {},
                corps_command: {
                    other_corps: {
                        queued_operations: [],
                        active_operations: [{
                            name: 'Some Other Op', type: 'attack', phase: 'execution',
                            participating_brigades: ['rs_1st_birac'],
                        }],
                    },
                },
                brigade_movement_orders: {},
                brigade_movement_state: {},
            },
            political: { political_controllers: {} },
        };
        onlyZvezda94Open(state);
        const zvezda = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Zvezda 94')!;
        const roster = [...new Set(zvezda.axes.flatMap((axis) => axis.brigades as string[]))].sort();
        const ids = [...roster, 'unreserved_x'];
        for (const id of ids) {
            state.military.formations[id] = {
                id, name: id, faction: 'RS', kind: 'brigade', status: 'active', created_turn: 0,
                assignment: null, corps_id: 'vrs_drina', location_osid: 'op:test:elsewhere',
            };
            state.military.brigade_movement_orders[id] = {
                destination_sids: ['op:test:away'], stance: 'column', owner: 'bot_discretionary',
            };
        }
        // One roster brigade stands at its axis staging and is ordered away (the at-staging branch).
        const stagingAxis = zvezda.axes.find((axis) => axis.brigades.includes('rs_1st_podrinje' as any))!;
        state.military.formations.rs_1st_podrinje.location_osid = stagingAxis.staging_osid;
        // One roster brigade is on a Main Staff loan to another corps: the pass leaves it alone.
        state.military.formations.rs_1st_guards_motorized.elite_loan_state = {
            on_loan: true, loaned_to_corps: 'vrs_other', loan_start_turn: 90,
        };

        const predicate = (prePlanned as any).getActivePrestageReservedBrigadeIds;
        expect(typeof predicate).toBe('function');
        const reserved = [...(predicate(state) as Set<string>)].sort();

        const after = structuredClone(state);
        prePlanned.prestageDeferredPrePlannedElites(after);
        const changed = ids.filter((id) =>
            JSON.stringify(after.military.brigade_movement_orders[id] ?? null)
            !== JSON.stringify(state.military.brigade_movement_orders[id])).sort();

        expect(reserved).toEqual(changed);
        expect(reserved).toContain('rs_1st_podrinje');
        expect(reserved).not.toContain('rs_1st_birac'); // conflicting commitment
        expect(reserved).not.toContain('rs_1st_guards_motorized'); // loaned elsewhere
        expect(after.military.brigade_movement_orders.unreserved_x)
            .toEqual(state.military.brigade_movement_orders.unreserved_x);
    });
});
