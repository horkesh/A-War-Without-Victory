import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';

/**
 * ADR-0007 live Phase B. Each threatened-sector distribution pass commits at
 * most one eligible reserve/rear formation. Active-operation participants,
 * disrupted or in-transit formations, and formations with an existing movement
 * order are excluded. This flag does not widen reactive-defense membership.
 */
export const ENABLE_STANDING_OG_RESERVE_COMMIT = true;

export function getStandingOgDefenseBrigadeIds(
    sector: Pick<CorpsFrontSector, 'assigned_brigade_ids'>,
): FormationId[] {
    return [...sector.assigned_brigade_ids];
}

export function getStandingOgEngagedDefenseBrigadeIds(
    defenderFormation: Pick<FormationState, 'id'> | null,
): FormationId[] {
    if (!defenderFormation) return [];
    return [defenderFormation.id];
}

export function isStandingOgDefenseBrigadeAvailable(
    _state: Pick<GameState, 'military'>,
    _brigadeId: FormationId,
): boolean {
    return true;
}
