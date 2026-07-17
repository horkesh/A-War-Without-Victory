import type { FormationView, LoadedGameState } from '../data/types';
import { resolveFormationPhysicalLocationOsid } from '../map/builders/resolveFormationLocationOsid';
import { filterPlayerVisibleMapFormations, isPlayerVisibleTacticalMarker } from '../../shared/playerVisibility';

export function getPlayerVisibleFormationStack(
  state: LoadedGameState | null | undefined,
  osid: string | null | undefined,
  centroidLookup: Map<string, [number, number]>,
): FormationView[] {
  if (!state || !osid) return [];
  return filterPlayerVisibleMapFormations(state).filter((formation) => (
    isPlayerVisibleTacticalMarker(formation, state)
    && resolveFormationPhysicalLocationOsid(formation, centroidLookup) === osid
  )).sort((a, b) => a.id.localeCompare(b.id));
}
