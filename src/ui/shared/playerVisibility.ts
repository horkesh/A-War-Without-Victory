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

export function filterPlayerFacingOperations(state: LoadedGameState | null | undefined): OperationView[] {
  if (!state?.operations) return [];
  return getPlayerVisibleOperations(state.operations, resolvePlayerFacingFaction(state));
}

export function filterPlayerVisibleMapFormations(state: LoadedGameState | null | undefined): FormationView[] {
  if (!state?.formations) return [];
  const playerFaction = resolvePlayerFacingFaction(state);
  if (!playerFaction) return [...state.formations];

  const visibleEnemyOsids = new Set(state.fogOfWar?.visibleEnemyOsids ?? []);
  return state.formations.filter((formation) => (
    formation.faction === playerFaction
    || (typeof formation.location_osid === 'string' && visibleEnemyOsids.has(formation.location_osid))
  ));
}
