import type { Feature, FeatureCollection, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import { buildOsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';
import { formationIconId } from './formationIconId';
import { getSectorIdForFormation } from '../../utils/sectorUtils';

export { formationIconId };

export interface FormationMarkerProperties {
  id: string;
  name: string;
  kind: string;
  faction: string;
  corps_id: string | null;
  icon_id: string;
  white_icon_id: string;
  status: string;
  readiness: string;
  cohesion: number;
  morale: number;
  fatigue: number;
  personnel: number | null;
  location_osid: string;
  posture: string | null;
  sector_id: string | null;
  assigned_sub_segment_id: string | null;
  /** True when brigade is in its home municipality. */
  is_home: boolean;
  /** Home-distance effectiveness multiplier [0.70–1.0]. 1.0 means full effectiveness / home turf. */
  home_distance_mult: number;
  /** Derived supply state: 'supplied' | 'strained' | 'cutoff'. */
  supply_state: 'supplied' | 'strained' | 'cutoff';
  /** True if brigade is participating in an active operation. */
  is_in_operation: boolean;
  /** True if brigade is disrupted (disrupted_turns > 0). */
  is_disrupted: boolean;
  /** Movement stance: 'column' when in column march, null otherwise. */
  movement_stance: 'combat' | 'column' | null;
  /** True when this is the topmost (first) unit at its OSID. */
  is_stack_top: boolean;
  /** Number of units at same OSID. */
  stack_count: number;
}

export const getBrigadeType = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('mountain')) return 'mountain';
  if (lower.includes('motorized') || lower.includes('mechanized')) return 'motorized';
  if (lower.includes('artillery')) return 'artillery';
  return 'brigade'; // default
}

function deriveSupplyState(formation: { status: string; fatigue: number; cohesion: number }): 'supplied' | 'strained' | 'cutoff' {
  const status = formation.status.toLowerCase();
  if (status.includes('cut') || status.includes('isolated')) return 'cutoff';
  if (formation.fatigue >= 30 || formation.cohesion < 35) return 'strained';
  return 'supplied';
}

// Tiny offset in degrees (approx 30m east, 20m south per unit) to create a 'fanned' stack effect
const STACK_OFFSET_LNG = 0.00045;
const STACK_OFFSET_LAT = 0.0003;

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
  expandedStackOsid: string | null = null,
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const unitsPerOsid = new Map<string, number>();
  // Pre-filter physical units to simplify counting and main loop
  const physicalUnits = state.formations.filter(f =>
    f.kind !== 'corps' && f.kind !== 'corps_asset' && f.kind !== 'army_hq'
  );

  // Count units per OSID for radial spacing
  const countsPerOsid = new Map<string, number>();
  for (const f of physicalUnits) {
    const osid = resolveFormationLocationOsid(f, centroidLookup);
    if (osid) countsPerOsid.set(osid, (countsPerOsid.get(osid) || 0) + 1);
  }

  const munFromOsid = (osid: string | undefined): string | undefined => osid?.split(':')[1];
  const orderedFormations = [...physicalUnits].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    const osid = resolveFormationLocationOsid(formation, centroidLookup);
    if (!osid) continue;

    // If this OSID is currently expanded in the high-end overlay, hide the map-level icons
    if (expandedStackOsid && osid === expandedStackOsid) continue;

    const osidCenter = centroidLookup.get(osid);
    if (!osidCenter) continue;

    const stackIndex = unitsPerOsid.get(osid) || 0;
    unitsPerOsid.set(osid, stackIndex + 1);

    const point: [number, number] = [osidCenter[0], osidCenter[1]];
    const totalInStack = countsPerOsid.get(osid) || 1;

    if (osid === expandedStackOsid && totalInStack > 1) {
      // Radial expansion for high-density areas
      const radius = 0.0008;
      const angle = (stackIndex / totalInStack) * Math.PI * 2 - (Math.PI / 2);
      point[0] += Math.cos(angle) * radius;
      point[1] += Math.sin(angle) * radius;
    } else {
      // Standard linear fanning
      point[0] += stackIndex * STACK_OFFSET_LNG;
      point[1] -= stackIndex * STACK_OFFSET_LAT;
    }

    const type = getBrigadeType(formation.name);
    const postureSuffix = formation.posture ? `__${formation.posture}` : '';

    // Status Banners: quantize Health and Morale to 10% steps
    const hQuant = 100; // Personnel pct not easily available per-unit yet
    const rawMorale = formation.morale ?? formation.cohesion ?? 100;
    const mQuant = Math.round(rawMorale / 10) * 10;
    const statusSuffix = `__h${hQuant}__m${mQuant}`;

    const icon_id = `${type}__${formation.faction}${postureSuffix}${statusSuffix}`;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: formation.id,
        name: formation.name,
        kind: formation.kind,
        faction: formation.faction,
        corps_id: formation.corps_id ?? null,
        icon_id: icon_id,
        white_icon_id: `white__${icon_id}`,
        status: formation.status,
        readiness: formation.readiness,
        cohesion: formation.cohesion,
        morale: formation.morale ?? formation.cohesion ?? 50,
        fatigue: formation.fatigue ?? 0,
        personnel: typeof formation.personnel === 'number' ? formation.personnel : null,
        location_osid: osid,
        posture: formation.posture ?? null,
        sector_id: getSectorIdForFormation(formation.id, state.corpsFrontSectors),
        assigned_sub_segment_id: formation.assigned_sub_segment_id ?? null,
        is_home: !!(munFromOsid(formation.home_osid) && munFromOsid(formation.home_osid) === munFromOsid(osid)),
        home_distance_mult: typeof formation.homeDistanceMult === 'number' ? formation.homeDistanceMult : 1.0,
        supply_state: deriveSupplyState({ status: formation.status, fatigue: formation.fatigue ?? 0, cohesion: formation.cohesion ?? 50 }),
        is_in_operation: !!(formation.posture === 'attack' || formation.posture === 'assault'),
        is_disrupted: (formation.disrupted_turns ?? 0) > 0,
        movement_stance: formation.movementStance ?? null,
        is_stack_top: stackIndex === 0,
        stack_count: totalInStack,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
