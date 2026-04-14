/**
 * Regression tests for the Lane B fix:
 *   `splitNonContiguousSectors` can emit child sectors with zero assigned brigades.
 *   A territory-membership pre-pass in `ensureMinimumSectorCoverage` must move a brigade
 *   from a sibling donor sector into the zero-brigade child when the brigade's
 *   `location_osid` is inside the child's `territory_osids` — before Step 1/2 BFS runs.
 *
 * Tests are written AHEAD of the implementation (TDD).  Tests 1, 5 should PASS once
 * the pre-pass is implemented.  Tests 2, 3, 4, 6 verify guard conditions that must
 * prevent spurious transfers; they should PASS whether or not the pre-pass exists
 * (i.e. they are "no-transfer" assertions that hold in both states).
 */

import { describe, it, expect } from 'vitest';
import { ensureMinimumSectorCoverage } from '../src/sim/combat/brigade_assignment.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeFormation(
    id: string,
    overrides: Partial<FormationState> & { location_osid?: string },
): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        status: 'active',
        kind: 'brigade',
        personnel: 1200,
        morale: 70,
        cohesion: 70,
        corps_id: 'vrs_krajina',
        created_turn: 1,
        assignment: null,
        ...overrides,
    } as FormationState;
}

function makeSubSeg(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeCount: number,
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, i) => `edge_${id}_${i}`),
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeCount,
        primary_brigade_ids: [],
    };
}

function makeSector(opts: {
    sectorId: string;
    corpsId: string;
    subSegments: CorpsFrontSubSegment[];
    territoryOsids: string[];
    assignedBrigadeIds?: string[];
    reserveBrigadeIds?: string[];
    lengthEdges?: number;
}): CorpsFrontSector {
    const allEdges = opts.subSegments.flatMap(s => s.edge_ids);
    return {
        sector_id: opts.sectorId,
        corps_id: opts.corpsId,
        faction: 'RS' as FactionId,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: allEdges,
        sub_segments: opts.subSegments,
        length_edges: opts.lengthEdges ?? allEdges.length,
        territory_osids: opts.territoryOsids,
        assigned_brigade_ids: opts.assignedBrigadeIds ?? [],
        reserve_brigade_ids: opts.reserveBrigadeIds ?? [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    } as CorpsFrontSector;
}

/**
 * Build a bidirectional adjacency map from a list of [a, b] OSID pairs.
 */
function makeAdjacency(connections: [string, string][]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const [a, b] of connections) {
        const la = adj.get(a as Osid) ?? [];
        if (!la.includes(b)) la.push(b);
        adj.set(a as Osid, la);
        const lb = adj.get(b as Osid) ?? [];
        if (!lb.includes(a)) lb.push(a);
        adj.set(b as Osid, lb);
    }
    return adj;
}

