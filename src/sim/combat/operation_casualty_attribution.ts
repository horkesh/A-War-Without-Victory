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
import { findBrigadeOperationAnywhere } from './corps_operation_helpers.js';
import { KIA_FRACTION, WIA_FRACTION } from './attack_casualty_distribution.js';
import { strictCompare } from '../../state/validateGameState.js';

// ─── Constants ──────────────────────────────────────────────────────────────

// T2-D (orphaned-wiring audit): the AAR KIA/WIA split now uses the SAME
// canonical fractions the battle engine applies (attack_casualty_distribution:
// KIA 0.22 / WIA 0.74 / MIA 0.04) instead of the legacy hardcoded 0.30/0.55,
// so operation After-Action Reports report a KIA/WIA mix that matches the
// casualties the sim actually booked. The AAR is a read/report layer
// (op.pending_casualties → op.weekly_log), so this re-labels how a total is
// split, not the total combat outcome.
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
    const match = findBrigadeOperationAnywhere(state, brigadeId);
    if (!match) return null;
    const { op } = match;
    if (op.type !== 'sector_attack') return null;

    const axisId = getBrigadeAxisId(op, brigadeId);
    return { op, corpsId: match.corps_id, axisId };
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
 * For each battle (OP-CAS-LEAD, §47):
 * - Each attacking brigade's own applied loss (`attacker_contributions`) is credited to
 *   that brigade's own sector_attack operation, with its share of what the stack inflicted
 *   and destroyed. Before §47 the whole stack's loss went to the LEAD attacker's operation.
 * - Each defending brigade's own loss (`defender_contributions`) is credited to its own
 *   operation the same way.
 * - Equipment lost is each brigade's own estimate. Equipment captured: only when the
 *   attacker is ARBiH and won.
 * - Totals are preserved exactly (largest remainder, strictCompare order). A side with one
 *   brigade gives the pre-§47 figures.
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

        // OP-CAS-LEAD (§47): each brigade's own applied loss (CAS-ATTACKER-SHARES §42 on the
        // attacking side, the distance-weighted contributions on the defending side), with the
        // record total preserved exactly. A one-brigade side reduces to the old figures.
        const atk = sharesPreservingTotal(attacker_casualties, battle.attacker_contributions, attacker_brigade);
        // OP-CAS-NONPARTICIPANT (§55): only engaged defenders are credited. Attacker rows
        // are built from the attacking stack itself, so every one of them took part.
        const def = defender_brigade
            ? sharesPreservingTotal(
                defender_casualties,
                engagedDefenderContributions(battle.defender_contributions, defender_brigade),
                defender_brigade,
            )
            : [];
        const atkW = atk.map((s) => s.casualties);
        const defW = def.map((s) => s.casualties);
        const atkLead = Math.max(0, atk.findIndex((s) => s.brigade_id === attacker_brigade));
        const defLead = Math.max(0, def.findIndex((s) => s.brigade_id === defender_brigade));

        const attackerCas = splitCasualties(attacker_casualties);
        const defenderCas = splitCasualties(defender_casualties);
        // Equipment lost: each brigade's own estimate from its own composition and loss.
        const atkEq = atk.map((s) => estimateEquipmentLosses(state, s.brigade_id, s.casualties, true));
        const defEq = def.map((s) => estimateEquipmentLosses(state, s.brigade_id, s.casualties, false));
        const atkEqTotal = sumEquipment(atkEq);
        const defEqTotal = sumEquipment(defEq);

        // Equipment captured: only ARBiH attacker who won
        const capturedByAttacker = (attacker_faction === 'RBiH' && attacker_won)
            ? { ...defEqTotal }
            : { tanks: 0, artillery: 0 };

        // --- Attackers' operations ---
        creditSide(state, atk.map((s) => s.brigade_id), {
            suffered: splitTally(attackerCas, atkW, atkLead),
            inflicted: splitTally(defenderCas, atkW, atkLead),
            equipment_lost: atkEq,
            equipment_destroyed: splitEquipment(defEqTotal, atkW, atkLead),
            equipment_captured: splitEquipment(capturedByAttacker, atkW, atkLead),
        });

        // --- Defenders' operations ---
        if (def.length > 0) {
            creditSide(state, def.map((s) => s.brigade_id), {
                suffered: splitTally(defenderCas, defW, defLead),
                inflicted: splitTally(attackerCas, defW, defLead),
                equipment_lost: defEq,
                equipment_destroyed: splitEquipment(atkEqTotal, defW, defLead),
                equipment_captured: def.map(() => ({ tanks: 0, artillery: 0 })),
            });
        }
    }
}

// ─── OP-CAS-LEAD helpers (§47) ──────────────────────────────────────────────

type Tally = { killed: number; wounded: number };
type Equip = { tanks: number; artillery: number };

/**
 * OP-CAS-NONPARTICIPANT (§55): `defender_contributions` keeps a diagnostic row for every
 * sector defender, including an unreachable reserve (reactive weight 0). A row is engaged
 * when it is the named defender, has a non-zero reactive weight, or absorbed casualties
 * (a personnel-share weight can round to 0.00 in the record). A row with no weight field
 * (an older record) counts as engaged. Casualties never exclude a participant: a row with
 * weight that lost no one is engaged.
 */
export function engagedDefenderContributions<
    T extends { brigade_id: FormationId; casualties_taken: number; reactive_weight?: number },
>(contributions: ReadonlyArray<T> | undefined, leadId: FormationId): T[] | undefined {
    if (!contributions) return undefined;
    return contributions.filter((c) =>
        c.brigade_id === leadId
        || c.reactive_weight === undefined
        || c.reactive_weight > 0
        || c.casualties_taken > 0);
}

