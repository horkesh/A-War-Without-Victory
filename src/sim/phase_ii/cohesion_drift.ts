/**
 * Phase II: Ambient cohesion drift by faction/turn (Part 7b) and manpower exhaustion penalty (Part 7c).
 * RS decays over time; RBiH improves; HRHB stable. Exhaustion penalty when pool ratio exceeds threshold.
 * Skipped for formations engaged in combat this turn (use engaged_formation_ids from attack resolution report).
 * Deterministic: formations and pool keys in sorted order.
 */

import type { FactionId, FormationId, FormationState, GameState, MilitiaPoolState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getEnclaveCohesionRecovery } from './enclave_resilience.js';
import { getFactionCohesionCeiling, getFactionCohesionFloor } from './faction_progression.js';

const EXHAUSTION_COHESION_THRESHOLD = 0.8;
const EXHAUSTION_COHESION_PENALTY = -0.5;
const CRITICAL_EXHAUSTION_THRESHOLD = 0.95;
const CRITICAL_EXHAUSTION_PENALTY = -1.5;

/** Compute faction exhaustion ratio: committed / (committed + available). Deterministic. */
function getFactionExhaustionRatio(state: GameState, faction: FactionId): number {
    const pools = state.militia_pools;
    if (!pools || typeof pools !== 'object') return 0;
    let committed = 0;
    let available = 0;
    const keys = (Object.keys(pools) as string[]).sort(strictCompare);
    for (const key of keys) {
        const p = (pools as Record<string, MilitiaPoolState>)[key];
        if (p?.faction !== faction) continue;
        committed += p.committed ?? 0;
        available += p.available ?? 0;
    }
    const total = committed + available;
    return total <= 0 ? 0 : committed / total;
}

/**
 * Ambient cohesion drift per turn by faction and turn number.
 *
 * Tuned to match historical operational tempo:
 * - VRS: JNA inheritance gives organizational stability through the first year.
 *   Cohesion decays slowly — faster than it recovers from defend posture (+1/turn)
 *   but slow enough that combat units can sustain operations with rest rotations.
 * - RBiH: Starts disorganized but improves steadily (building cohesion over time).
 * - HRHB: Stable small-force dynamics.
 *
 * VRS drift was previously -0.15/turn from week 22, which killed all offensive
 * capability by week 35. Historically VRS maintained offensive operations throughout
 * 1992-93 (corridor, Drina valley, Bihac, Gorazde operations spanning 2+ years).
 */
function getFactionCohesionDrift(faction: string, turn: number): number {
    if (faction === 'RS') {
        // VRS: JNA-inherited organization is resilient.
        // Slow decay starts at week 30 (turn 39), accelerates only in year 2+.
        if (turn <= 39) return 0;             // Weeks 1-30: stable (JNA inheritance)
        if (turn <= 52) return -0.05;         // Weeks 30-52: very slow decay
        if (turn <= 78) return -0.10;         // Year 1.5: moderate decay
        if (turn <= 104) return -0.20;        // Year 2: noticeable decay
        return -0.35;                          // Year 2+: significant but not catastrophic
    }
    if (faction === 'RBiH') {
        // ARBiH: starts weak, improves as TOs organize into brigades
        if (turn <= 12) return 0.4;            // Weeks 1-12: rapid organization
        if (turn <= 26) return 0.3;            // Weeks 12-26: continued improvement
        if (turn <= 52) return 0.15;           // Weeks 26-52: slowing improvement
        if (turn <= 78) return 0.10;
        if (turn <= 104) return 0.05;
        return 0.03;
    }
    if (faction === 'HRHB') {
        if (turn <= 52) return 0.05;
        return 0;
    }
    return 0;
}

export interface CohesionDriftReport {
    formations_updated: number;
    by_faction: Record<string, number>;
    exhaustion_penalties_applied?: Record<string, number>;
}

/**
 * Apply ambient cohesion drift and exhaustion penalty to brigades not engaged in combat this turn.
 * Mutates state.formations. Deterministic.
 */
export function runPhaseIICohesionDrift(
    state: GameState,
    engagedFormationIds: FormationId[] | Set<string>
): CohesionDriftReport {
    const report: CohesionDriftReport = { formations_updated: 0, by_faction: {} };
    const engagedSet = engagedFormationIds instanceof Set
        ? engagedFormationIds
        : new Set(engagedFormationIds);
    const formations = state.formations ?? {};
    const turn = state.meta.turn;
    const factionIds = (state.factions ?? []).map((x) => x.id).filter((x): x is FactionId => typeof x === 'string').sort(strictCompare);
    const exhaustionPenaltyByFaction: Record<string, number> = {};
    for (const fid of factionIds) {
        const ratio = getFactionExhaustionRatio(state, fid);
        if (ratio >= CRITICAL_EXHAUSTION_THRESHOLD) exhaustionPenaltyByFaction[fid] = CRITICAL_EXHAUSTION_PENALTY;
        else if (ratio >= EXHAUSTION_COHESION_THRESHOLD) exhaustionPenaltyByFaction[fid] = EXHAUSTION_COHESION_PENALTY;
    }
    if (Object.keys(exhaustionPenaltyByFaction).length > 0) report.exhaustion_penalties_applied = exhaustionPenaltyByFaction;

    const formationIds = (Object.keys(formations) as FormationId[]).sort(strictCompare);
    for (const id of formationIds) {
        if (engagedSet.has(id)) continue;
        const f = formations[id] as FormationState | undefined;
        if (!f || (f.kind !== 'brigade' && f.kind !== 'operational_group')) continue;
        const faction = f.faction;
        if (!faction) continue;
        let drift = getFactionCohesionDrift(faction, turn);
        const exhaustionPenalty = exhaustionPenaltyByFaction[faction];
        if (exhaustionPenalty != null) drift += exhaustionPenalty;
        // B4: Enclave cohesion recovery — besieged formations adapt over time
        const enclaveRecovery = getEnclaveCohesionRecovery(state, f.location_osid);
        drift += enclaveRecovery;
        const prev = Math.max(0, Math.min(100, f.cohesion ?? 60));
        // Apply drift
        let next = Math.max(0, Math.min(100, prev + drift));
        // C1: Clamp to faction cohesion floor (ARBiH professionalization) and ceiling (RS decay)
        const floor = getFactionCohesionFloor(faction, turn);
        const ceiling = getFactionCohesionCeiling(faction, turn);
        if (next < floor) next = floor;
        if (next > ceiling) next = ceiling;
        if (next === prev) continue;
        (f as { cohesion?: number }).cohesion = next;
        report.formations_updated += 1;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + 1;
    }
    return report;
}
