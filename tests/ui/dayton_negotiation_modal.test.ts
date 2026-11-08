// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import * as dataLoader from '../../src/ui/map/data/DataLoader';
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
        // One control per power: the six legacy centralized/decentralized toggles are
        // gone; the competency matrix is the single institutional control.
        expect(screen.queryByText('Institutional Architecture')).toBeNull();
        expect(screen.getByText('State Competencies (Annex 4)')).toBeTruthy();
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

    const agreement = (owner: 'shared' | 'entity' = 'shared', holder = 'RBiH') => ({
        version: 1,
        terms: { brcko_status: 'arbitration', institutional_choices: {}, competency_allocation: { comp_foreign_policy: owner, comp_defense: 'entity' } },
        map: { wartimeControllers: { included: 'RS', unrelated: 'RS' }, controllers: { included: holder, unrelated: 'HRHB' }, specialOsids: [], territoryPct: {} },
    });

    function openDraft(dayton = PENDING) {
        render(createElement(DaytonNegotiationModal, { dayton, conference: true }));
        fireEvent.click(screen.getByRole('button', { name: 'Skip arrival' }));
        fireEvent.click(within(screen.getByRole('navigation', { name: 'Conference objects' })).getByRole('button', { name: 'Current draft' }));
    }

    /** The conference shows no cost figures (DC A2); each Demand button is named by its package. */
    const demandCorridor = () => screen.getByRole('button', { name: 'Demand: Goražde Corridor' });

    it('prices a state-level defense term at the live RBiH engine cost', () => {
        openDraft({ ...PENDING, factionCapital: { ...PENDING.factionCapital, RBiH: 10 } });
        const close = () => fireEvent.click(screen.getByRole('button', { name: 'Return to conference room' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        close();
        fireEvent.click(nav.getByRole('button', { name: 'Treaty binder' }));
        // Defense is set once, on the competency row (the legacy "Military Structure"
        // toggle no longer exists). Pulling it to the state costs RS, not RBiH.
        expect(screen.queryByText('Military Structure')).toBeNull();
        const defenseRow = screen.getByText('Defense').parentElement!;
        fireEvent.click(within(defenseRow).getByRole('button', { name: 'State' }));
        close();
        fireEvent.click(nav.getByRole('button', { name: 'Current draft' }));
        expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Review agreement' }).disabled).toBe(false);
    });

    it('reviews a revised draft while an older preview is pending and signs only the newer proposal', async () => {
        let finishOld: (response: unknown) => void = () => {};
        const previewDayton = vi.fn()
            .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
            .mockResolvedValueOnce({ ok: true, agreement: agreement() });
        const resolveDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton, resolveDayton };
        openDraft();
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
        fireEvent.click(demandCorridor());
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        expect(previewDayton).toHaveBeenCalledTimes(2);
        await screen.findByRole('region', { name: 'Institutions and powers' });
        await act(async () => finishOld({ ok: false }));
        expect(screen.queryByRole('alert')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Sign agreement' }));
        expect(resolveDayton.mock.calls[0]![0]).toEqual(previewDayton.mock.calls[1]![0]);
    });

    it('keeps signing behind review of a successful preview of the current draft', async () => {
        const previewDayton = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, agreement: agreement() });
        const resolveDayton = vi.fn().mockResolvedValue({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton, resolveDayton };
        openDraft();
        expect(screen.queryByRole('button', { name: 'Submit Proposal' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        const sign = screen.getByRole<HTMLButtonElement>('button', { name: 'Sign agreement' });
        await screen.findByRole('alert');
        expect(sign.disabled).toBe(true);
        fireEvent.click(sign);
        expect(resolveDayton).not.toHaveBeenCalled();
        const retry = screen.getByRole('button', { name: 'Probe Positions' });
        retry.focus();
        fireEvent.click(retry);
        await screen.findByRole('region', { name: 'Institutions and powers' });
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Changes from the opening draft' }));
        expect(screen.getByRole('region', { name: 'Settlement territory' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
        fireEvent.click(demandCorridor());
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        await waitFor(() => expect(previewDayton).toHaveBeenCalledTimes(3));
        await screen.findByRole('region', { name: 'Institutions and powers' });
        fireEvent.click(screen.getByRole('button', { name: 'Sign agreement' }));
        expect(resolveDayton.mock.calls[0]![0]).toEqual(previewDayton.mock.calls[2]![0]);
    });

    it('follows a counter clause to its exact map members and binder row, then adopts the same proposal for review', async () => {
        const geometry = vi.spyOn(dataLoader, 'loadOperationalSettlements').mockResolvedValue({
            type: 'FeatureCollection',
            features: ['included', 'unrelated'].map(osid => ({ type: 'Feature', properties: { osid }, geometry: { type: 'Polygon', coordinates: [[[17, 44], [18, 44], [18, 45], [17, 44]]] } })),
        });
        const counter = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'federalized', competency_allocation: { comp_foreign_policy: 'entity', comp_defense: 'state' },
        };
        // The counter comes from a tabled round saved on the packet (DC A2), not a probe.
        const previewDayton = vi.fn()
            .mockResolvedValueOnce({ ok: true, agreement: agreement() })
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValue({ ok: true, agreement: agreement('entity', 'RS') });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton };
        const corridor = { ...PENDING.territorialPackages[0]!, osids: ['included', 'missing'] };
        const round = {
            round: 1, turn: 187, pressure: 0,
            proposal: { territorial_demands: ['gorazde_corridor'], territorial_concessions: [], institutional_choices: {} },
            responses: { RS: { decision: 'counter' as const, reason: 'Proposal cost (40) exceeds acceptable range (12).', reason_code: 'counter_far' as const,
                proposal_cost: 40, available_capital: 20, counter_proposal: counter } },
        };
        openDraft({ ...PENDING, territorialPackages: [corridor, ...PENDING.territorialPackages.slice(1)], rounds: [round] as never });
        // The first reviewed preview is the opening treaty that Final review compares against.
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        await screen.findByRole('region', { name: 'Institutions and powers' });
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
        fireEvent.click(demandCorridor());
        expect(screen.getByText('Republika Srpska rejects most of the draft and answers with its own terms.')).toBeTruthy();
        // The engine's diagnostic reason, with its cost figures, never reaches the room.
        expect(screen.queryByText(/Proposal cost/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Goražde Corridor.*Demand.*Unraised/ }));
        const retry = await screen.findByRole('button', { name: 'Retry clause preview' });
        retry.focus();
        fireEvent.click(retry);
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Settlement map' }));
        const map = await screen.findByRole('img', { name: 'Settlement territory' });
        expect([...map.querySelectorAll('[data-dayton-highlighted]')].map(path => path.getAttribute('data-dayton-osid'))).toEqual(['included']);
        expect(screen.getByText(/RS → RS/)).toBeTruthy();
        expect(screen.getByText(/Missing.*Geometry unavailable/i)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /Goražde Corridor.*Demand.*Unraised/ }));
        fireEvent.click(screen.getByRole('button', { name: /Foreign Policy.*State.*Entity/i }));
        const term = await screen.findByText('Foreign Policy', { selector: 'dt' });
        expect(document.activeElement).toBe(term.parentElement);
        fireEvent.keyDown(term.parentElement!, { key: 'Escape' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /Foreign Policy.*State.*Entity/i }));
        fireEvent.click(screen.getByRole('button', { name: /Defense.*Entity.*State/i }));
        const defense = (await screen.findByText('Defense', { selector: 'dt' })).parentElement!;
        expect(defense.textContent).toMatch(/Projected settlement termEntity/);
        expect(defense.textContent).toMatch(/Counter-offer terms · Entity → State/);
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
        const adopt = screen.getByRole('button', { name: 'Adopt counter-offer' });
        adopt.focus();
        fireEvent.click(adopt);
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Review agreement' }));
        expect(screen.getByText('Counter-offer copied into your editable draft.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        await screen.findByRole('region', { name: 'Institutions and powers' });
        expect(screen.getByRole('button', { name: /Foreign Policy.*Shared.*Entity/i })).toBeTruthy();
        expect(previewDayton.mock.lastCall?.[0]).toEqual(counter);
        geometry.mockRestore();
    });

    it('tables the current draft as the next round and shows the round track and deadline (DC A2)', async () => {
        const tableDaytonRound = vi.fn().mockResolvedValue({ ok: true, round: {} });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { tableDaytonRound, previewDayton: vi.fn() };
        openDraft();
        const delegations = within(screen.getByRole('region', { name: 'Delegations' }));
        expect(screen.getByText(/Round 1 of 3 · Wright-Patterson/)).toBeTruthy();
        expect(delegations.getByText(/The mediator allows 3 rounds/)).toBeTruthy();
        fireEvent.click(demandCorridor());
        fireEvent.click(delegations.getByRole('button', { name: 'Table this draft (round 1 of 3)' }));
        await waitFor(() => expect(tableDaytonRound).toHaveBeenCalledTimes(1));
        expect(tableDaytonRound.mock.calls[0]![0].territorial_demands).toEqual(['gorazde_corridor']);
        // No cost figures anywhere in the draft panel.
        expect(screen.queryByText(/\(\d+\)/)).toBeNull();
        expect(screen.getByRole('meter', { name: 'Room to bargain' })).toBeTruthy();
    });

    it('warns on the last round and offers only sign or walk away once the rounds are spent', () => {
        const proposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
        const accept = { decision: 'accept' as const, reason: '', reason_code: 'accept_patron' as const, proposal_cost: 0, available_capital: 50 };
        const round = (n: number) => ({ round: n, turn: 187, pressure: 10 * Math.min(2, n - 1), proposal, responses: { RS: accept, HRHB: accept } });
        openDraft({ ...PENDING, rounds: [round(1), round(2)] as never });
        expect(screen.getByText('This is the last round.')).toBeTruthy();
        expect(screen.getByText('Answers to round 2')).toBeTruthy();
        expect(screen.getByText('Republika Srpska accepts the draft. Belgrade pressed it to.')).toBeTruthy();
        cleanup();
        openDraft({ ...PENDING, rounds: [round(1), round(2), round(3)] as never });
        expect(screen.queryByRole('button', { name: /Table this draft/ })).toBeNull();
        expect(screen.getByText('The mediator has taken the last draft. You sign or walk away.')).toBeTruthy();
        expect(screen.getByText(/Final round over · Wright-Patterson/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Review agreement' })).toBeTruthy();
    });

    it('opens a delegation brief that states the ground, the record, the patron and the refused plans', () => {
        const folder = {
            faction: 'RBiH', turn: 187,
            settlements: { held: 250, total: 712, peak: 319, peak_turn: 0 },
            enclaves: { held: ['gorazde'], lost: ['srebrenica', 'zepa'] },
            condemnation: [],
            patron: { override_authority: 80, force_threshold: 75, can_force: true },
            refused_plans: [{
                plan_id: 'owen_stoltenberg', turn_offered: 70, proposed_split: { RBiH: 30, RS: 52.5, HRHB: 17.5 },
                refused_by: ['RBiH'], player_answer: 'rejected' as const, weeks_since: 117,
                dead_since: { military: 41000, civilian: 12000 }, displaced_since: 400000,
            }],
            war: { weeks: 187, dead: { military: 88000, civilian: 31000 }, displaced: 1300000 },
        };
        render(createElement(DaytonNegotiationModal, { dayton: { ...PENDING, delegationFolder: folder }, conference: true }));
        fireEvent.click(screen.getByRole('button', { name: 'Enter conference room' }));
        fireEvent.click(screen.getByTestId('dayton-hotspot-folder'));
        const brief = screen.getByRole('article', { name: 'Delegation folder' });
        expect(within(brief).getByText('Republic of Bosnia and Herzegovina')).toBeTruthy();
        expect(within(brief).getByText('250 of 712 settlements')).toBeTruthy();
        expect(within(brief).getByText(/At your height, on 6 Apr 1992, you held 319/)).toBeTruthy();
        expect(within(brief).getByText('Srebrenica, Žepa')).toBeTruthy();
        expect(within(brief).getByText(/No international condemnation/)).toBeTruthy();
        expect(within(brief).getByText(/Washington can sign concessions over your head/)).toBeTruthy();
        expect(within(brief).getByText('Owen-Stoltenberg Plan')).toBeTruthy();
        expect(within(brief).getByText('Your delegation refused it.')).toBeTruthy();
        expect(within(brief).getByText(/In the 117 weeks since, 41,000 soldiers and 12,000 civilians were killed on all sides, and 400,000 civilians were displaced/)).toBeTruthy();
        const total = within(brief).getByText('The war so far, all sides').closest('footer')!;
        expect(within(total as HTMLElement).getByText('88,000')).toBeTruthy();
        expect(within(total as HTMLElement).getByText('soldiers killed')).toBeTruthy();
        expect(within(total as HTMLElement).getByText('31,000')).toBeTruthy();
        expect(within(total as HTMLElement).getByText('1,300,000')).toBeTruthy();
        // No bargaining cost figures in the brief (A2).
        expect(within(brief).queryByText(/Negotiation Capital/)).toBeNull();
    });

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
        // The folder is the campaign's receipt (DC A1); the budget moved to the draft.
        // PENDING predates the brief, so the folder says so plainly.
        expect(screen.getByText(/saved before delegation briefs existed/)).toBeTruthy();
        expect(screen.queryByText('Negotiation Capital:')).toBeNull();
        close();
        expect(document.activeElement).toBe(folderHotspot);

        const draft = nav.getByRole('button', { name: 'Current draft' });
        fireEvent.click(draft);
        fireEvent.click(demandCorridor());
        // No free probing in the conference (DC A2): the draft has no Probe button.
        expect(within(screen.getByRole('region', { name: 'Delegations' })).queryByRole('button', { name: 'Probe Positions' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        await screen.findByRole('region', { name: 'Institutions and powers' });
        expect(previewDayton.mock.calls[0]![0].territorial_demands).toEqual(['gorazde_corridor']);
        expect(resolveDayton).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Return to current draft' }));
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
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        fireEvent.click(screen.getByRole('button', { name: 'Sign agreement' }));
        await waitFor(() => expect(resolveDayton.mock.calls[0]![0]).toEqual(previewDayton.mock.calls[0]![0]));
    });

    it('shows preview failures in the conference and clears them on retry', async () => {
        const previewDayton = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'preview rejected' })
            .mockResolvedValueOnce({ ok: true, agreement: agreement() });
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
        const previewDayton = vi.fn().mockResolvedValue({ ok: true, agreement: agreement() });
        const resolveDayton = vi.fn()
            .mockResolvedValueOnce({ ok: false, error: 'signature rejected' })
            .mockRejectedValueOnce(new Error('signature transport failed'))
            .mockResolvedValueOnce({ ok: true });
        (window as unknown as { awwv: Record<string, unknown> }).awwv = { previewDayton, resolveDayton };
        render(createElement(DaytonNegotiationModal, { dayton: PENDING, conference: true }));

        fireEvent.click(screen.getByRole('button', { name: 'Skip arrival' }));
        const nav = within(screen.getByRole('navigation', { name: 'Conference objects' }));
        fireEvent.click(nav.getByRole('button', { name: 'Current draft' }));
        fireEvent.click(demandCorridor());
        fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
        await screen.findByRole('region', { name: 'Settlement territory' });

        for (let attempt = 0; attempt < 2; attempt++) {
            const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Sign agreement' });
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
        fireEvent.click(screen.getByRole('button', { name: 'Sign agreement' }));
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
        expect(screen.getByRole('button', { name: 'Review agreement' })).toBeTruthy();
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        expect(screen.getByRole('heading', { name: 'Hope Hotel conference room' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Review agreement' })).toBeNull();
    });
});
