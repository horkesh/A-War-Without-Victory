import type { LoadedGameState, FormationView } from '../data/types';
import { getAssignedCommandLabel } from '../../shared/playerFacingLabels';

/**
 * Utility to find the named officer for a formation (Corps or Army level).
 */
export function getFormationCommander(
    formation: FormationView,
    loadedGameState: LoadedGameState
) {
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        return loadedGameState.namedOfficerData?.find(o => o.assigned_corps_id === formation.id) || null;
    }

    if (formation.kind === 'army_hq') {
        const stateById = loadedGameState.namedOfficerStateById;
        return loadedGameState.namedOfficerData?.find(
            o => o.faction === formation.faction
                && o.rank === 'army_commander'
                && (stateById?.[o.id]?.status === 'active' || (!stateById?.[o.id] && o.status === 'active'))
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
    const stateById = loadedGameState.namedOfficerStateById;
    return loadedGameState.namedOfficerData?.find(
        o => o.faction === faction
            && o.rank === 'army_commander'
            && (stateById?.[o.id]?.status === 'active' || (!stateById?.[o.id] && o.status === 'active'))
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
