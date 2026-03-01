export interface FrontWidthMetrics {
    front_width_score: number;
    overextended: boolean;
}

/**
 * Deterministic front-width heuristic for UI feedback.
 * Higher score = broader sector frontage per brigade.
 */
export function computeFrontWidthMetrics(
    settlementCount: number,
    brigadeCount: number
): FrontWidthMetrics {
    const brigades = Math.max(1, brigadeCount);
    const score = settlementCount / brigades;
    return {
        front_width_score: score,
        overextended: score > 12,
    };
}

