/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Post-battle resource & ops-tempo side effects
 * DOMAIN:    Combat fatigue
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 6).
 * Fire-and-forget aftermath that mutates state after each battle resolution.
 * Supply-reserve expenditure and production-facility combat damage were retired
 * 2026-11-17 (Fable consult 6); both were no-ops unless supply_reserves_enabled.
 *
 * UPSTREAM:  attack_resolution_osid.ts (calls after combat outcome)
 * DOWNSTREAM: formation ops.fatigue
 * ═══════════════════════════════════════════════════════════════
 */

import type { FormationState } from '../../state/game_state.js';
import { FATIGUE_MAX } from '../../state/formation_constants.js';

// ── Constants ───────────────────────────────────────────────────────────────

/** Fatigue points accumulated per battle for each attacking formation. */
export const FATIGUE_ATTACKER = 2;

/** Fatigue points accumulated per battle for the defending formation. */
export const FATIGUE_DEFENDER = 1;

// ── Combat Fatigue ──────────────────────────────────────────────────────────

/**
 * Apply combat fatigue to all participating formations.
 * Attackers accumulate +2 fatigue in defended combat or +0.5 when sweeping an
 * undefended target; defender +1.
 * Fatigue is capped at FATIGUE_MAX. Initializes ops if missing.
 *
 * Exact reproduction of the inline block formerly at attack_resolution_osid.ts "COMBAT FATIGUE".
 */
export function applyCombatFatigue(params: {
    attackerFormations: FormationState[];
    defenderFormation: FormationState | null;
}): void {
    const {
        attackerFormations,
        defenderFormation,
    } = params;
    const attackerFatigue = defenderFormation ? FATIGUE_ATTACKER : 0.5;
    for (const af of attackerFormations) {
        if (!af.ops) af.ops = { fatigue: 0, last_supplied_turn: null };
        af.ops.fatigue = Math.min(FATIGUE_MAX, (af.ops.fatigue ?? 0) + attackerFatigue);
    }
    if (defenderFormation) {
        if (!defenderFormation.ops) defenderFormation.ops = { fatigue: 0, last_supplied_turn: null };
        defenderFormation.ops.fatigue = Math.min(FATIGUE_MAX, (defenderFormation.ops.fatigue ?? 0) + FATIGUE_DEFENDER);
    }
}
