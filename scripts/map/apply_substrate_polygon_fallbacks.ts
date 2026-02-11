/**
 * Phase 6E.8.B: Deterministic substrate polygon fallback helper.
 * Pure functions: build a lookup from substrate features; get polygon by sid/source_id.
 * No I/O; no invented geometry. Used by map:build when SVG→simplification fails.
 */

/** GeoJSON Polygon geometry (inline to avoid dependency). */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/** GeoJSON Feature with Polygon (inline). */
export interface GeoJSONPolygonFeature {
  type: 'Feature';
  geometry: GeoJSONPolygon;
  properties?: Record<string, unknown>;
}

export type SubstrateLookup = Map<string, GeoJSONPolygonFeature>;

/**
 * Build a lookup from substrate GeoJSON features.
 * Keys: properties.sid (e.g. "100013" or "10014:100013"), and if sid contains ":", also the source_id part.
 * Deterministic: same features → same map order (insertion order by array index).
 */
export function buildSubstrateLookup(
  features: GeoJSONPolygonFeature[]
): SubstrateLookup {
  const map: SubstrateLookup = new Map();
  for (const f of features) {
    if (f.geometry?.type !== 'Polygon' || !f.properties) continue;
    const sid = f.properties.sid;
    if (typeof sid !== 'string' || !sid) continue;
    map.set(sid, f);
    if (sid.includes(':')) {
      const sourceId = sid.split(':')[1];
      if (sourceId !== undefined) map.set(sourceId, f);
    }
  }
  return map;
}

/**
 * Get a polygon feature from the substrate lookup for a settlement.
 * Tries sid (mun_code:source_id) first, then source_id (substrate may store numeric sid only).
 * Returns the feature as-is; caller attaches desired properties (sid, mun_code, etc.).
 */
export function getSubstratePolygon(
  lookup: SubstrateLookup,
  sid: string,
  sourceId: string
): GeoJSONPolygonFeature | null {
  const bySid = lookup.get(sid);
  if (bySid != null) return bySid;
  const bySourceId = lookup.get(sourceId);
  if (bySourceId != null) return bySourceId;
  return null;
}
