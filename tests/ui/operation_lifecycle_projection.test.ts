// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AARPanel } from '../../src/ui/map/components/AARPanel.js';
import { generateCoSBriefing } from '../../src/ui/map/components/army_hq/ChiefOfStaffBriefing.js';
import { RecordsContent } from '../../src/ui/map/components/army_hq/RecordsContent.js';
import { generateChronicleEntries } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { projectOperationLifecycle } from '../../src/ui/map/data/operationLifecycleProjection.js';
import type { LoadedGameState, OperationView } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

type CompletedOperation = NonNullable<LoadedGameState['operationHistory']>[number];

function activeOperation(index: number, name = `generated_rbih_operation_${index}`): OperationView {
    return {
        corps_id: `rbih_corps_${index}`,
        corps_name: `${index} Corps`,
        faction: 'RBiH',
        name,
        display_name: index === 3 ? 'Player Operation Una' : `Staff Operation ${index}`,
        type: 'sector_attack',
        phase: 'execution',
        participating_brigade_count: 2,
        participating_brigade_ids: [`rbih_bde_${index}_a`, `rbih_bde_${index}_b`],
        started_turn: 40 + index,
        objectives: [`op:test:objective_${index}`],
        current_objective_index: 0,
    };
}

function historyOperation(index: number, faction = 'RS'): CompletedOperation {
    return {
        operation_id: `raw-history-${index}`,
        operation_name: `raw_history_operation_${index}`,
        operation_display_name: `Archived Operation ${index}`,
        corps_id: faction === 'RBiH' ? 'rbih_1st_corps' : 'vrs_1st_corps',
        faction,
        started_turn: index,
        ended_turn: index + 2,
        outcome: index % 2 === 0 ? 'partial' : 'failure',
        commander_name: index === 1 ? 'Archive Commander' : undefined,
        commander_rank: index === 1 ? 'Colonel' : undefined,
        objectives_targeted: [`op:test:history_${index}`],
        objectives_captured: [],
        total_attacks: index,
        casualties_suffered: { killed: index, wounded: index * 2 },
        casualties_inflicted: { killed: index * 2, wounded: index * 3 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        grade: { stars: 2, verdict: 'Limited', factors: {} },
        duration_turns: 3,
        weekly_log: [],
    };
}

function lifecycleFixture(): LoadedGameState {
    const operations = [activeOperation(1), activeOperation(2), activeOperation(3)];
    return {
        player_faction: 'RBiH',
        turn: 52,
        phase: 'war',
        label: 'RBiH turn 52',
        formations: operations.map((operation) => ({
            id: operation.corps_id,
            faction: 'RBiH',
            name: operation.corps_name,
            kind: 'corps',
            readiness: 'active',
            status: 'active',
            createdTurn: 0,
            tags: [],
        })),
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        operations,
        activeOperations: operations.slice(0, 2).map((operation) => ({
            corps_id: operation.corps_id,
            operation_name: operation.name,
            operation_display_name: operation.display_name,
            faction: operation.faction,
            type: operation.type,
            phase: operation.phase,
            started_turn: operation.started_turn,
            participating_brigades: operation.participating_brigade_ids ?? [],
            objectives_count: operation.objectives?.length ?? 0,
            objectives_captured: 0,
            attacks: 1,
            weekly_log_length: 1,
        })),
        operationHistory: Array.from({ length: 13 }, (_, index) => historyOperation(index + 1)),
        operationOpportunityProposals: [{
            proposal_id: 'rbih-proposal-1',
            opportunity_id: 'opportunity-1',
            display_name: 'Operation Window',
            faction: 'RBiH',
            status: 'eligible_pending_review',
            review_id: 'review-1',
            prerequisite_axes: [],
            force_quality_traits: [],
            objectives: [],
            staging: [],
            redirect_variants: [],
            available_actions: [],
        }],
        officerDecisionHistory: [{
            id: 'personnel-1',
            turn: 50,
            faction: 'RBiH',
            event_id: 'officer-event-1',
            event_type: 'replacement_suggested',
            officer_id: 'officer-1',
            officer_name: 'Staff Officer',
            corps_id: 'rbih_corps_1',
            corps_name: '1 Corps',
            decision: 'acknowledged',
        }],
        pendingOfficerEvents: [{
            event_id: 'command-event-1',
            type: 'order_modified',
            faction: 'RBiH',
            turn: 52,
            officer_id: 'army-co-1',
            officer_name: 'Army Commander',
            officer_competence: 4,
            officer_aggressiveness: 3,
            officer_defensive_skill: 3,
            acknowledged: false,
        }],
    } as LoadedGameState;
}

function briefingText(state: LoadedGameState): string {
    return generateCoSBriefing([], state, 'RBiH')
        .flatMap((paragraph) => paragraph.map((segment) => segment.type === 'text' ? segment.value : segment.label))
        .join(' ');
}

afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
});

