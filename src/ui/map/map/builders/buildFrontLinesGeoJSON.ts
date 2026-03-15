import type { FeatureCollection, LineString } from 'geojson';
import { generateFactionBorders } from '../generateFactionBorders';

const ALLIED_THRESHOLD = 0.2;

export function buildFrontLinesGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  peacePhaseAllianceRbihHrhb?: number | null,
  osidCentroids?: Map<string, [number, number]>
): FeatureCollection<LineString> {
  const rbihHrhbAllied =
    peacePhaseAllianceRbihHrhb != null ? peacePhaseAllianceRbihHrhb > ALLIED_THRESHOLD : undefined;
  return generateFactionBorders(controlledOsidGeoJson, rbihHrhbAllied, osidCentroids);
}
