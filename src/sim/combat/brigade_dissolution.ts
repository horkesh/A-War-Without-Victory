/**
 * Brigade dissolution — automatically dissolve combat-ineffective brigades.
 *
 * Criteria (TWO of three must be true):
 * - personnel < DISSOLUTION_PERSONNEL_THRESHOLD (300)
 * - cohesion <= DISSOLUTION_COHESION_THRESHOLD (15)
 * - morale <= DISSOLUTION_MORALE_THRESHOLD (10)
 *
 * Historical: BB1 p.455 confirms brigades were destroyed (9th Grahovo LIB).
 * BB1 p.443: After Srebrenica, survivors reconstituted into 28th Division —
 * old units ceased to exist. Pattern: attrition → ineffectiveness → dissolution.
 *
 * On dissolution:
 * - status = 'inactive', lifecycle_status = 'destroyed'
 * - Remaining personnel × DISSOLUTION_PERSONNEL_TO_RESERVE_RATE added to faction strategic reserve
 * - Equipment transferred to nearest same-corps active brigade (70% salvaged)
 * - Logged in report
 *
 * Deterministic: sorted iteration by formation ID via strictCompare.
 */

import type { FormationId, FormationState, GameState } from '../../state/game_state.js';
import { isEnclaveBrigade } from './enclave_resilience.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Remove a brigade from its corps' active operation (participating_brigades + axes).
 * Must be called BEFORE setting status='inactive' so corps_id is still readable.
 * Follows the pattern established in jna_phantom_brigades.ts.
 */
export function removeFromActiveOperation(state: GameState, brigadeId: FormationId, corpsId: string | undefined | null): void {
    if (!corpsId) return;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return;
    for (const op of cmd.active_operations ?? []) {
        if (!op.participating_brigades.includes(brigadeId)) continue;
        op.participating_brigades = op.participating_brigades.filter(id => id !== brigadeId);
        if (Array.isArray(op.axes)) {
            for (const axis of op.axes) {
                axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== brigadeId);
            }
        }
        break; // A brigade can only be in one operation
    }
}

export const DISSOLUTION_PERSONNEL_THRESHOLD = 400;
export const DISSOLUTION_COHESION_THRESHOLD = 20;
export const DISSOLUTION_MORALE_THRESHOLD = 15;
/** Absolute floor: units below this dissolve regardless of other stats.
 *  A unit of ~150 men is a company remnant — not a brigade. */
export const DISSOLUTION_ABSOLUTE_FLOOR = 150;
/** Enclave brigades use a lower absolute floor — they are last-line defenders
 *  with nowhere to dissolve to. Historically survived at remnant strength (Goražde, Srebrenica). */
export const ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR = 50;
/** Personnel cap: brigades above this can't dissolve from morale+cohesion alone.
 *  A 1400-man brigade with low morale is demoralized, not destroyed —
 *  combat multipliers already penalize it at 30% effectiveness. */
export const DISSOLUTION_PERSONNEL_CAP = 800;
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
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => strictCompare(a, b));

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;

        // #29 sub-issue 1: HV brigades (Croatian Army cross-border deployment,
        // tagged 'hv_origin' at spawn in hv_integration.ts:188) represent
        // committed national-army units. They should only be removed by combat
        // damage, not idle-decay dissolution. Without this skip, HV brigades
        // dissolve at ~t79-t89 in 188w runs (battles_fought=0,
        // total_casualties_taken=0) because cohesion decays below the
        // dissolution threshold while waiting for an offensive op to deploy
        // them — which never happens because of the calendar-event-to-
        // operation pipeline gap (#29 sub-issue 2). Until the operations
        // pipeline lands, this protects the HV asset.
        if (f.tags?.includes('hv_origin')) continue;

        const personnel = f.personnel ?? 0;
        const cohesion = f.cohesion ?? 0;
        const morale = f.morale ?? 50;

        // Enclave brigades have a lower absolute floor — they are last-line defenders
        // with nowhere to dissolve to, and require ALL THREE criteria (not two).
        const isEnclave = isEnclaveBrigade(f);
        const absFloor = isEnclave ? ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR : DISSOLUTION_ABSOLUTE_FLOOR;
        const requiredCriteria = isEnclave ? 3 : 2;

        // Personnel cap: brigades above DISSOLUTION_PERSONNEL_CAP can't dissolve from
        // morale+cohesion alone. A 1400-man brigade with low morale is demoralized, not
        // destroyed — combat multipliers already penalize it at 30% effectiveness.
        if (personnel >= DISSOLUTION_PERSONNEL_CAP) continue;

        // Dissolution criteria: always require at least requiredCriteria to be met.
        // The absolute floor counts as the "low personnel" criterion automatically.
        // A brigade at 140 pers but 60 morale and 56 cohesion is a company-strength
        // unit still willing to fight — it shouldn't auto-dissolve just from being small.
        const lowPersonnel = personnel < DISSOLUTION_PERSONNEL_THRESHOLD || personnel < absFloor;
        const lowCohesion = cohesion <= DISSOLUTION_COHESION_THRESHOLD;
        const lowMorale = morale <= DISSOLUTION_MORALE_THRESHOLD;
        const criteriaCount = (lowPersonnel ? 1 : 0) + (lowCohesion ? 1 : 0) + (lowMorale ? 1 : 0);
        if (criteriaCount < requiredCriteria) continue;

        // Dissolve
        const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);

        // Add personnel to strategic reserve
        if (state.military.strategic_reserves && f.faction) {
            const factionReserve = state.military.strategic_reserves[f.faction];
            if (typeof factionReserve === 'number') {
                (state.military.strategic_reserves as Record<string, number>)[f.faction] = factionReserve + personnelToReserve;
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

            // Zero out dissolved brigade's equipment to prevent duplication on reconstitution.
            // Without this, reconstituted brigades retain their original composition AND
            // the 70% transfer goes to the receiving brigade — duplicating equipment.
            f.composition.tanks = 0;
            f.composition.artillery = 0;
            f.composition.aa_systems = 0;
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

        // Remove from active operation before marking inactive
        removeFromActiveOperation(state, fid, f.corps_id);

        // Mark as destroyed
        f.status = 'inactive';
        f.lifecycle_status = 'destroyed';
        f.personnel = 0;
        // Record destruction turn for reconstitution delay
        f.destruction_turn = state.meta?.turn ?? 0;

        report.dissolved_count++;
    }

    return report;
}
