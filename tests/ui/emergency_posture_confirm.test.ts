// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

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

describe('Army HQ emergency posture confirmation', () => {
    const stageCorpsStanceOrder = vi.fn(() => Promise.resolve({ ok: true }));

    beforeEach(() => {
        stageCorpsStanceOrder.mockClear();
        (window as unknown as { awwv?: Record<string, unknown> }).awwv = {
            stageCorpsStanceOrder,
        };
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
        delete (window as unknown as { awwv?: Record<string, unknown> }).awwv;
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('requires confirmation before staging a bulk corps posture order', async () => {
        render(createElement(ArmyHQModal));

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'defensive' } });

        expect(stageCorpsStanceOrder).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog', { name: /confirm emergency posture order/i }).textContent)
            .toContain('This will stage the same posture order for all 2 corps');

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(stageCorpsStanceOrder).not.toHaveBeenCalled();

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'defensive' } });
        fireEvent.click(screen.getByRole('button', { name: 'Stage Orders' }));

        await waitFor(() => expect(stageCorpsStanceOrder).toHaveBeenCalledTimes(2));
        expect(stageCorpsStanceOrder).toHaveBeenNthCalledWith(1, 'vrs_1st_krajina', 'defensive');
        expect(stageCorpsStanceOrder).toHaveBeenNthCalledWith(2, 'vrs_drina', 'defensive');
    });
});
