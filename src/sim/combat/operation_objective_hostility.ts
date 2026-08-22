import type { FactionId, GameState } from '../../state/game_state.js';
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';

/** Whether an OSID is controlled by a faction other than the acting faction. */
export function isOperationObjectiveForeignControlled(
    actingFaction: FactionId,
    controller: string | null | undefined,
): boolean {
    return Boolean(controller && controller !== actingFaction);
}

/** Whether a controlled OSID is a legal combat objective for the acting faction. */
export function isOperationObjectiveHostile(
    state: GameState,
    actingFaction: FactionId,
    controller: string | null | undefined,
): boolean {
    if (!isOperationObjectiveForeignControlled(actingFaction, controller)) return false;
    return !isRbihHrhbCombatBlocked(state, actingFaction, controller);
}
