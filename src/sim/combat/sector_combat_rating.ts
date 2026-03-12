/**
 * Sector Combat Power Rating: per-sector offensive and defensive strength aggregation.
 *
 * Computes clear, player-visible numbers for each sector:
 * - offensive_power: how hard this sector can hit
 * - defensive_power: how well this sector can hold
 * - defense_per_edge: defensive power spread across front edges
 * - strength_class: fortress/strong/adequate/thin/critical
 *
 * Pipeline step: runs after partition-corps-front-sectors, before bot AI decisions.
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type {
    CorpsFrontSector,
    FormationState,
    GameState,
    SectorCombatRating,
    SectorStrengthClass,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    computeAttackerPower,
    computeDefenderPower,
    getConcentrationBonus,
} from './combat_math.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';

// ── Strength classification thresholds ──────────────────────────────────────
// Based on average brigade attack power (~800-1200 for a healthy VRS brigade).
// defense_per_edge vs reference attacker power determines class.
const REFERENCE_ATTACKER_POWER = 1000;

function classifyStrength(defensePerEdge: number): SectorStrengthClass {
    const ratio = defensePerEdge / REFERENCE_ATTACKER_POWER;
    if (ratio > 2.0) return 'fortress';
    if (ratio > 1.5) return 'strong';
    if (ratio > 1.0) return 'adequate';
    if (ratio > 0.5) return 'thin';
    return 'critical';
}

export interface SectorCombatRatingReport {
    sectors_rated: number;
    by_faction: Record<string, number>;
}

/**
 * Compute sector combat ratings for all corps front sectors.
 * Stores results in state.military.sector_combat_ratings.
 */
export function computeSectorCombatRatings(
    state: GameState,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    terrainMultByOsid?: Record<string, number>
): SectorCombatRatingReport {
    const report: SectorCombatRatingReport = { sectors_rated: 0, by_faction: {} };
    const sectors = state.military.corps_front_sectors;
    if (!sectors) {
        state.military.sector_combat_ratings = {};
        return report;
    }

    const formations = state.military.formations ?? {};
    const ratings: Record<string, SectorCombatRating> = {};
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    const tMult = terrainMultByOsid ?? {};

    for (const sid of sectorIds) {
        const sector = sectors[sid] as CorpsFrontSector;
        if (!sector) continue;

        // Gather active brigades in this sector
        const brigades: FormationState[] = [];
        for (const bid of sector.assigned_brigade_ids) {
            const f = formations[bid];
            if (f && f.status === 'active') brigades.push(f);
        }

        if (brigades.length === 0) {
            ratings[sid] = {
                sector_id: sid,
                faction: sector.faction,
                offensive_power: 0,
                defensive_power: 0,
                defense_per_edge: 0,
                personnel: 0,
                morale_avg: 0,
                cohesion_avg: 0,
                fatigue_avg: 0,
                edge_count: sector.length_edges,
                brigade_count: 0,
                strength_class: 'critical',
            };
            report.sectors_rated++;
            report.by_faction[sector.faction] = (report.by_faction[sector.faction] ?? 0) + 1;
            continue;
        }

        // Pick a representative OSID for terrain (first friendly OSID in first sub-segment)
        const repOsid = sector.sub_segments?.[0]?.friendly_osids?.[0] ?? sector.territory_osids?.[0] ?? '';
        const repTerrainMult = tMult[repOsid] ?? 1.0;

        // Compute per-brigade powers
        let totalOffPower = 0;
        let totalDefPower = 0;
        let totalPersonnel = 0;
        let totalMorale = 0;
        let totalCohesion = 0;
        let totalFatigue = 0;

        for (const b of brigades) {
            // Offensive: use 'attack' posture override
            const offPow = computeAttackerPower(state, b, supplyStateByOsid, 'attack', repTerrainMult, repOsid);
            totalOffPower += offPow;

            // Defensive: use actual posture and representative terrain
            const defPow = computeDefenderPower(state, b, repOsid, tMult, 0, supplyStateByOsid);
            totalDefPower += defPow;

            totalPersonnel += b.personnel ?? 0;
            totalMorale += b.morale ?? 50;
            totalCohesion += b.cohesion ?? 60;
            totalFatigue += b.ops?.fatigue ?? 0;
        }

        const bc = brigades.length;
        // Apply concentration potential to offensive power
        const concBonus = getConcentrationBonus(Math.min(4, bc));
        const offensivePower = Math.round(totalOffPower * concBonus);

        const edges = Math.max(1, sector.length_edges);
        const defensePerEdge = Math.round(totalDefPower / edges);

        const rating: SectorCombatRating = {
            sector_id: sid,
            faction: sector.faction,
            offensive_power: offensivePower,
            defensive_power: Math.round(totalDefPower),
            defense_per_edge: defensePerEdge,
            personnel: totalPersonnel,
            morale_avg: Math.round(totalMorale / bc),
            cohesion_avg: Math.round(totalCohesion / bc),
            fatigue_avg: Math.round((totalFatigue / bc) * 10) / 10,
            edge_count: sector.length_edges,
            brigade_count: bc,
            strength_class: classifyStrength(defensePerEdge),
        };

        ratings[sid] = rating;
        report.sectors_rated++;
        report.by_faction[sector.faction] = (report.by_faction[sector.faction] ?? 0) + 1;
    }

    state.military.sector_combat_ratings = ratings;
    return report;
}
