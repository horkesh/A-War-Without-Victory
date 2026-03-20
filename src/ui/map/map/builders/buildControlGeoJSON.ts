import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export function buildControlGeoJSON(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  osidPropertiesMap?: Record<string, Record<string, unknown>> | null,
): FeatureCollection {
  const features = baseGeoJson.features.map((feature) => {
    const props = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
    const osid = typeof props.osid === 'string' ? props.osid : '';
    const controller = osid
      ? (controlBySettlement[osid] ?? (osid.startsWith('S') ? null : controlBySettlement[`S${osid}`] ?? null))
      : null;

    // Enrich with terrain friction for move-preview coloring
    const osidProps = osid && osidPropertiesMap ? osidPropertiesMap[osid] : undefined;
    const friction = typeof osidProps?.terrain_friction_index === 'number' ? osidProps.terrain_friction_index : undefined;

    return {
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: {
        ...props,
        controller,
        ...(friction != null ? { friction } : {}),
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
