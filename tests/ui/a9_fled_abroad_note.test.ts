/**
 * A9 (SD10): the "Fled abroad when displaced" totals carry a note that says onward migration is not
 * counted. Copy ruled unanimously by the §4 sitting (historian + narrative-designer, 2026-11-24).
 * The note sits under the War Summary civilian figures and above the Ledger by-people table, and wraps.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';

const EN =
    'Counts people who left the country at the moment they were displaced. People who first reached a place of refuge and moved abroad later are not counted, so this understates how many left.';
const BCS =
    'Broje se ljudi koji su napustili zemlju u trenutku raseljavanja. Ljudi koji su prvo stigli na sigurno, a kasnije otišli u inostranstvo, nisu uračunati, pa ova brojka potcjenjuje koliko ih je otišlo.';

const KEYS = ['warSummary.note.fledAbroad', 'humanitarianLedger.note.fledAbroad'] as const;

function source(...parts: string[]): string {
    return readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'components', ...parts), 'utf8');
}

function lineWith(src: string, needle: string): string {
    const line = src.split('\n').find((l) => l.includes(needle));
    expect(line, needle).toBeDefined();
    return line as string;
}

describe('A9 fled-abroad note', () => {
    it('carries the ruled EN and BCS text under both keys', () => {
        for (const key of KEYS) {
            expect(enMessages[key]).toBe(EN);
            expect(bcsMessages[key]).toBe(BCS);
        }
    });

    it('renders under the War Summary civilian figures, and the figure row wraps', () => {
        const src = source('army_hq', 'WarSummaryContent.tsx');
        const note = lineWith(src, "t('warSummary.note.fledAbroad')");
        expect(note).toContain('data-testid="war-summary-fled-abroad-note"');
        expect(src.indexOf("t('warSummary.label.fledAbroad')")).toBeLessThan(src.indexOf("t('warSummary.note.fledAbroad')"));
        const row = lineWith(src, 'gap-x-6 gap-y-1 text-[13px]');
        expect(row).toContain('flex-wrap');
        for (const line of [note, row]) {
            expect(line).not.toMatch(/nowrap|truncate/);
        }
    });

    it('renders above the Ledger by-people table, and the column header does not refuse to wrap', () => {
        const src = source('HumanitarianLedgerPanel.tsx');
        const note = lineWith(src, "t('humanitarianLedger.note.fledAbroad')");
        expect(note).toContain('data-testid="humanitarian-ledger-fled-abroad-note"');
        const section = src.indexOf("t('humanitarianLedger.section.byPeople')");
        const noteAt = src.indexOf("t('humanitarianLedger.note.fledAbroad')");
        const header = src.indexOf("t('humanitarianLedger.col.fledAbroad')");
        expect(section).toBeLessThan(noteAt);
        expect(noteAt).toBeLessThan(header);
        expect(note).not.toMatch(/nowrap|truncate/);
        expect(lineWith(src, "const TH = '")).not.toMatch(/nowrap|truncate/);
    });
});
