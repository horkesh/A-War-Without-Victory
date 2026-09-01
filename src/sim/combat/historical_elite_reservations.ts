import type { FormationId } from '../../state/game_state.js';

/**
 * Army-HQ formations earmarked for a dated historical operation remain in the
 * strategic reserve until that operation can claim them. This prevents generic
 * corps-demand matching from consuming the exact authored assault formation
 * months before its planned commitment.
 */
const HISTORICAL_ELITE_RESERVATIONS: ReadonlyArray<{
    brigadeId: FormationId;
    releaseTurn: number;
}> = [
    { brigadeId: 'rs_1st_guards_motorized' as FormationId, releaseTurn: 95 },
    { brigadeId: 'rs_65th_protection_motorized_regiment' as FormationId, releaseTurn: 95 },
];

export function isEliteReservedForHistoricalOperation(brigadeId: FormationId, turn: number): boolean {
    return HISTORICAL_ELITE_RESERVATIONS.some((reservation) =>
        reservation.brigadeId === brigadeId && turn <= reservation.releaseTurn);
}
