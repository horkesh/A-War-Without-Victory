/**
 * Citation audit, batch 1 (historian check, 2026-11-15): the ICTY Prlić et al. (IT-04-74) paragraph
 * ranges in the event data. The historian read all six trial volumes and the appeals judgment: of 41
 * range groups (164 mentions) 2 held, 9 held in part and 28 were about something else (68% of the
 * mentions); the same few ranges were reused across unrelated claims (Vol. 3 §§120-200 is the Dretelj
 * and Gabela prisons, Vol. 3 §§412-498 is Vareš, Vol. 1 §§591-640 is SIS and Finance, "Vol. 3 §§1700-2050"
 * does not exist because Vol. 3 ends at §1741). The supported range is Vol. 4 §§44-67 (the JCE's common
 * criminal purpose).
 *
 * Two surfaces, two rules (same as tests/ui/event_karadzic_citation_ranges.test.ts).
 * - HIDDEN text: every Prlić range says what the paragraphs really are ("the earlier cite ...").
 * - PLAYER-VISIBLE text: never annotated with audit notes; the strings that still carry an unchecked
 *   range are a known list that may only shrink (they need the historian, narrative and §6 seats).
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

/** Prlić trial volume ("Vol. 3 §§412-498") or appeals ("Appeals Judgment (29 Nov 2017) §§601-650") ranges. */
const PRLIC_RANGE = /(?:Vol\. ?(?:[1-4]|IV|III|II|I)|Appeals(?: Judgment)?(?: \(29 Nov(?:ember)? 2017\))?) ?§§(\d+)-(\d+)/g;
const SUPPORTED = new Set(['44-67']); // Vol. 4: the JCE's common criminal purpose
const PRLIC_CONTEXT = /IT-04-74|Prli[cć]/;
/** Reviewed-contract pin (src/sim/events/opening_policy_transition.ts): its hidden notes are fixed with the re-pin. */
const PINNED_BY_REVIEWED_CONTRACT: ReadonlyArray<string> = ['rbih_state_identity'];

