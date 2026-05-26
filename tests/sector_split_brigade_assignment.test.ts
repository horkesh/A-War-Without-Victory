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
import {
    classifyBrigadesByTerritory,
    ensureMinimumSectorCoverage,
} from '../src/sim/combat/brigade_assignment.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsFrontSector,
    type CorpsFrontSubSegment,
    type FactionId,
    type FormationId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { makeAdjacency as makeAdjacencyShared } from './_helpers/adjacency.js';

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
 * Wraps the shared `makeAdjacency` helper while preserving the local
 * `Map<Osid, Osid[]>` return shape.
 */
const makeAdjacency = (connections: [string, string][]): Map<Osid, Osid[]> =>
    makeAdjacencyShared(connections) as unknown as Map<Osid, Osid[]>;

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

// ────────────────────────────────────────────────────────────────────────────
// Absorbed from sector_shared_front_assignment.test.ts (Phase 3 §2 leftover)
// ────────────────────────────────────────────────────────────────────────────

type SharedFrontFormationOverrides = Partial<FormationState> & {
  id: string;
  faction: FormationState['faction'];
  location_osid: string;
  corps_id?: string;
  equipment?: Record<string, number>;
};

type SharedFrontSectorOverrides = Partial<CorpsFrontSector> & {
  sector_id: string;
  corps_id: string;
  front_osids?: string[];
  enemy_osids?: string[];
  pressure_level?: string;
  threat_score?: number;
  neighbor_sector_ids?: string[];
  centroid?: { x: number; y: number };
  contiguous_components?: number;
  needs_brigade?: boolean;
  sub_segments?: CorpsFrontSubSegment[];
};

function makeSharedFrontFormation(overrides: SharedFrontFormationOverrides): FormationState {
  const {
    id,
    faction,
    location_osid,
    corps_id = 'test_corps',
    equipment = {},
    ...rest
  } = overrides;

  return {
    id,
    kind: 'brigade',
    faction,
    name: id,
    status: 'active',
    corps_id,
    location_osid,
    personnel: overrides.personnel ?? 1000,
    equipment,
    readiness: overrides.readiness ?? 1,
    assignment: overrides.assignment,
    posture: overrides.posture,
    home_osid: overrides.home_osid,
    ...rest,
  } as unknown as FormationState;
}

function makeSharedFrontSector(overrides: SharedFrontSectorOverrides): CorpsFrontSector {
  const frontOsids = overrides.front_osids ? [...overrides.front_osids] : [];
  const enemyOsids = overrides.enemy_osids ? [...overrides.enemy_osids] : [];
  const edgeIds = frontOsids.map((osid, idx) => `${overrides.sector_id}:edge:${idx}:${osid}`);

  return {
    sector_id: overrides.sector_id,
    corps_id: overrides.corps_id,
    faction: 'RS',
    opposing_factions: ['RBiH'],
    edge_ids: edgeIds,
    length_edges: overrides.length_edges ?? 1,
    front_osids: frontOsids,
    enemy_osids: enemyOsids,
    territory_osids: overrides.territory_osids ? [...overrides.territory_osids] : [],
    assigned_brigade_ids: overrides.assigned_brigade_ids ? [...overrides.assigned_brigade_ids] : [],
    reserve_brigade_ids: overrides.reserve_brigade_ids ? [...overrides.reserve_brigade_ids] : [],
    pressure_level: overrides.pressure_level ?? 'balanced',
    threat_score: overrides.threat_score ?? 0,
    neighbor_sector_ids: overrides.neighbor_sector_ids ? [...overrides.neighbor_sector_ids] : [],
    centroid: overrides.centroid ?? { x: 0, y: 0 },
    contiguous_components: overrides.contiguous_components ?? 1,
    needs_brigade: overrides.needs_brigade ?? false,
    sub_segments: overrides.sub_segments ?? [{
      sub_segment_id: `${overrides.sector_id}:segment`,
      friendly_osids: frontOsids,
      enemy_osids: enemyOsids,
      edge_ids: edgeIds,
      length_edges: overrides.length_edges ?? (frontOsids.length || 1),
      primary_brigade_ids: [],
    }],
    density: 0,
    threat_ratio: 0,
    defensive_power: 0,
    sector_stance: 'defend',
    stance_source: 'bot',
  } as unknown as CorpsFrontSector;
}

