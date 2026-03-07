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

// Tiny offset in degrees (approx 30m east, 20m south per unit) to create a 'fanned' stack effect
const STACK_OFFSET_LNG = 0.00045;
const STACK_OFFSET_LAT = 0.0003;

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const unitsPerOsid = new Map<string, number>();

  const orderedFormations = [...state.formations].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    // Determine if this is a command abstraction or a physical combat unit.
    const isHQ = formation.kind === 'corps' || formation.kind === 'corps_asset' || formation.kind === 'army_hq';

    const osid = resolveFormationLocationOsid(formation, centroidLookup);
    if (!osid) continue;
    const osidCenter = centroidLookup.get(osid);
    if (!osidCenter) continue;

    // Stack units in the same settlement by applying a small offset.
    const stackIndex = unitsPerOsid.get(osid) || 0;
    unitsPerOsid.set(osid, stackIndex + 1);

    const point: [number, number] = [
      osidCenter[0] + stackIndex * STACK_OFFSET_LNG,
      osidCenter[1] - stackIndex * STACK_OFFSET_LAT,
    ];

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: formation.id,
        name: formation.name,
        kind: formation.kind,
        faction: formation.faction,
        icon_id: formationIconId(isHQ ? formation.kind : getBrigadeType(formation.name), formation.faction, formation.posture),
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
