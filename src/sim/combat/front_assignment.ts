import type { FormationId, GameState } from '../../state/game_state.js';

export function buildFrontlineAssignedFormationSet(state: GameState): Set<FormationId> {
    const assigned = new Set<FormationId>();
    const sectors = state.military.corps_front_sectors ?? {};
    for (const sector of Object.values(sectors)) {
        if (!sector) continue;
        for (const brigadeId of sector.assigned_brigade_ids ?? []) {
            assigned.add(brigadeId as FormationId);
        }
    }
    return assigned;
}

export function hasLiveSectorFrontlineTruth(state: GameState): boolean {
    const sectors = state.military.corps_front_sectors;
    if (!sectors || typeof sectors !== 'object') return false;
    return Object.values(sectors).some((sector) => sector != null);
}

export function isBrigadeAssignedToFront(state: GameState, formationId: FormationId): boolean {
    const formation = state.military.formations?.[formationId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade') return false;
    return buildFrontlineAssignedFormationSet(state).has(formationId);
}
