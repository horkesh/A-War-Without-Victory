/**
 * War-phase steps hand the turn's data root (TurnInput.dataBaseDir) to their data loaders.
 *
 * These loaders used to fall back to the process cwd, so a run started outside the repo root
 * crashed (legitimacy, strategic priorities) or silently used empty data (lifecycle events).
 * Each step is run for real here; only the loader is mocked, to record the base dir it receives.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const DATA_ROOT = '/awwv-data-root-probe';

const lifecycle = vi.hoisted(() => ({ load: vi.fn(async (_baseDir?: string) => []) }));
const legitimacy = vi.hoisted(() => ({ update: vi.fn(async (..._args: unknown[]) => {}) }));
const reserve = vi.hoisted(() => ({
    reinforce: vi.fn((..._args: unknown[]) => ({ formations_reinforced: 0, manpower_distributed: 0, by_faction: {} })),
}));
const phase3a = vi.hoisted(() => ({
    loadGraph: vi.fn(async (_path?: string): Promise<never> => { throw new Error('probe: stop after the load call'); }),
}));

vi.mock('../src/sim/formation_lifecycle_events.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/sim/formation_lifecycle_events.js')>()),
    loadLifecycleEvents: lifecycle.load,
    processLifecycleEvents: vi.fn(),
}));
vi.mock('../src/state/legitimacy.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/state/legitimacy.js')>()),
    updateLegitimacyState: legitimacy.update,
}));
vi.mock('../src/sim/combat/strategic_reserve.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/sim/combat/strategic_reserve.js')>()),
    reinforceFromStrategicReserves: reserve.reinforce,
}));
vi.mock('../src/sim/pressure/phase3a_pressure_eligibility.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/sim/pressure/phase3a_pressure_eligibility.js')>()),
    getEnablePhase3A: () => true,
    loadEnrichedContactGraph: phase3a.loadGraph,
}));

import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { TurnContext } from '../src/sim/turn_pipeline_types.js';

function phase(name: string) {
    const found = warPhases.find((p) => p.name === name);
    if (!found) throw new Error(`war phase not found: ${name}`);
    return found;
}

function warContext(dataBaseDir?: string): TurnContext {
    return {
        state: { meta: { turn: 30, phase: 'war' }, political: {}, military: {} },
        input: {
            ...(dataBaseDir ? { dataBaseDir } : {}),
            operationalSettlementGraph: { settlements: new Map(), edges: [] },
        },
        report: {},
    } as unknown as TurnContext;
}

afterEach(() => {
    vi.clearAllMocks();
});

describe('war phases pass TurnInput.dataBaseDir to their data loaders', () => {
    it('process-lifecycle-events → loadLifecycleEvents', async () => {
        await phase('process-lifecycle-events').run(warContext(DATA_ROOT));
        expect(lifecycle.load).toHaveBeenCalledWith(DATA_ROOT);
    });

    it('update-legitimacy → updateLegitimacyState', async () => {
        await phase('update-legitimacy').run(warContext(DATA_ROOT));
        expect(legitimacy.update).toHaveBeenCalledTimes(1);
        expect(legitimacy.update.mock.calls[0]?.[2]).toBe(DATA_ROOT);
    });

    it('strategic-reserve-reinforcement → reinforceFromStrategicReserves', async () => {
        await phase('strategic-reserve-reinforcement').run(warContext(DATA_ROOT));
        expect(reserve.reinforce).toHaveBeenCalledTimes(1);
        expect(reserve.reinforce.mock.calls[0]?.[1]).toBe(DATA_ROOT);
    });

    it('phase3a-pressure-eligibility → loadEnrichedContactGraph (path under the data root)', async () => {
        // The probe loader throws to stop the step after the call; whether the step catches it is not under test.
        await Promise.resolve(phase('phase3a-pressure-eligibility').run(warContext(DATA_ROOT))).catch(() => {});
        expect(phase3a.loadGraph).toHaveBeenCalledWith(
            `${DATA_ROOT}/data/derived/settlement_contact_graph_enriched.json`,
        );
    });

    it('without a dataBaseDir the loaders get undefined and keep their cwd fallback', async () => {
        await phase('process-lifecycle-events').run(warContext());
        expect(lifecycle.load).toHaveBeenCalledWith(undefined);
    });
});
