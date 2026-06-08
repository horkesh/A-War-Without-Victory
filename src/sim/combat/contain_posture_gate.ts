/**
 * VRS contain-posture feature gate (contain Lane V, §6-sensitive, DEFAULT-OFF).
 *
 * Design: docs/plans/2026-06-08-vrs-contain-posture-laneV-design.md.
 *
 * Models the historically accurate VRS "strangle-not-capture" strategy toward
 * isolated Bosniak enclaves (Srebrenica / Žepa / Goražde): siege + containment
 * rather than assault, until the emergent 1995 pivot. The posture WITHHOLDS the
 * VRS bot's OWN organic assault target-generation into containable enclave OSIDs
 * — it is safe-by-construction (only ever REMOVES an attack the bot would have
 * generated; never creates an attack, a reward, or a control flip).
 *
 * §6 HARD INVARIANT: the 1995-pivot RELEASE must reliably fire so Srebrenica and
 * Žepa STILL FALL and `srebrenica_genocide_1995` is STILL RECORDED. This gate
 * only suppresses the AHISTORICAL pre-1995 organic over-capture; the historical
 * fall flows through the scripted `*_falls_1995` control_change events AND the
 * Krivaja-95 / Stupčanica-95 triggered ops, NEITHER of which this posture touches
 * (they inject objectives directly, bypassing the organic targeting path).
 *
 * DEFAULT-OFF contract (calibration-LAST): when OFF, the containment set is never
 * written to state and the suppression filter is never reached → 40w + 188w
 * BYTE-IDENTICAL to the floor (235c61f408dc3d95 / d311eeac18492683).
 *
 * Pattern mirrors `political_dimension_propagation_gate.ts` (module-local mutable
 * override with getter/setter + env fallback). Deterministic: env-based +
 * override-based; no randomness, no timestamps, no save-state serialization.
 */

let _vrsContainPostureOverride: boolean | null = null;

/**
 * Returns true when the VRS contain-posture is enabled.
 * Reads `process.env.AWWV_VRS_CONTAIN_POSTURE` ('true' or '1' => ON) unless an
 * override has been set via the setter (tests). DEFAULT-OFF: unset / any other
 * value => OFF (the calibration-LAST byte-identity contract).
 */
export function isVrsContainPostureEnabled(): boolean {
    if (_vrsContainPostureOverride !== null) {
        return _vrsContainPostureOverride;
    }
    const raw = process.env.AWWV_VRS_CONTAIN_POSTURE;
    return raw === 'true' || raw === '1';
}

/**
 * Set the VRS contain-posture override. Pass `null` to clear and fall back to
 * env. Tests-only.
 */
export function setVrsContainPostureOverride(value: boolean | null): void {
    _vrsContainPostureOverride = value;
}

/** Reset the override to null (env-fallback). For test cleanup between cases. */
export function resetVrsContainPostureGate(): void {
    _vrsContainPostureOverride = null;
}
