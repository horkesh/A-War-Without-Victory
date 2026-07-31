/**
 * Collapse Phase I — DISABLED-turn inertness of the Phase 3C supply-reachability BFS // legacy-phase-term-ok
 * (Codex #375 P2 fix).
 *
 * The 3C war-phase step's spatial gate (spec C8) reads computeSupplyReachabilityOsid —
 * a full per-turn OSID reachability BFS (edge fingerprint + controller bucketing). That
 * report is ONLY consumed when Phase 3C is ENABLED; when disabled the apply fn returns
 * `feature_flag_disabled` and never reads it. The Phase-I contract is "disabled = truly
 * inert", so the BFS must NOT run on a disabled turn. This test asserts:
 *   • flag OFF (default) → computeSupplyReachabilityOsid is NEVER called, and
 *   • flag ON → it IS called.
 * Determinism: spies/mocks only; no RNG/clock.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the two heavy helpers the 3C step calls so we can count calls without loading
// real operational data or computing real front edges.
vi.mock('../src/state/supply_reachability_osid.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/state/supply_reachability_osid.js')>();
    return {
        ...actual,
        computeSupplyReachabilityOsid: vi.fn(() => ({ schema: 1 as const, turn: 0, factions: [] })),
    };
});
vi.mock('../src/map/front_edges.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/map/front_edges.js')>();
    return {
        ...actual,
        computeFrontEdges: vi.fn(() => []),
    };
});

import { computeSupplyReachabilityOsid } from '../src/state/supply_reachability_osid.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { setOperationalData } from '../src/sim/turn_pipeline_types.js';
import {
    setEnablePhase3C,
    resetEnablePhase3C,
} from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import {
    setEnablePhase3B,
    resetEnablePhase3B,
} from '../src/sim/pressure/phase3b_pressure_exhaustion.js';
import {
    setEnablePhase3A,
    resetEnablePhase3A,
} from '../src/sim/pressure/phase3a_pressure_eligibility.js';

const bfsSpy = computeSupplyReachabilityOsid as unknown as ReturnType<typeof vi.fn>;

function makeContext() {
    const context = {
        state: {
            meta: { turn: 150, phase: 'war' },
            factions: [
                { id: 'RBiH', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'RS', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'HRHB', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
            ],
            military: { formations: {}, front_pressure: {} },
            political: {},
        },
        input: { settlementEdges: [{ a: 'x', b: 'y' }] },
        report: {},
    } as unknown as Parameters<(typeof warPhases)[number]['run']>[0];

    // Operational data present + truthy so the (guarded) BFS branch's data check passes
    // when the flag is ON — proving the guard, not the data check, is what gates the BFS.
    setOperationalData(context, {
        opData: {
            operationalToCanonical: { 'op:x:x': 'x' },
            canonicalToOperational: { x: 'op:x:x' },
        },
        edges: [{ a: 'op:x:x', b: 'op:y:y' }],
        centroids: {},
    } as unknown as Parameters<typeof setOperationalData>[1]);

    return context;
}

const step3c = warPhases.find(p => p.name === 'phase3c-exhaustion-collapse-gating')!;

describe('collapse Phase I — Phase 3C BFS is inert on a DISABLED turn (#375 P2)', () => { // legacy-phase-term-ok
    afterEach(() => {
        resetEnablePhase3A();
        resetEnablePhase3B();
        resetEnablePhase3C();
        bfsSpy.mockClear();
    });

    it('the 3C step exists', () => {
        expect(step3c).toBeDefined();
    });

    it('flag OFF (default): computeSupplyReachabilityOsid is NEVER called', () => {
        // default = disabled
        step3c.run(makeContext());
        expect(bfsSpy).not.toHaveBeenCalled();
    });

    it('flag ON: computeSupplyReachabilityOsid IS called (the report is needed)', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        step3c.run(makeContext());
        expect(bfsSpy).toHaveBeenCalledTimes(1);
    });
});
