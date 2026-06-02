// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n';

// NOTE: the dead direct-set "emergency posture" bulk corps-stance control was
// removed (the president now approves CO-proposed stance changes via the
// AutonomyPanel propose→approve surface). The bulk posture select + confirm
// dialog no longer exist. This file retains only the Army HQ shell chrome
// localization coverage that was incidentally exercised here.

function makeLoadedState(): LoadedGameState {
    return {
        label: 'RS turn 12',
        turn: 12,
        phase: 'war',
        formations: [
            { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', kind: 'corps', readiness: 'ready', cohesion: 0.8, fatigue: 0.1, status: 'active', createdTurn: 1, tags: [] },
            { id: 'vrs_drina', faction: 'RS', name: 'Drina Corps', kind: 'corps', readiness: 'ready', cohesion: 0.8, fatigue: 0.1, status: 'active', createdTurn: 1, tags: [] },
            { id: 'vrs_brigade', faction: 'RS', name: 'Test Brigade', kind: 'brigade', readiness: 'ready', cohesion: 0.8, fatigue: 0.1, status: 'active', createdTurn: 1, tags: [], personnel: 1500 },
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
        corpsFrontSectors: [],
        operations: [],
        factionReserves: { RS: { generalSupply: 80, heavyMunitions: 70 } },
    } as LoadedGameState;
}

describe('Army HQ shell chrome', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeLoadedState(),
            selectedArmyId: 'RS',
            armyHQOpen: true,
            armyHQTab: 'briefing',
        });
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('no longer renders a bulk emergency posture control', () => {
        render(createElement(ArmyHQModal));
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('localizes Army HQ shell chrome in BCS mode', () => {
        setLocale('bcs');
        render(createElement(ArmyHQModal));

        expect(screen.getByRole('dialog', { name: 'Stab armije' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'BRIFING' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'SAŽETAK' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'ZAPISI' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'LJUDSTVO' })).toBeTruthy();
    });
});
