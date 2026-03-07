/**
 * Brigade dissolution — automatically dissolve combat-ineffective brigades.
 *
 * Criteria (ALL must be true):
 * - personnel < DISSOLUTION_PERSONNEL_THRESHOLD (200)
 * - cohesion <= DISSOLUTION_COHESION_THRESHOLD (10)
 * - readiness === 'degraded'
 *
 * On dissolution:
 * - status = 'inactive', lifecycle_status = 'destroyed'
 * - Remaining personnel × DISSOLUTION_PERSONNEL_TO_RESERVE_RATE added to faction strategic reserve
 * - Equipment transferred to nearest same-corps active brigade (70% salvaged)
 * - Logged in report
 *
 * Deterministic: sorted iteration by formation ID via strictCompare.
 */

import type { FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export const DISSOLUTION_PERSONNEL_THRESHOLD = 200;
export const DISSOLUTION_COHESION_THRESHOLD = 10;
export const DISSOLUTION_PERSONNEL_TO_RESERVE_RATE = 0.5;
export const DISSOLUTION_EQUIPMENT_TRANSFER_RATE = 0.7;

export interface DissolutionReport {
    dissolved_count: number;
    dissolved_brigades: Array<{
        id: string;
        name: string;
        faction: string;
        personnel_remaining: number;
        cohesion: number;
        morale: number;
        personnel_to_reserve: number;
    }>;
}

export function dissolveCombatIneffectiveBrigades(state: GameState): DissolutionReport {
    const report: DissolutionReport = { dissolved_count: 0, dissolved_brigades: [] };
    const formations = state.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => strictCompare(a, b));

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;

        const personnel = f.personnel ?? 0;
        const cohesion = f.cohesion ?? 0;
        const readiness = f.readiness;

        // Check dissolution criteria — ALL must be true
        if (personnel >= DISSOLUTION_PERSONNEL_THRESHOLD) continue;
        if (cohesion > DISSOLUTION_COHESION_THRESHOLD) continue;
        if (readiness !== 'degraded') continue;

        // Dissolve
        const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);

        // Add personnel to strategic reserve
        if (state.strategic_reserves && f.faction) {
            const factionReserve = state.strategic_reserves[f.faction];
            if (typeof factionReserve === 'number') {
                (state.strategic_reserves as Record<string, number>)[f.faction] = factionReserve + personnelToReserve;
            }
        }

        // Transfer equipment to nearest same-corps active brigade
        if (f.composition && f.corps_id) {
            const salvageRate = DISSOLUTION_EQUIPMENT_TRANSFER_RATE;
            const tanksToTransfer = Math.floor((f.composition.tanks ?? 0) * salvageRate);
            const artilleryToTransfer = Math.floor((f.composition.artillery ?? 0) * salvageRate);

            // Find first alphabetically in same corps (deterministic)
            let targetBrigade: FormationState | null = null;
            for (const tid of formationIds) {
                const t = formations[tid];
                if (!t || t.status !== 'active' || tid === fid) continue;
                if (t.faction !== f.faction || t.corps_id !== f.corps_id) continue;
                if (t.kind !== 'brigade' && t.kind !== 'og') continue;
                targetBrigade = t;
                break;
            }

            if (targetBrigade && targetBrigade.composition) {
                targetBrigade.composition.tanks = (targetBrigade.composition.tanks ?? 0) + tanksToTransfer;
                targetBrigade.composition.artillery = (targetBrigade.composition.artillery ?? 0) + artilleryToTransfer;
            }
        }

        // Record dissolution
        report.dissolved_brigades.push({
            id: fid,
            name: f.name ?? fid,
            faction: f.faction ?? 'unknown',
            personnel_remaining: personnel,
            cohesion,
            morale: f.morale ?? 0,
            personnel_to_reserve: personnelToReserve,
        });

        // Mark as destroyed
        f.status = 'inactive';
        f.lifecycle_status = 'destroyed';
        f.personnel = 0;

        report.dissolved_count++;
    }

    return report;
}
