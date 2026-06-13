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

// ── ARBiH contain-posture (contain Lane A, Washington-release, DEFAULT-OFF) ────
//
// Mirror of the VRS gate for the SYMMETRIC ARBiH-side problem: ARBiH (RBiH)
// historically CONTAINED the isolated HVO pockets (Žepče / Lašva / Kiseljak)
// rather than overrunning them, until the Washington Agreement froze the
// RBiH↔HRHB war. The sim instead over-captures them (the documented 13-OSID
// Central-Bosnia ceiling: 3 Žepče cores + 10 over-captures). When ON, the RBiH
// bot withholds its own organic assault target-generation against BFS-isolated
// HVO enclave cores until `washington_signed` — at which point the existing
// alliance/ceasefire machinery freezes the war and the pockets stay HVO-held,
// matching painted Oct-1995.
//
// SEPARATE FLAG from the VRS gate so the two lanes activate INDEPENDENTLY (the
// design requires one-change-per-run calibration attribution). DEFAULT-OFF →
// flag-off keeps the sim byte-identical to the calibration floor.

let _arbihContainPostureOverride: boolean | null = null;

/**
 * Returns true when the ARBiH contain-posture is enabled.
 * Reads `process.env.AWWV_ARBIH_CONTAIN_POSTURE` ('true' or '1' => ON) unless an
 * override has been set via the setter (tests). DEFAULT-OFF: unset / any other
 * value => OFF (the calibration-LAST byte-identity contract).
 */
export function isArbihContainPostureEnabled(): boolean {
    if (_arbihContainPostureOverride !== null) {
        return _arbihContainPostureOverride;
    }
    const raw = process.env.AWWV_ARBIH_CONTAIN_POSTURE;
    return raw === 'true' || raw === '1';
}

/**
 * Set the ARBiH contain-posture override. Pass `null` to clear and fall back to
 * env. Tests-only.
 */
export function setArbihContainPostureOverride(value: boolean | null): void {
    _arbihContainPostureOverride = value;
}

/** Reset the override to null (env-fallback). For test cleanup between cases. */
export function resetArbihContainPostureGate(): void {
    _arbihContainPostureOverride = null;
}

// ── SRK strangle-not-capture posture (§6 Sarajevo urban-core, DEFAULT-OFF) ──
//
// Models the historically accurate VRS Sarajevo-Romanija Corps (SRK) doctrine:
// the SRK STRANGLED the Sarajevo urban core, never assaulted it (Galić Appeal
// §389). The four urban-core municipalities (centar_sarajevo / novi_grad_sarajevo
// / novo_sarajevo / stari_grad_sarajevo) are suppressed from organic SRK CAPTURE
// intent when this flag is ON. The outer ring (ilidza/vogosca/ilijas/hadzici/
// pale/sokolac) is NOT suppressed — those remain legitimate SRK objectives.
//
// The player can still order the ahistorical assault via the existing
// `authorize_op` presidential lever (which injects an op directly, bypassing the
// organic plan path — no extra work needed for the override).
//
// SEPARATE FLAG from the VRS/ARBiH contain gates so the lane activates
// INDEPENDENTLY (one-change-per-run calibration attribution). DEFAULT-OFF →
// flag-off keeps the sim byte-identical to the calibration floor.

let _srkStranglePostureOverride: boolean | null = null;

/**
 * Returns true when the SRK strangle-posture is enabled.
 * DEFAULT-ON (activated 2026-06-13, task #34, Pyrrhic-panel GO): the VRS
 * Sarajevo-Romanija Corps strangles the urban core rather than assaulting it
 * (Galić Appeal §389). Reads `process.env.AWWV_SRK_STRANGLE_POSTURE` and is ON
 * unless explicitly disabled (`'false'` or `'0'`, for diagnostics) or overridden
 * via the setter (tests). Activation is TERRITORY-FLAT: the SRK already strangled
 * emergently, so this codifies/guards the pattern (control_delta + formation_delta
 * byte-identical at 40w/52w/188w; only the persisted `last_contained_osids_by_faction.RS`
 * observer field moves the full-save hash — golden manifest re-blessed accordingly).
 */
export function isSrkStranglePostureEnabled(): boolean {
    if (_srkStranglePostureOverride !== null) {
        return _srkStranglePostureOverride;
    }
    const raw = process.env.AWWV_SRK_STRANGLE_POSTURE;
    return raw !== 'false' && raw !== '0';
}

/**
 * Set the SRK strangle-posture override. Pass `null` to clear and fall back to
 * env. Tests-only.
 */
export function setSrkStranglePostureOverride(value: boolean | null): void {
    _srkStranglePostureOverride = value;
}

/** Reset the override to null (env-fallback). For test cleanup between cases. */
export function resetSrkStranglePostureGate(): void {
    _srkStranglePostureOverride = null;
}
