import type { Feature, FeatureCollection, Point } from 'geojson';
import type { LoadedGameState, FrontEdgeView } from '../../data/types';
import { buildOsidCentroidLookup, type OsidCentroidLookup } from './geojsonLookup';
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

/**
 * For each OSID on a front edge, accumulates the centroids of its enemy-side
 * neighbours so the marker can be offset toward the front (spec §2.4).
 *
 * Only edges with two distinct non-null factions are considered — uncontrolled
 * and same-faction adjacencies are ignored.
 */
function buildFrontOffsetLookup(
  frontEdges: FrontEdgeView[],
  centroidLookup: OsidCentroidLookup,
): Map<string, [number, number]> {
  const sums = new Map<string, { lng: number; lat: number; count: number }>();

  for (const edge of frontEdges) {
    if (!edge.side_a || !edge.side_b || edge.side_a === edge.side_b) continue;

    const centroidA = centroidLookup.get(edge.a);
    const centroidB = centroidLookup.get(edge.b);

    // edge.a's enemy is edge.b
    if (centroidB) {
      const acc = sums.get(edge.a) ?? { lng: 0, lat: 0, count: 0 };
      acc.lng += centroidB[0];
      acc.lat += centroidB[1];
      acc.count += 1;
      sums.set(edge.a, acc);
    }

    // edge.b's enemy is edge.a
    if (centroidA) {
      const acc = sums.get(edge.b) ?? { lng: 0, lat: 0, count: 0 };
      acc.lng += centroidA[0];
      acc.lat += centroidA[1];
      acc.count += 1;
      sums.set(edge.b, acc);
    }
  }

  const result = new Map<string, [number, number]>();
  for (const [osid, acc] of sums) {
    if (acc.count > 0) result.set(osid, [acc.lng / acc.count, acc.lat / acc.count]);
  }
  return result;
}

/**
 * 35% interpolation from the OSID centroid toward the average enemy-neighbour
 * centroid. Keeps the marker within the OSID polygon while pushing it visibly
 * toward the front edge. Rear OSIDs (no entry in lookup) stay at centroid.
 */
const FRONT_LERP = 0.35;

function applyFrontOffset(
  osidCenter: [number, number],
  enemyAvg: [number, number] | undefined,
): [number, number] {
  if (!enemyAvg) return osidCenter;
  return [
    osidCenter[0] + FRONT_LERP * (enemyAvg[0] - osidCenter[0]),
    osidCenter[1] + FRONT_LERP * (enemyAvg[1] - osidCenter[1]),
  ];
}

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const frontOffsetLookup = buildFrontOffsetLookup(
    state.frontEdgesOsid ?? [],
    centroidLookup,
  );

  const orderedFormations = [...state.formations].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    // Corps and army HQs are command abstractions — they have no physical map position.
    // The corps sector fill + demarcation lines already communicate corps presence.
    if (formation.kind === 'corps' || formation.kind === 'army_hq') continue;

    const osid = resolveFormationLocationOsid(formation, centroidLookup);
    if (!osid) continue;
    const osidCenter = centroidLookup.get(osid);
    if (!osidCenter) continue;

    // Offset toward the front edge when the brigade is on a front OSID.
    // Rear brigades (no front adjacency) remain at OSID centroid.
    const point = applyFrontOffset(osidCenter, frontOffsetLookup.get(osid));

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: formation.id,
        name: formation.name,
        kind: formation.kind,
        faction: formation.faction,
        icon_id: formationIconId(formation.kind, formation.faction, formation.posture),
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
