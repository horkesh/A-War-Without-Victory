/**
 * Operation After-Action Report (AAR) types and accumulator utilities.
 *
 * These types define the shape of persistent operation reports that survive
 * after an operation ends. During an operation's lifecycle, PendingOperationCasualties
 * accumulates battle data on the CorpsOperation; at operation end, the data is
 * compiled into a full OperationAAR and stored in GameState.operation_history.
 */

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
