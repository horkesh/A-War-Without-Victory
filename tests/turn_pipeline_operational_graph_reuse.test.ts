import { describe, expect, it, vi } from 'vitest';

import type { LoadedSettlementGraph } from '../src/map/settlements.js';
import type { TurnContext } from '../src/sim/turn_pipeline_types.js';

const { loadSettlementGraphMock } = vi.hoisted(() => ({
    loadSettlementGraphMock: vi.fn<() => Promise<LoadedSettlementGraph>>(),
}));

vi.mock('../src/map/settlements.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../src/map/settlements.js')>();
    return {
        ...original,
        loadSettlementGraph: loadSettlementGraphMock,
    };
});

import { getOperationalSettlementGraph } from '../src/sim/turn_pipeline_types.js';
import { buildAdjacencyMapCached } from '../src/map/adjacency_map.js';

function graph(id: string): LoadedSettlementGraph {
    return {
        settlements: new Map([[id, {
            sid: id,
            source_id: id,
            mun_code: '001',
            mun: 'fixture',
        }]]),
        edges: [{ a: id, b: `${id}-neighbor` }],
    };
}

function context(operationalSettlementGraph?: LoadedSettlementGraph): TurnContext {
    return {
        input: {
            seed: 'operational-graph-reuse',
            operationalSettlementGraph,
        },
    } as TurnContext;
}

describe('war-turn operational settlement graph reuse', () => {
    it('uses the caller-injected immutable graph without touching disk', async () => {
        loadSettlementGraphMock.mockReset();
        const injected = graph('injected');
        const turnContext = context(injected);

        await expect(getOperationalSettlementGraph(turnContext)).resolves.toBe(injected);
        await expect(getOperationalSettlementGraph(turnContext)).resolves.toBe(injected);

        expect(loadSettlementGraphMock).not.toHaveBeenCalled();
        expect(Object.isFrozen(injected.edges)).toBe(true);
        expect(Object.isFrozen(injected.edges[0])).toBe(true);
        expect(buildAdjacencyMapCached(injected.edges)).toBe(buildAdjacencyMapCached(injected.edges));
    });

    it('loads at most once per turn context when no graph was injected', async () => {
        loadSettlementGraphMock.mockReset();
        const loaded = graph('loaded');
        loadSettlementGraphMock.mockResolvedValue(loaded);
        const turnContext = context();

        const [first, second] = await Promise.all([
            getOperationalSettlementGraph(turnContext),
            getOperationalSettlementGraph(turnContext),
        ]);

        expect(first).toBe(loaded);
        expect(second).toBe(loaded);
        expect(loadSettlementGraphMock).toHaveBeenCalledTimes(1);
        expect(Object.isFrozen(loaded.edges)).toBe(true);
        expect(Object.isFrozen(loaded.edges[0])).toBe(true);
        expect(buildAdjacencyMapCached(loaded.edges)).toBe(buildAdjacencyMapCached(loaded.edges));
    });

    it('does not leak a mutable graph cache between turn contexts', async () => {
        loadSettlementGraphMock.mockReset();
        loadSettlementGraphMock
            .mockResolvedValueOnce(graph('turn-a'))
            .mockResolvedValueOnce(graph('turn-b'));

        const first = await getOperationalSettlementGraph(context());
        const second = await getOperationalSettlementGraph(context());

        expect(first).not.toBe(second);
        expect(loadSettlementGraphMock).toHaveBeenCalledTimes(2);
    });
});
