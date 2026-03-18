/**
 * Part C: War Arc — ARBiH professionalization + RS degradation.
 *
 * C1: Progressive cohesion floor (ARBiH rises) and ceiling (RS declines).
 * C2: Equipment progression (ARBiH gains, HRHB moderate gains, RS no additions).
 * C3: RS maintenance capacity decay (spare parts shortage without JNA resupply).
 *
 * Deterministic: sorted iteration, pure arithmetic, no randomness.
 *
 * Historical basis:
 * - ARBiH transformed from chaotic TO militia to 200k professional army by 1994 (BB1).
 *   1993 reorganization under Delic created standardized doctrine. By Sep 1993 ARBiH
 *   launched Operation Neretva 93 (corps-level coordination).
 * - VRS peaked at 12 May 1992 JNA conversion; thereafter degraded: desertion, officer
 *   attrition, equipment wear without replacement, demographic exhaustion (BB2).
 */

import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import type { WarTimeline } from '../../state/war_timeline.js';
import { computeMaintenanceMult as computeMaintenanceMultFromConfig, resolveCohesionBound } from '../../state/war_timeline.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── C1: Cohesion floor and ceiling ──────────────────────────────────────────

/**
 * ARBiH cohesion floor: no formation drifts below this.
 * Models organizational professionalization over time.
 *
 * Turn 0:  35 (TO militia, minimal organization)
 * Turn 13: 42 (spring/summer 1992 consolidation)
 * Turn 26: 50 (autumn 1992 brigade-level organization)
 * Turn 39: 56 (spring 1993, corps reorganization underway)
 * Turn 52: 62 (professional army, corps-level ops)
 */
function getRBiHCohesionFloor(turn: number): number {
    if (turn <= 0) return 35;
    if (turn >= 52) return 62;
    // Linear interpolation between keyframes
    const keyframes: [number, number][] = [[0, 35], [13, 42], [26, 50], [39, 56], [52, 62]];
    for (let i = 0; i < keyframes.length - 1; i++) {
        const [t0, v0] = keyframes[i]!;
        const [t1, v1] = keyframes[i + 1]!;
        if (turn >= t0 && turn <= t1) {
            const frac = (turn - t0) / (t1 - t0);
            return v0 + frac * (v1 - v0);
        }
    }
    return 62;
}

/**
 * RS cohesion floor: no formation drifts below this.
 * Models VRS professional JNA cadre sustaining unit cohesion under attrition.
 *
 * Turn 0:  35 (JNA inherited professionalism — trained NCO/officer corps)
 * Turn 40: 35 (sustained professionalism through first year)
 * Turn 60: 25 (war fatigue, partial mobilization strain)
 * Turn 80: 20 (deep fatigue, reorganization)
 */
function getRSCohesionFloor(turn: number): number {
    if (turn <= 0) return 35;
    if (turn >= 80) return 20;
    const keyframes: [number, number][] = [[0, 35], [40, 35], [60, 25], [80, 20]];
    for (let i = 0; i < keyframes.length - 1; i++) {
        const [t0, v0] = keyframes[i]!;
        const [t1, v1] = keyframes[i + 1]!;
        if (turn >= t0 && turn <= t1) {
            const frac = (turn - t0) / (t1 - t0);
            return v0 + frac * (v1 - v0);
        }
    }
    return 20;
}

/**
 * HRHB cohesion floor: starts at 40 (Croatian cadre baseline),
 * drops to 30 after week 52 (two-front war pressure from 1993).
 * Historical: HVO suffered severe cohesion collapse when fighting
 * both VRS and ARBiH simultaneously.
 */
function getHRHBCohesionFloor(turn: number): number {
    if (turn <= 52) return 40;
    return 30;
}

/**
 * RS cohesion ceiling: no formation rises above this.
 * Models organizational decay — JNA professionalism eroding.
 *
 * Turn 0:  85 (JNA professional peak)
 * Turn 13: 82 (early attrition, still very capable)
 * Turn 26: 78 (officer losses, some indiscipline)
 * Turn 39: 73 (desertion rising, unit fragmentation)
 * Turn 52: 68 (still capable but degraded organization)
 */
