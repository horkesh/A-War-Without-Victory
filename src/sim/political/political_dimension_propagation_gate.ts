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
 *  enabled. Reads `process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION` unless an
 *  override has been set via the setter (tests).
 *
 *  Default ON as of PR-4 (patron_confidence + military_credibility channel
 *  activation). The umbrella is now enabled-by-default so headless calibration
 *  picks up the cleared channels without env vars; per-channel sub-flags still
 *  gate which consumers actually fire (intl_standing + cohesion remain
 *  default-OFF). Set the env var to 'false'/'0' to force the umbrella off. */
export function isPoliticalDimensionPropagationEnabled(): boolean {
    if (_politicalDimensionPropagationOverride !== null) {
        return _politicalDimensionPropagationOverride;
    }
    const raw = process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    if (raw === 'false' || raw === '0') {
        return false;
    }
    return true;
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
// Tier 2: internal_cohesion → bot caution-bias sub-flag (Phase E Packet 2)
// ---------------------------------------------------------------------------

let _cohesionCautionBiasOverride: boolean | null = null;

/** Returns true when the internal_cohesion → bot caution-bias sub-flag is
 *  enabled. Reads `process.env.AWWV_PDP_COHESION_CAUTION_BIAS` ('true' or '1')
 *  unless an override has been set via the setter. Mirrors the
 *  intl_standing sub-flag pattern; default off until the flag is flipped. */
export function isCohesionCautionBiasEnabled(): boolean {
    if (_cohesionCautionBiasOverride !== null) {
        return _cohesionCautionBiasOverride;
    }
    const raw = process.env.AWWV_PDP_COHESION_CAUTION_BIAS;
    return raw === 'true' || raw === '1';
}

/** Set the internal_cohesion → caution-bias sub-flag override.
 *  Pass `null` to clear and fall back to env. Tests-only. */
export function setCohesionCautionBiasOverride(value: boolean | null): void {
    _cohesionCautionBiasOverride = value;
}

// ---------------------------------------------------------------------------
// Tier 2: patron_confidence → op-launch patron-hesitation sub-flag
// ---------------------------------------------------------------------------

let _patronConfidenceOpsHesitationOverride: boolean | null = null;

/** Returns true when the patron_confidence → ops-hesitation sub-flag is
 *  enabled. Reads `process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION`
 *  unless an override has been set via the setter.
 *
 *  Default ON as of PR-4: the Pyrrhic historian cleared this channel for
 *  activation, so it is enabled-by-default for headless calibration (the
 *  umbrella must also be on, which it now is by default). Set the env var to
 *  'false'/'0' to force this channel off. Semantic: low patron confidence
 *  (sponsor withholding) → op-launch hesitation, same DIRECTION as
 *  intl_standing. */
export function isPatronConfidenceOpsHesitationEnabled(): boolean {
    if (_patronConfidenceOpsHesitationOverride !== null) {
        return _patronConfidenceOpsHesitationOverride;
    }
    const raw = process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION;
    if (raw === 'false' || raw === '0') {
        return false;
    }
    return true;
}

/** Set the patron_confidence → ops-hesitation sub-flag override.
 *  Pass `null` to clear and fall back to env. Tests-only. */
export function setPatronConfidenceOpsHesitationOverride(value: boolean | null): void {
    _patronConfidenceOpsHesitationOverride = value;
}

// ---------------------------------------------------------------------------
// Tier 2: military_credibility → op-launch caution-bias sub-flag
// ---------------------------------------------------------------------------

let _militaryCredibilityCautionBiasOverride: boolean | null = null;

/** Returns true when the military_credibility → caution-bias sub-flag is
 *  enabled. Reads `process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS`
 *  ('true' or '1') unless an override has been set via the setter. Mirrors the
 *  internal_cohesion sub-flag pattern; default off until the flag is flipped.
 *  Semantic: low military credibility (failing ops + bleeding exchange ratio)
 *  → op-launch caution, same DIRECTION as internal_cohesion. */
export function isMilitaryCredibilityCautionBiasEnabled(): boolean {
    if (_militaryCredibilityCautionBiasOverride !== null) {
        return _militaryCredibilityCautionBiasOverride;
    }
    const raw = process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS;
    return raw === 'true' || raw === '1';
}

/** Set the military_credibility → caution-bias sub-flag override.
 *  Pass `null` to clear and fall back to env. Tests-only. */
export function setMilitaryCredibilityCautionBiasOverride(value: boolean | null): void {
    _militaryCredibilityCautionBiasOverride = value;
}

// ---------------------------------------------------------------------------
// Combined helpers — both tiers required
// ---------------------------------------------------------------------------

/** Combined gate: BOTH the global propagation switch AND the
 *  intl_standing sub-flag must be ON. This is the single predicate every
 *  consumer (briefing assembly + sector_offensive launch gate) must read —
 *  callers MUST NOT cache it across turns. When this returns false,
 *  consumers take a byte-stable no-op path. */
export function isIntlStandingOpsHesitationActive(): boolean {
    return isPoliticalDimensionPropagationEnabled() && isIntlStandingOpsHesitationEnabled();
}

/** Combined gate: BOTH the global propagation switch AND the
 *  internal_cohesion → caution-bias sub-flag must be ON. Mirrors the
 *  intl_standing combined predicate. Consumers (briefing assembly,
 *  sector_offensive launch-gate cohesion multiplier) MUST gate on this and
 *  take a byte-stable no-op path when false. */
export function isCohesionCautionBiasActive(): boolean {
    return isPoliticalDimensionPropagationEnabled() && isCohesionCautionBiasEnabled();
}

/** Combined gate: BOTH the global propagation switch AND the
 *  patron_confidence → ops-hesitation sub-flag must be ON. Mirrors the
 *  intl_standing combined predicate. Consumers (briefing assembly,
 *  sector_offensive launch-gate patron multiplier) MUST gate on this and take a
 *  byte-stable no-op path when false. */
export function isPatronConfidenceOpsHesitationActive(): boolean {
    return isPoliticalDimensionPropagationEnabled() && isPatronConfidenceOpsHesitationEnabled();
}

/** Combined gate: BOTH the global propagation switch AND the
 *  military_credibility → caution-bias sub-flag must be ON. Mirrors the
 *  internal_cohesion combined predicate. Consumers (briefing assembly,
 *  sector_offensive launch-gate credibility multiplier) MUST gate on this and
 *  take a byte-stable no-op path when false. */
export function isMilitaryCredibilityCautionBiasActive(): boolean {
    return isPoliticalDimensionPropagationEnabled() && isMilitaryCredibilityCautionBiasEnabled();
}

// ---------------------------------------------------------------------------
// Test isolation helper
// ---------------------------------------------------------------------------

/** Reset all overrides to null (env-fallback). For test cleanup between
 *  cases. Does not touch env vars. */
export function resetPoliticalDimensionGates(): void {
    _politicalDimensionPropagationOverride = null;
    _intlStandingOpsHesitationOverride = null;
    _cohesionCautionBiasOverride = null;
    _patronConfidenceOpsHesitationOverride = null;
    _militaryCredibilityCautionBiasOverride = null;
}
