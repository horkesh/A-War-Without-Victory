import type { CorpsOperation, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { ValidationIssue } from '../../validate/validate.js';

function compareIssues(a: ValidationIssue, b: ValidationIssue): number {
    return strictCompare(a.path ?? '', b.path ?? '')
        || strictCompare(a.code, b.code)
        || strictCompare(a.message, b.message);
}

function operationHasTarget(operation: CorpsOperation): boolean {
    if ((operation.target_settlements?.length ?? 0) > 0) return true;
    if ((operation.objectives?.length ?? 0) > 0) return true;
    return (operation.axes ?? []).some(axis => (axis.objectives?.length ?? 0) > 0);
}

/** Return deterministic operation-lifecycle invariant issues without mutating state. */
export function assertOperationLifecycle(state: GameState): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const corpsCommand = state.military.corps_command ?? {};
    const formations = state.military.formations ?? {};

    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const operations = corpsCommand[corpsId]?.active_operations ?? [];
        for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
            const operation = operations[operationIndex]!;
            const operationPath = `military.corps_command.${corpsId}.active_operations.${operationIndex}`;
            const participants = operation.participating_brigades ?? [];
            let activeParticipantCount = 0;

            for (let participantIndex = 0; participantIndex < participants.length; participantIndex += 1) {
                const participantId = participants[participantIndex]!;
                const formation = formations[participantId];
                if (!formation) {
                    issues.push({
                        severity: 'error',
                        code: 'operation.participant_missing',
                        message: `${corpsId} operation '${operation.name}' references missing participant ${participantId}`,
                        path: `${operationPath}.participating_brigades.${participantIndex}`,
                    });
                } else if (formation.status !== 'active') {
                    issues.push({
                        severity: 'error',
                        code: 'operation.participant_inactive',
                        message: `${corpsId} operation '${operation.name}' references inactive participant ${participantId}`,
                        path: `${operationPath}.participating_brigades.${participantIndex}`,
                    });
                } else {
                    activeParticipantCount += 1;
                }
            }

            if (operation.phase !== 'execution') continue;

            if (activeParticipantCount === 0) {
                issues.push({
                    severity: 'error',
                    code: 'operation.execution_no_active_participants',
                    message: `${corpsId} operation '${operation.name}' is executing without an active participant`,
                    path: `${operationPath}.participating_brigades`,
                });
            }
            if (!operationHasTarget(operation)) {
                issues.push({
                    severity: 'error',
                    code: 'operation.execution_no_targets',
                    message: `${corpsId} operation '${operation.name}' is executing without a target`,
                    path: `${operationPath}.objectives`,
                });
            }
        }
    }

    return issues.sort(compareIssues);
}