function getRSCohesionCeiling(turn: number): number {
    if (turn <= 0) return 85;
    if (turn >= 52) return 68;
    const keyframes: [number, number][] = [[0, 85], [13, 82], [26, 78], [39, 73], [52, 68]];
    for (let i = 0; i < keyframes.length - 1; i++) {
        const [t0, v0] = keyframes[i]!;
        const [t1, v1] = keyframes[i + 1]!;
        if (turn >= t0 && turn <= t1) {
            const frac = (turn - t0) / (t1 - t0);
            return v0 + frac * (v1 - v0);
        }
    }
    return 68;
}

/**
 * Returns the cohesion floor for a faction at a given turn.
 * When timeline is provided, uses its cohesion_floor; falls back to hardcoded values.
 * ARBiH: rising floor (professionalization).
 * HRHB: time-varying (40 early war → 30 after w52, two-front pressure).
 * RS: declining floor (JNA inheritance decays).
 */
export function getFactionCohesionFloor(faction: string, turn: number, timeline?: WarTimeline): number {
    if (timeline?.cohesion_floor?.[faction] !== undefined) {
        const hardcodedDefault = faction === 'RBiH' ? getRBiHCohesionFloor(turn) : faction === 'HRHB' ? getHRHBCohesionFloor(turn) : getRSCohesionFloor(turn);
        return resolveCohesionBound(timeline.cohesion_floor[faction], turn, hardcodedDefault);
    }
    if (faction === 'RBiH') return getRBiHCohesionFloor(turn);
    if (faction === 'HRHB') return getHRHBCohesionFloor(turn);
    return getRSCohesionFloor(turn);
}

/**
 * Returns the cohesion ceiling for a faction at a given turn.
 * When timeline is provided, uses its cohesion_ceiling; falls back to hardcoded values.
 * RS: declining ceiling (organizational decay).
 * Others: 100 (no ceiling constraint).
 */
export function getFactionCohesionCeiling(faction: string, turn: number, timeline?: WarTimeline): number {
    if (timeline?.cohesion_ceiling?.[faction] !== undefined) {
        const hardcodedDefault = faction === 'RS' ? getRSCohesionCeiling(turn) : 100;
        return resolveCohesionBound(timeline.cohesion_ceiling[faction], turn, hardcodedDefault);
    }
    if (faction === 'RS') return getRSCohesionCeiling(turn);
    return 100; // No ceiling for other factions
}

// ── C2: Equipment progression ───────────────────────────────────────────────

export interface EquipmentProgressionReport {
    artillery_additions: number;
    tank_additions: number;
    by_faction: Record<string, { artillery: number; tanks: number }>;
}

/**
 * Apply equipment progression for all active formations.
 * Called every 4 turns from the pipeline.
 *
 * RBiH: Gradual equipment acquisition through capture, smuggling, local production.
 *   - Every 8 turns: +1 artillery (Zenica steelworks, Igman workshops)
 *   - Every 16 turns if combat experienced: +1 tank (captured)
 *   - After turn 20: eligible for equipment_class upgrade
 *
 * HRHB: Croatian supply pipeline.
 *   - Every 12 turns: +1 artillery (Croatian military transfers)
 *   - Every 24 turns: +1 tank (Croatian army surplus)
 *
 * RS: No equipment additions (peaked at JNA inheritance).
 *   Existing degradation system handles decline.
 *
 * Deterministic: sorted iteration, integer arithmetic.
 */