describe('shared operation lifecycle projection', () => {
    it('preserves the complete adapter history ledger before projecting player-visible AARs and exclusions', () => {
        const rawHistory = [
            { ...historyOperation(1, 'RS'), corps_id: 'vrs_1st_krajina' },
            { ...historyOperation(2, 'HRHB'), corps_id: 'hvo_main_staff' },
            { ...historyOperation(3, ''), operation_name: 'Operation Herzegovina', corps_id: 'jna_herzegovina_command' },
        ];
        const parsed = parseGameState({
            meta: { turn: 52, phase: 'war', player_faction: 'RS' },
            military: { formations: {}, corps_command: {} },
            political: { political_controllers: {} },
            operation_history: rawHistory,
        });

        expect(parsed.operationHistory?.map((operation) => operation.operation_id)).toEqual(['raw-history-1']);
        expect(parsed.rawOperationHistory?.map((operation) => operation.operation_id)).toEqual([
            'raw-history-1',
            'raw-history-2',
            'raw-history-3',
        ]);

        const projection = projectOperationLifecycle(parsed);
        expect(projection.counts).toMatchObject({ completed: 1, archived: 3 });
        expect(projection.excludedHistoryRows).toHaveLength(2);
        expect(projection.excludedHistoryRows[0]).toMatchObject({
            reason: 'non_player_faction',
            sourceFaction: 'HRHB',
        });
        expect(projection.excludedHistoryRows[1]).toMatchObject({
            reason: 'non_player_faction',
            sourceFaction: null,
        });
    });

    it('reconciles three executing operations, thirteen raw archive rows, a generated player operation, and personnel activity', () => {
        const projection = projectOperationLifecycle(lifecycleFixture());

        expect(projection.metrics.map(({ id, label, count }) => ({ id, label, count }))).toEqual([
            { id: 'operation.lifecycle.proposed', label: 'Proposed', count: 1 },
            { id: 'operation.lifecycle.planning', label: 'Planning', count: 0 },
            { id: 'operation.lifecycle.executing', label: 'Executing', count: 3 },
            { id: 'operation.lifecycle.recovery', label: 'Recovery', count: 0 },
            { id: 'operation.lifecycle.completed', label: 'Completed', count: 0 },
            { id: 'operation.lifecycle.archived', label: 'Archived', count: 13 },
        ]);
        expect(projection.activeRows).toHaveLength(3);
        expect(projection.activeRows.map((row) => row.id)).toEqual([
            'active:rbih_corps_1:generated_rbih_operation_1:41',
            'active:rbih_corps_2:generated_rbih_operation_2:42',
            'active:rbih_corps_3:generated_rbih_operation_3:43',
        ]);
        expect(projection.activeRows.some((row) => row.operation.operation_display_name === 'Player Operation Una')).toBe(true);
        expect(projection.historyRows).toHaveLength(0);
        expect(projection.excludedHistoryRows).toHaveLength(13);
        expect(projection.excludedHistoryRows.every((row) => row.reason === 'non_player_faction')).toBe(true);
        expect(new Set(projection.excludedHistoryRows.map((row) => row.id)).size).toBe(13);
        expect(projection.personnelActivityCount).toBe(1);
        expect(projection.hasAnyActivity).toBe(true);
    });

    it('gives every visible history row a stable ID and exposes every excluded raw row with a reason', () => {
        const state = lifecycleFixture();
        state.operationHistory = state.operationHistory!.map((operation, index) => (
            index === 0 ? { ...operation, faction: 'RBiH', corps_id: 'rbih_1st_corps' } : operation
        ));

        const first = projectOperationLifecycle(state);
        const second = projectOperationLifecycle(state);

        expect(first.historyRows.map((row) => row.id)).toEqual(['raw-history-1']);
        expect(second.historyRows.map((row) => row.id)).toEqual(first.historyRows.map((row) => row.id));
        expect(first.historyRows.length + first.excludedHistoryRows.length).toBe(13);
        expect(first.counts.completed).toBe(1);
        expect(first.counts.archived).toBe(13);
    });

    it('keeps an unreported active phase out of the labelled planning count', () => {
        const state = lifecycleFixture();
        state.operations = [{
            ...activeOperation(4, 'sparse_phase_operation'),
            phase: 'planning',
            phase_unreported: true,
        }];
        state.activeOperations = [];

        const projection = projectOperationLifecycle(state);

        expect(projection.activeRows).toHaveLength(1);
        expect(projection.activeRows[0].lifecycle).toBe('unreported');
        expect(projection.counts.planning).toBe(0);
        expect(projection.hasOperationActivity).toBe(true);
    });

    it('counts a pending army commander operation proposal when no opportunity proposal exists', () => {
        const state = lifecycleFixture();
        state.operationOpportunityProposals = [];
        state.pendingOfficerEvents = [{
            ...state.pendingOfficerEvents![0],
            event_id: 'army-proposal-1',
            type: 'army_co_proposes_op',
        }];

        expect(projectOperationLifecycle(state).counts.proposed).toBe(1);
    });
});

