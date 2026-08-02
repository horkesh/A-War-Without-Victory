import type {
    FormationAssignment,
    FormationId,
    GameState,
} from '../../state/game_state.js';
import type {
    SectorTopologyDiagnostic,
    SectorTopologyMutableFormation,
    SectorTopologyMutableMilitary,
    SectorTopologyMutation,
    SectorTopologySolveInput,
    SectorTopologySolveOutput,
} from './sector_topology_solver_types.js';
import {
    emitRoutineConsoleDebug,
    emitRoutineConsoleWarn,
} from '../../utils/routine_console_diagnostics.js';

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

export function commitSectorTopologySolve(
    state: GameState,
    input: Pick<SectorTopologySolveInput, 'provenance'>,
    output: SectorTopologySolveOutput,
    emitDiagnostic: (diagnostic: SectorTopologyDiagnostic) => void = emitSectorTopologyDiagnostic,
): void {
    validateSectorTopologyCommit(state, input, output);

    let diagnosticIndex = 0;
    const emitAtBoundary = (boundary: number): void => {
        while (output.diagnostics[diagnosticIndex]?.mutationBoundary === boundary) {
            emitDiagnostic(output.diagnostics[diagnosticIndex]!);
            diagnosticIndex += 1;
        }
    };

    emitAtBoundary(0);
    for (let index = 0; index < output.mutations.length; index += 1) {
        applyLiveMutation(state, output.mutations[index]!);
        emitAtBoundary(index + 1);
    }
}

interface SectorTopologyFormationShadow {
    location_osid: string | undefined;
    entrenchment_turns: number | undefined;
    assigned_sub_segment_id: string | undefined;
    assignment: FormationAssignment | null;
}

function currentFrontEdgeFingerprint(state: GameState): string {
    return JSON.stringify((state.military.war_front_edges_osid ?? []).map((edge) => [
        edge.edge_id,
        edge.a,
        edge.b,
        edge.side_a,
        edge.side_b,
    ]));
}

function assignmentsEqual(
    left: FormationAssignment | null,
    right: FormationAssignment | null,
): boolean {
    if (left === null || right === null) return left === right;
    return left.kind === right.kind
        && left.region_id === right.region_id
        && left.edge_id === right.edge_id
        && left.sector_id === right.sector_id
        && left.role === right.role;
}

