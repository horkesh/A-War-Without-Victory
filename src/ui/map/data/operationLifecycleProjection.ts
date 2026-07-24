import { resolvePlayerFacingFaction } from '../../shared/playerVisibility';
import type { LoadedGameState, OperationView } from './types';

export type OperationLifecyclePhase =
    | 'proposed'
    | 'planning'
    | 'executing'
    | 'recovery'
    | 'completed'
    | 'archived';

export type OperationHistoryExclusionReason = 'non_player_faction' | 'invalid_record';

type ActiveOperation = NonNullable<LoadedGameState['activeOperations']>[number];
type CompletedOperation = NonNullable<LoadedGameState['operationHistory']>[number];

export interface OperationLifecycleCounts {
    proposed: number;
    planning: number;
    executing: number;
    recovery: number;
    completed: number;
    archived: number;
}

export interface OperationLifecycleMetric {
    id: `operation.lifecycle.${OperationLifecyclePhase}`;
    phase: OperationLifecyclePhase;
    label: 'Proposed' | 'Planning' | 'Executing' | 'Recovery' | 'Completed' | 'Archived';
    count: number;
    period: 'current' | 'campaign';
    denominator: string;
    definition: string;
}

export interface ActiveOperationLifecycleRow {
    id: string;
    lifecycle: 'planning' | 'executing' | 'recovery' | 'unreported';
    operation: ActiveOperation;
    source: 'operations' | 'activeOperations';
}

export interface CompletedOperationLifecycleRow {
    id: string;
    lifecycle: 'completed';
    operation: CompletedOperation;
    rawIndex: number;
}

export interface ExcludedOperationHistoryRow {
    id: string;
    lifecycle: 'archived';
    operation: CompletedOperation | null;
    rawIndex: number;
    reason: OperationHistoryExclusionReason;
    sourceFaction: string | null;
}

export interface OperationLifecycleProjection {
    counts: OperationLifecycleCounts;
    metrics: readonly OperationLifecycleMetric[];
    activeRows: readonly ActiveOperationLifecycleRow[];
    historyRows: readonly CompletedOperationLifecycleRow[];
    excludedHistoryRows: readonly ExcludedOperationHistoryRow[];
    personnelActivityCount: number;
    hasOperationActivity: boolean;
    hasArchiveActivity: boolean;
    hasAnyActivity: boolean;
}

const LIFECYCLE_PHASES: readonly OperationLifecyclePhase[] = [
    'proposed',
    'planning',
    'executing',
    'recovery',
    'completed',
    'archived',
];

const METRIC_DEFINITIONS: Record<OperationLifecyclePhase, Omit<OperationLifecycleMetric, 'count'>> = {
    proposed: {
        id: 'operation.lifecycle.proposed',
        phase: 'proposed',
        label: 'Proposed',
        period: 'current',
        denominator: 'player-facing operation proposals',
        definition: 'Operation opportunities currently awaiting player review.',
    },
    planning: {
        id: 'operation.lifecycle.planning',
        phase: 'planning',
        label: 'Planning',
        period: 'current',
        denominator: 'player-facing active operations',
        definition: 'Active player operations currently in preparation or planning.',
    },
    executing: {
        id: 'operation.lifecycle.executing',
        phase: 'executing',
        label: 'Executing',
        period: 'current',
        denominator: 'player-facing active operations',
        definition: 'Active player operations currently executing.',
    },
    recovery: {
        id: 'operation.lifecycle.recovery',
        phase: 'recovery',
        label: 'Recovery',
        period: 'current',
        denominator: 'player-facing active operations',
        definition: 'Active player operations currently recovering or closing out.',
    },
    completed: {
        id: 'operation.lifecycle.completed',
        phase: 'completed',
        label: 'Completed',
        period: 'campaign',
        denominator: 'player-visible operation history rows',
        definition: 'Completed operation records visible from the player faction.',
    },
    archived: {
        id: 'operation.lifecycle.archived',
        phase: 'archived',
        label: 'Archived',
        period: 'campaign',
        denominator: 'raw operation history rows',
        definition: 'All raw operation history rows, including rows excluded from player detail.',
    },
};

function isPlayerFaction(faction: unknown, playerFaction: string | null): boolean {
    return playerFaction == null || faction === playerFaction;
}

