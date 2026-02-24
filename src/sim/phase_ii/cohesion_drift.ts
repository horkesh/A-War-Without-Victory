/**
 * Phase II: Ambient cohesion drift by faction/turn (Part 7b) and manpower exhaustion penalty (Part 7c).
 * RS decays over time; RBiH improves; HRHB stable. Exhaustion penalty when pool ratio exceeds threshold.
 * Skipped for formations engaged in combat this turn (use engaged_formation_ids from attack resolution report).
 * Deterministic: formations and pool keys in sorted order.
 */

import type { FactionId, FormationId, FormationState, GameState, MilitiaPoolState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

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

function getFactionCohesionDrift(faction: string, turn: number): number {
    if (faction === 'RS') {
        if (turn <= 26) return 0;
        if (turn <= 52) return -0.15;
        if (turn <= 78) return -0.3;
        if (turn <= 104) return -0.5;
        return -0.7;
    }
    if (faction === 'RBiH') {
        if (turn <= 12) return 0.4;
        if (turn <= 26) return 0.3;
        if (turn <= 52) return 0.2;
        if (turn <= 78) return 0.15;
        if (turn <= 104) return 0.1;
        return 0.05;
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
        if (drift === 0) continue;
        const prev = Math.max(0, Math.min(100, f.cohesion ?? 60));
        const next = Math.max(0, Math.min(100, prev + drift));
        (f as { cohesion?: number }).cohesion = next;
        report.formations_updated += 1;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + 1;
    }
    return report;
}
