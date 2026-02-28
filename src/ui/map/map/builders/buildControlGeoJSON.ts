import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export function buildControlGeoJSON(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
): FeatureCollection {
  const features = baseGeoJson.features.map((feature) => {
    const props = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
    const osid = typeof props.osid === 'string' ? props.osid : '';
    const controller = osid
      ? (controlBySettlement[osid] ?? (osid.startsWith('S') ? null : controlBySettlement[`S${osid}`] ?? null))
      : null;

    return {
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: {
        ...props,
        controller,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
