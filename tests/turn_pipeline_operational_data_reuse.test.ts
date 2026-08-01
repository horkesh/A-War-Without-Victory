import { describe, expect, it, vi } from 'vitest';

import type { LoadedOperationalData, OsidCentroidMap } from '../src/data/operational_data.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type {
    OperationalDataCache,
    TurnContext,
} from '../src/sim/turn_pipeline_types.js';

const {
    loadOperationalCentroidsMock,
    loadOperationalDataMock,
    loadOperationalEdgesMock,
} = vi.hoisted(() => ({
    loadOperationalCentroidsMock: vi.fn<() => Promise<OsidCentroidMap>>(),
    loadOperationalDataMock: vi.fn<() => Promise<LoadedOperationalData>>(),
    loadOperationalEdgesMock: vi.fn<() => Promise<EdgeRecord[]>>(),
}));

vi.mock('../src/data/operational_data.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../src/data/operational_data.js')>();
    return {
        ...original,
        loadOperationalCentroids: loadOperationalCentroidsMock,
        loadOperationalData: loadOperationalDataMock,
        loadOperationalEdges: loadOperationalEdgesMock,
    };
});

import {
    getOperationalData,
    getOrLoadOperationalData,
    getSiegeStateCache,
} from '../src/sim/turn_pipeline_types.js';
import { earlyWarPhases } from '../src/sim/turn_phases/early_war_phases.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';

function operationalData(label: string): LoadedOperationalData {
    const sid = `sid:${label}`;
    const osid = `op:${label}`;
    return {
        canonicalToOperational: { [sid]: osid },
        operationalToCanonical: new Map([[osid, [sid]]]),
    };
}

function cache(label: string): OperationalDataCache {
    return {
        opData: operationalData(label),
        edges: [{ a: `op:${label}`, b: `op:${label}:neighbor` }],
        centroids: new Map([[`op:${label}`, { lat: 44, lon: 18 }]]),
    };
}

function context(injected?: OperationalDataCache): TurnContext {
    return {
        input: {
            seed: 'operational-data-reuse',
            operationalData: injected,
        },
    } as TurnContext;
}

function resetLoaders(): void {
    loadOperationalCentroidsMock.mockReset();
    loadOperationalDataMock.mockReset();
    loadOperationalEdgesMock.mockReset();
}

