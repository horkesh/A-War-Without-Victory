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
