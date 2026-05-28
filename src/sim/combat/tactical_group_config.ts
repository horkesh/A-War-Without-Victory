/**
 * Tactical Group (TG) feature flag and configuration constants.
 *
 * Implements the staged rollout from ADR-0005 (docs/20_engineering/ADR/
 * ADR-0005-tactical-groups-as-primary-ops-path.md). Canonical OG entity is
 * described in Rulebook v0.9.0 §5.7 and Systems Manual v0.9.0 §6.3.
 *
 * v1 scope (this constant only): when ENABLE_TACTICAL_GROUPS=true, the
 * opening-attack readiness gate examines only the axis's anchor brigade
 * (main_brigade) instead of iterating every assigned brigade. Non-anchor
 * brigades become "donor candidates" — present in the participating list
 * (so MIN_OPERATION_PARTICIPANTS gating still passes) but not required to be
 * adjacent to the objective for the op to launch.
 *
 * Default: false. Keeps existing calibration baseline byte-identical until
 * an opt-in run validates v1, v2 (donors flat), and v3 (distance falloff).
 */
export const ENABLE_TACTICAL_GROUPS = false;

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
