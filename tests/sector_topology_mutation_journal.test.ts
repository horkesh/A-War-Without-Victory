import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    __buildCorpsFrontSectorsImperativeForTest,
    buildCorpsFrontSectors,
    emitFinalUnresolvedSectorWarnings,
} from '../src/sim/combat/corps_front_sectors.js';
import * as sectorTopologyMutationJournal from '../src/sim/combat/sector_topology_mutation_journal.js';
import {
    commitSectorTopologySolve,
    createSectorTopologyMutationRecorder,
} from '../src/sim/combat/sector_topology_mutation_journal.js';
import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import type {
    SectorTopologyDiagnostic,
    SectorTopologyMutation,
    SectorTopologySolveInput,
    SectorTopologySolveOutput,
} from '../src/sim/combat/sector_topology_solver_types.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

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

type ContactGraphEdge = {
    edge_id: string;
    a: string;
    b: string;
    shared_segments?: number;
    min_dist?: number;
};

function loadRealSave(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadOperationalEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as {
        edges: ContactGraphEdge[];
    };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function fingerprint(state: GameState): string {
    return JSON.stringify((state.military.war_front_edges_osid ?? []).map((edge) => [
        edge.edge_id,
        edge.a,
        edge.b,
        edge.side_a,
        edge.side_b,
    ]));
}

function makeCommitState(): GameState {
    return {
        meta: { turn: 7 },
        military: {
            formations: {
                'brigade:a': {
                    id: 'brigade:a',
                    name: 'Brigade A',
                    location_osid: 'op:a',
                    entrenchment_turns: 3,
                    assigned_sub_segment_id: 'sub:old',
                    assignment: null,
                } as FormationState,
            },
            war_front_edges_osid: [{
                edge_id: 'op:a__op:b',
                a: 'op:a',
                b: 'op:b',
                side_a: 'RBiH',
                side_b: 'RS',
            }],
            unresolved_sector_brigades: ['brigade:old'],
        },
    } as unknown as GameState;
}

function commitInput(state: GameState): Pick<SectorTopologySolveInput, 'provenance'> {
    return {
        provenance: {
            turn: state.meta.turn,
            frontEdgeFingerprint: fingerprint(state),
            spatialComputedAtTurn: null,
            spatialPhase: null,
        },
    };
}

function solveOutput(
    mutations: readonly SectorTopologyMutation[],
    diagnostics: readonly SectorTopologyDiagnostic[] = [],
): SectorTopologySolveOutput {
    return {
        sectors: {},
        mutations,
        diagnostics,
        trace: { stages: [] },
    };
}

function expectAtomicFailure(
    state: GameState,
    input: Pick<SectorTopologySolveInput, 'provenance'>,
    output: SectorTopologySolveOutput,
    pattern: RegExp,
): void {
    const before = structuredClone(state);
    const emitted: SectorTopologyDiagnostic[] = [];
    expect(() => commitSectorTopologySolve(
        state,
        input,
        output,
        (diagnostic) => emitted.push(diagnostic),
    )).toThrow(pattern);
    expect(state).toEqual(before);
    expect(emitted).toEqual([]);
}

describe('sector topology imperative mutation journal', () => {
    it('exposes an atomic serial commit boundary', () => {
        expect(sectorTopologyMutationJournal.commitSectorTopologySolve).toBeTypeOf('function');
    });

    it('uses pure solve plus serial commit by default and isolates the imperative oracle', () => {
        const source = fs.readFileSync('src/sim/combat/corps_front_sectors.ts', 'utf8');
        const productionWrapper = source.slice(
            source.indexOf('export function buildCorpsFrontSectors('),
            source.indexOf('/** @internal Detached-state topology orchestrator'),
        );
        expect(productionWrapper).toContain('captureSectorTopologySolveInput(');
        expect(productionWrapper).toContain('solveCorpsFrontSectorsPure(');
        expect(productionWrapper).toContain('commitSectorTopologySolve(');
        expect(productionWrapper).not.toContain('executionStrategy:');
        expect(source).toContain('export function __buildCorpsFrontSectorsImperativeForTest(');
    });

    it('rejects stale turn provenance before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        const captured = commitInput(state);
        const input = {
            provenance: {
                ...captured.provenance,
                turn: captured.provenance.turn - 1,
            },
        };
        expectAtomicFailure(state, input, solveOutput([]), /stale.*turn/i);
    });

    it('rejects changed front-edge provenance before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        const input = commitInput(state);
        state.military.war_front_edges_osid![0]!.side_b = 'HRHB';
        expectAtomicFailure(state, input, solveOutput([]), /stale.*front-edge/i);
    });

    it('rejects a stale first row before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        const input = commitInput(state);
        expectAtomicFailure(state, input, solveOutput([{
            sequence: 0,
            stage: 'test:first-stale',
            kind: 'formation-location',
            formationId: 'brigade:a',
            before: 'op:stale',
            after: 'op:b',
        }]), /mutation 0.*stale/i);
    });

    it('rejects a stale later repeated write against the shadow replay before any live write', () => {
        const state = makeCommitState();
        const input = commitInput(state);
        expectAtomicFailure(state, input, solveOutput([{
            sequence: 0,
            stage: 'test:first-write',
            kind: 'formation-location',
            formationId: 'brigade:a',
            before: 'op:a',
            after: 'op:b',
        }, {
            sequence: 1,
            stage: 'test:repeated-write',
            kind: 'formation-location',
            formationId: 'brigade:a',
            before: 'op:not-the-shadow-value',
            after: 'op:c',
        }]), /mutation 1.*stale/i);
    });

    it('rejects a malformed sequence before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        expectAtomicFailure(state, commitInput(state), solveOutput([{
            sequence: 1,
            stage: 'test:bad-sequence',
            kind: 'formation-location',
            formationId: 'brigade:a',
            before: 'op:a',
            after: 'op:b',
        }]), /sequence.*expected 0/i);
    });

    it('rejects an unknown mutation kind before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        expectAtomicFailure(state, commitInput(state), solveOutput([{
            sequence: 0,
            stage: 'test:unknown-kind',
            kind: 'formation-unknown',
            formationId: 'brigade:a',
            before: 'op:a',
            after: 'op:b',
        } as never]), /unknown.*mutation kind/i);
    });

    it('rejects a missing target formation before any live write or diagnostic emission', () => {
        const state = makeCommitState();
        expectAtomicFailure(state, commitInput(state), solveOutput([{
            sequence: 0,
            stage: 'test:missing-formation',
            kind: 'formation-location',
            formationId: 'brigade:missing',
            before: 'op:a',
            after: 'op:b',
        }]), /formation.*brigade:missing.*missing/i);
    });

    it('applies valid rows in sequence and emits diagnostics at their exact mutation boundaries', () => {
        const state = makeCommitState();
        const emitted: Array<{
            kind: SectorTopologyDiagnostic['kind'];
            unresolved: readonly string[] | undefined;
        }> = [];
        const output = solveOutput([{
            sequence: 0,
            stage: 'test:move',
            kind: 'formation-location',
            formationId: 'brigade:a',
            before: 'op:a',
            after: 'op:b',
        }, {
            sequence: 1,
            stage: 'collect-unresolved-sector-brigades',
            kind: 'unresolved-sector-brigades',
            before: ['brigade:old'],
            after: ['brigade:a'],
        }], [{
            sequence: 0,
            stage: 'test:before-first-write',
            kind: 'debug',
            message: 'before',
            mutationBoundary: 0,
        }, {
            sequence: 1,
            stage: 'final-unresolved-warnings',
            kind: 'warning',
            message: 'warning-a',
            mutationBoundary: 2,
        }, {
            sequence: 2,
            stage: 'final-unresolved-warnings',
            kind: 'warning',
            message: 'warning-b',
            mutationBoundary: 2,
        }]);

        commitSectorTopologySolve(state, commitInput(state), output, (diagnostic) => {
            emitted.push({
                kind: diagnostic.kind,
                unresolved: state.military.unresolved_sector_brigades == null
                    ? undefined
                    : [...state.military.unresolved_sector_brigades],
            });
        });

        expect(state.military.formations['brigade:a']!.location_osid).toBe('op:b');
        expect(state.military.unresolved_sector_brigades).toEqual(['brigade:a']);
        expect(emitted).toEqual([
            { kind: 'debug', unresolved: ['brigade:old'] },
            { kind: 'warning', unresolved: ['brigade:a'] },
            { kind: 'warning', unresolved: ['brigade:a'] },
        ]);
    });

    it.skipIf(!hasRealSave)('fresh capture, pure solve, and serial commit rerun identically on cloned real saves', () => {
        const run = (): {
            journal: readonly SectorTopologyMutation[];
            state: GameState;
            bytes: string;
        } => {
            const state = loadRealSave();
            const input = captureSectorTopologySolveInput(
                state,
                loadOperationalEdges() as never,
                null,
                undefined,
                undefined,
                {
                    isFinalPass: true,
                    finalSaveGeometryProjection: false,
                    useFixedPointShortcuts: true,
                    occupancyStrategy: 'dense-index',
                    frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
                },
            );
            const output = solveCorpsFrontSectorsPure(input);
            commitSectorTopologySolve(state, input, output, () => undefined);
            return { journal: output.mutations, state, bytes: serializeState(state) };
        };

        const first = run();
        const rerun = run();
        expect(first.journal).toEqual(rerun.journal);
        expect(first.state).toEqual(rerun.state);
        expect(first.bytes).toBe(rerun.bytes);
    });

    it.skipIf(!hasRealSave)('records the exact live writer order and final diagnostics on the pristine real save', () => {
        const controlState = loadRealSave();
        const state = loadRealSave();
        const edges = loadOperationalEdges() as never;
        const recorder = createSectorTopologyMutationRecorder();
        const originalWarn = console.warn;
        const originalDebug = console.debug;
        const controlDiagnostics: Array<{ kind: 'debug' | 'warning'; message: string }> = [];
        const tracedConsoleDiagnostics: Array<{ kind: 'debug' | 'warning'; message: string }> = [];
        let controlSectors: ReturnType<typeof buildCorpsFrontSectors>;
        let tracedSectors: ReturnType<typeof buildCorpsFrontSectors>;
        try {
            console.warn = (...args: unknown[]) => {
                controlDiagnostics.push({ kind: 'warning', message: args.map(String).join(' ') });
            };
            console.debug = (...args: unknown[]) => {
                controlDiagnostics.push({ kind: 'debug', message: args.map(String).join(' ') });
            };
            controlSectors = buildCorpsFrontSectors(controlState, edges, null, undefined, undefined, true);
            console.warn = (...args: unknown[]) => {
                tracedConsoleDiagnostics.push({ kind: 'warning', message: args.map(String).join(' ') });
            };
            console.debug = (...args: unknown[]) => {
                tracedConsoleDiagnostics.push({ kind: 'debug', message: args.map(String).join(' ') });
            };
            tracedSectors = __buildCorpsFrontSectorsImperativeForTest(
                state,
                edges,
                null,
                recorder,
                undefined,
                undefined,
                true,
                false,
                true,
                'dense-index',
                'invocation-front-edge-relation',
            );
        } finally {
            console.warn = originalWarn;
            console.debug = originalDebug;
        }

        expect(tracedSectors!).toEqual(controlSectors!);
        expect(state).toEqual(controlState);
        expect(tracedConsoleDiagnostics).toEqual([]);

        expect(recorder.mutations.map((row) => row.sequence)).toEqual(
            recorder.mutations.map((_, index) => index),
        );

        const locationIndex = recorder.mutations.findIndex((row) => row.kind === 'formation-location');
        expect(locationIndex).toBeGreaterThanOrEqual(0);
        expect(recorder.mutations.slice(locationIndex, locationIndex + 2)).toEqual([
            {
                sequence: 0,
                stage: 'build-faction-sectors:minimum-sector-coverage',
                kind: 'formation-location',
                formationId: 'arbih_164th_mountain',
                before: 'op:visoko:rajcici_2',
                after: 'op:visoko:stuparici_2',
            },
            {
                sequence: 1,
                stage: 'build-faction-sectors:minimum-sector-coverage',
                kind: 'formation-entrenchment',
                formationId: 'arbih_164th_mountain',
                before: 0,
                after: 0,
            },
        ]);

        const assignmentClearIndex = recorder.mutations.findIndex((row) =>
            row.kind === 'formation-assignment' && row.after === null,
        );
        expect(assignmentClearIndex).toBeGreaterThanOrEqual(0);
        const assignmentClear = recorder.mutations[assignmentClearIndex];
        expect(assignmentClear?.kind).toBe('formation-assignment');
        expect(recorder.mutations[assignmentClearIndex + 1]).toMatchObject({
            kind: 'formation-assigned-sub-segment',
            formationId: assignmentClear?.kind === 'formation-assignment'
                ? assignmentClear.formationId
                : undefined,
        });
        const firstAssignmentSetIndex = recorder.mutations.findIndex((row) =>
            row.kind === 'formation-assignment' && row.after !== null,
        );
        expect(firstAssignmentSetIndex).toBeGreaterThan(assignmentClearIndex);

        expect(recorder.mutations.at(-1)).toMatchObject({
            kind: 'unresolved-sector-brigades',
            stage: 'collect-unresolved-sector-brigades',
        });
        expect(recorder.diagnostics.map((row) => ({
            kind: row.kind,
            message: row.message,
        }))).toEqual(controlDiagnostics);
        expect(recorder.diagnostics.every((row) =>
            row.mutationBoundary >= 0
            && row.mutationBoundary <= recorder.mutations.length,
        )).toBe(true);
    });

    it('records a reachability demotion as the exact value-preserving sub-segment write', () => {
        const recorder = createSectorTopologyMutationRecorder();
        const formation = {
            id: 'brigade:demoted',
            assigned_sub_segment_id: 'subseg:before',
        } as FormationState;

        recorder.recordFormationAssignedSubSegment(
            'build-faction-sectors:reachability-demotion',
            formation.id,
            formation,
            undefined,
        );

        expect(recorder.mutations).toEqual([{
            sequence: 0,
            stage: 'build-faction-sectors:reachability-demotion',
            kind: 'formation-assigned-sub-segment',
            formationId: 'brigade:demoted',
            before: 'subseg:before',
            after: undefined,
        }]);
        expect(formation.assigned_sub_segment_id).toBeUndefined();
        expect(fs.readFileSync('src/sim/combat/corps_front_sectors.ts', 'utf8')).toContain(
            "'build-faction-sectors:reachability-demotion'",
        );
    });

    it('records final unresolved warnings after unresolved truth in formation order', () => {
        const recorder = createSectorTopologyMutationRecorder();
        const military = { unresolved_sector_brigades: ['old'] } as GameState['military'];
        const formations = {
            'brigade:a': {
                id: 'brigade:a',
                personnel: 1200,
                corps_id: 'corps:a',
            } as FormationState,
            'brigade:b': {
                id: 'brigade:b',
                personnel: 900,
                corps_id: 'corps:b',
            } as FormationState,
        };
        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
        try {
            recorder.recordUnresolvedSectorBrigades(
                'collect-unresolved-sector-brigades',
                military,
                ['brigade:a', 'brigade:b'],
            );
            emitFinalUnresolvedSectorWarnings(
                ['brigade:a', 'brigade:b'],
                formations,
                recorder,
            );
        } finally {
            console.warn = originalWarn;
        }

        expect(warnings).toEqual([]);
        const expectedMessages = [
            '[brigade_assignment] UNRESOLVED brigade:a (1200 pers): fell through sector pipeline, corps=corps:a',
            '[brigade_assignment] UNRESOLVED brigade:b (900 pers): fell through sector pipeline, corps=corps:b',
        ];
        expect(recorder.diagnostics.map((row) => ({
            message: row.message,
            mutationBoundary: row.mutationBoundary,
        }))).toEqual(expectedMessages.map((message) => ({ message, mutationBoundary: 1 })));
    });
});
