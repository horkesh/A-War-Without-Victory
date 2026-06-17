import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';

const operationalSettlementsPath = path.resolve(
  process.cwd(),
  'data/derived/operational/operational_settlements.geojson',
);

function isFiniteLngLat(position: unknown): position is number[] {
  if (!Array.isArray(position) || position.length < 2) return false;
  const lng = position[0];
  const lat = position[1];
  return (
    typeof lng === 'number'
    && typeof lat === 'number'
    && Number.isFinite(lng)
    && Number.isFinite(lat)
    && lng >= -180
    && lng <= 180
    && lat >= -90
    && lat <= 90
  );
}

function sameLngLat(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function ringSignedArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    area += (x2! - x1!) * (y2! + y1!);
  }
  return area / 2;
}

function ringHasArea(ring: number[][]): boolean {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  const unique = new Set<string>();
  for (const position of ring) {
    const lng = position[0]!;
    const lat = position[1]!;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    unique.add(`${lng},${lat}`);
  }
  return unique.size >= 3
    && maxLng > minLng
    && maxLat > minLat
    && Math.abs(ringSignedArea(ring)) > 1e-14;
}

function validateRing(osid: string, ring: unknown, label: string): string[] {
  const issues: string[] = [];
  if (!Array.isArray(ring)) return [`${osid}:${label}:ring_not_array`];
  if (ring.length < 4) issues.push(`${osid}:${label}:ring_too_short`);
  if (!ring.every(isFiniteLngLat)) issues.push(`${osid}:${label}:invalid_lng_lat`);
  if (ring.length >= 2 && ring.every(isFiniteLngLat)) {
    if (!sameLngLat(ring[0]!, ring[ring.length - 1]!)) {
      issues.push(`${osid}:${label}:ring_not_closed`);
    }
  }
  if (ring.every(isFiniteLngLat) && !ringHasArea(ring)) {
    issues.push(`${osid}:${label}:ring_degenerate_area`);
  }
  return issues;
}

function validateGeometry(osid: string, geometry: Geometry | null): string[] {
  if (!geometry) return [`${osid}:missing_geometry`];
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return [`${osid}:unsupported_geometry:${geometry.type}`];
  }

  const polygons = geometry.type === 'Polygon'
    ? [(geometry as Polygon).coordinates]
    : (geometry as MultiPolygon).coordinates;
  return polygons.flatMap((polygon, polygonIndex) => {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return [`${osid}:polygon_${polygonIndex}:missing_rings`];
    }
    return polygon.flatMap((ring, ringIndex) => (
      validateRing(osid, ring, `polygon_${polygonIndex}.ring_${ringIndex}`)
    ));
  });
}

describe('operational settlement geometry integrity', () => {
  it('ships only finite, closed, non-degenerate polygon parts', () => {
    const collection = JSON.parse(
      fs.readFileSync(operationalSettlementsPath, 'utf8'),
    ) as FeatureCollection;

    const issues = collection.features.flatMap((feature, index) => {
      const osid = typeof feature.properties?.osid === 'string'
        ? feature.properties.osid
        : `feature_${index}`;
      return validateGeometry(osid, feature.geometry);
    });

    expect(issues).toEqual([]);
  });
});
