import type { Feature, FeatureCollection, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import { buildOsidCentroidLookup } from './geojsonLookup';
import { resolveFormationPhysicalLocationOsid } from './resolveFormationLocationOsid';
import { formationIconId } from './formationIconId';
import { resolveCurrentSectorForFormation } from '../../utils/sectorUtils';
import { filterPlayerVisibleMapFormations, isPlayerEnemyContactFormation, isPlayerVisibleTacticalMarker } from '../../../shared/playerVisibility';
import type { Locale } from '../../i18n';
import { t } from '../../i18n';
import { getFormationUnitType, getLocalizedFormationName } from '../../data/formationNameLocalizations';

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
  cohesion: number | null;
  morale: number | null;
  fatigue: number | null;
  personnel: number | null;
  location_osid: string;
  posture: string | null;
  sector_id: string | null;
  assigned_sub_segment_id: string | null;
  /** True when brigade is in its home municipality. */
  is_home: boolean;
  /** Home-distance effectiveness multiplier [0.70–1.0]. 1.0 means full effectiveness / home turf. */
  home_distance_mult: number;
  /** True if brigade is participating in an active operation. */
  is_in_operation: boolean;
  /** True if brigade is disrupted (disrupted_turns > 0). */
  is_disrupted: boolean;
  /** Movement stance: 'column' when in column march, null otherwise. */
  movement_stance: 'combat' | 'column' | null;
  /** True when this is the topmost (first) unit at its OSID. */
  is_stack_top: boolean;
  /** Zero-based visual stack order for bounded pixel fanning. */
  stack_index: number;
  /** Number of units at same OSID. */
  stack_count: number;
  /** Enemy contact is visible only as a reduced observation, not a formation dossier. */
  is_enemy_contact: boolean;
  /** Formation exists at this location but is not yet field-ready. */
  is_forming: boolean;
}

export const getBrigadeType = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('mountain')) return 'mountain';
  if (lower.includes('motorized') || lower.includes('mechanized')) return 'motorized';
  if (lower.includes('artillery')) return 'artillery';
  return 'brigade'; // default
}

function getFormationMarkerType(formation: { id: string; kind?: string | null; name: string }): string {
  const unitType = getFormationUnitType(formation);
  if (unitType === 'mountain') return 'mountain';
  if (unitType === 'motorized' || unitType === 'mechanized' || unitType === 'armored') return 'motorized';
  return 'brigade';
}

