import type {
    FormationAssignment,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';

export type SectorTopologyMutation =
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-location';
        readonly formationId: FormationId;
        readonly before: string | undefined;
        readonly after: string;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-entrenchment';
        readonly formationId: FormationId;
        readonly before: number | undefined;
        readonly after: 0;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-assigned-sub-segment';
        readonly formationId: FormationId;
        readonly before: string | undefined;
        readonly after: string | undefined;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-assignment';
        readonly formationId: FormationId;
        readonly before: FormationAssignment | null;
        readonly after: FormationAssignment | null;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'unresolved-sector-brigades';
        readonly before: readonly FormationId[] | undefined;
        readonly after: readonly FormationId[];
    };

export interface SectorTopologyDiagnostic {
    readonly sequence: number;
    readonly stage: string;
    readonly kind: 'warning';
    readonly message: string;
    readonly mutationBoundary: number;
}

export interface SectorTopologyMutationRecorder {
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    recordFormationLocation(
        stage: string,
        formationId: FormationId,
        formation: FormationState,
        after: string,
    ): void;
    recordFormationEntrenchmentReset(
        stage: string,
        formationId: FormationId,
        formation: FormationState,
    ): void;
    recordFormationAssignedSubSegment(
        stage: string,
        formationId: FormationId,
        formation: FormationState,
        after: string | undefined,
    ): void;
    recordFormationAssignment(
        stage: string,
        formationId: FormationId,
        formation: FormationState,
        after: FormationAssignment | null,
    ): void;
    recordUnresolvedSectorBrigades(
        stage: string,
        military: GameState['military'],
        after: readonly FormationId[],
    ): void;
    recordWarning(stage: string, message: string): void;
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
    };
}
