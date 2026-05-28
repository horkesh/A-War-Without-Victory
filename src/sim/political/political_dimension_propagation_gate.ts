/**
 * Phase E MVS: Political-Dimension Propagation Gate
 *
 * Two-tier feature flag for routing strategic-dimension values from the
 * negotiation substrate into bot decision surfaces (commander briefings,
 * op-launch eligibility, etc).
 *
 * Tier 1 — global propagation switch (`AWWV_POLITICAL_DIMENSION_PROPAGATION`).
 * Tier 2 — per-dimension sub-flags (currently only `intl_standing_ops_hesitation`).
 *
 * Both tiers must be ON for any consumer hook to fire. When OFF (default),
 * consumers must take a byte-stable no-op path: no briefing field added, no
 * launch-score multiplication, no save-state field. This is the calibration-
 * safety invariant — the same contract the equipment-quality-modifier substrate
 * relies on (`!== 1.0` fast-path) to keep historical hashes stable.
 *
 * Pattern mirrors `phase3c_exhaustion_collapse_gating.ts` (module-local
 * mutable override with getter/setter + env fallback).
 *
 * Deterministic: env-based + override-based, no randomness, no timestamps,
 * no save-state serialization. Resettable for test isolation.
 */

// ---------------------------------------------------------------------------
// Tier 1: Global propagation switch
// ---------------------------------------------------------------------------

let _politicalDimensionPropagationOverride: boolean | null = null;

/** Returns true when the global political-dimension propagation switch is
 *  enabled. Reads `process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION` ('true'
 *  or '1') unless an override has been set via the setter (tests). Default
 *  off: production simulation paths remain byte-identical to pre-Phase-E
 *  baselines until the flag is flipped. */
export function isPoliticalDimensionPropagationEnabled(): boolean {
    if (_politicalDimensionPropagationOverride !== null) {
        return _politicalDimensionPropagationOverride;
    }
    const raw = process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    return raw === 'true' || raw === '1';
}

/** Set the global political-dimension propagation override.
 *  Pass `null` to clear and fall back to env. Tests-only. */
export function setPoliticalDimensionPropagationOverride(value: boolean | null): void {
    _politicalDimensionPropagationOverride = value;
}

// ---------------------------------------------------------------------------
// Tier 2: international_standing → ops-hesitation sub-flag
// ---------------------------------------------------------------------------

let _intlStandingOpsHesitationOverride: boolean | null = null;

/** Returns true when the international_standing → ops-hesitation sub-flag is
 *  enabled. Reads `process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION` ('true'
 *  or '1') unless an override has been set via the setter. */
export function isIntlStandingOpsHesitationEnabled(): boolean {
    if (_intlStandingOpsHesitationOverride !== null) {
        return _intlStandingOpsHesitationOverride;
    }
    const raw = process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION;
    return raw === 'true' || raw === '1';
}

/** Set the international_standing → ops-hesitation sub-flag override.
 *  Pass `null` to clear and fall back to env. Tests-only. */
export function setIntlStandingOpsHesitationOverride(value: boolean | null): void {
    _intlStandingOpsHesitationOverride = value;
}

// ---------------------------------------------------------------------------
// Combined helper — both tiers required
// ---------------------------------------------------------------------------

/** Combined gate: BOTH the global propagation switch AND the
 *  intl_standing sub-flag must be ON. This is the single predicate every
 *  consumer (briefing assembly + sector_offensive launch gate) must read —
 *  callers MUST NOT cache it across turns. When this returns false,
 *  consumers take a byte-stable no-op path. */
export function isIntlStandingOpsHesitationActive(): boolean {
    return isPoliticalDimensionPropagationEnabled() && isIntlStandingOpsHesitationEnabled();
}

// ---------------------------------------------------------------------------
// Test isolation helper
// ---------------------------------------------------------------------------

/** Reset both overrides to null (env-fallback). For test cleanup between
 *  cases. Does not touch env vars. */
export function resetPoliticalDimensionGates(): void {
    _politicalDimensionPropagationOverride = null;
    _intlStandingOpsHesitationOverride = null;
}
