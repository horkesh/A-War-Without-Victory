// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { DaytonNegotiationModal } = await import('../../src/ui/map/components/DaytonNegotiationModal');

const PENDING: NonNullable<LoadedGameState['pendingDayton']> = {
    territorialPackages: [
        { id: 'gorazde_corridor', name: 'Goražde Corridor', defaultHolder: 'RS', demandCost: 12, concedeCost: 8 },
        { id: 'brcko_district', name: 'Brčko District', defaultHolder: 'RS', demandCost: 20, concedeCost: 15 },
        { id: 'sarajevo_suburbs', name: 'Sarajevo Suburbs', defaultHolder: 'RBiH', demandCost: 10, concedeCost: 6 },
    ],
    institutionalPackages: [
        { id: 'military', name: 'Military Structure', centralizedCost: 15, decentralizedCost: 10 },
        { id: 'presidency', name: 'Presidency', centralizedCost: 20, decentralizedCost: 5 },
    ],
    factionCapital: { RBiH: 80, RS: 60, HRHB: 40 },
    patronOverride: { RBiH: 5, RS: 10, HRHB: 25 },
};

function seedStore() {
    useGameStore.setState({
        loadedGameState: { player_faction: 'RBiH' } as unknown as LoadedGameState,
        loadError: null,
    });
}

afterEach(() => {
    cleanup();
    setLocale('en');
    delete (window as unknown as { awwv?: unknown }).awwv;
});

describe('DaytonNegotiationModal — Phase-4 player-agency surface', () => {
    beforeEach(seedStore);

    it('renders the negotiation chrome and live readouts (EN)', () => {
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        expect(screen.getByText('Dayton Peace Accords')).toBeTruthy();
        expect(screen.getByText('Live Settlement Readouts')).toBeTruthy();
        expect(screen.getByText('Entity Autonomy')).toBeTruthy();
        expect(screen.getByText('Dysfunction (floor)')).toBeTruthy();
        expect(screen.getByText('Territorial Packages')).toBeTruthy();
        expect(screen.getByText('Institutional Architecture')).toBeTruthy();
    });

    it('surfaces the Brčko outcome, defaulting to the international arbitration district', () => {
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        expect(screen.getByText('Brčko Corridor (Annex 2)')).toBeTruthy();
        // Default (Brčko unraised) previews as the arbitration condominium district.
        expect(screen.getByText('International Arbitration District')).toBeTruthy();
        expect(screen.getByText(/Left unresolved/)).toBeTruthy();
    });

    it('localizes chrome and readouts in BCS mode', () => {
        setLocale('bcs');
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        expect(screen.getByText('Dejtonski mirovni sporazum')).toBeTruthy();
        expect(screen.getByText('Autonomija entiteta')).toBeTruthy();
        expect(screen.getByText('Brčanski koridor (Aneks 2)')).toBeTruthy();
        expect(screen.getByText('Distrikt međunarodne arbitraže')).toBeTruthy();
        expect(screen.queryByText('Dayton Peace Accords')).toBeNull();
    });

    it('shows the outcome-class cap warning when the dysfunction floor is high', () => {
        // The default (all-decentralized + unraised Brčko) drives autonomy=100 and
        // Brčko=arbitration, so the floor caps the clean win out of the box.
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        expect(screen.getByText('OUTCOME CAPPED — HOLLOW VICTORY')).toBeTruthy();
        expect(screen.getByText(/never reads as a clean win/)).toBeTruthy();
    });

    it('probes positions and renders bot counter-offers from the read-only IPC', async () => {
        const previewDayton = vi.fn().mockResolvedValue({
            ok: true,
            playerFaction: 'RBiH',
            botResponses: {
                RS: {
                    decision: 'counter',
                    reason: 'over budget',
                    proposal_cost: 40,
                    available_capital: 60,
                    counter_proposal: {
                        territorial_demands: [],
                        territorial_concessions: [],
                        institutional_choices: { military: 'decentralized', presidency: 'decentralized' },
                    },
                },
                HRHB: {
                    decision: 'accept',
                    reason: 'within range',
                    proposal_cost: 5,
                    available_capital: 40,
                },
            },
        });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };

        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        // Stage a demand so the counter has something to drop.
        fireEvent.click(screen.getByText('Demand (12)'));
        fireEvent.click(screen.getByText('Probe Positions'));

        await waitFor(() => expect(previewDayton).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            expect(screen.getByText('Republika Srpska')).toBeTruthy();
            expect(screen.getByText('Counter-offer')).toBeTruthy();
            expect(screen.getByText('Accepts')).toBeTruthy();
            expect(screen.getByText('Adopt counter-offer')).toBeTruthy();
        });
        // The RS counter dropped the gorazde demand → diff names it explicitly.
        expect(screen.getByText('Drops your demands on: Goražde Corridor')).toBeTruthy();
    });
});
