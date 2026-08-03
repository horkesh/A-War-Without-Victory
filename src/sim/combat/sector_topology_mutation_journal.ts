/**
 * R5 Phase 2e Task 1: RED characterization of the corps-sector builder's live-state
 * write order. This module records, but does not yet defer, the builder's direct
 * writes to `GameState`. It exists to prove the exact current write order before any
 * extraction moves the algorithm off live state (Phase 2e Tasks 2-4).
 *
 * `test-only-imperative-live-state` is the only strategy this module supports today:
 * it performs each write immediately against the live formation/state objects, exactly
 * as the unmodified builder always has, and additionally appends an ordered row to the
 * recorder's journal. No behavior changes when no recorder is supplied — every writer
 * call site keeps mutating state directly and simply reports what it did when a
 * recorder is present.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md section 7.2.
 */

import type { FormationAssignment, FormationId, FormationState } from '../../state/game_state.js';

export type SectorTopologyMutationExecutionStrategy = 'test-only-imperative-live-state';

export type SectorTopologyMutation =
    | { sequence: number; stage: string; kind: 'formation-location'; formationId: FormationId; before: string | undefined; after: string }
    | { sequence: number; stage: string; kind: 'formation-entrenchment'; formationId: FormationId; before: number | undefined; after: 0 }
    | { sequence: number; stage: string; kind: 'formation-assigned-sub-segment'; formationId: FormationId; before: string | undefined; after: string | undefined }
    | { sequence: number; stage: string; kind: 'formation-assignment'; formationId: FormationId; before: FormationAssignment | null; after: FormationAssignment | null }
    | { sequence: number; stage: string; kind: 'unresolved-sector-brigades'; before: readonly FormationId[] | undefined; after: readonly FormationId[] };

export interface SectorTopologyMutationRecorder {
    readonly strategy: SectorTopologyMutationExecutionStrategy;
    readonly journal: readonly SectorTopologyMutation[];
    recordFormationLocation(formation: FormationState, formationId: FormationId, after: string, stage: string): void;
    recordFormationEntrenchment(formation: FormationState, formationId: FormationId, stage: string): void;
    recordFormationAssignedSubSegment(formation: FormationState, formationId: FormationId, after: string | undefined, stage: string): void;
    recordFormationAssignment(formation: FormationState, formationId: FormationId, after: FormationAssignment | null, stage: string): void;
    recordUnresolvedSectorBrigades(before: readonly FormationId[] | undefined, after: readonly FormationId[], apply: () => void, stage: string): void;
}

const SUPPORTED_STRATEGIES: readonly SectorTopologyMutationExecutionStrategy[] = ['test-only-imperative-live-state'];

export function createSectorTopologyMutationRecorder(
    strategy: SectorTopologyMutationExecutionStrategy,
): SectorTopologyMutationRecorder {
    if (!SUPPORTED_STRATEGIES.includes(strategy)) {
        throw new Error(`Unknown sector topology mutation execution strategy: ${String(strategy)}`);
    }
    const journal: SectorTopologyMutation[] = [];
    let nextSequence = 0;
    const append = (mutation: SectorTopologyMutation): void => {
        journal.push(mutation);
    };

    return {
        strategy,
        journal,
        recordFormationLocation(formation, formationId, after, stage) {
            const before = formation.location_osid;
            append({ sequence: nextSequence++, stage, kind: 'formation-location', formationId, before, after });
            formation.location_osid = after;
        },
        recordFormationEntrenchment(formation, formationId, stage) {
            const before = formation.entrenchment_turns;
            append({ sequence: nextSequence++, stage, kind: 'formation-entrenchment', formationId, before, after: 0 });
            formation.entrenchment_turns = 0;
        },
        recordFormationAssignedSubSegment(formation, formationId, after, stage) {
            const before = formation.assigned_sub_segment_id;
            append({ sequence: nextSequence++, stage, kind: 'formation-assigned-sub-segment', formationId, before, after });
            formation.assigned_sub_segment_id = after;
        },
        recordFormationAssignment(formation, formationId, after, stage) {
            const before = formation.assignment;
            append({ sequence: nextSequence++, stage, kind: 'formation-assignment', formationId, before, after });
            formation.assignment = after;
        },
        recordUnresolvedSectorBrigades(before, after, apply, stage) {
            append({ sequence: nextSequence++, stage, kind: 'unresolved-sector-brigades', before, after });
            apply();
        },
    };
}