/** One brigade's applied loss on one side of one battle. */
export interface BrigadeCasualtyShare {
    brigade_id: FormationId;
    casualties: number;
}

/**
 * Each brigade's share of a side's record total, sorted by brigade id (strictCompare).
 * The record total is preserved exactly. Remainder rule: a positive `total − Σshares` goes
 * to `leadId` (the record's named brigade), or to the first id when the lead is not listed;
 * a negative one is taken from the lead first, then from the others in id order, never
 * below 0. With no contributions the lead takes the whole total (the pre-§47 reading).
 */
export function sharesPreservingTotal(
    total: number,
    contributions: ReadonlyArray<{ brigade_id: FormationId; casualties_taken: number }> | undefined,
    leadId: FormationId,
): BrigadeCasualtyShare[] {
    const target = Math.max(0, total);
    if (!contributions || contributions.length === 0) return [{ brigade_id: leadId, casualties: target }];
    const byId = new Map<FormationId, number>();
    for (const c of contributions) {
        byId.set(c.brigade_id, (byId.get(c.brigade_id) ?? 0) + Math.max(0, c.casualties_taken));
    }
    const ids = [...byId.keys()].sort(strictCompare);
    const order = byId.has(leadId) ? [leadId, ...ids.filter((id) => id !== leadId)] : ids;
    let remainder = target - ids.reduce((n, id) => n + (byId.get(id) ?? 0), 0);
    if (remainder > 0) {
        byId.set(order[0]!, (byId.get(order[0]!) ?? 0) + remainder);
    } else {
        for (const id of order) {
            if (remainder >= 0) break;
            const have = byId.get(id) ?? 0;
            const take = Math.min(have, -remainder);
            byId.set(id, have - take);
            remainder += take;
        }
    }
    return ids.map((id) => ({ brigade_id: id, casualties: byId.get(id) ?? 0 }));
}

/**
 * Largest-remainder apportionment of a non-negative integer total over weights; the parts
 * sum to the total exactly. Leftover units go to the largest fractional parts, ties to the
 * earlier entry. With no positive weight, the whole total goes to `fallbackIndex`.
 */
export function apportionLargestRemainder(total: number, weights: readonly number[], fallbackIndex = 0): number[] {
    const n = weights.length;
    if (n === 0) return [];
    const t = Math.max(0, Math.round(total));
    const w = weights.map((x) => Math.max(0, x));
    const sum = w.reduce((a, b) => a + b, 0);
    const out = new Array<number>(n).fill(0);
    if (sum <= 0) {
        out[Math.min(Math.max(0, fallbackIndex), n - 1)] = t;
        return out;
    }
    const raw = w.map((x) => (t * x) / sum);
    for (let i = 0; i < n; i++) out[i] = Math.floor(raw[i]!);
    const left = t - out.reduce((a, b) => a + b, 0);
    const order = raw
        .map((r, i) => ({ i, frac: r - out[i]! }))
        .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
    for (let k = 0; k < left; k++) out[order[k % n]!.i]! += 1;
    return out;
}

function splitTally(total: Tally, weights: readonly number[], lead: number): Tally[] {
    const k = apportionLargestRemainder(total.killed, weights, lead);
    const w = apportionLargestRemainder(total.wounded, weights, lead);
    return weights.map((_, i) => ({ killed: k[i]!, wounded: w[i]! }));
}

function splitEquipment(total: Equip, weights: readonly number[], lead: number): Equip[] {
    const t = apportionLargestRemainder(total.tanks, weights, lead);
    const a = apportionLargestRemainder(total.artillery, weights, lead);
    return weights.map((_, i) => ({ tanks: t[i]!, artillery: a[i]! }));
}

function sumEquipment(items: readonly Equip[]): Equip {
    return items.reduce((s, e) => ({ tanks: s.tanks + e.tanks, artillery: s.artillery + e.artillery }), { tanks: 0, artillery: 0 });
}

/**
 * Credit one side's per-brigade figures to each brigade's own operation (and axis). Each
 * operation, and each axis of it, counts one attack per battle however many of its
 * brigades took part. Brigades in no sector_attack operation credit nothing.
 */
function creditSide(
    state: GameState,
    brigadeIds: readonly FormationId[],
    credits: {
        suffered: Tally[]; inflicted: Tally[];
        equipment_lost: Equip[]; equipment_destroyed: Equip[]; equipment_captured: Equip[];
    },
): void {
    const counted = new Map<CorpsOperation, Set<string>>();
    brigadeIds.forEach((brigadeId, i) => {
        const ctx = getBrigadeOpContext(state, brigadeId);
        if (!ctx) return;
        const op = ctx.op;
        if (!op.pending_casualties) op.pending_casualties = emptyPendingCasualties();
        addCredit(op.pending_casualties, {
            suffered: credits.suffered[i]!,
            inflicted: credits.inflicted[i]!,
            equipment_lost: credits.equipment_lost[i]!,
            equipment_destroyed: credits.equipment_destroyed[i]!,
            equipment_captured: credits.equipment_captured[i]!,
        }, ctx.axisId);
        let axes = counted.get(op);
        if (!axes) {
            axes = new Set<string>();
            counted.set(op, axes);
            op.pending_casualties.attacks += 1;
        }
        if (ctx.axisId != null && !axes.has(ctx.axisId) && op.pending_casualties.by_axis?.[ctx.axisId]) {
            axes.add(ctx.axisId);
            op.pending_casualties.by_axis[ctx.axisId].attacks += 1;
        }
    });
}
