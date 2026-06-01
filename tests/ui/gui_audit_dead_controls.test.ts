// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';

import {
    OnboardingOverlay,
    resolveTutorialSpotlightRect,
} from '../../src/ui/map/components/onboarding/OnboardingOverlay.js';
import {
    OrderInterpretationPanel,
    shouldShowOrderOverrideControl,
} from '../../src/ui/map/components/army_hq/OrderInterpretationPanel.js';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { PresidentialAttentionPanel } from '../../src/ui/map/components/army_hq/PresidentialAttentionPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'RBiH test',
        turn: 12,
        phase: 'war',
        player_faction: 'RBiH',
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
        corpsFrontSectors: [],
        operations: [],
        factionReserves: {},
        ...overrides,
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    delete (window as unknown as { awwv?: unknown }).awwv;
    useGameStore.setState(useGameStore.getInitialState());
});

describe('GUI audit Batch G dead/no-op controls', () => {
    it('resolves onboarding spotlight targets to a visible padded rect', () => {
        const target = document.createElement('button');
        target.setAttribute('data-tutorial-step', 'advance-turn-button');
        target.getBoundingClientRect = () => ({
            x: 20,
            y: 30,
            left: 20,
            top: 30,
            right: 120,
            bottom: 70,
            width: 100,
            height: 40,
            toJSON: () => ({}),
        });
        document.body.appendChild(target);

        expect(resolveTutorialSpotlightRect('advance-turn-button')).toEqual({
            left: 8,
            top: 18,
            width: 124,
            height: 64,
        });
        expect(resolveTutorialSpotlightRect('missing-anchor')).toBeNull();
    });

    it('renders a visible onboarding spotlight when the next step target exists', async () => {
        const target = document.createElement('div');
        target.setAttribute('data-tutorial-step', 'map-container');
        target.getBoundingClientRect = () => ({
            x: 40,
            y: 50,
            left: 40,
            top: 50,
            right: 240,
            bottom: 170,
            width: 200,
            height: 120,
            toJSON: () => ({}),
        });
        document.body.appendChild(target);

        render(createElement(OnboardingOverlay, {
            ipc: null,
            tutorialState: {
                dismissed: false,
                current_step: '01_welcome',
                completed_steps: ['01_welcome'],
            },
        }));

        await waitFor(() => {
            expect(screen.getByTestId('onboarding-spotlight')).toBeTruthy();
            expect(screen.getByTestId('onboarding-spotlight-arrow')).toBeTruthy();
        });
    });

    it('does not expose an active order override control without a supported override bridge', () => {
        expect(shouldShowOrderOverrideControl({ overridable: true })).toBe(false);
        expect(shouldShowOrderOverrideControl({ overridable: true, override_action: 'force_original_order' })).toBe(false);

        render(createElement(OrderInterpretationPanel, {
            playerFaction: 'RBiH',
            gameState: makeState({
                pendingOfficerEvents: [{
                    event_id: 'evt-refused',
                    type: 'order_refused',
                    faction: 'RBiH',
                    turn: 12,
                    officer_id: 'officer_1',
                    officer_name: 'Test Commander',
                    officer_competence: 3,
                    officer_aggressiveness: 2,
                    officer_defensive_skill: 3,
                    corps_id: 'arbih_1st_corps',
                    corps_name: '1st Corps',
                    acknowledged: false,
                    reason: 'Refuses the directive.',
                    overridable: true,
                }],
            }),
        }));

        expect(screen.queryByRole('button', { name: 'OVERRIDE' })).toBeNull();
        expect(screen.getByText(/override path unavailable/i)).toBeTruthy();
    });

    it('summarizes presidential event decisions without exposing response actions in browser view', () => {
        render(createElement(PresidentialAttentionPanel, {
            playerFaction: 'RBiH',
            gameState: makeState({
                presidentialReviewQueue: {
                    pendingCount: 1,
                    criticalCount: 1,
                    eventDecisionCount: 1,
                    commandInterpretationCount: 0,
                    personnelDirectiveCount: 0,
                    operationOpportunityCount: 0,
                },
                pendingEventDecisions: [{
                    event_id: 'event-1',
                    event_title: 'Cabinet request',
                    faction: 'RBiH',
                    turn_fired: 12,
                    response_options: [{ id: 'accept', label: 'Accept', effects: [] }],
                }],
            }),
        }));

        expect(screen.getByText(/desktop command bridge unavailable/i)).toBeTruthy();
        expect(screen.getByText(/1 presidential response awaiting dossier review/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    // Removal regression-guard: the bulk "emergency posture" control was a dead
    // direct-set surface (wrote top-level state.corps_command, which the engine
    // never reads). It was removed — the president now approves CO-proposed stance
    // changes via the propose→approve AutonomyPanel surface. This case guards that
    // the dead control does not silently return to ArmyHQModal.
    it('no longer renders the removed bulk emergency-posture control', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState({
                player_faction: 'RS',
                formations: [
                    { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', kind: 'corps', readiness: 'ready', cohesion: 0.8, fatigue: 0.1, status: 'active', createdTurn: 1, tags: [] },
                ],
                factionReserves: { RS: { generalSupply: 80, heavyMunitions: 70 } },
            }),
            selectedArmyId: 'RS',
            armyHQOpen: true,
            armyHQTab: 'briefing',
        });

        render(createElement(ArmyHQModal));

        expect(screen.queryByRole('combobox', { name: /emergency posture order/i })).toBeNull();
        // No bulk emergency-posture combobox at all (it was the only combobox here).
        expect(screen.queryByRole('combobox')).toBeNull();
    });
});
