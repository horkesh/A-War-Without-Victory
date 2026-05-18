/**
 * Operation Casualty Attribution
 *
 * Scans battle results from attack resolution and credits casualties +
 * equipment losses to active operations. Runs as a pipeline step after
 * attack resolution and before sector offensive result updates.
 *
 * Uses actual casualty numbers from the battle report (attacker_casualties,
 * defender_casualties) rather than re-estimating — ensures AAR totals match
 * the real combat resolution including all modifiers (bombardment, militia,
 * power ratio scaling, morale absorption, etc.).
 */

import type { GameState, FormationId, CorpsOperation } from '../../state/game_state.js';
import type { AttackResolutionOsidReport } from './attack_resolution_osid.js';
import { emptyPendingCasualties, type PendingOperationCasualties } from './operation_aar.js';
import { findBrigadeOperation } from './corps_operation_helpers.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;
const TANK_LOSS_RATE = 0.08;
const ARTILLERY_LOSS_RATE = 0.04;
const DEFENDER_EQUIPMENT_LOSS_SCALE = 0.5;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BrigadeOpContext {
    op: CorpsOperation;
    corpsId: string;
    axisId: string | null;
}

/**
 * Look up the active operation (if any) for a brigade, and determine
 * which axis (if any) the brigade belongs to.
 */
function getBrigadeOpContext(state: GameState, brigadeId: FormationId): BrigadeOpContext | null {
    const formation = state.military.formations?.[brigadeId];
    if (!formation) return null;
    const corpsId = formation.corps_id;
    if (!corpsId) return null;
    const corps = state.military.corps_command?.[corpsId];
    if (!corps) return null;
    const op = findBrigadeOperation(corps, brigadeId);
    if (!op) return null;
    if (op.type !== 'sector_attack') return null;

    const axisId = getBrigadeAxisId(op, brigadeId);
    return { op, corpsId, axisId };
}

/** Find which axis a brigade belongs to. Returns null if no axes or not found. */
function getBrigadeAxisId(op: CorpsOperation, brigadeId: FormationId): string | null {
    if (!op.axes) return null;
    for (const axis of op.axes) {
        if (axis.assigned_brigades.includes(brigadeId)) {
            return axis.axis_id;
        }
    }
    return null;
}

/** Split total casualties into KIA/WIA using standard fractions. */
function splitCasualties(total: number): { killed: number; wounded: number } {
    return {
        killed: Math.round(total * KIA_FRACTION),
        wounded: Math.round(total * WIA_FRACTION),
    };
}

/** Estimate equipment losses from a brigade's composition + outcome. */
function estimateEquipmentLosses(
    state: GameState,
    brigadeId: FormationId,
    totalCasualties: number,
    isAttacker: boolean,
): { tanks: number; artillery: number } {
    const formation = state.military.formations?.[brigadeId];
    if (!formation) return { tanks: 0, artillery: 0 };
    const personnel = formation.personnel ?? 0;
    if (personnel <= 0 || totalCasualties <= 0) return { tanks: 0, artillery: 0 };

    // Equipment loss proportional to casualty fraction of total personnel
    const lossFraction = Math.min(1, totalCasualties / personnel);
    const comp = formation.composition;
    const tankCount = comp?.tanks ?? 0;
    const artilleryCount = comp?.artillery ?? 0;
    const eqScale = isAttacker ? 1.0 : DEFENDER_EQUIPMENT_LOSS_SCALE;

    return {
        tanks: Math.round(tankCount * TANK_LOSS_RATE * lossFraction * eqScale * 10),
        artillery: Math.round(artilleryCount * ARTILLERY_LOSS_RATE * lossFraction * eqScale * 10),
    };
}

type PendingAxisCasualties = NonNullable<PendingOperationCasualties['by_axis']>[string];

function ensureAxisEntry(pending: PendingOperationCasualties, axisId: string): PendingAxisCasualties {
    if (!pending.by_axis) pending.by_axis = {};
    if (!pending.by_axis[axisId]) {
        pending.by_axis[axisId] = {
            suffered: { killed: 0, wounded: 0 },
            inflicted: { killed: 0, wounded: 0 },
            equipment_lost: { tanks: 0, artillery: 0 },
            equipment_destroyed: { tanks: 0, artillery: 0 },
            equipment_captured: { tanks: 0, artillery: 0 },
            attacks: 0,
        };
    }
    return pending.by_axis[axisId];
}

interface CasualtyCredit {
    suffered: { killed: number; wounded: number };
    inflicted: { killed: number; wounded: number };
    equipment_lost: { tanks: number; artillery: number };
    equipment_destroyed: { tanks: number; artillery: number };
    equipment_captured: { tanks: number; artillery: number };
}

