import type { FormationState } from '../../state/game_state.js';

type SectorRosterEligibilityFormation = Pick<
    FormationState,
    'kind' | 'status' | 'lifecycle_status' | 'readiness'
>;

export function isSectorRosterEligibleFormation(
    formation: SectorRosterEligibilityFormation | null | undefined,
): boolean {
    if (!formation) return false;
    if (
        formation.kind !== undefined
        && formation.kind !== 'brigade'
        && formation.kind !== 'og'
        && formation.kind !== 'operational_group'
    ) {
        return false;
    }
    if (formation.status !== 'active') return false;
    if (formation.lifecycle_status === 'destroyed' || formation.lifecycle_status === 'disbanded') return false;
    const readiness = String(formation.readiness ?? 'active').toLowerCase();
    return readiness !== 'forming' && readiness !== 'destroyed';
}
