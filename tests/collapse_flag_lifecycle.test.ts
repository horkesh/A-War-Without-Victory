/**
 * Collapse feature-flag LIFECYCLE regression (RC defect 7).
 *
 * The defect: the collapse enable flags are module-level process globals and
 * `runScenario` only ever SET them, on the ENABLE_COLLAPSE=true path, with no reset
 * anywhere outside the CLI audit harness. One collapse-ON run therefore contaminated
 * every later run in the SAME PROCESS — the later run's artifacts were collapse-ON while
 * its `collapse_enabled.json` marker said OFF, which makes any measurement taken after a
 * collapse-ON run untrustworthy.
 *
 * These tests pin the fix at both ends:
 *  - behaviour: applying a collapse-OFF gate after a collapse-ON gate leaves EVERY flag
 *    off, so no run can inherit a previous run's collapse state;
 *  - structure: scenario_runner.ts goes through the lifecycle entry point and no longer
 *    calls the per-module setters, so the reset cannot be bypassed by forgetting it.
 *
 * Determinism: pure flag state + one env var; no RNG, no clock, no fs (bar the source pin).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    COLLAPSE_FLAGS,
    COLLAPSE_GATE_ENV_VAR,
    applyCollapseGate,
    applyCollapseGateFromEnv,
    getCollapseFlagSnapshot,
    readCollapseGateFromEnv,
    resetCollapseFlags,
} from '../src/sim/collapse/collapse_flag_lifecycle.js';
import { getEnablePhase3A, setEnablePhase3A } from '../src/sim/pressure/phase3a_pressure_eligibility.js';
import { getEnablePhase3ADiffusion, setEnablePhase3ADiffusion } from '../src/sim/pressure/phase3a_pressure_diffusion.js';
import { getEnablePhase3B } from '../src/sim/pressure/phase3b_pressure_exhaustion.js';
import { getEnablePhase3C } from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import { getEnablePhase3D } from '../src/sim/collapse/phase3d_collapse_resolution.js';

const ALL_OFF = {
    phase3a: false,
    phase3a_diffusion: false,
    phase3b: false,
    phase3c: false,
    phase3d: false,
};

const CHAIN_ON = {
    phase3a: true,
    phase3a_diffusion: false, // NOT in the ENABLE_COLLAPSE chain (harness-driven only)
    phase3b: true,
    phase3c: true,
    phase3d: true,
};

let savedEnv: string | undefined;

beforeEach(() => {
    savedEnv = process.env[COLLAPSE_GATE_ENV_VAR];
});

afterEach(() => {
    if (savedEnv === undefined) delete process.env[COLLAPSE_GATE_ENV_VAR];
    else process.env[COLLAPSE_GATE_ENV_VAR] = savedEnv;
    resetCollapseFlags();
});

describe('collapse flag registry', () => {
    it('covers every collapse enable flag in the engine, sorted', () => {
        const names = COLLAPSE_FLAGS.map(f => f.name);
        expect(names).toEqual(['phase3a', 'phase3a_diffusion', 'phase3b', 'phase3c', 'phase3d']);
        expect(names).toEqual([...names].sort());
    });

    it('each registry entry is wired to its own module accessors (no copy-paste crossover)', () => {
        resetCollapseFlags();
        const live = {
            phase3a: getEnablePhase3A,
            phase3a_diffusion: getEnablePhase3ADiffusion,
            phase3b: getEnablePhase3B,
            phase3c: getEnablePhase3C,
            phase3d: getEnablePhase3D,
        };
        // Flip exactly one flag at a time through the registry; only that module's own
        // getter may change. A mis-wired entry (two names sharing one module's setter)
        // shows up as a second getter moving.
        for (const flag of COLLAPSE_FLAGS) {
            flag.set(true);
            for (const [name, getter] of Object.entries(live)) {
                expect(getter(), `${flag.name} set(true) must move only ${flag.name}, not ${name}`)
                    .toBe(name === flag.name);
            }
            flag.reset();
        }
    });
});

describe('applyCollapseGate — a run cannot inherit a previous run\'s collapse state', () => {
    it('gate ON enables the 3A→3D serial chain and leaves diffusion off', () => {
        resetCollapseFlags();
        applyCollapseGate(true);
        expect(getCollapseFlagSnapshot()).toEqual(CHAIN_ON);
    });

    it('gate OFF after gate ON clears every flag (THE contamination regression)', () => {
        applyCollapseGate(true);
        expect(getCollapseFlagSnapshot()).toEqual(CHAIN_ON);
        // Second "run" in the same process, with the gate off.
        applyCollapseGate(false);
        expect(getCollapseFlagSnapshot()).toEqual(ALL_OFF);
    });

    it('gate OFF also clears flags no ENABLE_COLLAPSE path ever set (harness leakage)', () => {
        // The CLI audit harnesses drive 3A + diffusion directly. If one of them throws
        // before its own reset, the next scenario run in the process must still start clean.
        setEnablePhase3A(true);
        setEnablePhase3ADiffusion(true);
        applyCollapseGate(false);
        expect(getCollapseFlagSnapshot()).toEqual(ALL_OFF);
    });

    it('is idempotent — applying the same gate twice is the same state', () => {
        applyCollapseGate(true);
        const once = getCollapseFlagSnapshot();
        applyCollapseGate(true);
        expect(getCollapseFlagSnapshot()).toEqual(once);
        applyCollapseGate(false);
        const off = getCollapseFlagSnapshot();
        applyCollapseGate(false);
        expect(getCollapseFlagSnapshot()).toEqual(off);
    });
});

describe('env gate', () => {
    it('only the exact literal "true" enables the pipeline', () => {
        for (const value of ['true']) {
            process.env[COLLAPSE_GATE_ENV_VAR] = value;
            expect(readCollapseGateFromEnv(), value).toBe(true);
        }
        for (const value of ['1', 'TRUE', 'True', 'yes', '', 'false']) {
            process.env[COLLAPSE_GATE_ENV_VAR] = value;
            expect(readCollapseGateFromEnv(), value).toBe(false);
        }
        delete process.env[COLLAPSE_GATE_ENV_VAR];
        expect(readCollapseGateFromEnv()).toBe(false);
    });

    it('an ON run followed by an OFF run leaves the OFF run collapse-free', () => {
        process.env[COLLAPSE_GATE_ENV_VAR] = 'true';
        applyCollapseGateFromEnv();
        expect(getCollapseFlagSnapshot()).toEqual(CHAIN_ON);

        delete process.env[COLLAPSE_GATE_ENV_VAR];
        applyCollapseGateFromEnv();
        expect(getCollapseFlagSnapshot()).toEqual(ALL_OFF);
    });
});

/**
 * Source with comments removed — a structural pin must match CODE, not the prose that
 * explains the retired rule (scenario_runner's own fix comment quotes the old setters).
 */
