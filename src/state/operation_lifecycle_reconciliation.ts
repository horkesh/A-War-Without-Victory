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
            : group.op_id === op.name
                && (group.corps_id === hostCorpsId || isCrossCorpsAnchoredGroupOf(state, group, hostCorpsId, op.name));
        if (matches) result.push(id);
    }
    return result;
}

/**
 * A TG takes its ANCHOR's corps (`formTacticalGroup`), so an operation whose anchor brigade
 * belongs to another corps (e.g. a 7th Corps operation anchored by a 3rd Corps brigade) hosts a
 * TG with `corps_id !== hostCorpsId`. Matching only on the host corps left such a TG unmatched
 * for its whole life: never engaged, never dissolved when the operation ended, holding a faction
 * and corps TG slot and its donors' lent personnel until the end of the war (zombie-TG fix,
 * 2026-11-16: Operation Vlasic Ridge's TG stayed `forming` from t162 to t188).
 *
 * The group belongs to this operation when it carries the operation's name, its anchor is of the
 * host corps' faction, and the anchor's own corps hosts no live operation of that name. The last
 * condition keeps a same-name operation in another corps from claiming that corps' own TG.
 */
function isCrossCorpsAnchoredGroupOf(
    state: GameState,
    group: TacticalGroup,
    hostCorpsId: FormationId,
    opName: string,
): boolean {
    const formations = state.military.formations ?? {};
    const hostFaction = formations[hostCorpsId]?.faction;
    if (hostFaction == null) return false;
    if (formations[group.anchor_brigade_id]?.faction !== hostFaction) return false;
    const anchorCorpsOperations = state.military.corps_command?.[group.corps_id]?.active_operations ?? [];
    return !anchorCorpsOperations.some((operation) => operation.name === opName);
}

function findMatchingLiveCorpsOperation(
    state: GameState,
    armyHqOperationId: string,
    armyHqOperation: ArmyHqOperation,
): CorpsOperation | undefined {
    const command = state.military.corps_command?.[armyHqOperation.anchor_corps_id];
    for (const operation of command?.active_operations ?? []) {
        if (operation.name !== armyHqOperation.name) continue;
        if (operation.army_hq_op_id == null || operation.army_hq_op_id === armyHqOperationId) {
            return operation;
        }
    }
    return undefined;
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
        const matchingCorpsOperation = findMatchingLiveCorpsOperation(state, id, operation);
        const linkedTg = operation.tg_id != null ? tacticalGroups[operation.tg_id] : undefined;
        const linkedTgMatches = linkedTg != null
            && tacticalGroupMatchesArmyHqOperation(linkedTg, id, operation);

        if (!linkedTgMatches) {
            if (matchingTgIds.length > 0) operation.tg_id = matchingTgIds[0];
            else delete operation.tg_id;
        }

        if (
            matchingCorpsOperation?.phase === 'recovery'
            && (
                operation.status === 'planning'
                || operation.status === 'executing'
                || operation.status === 'recovering'
            )
        ) {
            operation.status = 'recovering';
            if (operation.recovery_started_turn == null) {
                operation.recovery_started_turn = matchingCorpsOperation.phase_started_turn;
            }
        }

        if (
            (
                operation.status === 'planning'
                || operation.status === 'executing'
                || operation.status === 'recovering'
            )
            && matchingCorpsOperation == null
            && !linkedTgMatches
            && matchingTgIds.length === 0
        ) {
            operation.status = 'completed';
            delete operation.tg_id;
        }
    }
}
