import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getQueuedPrePlannedBrigadeIds } from './pre_planned_operations.js';

/**
 * ADR-0007 live Phase B. Each threatened-sector distribution pass commits at
 * most one eligible reserve/rear formation. Participants of an executing or
 * recovering operation, disrupted or in-transit formations, and formations with
 * an existing movement order are excluded (a participant of an operation still
 * in planning is not; defence fix D1). This flag does not widen
 * reactive-defense membership.
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

    // Defence fix D1 (seats r2, 2026-11-18): earmarked is not absent. A participant of an
    // operation still in PLANNING stays in its sector's defence roster. It has not marched
    // (in-transit and movement-order brigades are already excluded above), so it is still on
    // the line and fights for the cells around it. Before this, naming a brigade in a planned
    // probe removed it from the roster: the 2nd Armored (morale 95) left the Ozren roster
    // while it stood at Boljanić, and a morale-20 brigade became primary and lost
    // Donja Bočinja at pr 1.16. Executing and recovering participants stay excluded.
    // The resolver and the predictor share this roster, so they stay consistent.
    const corpsCommands = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommands).sort(strictCompare)) {
        for (const operation of corpsCommands[corpsId]?.active_operations ?? []) {
            if (operation.phase === 'planning') continue;
            if (operation.participating_brigades?.includes(brigadeId)) return false;
        }
    }
    return true;
}
