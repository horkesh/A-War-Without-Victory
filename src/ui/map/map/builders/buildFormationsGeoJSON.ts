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
  posture: string | null;
}

function getBrigadeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('mountain')) return 'mountain';
  if (lower.includes('motorized') || lower.includes('mechanized')) return 'motorized';
  if (lower.includes('artillery')) return 'artillery';
  return 'brigade'; // default
}

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const unitsPerOsid = new Map<string, number>();

  const orderedFormations = [...state.formations].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    // Corps and army HQs are command abstractions — they have no physical map position.
    if (formation.kind === 'corps' || formation.kind === 'army_hq') continue;

    const osid = resolveFormationLocationOsid(formation, centroidLookup);
    if (!osid) continue;
    const osidCenter = centroidLookup.get(osid);
    if (!osidCenter) continue;

    // Stack units in the same settlement by applying a small offset.
    const stackIndex = unitsPerOsid.get(osid) || 0;
    unitsPerOsid.set(osid, stackIndex + 1);

    // Tiny offset in degrees (approx 30m east, 20m south per unit) to create a 'fanned' stack effect
    const stackOffsetLng = 0.00045;
    const stackOffsetLat = 0.0003;

    const point: [number, number] = [
      osidCenter[0] + stackIndex * stackOffsetLng,
      osidCenter[1] - stackIndex * stackOffsetLat,
    ];

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: formation.id,
        name: formation.name,
        kind: formation.kind,
        faction: formation.faction,
        icon_id: formationIconId(getBrigadeType(formation.name), formation.faction, formation.posture),
        status: formation.status,
        readiness: formation.readiness,
        cohesion: formation.cohesion,
        personnel: typeof formation.personnel === 'number' ? formation.personnel : null,
        location_osid: osid,
        posture: formation.posture ?? null,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
