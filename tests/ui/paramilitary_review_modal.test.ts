// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { ParamilitaryReviewModal } from '../../src/ui/map/components/ParamilitaryReviewModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

const originalLoadSave = useGameStore.getState().loadSave;

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'rs turn 1',
        turn: 1,
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
        pendingParamilitaryRequests: [
            {
                faction: 'RS',
                strength: 600,
                target_osid: 'op:zvornik:zvornik_2',
                mode: 'offensive',
                estimated_civilian_risk: 250,
            },
        ],
        ...overrides,
    } as LoadedGameState;
}

describe('ParamilitaryReviewModal', () => {
    afterEach(() => {
        cleanup();
        delete (window as unknown as { awwv?: unknown }).awwv;
        useGameStore.setState({
            loadedGameState: null,
            osidDisplayNames: null,
            osidPropertiesMap: null,
            loadError: null,
            loadSave: originalLoadSave,
        });
        setLocale('en', undefined);
    });

    it('discloses the target population and every projected consequence with source context', () => {
        useGameStore.setState({
            loadedGameState: makeState({
                rawGameState: {
                    paramilitary_deployment_count: { RS: 3 },
                } as unknown as LoadedGameState['rawGameState'],
            }),
            osidDisplayNames: { 'op:zvornik:zvornik_2': 'Zvornik' },
            osidPropertiesMap: {
                'op:zvornik:zvornik_2': { population_total: 12_345 },
            },
        });

        render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose: vi.fn() }));

        expect(screen.getByText('Target population')).toBeTruthy();
        expect(screen.getByText('12,345 (1991 census)')).toBeTruthy();
        expect(screen.getByText('Projected civilian casualties')).toBeTruthy();
        expect(screen.getByText('250')).toBeTruthy();
        expect(screen.getByText('Projected war-crime increment')).toBeTruthy();
        expect(screen.getByText('+1 event if the target is captured')).toBeTruthy();
        expect(screen.getByText('Projected international standing impact')).toBeTruthy();
        expect(screen.getByText('-10 points on deployment; -10.05 total if the target is captured')).toBeTruthy();
        expect(screen.getByText(/Balkan Battlegrounds, Vol\. I/)).toBeTruthy();
        expect(screen.getByText(/fixed 5,000-person target baseline/)).toBeTruthy();
        expect(screen.getByText(/not a claim that this exact outcome occurred here/)).toBeTruthy();
    });

    it('marks target population as unreported when the loaded census map has no value', () => {
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { 'op:zvornik:zvornik_2': 'Zvornik' },
            osidPropertiesMap: {},
        });

        render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose: vi.fn() }));

        expect(screen.getByText('Unreported in loaded 1991 census data')).toBeTruthy();
        expect(screen.queryByText('5,000 (1991 census)')).toBeNull();
    });

    it('renders warning copy and submits explicit decisions', async () => {
        const resolveParamilitaryRequests = vi.fn(async () => ({ ok: true }));
        const getCurrentGameState = vi.fn(async () => '{"meta":{"player_visible_projection":1}}');
        const loadSave = vi.fn(async () => undefined);
        const onClose = vi.fn();
        Object.defineProperty(window, 'awwv', {
            configurable: true,
            value: {
                resolveParamilitaryRequests,
                getCurrentGameState,
            },
        });
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { 'op:zvornik:zvornik_2': 'Zvornik' },
            loadSave,
        });

        render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose }));

        expect(screen.getByText('Paramilitary Authorization')).toBeTruthy();
        expect(screen.getByText(/war crimes/i)).toBeTruthy();
        expect(screen.getByText(/civilian casualties/i)).toBeTruthy();
        expect(screen.getByText('Zvornik')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /deny packet/i }));
        fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));

        await waitFor(() => {
            expect(resolveParamilitaryRequests).toHaveBeenCalledWith([
                { target_osid: 'op:zvornik:zvornik_2', decision: 'deny' },
            ]);
            expect(getCurrentGameState).toHaveBeenCalledOnce();
            expect(loadSave).toHaveBeenCalledWith('{"meta":{"player_visible_projection":1}}');
            expect(onClose).toHaveBeenCalledOnce();
        });
    });

    it('can turn a repeated packet decision into a standing deny policy', async () => {
        const resolveParamilitaryRequests = vi.fn(async () => ({ ok: true }));
        const getCurrentGameState = vi.fn(async () => '{"meta":{"player_visible_projection":1}}');
        const loadSave = vi.fn(async () => undefined);
        Object.defineProperty(window, 'awwv', {
            configurable: true,
            value: {
                resolveParamilitaryRequests,
                getCurrentGameState,
            },
        });
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { 'op:zvornik:zvornik_2': 'Zvornik' },
            loadSave,
        });

        render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose: vi.fn() }));

        expect(screen.getByText(/standing order/i)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /always deny/i }));
        fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));

        await waitFor(() => {
            expect(resolveParamilitaryRequests).toHaveBeenCalledWith(
                [{ target_osid: 'op:zvornik:zvornik_2', decision: 'deny' }],
                { policy: 'always_deny' },
            );
            expect(loadSave).toHaveBeenCalledWith('{"meta":{"player_visible_projection":1}}');
        });
    });
});
