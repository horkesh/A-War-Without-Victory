/**
 * R5 Phase 2e Task 3 — deterministic stage trace (`sector_topology_trace.ts`).
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.1/7.3 and the 2026-08-03 session 3 checkpoint on the trace design
 * (module-level `_activeTraceCollector` fed by `corps_front_sectors.ts`'s
 * existing `_perfTime` wrapper, mirroring `_activeInvocation`'s precedent).
 *
 * Three properties proven against a real save:
 *   1. Behavior neutrality — supplying a trace collector changes no
 *      observable output (byte-identical sectors + state either way).
 *   2. The trace is actually populated, in order, with the same stage
 *      vocabulary the mutation journal already uses (a positive guard
 *      against a vacuous pass).
 *   3. No cross-invocation leakage — a fresh collector on a second call
 *      starts empty; it never inherits entries from a prior call.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { createSectorTopologyTraceCollector } from '../src/sim/combat/sector_topology_trace.js';
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

describe.skipIf(!hasFixture)('sector topology deterministic trace — end-to-end characterization against a real save', () => {
    it('is behavior-neutral, populates an ordered trace, and does not leak across invocations', () => {
        const rawState = loadStateRaw();
        const edges = loadEdges();

        const legacyState = deserializeState(JSON.stringify(rawState)) as GameState;
        const legacySectors = buildCorpsFrontSectors(
            legacyState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
            undefined, undefined, undefined, undefined,
        );

        const tracedState = deserializeState(JSON.stringify(rawState)) as GameState;
        const { collector, trace } = createSectorTopologyTraceCollector();
        const tracedSectors = buildCorpsFrontSectors(
            tracedState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
            undefined, undefined, undefined, collector,
        );

        // Behavior neutrality — the same contract as the mutation recorder and
        // diagnostic collector: presence of a trace collector must not change
        // any observable output.
        expect(canonicalize({ sectors: tracedSectors, state: tracedState }))
            .toBe(canonicalize({ sectors: legacySectors, state: legacyState }));

        // Positive guard: a real final-pass build over an active save must
        // actually exercise many stages, in a stable, non-degenerate order.
        expect(trace.length).toBeGreaterThan(20);
        expect(trace).toContain('collectUnresolvedSectorBrigades');
        expect(trace.some((stage) => stage.startsWith('buildFactionSectors:'))).toBe(true);
        expect(trace.some((stage) => stage.startsWith('sealMergedSectorTruth:'))).toBe(true);
        expect(trace.some((stage) => stage.startsWith('applyFinalSectorOwnerTruthPass:'))).toBe(true);
        // adjacency-build-caseB runs first, before the per-faction loop that
        // calls buildFactionSectors.
        expect(trace[0]).toBe('adjacency-build-caseB');

        // No cross-invocation leakage: a second call with a fresh collector
        // starts empty and is unaffected by the first call's trace.
        const secondState = deserializeState(JSON.stringify(rawState)) as GameState;
        const { collector: secondCollector, trace: secondTrace } = createSectorTopologyTraceCollector();
        buildCorpsFrontSectors(
            secondState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
            undefined, undefined, undefined, secondCollector,
        );
        expect(secondTrace.length).toBe(trace.length);
        expect(secondTrace).toEqual(trace);

        // A call with NO trace collector after a traced call must not
        // resurrect or append to the earlier trace (module-level state is
        // reset, not merely appended-to).
        const untracedState = deserializeState(JSON.stringify(rawState)) as GameState;
        const untracedSectors = buildCorpsFrontSectors(
            untracedState, edges as never, null, undefined, undefined,
            true, false, true, 'dense-index', 'invocation-front-edge-relation',
            undefined, undefined, undefined, undefined,
        );
        expect(canonicalize({ sectors: untracedSectors, state: untracedState }))
            .toBe(canonicalize({ sectors: legacySectors, state: legacyState }));
    });
});
