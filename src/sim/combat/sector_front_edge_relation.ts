import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    buildEdgeAdjacency,
    buildEdgeAdjacencyStrictCaseB,
} from './sector_edge_adjacency.js';
import type { Osid } from './osid_adjacency.js';

export type FrontEdgeRelationMode = 'standard' | 'strict-case-b';

export type SectorFrontEdgeMeta = {
    a: string;
    b: string;
    side_a?: string | null;
    side_b?: string | null;
};

export type SectorFrontEdgeRelationFallbackReason =
    | 'synthetic-factionless'
    | 'duplicate-edge-id'
    | 'edge-outside-universe'
    | 'metadata-mismatch'
    | 'faction-mismatch'
    | 'adjacency-mismatch'
    | 'centroid-mismatch';

export interface SectorFrontEdgeRelationTestCounters {
    standardConstructions: number;
    strictConstructions: number;
    standardQueries: number;
    strictQueries: number;
    legacyFallbacks: number;
    fallbackReasons: Record<SectorFrontEdgeRelationFallbackReason, number>;
}

export function createSectorFrontEdgeRelationTestCounters(): SectorFrontEdgeRelationTestCounters {
    return {
        standardConstructions: 0,
        strictConstructions: 0,
        standardQueries: 0,
        strictQueries: 0,
        legacyFallbacks: 0,
        fallbackReasons: {
            'synthetic-factionless': 0,
            'duplicate-edge-id': 0,
            'edge-outside-universe': 0,
            'metadata-mismatch': 0,
            'faction-mismatch': 0,
            'adjacency-mismatch': 0,
            'centroid-mismatch': 0,
        },
    };
}

export interface SectorFrontEdgeRelation {
    readonly faction: string;
    hasEdge(edgeId: string): boolean;
    neighborsIn(
        edgeId: string,
        subset: ReadonlySet<string>,
        mode: FrontEdgeRelationMode,
    ): readonly string[];
}

interface SectorFrontEdgeRelationInternal extends SectorFrontEdgeRelation {
    readonly edgeMeta: ReadonlyMap<string, SectorFrontEdgeMeta>;
    readonly standardCaseAdjacency: Map<Osid, Osid[]>;
    readonly strictCaseAdjacency: Map<Osid, Osid[]>;
    readonly strictAdjacencyForCaseB: Map<Osid, Osid[]>;
    readonly centroids: OsidCentroidMap | undefined;
    readonly testCounters: SectorFrontEdgeRelationTestCounters | undefined;
}

export interface CreateSectorFrontEdgeRelationOptions {
    faction: string;
    edgeIds: readonly string[];
    edgeMeta: ReadonlyMap<string, SectorFrontEdgeMeta>;
    osidAdjacency: Map<Osid, Osid[]>;
    sharedBoundaryAdj?: Map<Osid, Osid[]>;
    strictAdjForCaseB: Map<Osid, Osid[]>;
    centroids?: OsidCentroidMap;
    testCounters?: SectorFrontEdgeRelationTestCounters;
}

export function createSectorFrontEdgeRelation(
    options: CreateSectorFrontEdgeRelationOptions,
): SectorFrontEdgeRelation {
    const edgeIds = [...new Set(options.edgeIds)].sort(strictCompare);
    const standardCaseAdjacency = options.sharedBoundaryAdj ?? options.osidAdjacency;
    const standard = buildEdgeAdjacency(
        edgeIds,
        options.edgeMeta as Map<string, SectorFrontEdgeMeta>,
        options.faction,
        options.osidAdjacency,
        options.sharedBoundaryAdj,
        options.centroids,
    );
    options.testCounters && (options.testCounters.standardConstructions += 1);
    const strict = buildEdgeAdjacencyStrictCaseB(
        edgeIds,
        options.edgeMeta as Map<string, SectorFrontEdgeMeta>,
        options.faction,
        standardCaseAdjacency,
        options.strictAdjForCaseB,
        options.centroids,
    );
    options.testCounters && (options.testCounters.strictConstructions += 1);
    const universe = new Set(edgeIds);

    const relation: SectorFrontEdgeRelationInternal = {
        faction: options.faction,
        edgeMeta: options.edgeMeta,
        standardCaseAdjacency,
        strictCaseAdjacency: standardCaseAdjacency,
        strictAdjacencyForCaseB: options.strictAdjForCaseB,
        centroids: options.centroids,
        testCounters: options.testCounters,
        hasEdge: (edgeId) => universe.has(edgeId),
        neighborsIn: (edgeId, subset, mode) => {
            const neighbors = (mode === 'standard' ? standard : strict).get(edgeId) ?? [];
            return neighbors.filter((neighbor) => subset.has(neighbor));
        },
    };
    return Object.freeze(relation);
}

export interface BuildSectorFrontEdgeAdjacencyOptions {
    relation: SectorFrontEdgeRelation;
    mode: FrontEdgeRelationMode;
    edgeIds: string[];
    edgeMeta: Map<string, SectorFrontEdgeMeta>;
    faction: string | undefined;
    osidAdjacency: Map<Osid, Osid[]>;
    sharedBoundaryAdj?: Map<Osid, Osid[]>;
    strictAdjForCaseB?: Map<Osid, Osid[]>;
    centroids?: OsidCentroidMap;
}

function sameMeta(left: SectorFrontEdgeMeta | undefined, right: SectorFrontEdgeMeta | undefined): boolean {
    if (left === right) return true;
    if (!left || !right) return false;
    return left.a === right.a
        && left.b === right.b
        && left.side_a === right.side_a
        && left.side_b === right.side_b;
}

