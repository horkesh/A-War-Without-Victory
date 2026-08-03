/**
 * R5 Phase 2e Task 3 — diagnostic collection for the pure sector-topology
 * solve, mirroring `sector_topology_mutation_journal.ts`'s recorder pattern.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.1/7.3. `emitRoutineConsoleDebug`/`emitRoutineConsoleWarn`
 * (`src/utils/routine_console_diagnostics.ts`) are the sole reachable
 * diagnostic-emission points in the `buildCorpsFrontSectors`/
 * `buildFactionSectors` call graph (9 call sites, verified by grep, not
 * assumed: `emitFinalUnresolvedSectorWarnings` in `corps_front_sectors.ts`,
 * `classifyBrigadesByTerritory` and `rehomeUnassignedBrigadesToPhysicalSectorOwners`
 * in `brigade_assignment.ts`). Every call site keeps calling the console
 * wrapper exactly as before — this collector only ADDITIONALLY records the
 * same message when supplied, exactly as Task 1's mutation recorder keeps
 * writing formation fields directly and additionally journals. No behavior
 * changes when no collector is supplied.
 */

export type SectorTopologyDiagnosticLevel = 'debug' | 'warn';

export interface SectorTopologyDiagnostic {
    readonly sequence: number;
    readonly stage: string;
    readonly level: SectorTopologyDiagnosticLevel;
    readonly message: string;
}

export interface SectorTopologyDiagnosticCollector {
    record(level: SectorTopologyDiagnosticLevel, stage: string, message: string): void;
}

export function createSectorTopologyDiagnosticCollector(): {
    readonly collector: SectorTopologyDiagnosticCollector;
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
} {
    const diagnostics: SectorTopologyDiagnostic[] = [];
    let nextSequence = 0;
    return {
        diagnostics,
        collector: {
            record(level, stage, message) {
                diagnostics.push({ sequence: nextSequence++, stage, level, message });
            },
        },
    };
}
