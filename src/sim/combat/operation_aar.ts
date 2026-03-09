/**
 * Operation After-Action Report (AAR) types and accumulator utilities.
 *
 * These types define the shape of persistent operation reports that survive
 * after an operation ends. During an operation's lifecycle, PendingOperationCasualties
 * accumulates battle data on the CorpsOperation; at operation end, the data is
 * compiled into a full OperationAAR and stored in GameState.operation_history.
 */

import type { GameState, CorpsOperation, FormationId } from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';

// ─── Sub-ledgers ────────────────────────────────────────────────────────────

/** Casualty sub-ledger (killed + wounded). */
export interface CasualtyTally { killed: number; wounded: number; }

/** Equipment sub-ledger (tanks + artillery). */
export interface EquipmentTally { tanks: number; artillery: number; }

// ─── Weekly log types ───────────────────────────────────────────────────────

/** Per-axis entry in a weekly log row. */
export interface AxisWeeklyEntry {
    attacks_this_turn: number;
    objectives_captured_this_turn: string[];
    objectives_lost_this_turn: string[];
    casualties_suffered: CasualtyTally;
    casualties_inflicted: CasualtyTally;
    equipment_lost: EquipmentTally;
    equipment_destroyed: EquipmentTally;
    equipment_captured: EquipmentTally;
}

/** Per-turn log entry, accumulated during operation lifecycle. */
export interface OperationWeeklyEntry {
    turn: number;
    phase: 'planning' | 'execution' | 'recovery';
    attacks_this_turn: number;
    objectives_captured_this_turn: string[];
    objectives_lost_this_turn: string[];
    casualties_suffered: CasualtyTally;
    casualties_inflicted: CasualtyTally;
    equipment_lost: EquipmentTally;
    equipment_destroyed: EquipmentTally;
    equipment_captured: EquipmentTally;
    brigade_count: number;
    momentum: number;
    notable_events: string[];
    axis_entries?: Record<string, AxisWeeklyEntry>;
}

// ─── Axis-level AAR ─────────────────────────────────────────────────────────

/** Per-axis final summary in the AAR. */
export interface AxisAAR {
    axis_id: string;
    axis_name: string;
    brigades: string[];
    objectives_targeted: string[];
    objectives_captured: string[];
    total_attacks: number;
    casualties_suffered: CasualtyTally;
    casualties_inflicted: CasualtyTally;
    equipment_lost: EquipmentTally;
    equipment_destroyed: EquipmentTally;
    equipment_captured: EquipmentTally;
}

// ─── Grading ────────────────────────────────────────────────────────────────

/** Star grade with factor breakdown. */
export interface OperationGrade {
    stars: 1 | 2 | 3 | 4 | 5;
    verdict: string;
    factors: {
        objective_completion: number;
        exchange_ratio: number;
        tempo: number;
        preservation: number;
    };
}

// ─── Complete AAR ───────────────────────────────────────────────────────────

/** The complete After-Action Report. */
export interface OperationAAR {
    operation_id: string;
    operation_name: string;
    corps_id: string;
    faction: string;
    type: string;
    started_turn: number;
    ended_turn: number;
    outcome: 'success' | 'partial' | 'failure' | 'orphaned';
    commander_officer_id?: string;
    commander_name?: string;
    commander_rank?: string;
    objectives_targeted: string[];
    objectives_captured: string[];
    duration_turns: number;
    total_attacks: number;
    casualties_suffered: CasualtyTally;
    casualties_inflicted: CasualtyTally;
    equipment_lost: EquipmentTally;
    equipment_destroyed: EquipmentTally;
    equipment_captured: EquipmentTally;
    participating_brigades: string[];
    initial_strength: number;
    final_strength: number;
    grade: OperationGrade;
    weekly_log: OperationWeeklyEntry[];
    axis_summaries?: AxisAAR[];
}

// ─── Pending accumulator (lives on CorpsOperation during lifecycle) ─────────

/** Pending casualty accumulator — lives on CorpsOperation during lifecycle. */
export interface PendingOperationCasualties {
    suffered: CasualtyTally;
    inflicted: CasualtyTally;
    equipment_lost: EquipmentTally;
    equipment_destroyed: EquipmentTally;
    equipment_captured: EquipmentTally;
    by_axis?: Record<string, {
        suffered: CasualtyTally;
        inflicted: CasualtyTally;
        equipment_lost: EquipmentTally;
        equipment_destroyed: EquipmentTally;
        equipment_captured: EquipmentTally;
        attacks: number;
    }>;
    attacks: number;
}

// ─── Grading Logic ─────────────────────────────────────────────────────────

export interface GradeInput {
    objectives_targeted: number;
    objectives_captured: number;
    casualties_suffered: number;  // total (killed + wounded)
    casualties_inflicted: number; // total (killed + wounded)
    initial_strength: number;
    final_strength: number;
    duration_turns: number;
    expected_duration: number;
}

const VERDICTS: Record<number, [string, string]> = {
    5: ['Brilliant Victory', 'Decisive Triumph'],
    4: ['Solid Victory', 'Successful Advance'],
    3: ['Partial Success', 'Indecisive'],
    2: ['Costly Stalemate', 'Pyrrhic Advance'],
    1: ['Disaster', 'Catastrophic Failure'],
};

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}

