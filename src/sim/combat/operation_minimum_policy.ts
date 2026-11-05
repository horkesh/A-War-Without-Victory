/** Shared CorpsOperation live-roster minimum policy. */
export const MIN_BRIGADES_BY_OPERATION_TYPE: Readonly<Record<string, number>> = Object.freeze({
    probe: 1,
    feint: 1,
    sector_attack: 2,
    general_offensive: 2,
    strategic_defense: 1,
    reorganization: 0,
});

/** Match construction: clamp an authored override to one; otherwise use the type default. */
export function effectiveOperationMinimum(
    operationType: string,
    minimumViableParticipants?: number | null,
): number {
    return minimumViableParticipants != null
        ? Math.max(1, Math.trunc(minimumViableParticipants))
        : (MIN_BRIGADES_BY_OPERATION_TYPE[operationType] ?? 2);
}
