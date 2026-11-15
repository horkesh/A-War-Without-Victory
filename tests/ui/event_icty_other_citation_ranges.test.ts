/**
 * Citation audit, batch 2 (historian check, 2026-11-15): every ICTY, ICJ and UN paragraph range in the
 * event data other than Karadžić (sweeps 1 and 2) and Prlić (batch 1): Mladić IT-09-92-T, the Milošević
 * IT-02-54 Rule 98bis Decision, Krajišnik, Kordić and Čerkez, Blaškić, Stakić, Brđanin, Tadić, Naletilić
 * and Martinović, the ICJ judgment and UN A/54/549, plus the remaining Karadžić ranges. The historian read
 * every text: of 181 mentions, 71 were already known wrong, 18 were not citations, and of the 92 checked
 * 9 held (10%), 35 held in part and 48 were about something else (52%). Examples: Mladić §§5169-5215 is
 * sentencing, not hostage-taking (that is Count 11, and the figure is 347, not 377); Krajišnik §§1006-1040
 * is 1992 and cannot carry a 1993-94 claim; Milošević IT-02-54-T has only a Rule 98bis Decision.
 *
 * Rule for HIDDEN text: every paragraph range says what the paragraphs really are ("the earlier cite ...")
 * or is one of the ranges the historian confirmed. Player-visible text is never annotated with audit notes
 * (tests/ui/player_visible_event_text_clean.test.ts) and shows no unverified range (range-strip, PR-B).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { hasDeveloperText } from '../../src/ui/shared/developerText';
import { withoutComments } from '../helpers/sourceComments';

const DIR = 'data/scenarios/events';

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

const ENTRIES: Entry[] = readdirSync(DIR).filter((name) => name.endsWith('.json')).flatMap((name) => {
    const parsed = JSON.parse(withoutComments(readFileSync(`${DIR}/${name}`, 'utf8')));
    return Array.isArray(parsed) ? (parsed as any[]).filter((item) => item && typeof item.id === 'string').flatMap(collect) : [];
});

/** "§§1006-1040" or "§§3447-3475, 3526-3530". A single "§3" is the repo's own section number, not a paragraph. */
const RANGE = /§§\s?\d+-\d+(?:, \d+(?:-\d+)?)*/g;

/** Ranges the historian confirmed (still cited as they were): Krstić §§16-28 (¶15 starts it) and Prlić Vol. 4 §§44-67. */
const CONFIRMED = [/Krsti[cć][^§]{0,60}§§16-28/, /Vol\. 4 §§44-67/];

/** Which case a range belongs to: the nearest case token before it. Only batch-2 cases are judged here. */
const CASES: Array<[RegExp, string]> = [
    [/A\/54\/549/g, 'un549'], [/IT-02-54|Milo[sš]evi[cć]/g, 'milosevic'], [/IT-09-92|Mladi[cć]/g, 'mladic'], [/IT-00-39|Krajišnik/g, 'krajisnik'],
    [/IT-95-14\/2|Kordi[cć]/g, 'kordic'], [/IT-95-14-T|Bla[sš]ki[cć]/g, 'blaskic'], [/IT-97-24|Staki[cć]/g, 'stakic'], [/IT-99-36|Br[dđ]anin/g, 'brdanin'],
    [/IT-94-1-T|IT-94-1\b|Tadi[cć]/g, 'tadic'], [/IT-98-34|Naletili[cć]/g, 'naletilic'], [/IT-98-33|Krsti[cć]/g, 'krstic'], [/\bICJ\b|Bosnia v\./g, 'icj'],
    [/IT-95-5\/18|Karad[zž]i[cć]/g, 'karadzic'], [/IT-04-74|Prli[cć]/g, 'prlic'],
];
const BATCH2 = new Set(['un549', 'milosevic', 'mladic', 'krajisnik', 'kordic', 'blaskic', 'stakic', 'brdanin', 'tadic', 'naletilic', 'icj']);
function caseBefore(before: string): string | null {
    const window = before.slice(-120);
    let best: { name: string; at: number } | null = null;
    for (const [re, name] of CASES) for (const m of window.matchAll(re)) { const at = m.index ?? 0; if (!best || at >= best.at) best = { name, at }; }
    return best ? best.name : null;
}

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

