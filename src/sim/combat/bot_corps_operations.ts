/**
 * Named operation management: catalog, launch, progress evaluation,
 * OG activation, and emergency defensive operations.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type {
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OGActivationOrder,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    BRIGADE_LOSS_THRESHOLD,
    COHESION_HEALTHY_THRESHOLD,
    EMERGENCY_THREAT_THRESHOLD,
    EXECUTION_MAX_DURATION,
    MAX_EXHAUSTION_FOR_OPERATION,
    MIN_BRIGADES_FOR_OPERATION,
    OG_DEFAULT_DURATION,
    OG_MAX_CONTRIBUTION_PER_DONOR,
    OG_MIN_DONOR_RESIDUAL,
    PERSONNEL_HEALTHY_THRESHOLD,
    PLANNING_DURATION,
    PROGRESS_FAILURE_THRESHOLD,
    PROGRESS_SUCCESS_THRESHOLD,
    RECOVERY_DURATION,
} from './bot_constants.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { assignOperationCommander, releaseOperationCommander } from './officer_system.js';
import {
    computeSectorThreat,
    countHealthyBrigades,
    getCorpsSubordinates,
    getFactionCorps,
    sortByPersonnelDesc,
} from './bot_corps_helpers.js';
import { getAvailableBrigades, hasActiveOperation, hasAvailableSlot, removeOperation } from './corps_operation_helpers.js';

/** Faction-specific named operation catalog. */
interface OperationTemplate {
    name: string;
    type: CorpsOperation['type'];
    target_municipalities: string[];
}

