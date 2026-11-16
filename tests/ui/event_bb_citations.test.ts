/**
 * Citation audit, batch 3 (historian check, 2026-11-15): Balkan Battlegrounds references in the event and essay data.
 * The historian read the cited location of every one of the 109 groups (279 mentions) in the repo's two BB volumes:
 * 109 mentions cite the right printed page, 36 are right only at the extraction/PDF number (so the printed page shown was
 * wrong), 12 hold in part, 108 (39%) are about something else, 14 are accurate "does not exist" disclaimers. Of the 108, 80 cite
 * Vol. II "chapters": BB Vol. II has no chapters (three addenda and annexes 1-64), so every "Vol. II Ch. N" points at nothing.
 *
 * Rules.
 * - No Vol. II chapter reference stands in any event or essay string unless a correction marks it ("(the earlier ...").
 * - The extraction numbers and the wrong page ranges the historian found are never cited as a BB location unless a correction marks
 *   them; in player-visible text they are removed (source name only) or replaced by the verified printed page.
 * - Printed page rule (confirmed on the PDFs): Vol. I printed = PDF page - 37; Vol. II printed = PDF page - 19.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { hasDeveloperText } from '../../src/ui/shared/developerText';
import { withoutComments } from '../helpers/sourceComments';

const ROOT = 'data/scenarios';

type Entry = { id: string; where: string; text: string; visible: boolean };

function eventEntries(event: any): Entry[] {
    const out: Entry[] = [];
    const shown = resolveEventSourceLine(event, 'en');
    for (const key of ['source_note', 'historical_source', 'source']) {
        if (typeof event[key] === 'string') out.push({ id: event.id, where: key, text: event[key], visible: event[key] === shown });
    }
    (event.response_options ?? []).forEach((option: any, oi: number) => (option.future_consequences ?? []).forEach((fc: any, fi: number) => {
        if (typeof fc.explanation === 'string') out.push({ id: event.id, where: `ro${oi}.fc${fi}`, text: fc.explanation, visible: !hasDeveloperText(fc.explanation) });
    }));
    return out;
}

function read(path: string): any {
    return JSON.parse(withoutComments(readFileSync(path, 'utf8')));
}

const ENTRIES: Entry[] = [
    ...readdirSync(`${ROOT}/events`).filter((n) => n.endsWith('.json')).flatMap((n) => {
        const parsed = read(`${ROOT}/events/${n}`);
        return Array.isArray(parsed) ? (parsed as any[]).filter((e) => e && typeof e.id === 'string').flatMap(eventEntries) : [];
    }),
    ...readdirSync(`${ROOT}/essays`).filter((n) => n.endsWith('.json')).flatMap((n) => {
        const doc = read(`${ROOT}/essays/${n}`);
        const items: any[] = Array.isArray(doc.essays) ? doc.essays : [doc];
        return items.filter((it) => typeof it.content === 'string').map((it): Entry => ({ id: `essay:${it.event_id ?? it.id ?? n}`, where: 'content', text: it.content, visible: true }));
    }),
];

/** Spans of "(the earlier ...)" corrections, nested parentheses included: a citation inside one is the correction's own. */
function correctionSpans(text: string): Array<[number, number]> {
    const spans: Array<[number, number]> = [];
    const open = /\((?:the earlier|the range)/g;
    for (let m = open.exec(text); m; m = open.exec(text)) {
        let depth = 0;
        let end = text.length;
        for (let i = m.index; i < text.length; i += 1) {
            if (text[i] === '(') depth += 1;
            if (text[i] === ')') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
        }
        spans.push([m.index, end]);
        open.lastIndex = end;
    }
    return spans;
}

/** Matches of `re` in the entry that are neither inside a correction nor directly followed by one. */
function unmarked(entry: Entry, re: RegExp): string[] {
    const spans = correctionSpans(entry.text);
    const hits: string[] = [];
    for (const m of entry.text.matchAll(re)) {
        const at = m.index ?? 0;
        if (spans.some(([s, e]) => at >= s && at < e)) continue;
        if (/the earlier[^)]*$/.test(entry.text.slice(Math.max(0, at - 70), at))) continue; // quoted by a correction sentence
        if (/^ \((the earlier|the range)/.test(entry.text.slice(at + m[0].length, at + m[0].length + 30))) continue;
        hits.push(m[0]);
    }
    return hits;
}

const VOL_II_CHAPTER = /(?:Balkan Battlegrounds|BB)\s?(?:Vol\.?\s?II|II|2)[,]?\s?Chs?\.\s?\d+(?:\s?[-–]\s?\d+)?/g;

/** Extraction/PDF numbers cited as printed pages, and page ranges that hold something else (historian batch 3). */
const WRONG_LOCATIONS: Array<[string, RegExp]> = [
    ['Vol. I p. 63 (extraction number; printed 27)', /(?:BB1|Vol\.? I)[^;.)]{0,12}\bp\.\s?63\b/g],
    ['Vol. I p. 187 (extraction number; printed 151)', /Vol\.? I,?\s?p\.\s?187\b/g],
    ['Vol. I pp. 215/217-218 (extraction numbers; printed 179, 181-182)', /Vol\.? I,?\s?pp?\.\s?21[5-8]\b/g],
    ['Vol. I pp. 416-429 and 462 (extraction numbers; printed 379-392 and 425)', /(?:Vol\.? I|BB1|Battlegrounds I),?\s?pp?\.\s?(?:416|417|418|419|420|426|427|428|429|462)\b/g],
    ['Vol. II pp. 410-411, 448, 536-538 (extraction numbers)', /(?:Vol\.? II|BB2|Battlegrounds II),?\s?(?:printed )?pp?\.\s?(?:410-411|448\b|536-538)/g],
    ['Vol. II pp. 358-366, 312-321, 287-314, 406-417, 459-462, 471-475, 506-520, 28-31, 9-32 (wrong place or year)', /(?:Vol\.? II|BB2|Battlegrounds II|BB II),?\s?pp?\.\s?(?:358-366|312-321|287-314|406-417|459-462|471-475|506-520|28-31|9-32)\b/g],
    ['Vol. I pp. 198-229 (1993-94 chapters cited for the 1992 camps)', /Vol\.? I,?\s?pp?\.\s?198-229/g],
];

