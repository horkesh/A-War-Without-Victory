// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { PeacePlanModal } from '../../src/ui/map/components/PeacePlanModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

type PendingPeacePlan = NonNullable<LoadedGameState['pendingPeacePlan']>;

function makeVanceOwenPlan(overrides: Partial<PendingPeacePlan> = {}): PendingPeacePlan {
    return {
        planId: 'vance_owen',
        planName: 'Vance-Owen Peace Plan',
        narrative: 'UN mediators Cyrus Vance and Lord Owen propose dividing Bosnia into decentralized provinces.',
        turnOffered: 40,
        proposedSplit: { RBiH: 39, RS: 43, HRHB: 18 },
        institutionalModel: '10_provinces',
        botResponses: {
            RBiH: 'accepted',
            RS: 'rejected',
            HRHB: 'accepted',
        },
        ...overrides,
    };
}

function installIpc(resolvePeacePlan = vi.fn(async () => ({ ok: true }))) {
    Object.defineProperty(window, 'awwv', {
        configurable: true,
        value: { resolvePeacePlan },
    });
    return resolvePeacePlan;
}

function setPlayerFaction(playerFaction: string | null) {
    useGameStore.setState({
        loadedGameState: {
            label: 'Turn 40',
            turn: 40,
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
            player_faction: playerFaction,
        } as LoadedGameState,
        loadError: null,
    });
}

describe('PeacePlanModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setPlayerFaction('RS');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        delete (window as unknown as { awwv?: unknown }).awwv;
        useGameStore.setState({ loadedGameState: null, loadError: null });
    });

    it('renders nonzero territorial bars when proposed split values are nonzero', () => {
        installIpc();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan(),
            onDismiss: vi.fn(),
        }));

        expect(screen.getByRole('meter', { name: /republic of bosnia and herzegovina territory share/i }).getAttribute('aria-valuenow')).toBe('39');
        expect(screen.getByRole('meter', { name: /republika srpska territory share/i }).getAttribute('aria-valuenow')).toBe('43');
        expect(screen.getByRole('meter', { name: /croatian republic of herzeg-bosnia territory share/i }).getAttribute('aria-valuenow')).toBe('18');
    });

    it('does not list the player faction under Other Faction Responses', () => {
        installIpc();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan(),
            onDismiss: vi.fn(),
        }));

        const responses = screen.getByTestId('peace-plan-other-responses');
        expect(responses.textContent).not.toContain('Republika Srpska');
        expect(responses.textContent).toContain('Republic of Bosnia and Herzegovina');
        expect(responses.textContent).toContain('Croatian Republic of Herzeg-Bosnia');
    });

    it('Review Later dismisses the modal without resolving the plan', () => {
        const resolvePeacePlan = installIpc();
        const onDismiss = vi.fn();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan(),
            onDismiss,
        }));

        fireEvent.click(screen.getByRole('button', { name: /review later/i }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(resolvePeacePlan).not.toHaveBeenCalled();
    });

    it('Accept Plan resolves through IPC and dismisses the modal', async () => {
        const resolvePeacePlan = installIpc();
        const onDismiss = vi.fn();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan(),
            onDismiss,
        }));

        fireEvent.click(screen.getByRole('button', { name: /accept plan/i }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(resolvePeacePlan).toHaveBeenCalledWith('vance_owen', 'accepted');
        });
    });

    it('Reject Plan resolves through IPC and dismisses the modal', async () => {
        const resolvePeacePlan = installIpc();
        const onDismiss = vi.fn();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan(),
            onDismiss,
        }));

        fireEvent.click(screen.getByRole('button', { name: /reject plan/i }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(resolvePeacePlan).toHaveBeenCalledWith('vance_owen', 'rejected');
        });
    });

    it('localizes BCS modal chrome and hides unknown ids behind neutral copy', () => {
        setLocale('bcs');
        installIpc();

        render(createElement(PeacePlanModal, {
            plan: makeVanceOwenPlan({
                turnOffered: 0,
                institutionalModel: 'federal_union_model',
                botResponses: {
                    RBiH: 'accepted',
                    RS: 'rejected',
                    HRHB: 'conditional_accept' as never,
                },
            }),
            onDismiss: vi.fn(),
        }));

        const modalText = document.body.textContent ?? '';
        expect(modalText).toContain('Predlozeno: 6 apr 1992');
        expect(screen.getByText('Odgovori drugih strana')).toBeTruthy();
        expect(screen.getByText('Potrebna odluka komandanta')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Prihvati plan' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pregledaj kasnije' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Odbij plan' })).toBeTruthy();
        expect(modalText).toContain('Neodreden institucionalni model');
        expect(modalText).toContain('Odgovor nije naveden');
        expect(modalText).not.toContain('federal_union_model');
        expect(modalText).not.toContain('conditional_accept');
        expect(modalText).not.toContain('Other Faction Responses');
        expect(modalText).not.toContain("Commander's Decision Required");
        expect(modalText).not.toContain('Accept Plan');
    });
});
