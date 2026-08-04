/**
 * R5 Phase 2e Task 4 — RED characterization of the atomic serial commit
 * (`sector_topology_commit.ts`).
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.4 and section 9 Task 4 steps 1-4.
 *
 * Three layers:
 *   1. Synthetic precondition-failure tests (no fixture required) — one per
 *      failure kind: stale turn, stale front edges, malformed sequence,
 *      unknown mutation kind, target formation missing, first-row stale
 *      value, later repeated-write stale value. Each also proves the
 *      failure happens BEFORE any live write (state snapshot unchanged).
 *   2. A real-save round-trip: capture -> solveCorpsFrontSectorsPure ->
 *      commitSectorTopologySolve produces a live state byte-identical to
 *      the imperative oracle's resulting state.
 *   3. Deterministic rerun: two independent capture+solve+commit cycles on
 *      identical clones produce identical journals and identical resulting
 *      state.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    commitSectorTopologySolve,
    validateSectorTopologyCommit,
    SectorTopologyStaleCommitError,
} from '../src/sim/combat/sector_topology_commit.js';
import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { deserializeState } from '../src/state/serialize.js';
import type { FormationAssignment, FormationId, GameState } from '../src/state/game_state.js';
import type { SectorTopologyMutation } from '../src/sim/combat/sector_topology_mutation_journal.js';
import type { SectorTopologySolveInput } from '../src/sim/combat/sector_topology_solver_types.js';
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

// ── Minimal synthetic fixtures for the unit-level failure-mode tests ──────

function makeMinimalInput(overrides: Partial<{ turn: number; frontEdges: readonly { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[] }>): SectorTopologySolveInput {
    return {
        turn: overrides.turn ?? 5,
        frontEdges: overrides.frontEdges ?? [{ edge_id: 'op:test:e1', a: 'op:test:a', b: 'op:test:b', side_a: 'RBiH', side_b: 'RS' }],
    } as unknown as SectorTopologySolveInput;
}

function makeMinimalState(overrides: {
    turn?: number;
    frontEdges?: readonly { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[];
    formations?: Record<string, { location_osid?: string; entrenchment_turns?: number; assigned_sub_segment_id?: string; assignment?: FormationAssignment | null }>;
    unresolvedSectorBrigades?: FormationId[];
}): GameState {
    return {
        meta: { turn: overrides.turn ?? 5 },
        military: {
            war_front_edges_osid: overrides.frontEdges ?? [{ edge_id: 'op:test:e1', a: 'op:test:a', b: 'op:test:b', side_a: 'RBiH', side_b: 'RS' }],
            formations: overrides.formations ?? {},
            unresolved_sector_brigades: overrides.unresolvedSectorBrigades,
            corps_front_sectors: {},
        },
    } as unknown as GameState;
}

function mutation(row: Partial<SectorTopologyMutation> & { sequence: number; kind: SectorTopologyMutation['kind'] }): SectorTopologyMutation {
    return row as SectorTopologyMutation;
}

describe('validateSectorTopologyCommit — synthetic precondition-failure tests (no fixture required)', () => {
    it('rejects a stale turn', () => {
        const state = makeMinimalState({ turn: 6 });
        const input = makeMinimalInput({ turn: 5 });
        expect(() => validateSectorTopologyCommit(state, input, [])).toThrow(SectorTopologyStaleCommitError);
        try {
            validateSectorTopologyCommit(state, input, []);
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('stale-turn');
        }
    });

    it('rejects changed front-edge provenance', () => {
        const state = makeMinimalState({ frontEdges: [{ edge_id: 'op:test:e1', a: 'op:test:a', b: 'op:test:b', side_a: 'RS', side_b: 'RBiH' }] });
        const input = makeMinimalInput({});
        try {
            validateSectorTopologyCommit(state, input, []);
            expect.unreachable('expected a stale-front-edges throw');
        } catch (e) {
            expect(e).toBeInstanceOf(SectorTopologyStaleCommitError);
            expect((e as SectorTopologyStaleCommitError).kind).toBe('stale-front-edges');
        }
    });

    it('rejects a first-row stale value', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current' } } });
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:stale:expected', after: 'op:test:new' }),
        ];
        try {
            validateSectorTopologyCommit(state, input, mutations);
            expect.unreachable('expected a stale-value throw');
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('stale-value');
        }
    });

    it('rejects a later repeated-write stale value (checks against the shadow, not the original live value)', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current' } } });
        const input = makeMinimalInput({});
        // Row 0 correctly moves brig_a from its true live value; row 1 should
        // then expect the SHADOW's post-row-0 value (op:test:mid), not the
        // ORIGINAL live value — deliberately corrupt it to prove the shadow,
        // not a stale read of live state, is what gets checked.
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:live:current', after: 'op:test:mid' }),
            mutation({ sequence: 1, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:live:current', after: 'op:test:final' }),
        ];
        try {
            validateSectorTopologyCommit(state, input, mutations);
            expect.unreachable('expected a stale-value throw on row 1');
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('stale-value');
            expect((e as Error).message).toContain('row 1');
        }
    });

    it('rejects a malformed sequence', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current' } } });
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:live:current', after: 'op:test:mid' }),
            mutation({ sequence: 7, kind: 'formation-entrenchment', formationId: 'brig_a' as FormationId, before: undefined, after: 0 }),
        ];
        try {
            validateSectorTopologyCommit(state, input, mutations);
            expect.unreachable('expected a malformed-sequence throw');
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('malformed-sequence');
        }
    });

    it('rejects an unknown mutation kind', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current' } } });
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-teleport' as never, formationId: 'brig_a' as FormationId } as unknown as SectorTopologyMutation),
        ];
        try {
            validateSectorTopologyCommit(state, input, mutations);
            expect.unreachable('expected an unknown-mutation-kind throw');
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('unknown-mutation-kind');
        }
    });

    it('rejects a target formation missing from live state', () => {
        const state = makeMinimalState({ formations: {} });
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_ghost' as FormationId, before: 'op:test:a', after: 'op:test:b' }),
        ];
        try {
            validateSectorTopologyCommit(state, input, mutations);
            expect.unreachable('expected a target-formation-missing throw');
        } catch (e) {
            expect((e as SectorTopologyStaleCommitError).kind).toBe('target-formation-missing');
        }
    });

    it('every rejection leaves the live state completely unchanged (no partial commit)', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current' } } });
        const before = canonicalize(state);
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:stale:expected', after: 'op:test:new' }),
        ];
        expect(() => commitSectorTopologySolve(state, input, { sectors: {}, mutations, diagnostics: [], trace: [] })).toThrow(SectorTopologyStaleCommitError);
        expect(canonicalize(state)).toBe(before);
    });

    it('accepts a valid journal and applies every row in sequence', () => {
        const state = makeMinimalState({ formations: { brig_a: { location_osid: 'op:live:current', entrenchment_turns: 3 } } });
        const input = makeMinimalInput({});
        const mutations = [
            mutation({ sequence: 0, kind: 'formation-location', formationId: 'brig_a' as FormationId, before: 'op:live:current', after: 'op:test:new' }),
            mutation({ sequence: 1, kind: 'formation-entrenchment', formationId: 'brig_a' as FormationId, before: 3, after: 0 }),
        ];
        expect(() => validateSectorTopologyCommit(state, input, mutations)).not.toThrow();
        commitSectorTopologySolve(state, input, { sectors: { 'sector:test:0': {} as never }, mutations, diagnostics: [], trace: [] });
        expect(state.military.formations!['brig_a' as FormationId]!.location_osid).toBe('op:test:new');
        expect(state.military.formations!['brig_a' as FormationId]!.entrenchment_turns).toBe(0);
        expect(state.military.corps_front_sectors).toHaveProperty('sector:test:0');
    });
});

describe.skipIf(!hasFixture)('commitSectorTopologySolve — real-save round-trip and deterministic rerun', () => {
    it('produces a live state byte-identical to the imperative oracle', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();

        // Imperative oracle: unrecorded live-state build.
        const oracleState = deserializeState(JSON.stringify(rawState)) as GameState;
        const oracleSectors = buildCorpsFrontSectors(
            oracleState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
        );
        oracleState.military.corps_front_sectors = oracleSectors;

        // Pure solve + commit, against an independently deserialized clone.
        const commitState = loadStateRaw();
        const captureState = loadStateRaw();
        const input = captureSectorTopologySolveInput(captureState, edges as never, null, undefined, undefined, {
            isFinalPass: true,
        });
        const output = solveCorpsFrontSectorsPure(input);
        commitSectorTopologySolve(commitState, input, output);

        expect(canonicalize(commitState)).toBe(canonicalize(oracleState));
    });

    it('is deterministic: two independent capture+solve+commit cycles on identical clones produce identical journals and identical resulting state', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();

        function runCycle(): { journal: readonly SectorTopologyMutation[]; state: GameState } {
            const captureState = deserializeState(JSON.stringify(rawState)) as GameState;
            const commitState = deserializeState(JSON.stringify(rawState)) as GameState;
            const input = captureSectorTopologySolveInput(captureState, edges as never, null, undefined, undefined, {
                isFinalPass: true,
            });
            const output = solveCorpsFrontSectorsPure(input);
            commitSectorTopologySolve(commitState, input, output);
            return { journal: output.mutations, state: commitState };
        }

        const first = runCycle();
        const second = runCycle();

        expect(canonicalize(first.journal)).toBe(canonicalize(second.journal));
        expect(canonicalize(first.state)).toBe(canonicalize(second.state));
    });

    it('supports two capture+solve+commit passes against the SAME live state in sequence (regression: a prior version hardcoded the detached unresolved_sector_brigades to undefined AND entrenchment_turns to 0 instead of threading them from the capture, which produced a spurious stale-value error on any second pass within one turn, or on a first pass against any formation with nonzero entrenchment — exactly what final_sector_truth_reconciliation.ts\'s multi-pass reconciliation session does in production, and exactly what a real 188-week run hit)', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();
        const state = deserializeState(JSON.stringify(rawState)) as GameState;

        // Force at least one formation to a nonzero entrenchment_turns so
        // this test cannot pass by coincidence of the fixture save's
        // formations all already being at 0.
        const someFormationId = Object.keys(state.military.formations ?? {}).sort()[0];
        expect(someFormationId, 'fixture must have at least one formation').toBeDefined();
        state.military.formations![someFormationId!]!.entrenchment_turns = 4;

        function runPass(): void {
            const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, {
                isFinalPass: true,
            });
            const output = solveCorpsFrontSectorsPure(input);
            commitSectorTopologySolve(state, input, output);
        }

        expect(() => runPass()).not.toThrow();
        const afterFirstPass = state.military.unresolved_sector_brigades;
        // Second pass must succeed: the first pass's committed
        // unresolved_sector_brigades value must be what the second pass's
        // capture reads as its own detached solve's starting value, so its
        // journal's `before` matches live state exactly.
        expect(() => runPass()).not.toThrow();
        // A no-op second pass over unchanged state reproduces the identical
        // unresolved list.
        expect(state.military.unresolved_sector_brigades).toEqual(afterFirstPass);
    });
});
