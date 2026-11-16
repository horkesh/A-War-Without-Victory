/**
 * Permanent guard (citation audit, 2026-11-15): no audit, review or developer vocabulary may reach a
 * player-visible event string. Three sweeps found audit annotations that would have been shown to
 * players ("historian check ... paragraph not verified"), and two older leaks were already live on
 * main (a "2026-05-17 Historian audit H4" source line and a sign-off line in a counterfactual note).
 *
 * "Player-visible" here means what the app can put on screen: the event's own title, narrative,
 * situation, staff assessment, trigger evidence, option labels and descriptions, notifications, the
 * same fields in every localization, the one source line `resolveEventSourceLine` picks (en and bcs),
 * and every consequence explanation that passes the developer-text filter (it is shown as the
 * predicted explanation). Hidden provenance fields (`source_note`, `historical_source`, `source` when
 * not the picked line, explanations the filter removes) are allowed to carry audit notes.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { hasDeveloperText } from '../../src/ui/shared/developerText';
import { withoutComments } from '../helpers/sourceComments';

const DIR = 'data/scenarios/events';

/** Words that belong to an audit, a review or a work lane, never to a player. */
const AUDIT_VOCABULARY = new RegExp([
    'historian check', 'historian audit', 'historian sign-off', '\\bhistorians? (?:had|have) ', 'sign-off',
    'paragraph not verified', 'not verified for this claim', 'corrected 2026-', 'the earlier cite', 'earlier text of this field',
    'design inference', 'LANE-[A-Z]', '/narrative-designer', '/historian', 'Divergence Ring', '\\b20\\d\\d-\\d\\d-\\d\\d\\b',
    'UNVERIFIED', 'no local copy', '\\bH\\d+ audit\\b', 'the H\\d+ audit',
].join('|'), 'i');

type Surface = { id: string; where: string; text: string };

function strings(value: unknown, path: string, skip: ReadonlySet<string>): Array<{ path: string; text: string }> {
    if (typeof value === 'string') return [{ path, text: value }];
    if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`, skip));
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !skip.has(key))
            .flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key, skip));
    }
    return [];
}

const LOCALIZED_PROVENANCE = new Set(['source_tier', 'source_note', 'historical_source', 'source']);
const NONE = new Set<string>();

function visibleSurfaces(event: any): Surface[] {
    const out: Surface[] = [];
    const add = (where: string, list: Array<{ path: string; text: string }>) => list.forEach((s) => out.push({ id: event.id, where: `${where}${s.path ? `:${s.path}` : ''}`, text: s.text }));
    for (const key of ['title', 'narrative', 'situation', 'staff_assessment', 'trigger_evidence']) add(key, strings(event[key], '', NONE));
    (event.response_options ?? []).forEach((option: any, oi: number) => {
        add(`option${oi}.label`, strings(option.label, '', NONE));
        add(`option${oi}.description`, strings(option.description, '', NONE));
        (option.future_consequences ?? []).forEach((fc: any, fi: number) => {
            if (typeof fc.explanation === 'string' && !hasDeveloperText(fc.explanation)) out.push({ id: event.id, where: `option${oi}.explanation${fi}`, text: fc.explanation });
        });
    });
    add('notifications', strings(event.notifications_to_other_factions, '', NONE));
    for (const [locale, block] of Object.entries(event.localizations ?? {})) add(`localizations.${locale}`, strings(block, '', LOCALIZED_PROVENANCE));
    for (const locale of ['en', 'bcs'] as const) {
        const line = resolveEventSourceLine(event, locale);
        if (line) out.push({ id: event.id, where: `source_line.${locale}`, text: line });
    }
    return out;
}

const FILES = readdirSync(DIR).filter((name) => name.endsWith('.json'));
const EVENTS: any[] = FILES.flatMap((name) => {
    const parsed = JSON.parse(withoutComments(readFileSync(`${DIR}/${name}`, 'utf8')));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
});

describe('player-visible event text carries no audit or developer vocabulary', () => {
    it('scans a meaningful number of events and surfaces', () => {
        expect(EVENTS.length).toBeGreaterThan(200);
        expect(EVENTS.flatMap(visibleSurfaces).length).toBeGreaterThan(2000);
    });

    /**
     * Visible source lines of HVO events that still say "UNVERIFIED, no local copy" next to a Prlić paragraph range.
     * They are sensitive-history ground (historian, narrative and §6 seats, in the Prlić visible-strings change),
     * so they are listed rather than edited here. Remove an entry when its string is fixed; the list may only shrink.
     */
    const KNOWN_LEAKS_TO_FIX: ReadonlyArray<string> = [];

    it('no visible surface contains audit, sign-off or lane vocabulary, except the known list that may only shrink', () => {
        const leaks = EVENTS.flatMap(visibleSurfaces)
            .filter((surface) => AUDIT_VOCABULARY.test(surface.text))
            .map((surface) => `${surface.id}:${surface.where}`);
        expect(leaks.sort()).toEqual([...KNOWN_LEAKS_TO_FIX].sort());
    });

    it('the vocabulary check would catch the leaks it was written for', () => {
        for (const sample of [
            'BB1 p.167; 2026-05-17 Historian audit H4.',
            'the date the historians had circled',
            'Divergence Ring 1 (LANE-NIGHTSHIFT-ROUND2-DIVERGENCE-EVENT-SEEDS). /narrative-designer + /historian sign-off.',
            'Karadžić IT-95-5/18-T para. 3589 (the earlier cite §§3526-3530 opens the Sarajevo section)',
            'paragraph not verified',
        ]) expect(AUDIT_VOCABULARY.test(sample), sample).toBe(true);
        for (const sample of ['Balkan Battlegrounds, Vol. I, pp. 131 and 142 (UN arms embargo).', 'On 21 November 1995 the agreement was initialled at Wright-Patterson.']) {
            expect(AUDIT_VOCABULARY.test(sample), sample).toBe(false);
        }
    });
});
