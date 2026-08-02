import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    buildCorpsFrontSectors,
    emitFinalUnresolvedSectorWarnings,
} from '../src/sim/combat/corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from '../src/sim/combat/sector_topology_mutation_journal.js';
import { deserializeState } from '../src/state/serialize.js';
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

describe('sector topology imperative mutation journal', () => {
    it('rejects an unknown execution strategy before inspecting state', () => {
        expect(() => buildCorpsFrontSectors(
            {} as GameState,
            [],
            null,
            undefined,
            undefined,
            false,
            false,
            true,
            'dense-index',
            'invocation-front-edge-relation',
            undefined,
            'unknown-execution-strategy' as never,
        )).toThrow(/unknown sector topology execution strategy/i);
    });

    it.skipIf(!hasRealSave)('records the exact live writer order and final diagnostics on the pristine real save', () => {
        const controlState = loadRealSave();
        const state = loadRealSave();
        const edges = loadOperationalEdges() as never;
        const recorder = createSectorTopologyMutationRecorder();
        const originalWarn = console.warn;
        const controlWarnings: string[] = [];
        const warnings: string[] = [];
        let controlSectors: ReturnType<typeof buildCorpsFrontSectors>;
        let tracedSectors: ReturnType<typeof buildCorpsFrontSectors>;
        try {
            console.warn = (...args: unknown[]) => {
                controlWarnings.push(args.map(String).join(' '));
            };
            controlSectors = buildCorpsFrontSectors(controlState, edges, null, undefined, undefined, true);
            console.warn = (...args: unknown[]) => {
                warnings.push(args.map(String).join(' '));
            };
            tracedSectors = buildCorpsFrontSectors(
                state,
                edges,
                null,
                undefined,
                undefined,
                true,
                false,
                true,
                'dense-index',
                'invocation-front-edge-relation',
                undefined,
                'test-only-imperative-live-state',
                recorder,
            );
        } finally {
            console.warn = originalWarn;
        }

        expect(tracedSectors!).toEqual(controlSectors!);
        expect(state).toEqual(controlState);
        expect(warnings).toEqual(controlWarnings);

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
        expect(recorder.diagnostics.map((row) => row.message)).toEqual(warnings);
        expect(recorder.diagnostics.every((row) =>
            row.mutationBoundary === recorder.mutations.length,
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

        expect(warnings).toEqual([
            '[brigade_assignment] UNRESOLVED brigade:a (1200 pers): fell through sector pipeline, corps=corps:a',
            '[brigade_assignment] UNRESOLVED brigade:b (900 pers): fell through sector pipeline, corps=corps:b',
        ]);
        expect(recorder.diagnostics.map((row) => ({
            message: row.message,
            mutationBoundary: row.mutationBoundary,
        }))).toEqual(warnings.map((message) => ({ message, mutationBoundary: 1 })));
    });
});
