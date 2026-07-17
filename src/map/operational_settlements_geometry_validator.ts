import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson';
import { strictCompare } from '../state/validateGameState.js';

export type OperationalGeometryIssueReason =
  | 'missing_geometry'
  | 'unsupported_geometry'
  | 'empty_polygon'
  | 'ring_too_short'
  | 'ring_not_closed'
  | 'non_finite_coordinate'
  | 'coordinate_out_of_range'
  | 'lt3_unique_coords'
  | 'zero_signed_area';

export type OperationalGeometryIssue = {
  osid: string;
  featureIndex: number;
  geometryType: string;
  polygonIndex: number;
  ringIndex: number;
  reason: OperationalGeometryIssueReason;
  detail: string;
};

export type OperationalGeometryValidationReport = {
  featureCount: number;
  polygonPartCount: number;
  ringCount: number;
  invalidRings: OperationalGeometryIssue[];
};

const AREA_EPSILON = 1e-20;

function osidFor(feature: Feature<Geometry | null, Record<string, unknown>>, featureIndex: number): string {
  const osid = feature.properties?.osid;
  return typeof osid === 'string' && osid.length > 0 ? osid : `feature:${featureIndex}`;
}

function coordinateKey(position: Position): string {
  return `${position[0]},${position[1]}`;
}

function isClosed(ring: Position[]): boolean {
  if (ring.length < 2) return false;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1];
}

function ringSignedArea(ring: Position[]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function invalidRingIssue(
  feature: Feature<Geometry | null, Record<string, unknown>>,
  featureIndex: number,
  geometryType: string,
  polygonIndex: number,
  ringIndex: number,
  reason: OperationalGeometryIssueReason,
  detail: string,
): OperationalGeometryIssue {
  return {
    osid: osidFor(feature, featureIndex),
    featureIndex,
    geometryType,
    polygonIndex,
    ringIndex,
    reason,
    detail,
  };
}

function validateRing(
  feature: Feature<Geometry | null, Record<string, unknown>>,
  featureIndex: number,
  geometryType: string,
  polygonIndex: number,
  ringIndex: number,
  ring: Position[],
): OperationalGeometryIssue | null {
  if (ring.length < 4) {
    return invalidRingIssue(feature, featureIndex, geometryType, polygonIndex, ringIndex, 'ring_too_short', `ring has ${ring.length} positions`);
  }

  for (const [coordinateIndex, position] of ring.entries()) {
    const [lng, lat] = position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return invalidRingIssue(
        feature,
        featureIndex,
        geometryType,
        polygonIndex,
        ringIndex,
        'non_finite_coordinate',
        `coordinate ${coordinateIndex} is not finite`,
      );
    }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return invalidRingIssue(
        feature,
        featureIndex,
        geometryType,
        polygonIndex,
        ringIndex,
        'coordinate_out_of_range',
        `coordinate ${coordinateIndex} is outside WGS84 bounds`,
      );
    }
  }

  if (!isClosed(ring)) {
    return invalidRingIssue(feature, featureIndex, geometryType, polygonIndex, ringIndex, 'ring_not_closed', 'first and last positions differ');
  }

  const uniqueInteriorPositions = new Set(ring.slice(0, -1).map(coordinateKey));
  if (uniqueInteriorPositions.size < 3) {
    return invalidRingIssue(
      feature,
      featureIndex,
      geometryType,
      polygonIndex,
      ringIndex,
      'lt3_unique_coords',
      `ring has ${uniqueInteriorPositions.size} unique non-closing positions`,
    );
  }

  if (Math.abs(ringSignedArea(ring)) <= AREA_EPSILON) {
    return invalidRingIssue(feature, featureIndex, geometryType, polygonIndex, ringIndex, 'zero_signed_area', 'ring signed area is zero');
  }

  return null;
}

function polygonParts(geometry: Polygon | MultiPolygon): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

export function validateOperationalSettlementsGeometry(
  collection: FeatureCollection<Geometry, Record<string, unknown>>,
): OperationalGeometryValidationReport {
  const invalidRings: OperationalGeometryIssue[] = [];
  let polygonPartCount = 0;
  let ringCount = 0;

  for (const [featureIndex, feature] of collection.features.entries()) {
    const geometry = feature.geometry;
    if (!geometry) {
      invalidRings.push(invalidRingIssue(feature, featureIndex, 'null', -1, -1, 'missing_geometry', 'feature has no geometry'));
      continue;
    }
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
      invalidRings.push(
        invalidRingIssue(feature, featureIndex, geometry.type, -1, -1, 'unsupported_geometry', `unsupported geometry type ${geometry.type}`),
      );
      continue;
    }

    for (const [polygonIndex, polygon] of polygonParts(geometry).entries()) {
      polygonPartCount++;
      if (polygon.length === 0) {
        invalidRings.push(invalidRingIssue(feature, featureIndex, geometry.type, polygonIndex, -1, 'empty_polygon', 'polygon has no rings'));
        continue;
      }
      for (const [ringIndex, ring] of polygon.entries()) {
        ringCount++;
        const issue = validateRing(feature, featureIndex, geometry.type, polygonIndex, ringIndex, ring);
        if (issue) invalidRings.push(issue);
      }
    }
  }

  invalidRings.sort((a, b) =>
    strictCompare(a.osid, b.osid)
    || a.featureIndex - b.featureIndex
    || a.polygonIndex - b.polygonIndex
    || a.ringIndex - b.ringIndex
    || strictCompare(a.reason, b.reason),
  );

  return {
    featureCount: collection.features.length,
    polygonPartCount,
    ringCount,
    invalidRings,
  };
}
