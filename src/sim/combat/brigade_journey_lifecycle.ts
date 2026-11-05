/**
 * Shared brigade journey lifecycle primitive.
 *
 * Invalidates only the named brigade's active journey. It never writes pending
 * movement orders, position, personnel, authority or any other formation state.
 * Callers decide whether a lifecycle transition or physical relocation makes the
 * existing journey obsolete.
 */
import type { FormationId, GameState } from '../../state/game_state.js';

export function invalidateBrigadeJourney(
    state: GameState,
    brigadeId: FormationId,
): void {
    const movementState = state.military.brigade_movement_state;
    if (!movementState || !Object.prototype.hasOwnProperty.call(movementState, brigadeId)) return;

    delete movementState[brigadeId];
    if (Object.keys(movementState).length === 0) {
        state.military.brigade_movement_state = undefined;
    }
}
