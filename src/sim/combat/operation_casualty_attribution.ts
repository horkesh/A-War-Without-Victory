/**
 * Operation Casualty Attribution
 *
 * Scans battle results from attack resolution and credits casualties +
 * equipment losses to active operations. Runs as a pipeline step after
 * attack resolution and before sector offensive result updates.
 */

import type { GameState, FormationId, CorpsOperation } from '../../state/game_state.js';
import type { AttackResolutionOsidReport } from './attack_resolution_osid.js';
import type { CombatOutcome } from './combat_math.js';
import { emptyPendingCasualties, type PendingOperationCasualties } from './operation_aar.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_ATTACKER_LOSS_RATE = 0.04;
const BASE_DEFENDER_LOSS_RATE = 0.028;
const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;
const TANK_LOSS_RATE = 0.08;
const ARTILLERY_LOSS_RATE = 0.04;
const DEFENDER_EQUIPMENT_LOSS_SCALE = 0.5;

/** Outcome modifiers: [attacker_mult, defender_mult]. */
const OUTCOME_MODIFIERS: Record<CombatOutcome, [number, number]> = {
    decisive_victory: [0.4, 1.6],
    victory:          [0.6, 1.2],
    costly_victory:   [1.2, 0.9],
    stalemate:        [1.0, 0.8],
    repulsed:         [1.3, 0.6],
    catastrophic:     [1.8, 0.3],
};

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
    if (!corps?.active_operation) return null;
    const op = corps.active_operation;
    if (op.type !== 'sector_attack') return null;
    if (!op.participating_brigades.includes(brigadeId)) return null;

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

interface EstimatedLosses {
    killed: number;
    wounded: number;
    tanks: number;
    artillery: number;
}

function estimateLosses(
    state: GameState,
    brigadeId: FormationId,
    outcome: CombatOutcome,
    isAttacker: boolean,
): EstimatedLosses {
    const formation = state.military.formations?.[brigadeId];
    if (!formation) return { killed: 0, wounded: 0, tanks: 0, artillery: 0 };

    const personnel = formation.personnel ?? 0;
    const baseLossRate = isAttacker ? BASE_ATTACKER_LOSS_RATE : BASE_DEFENDER_LOSS_RATE;
    const [attMod, defMod] = OUTCOME_MODIFIERS[outcome] ?? [1.0, 1.0];
    const mod = isAttacker ? attMod : defMod;

    const totalCasualties = Math.round(personnel * baseLossRate * mod);
    const killed = Math.round(totalCasualties * KIA_FRACTION);
    const wounded = Math.round(totalCasualties * WIA_FRACTION);

    const comp = formation.composition;
    const tankCount = comp?.tanks ?? 0;
    const artilleryCount = comp?.artillery ?? 0;
    const eqScale = isAttacker ? 1.0 : DEFENDER_EQUIPMENT_LOSS_SCALE;
    const tanks = Math.round(tankCount * TANK_LOSS_RATE * mod * eqScale);
    const artillery = Math.round(artilleryCount * ARTILLERY_LOSS_RATE * mod * eqScale);

    return { killed, wounded, tanks, artillery };
}

function ensureAxisEntry(pending: PendingOperationCasualties, axisId: string): void {
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
}

function addSuffered(
    pending: PendingOperationCasualties,
    losses: EstimatedLosses,
    axisId: string | null,
): void {
    pending.suffered.killed += losses.killed;
    pending.suffered.wounded += losses.wounded;
    pending.equipment_lost.tanks += losses.tanks;
    pending.equipment_lost.artillery += losses.artillery;

    if (axisId != null) {
        ensureAxisEntry(pending, axisId);
        const ax = pending.by_axis![axisId];
        ax.suffered.killed += losses.killed;
        ax.suffered.wounded += losses.wounded;
        ax.equipment_lost.tanks += losses.tanks;
        ax.equipment_lost.artillery += losses.artillery;
    }
}

function addInflicted(
    pending: PendingOperationCasualties,
    enemyLosses: EstimatedLosses,
    axisId: string | null,
): void {
    pending.inflicted.killed += enemyLosses.killed;
    pending.inflicted.wounded += enemyLosses.wounded;
    pending.equipment_destroyed.tanks += enemyLosses.tanks;
    pending.equipment_destroyed.artillery += enemyLosses.artillery;

    if (axisId != null && pending.by_axis?.[axisId]) {
        const ax = pending.by_axis[axisId];
        ax.inflicted.killed += enemyLosses.killed;
        ax.inflicted.wounded += enemyLosses.wounded;
        ax.equipment_destroyed.tanks += enemyLosses.tanks;
        ax.equipment_destroyed.artillery += enemyLosses.artillery;
    }
}

function addCaptured(
    pending: PendingOperationCasualties,
    captured: { tanks: number; artillery: number },
    axisId: string | null,
): void {
    pending.equipment_captured.tanks += captured.tanks;
    pending.equipment_captured.artillery += captured.artillery;

    if (axisId != null && pending.by_axis?.[axisId]) {
        const ax = pending.by_axis[axisId];
        ax.equipment_captured.tanks += captured.tanks;
        ax.equipment_captured.artillery += captured.artillery;
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Scan battle results and credit casualties + equipment losses to active operations.
 *
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
            outcome,
            attacker_won,
        } = battle;

        // Estimate losses for attacker
        const attackerLosses = estimateLosses(state, attacker_brigade, outcome, true);

        // Estimate losses for defender (if present)
        const defenderLosses = defender_brigade
            ? estimateLosses(state, defender_brigade, outcome, false)
            : { killed: 0, wounded: 0, tanks: 0, artillery: 0 };

        // Equipment captured: only ARBiH attacker who won
        const capturedByAttacker = (attacker_faction === 'RBiH' && attacker_won)
            ? { tanks: defenderLosses.tanks, artillery: defenderLosses.artillery }
            : null;

        // --- Attacker's operation ---
        const attackerCtx = getBrigadeOpContext(state, attacker_brigade);
        if (attackerCtx) {
            const op = attackerCtx.op;
            if (!op.pending_casualties) op.pending_casualties = emptyPendingCasualties();
            addSuffered(op.pending_casualties, attackerLosses, attackerCtx.axisId);
            addInflicted(op.pending_casualties, defenderLosses, attackerCtx.axisId);
            if (capturedByAttacker) {
                addCaptured(op.pending_casualties, capturedByAttacker, attackerCtx.axisId);
            }
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
                addSuffered(op.pending_casualties, defenderLosses, defenderCtx.axisId);
                addInflicted(op.pending_casualties, attackerLosses, defenderCtx.axisId);
                op.pending_casualties.attacks += 1;
                if (defenderCtx.axisId != null && op.pending_casualties.by_axis?.[defenderCtx.axisId]) {
                    op.pending_casualties.by_axis[defenderCtx.axisId].attacks += 1;
                }
            }
        }
    }
}
