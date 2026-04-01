/**
 * Operation Creation / Activation Entry Points
 *
 * This file contains the ONLY permitted creation and activation entry points
 * that feed INTO the canonical operation lifecycle:
 *   - generateOGActivationOrders   — activates Operational Groups during execution
 *   - generateEmergencyDefensiveOperations — creates emergency ops for threatened defensive corps
 *
 * These functions CREATE or ACTIVATE operations. They do NOT advance operation phases.
 * The canonical lifecycle (planning → execution → recovery → removal) for ALL op types
 * now lives in sector_offensive.ts:
 *   - advanceSectorOffensives()         handles sector_attack / probe / feint
 *   - evaluateOperationProgress()       handles general_offensive / strategic_defense
 *
 * Do NOT add new operation lifecycle logic here.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type {
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
    OGActivationOrder,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    EMERGENCY_THREAT_THRESHOLD,
    MAX_EXHAUSTION_FOR_OPERATION,
    MIN_BRIGADES_FOR_OPERATION,
    OG_DEFAULT_DURATION,
    OG_MAX_CONTRIBUTION_PER_DONOR,
    OG_MIN_DONOR_RESIDUAL,
    PERSONNEL_HEALTHY_THRESHOLD,
} from './bot_constants.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { assignOperationCommander } from './officer_system.js';
import {
    computeSectorThreat,
    countHealthyBrigades,
    getCorpsSubordinates,
    getFactionCorps,
    sortByPersonnelDesc,
} from './bot_corps_helpers.js';
import { buildEmergencyDefenseOperation, getAvailableBrigades, hasActiveOperation } from './corps_operation_helpers.js';

/**
 * Generate OG activation orders for active operations in execution phase.
 * Appends to state.og_orders.
 */
export function generateOGActivationOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[]
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const formations = state.military.formations ?? {};

    if (!state.military.og_orders) state.military.og_orders = [];

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of cmd.active_operations) {
            // Only activate OGs during execution phase (all operation types except reorganization)
            if (op.phase !== 'execution') continue;

            // Check if OG slot is available
            if (cmd.active_ogs.length >= cmd.og_slots) continue;

            // Select donor brigades from operation participants
            const donors: OGActivationOrder['donors'] = [];
            const participantsSorted = sortByPersonnelDesc(
                op.participating_brigades
                    .map(bid => formations[bid])
                    .filter((b): b is FormationState => b != null && b.status === 'active')
            );

            // Corridor breach and HRHB: lower threshold (2 donors)
            const isCorridorBreachOp = op.name.startsWith('Corridor Breach');
            const minDonors = (faction === 'HRHB' || isCorridorBreachOp) ? 2 : 3;
            const maxDonors = 4;

            for (const brigade of participantsSorted) {
                if (donors.length >= maxDonors) break;
                const personnel = brigade.personnel ?? 0;
                const residual = personnel - OG_MIN_DONOR_RESIDUAL;
                if (residual <= 0) continue;
                const contribution = Math.min(OG_MAX_CONTRIBUTION_PER_DONOR, residual);
                if (contribution < 100) continue;
                donors.push({
                    brigade_id: brigade.id,
                    personnel_contribution: contribution
                });
            }

            if (donors.length < minDonors) continue;

            const ogOrder: OGActivationOrder = {
                corps_id: corps.id,
                donors,
                focus_settlements: op.target_settlements ?? [],
                posture: op.type === 'strategic_defense' ? 'defend' : 'attack',
                max_duration: OG_DEFAULT_DURATION
            };

            state.military.og_orders.push(ogOrder);
        }
    }
}

/**
 * Launch emergency defensive operations for corps facing extreme sector threat.
 * Enables defensive OGs to form when a corps is in defensive stance with no active
 * operation but facing overwhelming pressure (sectorThreat > 2.0).
 *
 * Only fires for defensive corps — offensive/balanced corps already get operations
 * through the standard commander-loop path.
 */
export function generateEmergencyDefensiveOperations(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    preComputedAdjacency?: ReadonlyMap<string, readonly string[]>,
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political.political_controllers ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;
        // Allow exactly 1 emergency defensive op as overflow — skip only if one already exists
        const hasEmergencyAlready = cmd.active_operations.some(op => op.is_emergency);
        if (hasEmergencyAlready) continue;
        // Only for defensive corps facing extreme threat
        if (cmd.stance !== 'defensive') continue;
        // Allow slightly higher exhaustion for emergencies (+10 above normal cap)
        if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION + 10) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length < 2) continue;

        const sectorThreat = computeSectorThreat(state, subordinates, edges);
        if (sectorThreat < EMERGENCY_THREAT_THRESHOLD) continue;

        const healthyCount = countHealthyBrigades(subordinates);
        if (healthyCount < 2) continue;

        // Build target: enemy OSIDs adjacent to corps brigades' locations
        const targetSettlements: SettlementId[] = [];
        const brigadeOsids = new Set(subordinates.map(b => b.location_osid).filter(Boolean) as string[]);
        const osidAdj = (preComputedAdjacency as Map<string, string[]>) ?? buildOsidAdjacency(edges);
        for (const osid of brigadeOsids) {
            const neighbors = osidAdj.get(osid) ?? [];
            for (const n of neighbors) {
                const nCtrl = pc[n]; // OSIDs may be in political_controllers if using OSID-based control
                if (nCtrl && nCtrl !== faction) {
                    targetSettlements.push(n);
                }
            }
        }

        // Deduplicate and sort
        const uniqueTargets = [...new Set(targetSettlements)].sort(strictCompare);
        if (uniqueTargets.length === 0) continue;

        // Filter out brigades already committed to active operations
        const availableIds = new Set(getAvailableBrigades(cmd, subordinates.map(b => b.id)));

        // Select participants: brigades with at least 50% personnel and cohesion >= 30
        const participants = sortByPersonnelDesc(
            subordinates.filter(b => availableIds.has(b.id) && (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= 0.5 && (b.cohesion ?? 60) >= 30)
        ).slice(0, 4);

        if (participants.length < 2) continue;

        // PERMITTED CREATION ENTRY POINT — emergency defensive operations.
        // PHASE 5 TRANSITIONAL: sector_id not yet derived. Could be computed from brigade
        // locations → CorpsFrontSector.assigned_brigade_ids lookup. Brigade categorization
        // fields absent. Not broad-pool — participants are threat-selected. Deferred.
        const operation = buildEmergencyDefenseOperation(
            corps.id, turn, participants.map(b => b.id), uniqueTargets.slice(0, 20),
        );

        cmd.active_operations.push(operation);
        assignOperationCommander(state, operation, corps.id, faction);
    }
}