function makeComponentOf(mapping: Record<string, number>): Map<string, number> {
    return new Map(Object.entries(mapping));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ensureMinimumSectorCoverage — Lane B pre-pass (territory membership)', () => {

    /**
     * Test 1 (FAILS before fix):
     * A brigade's location_osid is inside the zero-brigade child's territory_osids
     * but NOT in the donor's front OSIDs.  The pre-pass must transfer it.
     */
    it('fills zero-brigade child when a donor brigade is in its territory (happy path)', () => {
        // largeChild: donor sector with 2 brigades; both osid_1 and osid_2 are its front.
        // bde_b is at osid_3 which is zeroChild's territory but NOT largeChild's front.
        const largeChildSs = makeSubSeg(
            'ss_large',
            ['op:municipality:osid_1', 'op:municipality:osid_2'], // front OSIDs
            ['op:enemy:e1'],
            4,
        );
        const largeChild = makeSector({
            sectorId: 'sector:vrs_krajina:large',
            corpsId: 'vrs_krajina',
            subSegments: [largeChildSs],
            territoryOsids: ['op:municipality:osid_1', 'op:municipality:osid_2'],
            assignedBrigadeIds: ['bde_a', 'bde_b'],
        });

        // zeroChild: the empty post-split sector; osid_3 is its sole territory.
        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_3'], // front OSID of the zero-brigade sector
            ['op:enemy:e2'],
            5,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_3'],
            assignedBrigadeIds: [],
            lengthEdges: 5,
        });

        // bde_a is on largeChild's front (osid_1). bde_b is physically at osid_3.
        const formations: Record<FormationId, FormationState> = {
            bde_a: makeFormation('bde_a', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_1',
            }),
            bde_b: makeFormation('bde_b', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_3',
            }),
        };

        // Fully connected graph so BFS can reach everything.
        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
            ['op:municipality:osid_2', 'op:municipality:osid_3'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
            'op:municipality:osid_3',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
            'op:municipality:osid_3': 0,
        });

        ensureMinimumSectorCoverage(
            [largeChild, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // Pre-pass must move bde_b into zeroChild.
        expect(zeroChild.assigned_brigade_ids).toContain('bde_b');
        expect(largeChild.assigned_brigade_ids).not.toContain('bde_b');
        // largeChild still retains bde_a.
        expect(largeChild.assigned_brigade_ids).toContain('bde_a');
    });

    /**
     * Test 2 (guard — must hold before AND after fix):
     * The candidate brigade's location_osid is in the donor's OWN front OSIDs.
     * The pre-pass must NOT pull a frontline-essential brigade.
     * zeroChild remains empty; Step 1/2 will try BFS as normal.
     */
    it('does NOT pull a brigade that is on the donor sector front OSID', () => {
        // largeChild's front includes osid_3. bde_b sits on osid_3 = frontline.
        const largeChildSs = makeSubSeg(
            'ss_large',
            ['op:municipality:osid_1', 'op:municipality:osid_2', 'op:municipality:osid_3'],
            ['op:enemy:e1'],
            6,
        );
        const largeChild = makeSector({
            sectorId: 'sector:vrs_krajina:large',
            corpsId: 'vrs_krajina',
            subSegments: [largeChildSs],
            territoryOsids: [
                'op:municipality:osid_1',
                'op:municipality:osid_2',
                'op:municipality:osid_3',
            ],
            assignedBrigadeIds: ['bde_a', 'bde_b'],
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_3'], // same OSID as donor front
            ['op:enemy:e2'],
            5,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_3'],
            assignedBrigadeIds: [],
            lengthEdges: 5,
        });

        const formations: Record<FormationId, FormationState> = {
            bde_a: makeFormation('bde_a', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_1',
            }),
            bde_b: makeFormation('bde_b', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_3',
            }),
        };

        // Disconnected: osid_3 is isolated so BFS cannot fill via Step 2 either.
        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
        ]);
        // osid_3 is in a different component.
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
            'op:municipality:osid_3',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
            'op:municipality:osid_3': 1, // different component → Step 2 also can't act
        });

        ensureMinimumSectorCoverage(
            [largeChild, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // Frontline brigade must not be stripped.
        expect(largeChild.assigned_brigade_ids).toContain('bde_b');
        // zeroChild remains empty because both guards block the transfer.
        expect(zeroChild.assigned_brigade_ids).toHaveLength(0);
    });

    /**
     * Test 2b (FAILS before fix):
     * The candidate brigade sits on a front OSID shared by donor and zeroChild.
     * The pre-pass may transfer it only when the donor still retains its own
     * hostile-edge floor after donation. This mirrors the live split-child
     * overlap seam from the density audit.
     */
    it('rescues a zero-brigade shared-front child when the donor keeps its hostile-edge floor', () => {
        const donorSs = makeSubSeg(
            'ss_donor',
            ['op:municipality:osid_1', 'op:municipality:osid_shared'],
            ['op:enemy:e1', 'op:enemy:e2'],
            2,
        );
        const donor = makeSector({
            sectorId: 'sector:vrs_krajina:donor',
            corpsId: 'vrs_krajina',
            subSegments: [donorSs],
            territoryOsids: [
                'op:municipality:osid_1',
                'op:municipality:osid_shared',
                'op:municipality:osid_rear',
            ],
            assignedBrigadeIds: ['bde_front', 'bde_shared', 'bde_rear'],
            lengthEdges: 2,
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_shared'],
            ['op:enemy:e3', 'op:enemy:e4', 'op:enemy:e5', 'op:enemy:e6'],
            4,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_shared'],
            assignedBrigadeIds: [],
            lengthEdges: 4,
        });

        const formations: Record<FormationId, FormationState> = {
            bde_front: makeFormation('bde_front', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_1',
            }),
            bde_shared: makeFormation('bde_shared', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_shared',
            }),
            bde_rear: makeFormation('bde_rear', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_rear',
            }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_shared'],
            ['op:municipality:osid_1', 'op:municipality:osid_rear'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_shared',
            'op:municipality:osid_rear',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_shared': 0,
            'op:municipality:osid_rear': 0,
        });

        ensureMinimumSectorCoverage(
            [donor, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(zeroChild.assigned_brigade_ids).toEqual(['bde_shared']);
        expect(donor.assigned_brigade_ids).toEqual(['bde_front', 'bde_rear']);
    });

    /**
     * Test 3 (guard — must hold before AND after fix):
     * Donor has exactly 1 brigade. The pre-pass must NOT strip it (donor-floor guard).
     */
    it('does NOT pull if donor would drop below 1 brigade', () => {
        const donorSs = makeSubSeg(
            'ss_donor',
            ['op:municipality:osid_1'],
            ['op:enemy:e1'],
            3,
        );
        const donor = makeSector({
            sectorId: 'sector:vrs_krajina:donor',
            corpsId: 'vrs_krajina',
            subSegments: [donorSs],
            territoryOsids: ['op:municipality:osid_1'],
            assignedBrigadeIds: ['bde_a'], // exactly 1 — must not be stripped
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_2'],
            ['op:enemy:e2'],
            4,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_2'],
            assignedBrigadeIds: [],
            lengthEdges: 4,
        });

        // bde_a is physically at osid_2 (zeroChild territory) but donor has only 1.
        const formations: Record<FormationId, FormationState> = {
            bde_a: makeFormation('bde_a', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_2',
            }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
        });

        ensureMinimumSectorCoverage(
            [donor, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // Donor must retain its only brigade.
        expect(donor.assigned_brigade_ids).toContain('bde_a');
        // zeroChild stays empty — no valid donor.
        expect(zeroChild.assigned_brigade_ids).toHaveLength(0);
    });

    /**
     * Test 4 (guard — must hold before AND after fix):
     * Donor and recipient are in different corps.  No cross-corps transfer allowed.
     */
    it('does NOT transfer across corps boundaries', () => {
        const donorSs = makeSubSeg(
            'ss_donor',
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
            ['op:enemy:e1'],
            4,
        );
        // Different corps IDs.
        const donor = makeSector({
            sectorId: 'sector:vrs_1st_krajina:donor',
            corpsId: 'vrs_1st_krajina',
            subSegments: [donorSs],
            territoryOsids: ['op:municipality:osid_1', 'op:municipality:osid_2'],
            assignedBrigadeIds: ['bde_a', 'bde_b'],
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_3'],
            ['op:enemy:e2'],
            5,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_2nd_krajina:zero',
            corpsId: 'vrs_2nd_krajina', // different corps
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_3'],
            assignedBrigadeIds: [],
            lengthEdges: 5,
        });

        // bde_b is physically in zeroChild territory.
        const formations: Record<FormationId, FormationState> = {
            bde_a: makeFormation('bde_a', {
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:municipality:osid_1',
            }),
            bde_b: makeFormation('bde_b', {
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:municipality:osid_3',
            }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
            ['op:municipality:osid_2', 'op:municipality:osid_3'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
            'op:municipality:osid_3',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
            'op:municipality:osid_3': 0,
        });

        ensureMinimumSectorCoverage(
            [donor, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // No cross-corps transfer: donor retains both brigades.
        expect(donor.assigned_brigade_ids).toContain('bde_b');
        // zeroChild cannot be filled from a different corps.
        expect(zeroChild.assigned_brigade_ids).toHaveLength(0);
    });

    /**
     * Test 5 (FAILS before fix — ordering):
     * When two donor sectors each have a brigade in the zero-child's territory,
     * the brigade taken should come from the most-surplus donor (most brigades first).
     */
    it('prefers the donor sector with the most surplus when multiple candidates exist', () => {
        // donorA: 3 brigades — most surplus.
        // donorB: 2 brigades.
        // bde_c (in donorA) and bde_e (in donorB) are both at osid_3 (zeroChild territory).
        // None of these brigades are on their donor's front OSIDs.

        const donorASs = makeSubSeg(
            'ss_donorA',
            ['op:municipality:osid_1'], // front
            ['op:enemy:e1'],
            3,
        );
        const donorA = makeSector({
            sectorId: 'sector:vrs_krajina:donorA',
            corpsId: 'vrs_krajina',
            subSegments: [donorASs],
            territoryOsids: ['op:municipality:osid_1', 'op:municipality:osid_3'],
            assignedBrigadeIds: ['bde_a', 'bde_b', 'bde_c'], // 3 brigades
        });

        const donorBSs = makeSubSeg(
            'ss_donorB',
            ['op:municipality:osid_2'], // front
            ['op:enemy:e2'],
            3,
        );
        const donorB = makeSector({
            sectorId: 'sector:vrs_krajina:donorB',
            corpsId: 'vrs_krajina',
            subSegments: [donorBSs],
            territoryOsids: ['op:municipality:osid_2', 'op:municipality:osid_3'],
            assignedBrigadeIds: ['bde_d', 'bde_e'], // 2 brigades
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            ['op:municipality:osid_3'],
            ['op:enemy:e3'],
            5,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: ['op:municipality:osid_3'],
            assignedBrigadeIds: [],
            lengthEdges: 5,
        });

        const formations: Record<FormationId, FormationState> = {
            // donorA brigades
            bde_a: makeFormation('bde_a', { corps_id: 'vrs_krajina', location_osid: 'op:municipality:osid_1' }),
            bde_b: makeFormation('bde_b', { corps_id: 'vrs_krajina', location_osid: 'op:municipality:osid_1' }),
            bde_c: makeFormation('bde_c', { corps_id: 'vrs_krajina', location_osid: 'op:municipality:osid_3' }),
            // donorB brigades
            bde_d: makeFormation('bde_d', { corps_id: 'vrs_krajina', location_osid: 'op:municipality:osid_2' }),
            bde_e: makeFormation('bde_e', { corps_id: 'vrs_krajina', location_osid: 'op:municipality:osid_3' }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_3'],
            ['op:municipality:osid_2', 'op:municipality:osid_3'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
            'op:municipality:osid_3',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
            'op:municipality:osid_3': 0,
        });

        ensureMinimumSectorCoverage(
            [donorA, donorB, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // Exactly one brigade should fill the zeroChild.
        expect(zeroChild.assigned_brigade_ids).toHaveLength(1);
        // The brigade should come from donorA (most surplus), so bde_c.
        expect(zeroChild.assigned_brigade_ids).toContain('bde_c');
        // donorA should have donated bde_c.
        expect(donorA.assigned_brigade_ids).not.toContain('bde_c');
        // donorB should be untouched.
        expect(donorB.assigned_brigade_ids).toContain('bde_e');
    });

    it('rescues an empty shared-front child from a donor that can still retain a brigade', () => {
        const sharedOsid = 'op:municipality:shared_front';
        const donorSs = makeSubSeg(
            'ss_donor',
            ['op:municipality:donor_front', sharedOsid],
            ['op:enemy:e1'],
            7,
        );
        const donor = makeSector({
            sectorId: 'sector:vrs_krajina:donor',
            corpsId: 'vrs_krajina',
            subSegments: [donorSs],
            territoryOsids: ['op:municipality:donor_front', sharedOsid],
            assignedBrigadeIds: ['bde_anchor', 'bde_shared'],
            lengthEdges: 7,
        });

        const zeroChildSs = makeSubSeg(
            'ss_zero',
            [sharedOsid, 'op:municipality:zero_front'],
            ['op:enemy:e2'],
            5,
        );
        const zeroChild = makeSector({
            sectorId: 'sector:vrs_krajina:zero',
            corpsId: 'vrs_krajina',
            subSegments: [zeroChildSs],
            territoryOsids: [sharedOsid, 'op:municipality:zero_front'],
            assignedBrigadeIds: [],
            lengthEdges: 5,
        });

        const formations: Record<FormationId, FormationState> = {
            bde_anchor: makeFormation('bde_anchor', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:donor_front',
            }),
            bde_shared: makeFormation('bde_shared', {
                corps_id: 'vrs_krajina',
                location_osid: sharedOsid,
            }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:donor_front', sharedOsid],
            [sharedOsid, 'op:municipality:zero_front'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:donor_front',
            sharedOsid,
            'op:municipality:zero_front',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:donor_front': 0,
            [sharedOsid]: 0,
            'op:municipality:zero_front': 0,
        });

        ensureMinimumSectorCoverage(
            [donor, zeroChild],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(donor.assigned_brigade_ids).toEqual(['bde_anchor']);
        expect(zeroChild.assigned_brigade_ids).toEqual(['bde_shared']);
    });

    /**
     * Test 6 (guard — must hold before AND after fix):
     * A sector with zero assigned brigades AND zero front edges must NOT be targeted
     * by the pre-pass (length_edges === 0 guard).
     */
    it('does NOT target a zero-brigade sector that has no front edges', () => {
        const donorSs = makeSubSeg(
            'ss_donor',
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
            ['op:enemy:e1'],
            4,
        );
        const donor = makeSector({
            sectorId: 'sector:vrs_krajina:donor',
            corpsId: 'vrs_krajina',
            subSegments: [donorSs],
            territoryOsids: ['op:municipality:osid_1', 'op:municipality:osid_2'],
            assignedBrigadeIds: ['bde_a', 'bde_b'],
        });

        // emptyNoFront: zero brigades, zero length_edges — must be ignored by pre-pass.
        const emptyNoFront = makeSector({
            sectorId: 'sector:vrs_krajina:empty_no_front',
            corpsId: 'vrs_krajina',
            subSegments: [], // no sub-segments = no front OSIDs
            territoryOsids: ['op:municipality:osid_3'],
            assignedBrigadeIds: [],
            lengthEdges: 0, // explicit: no front edges
        });

        // bde_b is physically at osid_3 (emptyNoFront territory).
        const formations: Record<FormationId, FormationState> = {
            bde_a: makeFormation('bde_a', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_1',
            }),
            bde_b: makeFormation('bde_b', {
                corps_id: 'vrs_krajina',
                location_osid: 'op:municipality:osid_3',
            }),
        };

        const adjacency = makeAdjacency([
            ['op:municipality:osid_1', 'op:municipality:osid_2'],
            ['op:municipality:osid_2', 'op:municipality:osid_3'],
        ]);
        const friendlyOsids = new Set([
            'op:municipality:osid_1',
            'op:municipality:osid_2',
            'op:municipality:osid_3',
        ]);
        const componentOf = makeComponentOf({
            'op:municipality:osid_1': 0,
            'op:municipality:osid_2': 0,
            'op:municipality:osid_3': 0,
        });

        ensureMinimumSectorCoverage(
            [donor, emptyNoFront],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        // emptyNoFront has no front edges; it must remain unaffected.
        expect(emptyNoFront.assigned_brigade_ids).toHaveLength(0);
        // donor retains all its brigades.
        expect(donor.assigned_brigade_ids).toContain('bde_a');
        expect(donor.assigned_brigade_ids).toContain('bde_b');
    });
});
