import type { Feature, FeatureCollection, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import { buildOsidCentroidLookup } from './geojsonLookup';
import { formationIconId } from './formationIconId';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';

interface FormationMarkerProperties {
  id: string;
  name: string;
  kind: string;
  faction: string;
  icon_id: string;
  status: string;
  readiness: string;
  cohesion: number;
  personnel: number | null;
  location_osid: string;
}

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const orderedFormations = [...state.formations].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    const osid = resolveFormationLocationOsid(formation, centroidLookup);
    if (!osid) continue;
    const point = centroidLookup.get(osid);
    if (!point) continue;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: formation.id,
        name: formation.name,
        kind: formation.kind,
        faction: formation.faction,
        icon_id: formationIconId(formation.kind, formation.faction),
        status: formation.status,
        readiness: formation.readiness,
        cohesion: formation.cohesion,
        personnel: typeof formation.personnel === 'number' ? formation.personnel : null,
        location_osid: osid,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
