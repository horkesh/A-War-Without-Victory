import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from '../src/sim/combat/sector_topology_mutation_journal.js';
import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import type { SectorTopologySolveOptions } from '../src/sim/combat/sector_topology_solver_types.js';
import type { GameState } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(
    ROOT,
    'data',
    'derived',
    'operational',
    'operational_contact_graph.json',
);
const hasRealSave = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

function loadState(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): EdgeRecord[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as {
        edges: EdgeRecord[];
    };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function traceFromMutations(mutations: readonly { stage: string }[]) {
    const stages: Array<{ stage: string; mutationCount: number }> = [];
    for (const mutation of mutations) {
        const last = stages.at(-1);
        if (last?.stage === mutation.stage) last.mutationCount++;
        else stages.push({ stage: mutation.stage, mutationCount: 1 });
    }
    return { stages };
}

function runImperative(
    state: GameState,
    edges: EdgeRecord[],
    options: SectorTopologySolveOptions,
) {
    const recorder = createSectorTopologyMutationRecorder();
    const sectors = buildCorpsFrontSectors(
        state,
        edges,
        null,
        undefined,
        undefined,
        options.isFinalPass,
        options.finalSaveGeometryProjection,
        options.useFixedPointShortcuts,
        options.occupancyStrategy,
        options.frontEdgeAdjacencyStrategy,
        undefined,
        'test-only-imperative-live-state',
        recorder,
    );
    return {
        sectors,
        mutations: recorder.mutations,
        diagnostics: recorder.diagnostics,
        trace: traceFromMutations(recorder.mutations),
    };
}

describe.skipIf(!hasRealSave)('pure full sector topology solve', () => {
    const variants: Array<{
        name: string;
        options: SectorTopologySolveOptions;
        arrange?: (state: GameState) => void;
    }> = [
        {
            name: 'no-front no-move',
            arrange: (state) => { state.military.war_front_edges_osid = []; },
            options: {
                isFinalPass: false,
                finalSaveGeometryProjection: false,
                useFixedPointShortcuts: true,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        },
        {
            name: 'pristine live solve with location writes',
            options: {
                isFinalPass: false,
                finalSaveGeometryProjection: false,
                useFixedPointShortcuts: true,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        },
        {
            name: 'full multi-pass recovery sequence',
            options: {
                isFinalPass: false,
                finalSaveGeometryProjection: false,
                useFixedPointShortcuts: false,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        },
        {
            name: 'final-pass warning diagnostics',
            options: {
                isFinalPass: true,
                finalSaveGeometryProjection: false,
                useFixedPointShortcuts: true,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        },
        {
            name: 'final-save geometry projection',
            options: {
                isFinalPass: false,
                finalSaveGeometryProjection: true,
                useFixedPointShortcuts: true,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        },
        {
            name: 'legacy relation and occupancy reference',
            options: {
                isFinalPass: true,
                finalSaveGeometryProjection: true,
                useFixedPointShortcuts: false,
                occupancyStrategy: 'test-only-legacy-scan',
                frontEdgeAdjacencyStrategy: 'test-only-legacy-edge-adjacency',
            },
        },
    ];

    for (const variant of variants) {
        it(`matches imperative statement order for ${variant.name}`, () => {
            const imperativeState = loadState();
            const snapshotState = loadState();
            variant.arrange?.(imperativeState);
            variant.arrange?.(snapshotState);
            const edges = loadEdges();
            const input = captureSectorTopologySolveInput(
                snapshotState,
                edges,
                null,
                undefined,
                undefined,
                variant.options,
            );
            const before = JSON.stringify(input);

            const expected = runImperative(imperativeState, edges, variant.options);
            const actual = solveCorpsFrontSectorsPure(input);

            expect(actual).toEqual(expected);
            expect(JSON.stringify(input)).toBe(before);
            expect(Object.isFrozen(input)).toBe(true);
            expect(Object.isFrozen(input.formations)).toBe(true);
        });
    }

    it('contains no live GameState access or mutation escape hatch', () => {
        const source = fs.readFileSync('src/sim/combat/sector_topology_solver.ts', 'utf8');
        expect(source).not.toMatch(/\bGameState\b/);
        expect(source).not.toMatch(/\bstate\./);
        expect(source).not.toMatch(/\bas\s+(?:unknown\s+as\s+)?GameState\b/);
    });
});