describe('shared operation lifecycle consumers', () => {
    it('keeps Records authoritative and explains excluded archive rows instead of showing an empty archive', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: lifecycleFixture(),
            armyHQRecordsSubTab: 'ops',
        });

        render(createElement(RecordsContent));

        expect(screen.getByTestId('operation-lifecycle-metric-executing').textContent).toContain('Executing3');
        expect(screen.getByTestId('operation-lifecycle-metric-archived').textContent).toContain('Archived13');
        expect(screen.getByTestId('records-operation-exclusion-scope').textContent).toBe(
            '13 archived operation records are excluded from RBiH detailed AAR review.',
        );
        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        expect(screen.queryByText('No completed operations yet.')).toBeNull();
        expect(screen.getAllByTestId('operation-history-exclusion')).toHaveLength(13);
    });

    it('creates exactly one Chronicle narrative for each player-visible completed operation', () => {
        const state = lifecycleFixture();
        state.operationHistory = state.operationHistory!.map((operation, index) => (
            index === 0 ? { ...operation, faction: 'RBiH', corps_id: 'rbih_1st_corps' } : operation
        ));

        const entries = generateChronicleEntries(state);
        const operationEntries = entries.filter((entry) => entry.metadata?.operationAarId != null);

        expect(operationEntries).toHaveLength(1);
        expect(operationEntries[0].id).toBe('operation-aar-raw-history-1');
        expect(operationEntries[0].metadata).toMatchObject({
            operationAarId: 'raw-history-1',
            officerName: 'Archive Commander',
            officerRank: 'Colonel',
        });
        expect(entries.some((entry) => entry.id === 'officer-week-raw-history-1')).toBe(false);
    });

    it('uses the shared executing count in the Chief of Staff briefing', () => {
        const text = briefingText(lifecycleFixture());

        expect(text).toContain('3 operations are executing');
        expect(text).not.toContain('Things are quiet');
    });

    it('does not call an archive-only state quiet when no operation is executing', () => {
        const state = lifecycleFixture();
        state.player_faction = 'HRHB';
        state.operations = [];
        state.activeOperations = [];
        state.operationOpportunityProposals = [];

        const text = generateCoSBriefing([], state, 'HRHB')
            .flatMap((paragraph) => paragraph.map((segment) => segment.type === 'text' ? segment.value : segment.label))
            .join(' ');

        expect(text).toContain('Operational activity is present in the staff ledger');
        expect(text).not.toContain('Things are quiet');
    });

    it('does not describe a populated operation archive as an empty or quiet AAR', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: lifecycleFixture(),
        });

        render(createElement(AARPanel, { isOpen: true, onClose: () => undefined, embedded: true }));

        expect(screen.queryByText('No report available yet.')).toBeNull();
        expect(screen.queryByText('Quiet turn')).toBeNull();
        expect(screen.getByTestId('aar-operation-activity').textContent).toContain('3 executing');
        expect(screen.getByTestId('aar-operation-activity').textContent).toContain('13 archived');
    });
});
