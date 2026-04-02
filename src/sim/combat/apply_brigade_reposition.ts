/**
 * Legacy brigade reposition compatibility sink.
 *
 * Historical contract: set a brigade's AoR to an explicit 1-4 settlement set
 * without a physical move. Current contract: consume and clear the old order
 * queue without mutating live sector or OSID truth.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState } from '../../state/game_state.js';

/**
 * Apply all pending brigade reposition orders.
 * `brigade_aor` is no longer the live authority path, so orders are consumed
 * and cleared with no other effect.
 */
export function applyBrigadeRepositionOrders(state: GameState, _edges: EdgeRecord[]): void {
    state.military.brigade_reposition_orders = undefined;
}
