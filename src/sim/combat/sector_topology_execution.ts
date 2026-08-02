import type {
    SectorTopologyDeterministicTrace,
    SectorTopologyMutation,
} from './sector_topology_solver_types.js';

export type SectorTopologyStageRun = <T>(stage: string, fn: () => T) => T;

export interface SectorTopologyStageRunner {
    readonly run: SectorTopologyStageRun;
    recordBranch(stage: string, branchTaken: boolean): void;
    snapshot(): SectorTopologyDeterministicTrace;
    attributeFactionCost?(faction: string, corpsIds: readonly string[]): void;
}

/**
 * Invocation-local deterministic execution trace. It observes the mutation count at
 * actual stage entry/exit and records branches even when they produce no mutation.
 */
export function createDeterministicSectorTopologyStageRunner(
    mutations: readonly SectorTopologyMutation[],
): SectorTopologyStageRunner {
    const stages: Array<{
        sequence: number;
        kind: 'stage' | 'branch';
        stage: string;
        mutationCount: number;
        branchTaken?: boolean;
    }> = [];

    return {
        run<T>(stage: string, fn: () => T): T {
            const before = mutations.length;
            const row = {
                sequence: stages.length,
                kind: 'stage' as const,
                stage,
                mutationCount: 0,
            };
            stages.push(row);
            try {
                return fn();
            } finally {
                row.mutationCount = mutations.length - before;
            }
        },
        recordBranch(stage, branchTaken): void {
            stages.push({
                sequence: stages.length,
                kind: 'branch',
                stage,
                mutationCount: 0,
                branchTaken,
            });
        },
        snapshot(): SectorTopologyDeterministicTrace {
            return {
                stages: stages.map((row) => ({ ...row })),
            };
        },
    };
}
