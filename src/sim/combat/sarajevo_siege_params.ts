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
    /** B7 lifeline base throughput when besieged with no channel (0..1). */
    lifeline_base_throughput: number;
    /** B7 throughput contribution of an active UN airlift (0..1). */
    lifeline_airlift_throughput: number;
    /** B7 throughput contribution of the completed Dobrinja–Butmir tunnel (0..1). */
    lifeline_tunnel_throughput: number;
    /** B7 attrition multiplier when the lifeline is fully SEVERED (≥1). */
    lifeline_severed_attrition_mult: number;
}

export const DEFAULT_SARAJEVO_DEFENSE_BONUS = 0.40;
export const DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT = 2.0;
export const DEFAULT_SARAJEVO_RBIH_EXHAUSTION_PER_TURN = 3.0;
export const DEFAULT_SARAJEVO_RS_EXHAUSTION_PER_TURN = 2.0;
export const DEFAULT_SARAJEVO_INTEGRITY_FLOOR = 0.15;

// B7 lifeline defaults. Only read when ENABLE_SARAJEVO_LIFELINE is set; the
// flag-OFF path never consults `throughput`, so these never affect the
// byte-identical baseline. Calibration of these values is a §6-gated,
// one-change-per-run step deferred to a later lane.
export const DEFAULT_SARAJEVO_LIFELINE_BASE_THROUGHPUT = 0.0;
export const DEFAULT_SARAJEVO_LIFELINE_AIRLIFT_THROUGHPUT = 0.35;
export const DEFAULT_SARAJEVO_LIFELINE_TUNNEL_THROUGHPUT = 0.45;
export const DEFAULT_SARAJEVO_LIFELINE_SEVERED_ATTRITION_MULT = 1.25;

export const DEFAULT_SARAJEVO_SIEGE_PARAMS: SarajevoSiegeParams = Object.freeze({
    defense_bonus: DEFAULT_SARAJEVO_DEFENSE_BONUS,
    attacker_casualty_mult: DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT,
    rbih_exhaustion_per_turn: DEFAULT_SARAJEVO_RBIH_EXHAUSTION_PER_TURN,
    rs_exhaustion_per_turn: DEFAULT_SARAJEVO_RS_EXHAUSTION_PER_TURN,
    integrity_floor: DEFAULT_SARAJEVO_INTEGRITY_FLOOR,
    lifeline_base_throughput: DEFAULT_SARAJEVO_LIFELINE_BASE_THROUGHPUT,
    lifeline_airlift_throughput: DEFAULT_SARAJEVO_LIFELINE_AIRLIFT_THROUGHPUT,
    lifeline_tunnel_throughput: DEFAULT_SARAJEVO_LIFELINE_TUNNEL_THROUGHPUT,
    lifeline_severed_attrition_mult: DEFAULT_SARAJEVO_LIFELINE_SEVERED_ATTRITION_MULT,
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
        lifeline_base_throughput: overrides.lifeline_base_throughput ?? DEFAULT_SARAJEVO_LIFELINE_BASE_THROUGHPUT,
        lifeline_airlift_throughput: overrides.lifeline_airlift_throughput ?? DEFAULT_SARAJEVO_LIFELINE_AIRLIFT_THROUGHPUT,
        lifeline_tunnel_throughput: overrides.lifeline_tunnel_throughput ?? DEFAULT_SARAJEVO_LIFELINE_TUNNEL_THROUGHPUT,
        lifeline_severed_attrition_mult: overrides.lifeline_severed_attrition_mult ?? DEFAULT_SARAJEVO_LIFELINE_SEVERED_ATTRITION_MULT,
    });
}

/**
 * B7 default-OFF flag gate (env). Mirrors the SIEGE_MORALE_DRAIN_ENABLED
 * precedent. When unset, the continuous lifeline substrate is never derived or
 * read and every consumer takes its identical pre-change path (byte-identical).
 */
export function isSarajevoLifelineEnabled(): boolean {
    return process.env.ENABLE_SARAJEVO_LIFELINE === 'true';
}
