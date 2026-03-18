/**
 * Brigade auto-propose logic for ops planning.
 * Pure logic — no React, easily testable.
 */
import type { FormationView } from '../../data/types';

const COMBAT_INEFFECTIVE_THRESHOLD = 400;
const DEFAULT_MAX_BRIGADES = 12;
const MARCH_DISTANCE_PER_TURN = 0.15; // ~15km in degrees

export interface ProposedBrigade {
    brigadeId: string;
    score: number;
    marchTurns: number;
    isAutoProposed: boolean;
}

export function estimateMarchTurns(
    brigadeOsid: string,
    stagingOsid: string,
    centroidLookup: Map<string, [number, number]>,
): number {
    if (brigadeOsid === stagingOsid) return 0;
    const from = centroidLookup.get(brigadeOsid);
    const to = centroidLookup.get(stagingOsid);
    if (!from || !to) return 99;
    const dist = Math.sqrt((from[0] - to[0]) ** 2 + (from[1] - to[1]) ** 2);
    return Math.max(1, Math.ceil(dist / MARCH_DISTANCE_PER_TURN));
}

export function autoProposeBrigades(
    corpsBrigades: FormationView[],
    objectiveOsids: string[],
    centroidLookup: Map<string, [number, number]>,
    maxBrigades: number = DEFAULT_MAX_BRIGADES,
    stagingOsid?: string,
): ProposedBrigade[] {
    if (corpsBrigades.length === 0 || objectiveOsids.length === 0) return [];

    const eligible = corpsBrigades.filter((b) =>
        b.status === 'active' &&
        (b.personnel ?? 0) >= COMBAT_INEFFECTIVE_THRESHOLD &&
        !b.disrupted_turns &&
        b.kind === 'brigade'
    );

    const scored = eligible.map((b) => {
        // Proximity: min distance to any objective
        let minDist = Infinity;
        const bPos = centroidLookup.get(b.location_osid ?? '');
        if (bPos) {
            for (const obj of objectiveOsids) {
                const oPos = centroidLookup.get(obj);
                if (oPos) {
                    const d = Math.sqrt((bPos[0] - oPos[0]) ** 2 + (bPos[1] - oPos[1]) ** 2);
                    if (d < minDist) minDist = d;
                }
            }
        }
        const proximityScore = minDist === Infinity ? 0 : 1.0 / (1 + minDist * 10);

        const pers = b.personnel ?? 0;
        const tanks = b.composition?.tanks ?? 0;
        const arty = b.composition?.artillery ?? 0;
        const combatPowerScore = Math.min(1, (pers + tanks * 50 + arty * 30) / 5000);

        const coh = (b.cohesion ?? 50) / 100;
        const fat = (b.fatigue ?? 0) / 30;
        const readinessScore = coh * (1 - Math.min(1, fat));

        const totalScore = proximityScore * 0.5 + combatPowerScore * 0.3 + readinessScore * 0.2;

        const marchTurns = stagingOsid && b.location_osid
            ? estimateMarchTurns(b.location_osid, stagingOsid, centroidLookup)
            : 99;

        return { brigadeId: b.id, score: totalScore, marchTurns, isAutoProposed: true };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxBrigades);
}
