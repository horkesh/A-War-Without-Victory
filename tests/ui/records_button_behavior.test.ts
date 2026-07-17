// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialToolbar } from '../../src/ui/map/components/PresidentialToolbar.js';
import { TurnAftermathModal } from '../../src/ui/map/components/TurnAftermathModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { openArmyHQDecisionConsequenceRecord, openArmyHQRecordsSubTab } from '../../src/ui/map/utils/shellNavigation.js';
import { isShellHandoffCommand } from '../../src/ui/shared/shellHandoff.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnAftermathView } from '../../src/ui/map/data/turnAftermath.js';

function makeLoadedState(): LoadedGameState {
    return {
        label: 'RS turn 12',
        turn: 12,
        phase: 'war',
        formations: [],
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
    } as LoadedGameState;
}

function makeAftermathView(): TurnAftermathView {
    return {
        turn: 12,
        dateLabel: 'Turn 12',
        playerFaction: 'RS',
        headline: 'After-action report available.',
        narrativeLine: 'The front traded ground without mercy, leaving staff to sort signal from noise.',
        tone: 'mixed',
        territory: { friendlyNet: -1, gains: 1, losses: 2, notable: [] },
        combat: {
            battleCount: 2,
            friendlyBattleCount: 1,
            friendlyCasualties: 42,
            opposingCasualties: 31,
            territoryFlipsFromBattles: 1,
        },
        humanitarian: { displacedThisTurn: 500, hotspotLabel: 'Central Bosnia' },
        cost: {
            severity: 'severe',
            friendlyMilitaryCasualties: 42,
            theaterMilitaryCasualties: 73,
            displacedThisTurn: 500,
            ownFormationsDestroyed: 0,
            ownSupplySpent: 8,
            ownHeavyMunitionsSpent: 2,
            reasons: ['cost signal'],
        },
        signals: [],
        commandRecord: { directives: [], rows: [] },
        judgment: {
            headline: 'Review the cost.',
            detail: 'Chronicle memory is available for this turn.',
            memoryTone: 'cost',
            primarySurface: 'chronicle',
            secondarySurface: 'records',
        },
        nextActions: {
            actionableCount: 1,
            blockingCount: 0,
            opportunityCount: 0,
            reserveCount: 0,
            officerCount: 0,
            eventDecisionCount: 0,
            peaceCount: 0,
            topItems: [],
        },
        formations: { ownSpawned: 0, ownDestroyed: 0, spawned: 0, destroyed: 0 },
        supply: { ownSupplyDelta: -8, ownHeavyMunitionsDelta: -2 },
    } as TurnAftermathView;
}

describe('PresidentialToolbar RECORDS button', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeLoadedState(),
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('opens Army HQ Records on the campaign archive subtab in the visible store state', () => {
        render(createElement(PresidentialToolbar, {
            pendingReviews: 0,
            pressureWarning: false,
            onOpenRecords: () => openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath'),
        }));

        const recordsButton = screen.getByRole('button', { name: 'RECORDS' });
        expect(recordsButton.getAttribute('title')).toBe('Open Army HQ Records: campaign archive');

        fireEvent.click(recordsButton);

        expect(useGameStore.getState()).toMatchObject({
            selectedArmyId: 'RS',
            armyHQOpen: true,
            armyHQTab: 'records',
            armyHQRecordsSubTab: 'aftermath',
        });
    });

    it('routes Turn Aftermath record links to records and Chronicle callbacks without closing shell context first', () => {
        const calls: string[] = [];
        render(createElement(TurnAftermathModal, {
            isOpen: true,
            view: makeAftermathView(),
            onClose: () => calls.push('close'),
            onOpenInbox: () => calls.push('inbox'),
            onOpenSummary: () => calls.push('summary'),
            onOpenRecords: () => calls.push('records'),
            onOpenChronicle: () => calls.push('chronicle'),
            onOpenCodex: () => calls.push('codex'),
        }));

        expect(screen.getByText('The front traded ground without mercy, leaving staff to sort signal from noise.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Weekly Aftermath' }));
        fireEvent.click(screen.getByRole('button', { name: 'Chronicle' }));

        expect(calls).toEqual(['records', 'chronicle']);
    });

    it('accepts Decision Consequences as a Records handoff target', () => {
        expect(isShellHandoffCommand({
            kind: 'army-hq',
            tab: 'records',
            recordsSubTab: 'decisions',
        })).toBe(true);
    });

    it('opens and focuses a decision consequence record from shell navigation', () => {
        const opened = openArmyHQDecisionConsequenceRecord(
            useGameStore.getState(),
            'reserve:reserve:turn_12:vrs_drina_corps',
        );

        expect(opened).toBe(true);
        expect(useGameStore.getState()).toMatchObject({
            selectedArmyId: 'RS',
            armyHQOpen: true,
            armyHQTab: 'records',
            armyHQRecordsSubTab: 'decisions',
            focusedDecisionConsequenceId: 'reserve:reserve:turn_12:vrs_drina_corps',
            chronicleOpen: false,
        });
    });

    it('keeps Chronicle-targeted decision records in Chronicle when routed by id', () => {
        useGameStore.setState({
            loadedGameState: {
                ...makeLoadedState(),
                firedEvents: [
                    {
                        id: 'cabinet-crisis',
                        turn: 8,
                        title: 'Cabinet crisis response',
                        narrative: 'The cabinet accepted the policy line.',
                        category: 'political',
                        effects: [{ kind: 'authority', description: 'Authority held.' }],
                        isDecision: true,
                    },
                ],
            },
        });

        const opened = openArmyHQDecisionConsequenceRecord(useGameStore.getState(), 'event:cabinet-crisis');

        expect(opened).toBe(true);
        expect(useGameStore.getState()).toMatchObject({
            armyHQOpen: false,
            armyHQRecordsSubTab: 'aftermath',
            focusedDecisionConsequenceId: null,
            chronicleOpen: true,
            focusedChronicleDecisionRecordId: 'event:cabinet-crisis',
        });
    });
});
