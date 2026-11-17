/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: shared read of a faction's fresh combat losses
 * DOMAIN:    defence (P2 step-3 retake)
 * ═══════════════════════════════════════════════════════════════
 *
 * The cells a faction lost in combat within the counter-attack window and has not taken back.
 * Read from `political.control_events`, so it adds no state. The P2 step-3 retake-only
 * counter-attack (`bot_brigade_ai_osid.ts`) may target only these cells.
 *
 * Deterministic: a pure filter over the append-only event log; the result is a Set, read by
 * membership only.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { COUNTER_ATTACK_RETREAT_WINDOW } from './bot_constants.js';

export function collectRecentCombatLosses(state: GameState, faction: FactionId | string): Set<string> {
    const currentTurn = state.meta?.turn ?? 0;
    const controllers = state.political?.political_controllers ?? {};
    const lost = new Set<string>();
    for (const event of state.political?.control_events ?? []) {
        if (event.mechanism !== 'combat' || event.from !== faction) continue;
        if (event.turn < currentTurn - COUNTER_ATTACK_RETREAT_WINDOW) continue;
        if (controllers[event.settlement_id] === faction) continue;
        lost.add(event.settlement_id);
    }
    return lost;
}
