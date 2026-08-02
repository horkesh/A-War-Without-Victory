import { describe, expect, it } from 'vitest';

import type { OsidCentroidMap } from '../src/data/operational_data_types.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';
import {
    decomposeIntoConnectedComponents,
    splitSubSegmentAtMidpoint,
} from '../src/sim/combat/sector_building.js';
import {
    buildEdgeAdjacency,
    buildEdgeAdjacencyStrictCaseB,
} from '../src/sim/combat/sector_edge_adjacency.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { splitNonContiguousSectors } from '../src/sim/combat/sector_splitting.js';
import {
    buildSectorFrontEdgeAdjacency,
    createSectorFrontEdgeRelation,
    createSectorFrontEdgeRelationTestCounters,
    type FrontEdgeRelationMode,
} from '../src/sim/combat/sector_front_edge_relation.js';

type EdgeMeta = {
    a: string;
    b: string;
    side_a?: string | null;
    side_b?: string | null;
};

const FACTION = 'F';

function addUndirected(adjacency: Map<Osid, Osid[]>, a: string, b: string): void {
    const left = adjacency.get(a as Osid) ?? [];
    left.push(b as Osid);
    left.sort(strictCompare);
    adjacency.set(a as Osid, left);

    const right = adjacency.get(b as Osid) ?? [];
    right.push(a as Osid);
    right.sort(strictCompare);
    adjacency.set(b as Osid, right);
}

function makeFixture(): {
    edgeIds: string[];
    edgeMeta: Map<string, EdgeMeta>;
    osidAdjacency: Map<Osid, Osid[]>;
    sharedBoundaryAdj: Map<Osid, Osid[]>;
    strictAdjForCaseB: Map<Osid, Osid[]>;
    centroids: OsidCentroidMap;
} {
    const edgeMeta = new Map<string, EdgeMeta>([
        ['case-a-left', { a: 'f-a', b: 'h-a-left', side_a: FACTION, side_b: 'E' }],
        ['case-a-right', { a: 'h-a-right', b: 'f-a', side_a: 'E', side_b: FACTION }],
        ['case-b-left', { a: 'f-b-left', b: 'h-b', side_a: FACTION, side_b: 'E' }],
        ['case-b-right', { a: 'h-b', b: 'f-b-right', side_a: 'E', side_b: FACTION }],
        ['strict-reject-left', { a: 'f-s-left', b: 'h-s', side_a: FACTION, side_b: 'E' }],
        ['strict-reject-right', { a: 'f-s-right', b: 'h-s', side_a: FACTION, side_b: 'E' }],
        ['bridge-left', { a: 'f-bridge-left', b: 'h-bridge', side_a: FACTION, side_b: 'E' }],
        ['bridge-right', { a: 'f-bridge-right', b: 'h-bridge', side_a: FACTION, side_b: 'E' }],
        ['other-faction', { a: 'x', b: 'y', side_a: 'X', side_b: 'E' }],
        // Deliberately absent from edgeMeta: the legacy builders skip it.
    ]);
    const edgeIds = [...edgeMeta.keys(), 'missing-meta'];

    const osidAdjacency = new Map<Osid, Osid[]>();
    const sharedBoundaryAdj = new Map<Osid, Osid[]>();
    const strictAdjForCaseB = new Map<Osid, Osid[]>();
    for (const [a, b] of [
        ['h-a-left', 'h-a-right'],
        ['f-b-left', 'f-b-right'],
        ['f-s-left', 'f-s-right'],
        ['f-bridge-left', 'f-bridge-right'],
    ] as const) {
        addUndirected(osidAdjacency, a, b);
        addUndirected(sharedBoundaryAdj, a, b);
    }
    for (const [a, b] of [
        ['f-b-left', 'h-b'],
        ['f-b-right', 'h-b'],
        ['f-bridge-left', 'h-bridge'],
        ['f-bridge-right', 'h-bridge'],
    ] as const) {
        addUndirected(strictAdjForCaseB, a, b);
    }

    const centroids = new Map([
        ['h-bridge', { lat: 0, lon: 0 }],
        ['f-bridge-left', { lat: 0, lon: -1 }],
        ['f-bridge-right', { lat: 0, lon: 1 }],
    ]) as OsidCentroidMap;

    return {
        edgeIds,
        edgeMeta,
        osidAdjacency,
        sharedBoundaryAdj,
        strictAdjForCaseB,
        centroids,
    };
}

function legacyAdjacency(
    mode: FrontEdgeRelationMode,
    edgeIds: string[],
    fixture: ReturnType<typeof makeFixture>,
    edgeMeta: Map<string, EdgeMeta> = fixture.edgeMeta,
): Map<string, string[]> {
    if (mode === 'standard') {
        return buildEdgeAdjacency(
            edgeIds,
            edgeMeta,
            FACTION,
            fixture.osidAdjacency,
            fixture.sharedBoundaryAdj,
            fixture.centroids,
        );
    }
    return buildEdgeAdjacencyStrictCaseB(
        edgeIds,
        edgeMeta,
        FACTION,
        fixture.sharedBoundaryAdj,
        fixture.strictAdjForCaseB,
        fixture.centroids,
    );
}

