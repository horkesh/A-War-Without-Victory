// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { RecordsContent } from '../../src/ui/map/components/army_hq/RecordsContent.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeLoadedState(): LoadedGameState {
    return {
        label: 'RS turn 18',
        turn: 18,
        phase: 'war',
        formations: [
            {
                id: 'rs_1st_krajina',
                faction: 'RS',
                name: '1st Krajina Corps',
                kind: 'corps',
                readiness: 'ready',
                cohesion: 80,
                fatigue: 0,
                status: 'active',
                createdTurn: 0,
                tags: [],
            },
        ],
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
        player_faction: 'RS',
        operationHistory: [
            {
                operation_id: 'op-aar-1',
                operation_name: 'Operation Iron Corridor',
                corps_id: 'rs_1st_krajina',
                faction: 'RS',
                started_turn: 12,
                ended_turn: 15,
                outcome: 'partial',
                commander_name: 'Field Commander',
                commander_rank: 'Colonel',
                objectives_targeted: [
                    'op:prijedor:prijedor_1',
                    'op:kozara:kozarac_1',
                    'op:sanski_most:sanski_most_1',
                ],
                objectives_logged_captured: ['op:prijedor:prijedor_1'],
                objectives_held_without_logged_capture: ['op:kozara:kozarac_1'],
                capture_provenance: 'mixed',
                objectives_captured: ['op:prijedor:prijedor_1', 'op:kozara:kozarac_1'],
                total_attacks: 6,
                casualties_suffered: { killed: 18, wounded: 64 },
                casualties_inflicted: { killed: 22, wounded: 75 },
                equipment_lost: { tanks: 1, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 1 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 3, verdict: 'Costly partial', factors: { objective_pct: 67, attack_tempo: 6 } },
                duration_turns: 4,
                weekly_log: [
                    {
                        turn: 13,
                        phase: 'execution',
                        attacks_this_turn: 2,
                        objectives_captured_this_turn: ['op:prijedor:prijedor_1'],
                        notable_events: ['breakthrough'],
                        casualties_suffered: { killed: 8, wounded: 23 },
                        casualties_inflicted: { killed: 12, wounded: 31 },
                    },
                ],
                recovery_reason: 'completed',
                commander_assessment_at_launch: 'launch',
            },
        ],
        activeOperations: [],
    };
}

describe('Army HQ Records operation AAR review', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeLoadedState(),
            armyHQRecordsSubTab: 'ops',
            osidDisplayNames: {
                'op:prijedor:prijedor_1': 'Prijedor',
                'op:kozara:kozarac_1': 'Kozarac',
                'op:sanski_most:sanski_most_1': 'Sanski Most',
            },
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('opens a compact deep review for completed operation AARs from Records OPERATIONS', () => {
        render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));
        fireEvent.click(screen.getByRole('button', { name: /Operation Iron Corridor/i }));

        expect(screen.getByText('Operational Deep Review')).toBeTruthy();
        expect(screen.getByText('Result: Partial')).toBeTruthy();
        expect(screen.getByText('Attacks: 6')).toBeTruthy();
        expect(screen.getByText('Casualties: 82 suffered / 97 inflicted')).toBeTruthy();
        expect(screen.getByText('Grade: 3 stars - Costly partial')).toBeTruthy();
        expect(screen.getByText('Provenance: mixed final-control record')).toBeTruthy();
        expect(screen.getByText('Captured: Prijedor')).toBeTruthy();
        expect(screen.getByText('Held at end: Kozarac')).toBeTruthy();
        expect(screen.getByText('Not held: Sanski Most')).toBeTruthy();
    });

    it('shows a clear completed-operation empty state in Records OPERATIONS history', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                operationHistory: [],
            },
        });

        render(createElement(RecordsContent));

        fireEvent.click(screen.getByRole('button', { name: /^History/i }));

        expect(screen.getByText('No completed operations yet.')).toBeTruthy();
    });

    it('opens the focused completed operation row when routed from Chronicle', () => {
        useGameStore.setState({
            armyHQRecordsSubTab: 'ops',
            focusedOperationHistoryId: 'op-aar-1',
        });

        render(createElement(RecordsContent));

        expect(screen.getByRole('button', { name: /^History/i }).className).toContain('text-accent-gold');
        expect(screen.getByText('Operational Deep Review')).toBeTruthy();
        expect(screen.getByText('Result: Partial')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Operation Iron Corridor/i }).getAttribute('aria-current')).toBe('true');
    });
});