export function buildFormationsGeoJSON(
  state: LoadedGameState,
  controlledOsidGeoJson: FeatureCollection,
  expandedStackOsid: string | null = null,
  locale: Locale = 'en',
): FeatureCollection<Point, FormationMarkerProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const unitsPerOsid = new Map<string, number>();
  // Pre-filter physical units to simplify counting and main loop
  const visibleFormations = filterPlayerVisibleMapFormations(state);
  const physicalUnits = visibleFormations.filter(f =>
    isPlayerVisibleTacticalMarker(f, state)
  );
  const activeOperationFormationIds = new Set<string>();
  for (const operation of state.activeOperations ?? []) {
    if (operation.phase === 'recovery') continue;
    for (const id of operation.participating_brigades ?? []) {
      activeOperationFormationIds.add(id);
    }
  }

  // Count units per OSID for radial spacing
  const countsPerOsid = new Map<string, number>();
  for (const f of physicalUnits) {
    const osid = resolveFormationPhysicalLocationOsid(f, centroidLookup);
    if (osid) countsPerOsid.set(osid, (countsPerOsid.get(osid) || 0) + 1);
  }

  const munFromOsid = (osid: string | undefined): string | undefined => osid?.split(':')[1];
  const orderedFormations = [...physicalUnits].sort((a, b) => a.id.localeCompare(b.id));
  const features: Array<Feature<Point, FormationMarkerProperties>> = [];

  for (const formation of orderedFormations) {
    const osid = resolveFormationPhysicalLocationOsid(formation, centroidLookup);
    if (!osid) continue;

    // If this OSID is currently expanded in the high-end overlay, hide the map-level icons
    if (expandedStackOsid && osid === expandedStackOsid) continue;

    const osidCenter = centroidLookup.get(osid);
    if (!osidCenter) continue;

    const stackIndex = unitsPerOsid.get(osid) || 0;
    unitsPerOsid.set(osid, stackIndex + 1);

    const point: [number, number] = [osidCenter[0], osidCenter[1]];
    const totalInStack = countsPerOsid.get(osid) || 1;

    const type = getFormationMarkerType(formation);
    const isEnemyContact = isPlayerEnemyContactFormation(state, formation);
    const isForming = !isEnemyContact && String(formation.readiness).toLowerCase() === 'forming';
    const displayName = isEnemyContact
      ? t('tooltip.enemyContactTitle', undefined, locale)
      : getLocalizedFormationName(formation, locale);
    const contactId = `enemy_contact:${osid}:${stackIndex}`;
    const postureSuffix = !isEnemyContact && formation.posture ? `__${formation.posture}` : '';
    const formingSuffix = isForming ? '__forming' : '';

    // Status Banners: quantize reported morale to 10% steps. Counter health remains
    // unreported because the read model has raw personnel, not authorized strength.
    const rawMorale = typeof formation.morale === 'number' && Number.isFinite(formation.morale)
      ? formation.morale
      : null;
    const reportedMorale = isEnemyContact ? null : rawMorale;
    const statusSuffix = reportedMorale == null
      ? '__hunreported__munreported'
      : `__hunreported__m${Math.round(reportedMorale / 10) * 10}`;

    const markerFaction = formation.faction;
    const markerType = isEnemyContact ? 'enemy_contact' : type;
    const icon_id = `${markerType}__${markerFaction}${postureSuffix}${formingSuffix}${statusSuffix}`;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: isEnemyContact ? contactId : formation.id,
        name: displayName,
        kind: isEnemyContact ? 'enemy_contact' : formation.kind,
        faction: markerFaction,
        corps_id: isEnemyContact ? null : formation.corps_id ?? null,
        icon_id: icon_id,
        white_icon_id: `white__${icon_id}`,
        status: isEnemyContact ? 'contact' : formation.status,
        readiness: isEnemyContact ? 'contact' : formation.readiness,
        cohesion: isEnemyContact ? null : typeof formation.cohesion === 'number' && Number.isFinite(formation.cohesion) ? formation.cohesion : null,
        morale: reportedMorale,
        fatigue: isEnemyContact ? null : typeof formation.fatigue === 'number' && Number.isFinite(formation.fatigue) ? formation.fatigue : null,
        personnel: isEnemyContact ? null : typeof formation.personnel === 'number' ? formation.personnel : null,
        location_osid: osid,
        posture: isEnemyContact ? null : formation.posture ?? null,
        sector_id: isEnemyContact ? null : resolveCurrentSectorForFormation(formation, state.corpsFrontSectors)?.sector_id ?? null,
        assigned_sub_segment_id: isEnemyContact ? null : formation.assigned_sub_segment_id ?? null,
        is_home: isEnemyContact ? false : !!(munFromOsid(formation.home_osid) && munFromOsid(formation.home_osid) === munFromOsid(osid)),
        home_distance_mult: isEnemyContact ? 1.0 : typeof formation.homeDistanceMult === 'number' ? formation.homeDistanceMult : 1.0,
        is_in_operation: isEnemyContact ? false : activeOperationFormationIds.has(formation.id),
        is_disrupted: isEnemyContact ? false : (formation.disrupted_turns ?? 0) > 0,
        movement_stance: isEnemyContact ? null : formation.movementStance ?? null,
        is_stack_top: stackIndex === 0,
        stack_index: stackIndex,
        stack_count: totalInStack,
        is_enemy_contact: isEnemyContact,
        is_forming: isForming,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