describe('classifyBrigadesByTerritory shared-front assignment', () => {
  it('assigns a brigade at a shared front OSID to the neediest sibling sector instead of the highest-threat one', () => {
    const sectors: CorpsFrontSector[] = [
      makeSharedFrontSector({
        sector_id: 'sector:test:0',
        corps_id: 'test_corps',
        length_edges: 4,
        front_osids: ['shared_front'],
        enemy_osids: ['enemy_heavy'],
        territory_osids: ['rear_a'],
      }),
      makeSharedFrontSector({
        sector_id: 'sector:test:1',
        corps_id: 'test_corps',
        length_edges: 9,
        front_osids: ['shared_front', 'needy_front'],
        enemy_osids: ['enemy_light'],
        territory_osids: ['rear_b'],
      }),
    ];

    const formations: Record<string, FormationState> = {
      brig_shared: makeSharedFrontFormation({
        id: 'brig_shared',
        faction: 'vrs',
        corps_id: 'test_corps',
        location_osid: 'shared_front',
        personnel: 1800,
      }),
      enemy_heavy: makeSharedFrontFormation({
        id: 'enemy_heavy',
        faction: 'arbih',
        corps_id: 'enemy_corps',
        location_osid: 'enemy_heavy',
        personnel: 5000,
      }),
      enemy_light: makeSharedFrontFormation({
        id: 'enemy_light',
        faction: 'arbih',
        corps_id: 'enemy_corps',
        location_osid: 'enemy_light',
        personnel: 500,
      }),
    };

    const state = {
      political: {
        control: {},
      },
      map: {
        osid_owner: {},
      },
      military: {
        elite_loan_assignments: {},
      },
    } as unknown as GameState;

    const componentOf = new Map<string, number>([
      ['shared_front', 0],
      ['needy_front', 0],
      ['rear_a', 0],
      ['rear_b', 0],
      ['enemy_heavy', 1],
      ['enemy_light', 1],
    ]);
    const friendlyOsids = new Set(['shared_front', 'needy_front', 'rear_a', 'rear_b']);

    classifyBrigadesByTerritory(
      sectors,
      'vrs',
      formations,
      new Map(),
      friendlyOsids,
      componentOf,
      new Map(),
      undefined,
      state,
    );

    expect(sectors[0]!.assigned_brigade_ids).toEqual([]);
    expect(sectors[1]!.assigned_brigade_ids).toEqual(['brig_shared']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Absorbed from sector_misassignment_relocation.test.ts (Phase 3 §2 leftover)
// ────────────────────────────────────────────────────────────────────────────

function makeMisassignFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        morale: 70,
        ...overrides,
    } as FormationState;
}

describe('post-merge misassignment relocation', () => {
    it('keeps a brigade with the same-corps sector that truthfully owns its current location', () => {
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'sector-misassignment-relocation',
                phase: 'war',
                scenario_start_date: { year: 1992, month: 4, day: 6 },
                referendum_held: true,
                referendum_turn: 1,
                war_start_turn: 1,
            } as GameState['meta'],
            factions: [
                { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
                { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as unknown as GameState['factions'],
            military: {
                formations: {
                    corps_a: makeMisassignFormation('corps_a', {
                        kind: 'corps',
                        location_osid: 'op:hq',
                        personnel: 50,
                    }),
                    brig_home: makeMisassignFormation('brig_home', {
                        corps_id: 'corps_a',
                        location_osid: 'op:home:rear',
                        home_osid: 'op:home:rear',
                    }),
                    brig_front: makeMisassignFormation('brig_front', {
                        corps_id: 'corps_a',
                        location_osid: 'op:front:a',
                        home_osid: 'op:front:a',
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:front:a__op:enemy:a', a: 'op:front:a', b: 'op:enemy:a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:front:b__op:enemy:b', a: 'op:front:b', b: 'op:enemy:b', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                army_co_decision_traces: {},
                army_corps_directives_by_faction: {},
                event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:hq': 'RS',
                    'op:front:a': 'RS',
                    'op:front:b': 'RS',
                    'op:home:rear': 'RS',
                    'op:enemy:a': 'RBiH',
                    'op:enemy:b': 'RBiH',
                },
            } as unknown as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const edges: EdgeRecord[] = [
            { a: 'op:hq', b: 'op:front:a' } as EdgeRecord,
            { a: 'op:hq', b: 'op:front:b' } as EdgeRecord,
            { a: 'op:hq', b: 'op:home:rear' } as EdgeRecord,
            { a: 'op:front:a', b: 'op:enemy:a' } as EdgeRecord,
            { a: 'op:front:b', b: 'op:enemy:b' } as EdgeRecord,
        ];

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const assignedOwner = Object.values(sectors).find((sector) => sector.assigned_brigade_ids.includes('brig_home'));
        expect(assignedOwner).toBeDefined();
        expect(state.military.formations.brig_home.location_osid).toMatch(/^op:front:/);
        expect(state.military.formations.brig_home.assignment).toEqual({
            kind: 'sector',
            sector_id: assignedOwner?.sector_id,
            role: 'front',
        });
        for (const sector of Object.values(sectors)) {
            if (sector.sector_id === assignedOwner?.sector_id) continue;
            expect(sector.assigned_brigade_ids).not.toContain('brig_home');
            expect(sector.reserve_brigade_ids).not.toContain('brig_home');
            expect(sector.rear_brigade_ids ?? []).not.toContain('brig_home');
        }
    });
});
