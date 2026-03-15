/**
 * Build a GeoJSON FeatureCollection for casualties map mode.
 * Colors OSIDs where battles occurred by cumulative recent casualties,
 * using a continuous gradient from transparent to deep red.
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { FormationView } from '../../data/types';

interface CasualtiesProperties {
  osid: string;
  casualties: number;
  casualties_normalized: number;
}

/** Fixed reference for normalization — 200 casualties at one OSID = full intensity. */
const REFERENCE_CASUALTIES = 200;

export function buildCasualtiesGeoJSON(
  controlGeoJson: FeatureCollection,
  formations: FormationView[],
): FeatureCollection<Polygon | MultiPolygon, CasualtiesProperties> {
  // Aggregate casualties by OSID from all formations' recent engagements
  const casualtiesByOsid = new Map<string, number>();
  for (const f of formations) {
    if (!f.recent_engagements) continue;
    for (const eng of f.recent_engagements) {
      if (!eng.osid || eng.casualties_taken <= 0) continue;
      casualtiesByOsid.set(eng.osid, (casualtiesByOsid.get(eng.osid) ?? 0) + eng.casualties_taken);
    }
  }

  const features: Feature<Polygon | MultiPolygon, CasualtiesProperties>[] = [];
  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid;
    if (typeof osid !== 'string') continue;
    const casualties = casualtiesByOsid.get(osid);
    if (!casualties || casualties <= 0) continue;

    features.push({
      type: 'Feature',
      properties: {
        osid,
        casualties,
        casualties_normalized: Math.min(1, casualties / REFERENCE_CASUALTIES),
      },
      geometry: feature.geometry as Polygon | MultiPolygon,
    });
  }

  return { type: 'FeatureCollection', features };
}
