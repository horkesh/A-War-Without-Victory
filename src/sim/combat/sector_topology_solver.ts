/**
 * R5 Phase 2e Task 3 — pure full solve over a detached `SectorTopologySolveInput`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7/9 Task 3 and this session's checkpoint notes on the "thin
 * wrapper" finding: `buildCorpsFrontSectors`/`buildFactionSectors`
 * (`corps_front_sectors.ts`) are already narrow-typed to accept exactly the
 * shape `buildDetachedNarrowReadState` produces, and `buildCorpsFrontSectors`
 * already accepts an optional mutation recorder, diagnostic collector, and
 * trace collector. Calling it against a genuinely detached read-state and
 * working-formation projection — built entirely from the immutable captured
 * `SectorTopologySolveInput`, never from live `GameState` — already IS the
 * pure full solve; no separate reimplementation of its ~1,200-line combined
 * body is needed.
 *
 * This module never imports `GameState` — see `tests/sector_topology_solver.test.ts`'s
 * static guard (plan step 6).
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { buildCorpsFrontSectors } from './corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from './sector_topology_mutation_journal.js';
import { createSectorTopologyDiagnosticCollector } from './sector_topology_diagnostic.js';
import { createSectorTopologyTraceCollector } from './sector_topology_trace.js';
import { buildDetachedNarrowReadState, buildDetachedWorkingFormations } from './sector_topology_detached_state.js';
import type { SectorTopologySolveInput, SectorTopologySolveOutput } from './sector_topology_solver_types.js';

function reshapeEdges(input: SectorTopologySolveInput): EdgeRecord[] {
    return input.edges.map((e) => ({
        a: e.a,
        b: e.b,
        one_way: e.one_way,
        allow_self_loop: e.allow_self_loop,
        type: e.type,
        min_dist: e.min_dist,
        shared_segments: e.shared_segments,
    }));
}

function reshapeReverseMap(input: SectorTopologySolveInput): Map<string, string[]> | null {
    if (!input.reverseMapEntries) return null;
    const result = new Map<string, string[]>();
    for (const [key, value] of input.reverseMapEntries) {
        result.set(key, [...value]);
    }
    return result;
}

/**
 * Run the exact current full sector-topology solve against a detached
 * working-formation projection, seeded entirely from `input`. Produces the
 * resulting sectors plus the ordered mutation journal, diagnostic log, and
 * deterministic stage trace — none of which touch live `GameState`.
 */
export function solveCorpsFrontSectorsPure(input: SectorTopologySolveInput): SectorTopologySolveOutput {
    const workingFormations = buildDetachedWorkingFormations(input);
    const detachedState = buildDetachedNarrowReadState(input, workingFormations);
    const edges = reshapeEdges(input);
    const reverseMap = reshapeReverseMap(input);

    const mutationRecorder = createSectorTopologyMutationRecorder('test-only-imperative-live-state');
    const { collector: diagnosticCollector, diagnostics } = createSectorTopologyDiagnosticCollector();
    const { collector: traceCollector, trace } = createSectorTopologyTraceCollector();

    const sectors = buildCorpsFrontSectors(
        detachedState,
        edges,
        reverseMap,
        input.centroids,
        input.spatial,
        input.options.isFinalPass,
        input.options.finalSaveGeometryProjection,
        input.options.useFixedPointShortcuts,
        input.options.occupancyStrategy,
        input.options.frontEdgeAdjacencyStrategy,
        input.options.frontEdgeRelationTestCounters,
        mutationRecorder,
        diagnosticCollector,
        traceCollector,
    );

    return {
        sectors,
        mutations: mutationRecorder.journal,
        diagnostics,
        trace,
    };
}
