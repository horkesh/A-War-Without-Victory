/**
 * Apply brigade reposition orders: set a brigade's AoR to exactly the given 1–4
 * contiguous faction-controlled settlements (no physical move).
 * Consumed each turn; deterministic order.
 *
 * NOTE: brigade_aor is never populated in the current pipeline. Reposition orders
 * are cleared but no AoR mutation occurs.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState } from '../../state/game_state.js';

/**
 * Apply all pending brigade reposition orders.
 * brigade_aor is never populated; orders are consumed and cleared with no other effect.
 */
export function applyBrigadeRepositionOrders(state: GameState, _edges: EdgeRecord[]): void {
    state.military.brigade_reposition_orders = undefined;
}
