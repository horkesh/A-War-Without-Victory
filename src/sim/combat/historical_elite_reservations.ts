import type { FormationId } from '../../state/game_state.js';

/**
 * Army-HQ formations earmarked for a dated historical operation remain in the
 * strategic reserve until that operation can claim them. This prevents generic
 * corps-demand matching from consuming the exact authored assault formation
 * months before its planned commitment.
 */
const HISTORICAL_ELITE_RESERVATIONS: ReadonlyArray<{
    brigadeId: FormationId;
    reserveFromTurn?: number;
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
        operationNames: ['Operation Cerska-Kamenica', 'Operation Pracha River', 'Lukavac 93 — TG Kalinovik', 'Operation Zvezda 94'],
    },
    {
        brigadeId: 'rs_65th_protection_motorized_regiment' as FormationId,
        releaseTurn: 113,
        operationNames: ['Operation Cerska-Kamenica', 'Operation Lukavac 93', 'Operation Zvezda 94'],
    },
    // [065]/[066] made these formations available; [067] then observed n1 Vjetar
    // pre-emption. Hold the exact live roster through Mistral 1's t160 window.
    // F_HRHB_0001 is the runtime identity of the OOB-authored Kralj Tomislav Brigade.
    ...([
        'hvo_1st_guard_abb',
        'hv_4th_guards_split',
        'hrhb_kralj_petar_kreimir_iv_brigade',
        'F_HRHB_0001',
        'hv_7th_hgr_1995',
    ] as FormationId[]).map((brigadeId) => ({
        brigadeId,
        reserveFromTurn: 154,
        releaseTurn: 160,
        operationNames: ['Operation Mistral 1'],
    })),
];

export function isEliteReservedForHistoricalOperation(brigadeId: FormationId, turn: number): boolean {
    return HISTORICAL_ELITE_RESERVATIONS.some((reservation) =>
        reservation.brigadeId === brigadeId
        && turn >= (reservation.reserveFromTurn ?? 0)
        && turn <= reservation.releaseTurn);
}

export function isEliteAuthoredForHistoricalOperation(brigadeId: FormationId, operationName: string): boolean {
    return HISTORICAL_ELITE_RESERVATIONS.some((reservation) =>
        reservation.brigadeId === brigadeId && reservation.operationNames.includes(operationName));
}

/**
 * A dated reservation blocks generic operation ownership while preserving the
 * exact authored operation named by the reservation.
 */
export function mayEliteJoinOperation(
    brigadeId: FormationId,
    turn: number,
    operationName?: string,
    existingOperationStartedTurn?: number,
): boolean {
    return !isEliteReservedForHistoricalOperation(brigadeId, turn)
        || (operationName != null
            && isEliteAuthoredForHistoricalOperation(brigadeId, operationName))
        // Operation Cincar / Kupres is authored before the Mistral reservation
        // begins. Preserve its already-active Kralj Tomislav commitment for the
        // two overlapping turns without allowing a new Cincar admission.
        || (brigadeId === 'F_HRHB_0001'
            && operationName === 'Operation Cincar / Kupres'
            && existingOperationStartedTurn === 132
            && turn >= 154
            && turn <= 155);
}
