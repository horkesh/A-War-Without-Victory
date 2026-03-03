import type { FeatureCollection, Feature, Point, LineString } from 'geojson';

/**
 * Build point GeoJSON for operation target OSID centroids.
 * Used for circle ring + dot layers.
 */
export function buildOperationTargetPointsGeoJSON(
  centroidLookup: Map<string, [number, number]>,
  osids: string[],
): FeatureCollection {
  const features: Feature<Point>[] = [];
  for (const osid of osids) {
    const center = centroidLookup.get(osid);
    if (!center) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: center },
      properties: { osid },
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Build crosshair line GeoJSON for operation target OSID centroids.
 * Each OSID gets a small + sign drawn around its centroid.
 */
export function buildOperationTargetCrosshairsGeoJSON(
  centroidLookup: Map<string, [number, number]>,
  osids: string[],
): FeatureCollection {
  const features: Feature<LineString>[] = [];
  // Arm length in degrees (~4km at Bosnia latitude)
  const ARM = 0.038;
  for (const osid of osids) {
    const center = centroidLookup.get(osid);
    if (!center) continue;
    const [lng, lat] = center;
    features.push(
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[lng - ARM, lat], [lng + ARM, lat]] },
        properties: { osid, arm: 'h' },
      },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[lng, lat - ARM], [lng, lat + ARM]] },
        properties: { osid, arm: 'v' },
      },
    );
  }
  return { type: 'FeatureCollection', features };
}
