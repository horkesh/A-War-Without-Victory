import type { FeatureCollection, LineString } from 'geojson';
import { generateFactionBorders } from '../generateFactionBorders';

const ALLIED_THRESHOLD = 0.2;

export function buildFrontLinesGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  peacePhaseAllianceRbihHrhb?: number | null
): FeatureCollection<LineString> {
  const rbihHrhbAllied =
    peacePhaseAllianceRbihHrhb != null ? peacePhaseAllianceRbihHrhb > ALLIED_THRESHOLD : undefined;
  return generateFactionBorders(controlledOsidGeoJson, rbihHrhbAllied);
}
