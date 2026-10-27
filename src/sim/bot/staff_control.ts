import type {FactionId, GameState} from '../../state/game_state.js';
import {strictCompare} from '../../state/validateGameState.js';

/** Broad staff authority; manual historical assistance stays operation-scoped downstream. */
export function selectStaffControlledFactions(state: GameState): FactionId[] {
    const playerFaction = state.meta.headless_scenario_auto_control
        ? null
        : state.meta.player_faction ?? null;
    const assistedExecutionActive = (state.meta.autonomy_level ?? 0) >= 1;
    return (state.factions ?? [])
        .map(f => f.id)
        .filter((fid): fid is FactionId =>
            playerFaction == null || assistedExecutionActive || fid !== playerFaction
        )
        .sort(strictCompare);
}