function codeOnly(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('scenario_runner wiring (structural — the reset must not be bypassable)', () => {
    const runnerSrc = codeOnly(readFileSync(
        join(process.cwd(), 'src', 'scenario', 'scenario_runner.ts'),
        'utf8'
    ));

    it('runScenario applies the collapse gate through the lifecycle entry point', () => {
        expect(runnerSrc.includes('applyCollapseGateFromEnv()')).toBe(true);
    });

    it('runScenario does NOT set collapse flags directly (that path had no reset)', () => {
        for (const setter of [
            'setEnablePhase3A(',
            'setEnablePhase3ADiffusion(',
            'setEnablePhase3B(',
            'setEnablePhase3C(',
            'setEnablePhase3D(',
        ]) {
            expect(runnerSrc.includes(setter), `scenario_runner.ts must not call ${setter}`).toBe(false);
        }
    });

    it('the gate predicate has one owner — no inline ENABLE_COLLAPSE env read remains', () => {
        // `if (process.env.ENABLE_COLLAPSE === 'true') { ...enable... }` is the defect
        // shape: nothing runs on the OFF path, so nothing clears a previous run's state.
        // A second inline read is also how the run marker and the flag state drift apart.
        expect(runnerSrc.includes('process.env.ENABLE_COLLAPSE')).toBe(false);
    });
});
