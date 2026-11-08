// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
        loadedGameState: { player_faction: 'RBiH', turn: 187, metadata: { turn: 187, date: '6 Nov 1995' } } as unknown as LoadedGameState,
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
        const rbihHolder = screen.getByText('RBiH');
        expect(rbihHolder.className).not.toContain('uppercase');
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

    it('shows authoritative institutions after a preview and clears them when the draft changes', async () => {
        const previewDayton = vi.fn().mockResolvedValue({
            ok: true,
            botResponses: {},
            agreement: {
                version: 1,
                terms: {
                    brcko_status: 'arbitration',
                    competency_allocation: { comp_foreign_policy: 'shared' },
                    institutional_choices: {},
                },
                map: { controllers: {}, wartimeControllers: {}, specialOsids: [], territoryPct: {} },
            },
        });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        fireEvent.click(screen.getByRole('button', { name: 'Probe Positions' }));
        fireEvent.click(await screen.findByText('Draft settlement'));
        expect(screen.getAllByText(/International Arbitration District/)).toHaveLength(2);
        const terms = within(screen.getByRole('region', { name: 'Institutions and powers' }));
        expect(terms.getByText('Foreign Policy').nextElementSibling?.textContent).toMatch(/shared/i);
        fireEvent.click(screen.getByText('Demand (12)'));
        expect(screen.queryByText('Draft settlement')).toBeNull();
    });

    it('discards an authoritative preview that returns after a draft edit', async () => {
        let complete: (response: unknown) => void = () => {};
        const previewDayton = vi.fn(() => new Promise(resolve => { complete = resolve; }));
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        fireEvent.click(screen.getByRole('button', { name: 'Probe Positions' }));
        fireEvent.click(screen.getByText('Demand (12)'));
        await act(async () => complete({ ok: true, agreement: { version: 1 } }));

        expect(screen.queryByText('Draft settlement')).toBeNull();
        expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Probe Positions' }).disabled).toBe(false);
    });

    it('prevents probing over-budget proposals and re-enables it after revision', () => {
        const previewDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };
        render(createElement(DaytonNegotiationModal, {
            dayton: { ...PENDING, factionCapital: { ...PENDING.factionCapital, RBiH: 11 } },
        }));
        const probe = screen.getByRole<HTMLButtonElement>('button', { name: 'Probe Positions' });
        const demand = screen.getByText('Demand (12)');

        expect(probe.disabled).toBe(false);
        fireEvent.click(demand);
        expect(screen.getByText('Over Budget')).toBeTruthy();
        expect(probe.disabled).toBe(true);
        fireEvent.click(probe);
        expect(previewDayton).not.toHaveBeenCalled();
        fireEvent.click(demand);
        expect(probe.disabled).toBe(false);
    });

    it('declines in two steps through declineDayton, never by signing an empty proposal', async () => {
        const declineDayton = vi.fn().mockResolvedValue({ ok: true, imposition_turn: 192 });
        const resolveDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { declineDayton, resolveDayton };

        render(createElement(DaytonNegotiationModal, { dayton: PENDING }));
        fireEvent.click(screen.getByText('Decline Settlement'));
        // First click only warns: eight more weeks, then Washington forces it back to the table.
        expect(screen.getByRole('alert').textContent).toMatch(/eight more weeks/);
        expect(screen.getByRole('alert').textContent).toMatch(/Washington/);
        expect(declineDayton).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Confirm Decline'));
        await waitFor(() => expect(declineDayton).toHaveBeenCalledTimes(1));
        expect(resolveDayton).not.toHaveBeenCalled();
    });

    const PRIJEDOR = {
        id: 'front:prijedor:RBiH:RS', name: 'Prijedor', defaultHolder: 'RS',
        demandCost: 9, concedeCost: 6, claimant: 'RBiH', areaPct: 0.52,
    };

    it('lists captured ground with its holder, the map assignee and an area-scaled demand', async () => {
        const resolveDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { resolveDayton };
        render(createElement(DaytonNegotiationModal, { dayton: { ...PENDING, frontPackages: [PRIJEDOR] } }));
        expect(screen.getByText('Ground held against the Dayton map')).toBeTruthy();
        expect(screen.getByText('Held by RBiH · map gives RS · 0.52% of BiH')).toBeTruthy();
        fireEvent.click(screen.getByText('Demand (9)'));
        expect(screen.queryByText('Over Budget')).toBeNull();
        fireEvent.click(screen.getByText('Submit Proposal'));
        await waitFor(() => expect(resolveDayton).toHaveBeenCalledTimes(1));
        expect(resolveDayton.mock.calls[0]![0].territorial_demands).toEqual(['front:prijedor:RBiH:RS']);
    });

    it('the forced table after a decline has no decline option', () => {
        render(createElement(DaytonNegotiationModal, {
            dayton: { ...PENDING, frontPackages: [PRIJEDOR], forced: { onFaction: 'RBiH', by: 'united_states' } },
        }));
        expect(screen.getByText('Imposed table')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toMatch(/Declining is no longer possible/);
        expect(screen.queryByText('Decline Settlement')).toBeNull();
        expect(screen.getByText('Submit Proposal')).toBeTruthy();
    });
});

