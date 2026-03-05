import type { AttackResolutionOsidReport } from '../sim/combat/attack_resolution_osid.js';
import type { CorpsOperation, FactionId, FormationId, FormationState, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface BotOrderDiagnosticsSnapshot {
    attack_orders_by_brigade: Record<FormationId, string>;
    movement_orders_by_brigade: Record<FormationId, string>;
    attack_orders_by_corps: Record<FormationId, number>;
    attack_orders_by_faction: Record<FactionId, number>;
}

export type OperationCombatInvalidationReason =
    | 'execution_without_attack_orders'
    | 'attack_orders_without_battles';

export interface OperationCombatDiagnostic {
    corps_id: FormationId;
    faction_id: FactionId;
    operation_name: string;
    operation_type: CorpsOperation['type'];
    operation_phase: CorpsOperation['phase'];
    current_objective: string | null;
    participating_brigades: FormationId[];
    attack_attempt_count: number;
    movement_order_count: number;
    battle_count: number;
    current_objective_attack_count: number;
    current_objective_battle_count: number;
    invalid_for_combat_calibration: boolean;
    invalidation_reasons: OperationCombatInvalidationReason[];
}

export type CombatCausalityInvalidationReason =
    | 'zero_battles'
    | 'operation_execution_without_attack_orders'
    | 'operation_attack_orders_without_battles';

export interface CombatCausalitySummary {
    valid_for_combat_calibration: boolean;
    invalidation_reasons: CombatCausalityInvalidationReason[];
    total_attack_orders: number;
    total_battles: number;
    total_orders_by_faction: Record<FactionId, number>;
    invalid_operation_count: number;
}

function sortedFormationIds(ids: Iterable<string>): string[] {
    return Array.from(ids).sort(strictCompare);
}

function getFormationCorpsId(formation: FormationState): FormationId | null {
    const corpsId = (formation as FormationState & { corps_id?: FormationId }).corps_id;
    return typeof corpsId === 'string' && corpsId.length > 0 ? corpsId : null;
}

function getCurrentObjective(operation: CorpsOperation): string | null {
    const objectives = operation.objectives ?? [];
    const index = operation.current_objective_index ?? 0;
    const objective = objectives[index];
    return typeof objective === 'string' && objective.length > 0 ? objective : null;
}

export function createBotOrderDiagnosticsSnapshot(state: GameState): BotOrderDiagnosticsSnapshot {
    const attackOrdersByBrigade: Record<FormationId, string> = {};
    const movementOrdersByBrigade: Record<FormationId, string> = {};
    const attackOrdersByCorps: Record<FormationId, number> = {};
    const attackOrdersByFaction: Record<FactionId, number> = {};
    const orders = state.brigade_attack_orders ?? {};
    for (const brigadeId of Object.keys(orders).sort(strictCompare)) {
        const target = orders[brigadeId];
        if (typeof target !== 'string' || target.length === 0) continue;
        attackOrdersByBrigade[brigadeId] = target;
        const formation = state.formations?.[brigadeId];
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
    const movementOrders = state.brigade_movement_orders ?? {};
    for (const brigadeId of Object.keys(movementOrders).sort(strictCompare)) {
        const destinations = movementOrders[brigadeId]?.destination_sids;
        const destination = Array.isArray(destinations) ? destinations[0] : null;
        if (typeof destination !== 'string' || destination.length === 0) continue;
        movementOrdersByBrigade[brigadeId] = destination;
    }
    return {
        attack_orders_by_brigade: attackOrdersByBrigade,
        movement_orders_by_brigade: movementOrdersByBrigade,
        attack_orders_by_corps: attackOrdersByCorps,
        attack_orders_by_faction: attackOrdersByFaction
    };
}

export function buildOperationCombatDiagnostics(
    state: GameState,
    orderSnapshot: BotOrderDiagnosticsSnapshot | undefined,
    osidResolution: AttackResolutionOsidReport | undefined
): OperationCombatDiagnostic[] {
    const corpsCommand = state.corps_command ?? {};
    const battleCountsByBrigade = new Map<FormationId, number>();
    const battleCountsByTarget = new Map<string, number>();
    for (const battle of osidResolution?.battles ?? []) {
        battleCountsByBrigade.set(
            battle.attacker_brigade,
            (battleCountsByBrigade.get(battle.attacker_brigade) ?? 0) + 1
        );
        battleCountsByTarget.set(battle.target_osid, (battleCountsByTarget.get(battle.target_osid) ?? 0) + 1);
    }

    const diagnostics: OperationCombatDiagnostic[] = [];
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const corpsState = corpsCommand[corpsId];
        const operation = corpsState?.active_operation;
        if (!operation) continue;
        const corpsFormation = state.formations?.[corpsId];
        const factionId = (corpsFormation?.faction ?? 'unknown') as FactionId;
        const brigades = sortedFormationIds(operation.participating_brigades ?? []);
        const currentObjective = getCurrentObjective(operation);
        let attackAttemptCount = 0;
        let movementOrderCount = 0;
        let currentObjectiveAttackCount = 0;
        let battleCount = 0;
        for (const brigadeId of brigades) {
            const target = orderSnapshot?.attack_orders_by_brigade?.[brigadeId];
            if (typeof target === 'string' && target.length > 0) {
                attackAttemptCount += 1;
                if (currentObjective !== null && target === currentObjective) {
                    currentObjectiveAttackCount += 1;
                }
            }
            const movementTarget = orderSnapshot?.movement_orders_by_brigade?.[brigadeId];
            if (typeof movementTarget === 'string' && movementTarget.length > 0) {
                movementOrderCount += 1;
            }
            battleCount += battleCountsByBrigade.get(brigadeId) ?? 0;
        }
        const currentObjectiveBattleCount = currentObjective !== null
            ? (battleCountsByTarget.get(currentObjective) ?? 0)
            : 0;
        const invalidationReasons: OperationCombatInvalidationReason[] = [];
        if (operation.phase === 'execution' && attackAttemptCount === 0 && movementOrderCount === 0) {
            invalidationReasons.push('execution_without_attack_orders');
        }
        if (operation.phase === 'execution' && attackAttemptCount > 0 && battleCount === 0) {
            invalidationReasons.push('attack_orders_without_battles');
        }
        diagnostics.push({
            corps_id: corpsId,
            faction_id: factionId,
            operation_name: operation.name,
            operation_type: operation.type,
            operation_phase: operation.phase,
            current_objective: currentObjective,
            participating_brigades: brigades,
            attack_attempt_count: attackAttemptCount,
            movement_order_count: movementOrderCount,
            battle_count: battleCount,
            current_objective_attack_count: currentObjectiveAttackCount,
            current_objective_battle_count: currentObjectiveBattleCount,
            invalid_for_combat_calibration: invalidationReasons.length > 0,
            invalidation_reasons: invalidationReasons
        });
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
    if (totalBattles === 0) {
        invalidationReasons.add('zero_battles');
    }
    let invalidOperationCount = 0;
    for (const diagnostic of operationDiagnostics) {
        if (!diagnostic.invalid_for_combat_calibration) continue;
        invalidOperationCount += 1;
        if (diagnostic.invalidation_reasons.includes('execution_without_attack_orders')) {
            invalidationReasons.add('operation_execution_without_attack_orders');
        }
        if (diagnostic.invalidation_reasons.includes('attack_orders_without_battles')) {
            invalidationReasons.add('operation_attack_orders_without_battles');
        }
    }

    const totalOrdersByFaction: Record<FactionId, number> = {};
    for (const factionId of Object.keys(orderSnapshot?.attack_orders_by_faction ?? {}).sort(strictCompare)) {
        totalOrdersByFaction[factionId] = orderSnapshot?.attack_orders_by_faction?.[factionId] ?? 0;
    }

    return {
        valid_for_combat_calibration: invalidationReasons.size === 0,
        invalidation_reasons: Array.from(invalidationReasons).sort(strictCompare),
        total_attack_orders: Object.keys(orderSnapshot?.attack_orders_by_brigade ?? {}).length,
        total_battles: totalBattles,
        total_orders_by_faction: totalOrdersByFaction,
        invalid_operation_count: invalidOperationCount
    };
}
