import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import {
    createSectorFrontEdgeRelationTestCounters,
} from '../src/sim/combat/sector_front_edge_relation.js';
import { assertBrigadeReachability } from '../src/sim/combat/sector_assertions.js';
import { createSectorTopologyMutationRecorder } from '../src/sim/combat/sector_topology_mutation_journal.js';
import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import type {
    SectorTopologySolveInput,
    SectorTopologySolveOptions,
} from '../src/sim/combat/sector_topology_solver_types.js';
import type { CorpsFrontSector, GameState } from '../src/state/game_state.js';
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

function loadState(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): EdgeRecord[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as {
        edges: EdgeRecord[];
    };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function options(overrides: Partial<SectorTopologySolveOptions> = {}): SectorTopologySolveOptions {
    return {
        isFinalPass: false,
        finalSaveGeometryProjection: false,
        useFixedPointShortcuts: true,
        occupancyStrategy: 'dense-index',
        frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
        ...overrides,
    };
}

describe('R5 Phase 2e repair contracts', () => {
    it.each([
        ['occupancy strategy', { occupancyStrategy: 'invalid-occupancy' }, /occupancy strategy/i],
        ['front-edge strategy', { frontEdgeAdjacencyStrategy: 'invalid-relation' }, /front-edge adjacency strategy/i],
        ['final-pass mode', { isFinalPass: 'yes' }, /isFinalPass/i],
        ['final-save mode', { finalSaveGeometryProjection: 1 }, /finalSaveGeometryProjection/i],
        ['fixed-point mode', { useFixedPointShortcuts: null }, /useFixedPointShortcuts/i],
    ])('validates invalid %s before reading state', (_name, override, expectedError) => {
        let reads = 0;
        const state = new Proxy({} as GameState, {
            get() {
                reads += 1;
                throw new Error('STATE_READ_BEFORE_VALIDATION');
            },
        });

        expect(() => captureSectorTopologySolveInput(
            state,
            [],
            null,
            undefined,
            undefined,
            options(override as Partial<SectorTopologySolveOptions>),
        )).toThrow(expectedError);
        expect(reads).toBe(0);
    });

    it('validates the direct imperative invocation options before reading live state', () => {
        let reads = 0;
        const state = new Proxy({} as GameState, {
            get() {
                reads += 1;
                throw new Error('STATE_READ_BEFORE_VALIDATION');
            },
        });

        expect(() => buildCorpsFrontSectors(
            state,
            [],
            null,
            undefined,
            undefined,
            false,
            false,
            true,
            'invalid-occupancy' as never,
        )).toThrow(/occupancy strategy/i);
        expect(reads).toBe(0);
    });

    it('keeps the pure solve silent while returning every ordered routine diagnostic', () => {
        const state = loadState();
        const input = captureSectorTopologySolveInput(
            state,
            loadEdges(),
            null,
            undefined,
            undefined,
            options({
                isFinalPass: true,
                finalSaveGeometryProjection: true,
                useFixedPointShortcuts: false,
                occupancyStrategy: 'test-only-legacy-scan',
                frontEdgeAdjacencyStrategy: 'test-only-legacy-edge-adjacency',
            }),
        );
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            const output = solveCorpsFrontSectorsPure(input);
            expect(debug).not.toHaveBeenCalled();
            expect(warn).not.toHaveBeenCalled();
            expect(log).not.toHaveBeenCalled();
            expect(error).not.toHaveBeenCalled();
            expect(output.diagnostics.some((row) => row.kind === 'debug')).toBe(true);
            expect(output.diagnostics.some((row) => row.kind === 'warning')).toBe(true);
            expect(output.diagnostics.map((row) => row.sequence)).toEqual(
                output.diagnostics.map((_, index) => index),
            );
        } finally {
            debug.mockRestore();
            warn.mockRestore();
            log.mockRestore();
            error.mockRestore();
        }
    });

    it('routes invariant errors into the ordered diagnostic journal when a recorder is present', () => {
        const recorder = createSectorTopologyMutationRecorder();
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const sector = {
            sector_id: 'sector:test:0',
            corps_id: 'corps:test',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: [],
            territory_osids: ['op:test:front'],
            sub_segments: [],
            length_edges: 0,
            assigned_brigade_ids: ['brigade:test'],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        } satisfies CorpsFrontSector;
        try {
            expect(assertBrigadeReachability(
                [sector],
                {
                    'brigade:test': {
                        id: 'brigade:test',
                        name: 'Test brigade',
                        faction: 'RBiH',
                        status: 'active',
                        assignment: null,
                        location_osid: 'op:test:rear',
                    },
                },
                new Map([
                    ['op:test:front', 0],
                    ['op:test:rear', 1],
                ]),
                recorder,
                'constructed-reachability-invariant',
            )).toEqual(['brigade:test']);
            expect(error).not.toHaveBeenCalled();
            expect(recorder.diagnostics).toEqual([expect.objectContaining({
                sequence: 0,
                stage: 'constructed-reachability-invariant',
                kind: 'error',
                mutationBoundary: 0,
            })]);
        } finally {
            error.mockRestore();
        }
    });

    it('records actual zero-mutation stage and branch execution independently of the journal', () => {
        const state = loadState();
        state.military.war_front_edges_osid = [];
        const input = captureSectorTopologySolveInput(
            state,
            loadEdges(),
            null,
            undefined,
            undefined,
            options(),
        );

        const output = solveCorpsFrontSectorsPure(input);
        expect(output.mutations).toEqual([]);
        expect(output.trace.stages.length).toBeGreaterThan(0);
        expect(output.trace.stages.some((row) => row.mutationCount === 0)).toBe(true);
        expect(output.trace.stages).toContainEqual(expect.objectContaining({
            kind: 'branch',
            stage: 'front-edges-present',
            branchTaken: false,
        }));
    });

    it('threads Task 8A relation counters through the pure observer seam', () => {
        const edges = loadEdges();
        const candidateState = loadState();
        const imperativeState = loadState();
        const candidateCounters = createSectorFrontEdgeRelationTestCounters();
        const imperativeCounters = createSectorFrontEdgeRelationTestCounters();
        const input = captureSectorTopologySolveInput(
            candidateState,
            edges,
            null,
            undefined,
            undefined,
            options(),
        );

        (solveCorpsFrontSectorsPure as unknown as (
            value: SectorTopologySolveInput,
            observers: { frontEdgeRelationTestCounters: typeof candidateCounters },
        ) => unknown)(input, { frontEdgeRelationTestCounters: candidateCounters });
        buildCorpsFrontSectors(
            imperativeState,
            edges,
            null,
            undefined,
            undefined,
            false,
            false,
            true,
            'dense-index',
            'invocation-front-edge-relation',
            imperativeCounters,
        );

        expect(candidateCounters).toEqual(imperativeCounters);
        expect(candidateCounters.standardConstructions + candidateCounters.strictConstructions)
            .toBeGreaterThan(0);
        expect(candidateCounters.standardQueries + candidateCounters.strictQueries)
            .toBeGreaterThan(0);
    });

    it('does not widen the detached formation projection or invent required GameState defaults', () => {
        const typesSource = fs.readFileSync(
            'src/sim/combat/sector_topology_solver_types.ts',
            'utf8',
        );
        const solverSource = fs.readFileSync(
            'src/sim/combat/sector_topology_solver.ts',
            'utf8',
        );
        expect(typesSource).not.toMatch(/formations:\s*Record<FormationId,\s*FormationState>/);
        expect(solverSource).not.toMatch(/\bname:\s*formation\.id\b/);
        expect(solverSource).not.toMatch(/\bcreated_turn:\s*0\b/);
        expect(solverSource).not.toMatch(/last_recall_turn:\s*null/);
        expect(solverSource).not.toMatch(/permanently_degraded:\s*false/);
    });
});
