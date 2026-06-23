import type { FormationView, LoadedGameState } from '../data/types';
import { resolveFormationLocationOsid } from '../map/builders/resolveFormationLocationOsid';
import { filterPlayerVisibleMapFormations, isFieldedTacticalFormation } from '../../shared/playerVisibility';

export function getPlayerVisibleFormationStack(
  state: LoadedGameState | null | undefined,
  osid: string | null | undefined,
  centroidLookup: Map<string, [number, number]>,
): FormationView[] {
  if (!state || !osid) return [];
  return filterPlayerVisibleMapFormations(state).filter((formation) => (
    isFieldedTacticalFormation(formation)
    && resolveFormationLocationOsid(formation, centroidLookup) === osid
  ));
}
