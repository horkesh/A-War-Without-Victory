import type {
    ArmyHqOperation,
    CorpsOperation,
    FormationId,
    GameState,
    TacticalGroup,
    TgId,
} from './game_state.js';
import { strictCompare } from './validateGameState.js';

export interface ResolvedArmyHqOperation {
    id: string;
    operation: ArmyHqOperation;
}

/**
 * Resolve the durable Army-HQ receipt for a live CorpsOperation.
 *
 * Exact `army_hq_op_id` linkage always wins. Legacy operations without that
 * field fall back to the deterministic composite `(hostCorpsId, op.name)`.
 */
export function resolveArmyHqOperation(
    state: GameState,
    hostCorpsId: string,
    op: CorpsOperation,
): ResolvedArmyHqOperation | null {
    const operations = state.military.army_hq_operations ?? {};
    if (op.army_hq_op_id != null) {
        const exact = operations[op.army_hq_op_id];
        return exact ? { id: op.army_hq_op_id, operation: exact } : null;
    }

    for (const id of Object.keys(operations).sort(strictCompare)) {
        const candidate = operations[id];
        if (candidate.anchor_corps_id === hostCorpsId && candidate.name === op.name) {
            return { id, operation: candidate };
        }
    }
    return null;
}

/**
 * Resolve live TGs by exact Army-HQ id or the legacy host-corps/name composite.
 * An explicit TG id is authoritative: composite fallback applies only when the
 * TG itself predates `army_hq_op_id` and therefore has no id to compare.
 */
export function resolveTacticalGroupIdsForOperation(
    state: GameState,
    hostCorpsId: FormationId,
    op: CorpsOperation,
): TgId[] {
    const groups = state.military.tactical_groups ?? {};
    const result: TgId[] = [];
    for (const id of Object.keys(groups).sort(strictCompare)) {
        const group = groups[id];
        const matches = group.army_hq_op_id != null
            ? group.army_hq_op_id === op.army_hq_op_id
            : group.corps_id === hostCorpsId && group.op_id === op.name;
        if (matches) result.push(id);
    }
    return result;
}

function hasMatchingLiveCorpsOperation(
    state: GameState,
    armyHqOperationId: string,
    armyHqOperation: ArmyHqOperation,
): boolean {
    const command = state.military.corps_command?.[armyHqOperation.anchor_corps_id];
    for (const operation of command?.active_operations ?? []) {
        if (operation.name !== armyHqOperation.name) continue;
        if (operation.army_hq_op_id == null || operation.army_hq_op_id === armyHqOperationId) {
            return true;
        }
    }
    return false;
}

function tacticalGroupMatchesArmyHqOperation(
    tacticalGroup: TacticalGroup,
    armyHqOperationId: string,
    armyHqOperation: ArmyHqOperation,
): boolean {
    if (tacticalGroup.army_hq_op_id != null) {
        return tacticalGroup.army_hq_op_id === armyHqOperationId;
    }
    return tacticalGroup.corps_id === armyHqOperation.anchor_corps_id
        && tacticalGroup.op_id === armyHqOperation.name;
}

function matchingLiveTacticalGroupIds(
    state: GameState,
    armyHqOperationId: string,
    armyHqOperation: ArmyHqOperation,
): string[] {
    const result: string[] = [];
    for (const id of Object.keys(state.military.tactical_groups ?? {}).sort(strictCompare)) {
        const tacticalGroup = state.military.tactical_groups?.[id];
        if (tacticalGroup && tacticalGroupMatchesArmyHqOperation(
            tacticalGroup,
            armyHqOperationId,
            armyHqOperation,
        )) result.push(id);
    }
    return result;
}

/**
 * Normalize stale Army-HQ links on load. The pass is deterministic and
 * idempotent, and intentionally assigns no new cooldown/recovery penalty to
 * legacy orphan records.
 */
export function reconcileLoadedArmyHqOperationLifecycle(state: GameState): void {
    const operations = state.military.army_hq_operations ?? {};
    const tacticalGroups = state.military.tactical_groups ?? {};

    for (const id of Object.keys(operations).sort(strictCompare)) {
        const operation = operations[id];
        if (operation.status === 'completed') {
            delete operation.tg_id;
            continue;
        }
        const matchingTgIds = matchingLiveTacticalGroupIds(state, id, operation);
        const linkedTg = operation.tg_id != null ? tacticalGroups[operation.tg_id] : undefined;
        const linkedTgMatches = linkedTg != null
            && tacticalGroupMatchesArmyHqOperation(linkedTg, id, operation);

        if (!linkedTgMatches) {
            if (matchingTgIds.length > 0) operation.tg_id = matchingTgIds[0];
            else delete operation.tg_id;
        }

        if (
            (
                operation.status === 'planning'
                || operation.status === 'executing'
                || operation.status === 'recovering'
            )
            && !hasMatchingLiveCorpsOperation(state, id, operation)
            && !linkedTgMatches
            && matchingTgIds.length === 0
        ) {
            operation.status = 'completed';
            delete operation.tg_id;
        }
    }
}
