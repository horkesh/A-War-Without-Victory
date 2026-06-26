import type { LoadedGameState, FormationView, NamedOfficerView, OperationView } from '../data/types';
import { getAssignedCommandLabel } from '../../shared/playerFacingLabels';
import { strictCompare } from '../../../state/validateGameState';

export interface CommanderDisplay {
    name: string;
    acting: boolean;
    source: 'active' | 'opening_read_model' | 'synthetic' | 'unreported';
}

const SYNTHETIC_COMMAND_LABELS: Record<string, string> = {
    jna_herzegovina_command: 'JNA forward command staff',
};

const SYNTHETIC_JNA_COMMAND_IDS = new Set(Object.keys(SYNTHETIC_COMMAND_LABELS));

export interface SyntheticJnaCommandPresentation {
    commanderName?: string;
    operationName?: string;
}

const POOL_TIER_ORDER: Record<string, number> = {
    starter: 0,
    tier_a: 1,
    tier_b: 2,
    tier_c: 3,
};

function officerStatusFor(state: LoadedGameState, officer: NamedOfficerView): string {
    return state.namedOfficerStateById?.[officer.id]?.status ?? officer.status;
}

function assignedCorpsFor(state: LoadedGameState, officer: NamedOfficerView): string | null {
    return state.namedOfficerStateById?.[officer.id]?.assigned_corps_id ?? officer.assigned_corps_id ?? null;
}

function assignedOperationFor(officer: NamedOfficerView): string | null {
    return officer.assigned_operation ?? null;
}

function isOfficerAvailableForTurn(state: LoadedGameState, officer: NamedOfficerView): boolean {
    const turn = state.turn ?? 0;
    if (officer.available_from_turn != null && officer.available_from_turn > turn) return false;
    if (officer.available_until_turn != null && officer.available_until_turn <= turn) return false;
    return !['kia', 'killed', 'captured', 'retired'].includes(officerStatusFor(state, officer));
}

function isActiveOfficerAvailableForTurn(state: LoadedGameState, officer: NamedOfficerView): boolean {
    return officerStatusFor(state, officer) === 'active' && isOfficerAvailableForTurn(state, officer);
}

function compareOpeningOfficer(a: NamedOfficerView, b: NamedOfficerView): number {
    const tierA = POOL_TIER_ORDER[a.pool_tier ?? ''] ?? 99;
    const tierB = POOL_TIER_ORDER[b.pool_tier ?? ''] ?? 99;
    if (tierA !== tierB) return tierA - tierB;
    const competenceA = Number.isFinite(a.competence) ? a.competence : -1;
    const competenceB = Number.isFinite(b.competence) ? b.competence : -1;
    if (competenceA !== competenceB) return competenceB - competenceA;
    const defenseA = Number.isFinite(a.defensive_skill) ? a.defensive_skill : -1;
    const defenseB = Number.isFinite(b.defensive_skill) ? b.defensive_skill : -1;
    if (defenseA !== defenseB) return defenseB - defenseA;
    return strictCompare(a.id, b.id);
}

function isOpeningCorpsMatch(officer: NamedOfficerView, corpsId: string): boolean {
    return officer.home_corps_id === corpsId
        || (officer.is_historical_start === true && officer.historical_corps_id === corpsId);
}

export function resolveOpeningCorpsCommanderOfficer(
    corpsId: string,
    faction: string,
    loadedGameState: LoadedGameState,
): NamedOfficerView | null {
    return (loadedGameState.namedOfficerData ?? [])
        .filter((officer) =>
            officer.faction === faction
            && officer.rank === 'corps_commander'
            && isOfficerAvailableForTurn(loadedGameState, officer)
            && !assignedCorpsFor(loadedGameState, officer)
            && !assignedOperationFor(officer)
            && isOpeningCorpsMatch(officer, corpsId)
        )
        .sort(compareOpeningOfficer)[0] ?? null;
}

export function resolveCorpsCommanderDisplay(
    corpsId: string,
    faction: string,
    loadedGameState: LoadedGameState,
): CommanderDisplay | null {
    const officers = Array.isArray(loadedGameState.namedOfficerData) ? loadedGameState.namedOfficerData : null;
    if (officers) {
    for (const officer of officers) {
        if (officerStatusFor(loadedGameState, officer) === 'active' && assignedCorpsFor(loadedGameState, officer) === corpsId) {
            const st = loadedGameState.namedOfficerStateById?.[officer.id];
            return { name: officer.name, acting: Boolean(st?.acting_commander ?? officer.acting_commander), source: 'active' };
        }
    }
    }

    if (SYNTHETIC_COMMAND_LABELS[corpsId]) {
        return { name: SYNTHETIC_COMMAND_LABELS[corpsId], acting: false, source: 'synthetic' };
    }

    if (!officers) {
        return { name: '', acting: false, source: 'unreported' };
    }

    const openingCandidate = resolveOpeningCorpsCommanderOfficer(corpsId, faction, loadedGameState);

    if (!openingCandidate) return null;
    return { name: openingCandidate.name, acting: true, source: 'opening_read_model' };
}

