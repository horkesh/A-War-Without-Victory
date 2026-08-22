import type { FactionId, GameState } from '../../state/game_state.js';
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';

/** Whether a controlled OSID is a legal combat objective for the acting faction. */
export function isOperationObjectiveHostile(
    state: GameState,
    actingFaction: FactionId,
    controller: string | null | undefined,
): boolean {
    if (!controller || controller === actingFaction) return false;
    return !isRbihHrhbCombatBlocked(state, actingFaction, controller);
}
