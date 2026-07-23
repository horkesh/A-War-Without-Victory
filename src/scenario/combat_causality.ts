import type { AttackResolutionOsidReport } from '../sim/combat/attack_resolution_osid.js';
import type { CorpsOperation, FactionId, FormationId, FormationState, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface BotOrderDiagnosticsSnapshot {
    attack_orders_by_brigade: Record<FormationId, string>;
    movement_orders_by_brigade: Record<FormationId, string>;
    attack_orders_by_corps: Record<FormationId, number>;
    attack_orders_by_faction: Record<FactionId, number>;
    eligible_attackers_by_corps: Record<FormationId, number>;
}

export type OperationCombatInvalidationReason =
    | 'execution_without_attack_orders'
    | 'attack_orders_without_battles'
    | 'execution_without_eligible_attackers'
    | 'recovery_without_logged_attempt';

export interface OperationCombatDiagnostic {
    corps_id: FormationId;
    faction_id: FactionId;
    operation_name: string;
    operation_type: CorpsOperation['type'];
    operation_phase: CorpsOperation['phase'];
    current_objective: string | null;
    current_objectives: string[];
    participating_brigades: FormationId[];
    // Legacy compatibility field: now derived from final surviving participant
    // attack orders, not from pre-trim eligibility snapshots.
    eligible_attacker_count: number;
    attack_attempt_count: number;
    objective_attempt_count: number;
    objective_capture_count: number;
    movement_order_count: number;
    movement_only_execution_turns: number;
    idle_execution_turn_streak: number;
    battle_count: number;
    current_objective_attack_count: number;
    current_objective_battle_count: number;
    attack_order_targets: Array<{
        target_osid: string;
        order_count: number;
        battle_count: number;
        current_objective: boolean;
    }>;
    participant_attack_orders: Array<{
        brigade_id: FormationId;
        location_osid: string | null;
        target_osid: string;
        target_is_current_objective: boolean;
        resolver_seen_target_osid: string | null;
        battle_count: number;
    }>;
    skipped_attack_orders: Array<{
        brigade_id: FormationId;
        location_osid: string | null;
        target_osid: string;
        reason: string;
        target_controller: FactionId | null;
    }>;
    recovery_reason: string | null;
    invalid_for_combat_calibration: boolean;
    invalidation_reasons: OperationCombatInvalidationReason[];
}

export type CombatCausalityInvalidationReason =
    | 'zero_battles'
    | 'operation_execution_without_attack_orders'
    | 'operation_attack_orders_without_battles'
    | 'operation_execution_without_eligible_attackers'
    | 'operation_recovery_without_logged_attempt';

export interface CombatCausalitySummary {
    valid_for_combat_calibration: boolean;
    invalidation_reasons: CombatCausalityInvalidationReason[];
    total_attack_orders: number;
    total_objective_attempts: number;
    total_objective_captures: number;
    movement_only_execution_turns: number;
    total_battles: number;
    total_orders_by_faction: Record<FactionId, number>;
    invalid_operation_count: number;
    zero_eligible_attacker_operation_count: number;
    recovery_without_logged_attempt_count: number;
}

function sortedFormationIds(ids: Iterable<string>): string[] {
    return Array.from(ids).sort(strictCompare);
}

function getFormationCorpsId(formation: FormationState): FormationId | null {
    const corpsId = (formation as FormationState & { corps_id?: FormationId }).corps_id;
    return typeof corpsId === 'string' && corpsId.length > 0 ? corpsId : null;
}

function getFormationById(state: GameState, formationId: FormationId): FormationState | undefined {
    const legacyFormations = (state as GameState & { formations?: Record<string, FormationState> }).formations;
    return state.military.formations?.[formationId] ?? legacyFormations?.[formationId];
}

function getCurrentObjectives(operation: CorpsOperation): string[] {
    if (Array.isArray(operation.axes) && operation.axes.length > 0) {
        const currentObjectives = new Set<string>();
        for (const axis of operation.axes) {
            if (axis.status !== 'executing') continue;
            const objective = axis.objectives[axis.current_objective_index ?? 0];
            if (typeof objective === 'string' && objective.length > 0) {
                currentObjectives.add(objective);
            }
        }
        return Array.from(currentObjectives).sort(strictCompare);
    }

    const objective = operation.objectives?.[operation.current_objective_index ?? 0];
    return typeof objective === 'string' && objective.length > 0 ? [objective] : [];
}

export function createBotOrderDiagnosticsSnapshot(
    state: GameState,
    extras?: { eligible_attackers_by_corps?: Record<FormationId, number> }
): BotOrderDiagnosticsSnapshot {
    const attackOrdersByBrigade: Record<FormationId, string> = {};
    const movementOrdersByBrigade: Record<FormationId, string> = {};
    const attackOrdersByCorps: Record<FormationId, number> = {};
    const attackOrdersByFaction: Record<FactionId, number> = {};
    const orders = state.military.brigade_attack_orders ?? {};
    for (const brigadeId of Object.keys(orders).sort(strictCompare)) {
        const target = orders[brigadeId];
        if (typeof target !== 'string' || target.length === 0) continue;
        attackOrdersByBrigade[brigadeId] = target;
        const formation = getFormationById(state, brigadeId);
        const factionId = formation?.faction;
        if (typeof factionId === 'string' && factionId.length > 0) {
            attackOrdersByFaction[factionId] = (attackOrdersByFaction[factionId] ?? 0) + 1;
        }
        if (formation) {
            const corpsId = getFormationCorpsId(formation);
            if (corpsId) {
                attackOrdersByCorps[corpsId] = (attackOrdersByCorps[corpsId] ?? 0) + 1;
            }
        }
    }
    const movementOrders = state.military.brigade_movement_orders ?? {};
    for (const brigadeId of Object.keys(movementOrders).sort(strictCompare)) {
        const destinations = movementOrders[brigadeId]?.destination_sids;
        const destination = Array.isArray(destinations) ? destinations[0] : null;
        if (typeof destination !== 'string' || destination.length === 0) continue;
        movementOrdersByBrigade[brigadeId] = destination;
    }
    // Also count brigades that are in_transit via column march.
    // Column-march orders live in brigade_movement_state (persistent), not
    // brigade_movement_orders (turn-scoped). Without this, the diagnostic fires
    // a false-positive 'execution_without_eligible_attackers' every march turn.
    const movementState = state.military.brigade_movement_state ?? {};
    for (const brigadeId of Object.keys(movementState).sort(strictCompare)) {
        if (movementState[brigadeId]?.status === 'in_transit') {
            if (!(brigadeId in movementOrdersByBrigade)) {
                movementOrdersByBrigade[brigadeId] = 'in_transit';
            }
        }
    }
    return {
        attack_orders_by_brigade: attackOrdersByBrigade,
        movement_orders_by_brigade: movementOrdersByBrigade,
        attack_orders_by_corps: attackOrdersByCorps,
        attack_orders_by_faction: attackOrdersByFaction,
        eligible_attackers_by_corps: { ...(extras?.eligible_attackers_by_corps ?? {}) }
    };
}

export function buildOperationCombatDiagnostics(
    state: GameState,
    orderSnapshot: BotOrderDiagnosticsSnapshot | undefined,
    osidResolution: AttackResolutionOsidReport | undefined
): OperationCombatDiagnostic[] {
    const lifecyclePaused = osidResolution?.operation_lifecycle_paused_reason !== undefined;
    const suppressedAttackOrders = new Set(
        (osidResolution?.suppressed_attack_orders ?? [])
            .map((order) => `${order.brigade_id}|${order.target_osid}`)
    );
    const corpsCommand = state.military.corps_command ?? {};
    const battleCountsByBrigade = new Map<FormationId, number>();
    const battleCountsByOperation = new Map<string, number>();
    const battleCountsByOperationObjective = new Map<string, number>();
    const battleCountsByTarget = new Map<string, number>();
    for (const battle of osidResolution?.battles ?? []) {
        const attackerBrigades = battle.attacker_brigades ?? [battle.attacker_brigade];
        for (const brigadeId of new Set(attackerBrigades)) {
            battleCountsByBrigade.set(
                brigadeId,
                (battleCountsByBrigade.get(brigadeId) ?? 0) + 1
            );
        }
        const operationIds = battle.contributing_operation_ids
            ?? (typeof battle.operation_id === 'string' && battle.operation_id.length > 0
                ? [battle.operation_id]
                : []);
        for (const operationId of new Set(operationIds)) {
            battleCountsByOperation.set(
                operationId,
                (battleCountsByOperation.get(operationId) ?? 0) + 1
            );
            const objectiveKey = `${operationId}|${battle.target_osid}`;
            battleCountsByOperationObjective.set(
                objectiveKey,
                (battleCountsByOperationObjective.get(objectiveKey) ?? 0) + 1
            );
        }
        battleCountsByTarget.set(battle.target_osid, (battleCountsByTarget.get(battle.target_osid) ?? 0) + 1);
    }

    const diagnostics: OperationCombatDiagnostic[] = [];
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const corpsState = corpsCommand[corpsId];
        for (const operation of corpsState?.active_operations ?? []) {
            const corpsFormation = getFormationById(state, corpsId);
            const factionId = corpsFormation?.faction ?? 'unknown';
            const brigades = sortedFormationIds(operation.participating_brigades ?? []);
            const currentObjectives = getCurrentObjectives(operation);
            const currentObjective = currentObjectives[0] ?? null;
            const objectiveAttemptCount = operation.attack_attempt_count ?? 0;
            const objectiveCaptureCount = operation.objective_capture_count ?? 0;
            const movementOnlyExecutionTurns = operation.movement_only_execution_turns ?? 0;
            const idleExecutionTurnStreak = operation.idle_execution_turn_streak ?? 0;
            const operationId = `${corpsId}:${operation.name}:t${operation.started_turn}`;
            const recoveryReason = typeof operation.recovery_reason === 'string'
                ? operation.recovery_reason
                : null;
            const hadResolvedAttackThisTurn =
                operation.last_result === 'captured' || operation.last_result === 'failed';
            let attackAttemptCount = 0;
            let unsuppressedAttackAttemptCount = 0;
            let movementOrderCount = 0;
            let currentObjectiveAttackCount = 0;
            let participantBattleCount = 0;
            const attackTargetCounts = new Map<string, number>();
            const participantAttackOrders: OperationCombatDiagnostic['participant_attack_orders'] = [];
            const participantSet = new Set(brigades);
            const skippedAttackOrders = (osidResolution?.skipped_attack_orders ?? [])
                .filter((skip) => participantSet.has(skip.brigade_id))
                .sort((a, b) => {
                    const byBrigade = strictCompare(a.brigade_id, b.brigade_id);
                    if (byBrigade !== 0) return byBrigade;
                    const byTarget = strictCompare(a.target_osid, b.target_osid);
                    if (byTarget !== 0) return byTarget;
                    return strictCompare(a.reason, b.reason);
                })
                .map((skip) => ({
                    brigade_id: skip.brigade_id,
                    location_osid: skip.location_osid ?? null,
                    target_osid: skip.target_osid,
                    reason: skip.reason,
                    target_controller: skip.target_controller ?? null,
                }));
            for (const brigadeId of brigades) {
                const target = orderSnapshot?.attack_orders_by_brigade?.[brigadeId];
                if (typeof target === 'string' && target.length > 0) {
                    attackAttemptCount += 1;
                    if (!suppressedAttackOrders.has(`${brigadeId}|${target}`)) {
                        unsuppressedAttackAttemptCount += 1;
                    }
                    attackTargetCounts.set(target, (attackTargetCounts.get(target) ?? 0) + 1);
                    if (currentObjectives.includes(target)) {
                        currentObjectiveAttackCount += 1;
                    }
                    const formation = getFormationById(state, brigadeId);
                    participantAttackOrders.push({
                        brigade_id: brigadeId,
                        location_osid: formation?.location_osid ?? null,
                        target_osid: target,
                        target_is_current_objective: currentObjectives.includes(target),
                        resolver_seen_target_osid: osidResolution?.orders_seen_by_brigade?.[brigadeId] ?? null,
                        battle_count: battleCountsByBrigade.get(brigadeId) ?? 0,
                    });
                }
                const movementTarget = orderSnapshot?.movement_orders_by_brigade?.[brigadeId];
                if (typeof movementTarget === 'string' && movementTarget.length > 0) {
                    movementOrderCount += 1;
                }
                participantBattleCount += battleCountsByBrigade.get(brigadeId) ?? 0;
            }
            const operationBattleCount = battleCountsByOperation.get(operationId) ?? 0;
            const battleCount = operationBattleCount > 0
                ? operationBattleCount
                : participantBattleCount;
            // Keep the legacy field name stable for downstream consumers, but bind it
            // to the post-trim operation-local order truth the invalidation logic uses.
            const finalOrderedAttackerCount = attackAttemptCount;
            const currentObjectiveBattleCount = currentObjective !== null
                ? (battleCountsByOperationObjective.get(`${operationId}|${currentObjective}`) ?? 0)
                : 0;
            const attackOrderTargets = Array.from(attackTargetCounts.entries())
                .sort((a, b) => strictCompare(a[0], b[0]))
                .map(([targetOsid, orderCount]) => ({
                    target_osid: targetOsid,
                    order_count: orderCount,
                    battle_count: battleCountsByTarget.get(targetOsid) ?? 0,
                    current_objective: currentObjectives.includes(targetOsid),
                }));
            const invalidationReasons: OperationCombatInvalidationReason[] = [];
            if (
                !lifecyclePaused &&
                operation.phase === 'execution' &&
                !hadResolvedAttackThisTurn &&
                attackAttemptCount === 0 &&
                movementOrderCount === 0 &&
                objectiveAttemptCount === 0 &&
                objectiveCaptureCount === 0
            ) {
                invalidationReasons.push('execution_without_attack_orders');
            }
            if (
                !lifecyclePaused &&
                operation.phase === 'execution' &&
                !hadResolvedAttackThisTurn &&
                brigades.length > 0 &&
                finalOrderedAttackerCount === 0 &&
                movementOrderCount === 0 &&
                objectiveAttemptCount === 0 &&
                objectiveCaptureCount === 0
            ) {
                invalidationReasons.push('execution_without_eligible_attackers');
            }
            if (
                operation.phase === 'execution' &&
                unsuppressedAttackAttemptCount > 0 &&
                battleCount === 0
            ) {
                invalidationReasons.push('attack_orders_without_battles');
            }
            const currentTurn = state.meta?.turn ?? 0;
            const enteredRecoveryThisTurn =
                operation.phase === 'recovery' &&
                typeof operation.phase_started_turn === 'number' &&
                operation.phase_started_turn === currentTurn;
            if (
                !lifecyclePaused &&
                enteredRecoveryThisTurn &&
                recoveryReason === 'no_logged_attempt' &&
                objectiveAttemptCount === 0 &&
                attackAttemptCount === 0 &&
                battleCount === 0 &&
                movementOnlyExecutionTurns === 0 &&
                movementOrderCount === 0
            ) {
                invalidationReasons.push('recovery_without_logged_attempt');
            }
            diagnostics.push({
                corps_id: corpsId,
                faction_id: factionId,
                operation_name: operation.name,
                operation_type: operation.type,
                operation_phase: operation.phase,
                current_objective: currentObjective,
                current_objectives: currentObjectives,
                participating_brigades: brigades,
                eligible_attacker_count: finalOrderedAttackerCount,
                attack_attempt_count: attackAttemptCount,
                objective_attempt_count: objectiveAttemptCount,
                objective_capture_count: objectiveCaptureCount,
                movement_order_count: movementOrderCount,
                movement_only_execution_turns: movementOnlyExecutionTurns,
                idle_execution_turn_streak: idleExecutionTurnStreak,
                battle_count: battleCount,
                current_objective_attack_count: currentObjectiveAttackCount,
                current_objective_battle_count: currentObjectiveBattleCount,
                attack_order_targets: attackOrderTargets,
                participant_attack_orders: participantAttackOrders,
                skipped_attack_orders: skippedAttackOrders,
                recovery_reason: recoveryReason,
                invalid_for_combat_calibration: invalidationReasons.length > 0,
                invalidation_reasons: invalidationReasons
            });
        } // end for-of active_operations
    }
    return diagnostics;
}

