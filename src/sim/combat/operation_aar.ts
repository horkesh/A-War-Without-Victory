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
    /** True if the player force-launched this operation against command recommendation. */
    force_launched?: boolean;
    /** CA cost paid at time of force-launch. Always 15 when force_launched is true. */
    ca_cost_at_launch?: number;
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
        for (const op of cmd?.active_operations ?? []) {
        if (op.type !== 'sector_attack') continue;

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
        } // end for-of active_operations
    }
}

// ─── Finalize Operation AAR ────────────────────────────────────────────────

/**
 * Build and persist a complete OperationAAR when a sector_attack operation ends.
 * Must be called BEFORE the op is removed from active_operations.
 */
export function finalizeOperationAAR(
    state: GameState,
    corpsId: string,
    op: CorpsOperation,
): void {
    // 1. Collect all objectives
    const objectives = collectObjectives(op);

    // 2. Derive faction from first participating brigade
    let faction: string = '';
    for (const bdeId of op.participating_brigades) {
        const fmn = state.military.formations[bdeId as FormationId];
        if (fmn) { faction = fmn.faction; break; }
    }

    // 3. Check which objectives are currently held by that faction
    const capturedObjectives: string[] = [];
    for (const osid of objectives) {
        const controller = getPoliticalControllerOSID(state, osid);
        if (controller === faction) {
            capturedObjectives.push(osid);
        }
    }

    // 4. Derive outcome from objectives held + recovery_reason
    //    All objectives held at finalization → success, regardless of recovery path.
    //    (Multi-axis ops can hit max_failures on one axis but still hold all objectives.)
    let outcome: OperationAAR['outcome'];
    const reason = op.recovery_reason;
    const allHeld = capturedObjectives.length === objectives.length && objectives.length > 0;
    const someHeld = capturedObjectives.length > 0;

    if (reason === 'orphaned_sector') {
        outcome = 'orphaned';
    } else if (allHeld) {
        outcome = 'success';
    } else if (someHeld) {
        outcome = 'partial';
    } else {
        outcome = 'failure';
    }

    // 5. Aggregate totals from weekly_log
    const log = op.weekly_log ?? [];
    let totalAttacks = 0;
    const totalSuffered: CasualtyTally = { killed: 0, wounded: 0 };
    const totalInflicted: CasualtyTally = { killed: 0, wounded: 0 };
    const totalEqLost: EquipmentTally = { tanks: 0, artillery: 0 };
    const totalEqDestroyed: EquipmentTally = { tanks: 0, artillery: 0 };
    const totalEqCaptured: EquipmentTally = { tanks: 0, artillery: 0 };

    for (const entry of log) {
        totalAttacks += entry.attacks_this_turn;
        totalSuffered.killed += entry.casualties_suffered.killed;
        totalSuffered.wounded += entry.casualties_suffered.wounded;
        totalInflicted.killed += entry.casualties_inflicted.killed;
        totalInflicted.wounded += entry.casualties_inflicted.wounded;
        totalEqLost.tanks += entry.equipment_lost.tanks;
        totalEqLost.artillery += entry.equipment_lost.artillery;
        totalEqDestroyed.tanks += entry.equipment_destroyed.tanks;
        totalEqDestroyed.artillery += entry.equipment_destroyed.artillery;
        totalEqCaptured.tanks += entry.equipment_captured.tanks;
        totalEqCaptured.artillery += entry.equipment_captured.artillery;
    }

    // 6. Compute final_strength from participating brigades' current personnel
    let finalStrength = 0;
    for (const bdeId of op.participating_brigades) {
        const fmn = state.military.formations[bdeId as FormationId];
        if (fmn) finalStrength += fmn.personnel ?? 0;
    }

    // 7. Denormalize OiC from named_officer_data
    let commanderName: string | undefined;
    let commanderRank: string | undefined;
    if (op.commander_officer_id && state.military.named_officer_data) {
        const officer = state.military.named_officer_data.find(
            o => o.id === op.commander_officer_id,
        );
        if (officer) {
            commanderName = officer.name;
            commanderRank = officer.rank;
        }
    }

    // 8. Compute grade
    const initialStrength = op.initial_strength ?? finalStrength;
    const durationTurns = Math.max(1, state.meta.turn - op.started_turn);
    const expectedDuration = (op.planning_duration ?? Math.max(1, objectives.length)) * 4;

    const grade = gradeOperation({
        objectives_targeted: objectives.length,
        objectives_captured: capturedObjectives.length,
        casualties_suffered: totalSuffered.killed + totalSuffered.wounded,
        casualties_inflicted: totalInflicted.killed + totalInflicted.wounded,
        initial_strength: initialStrength,
        final_strength: finalStrength,
        duration_turns: durationTurns,
        expected_duration: expectedDuration,
    });

    // 9. Build axis_summaries from op.axes + aggregated weekly axis entries
    let axisSummaries: AxisAAR[] | undefined;
    if (op.axes) {
        axisSummaries = [];
        for (const axis of op.axes) {
            // Aggregate from weekly_log axis_entries for this axis
            const axSuffered: CasualtyTally = { killed: 0, wounded: 0 };
            const axInflicted: CasualtyTally = { killed: 0, wounded: 0 };
            const axEqLost: EquipmentTally = { tanks: 0, artillery: 0 };
            const axEqDestroyed: EquipmentTally = { tanks: 0, artillery: 0 };
            const axEqCaptured: EquipmentTally = { tanks: 0, artillery: 0 };
            let axAttacks = 0;
            const axObjsCaptured: string[] = [];

            for (const entry of log) {
                const ae = entry.axis_entries?.[axis.axis_id];
                if (!ae) continue;
                axAttacks += ae.attacks_this_turn;
                axSuffered.killed += ae.casualties_suffered.killed;
                axSuffered.wounded += ae.casualties_suffered.wounded;
                axInflicted.killed += ae.casualties_inflicted.killed;
                axInflicted.wounded += ae.casualties_inflicted.wounded;
                axEqLost.tanks += ae.equipment_lost.tanks;
                axEqLost.artillery += ae.equipment_lost.artillery;
                axEqDestroyed.tanks += ae.equipment_destroyed.tanks;
                axEqDestroyed.artillery += ae.equipment_destroyed.artillery;
                axEqCaptured.tanks += ae.equipment_captured.tanks;
                axEqCaptured.artillery += ae.equipment_captured.artillery;
                for (const cap of ae.objectives_captured_this_turn) {
                    if (!axObjsCaptured.includes(cap)) axObjsCaptured.push(cap);
                }
            }

            // Also check which axis objectives are currently held
            const axisObjsHeld: string[] = [];
            for (const osid of axis.objectives) {
                const controller = getPoliticalControllerOSID(state, osid);
                if (controller === faction && !axisObjsHeld.includes(osid)) {
                    axisObjsHeld.push(osid);
                }
            }

            axisSummaries.push({
                axis_id: axis.axis_id,
                axis_name: axis.name,
                brigades: [...axis.assigned_brigades],
                objectives_targeted: [...axis.objectives],
                objectives_captured: axisObjsHeld,
                total_attacks: axAttacks,
                casualties_suffered: axSuffered,
                casualties_inflicted: axInflicted,
                equipment_lost: axEqLost,
                equipment_destroyed: axEqDestroyed,
                equipment_captured: axEqCaptured,
            });
        }
    }

    // 10. Construct OperationAAR and push to state.operation_history
    const aar: OperationAAR = {
        operation_id: `${corpsId}:${op.name}:t${op.started_turn}`,
        operation_name: op.name,
        corps_id: corpsId,
        faction,
        type: op.type,
        started_turn: op.started_turn,
        ended_turn: state.meta.turn,
        outcome,
        objectives_targeted: objectives,
        objectives_captured: capturedObjectives,
        duration_turns: durationTurns,
        total_attacks: totalAttacks,
        casualties_suffered: totalSuffered,
        casualties_inflicted: totalInflicted,
        equipment_lost: totalEqLost,
        equipment_destroyed: totalEqDestroyed,
        equipment_captured: totalEqCaptured,
        participating_brigades: [...op.participating_brigades],
        initial_strength: initialStrength,
        final_strength: finalStrength,
        grade,
        weekly_log: log,
    };

    if (op.commander_officer_id) {
        aar.commander_officer_id = op.commander_officer_id;
    }
    if (commanderName) aar.commander_name = commanderName;
    if (commanderRank) aar.commander_rank = commanderRank;
    if (axisSummaries) aar.axis_summaries = axisSummaries;
    if (op.was_force_launched) {
        aar.force_launched = true;
        aar.ca_cost_at_launch = 15;
    }

    if (!state.operation_history) state.operation_history = [];
    state.operation_history.push(aar);
}
