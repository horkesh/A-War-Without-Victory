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
    operationNames: readonly string[];
}> = [
    // The historical operation injector runs after generic Army-HQ demand
    // matching. Keep the pair reserved through Zvezda 94's authored execution
    // window so another corps cannot borrow or recall either formation while
    // the Goražde assault is still active.
    {
        brigadeId: 'rs_1st_guards_motorized' as FormationId,
        releaseTurn: 113,
        operationNames: ['Operation Cerska-Kamenica', 'Operation Lukavac 93', 'Operation Zvezda 94'],
    },
    {
        brigadeId: 'rs_65th_protection_motorized_regiment' as FormationId,
        releaseTurn: 113,
        operationNames: ['Operation Cerska-Kamenica', 'Operation Lukavac 93', 'Operation Zvezda 94'],
    },
];

export function isEliteReservedForHistoricalOperation(brigadeId: FormationId, turn: number): boolean {
    return HISTORICAL_ELITE_RESERVATIONS.some((reservation) =>
        reservation.brigadeId === brigadeId && turn <= reservation.releaseTurn);
}

export function isEliteAuthoredForHistoricalOperation(brigadeId: FormationId, operationName: string): boolean {
    return HISTORICAL_ELITE_RESERVATIONS.some((reservation) =>
        reservation.brigadeId === brigadeId && reservation.operationNames.includes(operationName));
}
