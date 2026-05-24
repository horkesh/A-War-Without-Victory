import type { FormationView, LoadedGameState, OperationView } from '../map/data/types';
import {
  getPlayerFacingFaction as normalizePlayerFacingFaction,
  getPlayerVisibleFactions,
  getPlayerVisibleOperations,
  type PlayerFacingFaction,
} from './playerFacingLabels';

type SectorView = NonNullable<LoadedGameState['corpsFrontSectors']>[number];

export function resolvePlayerFacingFaction(state: LoadedGameState | null | undefined): PlayerFacingFaction | null {
  return normalizePlayerFacingFaction(state);
}

export function getPlayerFacingFaction(state: LoadedGameState | null | undefined): PlayerFacingFaction | null {
  return resolvePlayerFacingFaction(state);
}

export function filterPlayerFacingFormations(state: LoadedGameState | null | undefined): FormationView[] {
  if (!state?.formations) return [];
  return getPlayerVisibleFactions(state.formations, resolvePlayerFacingFaction(state));
}

export function filterPlayerFacingSectors(state: LoadedGameState | null | undefined): SectorView[] {
  if (!state?.corpsFrontSectors) return [];
  return getPlayerVisibleFactions(state.corpsFrontSectors, resolvePlayerFacingFaction(state));
}

export function findPlayerFacingSectorById(
  state: LoadedGameState | null | undefined,
  sectorId: string | null | undefined,
): SectorView | null {
  if (!sectorId) return null;
  return filterPlayerFacingSectors(state).find((sector) => sector.sector_id === sectorId) ?? null;
}

export function filterPlayerFacingOperations(state: LoadedGameState | null | undefined): OperationView[] {
  if (!state?.operations) return [];
  return getPlayerVisibleOperations(state.operations, resolvePlayerFacingFaction(state));
}

export function findPlayerFacingOperationByKey(
  state: LoadedGameState | null | undefined,
  selectedOperationKey: string | null | undefined,
): OperationView | null {
  if (!selectedOperationKey) return null;
  return filterPlayerFacingOperations(state).find(
    (operation) => `${operation.corps_id}|${operation.name}` === selectedOperationKey,
  ) ?? null;
}

export function filterPlayerFacingActiveOperations(
  state: LoadedGameState | null | undefined,
): NonNullable<LoadedGameState['activeOperations']> {
  if (!state?.activeOperations) return [];
  return getPlayerVisibleFactions(state.activeOperations, resolvePlayerFacingFaction(state));
}

export function filterPlayerFacingOperationHistory(
  state: LoadedGameState | null | undefined,
): NonNullable<LoadedGameState['operationHistory']> {
  if (!state?.operationHistory) return [];
  return getPlayerVisibleFactions(state.operationHistory, resolvePlayerFacingFaction(state));
}

export function filterPlayerFacingMovementsByOsid(
  state: LoadedGameState | null | undefined,
): LoadedGameState['movementsByOsid'] {
  if (!state?.movementsByOsid) return {};
  const playerFormationIds = new Set(filterPlayerFacingFormations(state).map((formation) => formation.id));
  const filteredEntries = Object.entries(state.movementsByOsid).map(([osid, movements]) => ([
    osid,
    movements.filter((movement) => playerFormationIds.has(movement.formation_id)),
  ]));
  return Object.fromEntries(filteredEntries);
}

export function filterPlayerVisibleMapFormations(state: LoadedGameState | null | undefined): FormationView[] {
  if (!state?.formations) return [];
  const playerFaction = resolvePlayerFacingFaction(state);
  if (!playerFaction) return state.formations;

  const visibleEnemyOsids = new Set(state.fogOfWar?.visibleEnemyOsids ?? []);
  return state.formations.filter((formation) => (
    formation.faction === playerFaction
    || (typeof formation.location_osid === 'string' && visibleEnemyOsids.has(formation.location_osid))
  ));
}
