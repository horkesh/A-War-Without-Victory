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
