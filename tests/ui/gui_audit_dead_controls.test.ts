// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';

import {
    OnboardingOverlay,
    resolveTutorialSpotlightRect,
} from '../../src/ui/map/components/onboarding/OnboardingOverlay.js';
import {
    OrderInterpretationPanel,
    shouldShowOrderOverrideControl,
} from '../../src/ui/map/components/army_hq/OrderInterpretationPanel.js';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { ArmyReservePanel } from '../../src/ui/map/components/ArmyReservePanel.js';
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
                    requires_player_response: true,
                    response_options: [{ id: 'accept', label: 'Accept', effects: [] }],
                }],
            }),
        }));

        expect(screen.getByText(/desktop command bridge unavailable/i)).toBeTruthy();
        expect(screen.getByText(/1 response option in dossier/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    it('surfaces corps readiness and threat status on Army HQ corps cards', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState({
                formations: [
                    { id: 'arbih_1st_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps', status: 'active', cohesion: 70, fatigue: 0 },
                    { id: 'brig_1', name: '101st Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'arbih_1st_corps', personnel: 1800, cohesion: 42, fatigue: 25, morale: 54, officer_quality: 0.58 },
                    { id: 'brig_2', name: '102nd Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'arbih_1st_corps', personnel: 1700, cohesion: 44, fatigue: 23, morale: 56, officer_quality: 0.56 },
                ] as LoadedGameState['formations'],
                corpsFrontSectors: [
                    {
                        sector_id: 'sector:arbih:1',
                        corps_id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        display_name: 'Sarajevo front',
                        assigned_brigade_ids: ['brig_1', 'brig_2'],
                        reserve_brigade_ids: [],
                        length_edges: 12,
                        density: 0.16,
                        sub_segments: [{ friendly_osids: ['op:sarajevo:sarajevo_1'] }],
                    },
                ] as unknown as LoadedGameState['corpsFrontSectors'],
                sectorIntel: [
                    {
                        friendly_sector_id: 'sector:arbih:1',
                        offensive_signs: true,
                        posture_observed: 'offensive_prep',
                        strength_category: 'dense',
                        confidence: 0.8,
                    },
                ] as unknown as LoadedGameState['sectorIntel'],
            }),
            armyHQOpen: true,
            selectedArmyId: 'RBiH',
        });

        render(createElement(ArmyHQModal));

        expect(screen.getByText('DEGRADED')).toBeTruthy();
        expect(screen.getByText(/INCOMING/i)).toBeTruthy();
        expect(screen.getByText(/fatigue 24/i)).toBeTruthy();
    });

    it('shows opening acting corps command in Army HQ without sim-active officer seating', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState({
                turn: 0,
                player_faction: 'RS',
                formations: [
                    { id: 'vrs_drina', name: 'Drina Corps', faction: 'RS', kind: 'corps', status: 'active', cohesion: 70, fatigue: 0 },
                    { id: 'vrs_drina_brig_1', name: 'Drina Brigade', faction: 'RS', kind: 'brigade', status: 'active', corps_id: 'vrs_drina', personnel: 1200, cohesion: 60, fatigue: 10 },
                ] as LoadedGameState['formations'],
                namedOfficerData: [
                    {
                        id: 'vrs_andric',
                        name: 'Svetozar Andric',
                        faction: 'RS',
                        rank: 'corps_commander',
                        competence: 4,
                        aggressiveness: 4,
                        defensive_skill: 4,
                        political_reliability: 4,
                        home_corps_id: 'vrs_drina',
                        available_from_turn: 0,
                        origin: 'jna',
                        pool_tier: 'tier_b',
                        status: 'reserve',
                        assigned_corps_id: null,
                        acting_commander: false,
                        turns_in_command: 0,
                        battles: 0,
                        victories: 0,
                    },
                ],
                namedOfficerStateById: {
                    vrs_andric: {
                        officer_id: 'vrs_andric',
                        status: 'reserve',
                        assigned_corps_id: null,
                        acting_commander: false,
                        turns_in_command: 0,
                        battles: 0,
                        victories: 0,
                    },
                },
            }),
            armyHQOpen: true,
            selectedArmyId: 'RS',
        });

        render(createElement(ArmyHQModal));

        expect(screen.getAllByText(/Svetozar Andric/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/No active commander/i)).toBeNull();
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

    it('does not wire the left OOB corps card to a direct stance override', () => {
        const sidebarSource = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');

        expect(sidebarSource).not.toContain('corpsStanceOverrides');
        expect(sidebarSource).not.toContain('setCorpsStance(');
        expect(sidebarSource).not.toContain('onStanceChange={(next) => setCorpsStance(corpsId, next)}');
    });

    it('keeps Army Reserve recall controls separate from row inspection buttons', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState({
                formations: [
                    {
                        id: 'arbih_army_hq',
                        faction: 'RBiH',
                        name: 'RBiH Main Staff',
                        kind: 'army_hq',
                        status: 'active',
                        readiness: 'ready',
                        cohesion: 70,
                        fatigue: 0,
                        createdTurn: 0,
                        tags: [],
                    },
                    {
                        id: 'arbih_elite_1',
                        faction: 'RBiH',
                        name: '1st Elite Brigade',
                        kind: 'brigade',
                        status: 'active',
                        readiness: 'ready',
                        cohesion: 70,
                        fatigue: 0,
                        createdTurn: 0,
                        tags: [],
                        personnel: 1800,
                        eliteLoanState: {
                            on_loan: true,
                            loaned_to_corps: 'arbih_1st_corps',
                            turns_deployed: 3,
                            base_osid: 'op:sarajevo:center',
                        },
                    },
                    {
                        id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        name: '1st Corps',
                        kind: 'corps',
                        status: 'active',
                        readiness: 'ready',
                        cohesion: 70,
                        fatigue: 0,
                        createdTurn: 0,
                        tags: [],
                    },
                ] as LoadedGameState['formations'],
            }),
            selectedArmyHqId: 'arbih_army_hq',
        });

        const { container } = render(createElement(ArmyReservePanel, { railSlot: 'primary' }));

        expect(container.querySelector('button button')).toBeNull();
        expect(screen.getByRole('button', { name: /Inspect 1st Elite Brigade/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Recall 1st Elite Brigade from 1st Corps' })).toBeTruthy();
    });

    it('counts only executing operations in the Army HQ summary operations chip', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState({
                formations: [
                    { id: 'corps_1', name: '1st Corps', faction: 'RBiH', kind: 'corps', status: 'active', cohesion: 70, fatigue: 0 },
                    { id: 'brig_1', name: '1st Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', readiness: 'ready', corps_id: 'corps_1', personnel: 1200, cohesion: 60, fatigue: 10 },
                ] as LoadedGameState['formations'],
                operations: [
                    { name: 'Planning Op', corps_id: 'corps_1', faction: 'RBiH', phase: 'planning' },
                    { name: 'Executing Op', corps_id: 'corps_1', faction: 'RBiH', phase: 'execution' },
                    { name: 'Recovery Op', corps_id: 'corps_1', faction: 'RBiH', phase: 'recovery' },
                ] as LoadedGameState['operations'],
            }),
            armyHQOpen: true,
            selectedArmyId: 'RBiH',
        });

        const { container } = render(createElement(ArmyHQModal));

        expect(container.textContent).toMatch(/Executing Operations\s*1/i);
        expect(container.textContent).not.toMatch(/Active Operations\s*3/i);
    });
});
