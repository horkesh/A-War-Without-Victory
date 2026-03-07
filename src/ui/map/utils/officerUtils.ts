import type { LoadedGameState, FormationView } from '../data/types';

/**
 * Utility to find the named officer for a formation (Corps or Army level).
 */
export function getFormationCommander(
    formation: FormationView,
    loadedGameState: LoadedGameState
) {
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        return loadedGameState.namedOfficerData?.find(o => o.assigned_corps_id === formation.id) || null;
    }

    if (formation.kind === 'army_hq') {
        return loadedGameState.namedOfficerData?.find(
            o => o.faction === formation.faction && o.rank === 'army_commander'
        ) || null;
    }

    return null;
}

/**
 * Utility to find the army commander for a faction.
 */
export function getFactionArmyCommander(
    faction: string,
    loadedGameState: LoadedGameState
) {
    return loadedGameState.namedOfficerData?.find(
        o => o.faction === faction && o.rank === 'army_commander'
    ) || null;
}
