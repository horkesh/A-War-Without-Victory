/**
 * War-phase ambient cohesion drift by faction/turn (Part 7b) and manpower exhaustion penalty (Part 7c).
 * RS decays over time; RBiH improves; HRHB stable. Exhaustion penalty when pool ratio exceeds threshold.
 * Skipped for formations engaged in combat this turn (use engaged_formation_ids from attack resolution report).
 * Deterministic: formations and pool keys in sorted order.
 */

import type { FactionId, FormationId, FormationState, GameState, MilitiaPoolState } from '../../state/game_state.js';
import type { WarTimeline } from '../../state/war_timeline.js';
import { lookupStepCurve } from '../../state/war_timeline.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getEnclaveCohesionRecovery } from './enclave_resilience.js';
import { getFactionCohesionCeiling, getFactionCohesionFloor } from './faction_progression.js';

/** Faction-specific exhaustion thresholds. RS had JNA logistics infrastructure —
 *  organizational strain sets in later (higher threshold). RBiH and HRHB are ad-hoc
 *  forces that feel exhaustion earlier. */
const EXHAUSTION_COHESION_THRESHOLD: Record<string, number> = {
    RS: 0.92,    // JNA logistics: cohesion strain only at very high commitment
    RBiH: 0.80,  // Ad-hoc militia: strain earlier
    HRHB: 0.85   // Croatian cadre support: moderate resilience
};
const EXHAUSTION_COHESION_PENALTY = -0.5;
const CRITICAL_EXHAUSTION_THRESHOLD = 0.97;
const CRITICAL_EXHAUSTION_PENALTY = -1.5;

/** Compute faction exhaustion ratio: committed / (committed + available). Deterministic. */
function getFactionExhaustionRatio(state: GameState, faction: FactionId): number {
    const pools = state.military.militia_pools;
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

function isFormationInOpsecSector(state: GameState, formation: FormationState): boolean {
    const opsecSectors = state.military.opsec_sectors ?? [];
    if (opsecSectors.length === 0 || !formation.location_osid || !state.military.corps_front_sectors) return false;
    const activeOpsec = new Set(opsecSectors);
    for (const sectorId of activeOpsec) {
        const sector = state.military.corps_front_sectors[sectorId];
        if (!sector || sector.faction !== formation.faction) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            if (subSegment.friendly_osids.includes(formation.location_osid)) {
                return true;
            }
        }
    }
    return false;
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
function getFactionCohesionDrift(faction: string, turn: number, timeline?: WarTimeline): number {
    // Timeline-driven when available
    if (timeline?.cohesion_drift?.[faction]) {
        return lookupStepCurve(timeline.cohesion_drift[faction], turn, 0);
    }
    // Hardcoded fallback
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
export function runCohesionDrift(
    state: GameState,
    engagedFormationIds: FormationId[] | Set<string>
): CohesionDriftReport {
    const report: CohesionDriftReport = { formations_updated: 0, by_faction: {} };
    const engagedSet = engagedFormationIds instanceof Set
        ? engagedFormationIds
        : new Set(engagedFormationIds);
    const formations = state.military.formations ?? {};
    const turn = state.meta.turn;
    const factionIds = (state.factions ?? []).map((x) => x.id).filter((x): x is FactionId => typeof x === 'string').sort(strictCompare);
    const exhaustionPenaltyByFaction: Record<string, number> = {};
    for (const fid of factionIds) {
        const ratio = getFactionExhaustionRatio(state, fid);
        const threshold = EXHAUSTION_COHESION_THRESHOLD[fid] ?? 0.80;
        if (ratio >= CRITICAL_EXHAUSTION_THRESHOLD) exhaustionPenaltyByFaction[fid] = CRITICAL_EXHAUSTION_PENALTY;
        else if (ratio >= threshold) exhaustionPenaltyByFaction[fid] = EXHAUSTION_COHESION_PENALTY;
    }
    if (Object.keys(exhaustionPenaltyByFaction).length > 0) report.exhaustion_penalties_applied = exhaustionPenaltyByFaction;

    const formationIds = (Object.keys(formations) as FormationId[]).sort(strictCompare);
    for (const id of formationIds) {
        if (engagedSet.has(id)) continue;
        const f = formations[id] as FormationState | undefined;
        if (!f || (f.kind !== 'brigade' && f.kind !== 'operational_group')) continue;
        const faction = f.faction;
        if (!faction) continue;
        let drift = getFactionCohesionDrift(faction, turn, state.military.war_timeline);
        const exhaustionPenalty = exhaustionPenaltyByFaction[faction];
        if (exhaustionPenalty != null) drift += exhaustionPenalty;
        // B4: Enclave cohesion recovery — besieged formations adapt over time
        const enclaveRecovery = getEnclaveCohesionRecovery(state, f.location_osid);
        drift += enclaveRecovery;
        if (drift > 0 && isFormationInOpsecSector(state, f)) {
            drift *= 0.5;
        }
        const prev = Math.max(0, Math.min(100, f.cohesion ?? 60));
        // Apply drift
        let next = Math.max(0, Math.min(100, prev + drift));
        // C1: Clamp to faction cohesion floor (ARBiH professionalization) and ceiling (RS decay)
        const floor = getFactionCohesionFloor(faction, turn, state.military.war_timeline);
        const ceiling = getFactionCohesionCeiling(faction, turn, state.military.war_timeline);
        if (next < floor) next = floor;
        if (next > ceiling) next = ceiling;
        if (next === prev) continue;
        (f as { cohesion?: number }).cohesion = next;
        report.formations_updated += 1;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + 1;
    }
    return report;
}

export const runPhaseIICohesionDrift = runCohesionDrift;
