/**
 * Convert a turn number to a calendar year (1992-1995).
 * 52 turns per year, clamped to [1992, 1995].
 */
export function getYearForTurn(turn: number): number {
    if (turn < 0 || !Number.isFinite(turn)) return 1992;
    const yearOffset = Math.floor(turn / 52);
    return Math.min(1995, 1992 + yearOffset);
}
