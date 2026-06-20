import type { LoadedGameState } from '../data/types';
import type { FieldInspectionTarget } from '../utils/fieldInspectionTarget';
import { getSectorIdForFormation } from '../utils/sectorUtils';

type MapSelectionProperties = Record<string, unknown> | null | undefined;

function stringProperty(properties: MapSelectionProperties, key: string): string | null {
  const value = properties?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function findSectorCorpsId(sectorId: string | null, state: LoadedGameState | null | undefined): string | null {
  if (!sectorId) return null;
  const sector = state?.corpsFrontSectors?.find((candidate) => candidate.sector_id === sectorId);
  return sector?.corps_id ?? null;
}

export function resolveMapSectorInspectionTarget(
  sectorId: string,
  state: LoadedGameState | null | undefined,
  properties?: MapSelectionProperties,
): FieldInspectionTarget {
  const corpsId = stringProperty(properties, 'corps_id') ?? findSectorCorpsId(sectorId, state);
  if (corpsId) {
    return { kind: 'field-sector-in-corps', sectorId, corpsId };
  }
  return { kind: 'field-sector', sectorId };
}

export function resolveMapFormationInspectionTarget(
  formationId: string,
  properties: MapSelectionProperties,
  state: LoadedGameState | null | undefined,
): FieldInspectionTarget {
  const formation = state?.formations.find((candidate) => candidate.id === formationId);
  const sectorId =
    stringProperty(properties, 'sector_id')
    ?? getSectorIdForFormation(formationId, state?.corpsFrontSectors);

  if (sectorId) {
    return { kind: 'field-formation-in-sector', formationId, sectorId };
  }

  const corpsId =
    stringProperty(properties, 'corps_id')
    ?? (typeof formation?.corps_id === 'string' && formation.corps_id.trim().length > 0 ? formation.corps_id : null);
  if (corpsId) {
    return { kind: 'field-formation-in-corps', formationId, corpsId };
  }

  const osid =
    stringProperty(properties, 'location_osid')
    ?? (typeof formation?.location_osid === 'string' && formation.location_osid.trim().length > 0
      ? formation.location_osid
      : null);
  if (osid) {
    return { kind: 'field-formation-at-settlement', formationId, osid };
  }

  return { kind: 'field-formation', formationId };
}
