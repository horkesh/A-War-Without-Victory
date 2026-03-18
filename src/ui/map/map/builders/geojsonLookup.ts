import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';

type OsidFeature = Feature<Geometry, { osid?: unknown; sid?: unknown }>;

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

/**
 * Build centroid lookup from OSID GeoJSON features.
 *
 * When `sidToOsidMapping` is provided, also adds SID aliases so that
 * legacy SID keys (e.g. "S100013") resolve to the same centroid as
 * their OSID counterpart ("op:banovici:banovici_2"). This eliminates
 * the systemic silent failure when SID-keyed data hits the lookup.
 */
export function buildOsidCentroidLookup(
  baseGeoJson: FeatureCollection,
  sidToOsidMapping?: Map<string, string>,
): OsidCentroidLookup {
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

    // Also index by SID if the feature has one (from GeoJSON properties)
    const sid = typeof feature.properties?.sid === 'string' ? feature.properties.sid : '';
    if (sid && sid !== osid) {
      entries.push([sid, centroid]);
    }
  }

  // Add SID→OSID aliases from the canonical mapping file.
  // This ensures legacy SID keys resolve even if the GeoJSON feature
  // doesn't have a `sid` property.
  if (sidToOsidMapping) {
    const osidLookup = new Map(entries);
    for (const [sid, osid] of sidToOsidMapping) {
      if (osidLookup.has(sid)) continue; // Already indexed from GeoJSON
      const centroid = osidLookup.get(osid);
      if (centroid) {
        entries.push([sid, centroid]);
      }
    }
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return new Map(entries);
}

/**
 * Resolve a settlement key (SID or OSID) to a centroid lookup key.
 * Tries the input as-is first, then S-prefix variations.
 * With the enriched centroid lookup, SID keys should resolve directly.
 */
export function resolveOsidKey(raw: string | undefined, lookup: OsidCentroidLookup): string | null {
  const candidate = (raw ?? '').trim();
  if (!candidate) return null;

  // Direct lookup (works for both OSID and SID if lookup is enriched)
  if (lookup.has(candidate)) return candidate;

  // Try S-prefix variations as fallback
  if (candidate.startsWith('S')) {
    const stripped = candidate.slice(1);
    if (lookup.has(stripped)) return stripped;
  } else if (!candidate.includes(':')) {
    const prefixed = `S${candidate}`;
    if (lookup.has(prefixed)) return prefixed;
  }

  return null;
}