describe('DaytonNegotiationModal — live conference room', () => {
    beforeEach(seedStore);

    it('opens the room objects and keeps one editable draft and authoritative preview between them', async () => {
        const previewDayton = vi.fn().mockResolvedValue({
            ok: true,
            agreement: {
                version: 1,
                terms: {
                    brcko_status: 'arbitration',
                    competency_allocation: { comp_foreign_policy: 'shared' },
                    institutional_choices: {},
                },
                map: { controllers: {}, wartimeControllers: {}, specialOsids: [], territoryPct: {} },
            },
        });
        const resolveDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton, resolveDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING, conference: true }));

        expect(screen.getByText(/6 Nov 1995/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Enter conference room' }));
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Hope Hotel conference room' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        const close = () => fireEvent.click(screen.getByRole('button', { name: 'Return to conference room' }));
        const folderHotspot = screen.getByTestId('dayton-hotspot-folder');
        fireEvent.click(folderHotspot);
        expect(screen.getByText('Negotiation Capital:')).toBeTruthy();
        close();
        expect(document.activeElement).toBe(folderHotspot);

        const draft = nav.getByRole('button', { name: 'Current draft' });
        fireEvent.click(draft);
        fireEvent.click(screen.getByText('Demand (12)'));
        fireEvent.click(screen.getByRole('button', { name: 'Probe Positions' }));
        await screen.findByText('Draft settlement ready');
        expect(previewDayton.mock.calls[0]![0].territorial_demands).toEqual(['gorazde_corridor']);
        expect(resolveDayton).not.toHaveBeenCalled();
        close();
        expect(document.activeElement).toBe(draft);

        fireEvent.click(nav.getByRole('button', { name: 'Settlement map' }));
        expect(screen.getByRole('region', { name: 'Settlement territory' })).toBeTruthy();
        close();
        fireEvent.click(nav.getByRole('button', { name: 'Treaty binder' }));
        const terms = within(screen.getByRole('region', { name: 'Institutions and powers' }));
        expect(terms.getByText('Foreign Policy').nextElementSibling?.textContent).toMatch(/shared/i);
        close();

        fireEvent.click(draft);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Proposal' }));
        await waitFor(() => expect(resolveDayton.mock.calls[0]![0]).toEqual(previewDayton.mock.calls[0]![0]));
    });

    it('shows preview failures in the conference and clears them on retry', async () => {
        const previewDayton = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'preview rejected' })
            .mockResolvedValueOnce({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING, conference: true }));

        fireEvent.click(screen.getByRole('button', { name: 'Skip arrival' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        fireEvent.click(nav.getByRole('button', { name: 'Settlement map' }));
        const probe = screen.getByRole<HTMLButtonElement>('button', { name: 'Probe Positions' });
        probe.focus();
        fireEvent.click(probe);
        expect(probe.disabled).toBe(false);
        expect(probe.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(probe);
        expect(previewDayton).toHaveBeenCalledTimes(1);
        expect((await screen.findByRole('alert')).textContent).toMatch(/Could not preview/);
        expect(document.activeElement).toBe(probe);
        expect(useGameStore.getState().loadError).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Return to conference room' }));
        expect(screen.getByRole('alert').textContent).toMatch(/Could not preview/);
        fireEvent.click(nav.getByRole('button', { name: 'Settlement map' }));
        fireEvent.click(screen.getByRole('button', { name: 'Probe Positions' }));
        expect(screen.queryByRole('alert')).toBeNull();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Probe Positions' })).toBeTruthy());
        expect(previewDayton).toHaveBeenCalledTimes(2);
    });

    it('retries a failed or rejected signature with the same proposal', async () => {
        const resolveDayton = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'signature rejected' })
            .mockRejectedValueOnce(new Error('signature transport failed'))
            .mockResolvedValueOnce({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { resolveDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING, conference: true }));

        fireEvent.click(screen.getByRole('button', { name: 'Skip arrival' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        fireEvent.click(nav.getByRole('button', { name: 'Current draft' }));
        fireEvent.click(screen.getByText('Demand (12)'));

        for (let attempt = 0; attempt < 2; attempt++) {
            const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Submit Proposal' });
            submit.focus();
            fireEvent.click(submit);
            expect(submit.disabled).toBe(false);
            expect(submit.getAttribute('aria-disabled')).toBe('true');
            fireEvent.click(submit);
            expect(resolveDayton).toHaveBeenCalledTimes(attempt + 1);
            expect(screen.queryByRole('alert')).toBeNull();
            expect((await screen.findByRole('alert')).textContent).toMatch(/Could not submit/);
            expect(document.activeElement).toBe(submit);
        }
        expect(useGameStore.getState().loadError).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Submit Proposal' }));
        expect(screen.queryByRole('alert')).toBeNull();
        expect(resolveDayton).toHaveBeenCalledTimes(3);
        expect(resolveDayton.mock.calls.map(([proposal]) => proposal.territorial_demands))
            .toEqual(Array.from({ length: 3 }, () => ['gorazde_corridor']));
    });

    it('contains campaign keyboard shortcuts without canceling room control defaults', () => {
        const shellKeyDown = vi.fn();
        window.addEventListener('keydown', shellKeyDown);
        try {
            render(createElement(DaytonNegotiationModal, { dayton: PENDING, conference: true }));
            fireEvent.click(screen.getByRole('button', { name: 'Enter conference room' }));
            const heading = screen.getByRole('heading', { name: 'Hope Hotel conference room' });
            expect(document.activeElement).toBe(heading);

            for (const key of [' ', 's', '1', 'Escape']) {
                expect(fireEvent.keyDown(heading, { key })).toBe(true);
            }
            expect(shellKeyDown).not.toHaveBeenCalled();

            fireEvent.keyDown(heading, { key: 'Tab' });
            const folder = screen.getByTestId('dayton-hotspot-folder');
            expect(document.activeElement).toBe(folder);
            expect(fireEvent.keyDown(folder, { key: ' ' })).toBe(true);
            fireEvent.click(folder);
            fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
            expect(document.activeElement).toBe(folder);
            expect(shellKeyDown).not.toHaveBeenCalled();
        } finally {
            window.removeEventListener('keydown', shellKeyDown);
        }
    });

    it('keeps the forced conference open and only offers submission', () => {
        render(createElement(DaytonNegotiationModal, {
            conference: true,
            dayton: { ...PENDING, forced: { onFaction: 'RBiH', by: 'united_states' } },
        }));
        fireEvent.click(screen.getByRole('button', { name: 'Skip arrival' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        fireEvent.click(nav.getByRole('button', { name: 'Current draft' }));
        expect(screen.queryByRole('button', { name: 'Decline Settlement' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Submit Proposal' })).toBeTruthy();
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        expect(screen.getByRole('heading', { name: 'Hope Hotel conference room' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Submit Proposal' })).toBeNull();
    });
});
