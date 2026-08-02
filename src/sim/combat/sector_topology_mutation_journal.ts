import type {
    FormationAssignment,
    FormationId,
} from '../../state/game_state.js';
import type {
    SectorTopologyDiagnostic,
    SectorTopologyMutableFormation,
    SectorTopologyMutableMilitary,
    SectorTopologyMutation,
} from './sector_topology_solver_types.js';

export type {
    SectorTopologyDiagnostic,
    SectorTopologyMutation,
} from './sector_topology_solver_types.js';

export interface SectorTopologyMutationRecorder {
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    recordFormationLocation(
        stage: string,
        formationId: FormationId,
        formation: SectorTopologyMutableFormation,
        after: string,
    ): void;
    recordFormationEntrenchmentReset(
        stage: string,
        formationId: FormationId,
        formation: SectorTopologyMutableFormation,
    ): void;
    recordFormationAssignedSubSegment(
        stage: string,
        formationId: FormationId,
        formation: SectorTopologyMutableFormation,
        after: string | undefined,
    ): void;
    recordFormationAssignment(
        stage: string,
        formationId: FormationId,
        formation: SectorTopologyMutableFormation,
        after: FormationAssignment | null,
    ): void;
    recordUnresolvedSectorBrigades(
        stage: string,
        military: SectorTopologyMutableMilitary,
        after: readonly FormationId[],
    ): void;
    recordWarning(stage: string, message: string): void;
    recordDebug(stage: string, message: string): void;
    recordError(stage: string, message: string): void;
}

function copyAssignment(
    assignment: FormationAssignment | null,
): FormationAssignment | null {
    return assignment == null ? null : { ...assignment };
}

export function createSectorTopologyMutationRecorder(): SectorTopologyMutationRecorder {
    const mutations: SectorTopologyMutation[] = [];
    const diagnostics: SectorTopologyDiagnostic[] = [];

    function nextSequence(): number {
        return mutations.length;
    }

    return {
        mutations,
        diagnostics,
        recordFormationLocation(stage, formationId, formation, after): void {
            mutations.push({
                sequence: nextSequence(),
                stage,
                kind: 'formation-location',
                formationId,
                before: formation.location_osid,
                after,
            });
            formation.location_osid = after;
        },
        recordFormationEntrenchmentReset(stage, formationId, formation): void {
            mutations.push({
                sequence: nextSequence(),
                stage,
                kind: 'formation-entrenchment',
                formationId,
                before: formation.entrenchment_turns,
                after: 0,
            });
            formation.entrenchment_turns = 0;
        },
        recordFormationAssignedSubSegment(stage, formationId, formation, after): void {
            mutations.push({
                sequence: nextSequence(),
                stage,
                kind: 'formation-assigned-sub-segment',
                formationId,
                before: formation.assigned_sub_segment_id,
                after,
            });
            formation.assigned_sub_segment_id = after;
        },
        recordFormationAssignment(stage, formationId, formation, after): void {
            mutations.push({
                sequence: nextSequence(),
                stage,
                kind: 'formation-assignment',
                formationId,
                before: copyAssignment(formation.assignment),
                after: copyAssignment(after),
            });
            formation.assignment = copyAssignment(after);
        },
        recordUnresolvedSectorBrigades(stage, military, after): void {
            mutations.push({
                sequence: nextSequence(),
                stage,
                kind: 'unresolved-sector-brigades',
                before: military.unresolved_sector_brigades == null
                    ? undefined
                    : [...military.unresolved_sector_brigades],
                after: [...after],
            });
            military.unresolved_sector_brigades = [...after];
        },
        recordWarning(stage, message): void {
            diagnostics.push({
                sequence: diagnostics.length,
                stage,
                kind: 'warning',
                message,
                mutationBoundary: mutations.length,
            });
        },
        recordDebug(stage, message): void {
            diagnostics.push({
                sequence: diagnostics.length,
                stage,
                kind: 'debug',
                message,
                mutationBoundary: mutations.length,
            });
        },
        recordError(stage, message): void {
            diagnostics.push({
                sequence: diagnostics.length,
                stage,
                kind: 'error',
                message,
                mutationBoundary: mutations.length,
            });
        },
    };
}
