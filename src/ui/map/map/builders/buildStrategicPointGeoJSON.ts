/**
 * buildStrategicPointGeoJSON — Phase 5 GUI (§2.6 Strategic Points).
 *
 * Derives strategic/victory-point markers from the OSID FeatureCollection:
 *   - Tier 'city'  (radius 8): 6 major cities — Banja Luka, Sarajevo, Tuzla,
 *                               Mostar, Bihać, Zenica
 *   - Tier 'seat'  (radius 5): municipal seats — OSIDs where slug = `{mun}_2`
 *                               (canonical main-town OSID for each municipality)
 *
 * Population ≥ 5,000 tier omitted: no per-OSID population data available.
 *
 * Deterministic: output features sorted by OSID.
 * Static: result depends only on baseGeoJson (fixed geometry), not on game state.
 */
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from 'geojson';

const MAJOR_CITY_MUNS = new Set([
  'banja_luka',
  'sarajevo',
  'tuzla',
  'mostar',
  'bihac',
  'zenica',
]);

function polygonCentroid(coordinates: number[][][]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const ring = coordinates[0];
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
    count++;
  }
  return [sumX / count, sumY / count];
}

function geometryCentroid(geometry: Polygon | MultiPolygon): [number, number] {
  if (geometry.type === 'Polygon') {
    return polygonCentroid(geometry.coordinates);
  }
  return polygonCentroid(geometry.coordinates[0]);
}

export type StrategicTier = 'city' | 'seat';

export function buildStrategicPointGeoJSON(
  baseGeoJson: FeatureCollection,
): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];

  for (const feature of baseGeoJson.features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const osid = typeof props.osid === 'string' ? props.osid : null;
    if (!osid) continue;

    // osid format: op:{municipality}:{slug}
    const parts = osid.split(':');
    if (parts.length !== 3) continue;
    const mun = parts[1];
    const slug = parts[2];

    let tier: StrategicTier | null = null;

    if (MAJOR_CITY_MUNS.has(mun) && slug === `${mun}_2`) {
      // Major city: municipality is in the hardcoded list AND slug is the canonical town OSID
      tier = 'city';
    } else if (slug === `${mun}_2`) {
      // Municipal seat: slug matches the pattern {mun}_2
      tier = 'seat';
    }

    if (!tier) continue;

    const geom = feature.geometry;
    if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue;

    const centroid = geometryCentroid(geom as Polygon | MultiPolygon);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: centroid },
      properties: { osid, tier, mun_id: mun },
    });
  }

  // Sort deterministically by OSID
  features.sort((a, b) => {
    const ao = (a.properties as Record<string, unknown>).osid as string;
    const bo = (b.properties as Record<string, unknown>).osid as string;
    return ao < bo ? -1 : ao > bo ? 1 : 0;
  });

  return { type: 'FeatureCollection', features };
}