function unmarkedRanges(entry: Entry): string[] {
    const spans = correctionSpans(entry.text);
    const found: string[] = [];
    for (const match of entry.text.matchAll(RANGE)) {
        const at = match.index ?? 0;
        if (spans.some(([start, end]) => at >= start && at < end)) continue;
        const after = entry.text.slice(at + match[0].length, at + match[0].length + 45);
        const before = entry.text.slice(Math.max(0, at - 70), at);
        if (!BATCH2.has(caseBefore(entry.text.slice(Math.max(0, at - 120), at)) ?? '')) continue;
        const around = entry.text.slice(Math.max(0, at - 70), at + match[0].length);
        if (/^ \((the earlier|the range)/.test(after) || /corrected 2026-11-15 from|earlier "|the earlier cite/.test(before)) continue;
        if (CONFIRMED.some((re) => re.test(around))) continue;
        found.push(`${match[0]} after "${before.slice(-40)}"`);
    }
    return found;
}

describe('ICTY, ICJ and UN paragraph ranges outside Karadžić and Prlić in the event data', () => {
    it('is not vacuous: the corrections are recorded in the hidden data', () => {
        const corrected = ENTRIES.filter((entry) => !entry.visible && /the earlier cite/.test(entry.text) && /Mladi[cć]|Krajišnik|Kordi[cć]|Bla[sš]ki[cć]|Staki[cć]|Milo[sš]evi[cć]|Tadi[cć]|Naletili[cć]|A\/54\/549/.test(entry.text));
        expect(corrected.length).toBeGreaterThanOrEqual(25);
    });

    it('hidden text: every paragraph range says what the paragraphs really are, or is one the historian confirmed', () => {
        const live = ENTRIES.filter((entry) => !entry.visible).flatMap((entry) => unmarkedRanges(entry).map((range) => `${entry.id}:${entry.where} ${range}`));
        expect(live).toEqual([]);
    });

    it('the wrong claims the audit found are corrected where the old cites stood', () => {
        const hidden = ENTRIES.filter((entry) => !entry.visible).map((entry) => entry.text).join('\n');
        for (const fact of [
            'hostage-taking is Count 11, not Count 6',
            'both judgments give about 347 UN personnel held, not 377',
            'Milošević IT-02-54-T has no trial judgment',
            'the judgment ends at 30 December 1992',
            'rescission on 27 August 1995, not 11 August',
            'Markale II of 28 August 1995 is Mladić Vol. II ¶¶2120-2151',
        ]) expect(hidden, fact).toContain(fact);
    });

    it('player-visible text shows only paragraph ranges the historian verified', () => {
        // Verified and still shown: Tadić §§154-237 / §§154-202 (the camp findings sit inside them), Mladić §§4762-4778 (command-continuity
        // context), UN A/54/549 §§270-280 (the 9-10 July 1995 report context), Krstić §§16-28 (¶15 starts it).
        // Stakić §§88-168 stays only on the Keraterm line (the Keraterm findings, ¶¶160-166, sit inside it); the other camp and Prijedor lines lost it.
        const VERIFIED = [/Tadi[cć][^§]{0,40}§§154-(?:237|202)/, /Mladi[cć][^§]{0,60}§§4762-4778/, /A\/54\/549[^§]{0,20}§§270-280/, /Krsti[cć][^§]{0,60}§§16-28/, /Staki[cć][^§]{0,40}§§88-168/];
        const CASE_RANGE = /(?:Mladi[cć]|Krajišnik|Kordi[cć]|Bla[sš]ki[cć]|Staki[cć]|Milo[sš]evi[cć]|Br[dđ]anin|Tadi[cć]|Naletili[cć]|A\/54\/549|ICJ)[^§]{0,80}§§\s?\d+-\d+/g;
        // Known, may only shrink: three `rbih_state_identity` explanations still show UN A/54/549 §§57-98 (historian: partly; the paragraphs
        // that carry the claim are 59-65 and 69) and Krstić §§16-28 (19-25). That event is pinned by a reviewed-contract hash, so they are
        // corrected with its next re-pin together with the F3 option label, not by a data-only change.
        const KNOWN_IN_PINNED_EVENT = ['rbih_state_identity:ro0.fc5', 'rbih_state_identity:ro1.fc4', 'rbih_state_identity:ro2.fc4'];
        const shown = ENTRIES.filter((entry) => entry.visible
            && [...entry.text.matchAll(CASE_RANGE)].some((m) => !VERIFIED.some((re) => re.test(m[0]))))
            .map((entry) => `${entry.id}:${entry.where}`);
        expect(shown.sort()).toEqual([...KNOWN_IN_PINNED_EVENT].sort());
    });
});
