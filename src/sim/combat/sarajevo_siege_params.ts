import type { GameState } from '../../state/game_state.js';

/**
 * Sarajevo Ring 1 numeric siege parameters.
 *
 * Defaults preserve the pre-2026-05-17 code path byte-for-byte. Scenario files may
 * override only these scalar tuning values via `scenario.sarajevo_overrides`.
 * Sarajevo ID-set membership stays code-side engine geometry; see
 * docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md and
 * docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md Section 1.
 */
export interface SarajevoSiegeParams {
    defense_bonus: number;
    attacker_casualty_mult: number;
    rbih_exhaustion_per_turn: number;
    rs_exhaustion_per_turn: number;
    integrity_floor: number;
}

export const DEFAULT_SARAJEVO_DEFENSE_BONUS = 0.40;
export const DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT = 2.0;
export const DEFAULT_SARAJEVO_RBIH_EXHAUSTION_PER_TURN = 3.0;
export const DEFAULT_SARAJEVO_RS_EXHAUSTION_PER_TURN = 2.0;
export const DEFAULT_SARAJEVO_INTEGRITY_FLOOR = 0.15;

export const DEFAULT_SARAJEVO_SIEGE_PARAMS: SarajevoSiegeParams = Object.freeze({
    defense_bonus: DEFAULT_SARAJEVO_DEFENSE_BONUS,
    attacker_casualty_mult: DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT,
    rbih_exhaustion_per_turn: DEFAULT_SARAJEVO_RBIH_EXHAUSTION_PER_TURN,
    rs_exhaustion_per_turn: DEFAULT_SARAJEVO_RS_EXHAUSTION_PER_TURN,
    integrity_floor: DEFAULT_SARAJEVO_INTEGRITY_FLOOR,
});

export function getSarajevoSiegeParams(state: GameState): SarajevoSiegeParams {
    const overrides = state.meta.sarajevo_overrides;
    if (!overrides) return DEFAULT_SARAJEVO_SIEGE_PARAMS;

    return Object.freeze({
        defense_bonus: overrides.defense_bonus ?? DEFAULT_SARAJEVO_DEFENSE_BONUS,
        attacker_casualty_mult: overrides.attacker_casualty_mult ?? DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT,
        rbih_exhaustion_per_turn: overrides.rbih_exhaustion_per_turn ?? DEFAULT_SARAJEVO_RBIH_EXHAUSTION_PER_TURN,
        rs_exhaustion_per_turn: overrides.rs_exhaustion_per_turn ?? DEFAULT_SARAJEVO_RS_EXHAUSTION_PER_TURN,
        integrity_floor: overrides.integrity_floor ?? DEFAULT_SARAJEVO_INTEGRITY_FLOOR,
    });
}