export function isSyntheticJnaCommand(formation: Pick<FormationView, 'id'> | string): boolean {
    const id = typeof formation === 'string' ? formation : formation.id;
    return SYNTHETIC_JNA_COMMAND_IDS.has(id);
}

function compareOperationForPresentation(a: OperationView, b: OperationView): number {
    const phaseRank: Record<OperationView['phase'], number> = { execution: 0, planning: 1, recovery: 2 };
    const phaseDelta = phaseRank[a.phase] - phaseRank[b.phase];
    if (phaseDelta !== 0) return phaseDelta;
    const turnDelta = (a.started_turn ?? 0) - (b.started_turn ?? 0);
    if (turnDelta !== 0) return turnDelta;
    return strictCompare(a.display_name || a.name, b.display_name || b.name);
}

/**
 * Synthetic JNA commands are operation containers, not standing corps billets.
 * This returns presentation detail without mutating command assignment truth.
 */
export function getSyntheticJnaCommandPresentation(
    formation: FormationView,
    operations: readonly OperationView[] | undefined,
    loadedGameState: LoadedGameState,
): SyntheticJnaCommandPresentation | null {
    if (!isSyntheticJnaCommand(formation)) return null;

    const operation = [...(operations ?? [])]
        .filter((op) => op.corps_id === formation.id)
        .sort(compareOperationForPresentation)[0];
    if (!operation) return {};

    const commander = operation.commander_officer_id
        ? loadedGameState.namedOfficerData?.find((officer) => officer.id === operation.commander_officer_id)
        : undefined;
    const commanderName = commander && isOfficerAvailableForTurn(loadedGameState, commander)
        ? commander.name
        : (operation as OperationView & { commander_name?: string }).commander_name;

    return {
        commanderName,
        operationName: operation.display_name || operation.name,
    };
}

/**
 * Utility to find the named officer for a formation (Corps or Army level).
 */
export function getFormationCommander(
    formation: FormationView,
    loadedGameState: LoadedGameState
) {
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        return loadedGameState.namedOfficerData?.find((o) =>
            officerStatusFor(loadedGameState, o) === 'active'
            && assignedCorpsFor(loadedGameState, o) === formation.id
        ) || null;
    }

    if (formation.kind === 'army_hq') {
        return loadedGameState.namedOfficerData?.find(
            o => o.faction === formation.faction
                && o.rank === 'army_commander'
                && isActiveOfficerAvailableForTurn(loadedGameState, o)
        ) || null;
    }

    return null;
}

/**
 * Utility to find the army commander for a faction.
 */
export function getFactionArmyCommander(
    faction: string,
    loadedGameState: LoadedGameState
) {
    return loadedGameState.namedOfficerData?.find(
        o => o.faction === faction
            && o.rank === 'army_commander'
            && isActiveOfficerAvailableForTurn(loadedGameState, o)
    ) || null;
}

/** Availability status for an officer. */
export function getAvailabilityStatus(
    officer: { status?: string, rank?: string, enclave_lock?: { enclave_id: string }, assigned_operation?: string, assigned_corps_id?: string | null, acting_commander?: boolean },
    targetCorpsId: string,
    corpsNameById?: Map<string, string>,
): { available: boolean; reason?: string } {
    if (officer.status === 'kia') return { available: false, reason: 'KIA' };
    if (officer.status === 'captured') return { available: false, reason: 'CAPTURED' };
    if (officer.status === 'retired') return { available: false, reason: 'RETIRED' };
    if (officer.rank === 'army_commander') return { available: false, reason: 'ARMY HQ - unavailable' };

    if (officer.enclave_lock) {
        return { available: false, reason: 'ENCLAVE LOCKED' };
    }

    if (officer.assigned_operation) {
        return { available: false, reason: `ASSIGNED: ${officer.assigned_operation}` };
    }

    if (officer.assigned_corps_id && officer.assigned_corps_id !== targetCorpsId && !officer.acting_commander) {
        return {
            available: false,
            reason: `CORPS COMMANDER - ${getAssignedCommandLabel(officer.assigned_corps_id, corpsNameById ?? new Map())}`,
        };
    }

    return { available: true };
}

/** Regional fit label. */
export function getRegionalFit(
    officer: { home_corps_id?: string, compatible_corps_ids?: string[] },
    targetCorpsId: string
): { label: string; color: string; penalty: string } {
    if (officer.home_corps_id === targetCorpsId) {
        return { label: 'HOME CORPS', color: 'text-green-600', penalty: 'no penalty' };
    }
    if (officer.compatible_corps_ids?.includes(targetCorpsId)) {
        return { label: 'COMPATIBLE', color: 'text-amber-600', penalty: 'small penalty' };
    }
    return { label: 'OUT OF REGION', color: 'text-red-600', penalty: 'competence -2' };
}
