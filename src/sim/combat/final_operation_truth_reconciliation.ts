import type { CorpsOperation, FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isSectorAssignmentExemptCorpsId } from './corps_front_sectors_constants.js';
import { derivePrimarySectorForBrigades } from './corps_operation_helpers.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { isMainStaffOpRetentionEnabled } from './mainstaff_op_availability_gate.js';
import { enterOperationRecovery } from './tactical_group_lifecycle.js';

function buildSectorClaimsByBrigade(state: GameState): Map<FormationId, string[]> {
    const claims = new Map<FormationId, Set<string>>();

    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        const sectorCorpsId = sector.corps_id;
        const brigadeIds = [
            ...(sector.assigned_brigade_ids ?? []),
            ...(sector.reserve_brigade_ids ?? []),
        ].sort(strictCompare);

        for (const brigadeId of brigadeIds) {
            const existing = claims.get(brigadeId) ?? new Set<string>();
            existing.add(sectorCorpsId);
            claims.set(brigadeId, existing);
        }
    }

    const normalized = new Map<FormationId, string[]>();
    for (const [brigadeId, corpsIds] of claims.entries()) {
        normalized.set(brigadeId, [...corpsIds].sort(strictCompare));
    }
    return normalized;
}

function uniqueActiveParticipants(
    state: GameState,
    corpsId: string,
    brigadeIds: ReadonlyArray<FormationId> | undefined,
    sectorClaimsByBrigade = buildSectorClaimsByBrigade(state),
): FormationId[] {
    const seen = new Set<FormationId>();
    const formations = state.military.formations ?? {};
    const active: FormationId[] = [];

    for (const brigadeId of brigadeIds ?? []) {
        if (seen.has(brigadeId)) continue;
        seen.add(brigadeId);
        const formation = formations[brigadeId];
        if (formation?.status !== 'active') continue;

        const sectorClaims = sectorClaimsByBrigade.get(brigadeId) ?? [];
        const hasSameCorpsClaim = sectorClaims.includes(corpsId);

        // Sector-exempt reserves (main staff / general staff) hold no sector of
        // their own, so the sector claim says only where they are STANDING. Read
        // the loan instead: an attached reserve stays on the roster wherever it
        // is, and an unattached one does not ride along on an empty claim.
        // Independently gated, and on its OWN flag (AWWV_MAINSTAFF_OP_RETENTION) rather
        // than the admission flag: this half EVICTS where the admission half
        // ADMITS, and bundling opposite signs makes a cancellation read as
        // inertness. See the header note in mainstaff_op_availability_gate.ts.
        if (
            isMainStaffOpRetentionEnabled()
            && isSectorAssignmentExemptCorpsId(getFormationCorpsId(formation))
        ) {
            const loanState = formation.elite_loan_state;
            const attachedToHostCorps = loanState?.on_loan === true && loanState.loaned_to_corps === corpsId;
            if (!attachedToHostCorps && !hasSameCorpsClaim) continue;
            active.push(brigadeId);
            continue;
        }

        const hasOnlyForeignClaims = sectorClaims.length > 0 && !hasSameCorpsClaim;
        if (hasOnlyForeignClaims) continue;

        active.push(brigadeId);
    }

    active.sort(strictCompare);
    return active;
}

function sameFormationIds(a: ReadonlyArray<FormationId>, b: ReadonlyArray<FormationId>): boolean {
    return a.length === b.length && a.every((formationId, index) => formationId === b[index]);
}

function reconcileOperationRoster(state: GameState, corpsId: string, operation: CorpsOperation): boolean {
    const previousParticipants = [...(operation.participating_brigades ?? [])];
    const previousPhase = operation.phase;
    const formations = state.military.formations ?? {};
    const sectorClaimsByBrigade = buildSectorClaimsByBrigade(state);
    const authoredCorpsByBrigade = new Map<FormationId, string>();
    const authoredAxisBrigades = new Set<FormationId>();
    for (const axis of operation.axes ?? []) {
        if (!axis.corps_id) continue;
        for (const brigadeId of axis.assigned_brigades) {
            authoredAxisBrigades.add(brigadeId);
            if (getFormationCorpsId(formations[brigadeId]) === axis.corps_id) {
                authoredCorpsByBrigade.set(brigadeId, axis.corps_id);
            }
        }
    }
    const activeParticipants = [...new Set((operation.participating_brigades ?? [])
        .filter((brigadeId) => !authoredAxisBrigades.has(brigadeId) || authoredCorpsByBrigade.has(brigadeId))
        .flatMap((brigadeId) => uniqueActiveParticipants(
            state,
            authoredCorpsByBrigade.get(brigadeId) ?? corpsId,
            [brigadeId],
            sectorClaimsByBrigade,
        )))]
        .sort(strictCompare);
    const activeParticipantSet = new Set(activeParticipants);
    operation.participating_brigades = activeParticipants;

    if (Array.isArray(operation.axes)) {
        for (const axis of operation.axes) {
            const axisCorpsId = axis.corps_id ?? corpsId;
            axis.assigned_brigades = uniqueActiveParticipants(
                state,
                axisCorpsId,
                axis.assigned_brigades,
                sectorClaimsByBrigade,
            )
                .filter((brigadeId) => getFormationCorpsId(formations[brigadeId]) === axisCorpsId)
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
        enterOperationRecovery(state, corpsId, operation, state.meta.turn, 'brigade_attrition');
    }

    return !sameFormationIds(previousParticipants, activeParticipants)
        || (operation.type === 'feint' && previousPhase !== operation.phase);
}

export interface FinalOperationTruthReconciliationReport {
    operations_checked: number;
    sector_reconciliation_changes: number;
    sector_reconciliation_required: boolean;
}

export function reconcileFinalOperationTruth(state: GameState): FinalOperationTruthReconciliationReport {
    const corpsCommand = state.military.corps_command ?? {};
    let operationsChecked = 0;
    let sectorReconciliationChanges = 0;
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        for (const operation of cmd.active_operations ?? []) {
            operationsChecked += 1;
            if (reconcileOperationRoster(state, corpsId, operation)) {
                sectorReconciliationChanges += 1;
            }
        }
    }
    return {
        operations_checked: operationsChecked,
        sector_reconciliation_changes: sectorReconciliationChanges,
        sector_reconciliation_required: sectorReconciliationChanges > 0,
    };
}