function adjacencyRows(edgeIds: string[], adjacency: Map<string, string[]>): Array<[string, string[]]> {
    return [...new Set(edgeIds)]
        .sort(strictCompare)
        .map((edgeId) => [edgeId, adjacency.get(edgeId) ?? []]);
}

describe('SectorFrontEdgeRelation', () => {
    it('restricts full standard and strict relations to exact legacy subset neighbor sequences', () => {
        const fixture = makeFixture();
        const counters = createSectorFrontEdgeRelationTestCounters();
        const relation = createSectorFrontEdgeRelation({
            faction: FACTION,
            edgeIds: fixture.edgeIds,
            edgeMeta: fixture.edgeMeta,
            osidAdjacency: fixture.osidAdjacency,
            sharedBoundaryAdj: fixture.sharedBoundaryAdj,
            strictAdjForCaseB: fixture.strictAdjForCaseB,
            centroids: fixture.centroids,
            testCounters: counters,
        });
        const subsets = [
            [],
            ['case-a-left'],
            fixture.edgeIds,
            ['case-b-right', 'missing-meta', 'case-a-left', 'case-b-left', 'case-a-right'],
            ['bridge-right', 'bridge-left'],
            ['strict-reject-left', 'strict-reject-right'],
            ['case-b-left', 'case-b-left', 'case-b-right'],
        ];

        for (const mode of ['standard', 'strict-case-b'] as const) {
            for (const subset of subsets) {
                const candidate = buildSectorFrontEdgeAdjacency({
                    relation,
                    mode,
                    edgeIds: subset,
                    edgeMeta: fixture.edgeMeta,
                    faction: FACTION,
                    osidAdjacency: fixture.osidAdjacency,
                    sharedBoundaryAdj: fixture.sharedBoundaryAdj,
                    strictAdjForCaseB: fixture.strictAdjForCaseB,
                    centroids: fixture.centroids,
                });
                expect(adjacencyRows(subset, candidate)).toEqual(
                    adjacencyRows(subset, legacyAdjacency(mode, subset, fixture)),
                );
            }
        }

        expect(relation.faction).toBe(FACTION);
        expect(relation.hasEdge('case-a-left')).toBe(true);
        expect(relation.hasEdge('outside')).toBe(false);
        expect(relation.neighborsIn(
            'case-a-left',
            new Set(['case-a-left', 'case-a-right']),
            'standard',
        )).toEqual(['case-a-right']);
        expect(counters.standardConstructions).toBe(1);
        expect(counters.strictConstructions).toBe(1);
    });

    it('falls back exactly before strict duplicate ids are converted to a set', () => {
        const fixture = makeFixture();
        const counters = createSectorFrontEdgeRelationTestCounters();
        const relation = createSectorFrontEdgeRelation({
            faction: FACTION,
            edgeIds: fixture.edgeIds,
            edgeMeta: fixture.edgeMeta,
            osidAdjacency: fixture.osidAdjacency,
            sharedBoundaryAdj: fixture.sharedBoundaryAdj,
            strictAdjForCaseB: fixture.strictAdjForCaseB,
            centroids: fixture.centroids,
            testCounters: counters,
        });
        const duplicateStrictIds = ['case-b-left', 'case-b-left', 'case-b-right'];

        const candidate = buildSectorFrontEdgeAdjacency({
            relation,
            mode: 'strict-case-b',
            edgeIds: duplicateStrictIds,
            edgeMeta: fixture.edgeMeta,
            faction: FACTION,
            osidAdjacency: fixture.osidAdjacency,
            sharedBoundaryAdj: fixture.sharedBoundaryAdj,
            strictAdjForCaseB: fixture.strictAdjForCaseB,
            centroids: fixture.centroids,
        });

        expect(adjacencyRows(duplicateStrictIds, candidate)).toEqual(
            adjacencyRows(duplicateStrictIds, legacyAdjacency('strict-case-b', duplicateStrictIds, fixture)),
        );
        expect(counters.legacyFallbacks).toBe(1);
        expect(counters.fallbackReasons['duplicate-edge-id']).toBe(1);
    });

    it('falls back exactly for outside edges and incompatible metadata without widening the universe', () => {
        const fixture = makeFixture();
        const counters = createSectorFrontEdgeRelationTestCounters();
        const relation = createSectorFrontEdgeRelation({
            faction: FACTION,
            edgeIds: fixture.edgeIds,
            edgeMeta: fixture.edgeMeta,
            osidAdjacency: fixture.osidAdjacency,
            sharedBoundaryAdj: fixture.sharedBoundaryAdj,
            strictAdjForCaseB: fixture.strictAdjForCaseB,
            centroids: fixture.centroids,
            testCounters: counters,
        });
        const outsideMeta = new Map(fixture.edgeMeta);
        outsideMeta.set('outside', { a: 'f-a', b: 'h-a-right', side_a: FACTION, side_b: 'E' });
        const mismatchedMeta = new Map(fixture.edgeMeta);
        mismatchedMeta.set('case-a-left', { a: 'different', b: 'h-a-left', side_a: FACTION, side_b: 'E' });

        for (const [edgeIds, edgeMeta] of [
            [['case-a-left', 'outside'], outsideMeta],
            [['case-a-left', 'case-a-right'], mismatchedMeta],
        ] as const) {
            const candidate = buildSectorFrontEdgeAdjacency({
                relation,
                mode: 'standard',
                edgeIds: [...edgeIds],
                edgeMeta,
                faction: FACTION,
                osidAdjacency: fixture.osidAdjacency,
                sharedBoundaryAdj: fixture.sharedBoundaryAdj,
                strictAdjForCaseB: fixture.strictAdjForCaseB,
                centroids: fixture.centroids,
            });
            expect(adjacencyRows([...edgeIds], candidate)).toEqual(
                adjacencyRows([...edgeIds], legacyAdjacency('standard', [...edgeIds], fixture, edgeMeta)),
            );
        }

        expect(counters.legacyFallbacks).toBe(2);
        expect(counters.fallbackReasons['edge-outside-universe']).toBe(1);
        expect(counters.fallbackReasons['metadata-mismatch']).toBe(1);
    });

    it('keeps candidate-mode factionless synthetic production helpers on observable exact legacy fallbacks', () => {
        const syntheticMeta = new Map<string, EdgeMeta>([
            ['a__junction', { a: 'a', b: 'junction', side_a: null, side_b: null }],
            ['junction__b', { a: 'junction', b: 'b', side_a: null, side_b: null }],
            ['b__c', { a: 'b', b: 'c', side_a: null, side_b: null }],
            ['c__d', { a: 'c', b: 'd', side_a: null, side_b: null }],
        ]);
        const counters = createSectorFrontEdgeRelationTestCounters();
        const adjacency = new Map<Osid, Osid[]>();
        const relation = createSectorFrontEdgeRelation({
            faction: FACTION,
            edgeIds: [...syntheticMeta.keys()],
            edgeMeta: syntheticMeta,
            osidAdjacency: adjacency,
            strictAdjForCaseB: adjacency,
            testCounters: counters,
        });

        const candidate = buildSectorFrontEdgeAdjacency({
            relation,
            mode: 'standard',
            edgeIds: [...syntheticMeta.keys()],
            edgeMeta: syntheticMeta,
            faction: undefined,
            osidAdjacency: adjacency,
        });
        const legacy = buildEdgeAdjacency([...syntheticMeta.keys()], syntheticMeta);

        expect(adjacencyRows([...syntheticMeta.keys()], candidate)).toEqual(
            adjacencyRows([...syntheticMeta.keys()], legacy),
        );
        expect(candidate.get('a__junction')).toEqual(['junction__b']);

        const subSegment = {
            sub_segment_id: 'subseg:corps:0',
            edge_ids: [...syntheticMeta.keys()],
            friendly_osids: ['a', 'junction', 'b', 'c', 'd'],
            enemy_osids: [],
            length_edges: syntheticMeta.size,
            primary_brigade_ids: [],
        } as CorpsFrontSubSegment;
        const sector = {
            sector_id: 'sector:corps:0',
            corps_id: 'corps',
            faction: FACTION,
            opposing_factions: [],
            edge_ids: [...syntheticMeta.keys()],
            sub_segments: [subSegment],
            length_edges: syntheticMeta.size,
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            rear_brigade_ids: [],
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        } as CorpsFrontSector;
        const splitCandidate = splitNonContiguousSectors(
            [structuredClone(sector)],
            adjacency,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            {},
            relation,
        );
        const splitLegacy = splitNonContiguousSectors([structuredClone(sector)], adjacency);
        expect(splitCandidate).toEqual(splitLegacy);

        const requiredSyntheticMeta = syntheticMeta as Map<string, {
            a: string;
            b: string;
            side_a: string | null;
            side_b: string | null;
        }>;
        expect(decomposeIntoConnectedComponents(
            structuredClone(subSegment),
            'corps',
            requiredSyntheticMeta,
            relation,
            adjacency,
        )).toEqual(decomposeIntoConnectedComponents(
            structuredClone(subSegment),
            'corps',
            requiredSyntheticMeta,
        ));
        expect(splitSubSegmentAtMidpoint(
            structuredClone(subSegment),
            'corps',
            requiredSyntheticMeta,
            relation,
            adjacency,
        )).toEqual(splitSubSegmentAtMidpoint(
            structuredClone(subSegment),
            'corps',
            requiredSyntheticMeta,
        ));

        expect(counters.legacyFallbacks).toBe(4);
        expect(counters.fallbackReasons['synthetic-factionless']).toBe(4);
        expect(counters.fallbackReasons['faction-mismatch']).toBe(0);
    });
});
