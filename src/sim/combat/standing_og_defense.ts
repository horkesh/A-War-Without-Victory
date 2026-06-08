import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';

/**
 * ADR-0007 Phase B flag. Enabled (PR-1): standing OGs commit sector reserves
 * to defense, so reserve brigades absorb attrition alongside assigned brigades.
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