/** [start, end) spans of every "(the earlier cite ...)" or "(the range ...)" correction, nested parentheses included. */
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
    const found: string[] = [];
    const spans = correctionSpans(entry.text);
    for (const match of entry.text.matchAll(PRLIC_RANGE)) {
        if (SUPPORTED.has(`${match[1]}-${match[2]}`)) continue;
        const at = match.index ?? 0;
        if (spans.some(([start, end]) => at >= start && at < end)) continue; // the correction's own citations
        const after = entry.text.slice(at + match[0].length, at + match[0].length + 45);
        const before = entry.text.slice(Math.max(0, at - 60), at);
        if (/^ \((the earlier|the range)/.test(after) || /corrected 2026-11-15 from|earlier "/.test(before)) continue;
        found.push(match[0]);
    }
    return found;
}

const mentions = (entry: Entry): boolean => PRLIC_CONTEXT.test(entry.text) && [...entry.text.matchAll(PRLIC_RANGE)].some((m) => !SUPPORTED.has(`${m[1]}-${m[2]}`));

/** Player-visible strings that still carry an unchecked Prlić range. Fix them with the seats, then remove the entry. */
const KNOWN_VISIBLE_TO_FIX: ReadonlyArray<string> = [
    'hrhb_camp_exposure_response_1993:historical_source', 'hrhb_central_bosnia_defense_1993:historical_source',
    'hrhb_contact_group_response_1994:historical_source', 'hrhb_federation_army_integration_1994:historical_source',
    'hrhb_federation_overture_1993:historical_source', 'hrhb_herceg_bosna_consolidation_1992:historical_source',
    'hrhb_owen_stoltenberg_response_1993:historical_source', 'hrhb_territorial_scope_1993:historical_source',
    'hrhb_vance_owen_acceptance_1993:historical_source', 'hrhb_washington_agreement_1994:historical_source',
    'hv_hvo_cooperation_1995:historical_source', 'rbih_federation_army_integration_1994:historical_source',
    'rbih_washington_agreement_1994:historical_source', 'zagreb_orders_hrhb_ceasefire:source_note',
    'zagreb_restrains_boban_vopp:historical_source',
    'hrhb_political_goal:ro0.fc2', 'hrhb_political_goal:ro0.fc3', 'hrhb_political_goal:ro0.fc4', 'hrhb_political_goal:ro0.fc6',
    'hrhb_political_goal:ro0.fc9', 'hrhb_political_goal:ro0.fc10', 'hrhb_political_goal:ro0.fc11', 'hrhb_political_goal:ro0.fc12',
    'hrhb_political_goal:ro0.fc13',
    'hrhb_political_goal:ro1.fc1', 'hrhb_political_goal:ro1.fc2', 'hrhb_political_goal:ro1.fc8', 'hrhb_political_goal:ro1.fc9',
    'hrhb_political_goal:ro1.fc10', 'hrhb_political_goal:ro1.fc11', 'hrhb_political_goal:ro1.fc12',
    'hrhb_political_goal:ro2.fc1', 'hrhb_political_goal:ro2.fc2', 'hrhb_political_goal:ro2.fc3', 'hrhb_political_goal:ro2.fc5',
    'hrhb_political_goal:ro2.fc8', 'hrhb_political_goal:ro2.fc9', 'hrhb_political_goal:ro2.fc10', 'hrhb_political_goal:ro2.fc11',
    'hrhb_political_goal:ro2.fc12',
];

describe('Prlić et al. paragraph ranges in the event data', () => {
    it('is not vacuous: the corrections are recorded in the hidden data', () => {
        const corrected = ENTRIES.filter((entry) => !entry.visible && /the earlier cite/.test(entry.text) && PRLIC_RANGE.test(entry.text));
        PRLIC_RANGE.lastIndex = 0;
        expect(corrected.length).toBeGreaterThanOrEqual(25);
    });

    it('hidden text: every Prlić range says what the paragraphs really are', () => {
        const live: string[] = [];
        for (const entry of ENTRIES.filter((row) => !row.visible && PRLIC_CONTEXT.test(row.text) && !PINNED_BY_REVIEWED_CONTRACT.includes(row.id))) {
            for (const range of unmarkedRanges(entry)) live.push(`${entry.id}:${entry.where} ${range}`);
        }
        expect(live).toEqual([]);
    });

    it('the pinned event is the only one left with an uncorrected hidden Prlić range', () => {
        const source = withoutComments(readFileSync('src/sim/events/opening_policy_transition.ts', 'utf8'));
        expect(source).toContain("const IDENTITY = 'rbih_state_identity'");
        const pinned = ENTRIES.filter((entry) => !entry.visible && PINNED_BY_REVIEWED_CONTRACT.includes(entry.id) && PRLIC_CONTEXT.test(entry.text));
        expect(pinned.length).toBeGreaterThan(0);
    });

    it('the Appeals Chamber is not said to have reversed the Tudjman, Šušak and Bobetko finding', () => {
        const all = ENTRIES.map((entry) => entry.text).join('\n');
        expect(all).not.toMatch(/Appeals Chamber REVERSED/);
        expect(all).not.toContain("made no explicit findings concerning their participation in the JCE' (docs/50_research");
        const note = ENTRIES.find((entry) => entry.id === 'hrhb_herceg_bosna_consolidation_1992' && entry.where === 'source_note')!;
        expect(note.text).toContain('did not reverse');
        expect(note.text).toContain('Appeals §§1521, 1751-1752, 1910-1911');
    });

    it('player-visible text is never annotated with audit notes', () => {
        const AUDIT_NOTE = /historian check|paragraph not verified|the earlier cite|earlier text of this field|does not exist/;
        const leaked = ENTRIES.filter((entry) => entry.visible && AUDIT_NOTE.test(entry.text)).map((entry) => `${entry.id}:${entry.where}`);
        expect(leaked).toEqual([]);
    });

    it('the player-visible strings that still carry an unchecked Prlić range are exactly the known list (it may only shrink)', () => {
        const visible = ENTRIES.filter((entry) => entry.visible && mentions(entry)).map((entry) => `${entry.id}:${entry.where}`);
        expect(visible.sort()).toEqual([...KNOWN_VISIBLE_TO_FIX].sort());
    });
});
