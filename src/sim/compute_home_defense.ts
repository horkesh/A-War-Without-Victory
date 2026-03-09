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

function isOperationParticipant(state: GameState, corpsId: string, brigadeId: FormationId): boolean {
    const op = state.corps_command?.[corpsId]?.active_operation;
    if (!op) return false;
    if (op.axes) {
        return op.axes.some(a => a.assigned_brigades.includes(brigadeId));
    }
    return op.participating_brigades.includes(brigadeId);
}

export function computeHomeDefenseActive(state: GameState): void {
    const formations = state.formations ?? {};
    const ids = Object.keys(formations).sort(strictCompare);

    for (const id of ids) {
        const brigade = formations[id as FormationId];
        if (!brigade) continue;
        if (brigade.status !== 'active') continue;
        if ((brigade.kind ?? 'brigade') !== 'brigade') continue;

        // Home defense: brigade is in its home municipality
        // Exception: brigades in active operations are not home defenders —
        // corps ordered them to attack, so they must be free to adopt offensive posture.
        const originMun = brigade.origin_mun;
        const locationOsid = brigade.location_osid ?? '';
        const inActiveOp = brigade.corps_id
            && state.corps_command?.[brigade.corps_id]?.active_operation?.phase === 'execution'
            && isOperationParticipant(state, brigade.corps_id, id as FormationId);
        if (inActiveOp) {
            brigade.home_defense_active = false;
        } else if (originMun && locationOsid) {
            brigade.home_defense_active = locationOsid.startsWith(`op:${originMun}:`);
        } else {
            brigade.home_defense_active = false;
        }

        // Counterattack window countdown
        const remaining = brigade.counterattack_window_turns ?? 0;
        if (remaining > 0) {
            brigade.counterattack_window_turns = remaining - 1;
        }
    }
}
