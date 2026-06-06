/**
 * Intel Ambush Friction — feature gate (umbrella, default-ON).
 *
 * The intel surprise / ambush casualty mechanic (getIntelAmbushAttackerCasualtyMult /
 * getIntelAmbushDefenderCasualtyMult in combat_math.ts) is SHIPPED and live in the
 * baseline. This gate retro-wraps that live behavior behind a single kill-switch.
 *
 * CRITICAL: the umbrella defaults to ON (mechanic active) so the baseline is preserved
 * byte-identically when the flag is unset. The flag exists only so the mechanic CAN be
 * disabled for experiments — turning it OFF is the behavior change, not ON.
 *
 * Idiom mirrors src/sim/pressure/phase3c_exhaustion_collapse_gating.ts:
 * module-local override (set/reset for tests) layered over an env read, no Date.now /
 * Math.random — deterministic. Env var `AWWV_INTEL_AMBUSH_FRICTION`: "0"/"false"/"off"
 * disables; any other value (or unset) leaves the default-ON behavior intact.
 */

let _intelAmbushFrictionOverride: boolean | null = null;

function readEnvIntelAmbushFriction(): boolean {
    const raw = process.env.AWWV_INTEL_AMBUSH_FRICTION;
    if (raw === undefined) return true; // default ON — preserves shipped baseline
    const normalized = raw.trim().toLowerCase();
    if (normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no') {
        return false;
    }
    return true;
}

/**
 * Whether the intel/ambush friction mechanic is active.
 * Default: TRUE (preserves the current live baseline). Module-local override wins over env.
 */
export function isIntelAmbushFrictionEnabled(): boolean {
    return _intelAmbushFrictionOverride !== null
        ? _intelAmbushFrictionOverride
        : readEnvIntelAmbushFriction();
}

/** Test/experiment hook: force the flag on or off, bypassing env. */
export function setIntelAmbushFrictionOverride(value: boolean): void {
    _intelAmbushFrictionOverride = value;
}

/** Test/experiment hook: clear the override, reverting to env-default (ON when unset). */
export function resetIntelAmbushFrictionOverride(): void {
    _intelAmbushFrictionOverride = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nested DEPTH sub-flag (default OFF).
//
// The base ambush-friction mechanic above is gated by the umbrella
// AWWV_INTEL_AMBUSH_FRICTION (default ON). The "depth" amplifier — which scales the
// already-capped friction by how far the attacker over-reaches its own recon — is a
// SEPARATE, NESTED, default-OFF slice (see
// docs/40_reports/proposals/20260605_INTEL_AMBUSH_FRICTION_DESIGN.md §2/§4).
//
// CRITICAL: this sub-flag defaults OFF so the baseline stays byte-identical until the
// amplifier is deliberately enabled. When OFF the depth contribution is neutral (the
// depth factor is forced to 0 ⇒ the friction multipliers return their exact shipped
// values). The depth amplifier is only ever active when BOTH the umbrella is ON AND
// this sub-flag is ON. Env var `AWWV_INTEL_AMBUSH_DEPTH`: "1"/"true"/"on"/"yes"
// enables; any other value (or unset) leaves the default-OFF (neutral) behavior.

let _intelAmbushDepthOverride: boolean | null = null;

function readEnvIntelAmbushDepth(): boolean {
    const raw = process.env.AWWV_INTEL_AMBUSH_DEPTH;
    if (raw === undefined) return false; // default OFF — neutral, byte-identical baseline
    const normalized = raw.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes') {
        return true;
    }
    return false;
}

/**
 * Whether the nested ambush-DEPTH amplifier is active.
 * Default: FALSE (neutral — preserves the shipped baseline byte-identically). Module-local
 * override wins over env. Note: the amplifier only has effect when the umbrella
 * (isIntelAmbushFrictionEnabled) is ALSO on; this returns the sub-flag state in isolation.
 */
export function isIntelAmbushDepthEnabled(): boolean {
    return _intelAmbushDepthOverride !== null
        ? _intelAmbushDepthOverride
        : readEnvIntelAmbushDepth();
}

/** Test/experiment hook: force the depth sub-flag on or off, bypassing env. */
export function setIntelAmbushDepthOverride(value: boolean): void {
    _intelAmbushDepthOverride = value;
}

/** Test/experiment hook: clear the depth override, reverting to env-default (OFF when unset). */
export function resetIntelAmbushDepthOverride(): void {
    _intelAmbushDepthOverride = null;
}