export function gradeOperation(input: GradeInput): OperationGrade {
    const {
        objectives_targeted, objectives_captured,
        casualties_suffered, casualties_inflicted,
        initial_strength, final_strength,
        duration_turns, expected_duration,
    } = input;

    // Star calculation: start at 3
    let stars = 3;

    const captureRatio = objectives_targeted > 0
        ? objectives_captured / objectives_targeted
        : 0;
    const exchangeRatio = casualties_suffered > 0
        ? casualties_inflicted / casualties_suffered
        : (casualties_inflicted > 0 ? 10 : 1);
    const forceLostFraction = initial_strength > 0
        ? 1 - (final_strength / initial_strength)
        : 0;

    if (captureRatio >= 0.75) stars += 1;
    if (exchangeRatio >= 2.0) stars += 1;
    if (objectives_captured === 0) stars -= 1;
    if (exchangeRatio < 0.5) stars -= 1;
    if (forceLostFraction >= 0.30) stars -= 1;
    if (expected_duration > 0 && duration_turns <= expected_duration * 1.5) stars += 1;

    stars = clamp(stars, 1, 5) as 1 | 2 | 3 | 4 | 5;

    // Factor scores (0-100)
    const objective_completion = objectives_targeted > 0
        ? (objectives_captured / objectives_targeted) * 100
        : 0;
    const exchange_ratio_score = clamp(
        (casualties_inflicted / Math.max(casualties_suffered, 1)) * 33, 0, 100,
    );
    const tempo = clamp(
        (1 - (duration_turns / (Math.max(expected_duration, 1) * 2))) * 100, 0, 100,
    );
    const preservation = (final_strength / Math.max(initial_strength, 1)) * 100;

    // Verdict: first variant if objectives captured, second if not
    const verdictPair = VERDICTS[stars];
    const verdict = objectives_captured > 0 ? verdictPair[0] : verdictPair[1];

    return {
        stars: stars as 1 | 2 | 3 | 4 | 5,
        verdict,
        factors: {
            objective_completion,
            exchange_ratio: exchange_ratio_score,
            tempo,
            preservation,
        },
    };
}

/** Create a zeroed-out pending casualties accumulator. */
export function emptyPendingCasualties(): PendingOperationCasualties {
    return {
        suffered: { killed: 0, wounded: 0 },
        inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        attacks: 0,
    };
}

// ─── Weekly Log Entry Recording ───────────────────────────────────────────────

/** Collect all objective OSIDs from an operation (axes or flat list). */
function collectObjectives(op: CorpsOperation): string[] {
    const objs: string[] = [];
    if (op.axes) {
        for (const axis of op.axes) {
            if (axis.objectives) {
                for (const o of axis.objectives) {
                    if (!objs.includes(o)) objs.push(o);
                }
            }
        }
    } else if (op.objectives) {
        for (const o of op.objectives) {
            if (!objs.includes(o)) objs.push(o);
        }
    }
    return objs;
}

/** Get the overall momentum of an operation. */
function getOperationMomentum(op: CorpsOperation): number {
    if (op.axes) {
        let max = 0;
        for (const axis of op.axes) {
            if ((axis.momentum ?? 0) > max) max = axis.momentum ?? 0;
        }
        return max;
    }
    return op.momentum ?? 0;
}

/** Create a zeroed AxisWeeklyEntry. */
function emptyAxisEntry(): AxisWeeklyEntry {
    return {
        attacks_this_turn: 0,
        objectives_captured_this_turn: [],
        objectives_lost_this_turn: [],
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
    };
}

// Suppress unused warning for emptyAxisEntry — reserved for future axis-level objective diff
void emptyAxisEntry;

/**
 * Drain pending_casualties into a weekly log entry, diff objective control,
 * detect notable events, and record initial_strength on first entry.
 * Runs AFTER update-sector-offensive-results each turn.
 */
