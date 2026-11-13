// @vitest-environment jsdom

/**
 * Sensitive-copy lane (R2', R3, S9, R8), Pyrrhic sensitive-history panel
 * 2026-11-13. Record: docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md §4 and the
 * §6 "Sensitive-copy lane" row.
 *
 * Pins the panel's rulings that a later edit could quietly undo:
 *   - the Humanitarian Ledger names victims as peoples and shows NO responsible
 *     side, because the engine books siege losses to the side holding the town;
 *     rows stay in key order (Ring 3 #7);
 *   - the Srebrenica receipt has one English source (sim builder == i18n EN) and a BCS form;
 *   - BCS corps names come from i18n by corps id; EN stays the data name;
 *   - the replay scrubber shows no figure the engine never writes; its displaced
 *     figure counts the killed and says so (SC6, 2026-11-13).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
    HumanitarianLedgerPanel,
    displacedOrKilledByPeople,
} from '../../src/ui/map/components/HumanitarianLedgerPanel';
import { ruptureReceiptText } from '../../src/ui/map/components/VerdictScreen';
import { buildDynamicSections } from '../../src/sim/codex/dynamic_section_builder.js';
import type { GameState } from '../../src/state/game_state.js';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import { setLocale } from '../../src/ui/map/i18n';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { formatCorpsDisplayName } from '../../src/ui/map/utils/formatters';
import { withoutComments } from '../helpers/sourceComments';
import { ReplayScrubber } from '../../src/ui/map/components/replay/ReplayScrubber';
import type { ReplaySaveManifest } from '../../src/sim/replay/replay_manifest';

afterEach(() => {
    cleanup();
    setLocale('en');
});

function read(file: string): string {
    return readFileSync(join(process.cwd(), file), 'utf8');
}

const ledgerState = {
    player_faction: 'RS',
    nationalDisplacement: {
        civilianCasualtiesByEthnicity: {
            HRHB: { killed: 30, fledAbroad: 300 },
            RBiH: { killed: 90, fledAbroad: 900 },
            RS: { killed: 60, fledAbroad: 600 },
        },
        humanitarianAggregates: {
            RS: { RBiH: { refugeesCreated: 5000, refugeesReceived: 0, civilianCasualtiesCaused: 80 } },
            // Siege pressure on a pocket RBiH holds: recorded with RBiH as "causer".
            RBiH: {
                RBiH: { refugeesCreated: 700, refugeesReceived: 0, civilianCasualtiesCaused: 7 },
                RS: { refugeesCreated: 1200, refugeesReceived: 0, civilianCasualtiesCaused: 12 },
            },
            _unknown: { RBiH: { refugeesCreated: 300, refugeesReceived: 0, civilianCasualtiesCaused: 3 } },
        },
        refugeesByTurn: [],
    },
} as unknown as LoadedGameState;

function secondTableRows(container: HTMLElement): string[][] {
    const tables = container.querySelectorAll('table');
    const table = tables[tables.length - 1];
    return [...table.querySelectorAll('tbody tr')].map((tr) =>
        [...tr.querySelectorAll('td')].map((td) => td.textContent ?? ''),
    );
}

describe('Humanitarian Ledger labels (R2\')', () => {
    it('sums every caused_by bucket into one row per victim group, in key order', () => {
        expect(displacedOrKilledByPeople(ledgerState.nationalDisplacement!.humanitarianAggregates)).toEqual([
            { victim: 'RBiH', displaced: 6000, killed: 90 },
            { victim: 'RS', displaced: 1200, killed: 12 },
        ]);
    });

    it('EN: peoples only, no responsible-side column (siege losses are booked to the holder)', () => {
        setLocale('en');
        const { container } = render(createElement(HumanitarianLedgerPanel, { state: ledgerState, open: true, onClose: () => {} }));
        const rows = secondTableRows(container);
        expect(rows.map((r) => r[0])).toEqual(['Bosniaks', 'Serbs']);
        expect(rows[0][1].replace(/\D/g, '')).toBe('6000');
        const text = container.textContent ?? '';
        expect(text).toContain('Displaced or killed, by people');
        expect(text).toContain('do not describe the historical war');
        for (const side of ['RBiH forces', 'RS forces', 'Herzeg-Bosnia forces', 'Responsible', 'Unattributed']) {
            expect(text).not.toContain(side);
        }
    });

    it('BCS: no English label survives', () => {
        setLocale('bcs');
        const { container } = render(createElement(HumanitarianLedgerPanel, { state: ledgerState, open: true, onClose: () => {} }));
        expect(secondTableRows(container).map((r) => r[0])).toEqual(['Bošnjaci', 'Srbi']);
        const text = container.textContent ?? '';
        for (const english of ['Bosniaks', 'Serbs', 'Croats', 'forces', 'Unattributed', 'Displaced', 'Killed']) {
            expect(text).not.toContain(english);
        }
        expect(text).toContain('Hrvati');
        expect(text).toContain('Raseljeni ili ubijeni, po narodu');
    });

    it('source: no hard-coded people names, no responsible column, no value sort', () => {
        const source = withoutComments(read('src/ui/map/components/HumanitarianLedgerPanel.tsx'));
        expect(source).not.toMatch(/'(Bosniaks|Serbs|Croats|Unattributed)'/);
        expect(source).not.toContain('PENDING OWNER SIGN-OFF');
        expect(source).not.toContain('humanitarianLedger.col.perpetrator');
        expect(source).not.toContain('humanitarianLedger.side.');
        expect(source).not.toMatch(/\.sort\([^)]*(displaced|killed|refugeesCreated)/);
    });

    it('the side labels ship for the siege-attribution follow-up, named as forces', () => {
        expect(enMessages['humanitarianLedger.side.RS']).toBe('RS forces');
        expect(bcsMessages['humanitarianLedger.side.HRHB']).toBe('Snage Herceg-Bosne');
    });
});

describe('Verdict strings (R3)', () => {
    const state = {
        paramilitary_policy: 'ask',
        meta: { player_faction: 'RBiH' },
        military: {
            event_flags: {},
            event_fire_counts: {},
            event_decision_log: [],
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
                rupture_consequences: [{ id: 'srebrenica_genocide_1995', recorded_turn: 166, perpetrator_faction: 'RS' }],
            },
        },
        political: {},
    } as unknown as GameState;

    it('the Srebrenica receipt has one English source and a BCS form', () => {
        const receipt = buildDynamicSections({ state, currentTurn: 188 }).find((s) => s.id === 'rupture_receipt_srebrenica_genocide_1995');
        expect(receipt).toBeDefined();
        expect(enMessages['verdict.record.srebrenicaGenocide']).toBe(receipt!.content);
        setLocale('en');
        expect(ruptureReceiptText(receipt!.id, receipt!.content)).toBe(receipt!.content);
        setLocale('bcs');
        const bcs = ruptureReceiptText(receipt!.id, receipt!.content);
        expect(bcs).toBe(bcsMessages['verdict.record.srebrenicaGenocide']);
        expect(bcs).toContain('genocid');
        expect(bcs).toContain('snage bosanskih Srba');
    });

    it('the receipt names the perpetrators and the victims, cites the courts, and has no game jargon or dash', () => {
        const en = enMessages['verdict.record.srebrenicaGenocide'];
        expect(en).toContain('Bosnian Serb forces');
        expect(en).toContain('Bosniak men and boys');
        expect(en).toContain('IT-98-33-T');
        expect(en).toContain('International Court of Justice');
        expect(en).not.toMatch(/locked consequence|—/);
    });

    it('an unknown receipt id falls back to the builder text', () => {
        expect(ruptureReceiptText('rupture_receipt_unknown', 'builder text')).toBe('builder text');
    });

    it('VerdictScreen carries no hard-coded English for these strings', () => {
        const source = withoutComments(read('src/ui/map/components/VerdictScreen.tsx'));
        expect(source).not.toContain('Historical Record');
        expect(source).not.toContain('No verdict data for this faction.');
    });
});

describe('BCS corps names (S9)', () => {
    const corps = (JSON.parse(read('data/source/oob_corps.json')) as { corps: Array<{ id: string; name: string }> }).corps;

    it('every corps in the data has an i18n key whose English value is the data name', () => {
        for (const c of corps) {
            const key = `corps.name.${c.id}` as keyof typeof enMessages;
            expect(enMessages[key], c.id).toBe(c.name);
            expect(bcsMessages[key], c.id).toBeTruthy();
        }
    });

    it('EN shows the data name; BCS shows the historical BCS form, by id or by English name', () => {
        setLocale('en');
        expect(formatCorpsDisplayName('1st Corps', 'arbih_1st_corps')).toBe('1st Corps');
        setLocale('bcs');
        expect(formatCorpsDisplayName('1st Corps', 'arbih_1st_corps')).toBe('1. korpus');
        expect(formatCorpsDisplayName('Drina Corps', null)).toBe('Drinski korpus');
        expect(formatCorpsDisplayName(null, 'hvo_central_bosnia')).toBe('OZ Srednja Bosna');
        expect(formatCorpsDisplayName('Some brigade', 'some_brigade')).toBe('Some brigade');
    });
});

describe('Replay scrubber (R8)', () => {
    it('is built from the shared surface parts and has no hard-coded English', () => {
        const source = withoutComments(read('src/ui/map/components/replay/ReplayScrubber.tsx'));
        expect(source).toMatch(/from '\.\.\/surface\/Surface'/);
        expect(source).not.toMatch(/\btext-(?:xs|\[(?:[0-9]|1[0-2])(?:\.\d+)?px\])/);
        for (const literal of ['Scrub Your War', 'Inspect Map', 'no saved snapshots', "'n/a'", "'settlement'"]) {
            expect(source).not.toContain(literal);
        }
    });

    // SC6 (2026-11-13): the figures read the casualty ledger and the displacement
    // aggregates. The displaced figure counts the killed, so §4 requires the label
    // "Displaced or killed"; a plain "Displaced" label must not come back.
    it('labels the displaced figure as including the killed, in EN and BCS', () => {
        expect(enMessages['replay.casualties']).toBe('Military casualties');
        expect(bcsMessages['replay.casualties']).toBe('Vojni gubici');
        expect(enMessages['replay.displacedOrKilled']).toBe('Displaced or killed');
        expect(bcsMessages['replay.displacedOrKilled']).toBe('Raseljeni ili ubijeni');
        expect(enMessages).not.toHaveProperty('replay.displaced');
        expect(bcsMessages).not.toHaveProperty('replay.displaced');
    });

    const manifest = (totalCasualties: number | null, totalDisplacedOrKilled: number | null): ReplaySaveManifest => ({
        schema_version: 2,
        frame_count: 1,
        frames: [{
            turn: 40, date: '1993-01-03', activeFormations: 230,
            totalCasualties, totalDisplacedOrKilled,
            controlByFaction: [{ faction: 'RS', osids: 296 }],
        }],
    });

    function figure(container: HTMLElement, name: string): HTMLElement | null {
        return container.querySelector(`[data-awwv-replay-figure="${name}"]`);
    }

    it('renders both figures with locale number formatting', () => {
        const en = render(createElement(ReplayScrubber, { saveManifest: manifest(52645, 1377237) }));
        expect(figure(en.container, 'casualties')?.textContent).toBe('Military casualties52,645');
        expect(figure(en.container, 'displaced-or-killed')?.textContent).toBe('Displaced or killed1,377,237');
        cleanup();

        setLocale('bcs');
        const bcs = render(createElement(ReplayScrubber, { saveManifest: manifest(52645, 1377237) }));
        expect(figure(bcs.container, 'casualties')?.textContent).toBe('Vojni gubici52.645');
        expect(figure(bcs.container, 'displaced-or-killed')?.textContent).toBe('Raseljeni ili ubijeni1.377.237');
    });

    it('hides a figure the frame does not record instead of showing 0 (§4 false zero)', () => {
        const { container } = render(createElement(ReplayScrubber, { saveManifest: manifest(null, null) }));
        expect(figure(container, 'casualties')).toBeNull();
        expect(figure(container, 'displaced-or-killed')).toBeNull();
        expect(container.textContent).toContain('Active formations');
    });

    it('a v1 manifest (figures never recorded) shows neither figure', () => {
        const v1 = {
            schema_version: 1 as const,
            frame_count: 1,
            frames: [{ turn: 40, date: '1993-01-03', activeFormations: 230, totalCasualties: 0, totalDisplaced: 0, controlByFaction: [] }],
        };
        const { container } = render(createElement(ReplayScrubber, { saveManifest: v1 }));
        expect(figure(container, 'casualties')).toBeNull();
        expect(figure(container, 'displaced-or-killed')).toBeNull();
    });

    it('shows a true zero when the frame records one', () => {
        const { container } = render(createElement(ReplayScrubber, { saveManifest: manifest(0, 0) }));
        expect(figure(container, 'casualties')?.textContent).toBe('Military casualties0');
        expect(figure(container, 'displaced-or-killed')?.textContent).toBe('Displaced or killed0');
    });
});
