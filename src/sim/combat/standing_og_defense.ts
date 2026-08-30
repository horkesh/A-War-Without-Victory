import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getQueuedPrePlannedBrigadeIds } from './pre_planned_operations.js';

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
    state: Pick<GameState, 'military'>,
    brigadeId: FormationId,
): boolean {
    const formation = state.military.formations?.[brigadeId];
    if (!formation || formation.status !== 'active') return false;
    if ((formation.disrupted_turns ?? 0) > 0) return false;
    if (state.military.brigade_movement_state?.[brigadeId]?.status === 'in_transit') return false;
    if (state.military.brigade_movement_orders?.[brigadeId]) return false;
    if (getQueuedPrePlannedBrigadeIds(state).has(brigadeId)) return false;

    const corpsCommands = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommands).sort(strictCompare)) {
        for (const operation of corpsCommands[corpsId]?.active_operations ?? []) {
            if (operation.participating_brigades?.includes(brigadeId)) return false;
        }
    }
    return true;
}