export function recordOperationWeeklyEntries(
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap | null,
): void {
    const cc = state.military.corps_command;
    if (!cc) return;

    const corpsIds = Object.keys(cc).sort(strictCompare);

    for (const corpsId of corpsIds) {
        const cmd = cc[corpsId];
        const op = cmd?.active_operation;
        if (!op || op.type !== 'sector_attack') continue;

        // Init weekly_log if missing
        if (!op.weekly_log) op.weekly_log = [];

        // Record initial_strength on first entry
        if (op.initial_strength === undefined) {
            let total = 0;
            for (const bdeId of op.participating_brigades) {
                const fmn = state.military.formations[bdeId as FormationId];
                if (fmn) total += fmn.personnel ?? 0;
            }
            op.initial_strength = total;
        }

        // Collect objectives and diff control
        const objectives = collectObjectives(op);
        const prevState = op._prev_objective_state ?? {};
        const capturedThisTurn: string[] = [];
        const lostThisTurn: string[] = [];

        // Derive faction from first participating brigade
        let opFaction: string | null = null;
        for (const bdeId of op.participating_brigades) {
            const fmn = state.military.formations[bdeId as FormationId];
            if (fmn) { opFaction = fmn.faction; break; }
        }

        const currentObjState: Record<string, string | null> = {};
        for (const osid of objectives) {
            const controller = getPoliticalControllerOSID(
                state, osid, reverseMap ?? undefined,
            );
            currentObjState[osid] = controller;

            const prev = prevState[osid] ?? null;
            if (opFaction) {
                if (controller === opFaction && prev !== opFaction) {
                    capturedThisTurn.push(osid);
                } else if (controller !== opFaction && prev === opFaction) {
                    lostThisTurn.push(osid);
                }
            }
        }

        // Drain pending_casualties
        const pc = op.pending_casualties;
        const suffered: CasualtyTally = pc
            ? { killed: pc.suffered.killed, wounded: pc.suffered.wounded }
            : { killed: 0, wounded: 0 };
        const inflicted: CasualtyTally = pc
            ? { killed: pc.inflicted.killed, wounded: pc.inflicted.wounded }
            : { killed: 0, wounded: 0 };
        const eqLost: EquipmentTally = pc
            ? { tanks: pc.equipment_lost.tanks, artillery: pc.equipment_lost.artillery }
            : { tanks: 0, artillery: 0 };
        const eqDestroyed: EquipmentTally = pc
            ? { tanks: pc.equipment_destroyed.tanks, artillery: pc.equipment_destroyed.artillery }
            : { tanks: 0, artillery: 0 };
        const eqCaptured: EquipmentTally = pc
            ? { tanks: pc.equipment_captured.tanks, artillery: pc.equipment_captured.artillery }
            : { tanks: 0, artillery: 0 };
        const attacksThisTurn = pc?.attacks ?? 0;

        // Build axis_entries from pending_casualties.by_axis
        let axisEntries: Record<string, AxisWeeklyEntry> | undefined;
        if (pc?.by_axis) {
            axisEntries = {};
            const axisIds = Object.keys(pc.by_axis).sort(strictCompare);
            for (const axisId of axisIds) {
                const ax = pc.by_axis[axisId];
                axisEntries[axisId] = {
                    attacks_this_turn: ax.attacks,
                    objectives_captured_this_turn: [],
                    objectives_lost_this_turn: [],
                    casualties_suffered: { killed: ax.suffered.killed, wounded: ax.suffered.wounded },
                    casualties_inflicted: { killed: ax.inflicted.killed, wounded: ax.inflicted.wounded },
                    equipment_lost: { tanks: ax.equipment_lost.tanks, artillery: ax.equipment_lost.artillery },
                    equipment_destroyed: { tanks: ax.equipment_destroyed.tanks, artillery: ax.equipment_destroyed.artillery },
                    equipment_captured: { tanks: ax.equipment_captured.tanks, artillery: ax.equipment_captured.artillery },
                };
            }
        }

        // Count active brigades
        let brigadeCount = 0;
        for (const bdeId of op.participating_brigades) {
            const fmn = state.military.formations[bdeId as FormationId];
            if (fmn && fmn.status === 'active') brigadeCount++;
        }

        // Detect notable events
        const notableEvents: string[] = [];
        const totalCasualties = suffered.killed + suffered.wounded;

        // first_blood: first turn with attacks > 0 in op history
        if (attacksThisTurn > 0) {
            const hadPriorAttacks = op.weekly_log.some(e => e.attacks_this_turn > 0);
            if (!hadPriorAttacks) notableEvents.push('first_blood');
        }

        // breakthrough: objective captured this turn
        if (capturedThisTurn.length > 0) notableEvents.push('breakthrough');

        // stalled: 3+ consecutive turns with 0 attacks during execution
        if (op.phase === 'execution' && attacksThisTurn === 0) {
            let streak = 0;
            for (let i = op.weekly_log.length - 1; i >= 0; i--) {
                if (op.weekly_log[i].attacks_this_turn === 0) streak++;
                else break;
            }
            // Current turn (not yet pushed) would make streak+1
            if (streak + 1 >= 3) notableEvents.push('stalled');
        }

        // heavy_losses: casualties > 10% of initial_strength this turn
        if (op.initial_strength > 0 && totalCasualties > op.initial_strength * 0.10) {
            notableEvents.push('heavy_losses');
        }

        // Build and push entry
        const entry: OperationWeeklyEntry = {
            turn: state.meta.turn,
            phase: op.phase,
            attacks_this_turn: attacksThisTurn,
            objectives_captured_this_turn: capturedThisTurn,
            objectives_lost_this_turn: lostThisTurn,
            casualties_suffered: suffered,
            casualties_inflicted: inflicted,
            equipment_lost: eqLost,
            equipment_destroyed: eqDestroyed,
            equipment_captured: eqCaptured,
            brigade_count: brigadeCount,
            momentum: getOperationMomentum(op),
            notable_events: notableEvents,
        };
        if (axisEntries) entry.axis_entries = axisEntries;

        op.weekly_log.push(entry);

        // Update prev objective state for next turn's diff
        op._prev_objective_state = currentObjState;

        // Clean up pending_casualties
        delete op.pending_casualties;
    }
}
