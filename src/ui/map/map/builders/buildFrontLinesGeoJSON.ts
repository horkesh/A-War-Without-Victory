import type { FeatureCollection, LineString } from 'geojson';
import { generateFactionBorders } from '../generateFactionBorders';

export function buildFrontLinesGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<LineString> {
  return generateFactionBorders(controlledOsidGeoJson);
}
