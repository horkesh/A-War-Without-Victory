import type { GameState } from './game_state.js';

/**
 * Who bears the atrocity consequences (SENSITIVE_HISTORY_DESIGN_GATE.md §2a(i), the §6 bright line:
 * atrocity must never produce a better end-state).
 *
 * A faction bears them when
 *   - the game is in the emergent decision mode (every faction, bots included), or
 *   - the faction is the human player's own faction, in ANY mode (historical included).
 *
 * In historical mode the OTHER commands replay the record and the recorded history is not condemned
 * (the calibration baseline contains it). The player's own orders are new acts: choosing the
 * "replay the record" menu option must never make an atrocity free.
 *
 * Fails closed to "no player" when `player_faction` is unset or not a string: the headless /
 * calibration harness leaves it undefined, so headless historical runs are unchanged by
 * construction. It is NEVER defaulted (no `?? 'RBiH'`). `headless_scenario_auto_control` is the
 * scenario runner's proof-mode marker: it auto-controls every faction including `player_faction`, so
 * the faction is not a human's and does not bear the consequences. (`displacement_takeover.ts`
 * tests `player_faction === faction` without that marker; do not copy that pattern here.)
 *
 * Autonomy level does not matter: `player_faction` stays set when the player hands the faction to
 * staff (autonomy 3), and the acts are still the faction's (command responsibility). Evaluated at
 * read time from two already-persisted fields, so no new saved field is needed.
 *
 * Scope: the verdict layer only (the §2a flag, its display freshening, the atrocity cost term). The
 * patron-defiance supply cut is deliberately NOT keyed on this predicate; it stays emergent-only.
 */
export function isBrightLineFaction(state: Pick<GameState, 'meta'>, faction: string): boolean {
    const meta = state.meta;
    if (meta?.decision_mode === 'emergent') return true;
    return meta?.headless_scenario_auto_control !== true
        && typeof meta?.player_faction === 'string'
        && meta.player_faction === faction;
}