function legacyAdjacency(options: BuildSectorFrontEdgeAdjacencyOptions): Map<string, string[]> {
    if (options.mode === 'standard') {
        return buildEdgeAdjacency(
            options.edgeIds,
            options.edgeMeta,
            options.faction,
            options.osidAdjacency,
            options.sharedBoundaryAdj,
            options.centroids,
        );
    }
    return buildEdgeAdjacencyStrictCaseB(
        options.edgeIds,
        options.edgeMeta,
        options.faction as string,
        options.sharedBoundaryAdj ?? options.osidAdjacency,
        options.strictAdjForCaseB ?? options.osidAdjacency,
        options.centroids,
    );
}

function fallback(
    relation: SectorFrontEdgeRelationInternal,
    options: BuildSectorFrontEdgeAdjacencyOptions,
    reason: SectorFrontEdgeRelationFallbackReason,
): Map<string, string[]> {
    if (relation.testCounters) {
        relation.testCounters.legacyFallbacks += 1;
        relation.testCounters.fallbackReasons[reason] += 1;
    }
    return legacyAdjacency(options);
}

function recordQuery(relation: SectorFrontEdgeRelationInternal, mode: FrontEdgeRelationMode): void {
    if (!relation.testCounters) return;
    if (mode === 'standard') relation.testCounters.standardQueries += 1;
    else relation.testCounters.strictQueries += 1;
}

function recordFallback(
    relation: SectorFrontEdgeRelationInternal,
    reason: SectorFrontEdgeRelationFallbackReason,
): void {
    if (!relation.testCounters) return;
    relation.testCounters.legacyFallbacks += 1;
    relation.testCounters.fallbackReasons[reason] += 1;
}

/**
 * Restrict an invocation-owned full relation to one exact legacy subset query.
 * Any incompatible input fails closed to the unchanged legacy subset builder.
 */
export function buildSectorFrontEdgeAdjacency(
    options: BuildSectorFrontEdgeAdjacencyOptions,
): Map<string, string[]> {
    const relation = options.relation as SectorFrontEdgeRelationInternal;
    recordQuery(relation, options.mode);

    // The strict legacy builder's nested pair loops are multiplicity-sensitive.
    // Detect duplicates before Set conversion so the exact builder owns them.
    if (new Set(options.edgeIds).size !== options.edgeIds.length) {
        return fallback(relation, options, 'duplicate-edge-id');
    }
    if (options.faction === undefined) {
        return fallback(relation, options, 'synthetic-factionless');
    }
    if (options.faction !== relation.faction) {
        return fallback(relation, options, 'faction-mismatch');
    }
    for (const edgeId of options.edgeIds) {
        if (!relation.hasEdge(edgeId)) {
            return fallback(relation, options, 'edge-outside-universe');
        }
        if (!sameMeta(options.edgeMeta.get(edgeId), relation.edgeMeta.get(edgeId))) {
            return fallback(relation, options, 'metadata-mismatch');
        }
    }
    const caseAdjacency = options.sharedBoundaryAdj ?? options.osidAdjacency;
    if (caseAdjacency !== relation.standardCaseAdjacency) {
        return fallback(relation, options, 'adjacency-mismatch');
    }
    if (options.mode === 'strict-case-b'
        && (caseAdjacency !== relation.strictCaseAdjacency
            || (options.strictAdjForCaseB ?? options.osidAdjacency) !== relation.strictAdjacencyForCaseB)) {
        return fallback(relation, options, 'adjacency-mismatch');
    }
    if (options.centroids !== relation.centroids) {
        return fallback(relation, options, 'centroid-mismatch');
    }

    const subset = new Set(options.edgeIds);
    const adjacency = new Map<string, string[]>();
    for (const edgeId of options.edgeIds) {
        const neighbors = relation.neighborsIn(edgeId, subset, options.mode);
        if (neighbors.length > 0) adjacency.set(edgeId, [...neighbors]);
    }
    return adjacency;
}

/**
 * Return pairwise subset adjacency from the immutable relation. `undefined`
 * tells the caller to execute its unchanged exact pairwise legacy check.
 */
export function areSectorFrontEdgeSubsetsAdjacent(
    relation: SectorFrontEdgeRelation,
    leftEdgeIds: readonly string[],
    rightEdgeIds: readonly string[],
    mode: FrontEdgeRelationMode,
    semantics: {
        osidAdjacency: Map<Osid, Osid[]>;
        sharedBoundaryAdj?: Map<Osid, Osid[]>;
        strictAdjForCaseB?: Map<Osid, Osid[]>;
        centroids?: OsidCentroidMap;
    },
): boolean | undefined {
    const internal = relation as SectorFrontEdgeRelationInternal;
    recordQuery(internal, mode);
    const caseAdjacency = semantics.sharedBoundaryAdj ?? semantics.osidAdjacency;
    if (caseAdjacency !== internal.standardCaseAdjacency
        || (mode === 'strict-case-b'
            && (semantics.strictAdjForCaseB ?? semantics.osidAdjacency) !== internal.strictAdjacencyForCaseB)) {
        recordFallback(internal, 'adjacency-mismatch');
        return undefined;
    }
    if (semantics.centroids !== internal.centroids) {
        recordFallback(internal, 'centroid-mismatch');
        return undefined;
    }
    const combined = [...leftEdgeIds, ...rightEdgeIds];
    if (new Set(combined).size !== combined.length) {
        recordFallback(internal, 'duplicate-edge-id');
        return undefined;
    }
    for (const edgeId of combined) {
        if (!relation.hasEdge(edgeId)) {
            recordFallback(internal, 'edge-outside-universe');
            return undefined;
        }
    }
    const right = new Set(rightEdgeIds);
    const subset = new Set(combined);
    for (const edgeId of leftEdgeIds) {
        for (const neighbor of relation.neighborsIn(edgeId, subset, mode)) {
            if (right.has(neighbor)) return true;
        }
    }
    return false;
}
