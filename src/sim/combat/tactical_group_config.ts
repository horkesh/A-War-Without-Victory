/**
 * Tactical Group (TG) feature flags and configuration constants.
 *
 * Implements the staged rollout from ADR-0005 (docs/20_engineering/ADR/
 * ADR-0005-tactical-groups-as-primary-ops-path.md). Canonical OG entity is
 * described in Rulebook v0.9.0 §5.7 and Systems Manual v0.9.0 §6.3.
 *
 * Umbrella flag (ENABLE_TACTICAL_GROUPS): when true, the opening-attack
 * readiness gate examines only the axis's anchor brigade (main_brigade)
 * instead of iterating every assigned brigade. Non-anchor brigades become
 * "donor candidates" — present in the participating list (so MIN_OPERATION_
 * PARTICIPANTS gating still passes) but not required to be adjacent to the
 * objective for the op to launch.
 *
 * Sub-flags gate behavior progression per ADR-0005 §Phased Rollout:
 *   - ENABLE_TG_FORMATION       → v2.0/v2.2 → TG records populated, donors
 *                                 contribute to combat power synthesis
 *   - ENABLE_TG_COMBAT_SYNTHESIS → v2.2 → donors contribute to tg.personnel/
 *                                 equipment; battle uses TG snapshot; donors
 *                                 absorb 50% of casualties pro-rata
 *   - ENABLE_TG_COHESION_BLEED  → v2.3 → donor cohesion bleed formula
 *                                 (donated_fraction × (1 + hops × 0.15) × 15)
 *                                 + cooldown enforcement
 *
 * All flags default false. Schema (v19) ships all TG fields empty; the
 * existing omitEmpty serializer helper ensures byte-identical hash with
 * sub-flags off. Sub-flag activation is the calibration-shift gate.
 */
export const ENABLE_TACTICAL_GROUPS = false;

/** v2.0/v2.2 sub-flag: TG entity formation + combat power synthesis. */
export const ENABLE_TG_FORMATION = false;

/** v2.2 sub-flag: donor contribution to combat power + casualty distribution. */
export const ENABLE_TG_COMBAT_SYNTHESIS = false;

/** v2.3 sub-flag: Pyrrhic dampener (donor cohesion bleed + cooldown enforcement). */
export const ENABLE_TG_COHESION_BLEED = false;

/**
 * v2.2c #3 donation-readiness gate (ADR-0005 §Op lifecycle integration). The
 * anchor's pledged donors must contribute at least this fraction of the anchor's
 * personnel for the op to clear the opening-attack readiness gate; otherwise it is
 * a lone-anchor suicide attack and the axis is blocked (`insufficient_donation`).
 * Only enforced when ENABLE_TG_FORMATION is on (donors only exist then).
 */
export const DONATION_READINESS_FRACTION = 0.6;

/**
 * Resolve the anchor brigade for an axis under TG semantics.
 *
 * Honors the canonical `main_brigade` if already assigned by
 * `assignBrigadeRoles` (highest basePower with deterministic tiebreak).
 * Falls back to first assigned brigade for legacy axes that predate
 * the main/support split.
 *
 * Returns undefined only when the axis has zero assigned brigades —
 * caller should treat that as a malformed axis.
 */
export function getAnchorBrigade(axis: {
    main_brigade?: string;
    assigned_brigades: readonly string[];
}): string | undefined {
    if (axis.main_brigade) return axis.main_brigade;
    return axis.assigned_brigades[0];
}
