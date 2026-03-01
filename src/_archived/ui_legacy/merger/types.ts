/**
 * Type definitions for the Settlement Merger tool.
 */

/** Coordinate ring: array of [lon, lat] pairs. */
export type Ring = number[][];
/** Polygon coordinates: [outerRing, ...holeRings]. */
export type PolygonCoords = Ring[];

/** A canonical settlement feature. */
export interface CanonicalFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: PolygonCoords | PolygonCoords[];
    };
    properties: {
        sid: string;
        settlement_name: string;
        mun1990_id: string;
        mun1990_name: string;
        population_total: number;
        population_bosniaks: number;
        population_croats: number;
        population_serbs: number;
        population_others: number;
        ethnic_key: string;
    };
}

/** Contact graph edge. */
export interface ContactEdge {
    a: string;
    b: string;
    type: string;
    min_dist: number;
}

/** A confirmed merge group. */
export interface MergeGroup {
    osid: string;
    memberSids: string[];
    label: string;
    colorIndex: number;
}

/** Aggregated population stats for a set of settlements. */
export interface AggregatedStats {
    total: number;
    bosniaks: number;
    croats: number;
    serbs: number;
    others: number;
    ethnicKey: string;
    pctB: number;
    pctC: number;
    pctS: number;
    pctO: number;
}

/** Bounding box. */
export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
