import type { FeatureCollection, LineString } from 'geojson';
import { generateFactionBorders } from '../generateFactionBorders';

const ALLIED_THRESHOLD = 0.2;

export function buildFrontLinesGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  phaseIAllianceRbihHrhb?: number | null
): FeatureCollection<LineString> {
  const rbihHrhbAllied =
    phaseIAllianceRbihHrhb != null ? phaseIAllianceRbihHrhb > ALLIED_THRESHOLD : undefined;
  return generateFactionBorders(controlledOsidGeoJson, rbihHrhbAllied);
}