describe('war-turn operational data reuse', () => {
    it('uses caller-owned immutable operational data without touching disk', async () => {
        resetLoaders();
        const injected = cache('injected');
        const turnContext = context(injected);

        expect(getOperationalData(turnContext)).toBe(injected);
        await expect(getOrLoadOperationalData(turnContext)).resolves.toBe(injected);

        expect(loadOperationalDataMock).not.toHaveBeenCalled();
        expect(loadOperationalEdgesMock).not.toHaveBeenCalled();
        expect(loadOperationalCentroidsMock).not.toHaveBeenCalled();
    });

    it('shares one fallback load promise across every phase in a turn context', async () => {
        resetLoaders();
        const loaded = cache('loaded');
        loadOperationalDataMock.mockResolvedValue(loaded.opData);
        loadOperationalEdgesMock.mockResolvedValue(loaded.edges);
        loadOperationalCentroidsMock.mockResolvedValue(loaded.centroids);
        const turnContext = context();

        const [first, second, third] = await Promise.all([
            getOrLoadOperationalData(turnContext),
            getOrLoadOperationalData(turnContext),
            getOrLoadOperationalData(turnContext),
        ]);

        expect(first).toEqual(loaded);
        expect(second).toBe(first);
        expect(third).toBe(first);
        expect(getOperationalData(turnContext)).toBe(first);
        expect(loadOperationalDataMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalEdgesMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalCentroidsMock).toHaveBeenCalledTimes(1);
    });

    it('does not leak a fallback cache between turn contexts', async () => {
        resetLoaders();
        loadOperationalDataMock
            .mockResolvedValueOnce(operationalData('turn-a'))
            .mockResolvedValueOnce(operationalData('turn-b'));
        loadOperationalEdgesMock
            .mockResolvedValueOnce([{ a: 'op:turn-a', b: 'op:turn-a:neighbor' }])
            .mockResolvedValueOnce([{ a: 'op:turn-b', b: 'op:turn-b:neighbor' }]);
        loadOperationalCentroidsMock
            .mockResolvedValueOnce(new Map([['op:turn-a', { lat: 44, lon: 18 }]]))
            .mockResolvedValueOnce(new Map([['op:turn-b', { lat: 45, lon: 19 }]]));

        const first = await getOrLoadOperationalData(context());
        const second = await getOrLoadOperationalData(context());

        expect(first).not.toBe(second);
        expect(loadOperationalDataMock).toHaveBeenCalledTimes(2);
        expect(loadOperationalEdgesMock).toHaveBeenCalledTimes(2);
        expect(loadOperationalCentroidsMock).toHaveBeenCalledTimes(2);
    });

    it('shares the fallback across migration, backfill, and the explicit load step', async () => {
        resetLoaders();
        const loaded = cache('phases');
        loadOperationalDataMock.mockResolvedValue(loaded.opData);
        loadOperationalEdgesMock.mockResolvedValue(loaded.edges);
        loadOperationalCentroidsMock.mockResolvedValue(loaded.centroids);
        const turnContext = {
            state: {
                meta: { phase: 'war' },
                political: { political_controllers: {} },
                military: { formations: {} },
            },
            rng: () => {
                throw new Error('test fixture must not consume randomness');
            },
            input: { seed: 'phase-operational-data-reuse' },
            report: { seed: 'phase-operational-data-reuse', phases: [] },
        } as unknown as TurnContext;

        for (const name of [
            'migrate-political-control-osid',
            'location-osid-backfill',
            'load-operational-data',
        ]) {
            const phase = warPhases.find((candidate) => candidate.name === name);
            expect(phase, `missing war phase ${name}`).toBeDefined();
            await phase!.run(turnContext);
        }

        expect(getOperationalData(turnContext)).toEqual(loaded);
        expect(loadOperationalDataMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalEdgesMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalCentroidsMock).toHaveBeenCalledTimes(1);
    });

    it('keeps mapping-only migration, backfill, and spawn independent of topology failures', async () => {
        resetLoaders();
        const loaded: OperationalDataCache = {
            opData: {
                canonicalToOperational: { 'sid:MUN_A': 'op:MUN_A:center' },
                operationalToCanonical: new Map([['op:MUN_A:center', ['sid:MUN_A']]]),
            },
            edges: [{ a: 'op:MUN_A:center', b: 'op:MUN_B:center' }],
            centroids: new Map([['op:MUN_A:center', { lat: 44, lon: 18 }]]),
        };
        loadOperationalDataMock.mockResolvedValue(loaded.opData);
        loadOperationalEdgesMock.mockRejectedValue(new Error('optional edges unavailable'));
        loadOperationalCentroidsMock.mockRejectedValue(new Error('optional centroids unavailable'));
        const turnContext = {
            state: {
                meta: { turn: 10, phase: 'war' },
                factions: [{
                    id: 'RBiH',
                    profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                    areasOfResponsibility: [],
                    supply_sources: [],
                }],
                military: {
                    formations: {
                        existing: {
                            id: 'existing',
                            faction: 'RBiH',
                            kind: 'brigade',
                            hq_sid: 'sid:MUN_A',
                        },
                    },
                    militia_pools: {
                        'MUN_A:RBiH': {
                            mun_id: 'MUN_A',
                            faction: 'RBiH',
                            available: 1600,
                            committed: 0,
                            exhausted: 0,
                            fatigue: 0,
                            updated_turn: 10,
                        },
                    },
                    formation_spawn_directive: { kind: 'brigade' },
                },
                political: {
                    political_controllers: { 'sid:MUN_A': 'RBiH' },
                    municipalities: {},
                },
                displacement: {},
            },
            rng: () => {
                throw new Error('test fixture must not consume randomness');
            },
            input: { seed: 'mapping-only-optional-failure' },
            report: { seed: 'mapping-only-optional-failure', phases: [] },
        } as unknown as TurnContext;

        for (const name of [
            'migrate-political-control-osid',
            'location-osid-backfill',
            'formation-spawn',
        ]) {
            const phase = warPhases.find((candidate) => candidate.name === name);
            expect(phase, `missing war phase ${name}`).toBeDefined();
            await phase!.run(turnContext);
        }

        expect(turnContext.state.political.political_controllers).toEqual({ 'op:MUN_A:center': 'RBiH' });
        expect(turnContext.state.military.formations.existing?.location_osid).toBe('op:MUN_A:center');
        expect(turnContext.report.formation_spawn?.formations_created).toBe(1);
        expect(loadOperationalDataMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalEdgesMock).not.toHaveBeenCalled();
        expect(loadOperationalCentroidsMock).not.toHaveBeenCalled();
    });

    it('keeps early-war mapping plus edges independent of centroid failure', async () => {
        resetLoaders();
        const opData = {
            canonicalToOperational: {
                'sid:A': 'op:A',
                'sid:B': 'op:B',
            },
            operationalToCanonical: new Map([
                ['op:A', ['sid:A']],
                ['op:B', ['sid:B']],
            ]),
        };
        loadOperationalDataMock.mockResolvedValue(opData);
        loadOperationalEdgesMock.mockResolvedValue([{ a: 'op:A', b: 'op:B' }]);
        loadOperationalCentroidsMock.mockRejectedValue(new Error('optional centroids unavailable'));
        const turnContext = {
            state: {
                meta: { turn: 10, phase: 'war', recruitment_mode: 'bottom_up' },
                factions: [
                    { id: 'RBiH', profile: {}, areasOfResponsibility: [], supply_sources: [] },
                    { id: 'RS', profile: {}, areasOfResponsibility: [], supply_sources: [] },
                ],
                military: { formations: {} },
                political: {
                    political_controllers: { 'op:A': 'RBiH', 'op:B': 'RS' },
                    municipalities: { A: {}, B: {} },
                },
                displacement: {},
            },
            rng: () => {
                throw new Error('test fixture must not consume randomness');
            },
            input: {
                seed: 'early-war-optional-centroid-failure',
                settlementGraph: {
                    settlements: new Map([
                        ['sid:A', { sid: 'sid:A', source_id: 'A', mun_code: 'A', mun: 'A' }],
                        ['sid:B', { sid: 'sid:B', source_id: 'B', mun_code: 'B', mun: 'B' }],
                    ]),
                    edges: [],
                },
            },
            report: { seed: 'early-war-optional-centroid-failure', phases: [] },
        } as unknown as TurnContext;
        const phase = earlyWarPhases.find((candidate) => candidate.name === 'compute-siege-state');
        expect(phase).toBeDefined();

        await phase!.run(turnContext);

        expect(getSiegeStateCache(turnContext)?.siegeRatios.get('A:RBiH')).toBe(1);
        expect(loadOperationalDataMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalEdgesMock).toHaveBeenCalledTimes(1);
        expect(loadOperationalCentroidsMock).not.toHaveBeenCalled();
    });
});
