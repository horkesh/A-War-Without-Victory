// @vitest-environment jsdom
/**
 * A9 P0-A display pass (SD13, 8-seat §6 ruling D5-D6, 2026-11-25): the player's own pocket falls reach the
 * Humanitarian Ledger ("Left the enclave" and "Killed") and the enclave card. Display only.
 * - the projection keeps the player's own side only;
 * - a negotiated fall shows "not recorded" in the Killed cell, never 0;
 * - the card picks the assaulted or the negotiated sentence;
 * - EN and BCS carry the same keys with the same placeholders.
 */
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard';
import { HumanitarianLedgerPanel } from '../../src/ui/map/components/HumanitarianLedgerPanel';
import { readPocketFalls } from '../../src/ui/map/data/GameStateAdapter';
import type { LoadedGameState, PocketFallView } from '../../src/ui/map/data/types';
import { setLocale } from '../../src/ui/map/i18n';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { enMessages } from '../../src/ui/map/i18n/messages.en';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleState } = require('../../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

afterEach(cleanup);
beforeEach(() => { setLocale('en'); });

const ASSAULTED = { turn: 170, mun_id: 'srebrenica', side: 'RBiH', captor: 'RS', left: 1200, routed: 1000, fled_abroad: 200, killed: 340, negotiated: false, reason: 'pocket_fall' };
const NEGOTIATED = { turn: 172, mun_id: 'zepa', side: 'RBiH', captor: 'RS', left: 500, routed: 500, fled_abroad: 0, killed: null, negotiated: true, reason: 'pocket_fall' };
const OTHER_SIDE = { turn: 60, mun_id: 'vitez', side: 'HRHB', captor: 'RBiH', left: 77, routed: 77, fled_abroad: 0, killed: 5, negotiated: false, reason: 'pocket_fall' };

function rawState(playerFaction: string | undefined): Record<string, any> {
    return {
        schema_version: 34,
        meta: { turn: 172, phase: 'war', player_faction: playerFaction },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: { formations: {} },
        political: { political_controllers: {} },
        displacement: { displacement_state: {}, pocket_fall_records: [ASSAULTED, OTHER_SIDE, NEGOTIATED], sustainability_state: {} },
    };
}

function ledgerState(pocketFalls: PocketFallView[]): LoadedGameState {
    return {
        player_faction: 'RBiH',
        nationalDisplacement: {
            civilianCasualtiesByEthnicity: {}, humanitarianAggregates: {}, refugeesByTurn: [], pocketFalls,
        },
    } as unknown as LoadedGameState;
}

const view = (over: Partial<PocketFallView>): PocketFallView => ({
    turn: 172, munId: 'zepa', name: 'Žepa', captor: 'RS', left: 500, killed: null, negotiated: true, ...over,
});

function cardState(fall: PocketFallView): LoadedGameState {
    return {
        player_faction: 'RBiH',
        enclaveResilience: {
            zepa: { resilience: 0, isolation_turns: 60, hardening_active: false, faction: 'RBiH', display_name: 'Žepa', pocket_fall: fall },
        },
    } as unknown as LoadedGameState;
}

const text = (el: ReturnType<typeof createElement>) => render(el).container.textContent ?? '';

describe('pocket-fall projection', () => {
    it('keeps the player\'s own side only, in order, and never mutates the state', () => {
        const state = rawState('RBiH');
        const before = JSON.stringify(state);
        const projected = projectPlayerVisibleState(state);
        expect(JSON.stringify(state)).toBe(before);
        expect(projected.displacement.pocket_fall_records).toEqual([ASSAULTED, NEGOTIATED]);
        expect(JSON.stringify(projected.displacement)).not.toContain('vitez');
    });

    it('drops every record when no player faction is set', () => {
        const projected = projectPlayerVisibleState(rawState(undefined));
        expect(projected.displacement.pocket_fall_records).toBeUndefined();
    });

    it('the adapter read model keeps own-side rows, null killed, and a readable name', () => {
        const rows = readPocketFalls([ASSAULTED, OTHER_SIDE, NEGOTIATED], 'RBiH');
        expect(rows.map((r) => r.munId)).toEqual(['srebrenica', 'zepa']);
        expect(rows[0]).toMatchObject({ name: 'Srebrenica', captor: 'RS', left: 1200, killed: 340, negotiated: false });
        expect(rows[1]).toMatchObject({ killed: null, negotiated: true });
        expect(readPocketFalls([ASSAULTED], undefined)).toEqual([]);
        expect(readPocketFalls(undefined, 'RBiH')).toEqual([]);
    });
});

describe('Ledger pocket-fall rows', () => {
    it('a negotiated row reads "not recorded" in Killed, never 0, and the scope note shows', () => {
        const el = render(createElement(HumanitarianLedgerPanel, { state: ledgerState([view({})]), open: true, onClose: () => {} }));
        const killed = el.getAllByTestId('humanitarian-ledger-pocket-fall-killed');
        expect(killed).toHaveLength(1);
        expect(killed[0]!.textContent).toBe('not recorded');
        const all = el.container.textContent ?? '';
        expect(all).toContain('Left the enclave');
        expect(all).toContain('Killed');
        expect(all).toContain('Fighters lost in the same fall are counted in the military record, not here.');
        expect(el.getByTestId('humanitarian-ledger-pocket-fall').textContent).toContain('simulation');
    });

    it('a recorded figure is shown, and BCS renders the BCS headers', () => {
        const rows = [view({ munId: 'srebrenica', name: 'Srebrenica', left: 1200, killed: 340, negotiated: false })];
        const en = text(createElement(HumanitarianLedgerPanel, { state: ledgerState(rows), open: true, onClose: () => {} }));
        expect(en).toContain('340');
        cleanup();
        setLocale('bcs');
        const bcs = text(createElement(HumanitarianLedgerPanel, { state: ledgerState(rows), open: true, onClose: () => {} }));
        expect(bcs).toContain('Napustili enklavu');
        expect(bcs).toContain('Ubijeni');
        expect(bcs).toContain('Snage RS');
    });

    it('no section and no note when there is no pocket fall', () => {
        const all = text(createElement(HumanitarianLedgerPanel, {
            state: { player_faction: 'RBiH', nationalDisplacement: { civilianCasualtiesByEthnicity: { RBiH: { killed: 3, fledAbroad: 1 } }, humanitarianAggregates: {}, refugeesByTurn: [] } } as unknown as LoadedGameState,
            open: true, onClose: () => {},
        }));
        expect(all).not.toContain('Left the enclave');
        expect(all).not.toContain('Fighters lost in the same fall');
    });

    it('wording never carries the banned phrases', () => {
        for (const bundle of [enMessages, bcsMessages] as Array<Record<string, string>>) {
            for (const key of ['humanitarianLedger.note.pocketFall', 'enclave.fall.assaulted', 'enclave.fall.negotiated']) {
                expect(bundle[key]).not.toMatch(/men and boys|massacre|forcibly transferred/i);
            }
        }
    });
});

describe('enclave card fall line', () => {
    it('an assaulted fall names the captor, the forced-out and the killed', () => {
        const t1 = text(createElement(EnclaveDashboard, {
            state: cardState(view({ munId: 'srebrenica', left: 1200, killed: 340, negotiated: false })), open: true, onClose: () => {},
        }));
        expect(t1).toContain('Taken by RS forces. 1,200 people were forced out of the enclave and 340 were killed.');
    });

    it('a negotiated fall uses the agreement sentence and shows no killed figure', () => {
        const t2 = text(createElement(EnclaveDashboard, { state: cardState(view({})), open: true, onClose: () => {} }));
        expect(t2).toContain('Taken by RS forces. 500 people were evacuated under an agreement. Deaths are not recorded.');
        expect(t2).not.toContain('were killed');
    });

    it('an assaulted fall with no recorded killed never prints 0', () => {
        const t3 = text(createElement(EnclaveDashboard, {
            state: cardState(view({ killed: null, negotiated: false })), open: true, onClose: () => {},
        }));
        expect(t3).toContain('not recorded were killed');
        expect(t3).not.toMatch(/\b0 were killed/);
    });

    it('a card without a fall shows no fall line; BCS sentence renders', () => {
        const none = text(createElement(EnclaveDashboard, {
            state: { player_faction: 'RBiH', enclaveResilience: { zepa: { resilience: 5, isolation_turns: 1, hardening_active: false, faction: 'RBiH', display_name: 'Žepa' } } } as unknown as LoadedGameState,
            open: true, onClose: () => {},
        }));
        expect(none).not.toContain('Taken by');
        cleanup();
        setLocale('bcs');
        const bcs = text(createElement(EnclaveDashboard, { state: cardState(view({})), open: true, onClose: () => {} }));
        expect(bcs).toContain('Po dogovoru je evakuirano');
    });
});

describe('EN and BCS parity for the new keys', () => {
    const KEYS = [
        'humanitarianLedger.section.pocketFall', 'humanitarianLedger.col.pocketEnclave', 'humanitarianLedger.col.pocketTakenBy',
        'humanitarianLedger.col.leftEnclave', 'humanitarianLedger.label.notRecorded', 'humanitarianLedger.note.pocketFall',
        'enclave.fall.assaulted', 'enclave.fall.negotiated',
    ];
    it('both bundles define every key with the same placeholders', () => {
        const en = enMessages as Record<string, string>;
        const bcs = bcsMessages as Record<string, string>;
        for (const key of KEYS) {
            expect(en[key], key).toBeTruthy();
            expect(bcs[key], key).toBeTruthy();
            const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
            expect(ph(bcs[key]!), key).toEqual(ph(en[key]!));
        }
    });
});
