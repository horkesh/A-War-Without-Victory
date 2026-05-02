/**
 * Operation Storm / Oluja theater truth helpers.
 *
 * `operation_storm_triggered` used to mean "abstract preconditions have become
 * true." Late-war opportunity code needs the stricter meaning: the western
 * theater has actually ruptured because the Operation Storm event fired.
 */

import type { GameState } from '../../state/game_state.js';

export const OPERATION_STORM_EVENT_ID = 'operation_storm_1995';

export function getOperationStormEventTurn(state: GameState): number | undefined {
    const recordedTurn = state.military?.event_last_fired_turn?.[OPERATION_STORM_EVENT_ID];
    if (typeof recordedTurn === 'number' && Number.isFinite(recordedTurn)) {
        return recordedTurn;
    }

    const metaTurn = state.meta?.operation_storm_turn;
    if (typeof metaTurn === 'number' && Number.isFinite(metaTurn)) {
        return metaTurn;
    }

    return undefined;
}

export function hasOperationStormEventFired(state: GameState): boolean {
    return (state.military?.fired_event_ids ?? []).includes(OPERATION_STORM_EVENT_ID)
        || getOperationStormEventTurn(state) !== undefined;
}

export function isWesternTheaterRuptured(state: GameState): boolean {
    return hasOperationStormEventFired(state);
}

export function isPreStormWesternTheater(state: GameState, turn = state.meta?.turn ?? 0): boolean {
    const eventTurn = getOperationStormEventTurn(state);
    if (eventTurn !== undefined) return turn < eventTurn;
    return !hasOperationStormEventFired(state);
}
