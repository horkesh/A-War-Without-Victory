import type { SectorTopologyWorkingFormation } from './sector_topology_narrow_formation.js';

export function isSectorRosterEligibleFormation(formation: SectorTopologyWorkingFormation | null | undefined): boolean {
    if (!formation) return false;
    if (
        formation.kind !== undefined
        && formation.kind !== 'brigade'
        && formation.kind !== 'og'
        && formation.kind !== 'operational_group'
        && formation.kind !== 'hv_phantom'
    ) {
        return false;
    }
    if (formation.status !== 'active') return false;
    if (formation.lifecycle_status === 'destroyed' || formation.lifecycle_status === 'disbanded') return false;
    const readiness = String(formation.readiness ?? 'active').toLowerCase();
    return readiness !== 'forming' && readiness !== 'destroyed';
}