export function getOperationCatalog(faction: FactionId, state: GameState): OperationTemplate[] {
    switch (faction) {
        case 'RS': return [
            { name: 'Operation Corridor', type: 'sector_attack', target_municipalities: ['brcko', 'bosanski_samac', 'modrica', 'derventa'] },
            { name: 'Drina Sweep', type: 'general_offensive', target_municipalities: ['zvornik', 'bratunac', 'srebrenica', 'vlasenica'] },
            { name: 'Sarajevo Tightening', type: 'strategic_defense', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
            { name: 'Bihac Containment', type: 'sector_attack', target_municipalities: ['bihac', 'cazin', 'bosanska_krupa', 'bosanski_petrovac'] },
            { name: 'Krajina Consolidation', type: 'strategic_defense', target_municipalities: ['prijedor', 'banja_luka', 'sanski_most', 'kljuc'] },
        ];
        case 'RBiH': {
            const ops: OperationTemplate[] = [
                { name: 'Enclave Relief', type: 'sector_attack', target_municipalities: ['gorazde', 'srebrenica', 'zepa'] },
                { name: 'Sarajevo Breakout', type: 'general_offensive', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
                { name: 'Central Corridor', type: 'sector_attack', target_municipalities: ['zenica', 'travnik', 'kakanj', 'visoko'] },
                { name: 'Tuzla Widening', type: 'sector_attack', target_municipalities: ['tuzla', 'kalesija', 'lukavac', 'zivinice'] },
                { name: 'Bihac Pocket Defense', type: 'strategic_defense', target_municipalities: ['bihac', 'cazin', 'velika_kladusa'] },
            ];
            const allianceValue = state.political.war_alliance_rbih_hrhb ?? 1.0;
            if (allianceValue < 0.0) {
                ops.push({ name: 'Central Bosnia Defense', type: 'strategic_defense', target_municipalities: ['travnik', 'bugojno', 'vitez', 'novi_travnik'] });
            }
            if (allianceValue < -0.30) {
                ops.push({ name: 'Mostar Counter', type: 'sector_attack', target_municipalities: ['mostar', 'stolac', 'capljina'] });
            }
            return ops;
        }
        case 'HRHB': {
            const ops: OperationTemplate[] = [
                { name: 'Lasva Valley', type: 'sector_attack', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik'] },
                { name: 'Mostar Consolidation', type: 'sector_attack', target_municipalities: ['mostar', 'stolac', 'capljina'] },
                { name: 'Herzegovina Shield', type: 'strategic_defense', target_municipalities: ['siroki_brijeg', 'citluk', 'ljubuski', 'grude'] },
                { name: 'Usora Pocket', type: 'sector_attack', target_municipalities: ['zepce', 'usora', 'maglaj'] },
                { name: 'Posavina Defense', type: 'strategic_defense', target_municipalities: ['orasje', 'odzak', 'bosanski_brod'] },
            ];
            // Bilateral operations only when at war with RBiH
            const allianceValue = state.political.war_alliance_rbih_hrhb ?? 1.0;
            if (allianceValue < 0.0) {
                ops.push({ name: 'Lasva Valley Offensive', type: 'sector_attack', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik'] });
                ops.push({ name: 'Mostar Division', type: 'sector_attack', target_municipalities: ['mostar', 'jablanica', 'konjic'] });
            }
            return ops;
        }
        default: return [];
    }
}

/**
 * Generate named operations for bot-controlled corps.
 * Only launches when: corps is offensive/balanced, no active op, enough healthy brigades.
 */
export function generateCorpsOperationOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political.political_controllers ?? {};
    const catalog = getOperationCatalog(faction, state);

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        // Skip if no available operation slot
        const subordinates_pre = getCorpsSubordinates(state, corps.id);
        if (!hasAvailableSlot(cmd, subordinates_pre.length)) continue;

        // Must be offensive or balanced
        if (cmd.stance !== 'offensive' && cmd.stance !== 'balanced') continue;

        // Must have low exhaustion
        if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        const healthyCount = countHealthyBrigades(subordinates);
        if (healthyCount < MIN_BRIGADES_FOR_OPERATION) continue;

        // Find best matching operation from catalog
        let bestTemplate: OperationTemplate | null = null;
        let bestRelevance = 0;

        for (const template of catalog) {
            // Relevance: how many target municipalities are adjacent to our AoR but enemy-controlled?
            let relevance = 0;
            for (const mun of template.target_municipalities) {
                // Count enemy-held settlements in this municipality
                const sids = Object.keys(pc).sort(strictCompare).filter(sid => {
                    const m = sidToMun.get(sid);
                    return m === mun && pc[sid] !== faction;
                });
                relevance += sids.length;
            }
            if (relevance > bestRelevance) {
                bestRelevance = relevance;
                bestTemplate = template;
            }
        }

        if (!bestTemplate || bestRelevance === 0) continue;

        // Collect target settlements
        const targetSettlements: SettlementId[] = [];
        for (const mun of bestTemplate.target_municipalities) {
            for (const sid of Object.keys(pc).sort(strictCompare)) {
                const m = sidToMun.get(sid);
                if (m === mun && pc[sid] !== faction) {
                    targetSettlements.push(sid);
                }
            }
        }

        // Filter out brigades already committed to active operations
        const availableIds = new Set(getAvailableBrigades(cmd, subordinates.map(b => b.id)));

        // Select participating brigades: top N healthy brigades by personnel
        const healthySorted = sortByPersonnelDesc(
            subordinates.filter(b => {
                if (!availableIds.has(b.id)) return false;
                const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
                const coh = b.cohesion ?? 60;
                return persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD;
            })
        ).slice(0, 5);

        // Coerce zombie op types to sector_attack — only type with execution logic
        const effectiveType = (bestTemplate.type === 'general_offensive' || bestTemplate.type === 'strategic_defense')
            ? 'sector_attack' : bestTemplate.type;

        const operation: CorpsOperation = {
            name: bestTemplate.name,
            type: effectiveType,
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            target_settlements: targetSettlements,
            participating_brigades: healthySorted.map(b => b.id)
        };

        cmd.active_operations.push(operation);
        assignOperationCommander(state, operation, corps.id, faction);
    }
}

/**
 * Evaluate progress of active operations and advance/abort them.
 * Called each turn for active operations.
 */
export function evaluateOperationProgress(
    state: GameState,
    faction: FactionId
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political.political_controllers ?? {};
    const formations = state.military.formations ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of [...cmd.active_operations]) {
            // sector_attack, probe, and feint ops have their own lifecycle in
            // advanceSectorOffensives(). Processing them here would cause double
            // phase transitions and double exhaustion costs.
            if (op.type === 'sector_attack' || op.type === 'probe' || op.type === 'feint') continue;

            const turnsInPhase = turn - op.phase_started_turn;

            if (op.phase === 'planning') {
                // Advance to execution after planning duration
                if (turnsInPhase >= PLANNING_DURATION) {
                    op.phase = 'execution';
                    op.phase_started_turn = turn;
                }
            } else if (op.phase === 'execution') {
                // Check progress
                const targets = op.target_settlements ?? [];
                if (targets.length > 0) {
                    const captured = targets.filter(sid => pc[sid] === faction).length;
                    const captureRate = captured / targets.length;

                    // Abort if failing after 2 turns
                    if (turnsInPhase >= 2 && captureRate < PROGRESS_FAILURE_THRESHOLD) {
                        op.phase = 'recovery';
                        op.phase_started_turn = turn;
                        continue;
                    }

                    // Success or max duration reached
                    if (captureRate >= PROGRESS_SUCCESS_THRESHOLD || turnsInPhase >= EXECUTION_MAX_DURATION) {
                        op.phase = 'recovery';
                        op.phase_started_turn = turn;
                        continue;
                    }
                } else if (turnsInPhase >= EXECUTION_MAX_DURATION) {
                    op.phase = 'recovery';
                    op.phase_started_turn = turn;
                    continue;
                }

                // Replace heavily damaged brigades
                const updatedParticipants: FormationId[] = [];
                for (const brigId of op.participating_brigades) {
                    const brig = formations[brigId];
                    if (!brig || brig.status !== 'active') continue;
                    const startPersonnel = MAX_BRIGADE_PERSONNEL; // approximate
                    const currentPersonnel = brig.personnel ?? 0;
                    const lossRate = 1 - (currentPersonnel / startPersonnel);
                    if (lossRate > BRIGADE_LOSS_THRESHOLD) {
                        // Try to find a replacement from the same corps
                        const subordinates = getCorpsSubordinates(state, corps.id);
                        const replacement = subordinates.find(s =>
                            !op.participating_brigades.includes(s.id) &&
                            (s.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= PERSONNEL_HEALTHY_THRESHOLD &&
                            (s.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD
                        );
                        if (replacement) {
                            updatedParticipants.push(replacement.id);
                            continue;
                        }
                    }
                    updatedParticipants.push(brigId);
                }
                op.participating_brigades = updatedParticipants;
            } else if (op.phase === 'recovery') {
                // Clear operation after recovery duration
                if (turnsInPhase >= RECOVERY_DURATION) {
                    releaseOperationCommander(state, op);
                    removeOperation(cmd, op);
                    // Add exhaustion from the operation
                    cmd.corps_exhaustion = Math.min(100, cmd.corps_exhaustion + 15);
                }
            }
        }
    }
}

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
 * through the standard generateCorpsOperationOrders path.
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

        const operation: CorpsOperation = {
            name: `Emergency Defense (${corps.id})`,
            type: 'strategic_defense',
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            target_settlements: uniqueTargets.slice(0, 20), // Cap target list
            participating_brigades: participants.map(b => b.id),
            is_emergency: true,
        };

        cmd.active_operations.push(operation);
        assignOperationCommander(state, operation, corps.id, faction);
    }
}
