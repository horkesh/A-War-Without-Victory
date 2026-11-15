/**
 * Citation sweep (historian check, 2026-11-15). Event notes cited Karadžić IT-95-5/18-T
 * §§4940-4982, §§4985-5020, §§4985-5067, §§5020-5067 and §§5025-5040 for the Deliberate Force
 * compliance decision, the Holbrooke-Belgrade channel, the Patriarch Paper and a "ratification".
 * Those paragraphs are the Srebrenica 1993 convoys and the fall of Srebrenica in July 1995: they
 * mention neither Holbrooke nor the Patriarch Paper. The passages that do exist are paras 422-437
 * (the US initiative, the 29 August 1995 Dobanovci agreement, the Dayton talks, the leadership's
 * acceptance statement), 3614, 4297-4301, 4338-4340 and 4884.
 *
 * Two surfaces, two rules.
 * - HIDDEN text (provenance fields and consequence explanations the developer-text filter removes):
 *   no mention of a swept range may stand as live support; every one records the correction, and
 *   every Mladić or Milošević range the historian could not check says "paragraph not verified".
 * - PLAYER-VISIBLE text (an explanation that passes the filter, or the field that is an event's
 *   source line) is never annotated with audit notes: it needs the historian and narrative seats,
 *   so it is fixed in its own change. Those strings are listed below and the list may only shrink.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { hasDeveloperText } from '../../src/ui/shared/developerText';
import { withoutComments } from '../helpers/sourceComments';

const FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1992_hrhb_summer.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
];

type Entry = { id: string; where: string; text: string; visible: boolean };

function collect(event: any): Entry[] {
    const entries: Entry[] = [];
    const shownLine = resolveEventSourceLine(event, 'en');
    for (const key of ['source_note', 'historical_source', 'source']) {
        if (typeof event[key] === 'string') entries.push({ id: event.id, where: key, text: event[key], visible: event[key] === shownLine });
    }
    (event.response_options ?? []).forEach((option: any, oi: number) => {
        (option.future_consequences ?? []).forEach((fc: any, fi: number) => {
            if (typeof fc.explanation === 'string') {
                entries.push({ id: event.id, where: `ro${oi}.fc${fi}`, text: fc.explanation, visible: !hasDeveloperText(fc.explanation) });
            }
        });
    });
    return entries;
}

const ENTRIES: Entry[] = FILES.flatMap((file) =>
    (JSON.parse(withoutComments(readFileSync(file, 'utf8'))) as any[]).flatMap(collect));

const WRONG_KARADZIC_RANGES = /§§?(4940-4982|4985-5020|4985-5067|5020-5067|5025-5040)/g;
const CORRECTION_MARKER = /(earlier cite|earlier text of this field cited|corrected 2026-11-15 from|earlier "|the earlier)/;
const UNCHECKED_RANGES = /(Mladić IT-09-92-T §§(4631-4685|4750-4795)|Milošević IT-02-54-T §§(245-298|290-340))/g;

/**
 * Player-visible strings that still cite a swept range or an unchecked Mladić or Milošević range.
 * They need the historian and narrative seats (the claims beside some of them are contradicted by
 * the judgment), so they are not touched here. Remove an entry when its string is fixed.
 */
const KNOWN_VISIBLE_TO_FIX: ReadonlyArray<string> = [];

const mentions = (text: string): boolean => {
    WRONG_KARADZIC_RANGES.lastIndex = 0;
    UNCHECKED_RANGES.lastIndex = 0;
    return WRONG_KARADZIC_RANGES.test(text) || UNCHECKED_RANGES.test(text);
};

describe('event notes no longer cite the Srebrenica paragraphs as support', () => {
    it('is not vacuous: the corrections are recorded in the hidden data', () => {
        const hidden = ENTRIES.filter((entry) => !entry.visible && mentions(entry.text));
        expect(hidden.length).toBeGreaterThanOrEqual(5);
    });

    it('hidden text: every mention of a swept Karadžić range says it is the earlier, wrong cite', () => {
        const live: string[] = [];
        for (const entry of ENTRIES.filter((row) => !row.visible)) {
            for (const match of entry.text.matchAll(WRONG_KARADZIC_RANGES)) {
                const before = entry.text.slice(Math.max(0, (match.index ?? 0) - 90), match.index ?? 0);
                if (!CORRECTION_MARKER.test(before)) live.push(`${entry.id}:${entry.where} ${match[0]}`);
            }
        }
        expect(live).toEqual([]);
    });

    it('hidden text: every Mladić and Milošević range the historian could not check is marked "paragraph not verified"', () => {
        const unmarked: string[] = [];
        for (const entry of ENTRIES.filter((row) => !row.visible)) {
            for (const match of entry.text.matchAll(UNCHECKED_RANGES)) {
                const at = match.index ?? 0;
                const around = entry.text.slice(Math.max(0, at - 160), at + match[0].length + 200);
                if (!/not verified/.test(around)) unmarked.push(`${entry.id}:${entry.where} ${match[0]}`);
            }
        }
        expect(unmarked).toEqual([]);
    });

    it('player-visible text is never annotated with audit notes', () => {
        const AUDIT_NOTE = /historian check|paragraph not verified|corrected 2026-11-15|earlier cite|earlier text of this field|design inference/;
        const leaked = ENTRIES.filter((entry) => entry.visible && AUDIT_NOTE.test(entry.text)).map((entry) => `${entry.id}:${entry.where}`);
        expect(leaked).toEqual([]);
    });

    it('the player-visible strings still citing a swept or unchecked range are exactly the known list (it may only shrink)', () => {
        const visible = ENTRIES.filter((entry) => entry.visible && mentions(entry.text)).map((entry) => `${entry.id}:${entry.where}`);
        expect(visible.sort()).toEqual([...KNOWN_VISIBLE_TO_FIX].sort());
    });

    it('the paragraphs that do support the claims are cited where the old ranges stood', () => {
        const hidden = ENTRIES.filter((entry) => !entry.visible).map((entry) => entry.text).join('\n');
        expect(hidden).toContain('paras 424 and 431');
        expect(hidden).toContain('paras 423, 425-428, 3614, 4297-4301, 4338-4340, 4884');
        const holbrooke = ENTRIES.find((entry) => entry.id === 'holbrooke_us_belgrade_channel_1995' && entry.where === 'historical_source')!;
        expect(holbrooke.text).toContain('BB Vol. I ch. 94, p. 391');
    });
});