export function buildCombatCausalitySummary(
    operationDiagnostics: OperationCombatDiagnostic[],
    orderSnapshot: BotOrderDiagnosticsSnapshot | undefined,
    osidResolution: AttackResolutionOsidReport | undefined
): CombatCausalitySummary {
    const invalidationReasons = new Set<CombatCausalityInvalidationReason>();
    const totalBattles = osidResolution?.battles?.length ?? 0;
    const totalAttackOrders = Object.keys(orderSnapshot?.attack_orders_by_brigade ?? {}).length;
    const suppressedAttackOrders = new Set(
        (osidResolution?.suppressed_attack_orders ?? [])
            .map((order) => `${order.brigade_id}|${order.target_osid}`)
    );
    const unsuppressedAttackOrderCount = Object.entries(orderSnapshot?.attack_orders_by_brigade ?? {})
        .filter(([brigadeId, targetOsid]) => !suppressedAttackOrders.has(`${brigadeId}|${targetOsid}`))
        .length;
    if (
        totalBattles === 0 &&
        unsuppressedAttackOrderCount > 0
    ) {
        invalidationReasons.add('zero_battles');
    }
    let invalidOperationCount = 0;
    let totalObjectiveAttempts = 0;
    let totalObjectiveCaptures = 0;
    let totalMovementOnlyExecutionTurns = 0;
    let zeroEligibleAttackerOperationCount = 0;
    let recoveryWithoutLoggedAttemptCount = 0;
    for (const diagnostic of operationDiagnostics) {
        totalObjectiveAttempts += diagnostic.objective_attempt_count;
        totalObjectiveCaptures += diagnostic.objective_capture_count;
        totalMovementOnlyExecutionTurns += diagnostic.movement_only_execution_turns;
        if (!diagnostic.invalid_for_combat_calibration) continue;
        invalidOperationCount += 1;
        if (diagnostic.invalidation_reasons.includes('execution_without_attack_orders')) {
            invalidationReasons.add('operation_execution_without_attack_orders');
        }
        if (diagnostic.invalidation_reasons.includes('attack_orders_without_battles')) {
            invalidationReasons.add('operation_attack_orders_without_battles');
        }
        if (diagnostic.invalidation_reasons.includes('execution_without_eligible_attackers')) {
            invalidationReasons.add('operation_execution_without_eligible_attackers');
            zeroEligibleAttackerOperationCount += 1;
        }
        if (diagnostic.invalidation_reasons.includes('recovery_without_logged_attempt')) {
            invalidationReasons.add('operation_recovery_without_logged_attempt');
            recoveryWithoutLoggedAttemptCount += 1;
        }
    }

    const totalOrdersByFaction: Record<FactionId, number> = {};
    for (const factionId of Object.keys(orderSnapshot?.attack_orders_by_faction ?? {}).sort(strictCompare)) {
        totalOrdersByFaction[factionId] = orderSnapshot?.attack_orders_by_faction?.[factionId] ?? 0;
    }

    return {
        valid_for_combat_calibration: invalidationReasons.size === 0,
        invalidation_reasons: Array.from(invalidationReasons).sort(strictCompare),
        total_attack_orders: totalAttackOrders,
        total_objective_attempts: totalObjectiveAttempts,
        total_objective_captures: totalObjectiveCaptures,
        movement_only_execution_turns: totalMovementOnlyExecutionTurns,
        total_battles: totalBattles,
        total_orders_by_faction: totalOrdersByFaction,
        invalid_operation_count: invalidOperationCount,
        zero_eligible_attacker_operation_count: zeroEligibleAttackerOperationCount,
        recovery_without_logged_attempt_count: recoveryWithoutLoggedAttemptCount
    };
}
