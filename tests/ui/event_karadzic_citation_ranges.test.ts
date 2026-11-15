/**
 * Citation sweep (historian check, 2026-11-15). Hidden event notes cited Karadžić IT-95-5/18-T
 * §§4940-4982, §§4985-5020, §§4985-5067, §§5020-5067 and §§5025-5040 for the Deliberate Force
 * compliance decision, the Holbrooke-Belgrade channel, the Patriarch Paper and a "ratification".
 * Those paragraphs are the Srebrenica 1993 convoys and the fall of Srebrenica in July 1995: they
 * mention neither Holbrooke nor the Patriarch Paper. The passages that do exist are paras 422-437
 * (the US initiative, the 29 August 1995 Dobanovci agreement, the Dayton talks, the leadership's
 * acceptance statement), 3614, 4297-4301, 4338-4340 and 4884.
 *
 * This pins that no event text cites those ranges as live support any more: every remaining
 * mention records the correction, and every Mladić or Milošević range the historian could not
 * check is marked "paragraph not verified".
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { withoutComments } from '../helpers/sourceComments';

const FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1992_hrhb_summer.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
];

type Row = { id: string; strings: string[] };

function collectStrings(value: unknown, out: string[]): void {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
    else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, out));
}

const ROWS: Row[] = FILES.flatMap((file) => {
    const events = JSON.parse(withoutComments(readFileSync(file, 'utf8'))) as Array<{ id: string }>;
    return events.map((event) => {
        const strings: string[] = [];
        collectStrings(event, strings);
        return { id: event.id, strings };
    });
});

const WRONG_KARADZIC_RANGES = /§§?(4940-4982|4985-5020|4985-5067|5020-5067|5025-5040)/g;
const CORRECTION_MARKER = /(earlier cite|earlier text of this field cited|corrected 2026-11-15 from|earlier "|the earlier)/;
const UNCHECKED_RANGES = /(Mladić IT-09-92-T §§(4631-4685|4750-4795)|Milošević IT-02-54-T §§(245-298|290-340))/g;

describe('hidden event notes no longer cite the Srebrenica paragraphs as support', () => {
    it('is not vacuous: the corrections are recorded in the data', () => {
        const mentions = ROWS.flatMap((row) => row.strings).filter((text) => WRONG_KARADZIC_RANGES.test(text));
        WRONG_KARADZIC_RANGES.lastIndex = 0;
        expect(mentions.length).toBeGreaterThan(10);
    });

    it('every mention of a swept Karadžić range says it is the earlier, wrong cite', () => {
        const live: string[] = [];
        for (const row of ROWS) {
            for (const text of row.strings) {
                for (const match of text.matchAll(WRONG_KARADZIC_RANGES)) {
                    const before = text.slice(Math.max(0, (match.index ?? 0) - 90), match.index ?? 0);
                    if (!CORRECTION_MARKER.test(before)) live.push(`${row.id}: ${match[0]}`);
                }
            }
        }
        expect(live).toEqual([]);
    });

    it('every Mladić and Milošević range the historian could not check is marked "paragraph not verified"', () => {
        const unmarked: string[] = [];
        for (const row of ROWS) {
            for (const text of row.strings) {
                for (const match of text.matchAll(UNCHECKED_RANGES)) {
                    const at = match.index ?? 0;
                    const around = text.slice(Math.max(0, at - 160), at + match[0].length + 200);
                    if (!/not verified/.test(around)) unmarked.push(`${row.id}: ${match[0]}`);
                }
            }
        }
        expect(unmarked).toEqual([]);
    });

    it('the paragraphs that do support the claims are cited where the old ranges stood', () => {
        const all = ROWS.flatMap((row) => row.strings).join('\n');
        expect(all).toContain('paras 424 and 431');
        expect(all).toContain('paras 435-436');
        expect(all).toContain('paras 423, 425-428, 3614, 4297-4301, 4338-4340, 4884');
        // BB Vol. II has no 1995 chapters; the Holbrooke-channel note now points at Vol. I ch. 94.
        const holbrooke = ROWS.find((row) => row.id === 'holbrooke_us_belgrade_channel_1995')!.strings.join('\n');
        expect(holbrooke).toContain('BB Vol. I ch. 94, p. 391');
    });
});
