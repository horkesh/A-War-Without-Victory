/**
 * Collects significant events that happened THIS turn.
 * Fed into event condition evaluation for incident-based triggers.
 * Populated by pipeline steps; consumed by event evaluation.
 */

export interface TurnIncidents {
    battles_fought: Array<{ osid: string; attacker_faction: string; defender_faction: string; outcome: string }>;
    osids_flipped: Array<{ osid: string; from_faction: string; to_faction: string }>;
    formations_dissolved: Array<{ formation_id: string; faction: string }>;
    operations_completed: Array<{ name: string; corps_id: string; faction: string; success: boolean }>;
    enclave_status_changes: Array<{ municipality: string; new_status: string }>;
}

export function createEmptyTurnIncidents(): TurnIncidents {
    return {
        battles_fought: [],
        osids_flipped: [],
        formations_dissolved: [],
        operations_completed: [],
        enclave_status_changes: [],
    };
}
