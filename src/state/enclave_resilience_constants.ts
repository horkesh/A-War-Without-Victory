/**
 * Enclave Resilience Constants (Phase C).
 *
 * Enclave resilience runs in 1.0 (`enclave-resilience` pipeline step, not behind any flag).
 * These constants were split out of the retired supply-reserve constants on 2026-11-17
 * (Fable consult 6: the supply-reserve economy is not modelled in 1.0). Values unchanged.
 */

/** Maximum enclave resilience value. */
export const MAX_ENCLAVE_RESILIENCE = 30;
/** Resilience growth per turn when enclave supply is critical. */
export const RESILIENCE_GROWTH_CRITICAL = 2;
/** Resilience growth per turn when enclave supply is strained. */
export const RESILIENCE_GROWTH_STRAINED = 1;
/** Resilience decay per turn when enclave has adequate supply (no longer besieged). */
export const RESILIENCE_DECAY_ADEQUATE = 1;
/** Exhaustion reduction per resilience point (multiplicative). */
export const RESILIENCE_EFFECT_SCALE = 0.01;
/** Consecutive isolation turns needed to activate hardening. */
export const HARDENING_THRESHOLD = 8;
/** Defense bonus multiplier when hardened (+5%). */
export const HARDENING_DEFENSE_BONUS = 0.05;
