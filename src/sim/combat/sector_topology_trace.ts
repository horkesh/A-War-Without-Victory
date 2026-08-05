/**
 * R5 Phase 2e Task 3 — deterministic stage trace for the pure sector-topology
 * solve. See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.1/7.3.
 *
 * Design: `corps_front_sectors.ts`'s existing `_perfTime(label, fn)` wrapper
 * already brackets every stage of the solve (100+ call sites) with a stable,
 * deterministic label — the exact same `stage` vocabulary the mutation
 * journal and diagnostic collector use. Rather than thread a new parameter
 * through 100+ call sites, `_perfTime` records into a module-level "active
 * trace collector" set once at `buildCorpsFrontSectors`'s own entry and
 * cleared at exit — mirroring the file's own existing `_activeInvocation`
 * module-level perf-record precedent exactly (see that variable's docstring:
 * "the outer call... creates one of these and threads it through the body
 * via this module-local field"). Unlike perf timing, trace recording is NOT
 * gated by `SECTOR_PARTITION_PERF_FLAG` — the trace is deterministic output,
 * not an optional profiling feature.
 */

export type SectorTopologyDeterministicTrace = readonly string[];

export interface SectorTopologyTraceCollector {
    record(stage: string): void;
}

export function createSectorTopologyTraceCollector(): {
    readonly collector: SectorTopologyTraceCollector;
    readonly trace: SectorTopologyDeterministicTrace;
} {
    const trace: string[] = [];
    return {
        trace,
        collector: {
            record(stage) {
                trace.push(stage);
            },
        },
    };
}
