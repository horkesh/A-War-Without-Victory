/**
 * War phase §11.3: Operation Storm (Oluja) precondition check.
 *
 * When Washington Agreement is active and RS threat, exhaustion, and IVP meet thresholds,
 * sets state.meta.operation_storm_triggered. Same pattern as phase-ii-washington-check.
 * Design: docs/30_planning/OPERATION_STORM_DESIGN.md.
 *
 * Thresholds are Architect-decided; flag for user review.
 * Deterministic: pure function of state; no RNG.
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Storm precondition thresholds (Architect-decided; flag for review) ──

/** RS territorial control share (fraction of settlements) required for Storm. */
export const STORM_RS_THREAT_SHARE = 0.35;
/** Combined RBiH + HRHB exhaustion required for Storm. */
export const STORM_COMBINED_EXHAUSTION = 60;
/** IVP negotiation_momentum threshold for Storm. */
export const STORM_IVP_MOMENTUM = 0.55;

export interface OperationStormPreconditionResult {
    washington_active: boolean;
    rs_threat: boolean;
    combined_exhaustion: boolean;
    ivp_momentum: boolean;
    all_met: boolean;
}

export interface OperationStormCheckReport {
    preconditions: OperationStormPreconditionResult;
    fired: boolean;
    already_triggered: boolean;
}

function computeRsTerritorialShare(state: GameState): number {
    const pc = state.political.political_controllers;
    if (!pc) return 0;
    const keys = Object.keys(pc).sort(strictCompare);
    if (keys.length === 0) return 0;
    let rsCount = 0;
    for (const key of keys) {
        if (pc[key] === 'RS') rsCount++;
    }
    return rsCount / keys.length;
}

/**
 * Evaluate Operation Storm preconditions. Pure function of state.
 * All must be true: Washington signed, RS share >= threshold, combined exhaustion >= threshold, IVP >= threshold.
 */
export function evaluateOperationStormPreconditions(state: GameState): OperationStormPreconditionResult {
    const rhs = state.political.rbih_hrhb_state;
    const washington_active = rhs?.washington_signed === true;

    const rsShare = computeRsTerritorialShare(state);
    const rs_threat = rsShare >= STORM_RS_THREAT_SHARE;

    const rbihExhaustion = state.political.war_exhaustion?.['RBiH'] ?? 0;
    const hrhbExhaustion = state.political.war_exhaustion?.['HRHB'] ?? 0;
    const combinedExhaustion = rbihExhaustion + hrhbExhaustion;
    const combined_exhaustion = combinedExhaustion >= STORM_COMBINED_EXHAUSTION;

    const ivp = state.political.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;
    const ivp_momentum = negotiationMomentum >= STORM_IVP_MOMENTUM;

    return {
        washington_active,
        rs_threat,
        combined_exhaustion,
        ivp_momentum,
        all_met: washington_active && rs_threat && combined_exhaustion && ivp_momentum
    };
}

/**
 * Check and apply Operation Storm: set meta.operation_storm_triggered when all preconditions met.
 * Must run after phase-ii-washington-check (Washington must be possible first).
 */
export function checkAndApplyOperationStorm(state: GameState): OperationStormCheckReport {
    if (state.meta.phase !== 'war') {
        return {
            preconditions: {
                washington_active: false,
                rs_threat: false,
                combined_exhaustion: false,
                ivp_momentum: false,
                all_met: false
            },
            fired: false,
            already_triggered: false
        };
    }

    const alreadyTriggered = state.meta.operation_storm_triggered === true;
    if (alreadyTriggered) {
        return {
            preconditions: evaluateOperationStormPreconditions(state),
            fired: false,
            already_triggered: true
        };
    }

    const preconditions = evaluateOperationStormPreconditions(state);
    if (!preconditions.all_met) {
        return { preconditions, fired: false, already_triggered: false };
    }

    state.meta = { ...state.meta, operation_storm_triggered: true };
    return { preconditions, fired: true, already_triggered: false };
}

