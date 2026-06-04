/**
 * Playtest telemetry — feature gate (DEFAULT-OFF).
 *
 * Gates the local-first playtest/run diagnostics slice. The slice records a small
 * per-session summary of an already-completed deterministic scenario run to a local
 * file under a gitignored `_debug` path. It NEVER touches simulation state, RNG, or
 * scenario outputs, and emits nothing over the network.
 *
 * CRITICAL: this flag DEFAULTS OFF. With the flag unset (or explicitly falsy) the
 * diagnostics writer is a no-op — zero new output, zero behavior change, baselines
 * byte-identical by construction. Turning it ON is the only behavior change, and ON
 * only writes a local diagnostic file; it still cannot perturb the sim.
 *
 * Idiom mirrors src/sim/combat/intel_ambush_depth_gate.ts and
 * src/sim/political/political_dimension_propagation_gate.ts: a module-local override
 * (set/reset for tests) layered over an env read. No Date.now / Math.random in the
 * gate itself — deterministic. Env var `AWWV_PLAYTEST_TELEMETRY`: "1"/"true"/"on"/"yes"
 * enables; any other value (or unset) leaves the default-OFF behavior intact.
 */

export const PLAYTEST_TELEMETRY_ENV_KEY = 'AWWV_PLAYTEST_TELEMETRY';

let _playtestTelemetryOverride: boolean | null = null;

function readEnvPlaytestTelemetry(): boolean {
    const raw = process.env[PLAYTEST_TELEMETRY_ENV_KEY];
    if (raw === undefined) return false; // default OFF — preserves byte-identical baseline
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

/**
 * Whether the local playtest telemetry slice is active.
 * Default: FALSE (no output, byte-identical baseline). Module-local override wins over env.
 */
export function isPlaytestTelemetryEnabled(): boolean {
    return _playtestTelemetryOverride !== null
        ? _playtestTelemetryOverride
        : readEnvPlaytestTelemetry();
}

/** Test/experiment hook: force the flag on or off, bypassing env. */
export function setPlaytestTelemetryOverride(value: boolean): void {
    _playtestTelemetryOverride = value;
}

/** Test/experiment hook: clear the override, reverting to env-default (OFF when unset). */
export function resetPlaytestTelemetryOverride(): void {
    _playtestTelemetryOverride = null;
}
