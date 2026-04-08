import type { CorpsOperation, FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { derivePrimarySectorForBrigades } from './corps_operation_helpers.js';

function uniqueActiveParticipants(state: GameState, brigadeIds: ReadonlyArray<FormationId> | undefined): FormationId[] {
    const seen = new Set<FormationId>();
    const formations = state.military.formations ?? {};
    const active: FormationId[] = [];

    for (const brigadeId of brigadeIds ?? []) {
        if (seen.has(brigadeId)) continue;
        seen.add(brigadeId);
        if (formations[brigadeId]?.status === 'active') active.push(brigadeId);
    }

    active.sort(strictCompare);
    return active;
}

function reconcileOperationRoster(state: GameState, corpsId: string, operation: CorpsOperation): void {
    const activeParticipants = uniqueActiveParticipants(state, operation.participating_brigades);
    const activeParticipantSet = new Set(activeParticipants);
    operation.participating_brigades = activeParticipants;

    if (Array.isArray(operation.axes)) {
        for (const axis of operation.axes) {
            axis.assigned_brigades = uniqueActiveParticipants(state, axis.assigned_brigades)
                .filter((brigadeId) => activeParticipantSet.has(brigadeId));
        }
    }

    const anchoredSectorId = derivePrimarySectorForBrigades(
        Object.values(state.military.corps_front_sectors ?? {}),
        corpsId,
        activeParticipants,
        state.military.formations ?? {},
    );
    if (anchoredSectorId) {
        operation.sector_id = anchoredSectorId;
    } else {
        delete operation.sector_id;
    }

    if (operation.phase === 'execution' && activeParticipants.length === 0) {
        operation.phase = 'recovery';
        operation.phase_started_turn = state.meta.turn;
        operation.recovery_reason = 'brigade_attrition';
    }
}

export function reconcileFinalOperationTruth(state: GameState): void {
    const corpsCommand = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        for (const operation of cmd.active_operations ?? []) {
            reconcileOperationRoster(state, corpsId, operation);
        }
    }
}