function addCredit(pending: PendingOperationCasualties, credit: CasualtyCredit, axisId: string | null): void {
    pending.suffered.killed += credit.suffered.killed;
    pending.suffered.wounded += credit.suffered.wounded;
    pending.inflicted.killed += credit.inflicted.killed;
    pending.inflicted.wounded += credit.inflicted.wounded;
    pending.equipment_lost.tanks += credit.equipment_lost.tanks;
    pending.equipment_lost.artillery += credit.equipment_lost.artillery;
    pending.equipment_destroyed.tanks += credit.equipment_destroyed.tanks;
    pending.equipment_destroyed.artillery += credit.equipment_destroyed.artillery;
    pending.equipment_captured.tanks += credit.equipment_captured.tanks;
    pending.equipment_captured.artillery += credit.equipment_captured.artillery;

    if (axisId != null) {
        const ax = ensureAxisEntry(pending, axisId);
        ax.suffered.killed += credit.suffered.killed;
        ax.suffered.wounded += credit.suffered.wounded;
        ax.inflicted.killed += credit.inflicted.killed;
        ax.inflicted.wounded += credit.inflicted.wounded;
        ax.equipment_lost.tanks += credit.equipment_lost.tanks;
        ax.equipment_lost.artillery += credit.equipment_lost.artillery;
        ax.equipment_destroyed.tanks += credit.equipment_destroyed.tanks;
        ax.equipment_destroyed.artillery += credit.equipment_destroyed.artillery;
        ax.equipment_captured.tanks += credit.equipment_captured.tanks;
        ax.equipment_captured.artillery += credit.equipment_captured.artillery;
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Scan battle results and credit casualties + equipment losses to active operations.
 *
 * Uses actual casualty numbers from the battle report rather than re-estimating.
 * For each battle:
 * - If the attacker brigade is in a sector_attack operation, credit losses to that op.
 * - If the defender brigade is in a sector_attack operation, credit losses to that op.
 * - Equipment captured: only when attacker is ARBiH and attacker won.
 */
export function attributeOperationCasualties(
    state: GameState,
    battleReport: AttackResolutionOsidReport,
): void {
    if (!battleReport.battles || battleReport.battles.length === 0) return;

    for (const battle of battleReport.battles) {
        const {
            attacker_brigade,
            attacker_faction,
            defender_brigade,
            attacker_won,
            attacker_casualties,
            defender_casualties,
        } = battle;

        const attackerCas = splitCasualties(attacker_casualties);
        const defenderCas = splitCasualties(defender_casualties);
        const attackerEqLoss = estimateEquipmentLosses(state, attacker_brigade, attacker_casualties, true);
        const defenderEqLoss = defender_brigade
            ? estimateEquipmentLosses(state, defender_brigade, defender_casualties, false)
            : { tanks: 0, artillery: 0 };

        // Equipment captured: only ARBiH attacker who won
        const capturedByAttacker = (attacker_faction === 'RBiH' && attacker_won)
            ? { ...defenderEqLoss }
            : { tanks: 0, artillery: 0 };

        // --- Attacker's operation ---
        const attackerCtx = getBrigadeOpContext(state, attacker_brigade);
        if (attackerCtx) {
            const op = attackerCtx.op;
            if (!op.pending_casualties) op.pending_casualties = emptyPendingCasualties();
            addCredit(op.pending_casualties, {
                suffered: attackerCas,
                inflicted: defenderCas,
                equipment_lost: attackerEqLoss,
                equipment_destroyed: defenderEqLoss,
                equipment_captured: capturedByAttacker,
            }, attackerCtx.axisId);
            op.pending_casualties.attacks += 1;
            if (attackerCtx.axisId != null && op.pending_casualties.by_axis?.[attackerCtx.axisId]) {
                op.pending_casualties.by_axis[attackerCtx.axisId].attacks += 1;
            }
        }

        // --- Defender's operation ---
        if (defender_brigade) {
            const defenderCtx = getBrigadeOpContext(state, defender_brigade);
            if (defenderCtx) {
                const op = defenderCtx.op;
                if (!op.pending_casualties) op.pending_casualties = emptyPendingCasualties();
                addCredit(op.pending_casualties, {
                    suffered: defenderCas,
                    inflicted: attackerCas,
                    equipment_lost: defenderEqLoss,
                    equipment_destroyed: attackerEqLoss,
                    equipment_captured: { tanks: 0, artillery: 0 },
                }, defenderCtx.axisId);
                op.pending_casualties.attacks += 1;
                if (defenderCtx.axisId != null && op.pending_casualties.by_axis?.[defenderCtx.axisId]) {
                    op.pending_casualties.by_axis[defenderCtx.axisId].attacks += 1;
                }
            }
        }
    }
}
