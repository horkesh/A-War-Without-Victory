/**
 * Collapse feature-flag LIFECYCLE — the single owner of the 3A→3D enable state.
 *
 * DEFECT (RC panel, 2026-08-13): the collapse enable flags are module-level process
 * globals (`_enablePhase3*Override`). `runScenario` only ever SET them, and only on the
 * `ENABLE_COLLAPSE=true` path — nothing ever cleared them. In a process that runs more
 * than one scenario (test suites, batch harnesses, the desktop app), a collapse-ON run
 * therefore CONTAMINATED every later run in the same process: the later run's artifacts
 * would be collapse-ON while its `collapse_enabled.json` marker said OFF. That is exactly
 * the false-provenance the G2-A marker exists to prevent, so any measurement taken after
 * a collapse-ON run in the same process was untrustworthy.
 *
 * FIX SHAPE — establish, do not remember-to-reset. A run's collapse state is now a pure
 * function of that run's own gate: `applyCollapseGate()` FIRST clears every flag back to
 * its module default, THEN enables the chain if and only if this run's gate says so. No
 * caller has to remember a teardown call, and a teardown could not be trusted anyway —
 * it is skipped on a throw or an early return, which is when contamination is worst.
 *
 * The flag registry below is the other half of the fix, and the lifecycle is only as
 * complete as the registry. tests/collapse_flag_lifecycle.test.ts derives the expected
 * set FROM SOURCE — it scans src/sim/pressure + src/sim/collapse for
 * `export function setEnable*` and compares against this array's own `set.name` values —
 * so a new flag module that is not registered here fails that test. Keep every collapse
 * flag registered or the lifecycle silently goes partial, which is exactly how
 * `phase3a_diffusion` came to be missing from the old scenario-runner gate block.
 *
 * Determinism: reads one env var at run start (same as the gate block it replaces); no
 * RNG, no clock, no fs. The registry is sorted with `strictCompare` so any iteration over
 * it (including diagnostics) is stable.
 */
import { strictCompare } from '../../state/validateGameState.js';
import {
    getEnablePhase3A,
    resetEnablePhase3A,
    setEnablePhase3A,
} from '../pressure/phase3a_pressure_eligibility.js';
import {
    getEnablePhase3ADiffusion,
    resetEnablePhase3ADiffusion,
    setEnablePhase3ADiffusion,
} from '../pressure/phase3a_pressure_diffusion.js';
import {
    getEnablePhase3B,
    resetEnablePhase3B,
    setEnablePhase3B,
} from '../pressure/phase3b_pressure_exhaustion.js';
import {
    getEnablePhase3C,
    resetEnablePhase3C,
    setEnablePhase3C,
} from '../pressure/phase3c_exhaustion_collapse_gating.js';
import {
    getEnablePhase3D,
    resetEnablePhase3D,
    setEnablePhase3D,
} from './phase3d_collapse_resolution.js';

/** Env var that gates the whole collapse pipeline for a scenario run (IV-a exploration switch). */
export const COLLAPSE_GATE_ENV_VAR = 'ENABLE_COLLAPSE';

export type CollapseFlagName =
    | 'phase3a'
    | 'phase3a_diffusion'
    | 'phase3b'
    | 'phase3c'
    | 'phase3d';

interface CollapseFlagAccessor {
    readonly name: CollapseFlagName;
    readonly get: () => boolean;
    readonly set: (enable: boolean) => void;
    readonly reset: () => void;
    /**
     * True when `ENABLE_COLLAPSE=true` turns this flag ON. The serial chain is
     * 3A → 3B → 3C → 3D; `phase3a_diffusion` is NOT part of it (the audit harness drives
     * diffusion explicitly and checks conservation), but it IS part of the reset set —
     * a diffusion flag left ON by a harness must not leak into a later scenario run.
     */
    readonly in_enable_chain: boolean;
}

/** Every collapse enable flag in the engine. Sorted by name (strictCompare). */
export const COLLAPSE_FLAGS: readonly CollapseFlagAccessor[] = ([
    { name: 'phase3a', get: getEnablePhase3A, set: setEnablePhase3A, reset: resetEnablePhase3A, in_enable_chain: true },
    { name: 'phase3a_diffusion', get: getEnablePhase3ADiffusion, set: setEnablePhase3ADiffusion, reset: resetEnablePhase3ADiffusion, in_enable_chain: false },
    { name: 'phase3b', get: getEnablePhase3B, set: setEnablePhase3B, reset: resetEnablePhase3B, in_enable_chain: true },
    { name: 'phase3c', get: getEnablePhase3C, set: setEnablePhase3C, reset: resetEnablePhase3C, in_enable_chain: true },
    { name: 'phase3d', get: getEnablePhase3D, set: setEnablePhase3D, reset: resetEnablePhase3D, in_enable_chain: true },
] satisfies CollapseFlagAccessor[]).sort((a, b) => strictCompare(a.name, b.name));

/** Current value of every collapse flag, keyed by name (diagnostics + regression tests). */
export function getCollapseFlagSnapshot(): Record<CollapseFlagName, boolean> {
    const snapshot = {} as Record<CollapseFlagName, boolean>;
    for (const flag of COLLAPSE_FLAGS) {
        snapshot[flag.name] = flag.get();
    }
    return snapshot;
}

/** Clear EVERY collapse flag override back to its module default (all OFF). */
export function resetCollapseFlags(): void {
    for (const flag of COLLAPSE_FLAGS) {
        flag.reset();
    }
}

/**
 * Establish this run's collapse state from this run's gate.
 *
 * Unconditional: the reset runs on BOTH paths, so a run can never inherit a previous
 * run's collapse state. Call once at run entry.
 */
export function applyCollapseGate(enabled: boolean): void {
    resetCollapseFlags();
    if (!enabled) return;
    for (const flag of COLLAPSE_FLAGS) {
        if (flag.in_enable_chain) flag.set(true);
    }
}

/** True only for the exact literal 'true' — every other value (incl. '1') is OFF. */
export function readCollapseGateFromEnv(): boolean {
    return process.env[COLLAPSE_GATE_ENV_VAR] === 'true';
}

/** `applyCollapseGate(readCollapseGateFromEnv())` — the scenario-runner entry point. */
export function applyCollapseGateFromEnv(): void {
    applyCollapseGate(readCollapseGateFromEnv());
}
