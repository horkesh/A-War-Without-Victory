/**
 * R5 Phase 2e Task 3 — RED/GREEN equivalence characterization of
 * `solveCorpsFrontSectorsPure`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 9 Task 3 steps 1-3 and this session's "thin wrapper" checkpoint.
 *
 * Two layers:
 *   1. Equivalence against the imperative oracle — proves the pure solve's
 *      `sectors` output is byte-identical to an unrecorded, live-state
 *      `buildCorpsFrontSectors` call over the SAME real save, and that its
 *      `mutations` journal matches a `test-only-imperative-live-state`
 *      recorder's journal exactly (both are already independently proven
 *      behavior-neutral against the un-recorded legacy path — see
 *      `sector_topology_mutation_journal.test.ts` — so this test's job is
 *      only to prove the PURE solve reaches the same journal, not to
 *      re-litigate recorder neutrality).
 *   2. A static guard: `sector_topology_solver.ts` never imports `GameState`
 *      (plan section 9 Task 3 step 6).
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from '../src/sim/combat/sector_topology_mutation_journal.js';
import { deserializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';
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

describe.skipIf(!hasFixture)('solveCorpsFrontSectorsPure — equivalence against the imperative oracle', () => {
    it('produces byte-identical sectors and an equivalent mutation journal against a real save', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();

        // Imperative oracle: unrecorded live-state build (already independently
        // proven behavior-neutral against a recorded build).
        const oracleState = deserializeState(JSON.stringify(rawState)) as GameState;
        const oracleSectors = buildCorpsFrontSectors(
            oracleState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
        );

        // Recorded oracle: same imperative path, but with the recorder, to get
        // a directly comparable mutation journal.
        const recordedOracleState = deserializeState(JSON.stringify(rawState)) as GameState;
        const oracleRecorder = createSectorTopologyMutationRecorder('test-only-imperative-live-state');
        buildCorpsFrontSectors(
            recordedOracleState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
            undefined, oracleRecorder,
        );

        // Pure solve: capture a detached snapshot from a THIRD independent
        // deserialize, then solve purely against it.
        const captureState = loadStateRaw();
        const input = captureSectorTopologySolveInput(captureState, edges as never, null, undefined, undefined, {
            isFinalPass: true,
        });
        const output = solveCorpsFrontSectorsPure(input);

        // Sectors match the imperative oracle exactly.
        expect(canonicalize(output.sectors)).toBe(canonicalize(oracleSectors));

        // The mutation journal matches the recorded oracle's journal exactly
        // (same length, same kind/stage/before/after sequence).
        expect(output.mutations.length).toBe(oracleRecorder.journal.length);
        expect(canonicalize(output.mutations)).toBe(canonicalize(oracleRecorder.journal));

        // Positive guards: this must be a non-trivial real-save solve, not a
        // vacuous pass.
        expect(Object.keys(output.sectors).length).toBeGreaterThan(0);
        expect(output.trace.length).toBeGreaterThan(20);
    });

    it('never mutates its input — the same SectorTopologySolveInput solved twice yields identical output', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(rawState, edges as never, null, undefined, undefined, {
            isFinalPass: true,
        });

        const first = solveCorpsFrontSectorsPure(input);
        const second = solveCorpsFrontSectorsPure(input);

        expect(canonicalize(first.sectors)).toBe(canonicalize(second.sectors));
        expect(canonicalize(first.mutations)).toBe(canonicalize(second.mutations));
        expect(first.trace).toEqual(second.trace);
    });
});

describe('sector_topology_solver.ts — static guard (no fixture required)', () => {
    it('never imports GameState', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/sector_topology_solver.ts'), 'utf8');
        // `GameState` is the sole export of game_state.js that names live
        // state; checking the file never imports FROM that module is a
        // precise, non-greedy guard (a regex spanning "import ... GameState"
        // across the whole file would false-positive on this file's own
        // docstring, which discusses GameState in prose).
        expect(raw).not.toContain("from '../../state/game_state.js'");
        expect(raw).not.toContain('from "../../state/game_state.js"');
    });
});
