import type { FeatureCollection, GeoJsonProperties, LineString } from 'geojson';

export type FrontStabilityClass = 'static' | 'fluid' | 'oscillating' | 'support';

export type FrontStabilityProperties = Record<string, unknown> & {
  stability_class: FrontStabilityClass;
  stability_score: number | null;
  threat_reported: boolean;
};

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function classifyFront(properties: GeoJsonProperties | null): FrontStabilityClass {
  if (!properties || properties.lineType !== 'front') return 'support';

  const explicitRecentFlips = finiteNumber((properties as Record<string, unknown>).recent_flip_count);
  if (explicitRecentFlips >= 2) return 'oscillating';

  const threatIntensity = optionalFiniteNumber((properties as Record<string, unknown>).threat_intensity);
  if (threatIntensity == null) return 'fluid';
  if (threatIntensity >= 0.6) return 'fluid';

  const avgEntrenchment = finiteNumber((properties as Record<string, unknown>).avg_entrenchment);
  const brigadeCount = finiteNumber((properties as Record<string, unknown>).brigade_count);
  if (avgEntrenchment >= 3 && brigadeCount > 0 && threatIntensity < 0.25) return 'static';

  return 'fluid';
}

export function buildFrontStabilityGeoJSON(
  frontLinesGeoJson: FeatureCollection<LineString>,
): FeatureCollection<LineString, FrontStabilityProperties> {
  return {
    type: 'FeatureCollection',
    features: frontLinesGeoJson.features.map((feature) => {
      const stabilityClass = classifyFront(feature.properties);
      const threatIntensity = optionalFiniteNumber((feature.properties as Record<string, unknown> | null)?.threat_intensity);
      return {
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties: {
          ...(feature.properties ?? {}),
          stability_class: stabilityClass,
          stability_score: stabilityClass === 'support' ? 0 : threatIntensity,
          threat_reported: threatIntensity != null,
        },
      };
    }),
  };
}
