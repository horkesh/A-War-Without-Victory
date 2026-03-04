/**
 * compute-home-defense-active: Per-turn computation of home_defense_active flag
 * and counterattack window countdown.
 *
 * A brigade is on home ground when its origin_mun tag matches the municipality
 * of its current location OSID: location_osid.startsWith(`op:${origin_mun}:`)
 *
 * Deterministic: sorted iteration, no randomness.
 */

import type { FormationId, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export function computeHomeDefenseActive(state: GameState): void {
    const formations = state.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);

    for (const id of ids) {
        const brigade = formations[id as FormationId];
        if (!brigade) continue;
        if (brigade.status !== 'active') continue;
        if ((brigade.kind ?? 'brigade') !== 'brigade') continue;

        // Home defense: brigade is in its home municipality
        const originMun = brigade.origin_mun;
        const locationOsid = brigade.location_osid ?? '';
        if (originMun && locationOsid) {
            brigade.home_defense_active = locationOsid.startsWith(`op:${originMun}:`);
        } else {
            brigade.home_defense_active = false;
        }

        // Counterattack window countdown
        const window = brigade.counterattack_window_turns ?? 0;
        if (window > 0) {
            brigade.counterattack_window_turns = window - 1;
        }
    }
}