export function runEquipmentProgression(state: GameState): EquipmentProgressionReport {
    const turn = state.meta.turn ?? 0;
    const report: EquipmentProgressionReport = {
        artillery_additions: 0,
        tank_additions: 0,
        by_faction: {}
    };

    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);

    for (const fid of formationIds) {
        const f = formations[fid] as FormationState | undefined;
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'operational_group') continue;
        const comp = f.composition;
        if (!comp) continue;

        const faction = f.faction;
        if (!report.by_faction[faction]) {
            report.by_faction[faction] = { artillery: 0, tanks: 0 };
        }
        const facReport = report.by_faction[faction]!;

        // Per-brigade auto-tickers removed (n898) — produced 243 ARBiH tanks / 668 artillery.
        // Primary equipment source is now battlefield scavenging + combat capture.
        // RS: no production (Serbia under sanctions) — degradation-only.
    }

    // ── Faction-level production (capped budgets, not per-brigade) ──────────
    // These are small, historically-grounded production/transfer pipelines.
    // Equipment goes to the best-equipped active brigade in the faction (deterministic).

    if (turn > 0) {
        // ARBiH: Zenica steelworks — improvised mortars/howitzers.
        // ~3 artillery pieces per 8 turns (faction total, not per-brigade).
        if (turn % 8 === 0) {
            distributeEquipmentToFaction(formations, formationIds, 'RBiH', 'artillery', 3, report);
        }

        // Arms smuggling pipeline through Croatia — ARBiH gets a trickle of
        // heavy weapons from abroad (Iran, Pakistan, black market), but HVO/Croatia
        // skims ~40% of every shipment passing through Croatian territory.
        // Every 12 turns: 2 tanks + 3 artillery enter; ARBiH gets 60%, HVO gets 40%.
        if (turn % 12 === 0) {
            const smuggleTanks = 2;
            const smuggleArtillery = 3;
            const hvocut = 0.40;
            const rbihTanks = Math.max(1, Math.round(smuggleTanks * (1 - hvocut)));   // 1
            const hrhbTanks = smuggleTanks - rbihTanks;                                // 1
            const rbihArt = Math.max(1, Math.round(smuggleArtillery * (1 - hvocut)));  // 2
            const hrhbArt = smuggleArtillery - rbihArt;                                // 1
            distributeEquipmentToFaction(formations, formationIds, 'RBiH', 'tanks', rbihTanks, report);
            distributeEquipmentToFaction(formations, formationIds, 'RBiH', 'artillery', rbihArt, report);
            distributeEquipmentToFaction(formations, formationIds, 'HRHB', 'tanks', hrhbTanks, report);
            distributeEquipmentToFaction(formations, formationIds, 'HRHB', 'artillery', hrhbArt, report);
        }

        // HRHB: Croatian Army (HV) direct transfers — separate from smuggle line.
        // HVO gets its own pipeline from Zagreb: ~1 artillery per 12 turns.
        if (turn % 12 === 0) {
            distributeEquipmentToFaction(formations, formationIds, 'HRHB', 'artillery', 1, report);
        }
    }

    return report;
}

/**
 * Distribute a fixed equipment budget to the best-equipped active brigade in a faction.
 * "Best-equipped" = highest existing count of the given type (deterministic tie-break by ID).
 * This concentrates production where it matters most — mechanized/motorized brigades
 * that already have heavy equipment, not light infantry.
 */
function distributeEquipmentToFaction(
    formations: Record<string, FormationState>,
    formationIds: string[],
    faction: FactionId,
    type: 'tanks' | 'artillery',
    amount: number,
    report: EquipmentProgressionReport
): void {
    let bestId: string | null = null;
    let bestCount = -1;
    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.faction !== faction) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;
        const comp = f.composition;
        if (!comp) continue;
        const count = comp[type] ?? 0;
        if (count > bestCount) {
            bestCount = count;
            bestId = fid;
        }
    }
    if (bestId && formations[bestId]?.composition) {
        formations[bestId].composition![type] += amount;
        if (!report.by_faction[faction]) {
            report.by_faction[faction] = { artillery: 0, tanks: 0 };
        }
        if (type === 'tanks') {
            report.tank_additions += amount;
            report.by_faction[faction]!.tanks += amount;
        } else {
            report.artillery_additions += amount;
            report.by_faction[faction]!.artillery += amount;
        }
    }
}

// ── C3: RS maintenance capacity decay ───────────────────────────────────────

/**
 * RS maintenance capacity multiplier: declines as spare parts are depleted.
 * JNA depot stocks run out; no external resupply (Serbia under sanctions from May 1992).
 *
 * Turn 0:  1.0  (full JNA maintenance infrastructure)
 * Turn 26: 0.87 (spare parts shortage beginning)
 * Turn 52: 0.74 (significant depot depletion)
 *
 * Applied as a multiplier to the base maintenance capacity in equipment degradation.
 * By week 52: RS tanks ~13 operational (from 40), artillery ~10 (from 30).
 */
export function getRSMaintenanceCapacityMult(turn: number, timeline?: WarTimeline): number {
    if (timeline?.maintenance_decay) {
        const config = timeline.maintenance_decay.find(c => c.faction === 'RS');
        if (config) return computeMaintenanceMultFromConfig(config, turn);
    }
    if (turn <= 0) return 1.0;
    return Math.max(0.5, 1.0 - turn / 200);
}
