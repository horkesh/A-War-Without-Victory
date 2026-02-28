import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';

type OsidFeature = Feature<Geometry, { osid?: unknown }>;

export type OsidCentroidLookup = Map<string, [number, number]>;

function collectPolygonPositions(geometry: Polygon | MultiPolygon): Position[] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }
  return geometry.coordinates.flat(2);
}

function computeCentroidFromBounds(positions: Position[]): [number, number] | null {
  if (positions.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of positions) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export function buildOsidCentroidLookup(baseGeoJson: FeatureCollection): OsidCentroidLookup {
  const entries: Array<[string, [number, number]]> = [];
  for (const feature of baseGeoJson.features as OsidFeature[]) {
    const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : '';
    if (!osid) continue;
    if (!feature.geometry) continue;
    if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') continue;

    const positions = collectPolygonPositions(feature.geometry);
    const centroid = computeCentroidFromBounds(positions);
    if (!centroid) continue;
    entries.push([osid, centroid]);
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return new Map(entries);
}

export function resolveOsidKey(raw: string | undefined, lookup: OsidCentroidLookup): string | null {
  const candidate = (raw ?? '').trim();
  if (!candidate) return null;

  const candidates = new Set<string>([candidate]);
  if (candidate.startsWith('S')) {
    candidates.add(candidate.slice(1));
  } else if (!candidate.includes(':')) {
    candidates.add(`S${candidate}`);
  }

  for (const key of candidates) {
    if (lookup.has(key)) return key;
  }
  return null;
}
