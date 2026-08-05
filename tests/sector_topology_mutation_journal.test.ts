/**
 * R5 Phase 2e Task 1 — RED characterization of the corps-sector builder's
 * live-state write order (`sector_topology_mutation_journal.ts`).
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.2 and section 9 Task 1.
 *
 * Two layers:
 *   1. Direct recorder API contract — no fixture required. Proves each
 *      `record*` method performs its live write immediately (identical to the
 *      unmodified direct-write statement it replaces) and appends an ordered
 *      journal row. Also proves an unknown execution strategy is rejected
 *      before any state access.
 *   2. End-to-end characterization against a real save — proves the recorder
 *      is fully behavior-neutral (byte-identical sectors + state whether or
 *      not a recorder is supplied) and pins the exact write order documented
 *      in the plan's section 7.2 writer-mapping table:
 *        - `ensureMinimumSectorCoverage`'s `moveBrigadeToFrontTarget`: a
 *          `formation-location` row is always immediately followed by the
 *          `formation-entrenchment` row for the SAME formation.
 *        - `syncSectorAssignmentsToFormations`'s Step 1 clear loop: a
 *          conditional `formation-assignment` clear (null) is immediately
 *          followed by the unconditional `formation-assigned-sub-segment`
 *          clear (undefined) for the SAME formation; never batched into two
 *          separate traversals.
 *        - Exactly one `unresolved-sector-brigades` replacement, and it is
 *          the last row in the journal (buildCorpsFrontSectors's main body
 *          writes it after every other writer has run).
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from '../src/sim/combat/sector_topology_mutation_journal.js';
import { deserializeState } from '../src/state/serialize.js';
import type { FormationAssignment, FormationId, FormationState, GameState } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasFixture = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

type ContactGraphEdge = { edge_id: string; a: string; b: string; shared_segments?: number; min_dist?: number };

function loadStateRaw(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function canonicalizeObservable(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => canonicalizeObservable(entry));
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.keys(record)
            .sort(strictCompare)
            .map((key) => [key, canonicalizeObservable(record[key])]);
    }
    return value;
}

function canonicalize(value: unknown): string {
    return JSON.stringify(canonicalizeObservable(value));
}

describe('createSectorTopologyMutationRecorder — direct API contract (no fixture required)', () => {
    it('rejects an unknown execution strategy before any journal or state access', () => {
        expect(() => createSectorTopologyMutationRecorder('bogus-strategy' as never)).toThrow(
            /Unknown sector topology mutation execution strategy/,
        );
    });

    it('performs each write immediately (byte-identical to the direct statement it replaces) and appends a sequenced, ordered journal row', () => {
        const recorder = createSectorTopologyMutationRecorder('test-only-imperative-live-state');
        const formation = {
            location_osid: 'op:test:a',
            entrenchment_turns: 3,
            assigned_sub_segment_id: 'subseg:sector:test:0:0',
            assignment: null,
        } as unknown as FormationState;
        const bid = 'brig_test' as FormationId;

        recorder.recordFormationLocation(formation, bid, 'op:test:b', 'stage-a');
        expect(formation.location_osid).toBe('op:test:b');

        recorder.recordFormationEntrenchment(formation, bid, 'stage-a');
        expect(formation.entrenchment_turns).toBe(0);

        recorder.recordFormationAssignedSubSegment(formation, bid, undefined, 'stage-a');
        expect(formation.assigned_sub_segment_id).toBeUndefined();

        const nextAssignment: FormationAssignment = { kind: 'sector', sector_id: 'sector:test:0', role: 'front' };
        recorder.recordFormationAssignment(formation, bid, nextAssignment, 'stage-a');
        expect(formation.assignment).toEqual(nextAssignment);

        let applied = false;
        let appliedAfterRowRecorded = false;
        recorder.recordUnresolvedSectorBrigades(undefined, [bid], () => {
            applied = true;
            // The apply callback must run synchronously inside the record
            // call (row appended first, then the live write applied) —
            // exactly like the direct `state.military.unresolved_sector_brigades = x`
            // statement it replaces, not deferred to a later tick.
            appliedAfterRowRecorded = recorder.journal.length === 5;
        }, 'stage-b');
        expect(applied).toBe(true);
        expect(appliedAfterRowRecorded).toBe(true);

        expect(recorder.journal.map((row) => row.sequence)).toEqual([0, 1, 2, 3, 4]);
        expect(recorder.journal.map((row) => row.kind)).toEqual([
            'formation-location',
            'formation-entrenchment',
            'formation-assigned-sub-segment',
            'formation-assignment',
            'unresolved-sector-brigades',
        ]);
        expect(recorder.journal[0]).toMatchObject({ before: 'op:test:a', after: 'op:test:b', formationId: bid, stage: 'stage-a' });
        expect(recorder.journal[1]).toMatchObject({ before: 3, after: 0, formationId: bid, stage: 'stage-a' });
        expect(recorder.journal[2]).toMatchObject({ before: 'subseg:sector:test:0:0', after: undefined, formationId: bid, stage: 'stage-a' });
        expect(recorder.journal[3]).toMatchObject({ before: null, after: nextAssignment, formationId: bid, stage: 'stage-a' });
        expect(recorder.journal[4]).toMatchObject({ before: undefined, after: [bid], stage: 'stage-b' });
    });
});

describe.skipIf(!hasFixture)('sector topology mutation journal — end-to-end characterization against a real save', () => {
    it('is behavior-neutral against the un-recorded legacy path and pins the exact live-write order', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();

        const legacyState = deserializeState(JSON.stringify(rawState)) as GameState;
        const legacySectors = buildCorpsFrontSectors(
            legacyState,
            edges as never,
            null,
            undefined,
            undefined,
            true,
            false,
            true,
            'dense-index',
            'invocation-front-edge-relation',
            undefined,
            undefined,
        );

        const recordedState = deserializeState(JSON.stringify(rawState)) as GameState;
        const recorder = createSectorTopologyMutationRecorder('test-only-imperative-live-state');
        const recordedSectors = buildCorpsFrontSectors(
            recordedState,
            edges as never,
            null,
            undefined,
            undefined,
            true,
            false,
            true,
            'dense-index',
            'invocation-front-edge-relation',
            undefined,
            recorder,
        );

        // Behavior neutrality: presence of a recorder must not change any
        // observable output. This is the module's own contract ("No behavior
        // changes when no recorder is supplied").
        expect(canonicalize({ sectors: recordedSectors, state: recordedState }))
            .toBe(canonicalize({ sectors: legacySectors, state: legacyState }));

        // Sequence numbers form a strict 0-based run with no gaps or repeats.
        recorder.journal.forEach((row, idx) => expect(row.sequence).toBe(idx));

        // ensureMinimumSectorCoverage's moveBrigadeToFrontTarget: location is
        // always immediately followed by entrenchment for the SAME formation
        // (activeCounts.move(...) already applied to the detached index before
        // either write; no other write can land between the pair).
        let locationEntrenchmentPairs = 0;
        for (let i = 0; i < recorder.journal.length; i++) {
            const row = recorder.journal[i]!;
            if (row.kind !== 'formation-location') continue;
            const next = recorder.journal[i + 1];
            if (!next || next.kind !== 'formation-entrenchment') {
                throw new Error(`expected a formation-entrenchment row immediately after formation-location row ${i}`);
            }
            expect(next.formationId).toBe(row.formationId);
            locationEntrenchmentPairs++;
        }

        // syncSectorAssignmentsToFormations's Step 1 clear loop: a conditional
        // assignment-clear (only when the current assignment.kind === 'sector')
        // is immediately followed by the unconditional sub-segment clear for
        // the SAME formation. Never batched into two separate traversals —
        // holds across every syncSectorAssignmentsToFormations invocation in
        // this build (the direct main-body call plus every
        // applyFinalSectorOwnerTruthPass call), because only one invocation
        // ever runs at a time and each completes its own loop before returning.
        const clearStageRows = recorder.journal.filter((row) => row.stage === 'syncSectorAssignmentsToFormations:clear');
        let idx = 0;
        let subSegmentOnlyClears = 0;
        let assignmentPlusSubSegmentClears = 0;
        while (idx < clearStageRows.length) {
            const row = clearStageRows[idx]!;
            if (row.kind === 'formation-assignment') {
                const next = clearStageRows[idx + 1];
                if (!next || next.kind !== 'formation-assigned-sub-segment') {
                    throw new Error(`expected a formation-assigned-sub-segment clear immediately after formation-assignment clear ${idx}`);
                }
                expect(next.formationId).toBe(row.formationId);
                expect(row.after).toBeNull();
                expect(next.after).toBeUndefined();
                assignmentPlusSubSegmentClears++;
                idx += 2;
            } else {
                expect(row.kind).toBe('formation-assigned-sub-segment');
                expect(row.after).toBeUndefined();
                subSegmentOnlyClears++;
                idx += 1;
            }
        }
        // A real final-pass build over an active save must exercise the sync
        // writer at least once (it always runs, unconditionally, at least via
        // the main-body call at the end of buildCorpsFrontSectors).
        expect(subSegmentOnlyClears + assignmentPlusSubSegmentClears).toBeGreaterThan(0);

        // Exactly one unresolved-sector-brigades replacement, and it is the
        // LAST row in the journal — collectUnresolvedSectorBrigades runs
        // after every other writer in buildCorpsFrontSectors's main body.
        const unresolvedRows = recorder.journal.filter((row) => row.kind === 'unresolved-sector-brigades');
        expect(unresolvedRows).toHaveLength(1);
        expect(recorder.journal[recorder.journal.length - 1]!.kind).toBe('unresolved-sector-brigades');
        expect(unresolvedRows[0]!.after).toEqual(recordedState.military.unresolved_sector_brigades);

        // Sanity: the journal is non-trivial on a real, active-war save.
        expect(recorder.journal.length).toBeGreaterThan(0);
        expect(locationEntrenchmentPairs).toBeGreaterThanOrEqual(0);
    });
});