function compareStableIds(a: { id: string }, b: { id: string }): number {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function normalizeLifecycle(phase: unknown): ActiveOperationLifecycleRow['lifecycle'] {
    const normalized = typeof phase === 'string' ? phase.trim().toLowerCase() : '';
    if (normalized === 'execution' || normalized === 'executing') return 'executing';
    if (normalized === 'recovery' || normalized === 'recovering') return 'recovery';
    if (normalized === 'planning') return 'planning';
    return 'unreported';
}

function activeIdentity(corpsId: unknown, operationName: unknown, startedTurn: unknown): string {
    const corps = typeof corpsId === 'string' && corpsId ? corpsId : 'unknown-corps';
    const name = typeof operationName === 'string' && operationName ? operationName : 'unnamed-operation';
    const turn = typeof startedTurn === 'number' && Number.isFinite(startedTurn) ? startedTurn : 'unknown-turn';
    return `${corps}:${name}:${turn}`;
}

function canonicalActiveOperation(operation: OperationView, detail?: ActiveOperation): ActiveOperation {
    return {
        corps_id: operation.corps_id,
        operation_name: operation.name,
        operation_display_name: operation.display_name,
        faction: operation.faction,
        type: operation.type,
        phase: operation.phase_unreported ? '' : operation.phase,
        started_turn: operation.started_turn,
        participating_brigades: detail?.participating_brigades ?? operation.participating_brigade_ids ?? [],
        commander_name: detail?.commander_name,
        objectives_count: detail?.objectives_count ?? operation.objectives?.length ?? 0,
        objectives_captured: detail?.objectives_captured ?? operation.current_objective_index ?? 0,
        attacks: detail?.attacks ?? 0,
        weekly_log_length: detail?.weekly_log_length ?? 0,
    };
}

function projectActiveRows(
    state: LoadedGameState,
    playerFaction: string | null,
): ActiveOperationLifecycleRow[] {
    const detailByIdentity = new Map<string, ActiveOperation>();
    for (const operation of state.activeOperations ?? []) {
        if (!isPlayerFaction(operation.faction, playerFaction)) continue;
        const identity = activeIdentity(operation.corps_id, operation.operation_name, operation.started_turn);
        if (!detailByIdentity.has(identity)) detailByIdentity.set(identity, operation);
    }

    const rows = new Map<string, ActiveOperationLifecycleRow>();
    for (const operation of state.operations ?? []) {
        if (!isPlayerFaction(operation.faction, playerFaction)) continue;
        const identity = activeIdentity(operation.corps_id, operation.name, operation.started_turn);
        rows.set(identity, {
            id: `active:${identity}`,
            lifecycle: normalizeLifecycle(operation.phase_unreported ? null : operation.phase),
            operation: canonicalActiveOperation(operation, detailByIdentity.get(identity)),
            source: 'operations',
        });
    }

    for (const operation of state.activeOperations ?? []) {
        if (!isPlayerFaction(operation.faction, playerFaction)) continue;
        const identity = activeIdentity(operation.corps_id, operation.operation_name, operation.started_turn);
        if (rows.has(identity)) continue;
        rows.set(identity, {
            id: `active:${identity}`,
            lifecycle: normalizeLifecycle(operation.phase),
            operation,
            source: 'activeOperations',
        });
    }

    return [...rows.values()].sort(compareStableIds);
}

function historyBaseId(operation: CompletedOperation | null, rawIndex: number): string {
    const operationId = typeof operation?.operation_id === 'string' ? operation.operation_id.trim() : '';
    if (operationId) return operationId;
    if (operation) {
        return `history:${activeIdentity(operation.corps_id, operation.operation_name, operation.started_turn)}:${operation.ended_turn}`;
    }
    return `history:invalid:${rawIndex}`;
}

function uniqueHistoryId(baseId: string, occurrences: Map<string, number>): string {
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    return occurrence === 1 ? baseId : `${baseId}#${occurrence}`;
}

function projectHistoryRows(
    state: LoadedGameState,
    playerFaction: string | null,
): Pick<OperationLifecycleProjection, 'historyRows' | 'excludedHistoryRows'> {
    const historyRows: CompletedOperationLifecycleRow[] = [];
    const excludedHistoryRows: ExcludedOperationHistoryRow[] = [];
    const occurrences = new Map<string, number>();
    const rawHistory = Array.isArray(state.rawOperationHistory)
        ? state.rawOperationHistory
        : Array.isArray(state.operationHistory)
            ? state.operationHistory
            : [];

    rawHistory.forEach((candidate, rawIndex) => {
        const operation = candidate && typeof candidate === 'object' ? candidate as CompletedOperation : null;
        const id = uniqueHistoryId(historyBaseId(operation, rawIndex), occurrences);
        if (!operation) {
            excludedHistoryRows.push({
                id,
                lifecycle: 'archived',
                operation: null,
                rawIndex,
                reason: 'invalid_record',
                sourceFaction: null,
            });
            return;
        }
        if (!isPlayerFaction(operation.faction, playerFaction)) {
            excludedHistoryRows.push({
                id,
                lifecycle: 'archived',
                operation,
                rawIndex,
                reason: 'non_player_faction',
                sourceFaction: typeof operation.faction === 'string' && operation.faction.trim()
                    ? operation.faction.trim()
                    : null,
            });
            return;
        }
        historyRows.push({ id, lifecycle: 'completed', operation, rawIndex });
    });

    return { historyRows, excludedHistoryRows };
}

function countPersonnelActivity(state: LoadedGameState, playerFaction: string | null): number {
    const filed = (state.officerDecisionHistory ?? []).filter((record) => isPlayerFaction(record.faction, playerFaction)).length;
    const pending = (state.pendingOfficerEvents ?? []).filter((record) => (
        isPlayerFaction(record.faction, playerFaction)
        && (record.type === 'officer_available'
            || record.type === 'replacement_suggested'
            || record.type === 'officer_relieved')
    )).length;
    return filed + pending;
}

export function projectOperationLifecycle(
    state: LoadedGameState | null | undefined,
): OperationLifecycleProjection {
    if (!state) {
        const counts: OperationLifecycleCounts = {
            proposed: 0,
            planning: 0,
            executing: 0,
            recovery: 0,
            completed: 0,
            archived: 0,
        };
        return {
            counts,
            metrics: LIFECYCLE_PHASES.map((phase) => ({ ...METRIC_DEFINITIONS[phase], count: 0 })),
            activeRows: [],
            historyRows: [],
            excludedHistoryRows: [],
            personnelActivityCount: 0,
            hasOperationActivity: false,
            hasArchiveActivity: false,
            hasAnyActivity: false,
        };
    }

    const playerFaction = resolvePlayerFacingFaction(state);
    const activeRows = projectActiveRows(state, playerFaction);
    const { historyRows, excludedHistoryRows } = projectHistoryRows(state, playerFaction);
    const opportunityProposalCount = (state.operationOpportunityProposals ?? []).filter((proposal) => (
        proposal.status === 'eligible_pending_review'
        && Boolean(proposal.review_id)
        && isPlayerFaction(proposal.faction, playerFaction)
    )).length;
    const armyCommanderProposalCount = (state.pendingOfficerEvents ?? []).filter((event) => (
        event.type === 'army_co_proposes_op'
        && !event.acknowledged
        && isPlayerFaction(event.faction, playerFaction)
    )).length;
    const proposed = opportunityProposalCount + Math.max(
        armyCommanderProposalCount,
        state.opProposalCards?.length ?? 0,
    );
    const personnelActivityCount = countPersonnelActivity(state, playerFaction);
    const counts: OperationLifecycleCounts = {
        proposed,
        planning: activeRows.filter((row) => row.lifecycle === 'planning').length,
        executing: activeRows.filter((row) => row.lifecycle === 'executing').length,
        recovery: activeRows.filter((row) => row.lifecycle === 'recovery').length,
        completed: historyRows.length,
        archived: historyRows.length + excludedHistoryRows.length,
    };
    const metrics = LIFECYCLE_PHASES.map((phase) => ({
        ...METRIC_DEFINITIONS[phase],
        count: counts[phase],
    }));
    const hasOperationActivity = proposed > 0 || activeRows.length > 0 || counts.archived > 0;
    const hasArchiveActivity = counts.archived > 0 || personnelActivityCount > 0;

    return {
        counts,
        metrics,
        activeRows,
        historyRows,
        excludedHistoryRows,
        personnelActivityCount,
        hasOperationActivity,
        hasArchiveActivity,
        hasAnyActivity: hasOperationActivity || hasArchiveActivity,
    };
}