function listsEqual(
    left: readonly FormationId[] | undefined,
    right: readonly FormationId[] | undefined,
): boolean {
    if (left === undefined || right === undefined) return left === right;
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function staleMutation(index: number, field: string): never {
    throw new Error(`Sector topology mutation ${index} has stale ${field} before-value.`);
}

function formationShadow(
    state: GameState,
    shadows: Map<FormationId, SectorTopologyFormationShadow>,
    formationId: FormationId,
): SectorTopologyFormationShadow {
    const existing = shadows.get(formationId);
    if (existing) return existing;
    const formation = state.military.formations[formationId];
    if (!formation) {
        throw new Error(`Sector topology target formation ${formationId} is missing.`);
    }
    const created: SectorTopologyFormationShadow = {
        location_osid: formation.location_osid,
        entrenchment_turns: formation.entrenchment_turns,
        assigned_sub_segment_id: formation.assigned_sub_segment_id,
        assignment: copyAssignment(formation.assignment),
    };
    shadows.set(formationId, created);
    return created;
}

function validateDiagnosticJournal(
    diagnostics: readonly SectorTopologyDiagnostic[],
    mutationCount: number,
): void {
    let previousBoundary = -1;
    for (let index = 0; index < diagnostics.length; index += 1) {
        const diagnostic = diagnostics[index] as SectorTopologyDiagnostic | undefined;
        if (!diagnostic || diagnostic.sequence !== index) {
            throw new Error(
                `Malformed sector topology diagnostic sequence at index ${index}; expected ${index}.`,
            );
        }
        if (diagnostic.kind !== 'debug'
            && diagnostic.kind !== 'warning'
            && diagnostic.kind !== 'error') {
            throw new Error(`Unknown sector topology diagnostic kind at index ${index}.`);
        }
        if (!Number.isInteger(diagnostic.mutationBoundary)
            || diagnostic.mutationBoundary < 0
            || diagnostic.mutationBoundary > mutationCount
            || diagnostic.mutationBoundary < previousBoundary) {
            throw new Error(`Malformed sector topology diagnostic boundary at index ${index}.`);
        }
        previousBoundary = diagnostic.mutationBoundary;
    }
}

function validateSectorTopologyCommit(
    state: GameState,
    input: Pick<SectorTopologySolveInput, 'provenance'>,
    output: SectorTopologySolveOutput,
): void {
    if (state.meta.turn !== input.provenance.turn) {
        throw new Error(
            `Stale sector topology turn provenance: expected ${input.provenance.turn}, got ${state.meta.turn}.`,
        );
    }
    if (currentFrontEdgeFingerprint(state) !== input.provenance.frontEdgeFingerprint) {
        throw new Error('Stale sector topology front-edge provenance.');
    }

    validateDiagnosticJournal(output.diagnostics, output.mutations.length);
    const shadows = new Map<FormationId, SectorTopologyFormationShadow>();
    let unresolvedShadow = state.military.unresolved_sector_brigades == null
        ? undefined
        : [...state.military.unresolved_sector_brigades];

    for (let index = 0; index < output.mutations.length; index += 1) {
        const mutation = output.mutations[index] as SectorTopologyMutation | undefined;
        if (!mutation || mutation.sequence !== index) {
            throw new Error(
                `Malformed sector topology mutation sequence at index ${index}; expected ${index}.`,
            );
        }
        switch (mutation.kind) {
            case 'formation-location': {
                const shadow = formationShadow(state, shadows, mutation.formationId);
                if (shadow.location_osid !== mutation.before) staleMutation(index, 'location');
                shadow.location_osid = mutation.after;
                break;
            }
            case 'formation-entrenchment': {
                const shadow = formationShadow(state, shadows, mutation.formationId);
                if (shadow.entrenchment_turns !== mutation.before) {
                    staleMutation(index, 'entrenchment');
                }
                shadow.entrenchment_turns = mutation.after;
                break;
            }
            case 'formation-assigned-sub-segment': {
                const shadow = formationShadow(state, shadows, mutation.formationId);
                if (shadow.assigned_sub_segment_id !== mutation.before) {
                    staleMutation(index, 'assigned sub-segment');
                }
                shadow.assigned_sub_segment_id = mutation.after;
                break;
            }
            case 'formation-assignment': {
                const shadow = formationShadow(state, shadows, mutation.formationId);
                if (!assignmentsEqual(shadow.assignment, mutation.before)) {
                    staleMutation(index, 'assignment');
                }
                shadow.assignment = copyAssignment(mutation.after);
                break;
            }
            case 'unresolved-sector-brigades':
                if (!listsEqual(unresolvedShadow, mutation.before)) {
                    staleMutation(index, 'unresolved sector brigades');
                }
                unresolvedShadow = [...mutation.after];
                break;
            default:
                throw new Error(
                    `Unknown sector topology mutation kind at index ${index}: ${String((mutation as { kind?: unknown }).kind)}.`,
                );
        }
    }
}

function applyLiveMutation(state: GameState, mutation: SectorTopologyMutation): void {
    switch (mutation.kind) {
        case 'formation-location':
            state.military.formations[mutation.formationId]!.location_osid = mutation.after;
            return;
        case 'formation-entrenchment':
            state.military.formations[mutation.formationId]!.entrenchment_turns = mutation.after;
            return;
        case 'formation-assigned-sub-segment':
            state.military.formations[mutation.formationId]!.assigned_sub_segment_id = mutation.after;
            return;
        case 'formation-assignment':
            state.military.formations[mutation.formationId]!.assignment = copyAssignment(mutation.after);
            return;
        case 'unresolved-sector-brigades':
            state.military.unresolved_sector_brigades = [...mutation.after];
            return;
    }
}

function emitSectorTopologyDiagnostic(diagnostic: SectorTopologyDiagnostic): void {
    switch (diagnostic.kind) {
        case 'debug':
            emitRoutineConsoleDebug(diagnostic.message);
            return;
        case 'warning':
            emitRoutineConsoleWarn(diagnostic.message);
            return;
        case 'error':
            console.error(diagnostic.message);
            return;
    }
}