/** Reviewed-contract pin: these visible explanations still show Vol. II pp. 406-417 (1993 annexes, cited for Bihać 1994) until that event's next re-pin. May only shrink. */
const PINNED_KNOWN = ['rbih_state_identity:ro0.fc10', 'rbih_state_identity:ro1.fc9', 'rbih_state_identity:ro2.fc9'];
const notPinned = (line: string): boolean => !PINNED_KNOWN.some((k) => line.startsWith(k));

describe('Balkan Battlegrounds references in event and essay data', () => {
    it('is not vacuous: the corrections are recorded', () => {
        const marked = ENTRIES.filter((e) => /the earlier cite: BB Vol\. II has annexes and addenda, not chapters/.test(e.text));
        expect(marked.length).toBeGreaterThanOrEqual(30);
    });

    it('no Vol. II chapter reference stands uncorrected (BB Vol. II has addenda and annexes, not chapters)', () => {
        const live = ENTRIES.flatMap((e) => unmarked(e, VOL_II_CHAPTER).map((hit) => `${e.id}:${e.where} ${hit}`));
        expect(live).toEqual([]);
    });

    it.each(WRONG_LOCATIONS)('no uncorrected citation of %s', (_label, re) => {
        const live = ENTRIES.flatMap((e) => unmarked(e, re).map((hit) => `${e.id}:${e.where} ${hit}`)).filter(notPinned);
        expect(live).toEqual([]);
    });

    it('the pinned event is the only one that still shows a wrong BB location', () => {
        const still = ENTRIES.filter((e) => e.id === 'rbih_state_identity').flatMap((e) => WRONG_LOCATIONS.flatMap(([, re]) => unmarked(e, re).map(() => `${e.id}:${e.where}`)));
        expect([...new Set(still)].sort()).toEqual([...PINNED_KNOWN].sort());
    });

    it('player-visible text never shows a Vol. II chapter or a wrong BB location', () => {
        const visible = ENTRIES.filter((e) => e.visible);
        const bad = visible.flatMap((e) => [VOL_II_CHAPTER, ...WRONG_LOCATIONS.map(([, re]) => re)].flatMap((re) => [...e.text.matchAll(re)].map((m) => `${e.id}:${e.where} ${m[0]}`))).filter(notPinned);
        expect(bad).toEqual([]);
    });

    it('the printed pages and the BB Vol. I location that carry the claims are cited where the extraction numbers stood', () => {
        const all = ENTRIES.map((e) => e.text).join('\n');
        for (const printed of ['Balkan Battlegrounds Vol. I, p. 151', 'Balkan Battlegrounds Vol. I pp. 196-197']) expect(all, printed).toContain(printed);
        expect(all).toMatch(/Vol\. I p\.\s?425/);
    });
});
