// @vitest-environment jsdom
/**
 * A9 P1 refusal card (SD13, 8-seat §6 ruling D9; orchestrator P1 ruling 5): the negotiated evacuations on the RBiH
 * president's enclave card, and the decision to refuse further convoys. Display and decision surface only.
 * - the projection keeps the player's own episodes and convoys only;
 * - the adapter gives RBiH rows only, with the besieger of the episode's latest convoy;
 * - silence = allow: nothing is sent unless the president confirms;
 * - the copy states the cost (the people stay) and never a saved or prevented figure; no "you";
 * - EN and BCS carry the same keys with the same placeholders.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard';
import { readNegotiatedEvacuations } from '../../src/ui/map/data/GameStateAdapter';
import type { LoadedGameState, NegotiatedEvacuationView } from '../../src/ui/map/data/types';
import { setLocale } from '../../src/ui/map/i18n';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { enMessages } from '../../src/ui/map/i18n/messages.en';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleState } = require('../../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

afterEach(cleanup);
beforeEach(() => { setLocale('en'); });

const EPISODE = { opened_turn: 56, convoys: 2, people: 6_000, last_convoy_turn: 57, refused_turn: null };
const CONVOY_1 = { turn: 56, mun_id: 'srebrenica', side: 'RBiH', besieger: 'RS', people: 3_000, from_sheltered: 3_000, from_residents: 0, convoy: 1, episode_people: 3_000, reason: 'negotiated_evacuation' };
const CONVOY_2 = { ...CONVOY_1, turn: 57, convoy: 2, episode_people: 6_000 };
const RS_CONVOY = { ...CONVOY_1, mun_id: 'bihac', side: 'RS', besieger: 'RBiH' };

function rawState(playerFaction: string | undefined): Record<string, any> {
    return {
        schema_version: 34,
        meta: { turn: 58, phase: 'war', player_faction: playerFaction },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: { formations: {} },
        political: { political_controllers: {} },
        displacement: {
            displacement_state: {
                srebrenica: { mun_id: 'srebrenica', original_population: 37_000, displaced_in: 20_000, displaced_out: 0, lost_population: 0, last_updated_turn: 57,
                    negotiated_evacuation_by_side: { RBiH: EPISODE } },
                bihac: { mun_id: 'bihac', original_population: 70_000, displaced_in: 0, displaced_out: 0, lost_population: 0, last_updated_turn: 57,
                    negotiated_evacuation_by_side: { RS: { ...EPISODE, people: 3_000, convoys: 1 } } },
            },
            negotiated_evacuation_records: [CONVOY_1, RS_CONVOY, CONVOY_2],
            sustainability_state: {},
        },
    };
}

const view = (over: Partial<NegotiatedEvacuationView> = {}): NegotiatedEvacuationView => ({
    munId: 'srebrenica', people: 6_000, besieger: 'RS', refused: false, capReached: false, ...over,
});

function cardState(evacuation: NegotiatedEvacuationView): LoadedGameState {
    return {
        player_faction: 'RBiH',
        enclaveResilience: {
            srebrenica: {
                resilience: 12, isolation_turns: 10, hardening_active: false, faction: 'RBiH', display_name: 'Srebrenica',
                negotiated_evacuations: [evacuation],
            },
        },
    } as unknown as LoadedGameState;
}

const card = (evacuation: NegotiatedEvacuationView, onRefuse?: (munId: string) => Promise<{ ok: boolean; error?: string }>) =>
    render(createElement(EnclaveDashboard, { state: cardState(evacuation), open: true, onClose: () => {}, onRefuseEvacuation: onRefuse }));

describe('refusal card projection and view', () => {
    it('the projection keeps the player\'s own episodes and convoys only, and never mutates the state', () => {
        const state = rawState('RBiH');
        const before = JSON.stringify(state);
        const projected = projectPlayerVisibleState(state);
        expect(JSON.stringify(state)).toBe(before);
        expect(projected.displacement.displacement_state.srebrenica.negotiated_evacuation_by_side).toEqual({ RBiH: EPISODE });
        expect(projected.displacement.displacement_state.bihac.negotiated_evacuation_by_side).toBeUndefined();
        expect(projected.displacement.negotiated_evacuation_records).toEqual([CONVOY_1, CONVOY_2]);
    });

    it('drops every episode and convoy when no player faction is set', () => {
        const projected = projectPlayerVisibleState(rawState(undefined));
        expect(projected.displacement.negotiated_evacuation_records).toBeUndefined();
        expect(projected.displacement.displacement_state?.srebrenica?.negotiated_evacuation_by_side).toBeUndefined();
    });

    it('the adapter gives RBiH rows only, with the latest convoy\'s besieger, refusal and cap', () => {
        const s = rawState('RBiH').displacement;
        expect(readNegotiatedEvacuations(s.displacement_state, s.negotiated_evacuation_records, 'RBiH')).toEqual([view()]);
        expect(readNegotiatedEvacuations(s.displacement_state, s.negotiated_evacuation_records, 'RS')).toEqual([]);
        expect(readNegotiatedEvacuations(s.displacement_state, s.negotiated_evacuation_records, null)).toEqual([]);
        s.displacement_state.srebrenica.negotiated_evacuation_by_side.RBiH = { ...EPISODE, people: 9_000, refused_turn: 57 };
        expect(readNegotiatedEvacuations(s.displacement_state, s.negotiated_evacuation_records, 'RBiH'))
            .toEqual([view({ people: 9_000, refused: true, capReached: true })]);
        // A convoy of an earlier episode does not name this one's besieger.
        s.displacement_state.srebrenica.negotiated_evacuation_by_side.RBiH = { ...EPISODE, opened_turn: 80, people: 0, convoys: 0 };
        expect(readNegotiatedEvacuations(s.displacement_state, s.negotiated_evacuation_records, 'RBiH'))
            .toEqual([view({ people: 0, besieger: null })]);
    });
});

describe('refusal card', () => {
    it('open: states the evacuations, the government\'s opposition and the cost, and offers the decision', () => {
        card(view(), async () => ({ ok: true }));
        const section = screen.getByTestId('enclave-negotiated-evacuation');
        expect(section.textContent).toContain('6,000 people were evacuated from the enclave with the consent of RS forces.');
        expect(screen.getByTestId('enclave-evacuation-opposition').textContent).toBe(
            'The government opposed such evacuations as contributing to the ethnic cleansing of the territory. A local ban on them was not obeyed.',
        );
        expect(section.textContent).toContain(enMessages['enclave.evacuation.cost']);
        expect(screen.getByTestId('enclave-evacuation-refuse')).toBeTruthy();
        expect(section.getAttribute('data-refused')).toBe('false');
    });

    it('the opposition and local-ban note is Srebrenica\'s sourced history only; another pocket gets no note', () => {
        render(createElement(EnclaveDashboard, {
            state: { player_faction: 'RBiH', enclaveResilience: { gorazde: {
                resilience: 12, isolation_turns: 10, hardening_active: false, faction: 'RBiH', display_name: 'Goražde',
                negotiated_evacuations: [view({ munId: 'gorazde' })],
            } } } as unknown as LoadedGameState,
            open: true, onClose: () => {}, onRefuseEvacuation: async () => ({ ok: true }),
        }));
        expect(screen.queryByTestId('enclave-evacuation-opposition')).toBeNull();
        expect(screen.getByTestId('enclave-evacuation-recorded')).toBeTruthy();
        expect(screen.getByTestId('enclave-evacuation-refuse')).toBeTruthy();
    });

    it('focus: Cancel on entering the confirm step, back to Refuse on cancel; the group is labelled by its title', () => {
        card(view(), async () => ({ ok: true }));
        // was: the bare title key; the heading names the municipality since Codex #868 r4699080430.
        expect(screen.getByRole('group', { name: "Srebrenica: evacuation with the besieger's consent" })).toBeTruthy();
        fireEvent.click(screen.getByTestId('enclave-evacuation-refuse'));
        expect(document.activeElement?.textContent).toBe(enMessages['enclave.evacuation.cancel']);
        fireEvent.click(screen.getByText(enMessages['enclave.evacuation.cancel']));
        expect(document.activeElement).toBe(screen.getByTestId('enclave-evacuation-refuse'));
    });

    it('a rejected decision call shows the failure and does not leave the buttons stuck', async () => {
        card(view(), async () => { throw new Error('ipc down'); });
        fireEvent.click(screen.getByTestId('enclave-evacuation-refuse'));
        fireEvent.click(screen.getByTestId('enclave-evacuation-confirm'));
        expect((await screen.findByRole('alert')).textContent).toBe(enMessages['enclave.evacuation.refuseFailed']);
        expect((screen.getByTestId('enclave-evacuation-refuse') as HTMLButtonElement).disabled).toBe(false);
    });

    it('silence = allow: nothing is sent on opening, on the first click, or on cancel; only the confirm sends', async () => {
        const onRefuse = vi.fn(async () => ({ ok: true }));
        card(view(), onRefuse);
        expect(onRefuse).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('enclave-evacuation-refuse'));
        expect(onRefuse).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText(enMessages['enclave.evacuation.cancel']));
        expect(onRefuse).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('enclave-evacuation-refuse'));
        fireEvent.click(screen.getByTestId('enclave-evacuation-confirm'));
        await vi.waitFor(() => expect(onRefuse).toHaveBeenCalledWith('srebrenica'));
        expect(onRefuse).toHaveBeenCalledTimes(1);
    });

    it('refused: the stopped line with the cost, no decision, and no "refused", "saved" or "prevented" wording', () => {
        card(view({ refused: true }), async () => ({ ok: true }));
        const section = screen.getByTestId('enclave-negotiated-evacuation');
        expect(screen.getByTestId('enclave-evacuation-stopped').textContent).toBe(enMessages['enclave.evacuation.stopped']);
        expect(screen.queryByTestId('enclave-evacuation-refuse')).toBeNull();
        expect(section.getAttribute('data-refused')).toBe('true');
        expect(section.textContent).not.toMatch(/refused|saved|prevented|spared/i);
    });

    it('no decision at the cap, or without a decision callback; no recorded line before the first convoy', () => {
        card(view({ capReached: true }), async () => ({ ok: true }));
        expect(screen.queryByTestId('enclave-evacuation-refuse')).toBeNull();
        cleanup();
        card(view());
        expect(screen.queryByTestId('enclave-evacuation-refuse')).toBeNull();
        cleanup();
        card(view({ people: 0, besieger: null }), async () => ({ ok: true }));
        expect(screen.queryByTestId('enclave-evacuation-recorded')).toBeNull();
        expect(screen.getByTestId('enclave-evacuation-refuse')).toBeTruthy();
    });

    it('a failed decision says so and is not shown as taken', async () => {
        card(view(), async () => ({ ok: false, error: 'No open evacuation to refuse' }));
        fireEvent.click(screen.getByTestId('enclave-evacuation-refuse'));
        fireEvent.click(screen.getByTestId('enclave-evacuation-confirm'));
        expect((await screen.findByRole('alert')).textContent).toBe(enMessages['enclave.evacuation.refuseFailed']);
        expect(screen.queryByTestId('enclave-evacuation-stopped')).toBeNull();
    });

    it('two municipalities of one enclave: each section names its own municipality, and a refusal stops only that one (Codex #868 r4699080430)', async () => {
        const onRefuse = vi.fn(async () => ({ ok: true }));
        const twoMuns = (bihacRefused: boolean) => ({
            player_faction: 'RBiH',
            enclaveResilience: { bihac: {
                resilience: 12, isolation_turns: 10, hardening_active: false, faction: 'RBiH', display_name: 'Bihać pocket',
                negotiated_evacuations: [view({ munId: 'bihac', refused: bihacRefused }), view({ munId: 'cazin' })],
            } },
        }) as unknown as LoadedGameState;
        const { rerender } = render(createElement(EnclaveDashboard, { state: twoMuns(false), open: true, onClose: () => {}, onRefuseEvacuation: onRefuse }));
        const [bihac, cazin] = screen.getAllByTestId('enclave-negotiated-evacuation');
        expect(bihac!.getAttribute('data-mun-id')).toBe('bihac');
        expect(screen.getByRole('group', { name: "Bihać: evacuation with the besieger's consent" })).toBe(bihac);
        expect(screen.getByRole('group', { name: "Cazin: evacuation with the besieger's consent" })).toBe(cazin);
        fireEvent.click(within(bihac!).getByTestId('enclave-evacuation-refuse'));
        expect(within(bihac!).getByTestId('enclave-evacuation-confirm').textContent).toBe('Confirm: stop further convoys from Bihać');
        expect(within(cazin!).queryByTestId('enclave-evacuation-confirm')).toBeNull();
        fireEvent.click(within(bihac!).getByTestId('enclave-evacuation-confirm'));
        await vi.waitFor(() => expect(onRefuse).toHaveBeenCalledWith('bihac'));
        expect(onRefuse).toHaveBeenCalledTimes(1);
        rerender(createElement(EnclaveDashboard, { state: twoMuns(true), open: true, onClose: () => {}, onRefuseEvacuation: onRefuse }));
        const [bihacAfter, cazinAfter] = screen.getAllByTestId('enclave-negotiated-evacuation');
        expect(bihacAfter!.getAttribute('data-refused')).toBe('true');
        expect(within(bihacAfter!).getByTestId('enclave-evacuation-stopped')).toBeTruthy();
        expect(cazinAfter!.getAttribute('data-refused')).toBe('false');
        expect(within(cazinAfter!).getByTestId('enclave-evacuation-refuse')).toBeTruthy();
        setLocale('bcs');
        rerender(createElement(EnclaveDashboard, { state: twoMuns(false), open: true, onClose: () => {}, onRefuseEvacuation: onRefuse }));
        expect(screen.getByRole('group', { name: 'Cazin: evakuacija uz pristanak opsjedatelja' })).toBeTruthy();
        const cazinBcs = screen.getAllByTestId('enclave-negotiated-evacuation')[1]!;
        fireEvent.click(within(cazinBcs).getByTestId('enclave-evacuation-refuse'));
        expect(within(cazinBcs).getByTestId('enclave-evacuation-confirm').textContent).toBe('Potvrdi: zaustavi daljnje konvoje (Cazin)');
    });

    it('renders in BCS', () => {
        setLocale('bcs');
        card(view(), async () => ({ ok: true }));
        const section = screen.getByTestId('enclave-negotiated-evacuation');
        expect(section.textContent).toContain(bcsMessages['enclave.evacuation.opposition']);
        expect(section.textContent).toContain('(Snage RS)');
    });
});

describe('refusal card copy', () => {
    const keys = Object.keys(enMessages).filter((k) => k.startsWith('enclave.evacuation.')).sort();
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    it('EN and BCS carry the same keys with the same placeholders', () => {
        expect(keys).toEqual([
            'enclave.evacuation.cancel', 'enclave.evacuation.confirm', 'enclave.evacuation.cost', 'enclave.evacuation.localBan',
            'enclave.evacuation.opposition', 'enclave.evacuation.recorded', 'enclave.evacuation.refuse', 'enclave.evacuation.refuseFailed',
            'enclave.evacuation.stopped', 'enclave.evacuation.title',
        ]);
        for (const key of keys) {
            const en = (enMessages as Record<string, string>)[key];
            const bcs = (bcsMessages as Record<string, string>)[key];
            expect(bcs, key).toBeTruthy();
            expect(placeholders(bcs), key).toEqual(placeholders(en));
        }
    });

    it('no figure in the cost lines, no "you", no saved or prevented wording, no calendar date', () => {
        for (const key of keys) {
            const en = (enMessages as Record<string, string>)[key];
            expect(en, key).not.toMatch(/\byou(r)?\b/i);
            expect(en, key).not.toMatch(/saved|prevented|spared|rescued/i);
            expect(en, key).not.toMatch(/\b(19\d\d|April|May)\b/);
        }
        for (const key of ['enclave.evacuation.cost', 'enclave.evacuation.stopped'] as const) {
            expect(enMessages[key]).not.toMatch(/\d|\{/);
            expect(bcsMessages[key]).not.toMatch(/\d|\{/);
        }
    });
});
