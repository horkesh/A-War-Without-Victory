/**
 * The Patriarch Paper was agreed at Dobanovci on 29 August 1995 (ICTY Karadžić IT-95-5/18-T
 * para. 424; Balkan Battlegrounds Vol. I p. 391). The event copy, the Codex essay and the
 * event text elsewhere said 30 August. NATO's Deliberate Force began on 30 August, which is
 * where the wrong date probably came from; that date stays correct for the air campaign.
 *
 * The name "Patriarch Paper" stays in the event narrative as the game's label. Neither the ICTY
 * judgment nor Balkan Battlegrounds uses it, so the visible source note, which cites them, does not
 * attribute the name to them. Holbrooke is named as further reading only; the historian seat could
 * not retrieve his text, so no date or chapter is attributed to him in the visible note.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { withoutComments } from '../helpers/sourceComments';

import type { EventDefinition } from '../../src/sim/events/event_types';
import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';

const EVENT_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1992_hrhb_summer.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
];

const EVENTS: EventDefinition[] = EVENT_FILES.flatMap(
    (file) => JSON.parse(readFileSync(file, 'utf8')) as EventDefinition[],
);

const WRONG_DATE_NEXT_TO_THE_PAPER = /Patriarch Paper[^.]{0,120}30 August|30 August[^.]{0,60}Patriarch Paper|granted[^.]{0,80}on 30 August 1995/i;

describe('the Patriarch Paper is dated 29 August 1995', () => {
    const acceptance = EVENTS.find((def) => def.id === 'rs_dayton_acceptance_1995')!;

    it('the Dayton acceptance event narrative gives 29 August', () => {
        expect(acceptance.narrative).toContain('granted by the Pale leadership on 29 August 1995');
        expect(acceptance.narrative).not.toContain('30 August');
    });

    it('no event text pairs the Patriarch Paper with 30 August', () => {
        // The hidden provenance records its own correction ("corrected 2026-11-15 from 30 August").
        const offenders = EVENTS
            .filter((def) => WRONG_DATE_NEXT_TO_THE_PAPER.test(
                JSON.stringify(def).replace(/corrected 2026-11-15 from 30 August/g, ''),
            ))
            .map((def) => def.id);
        expect(offenders).toEqual([]);
    });

    it('the Codex essay and its index entry give 29 August', () => {
        const essay = JSON.parse(
            withoutComments(readFileSync('data/scenarios/essays/rs_dayton_acceptance_1995.json', 'utf8')),
        ) as { content: string };
        expect(essay.content).toContain('granted on 29 August 1995');
        expect(essay.content).not.toContain('granted on 30 August');
        const index = withoutComments(readFileSync('data/scenarios/essays/essay_index.json', 'utf8'));
        expect(index).toContain('the Pale leadership had granted on 29 August 1995');
        expect(index).not.toContain('the Pale leadership had granted on 30 August 1995');
        // Deliberate Force did begin on 30 August; that line is untouched.
        expect(index).toContain('On 30 August 1995, NATO launched Operation Deliberate');
    });

    it('the visible source note cites the judgment paragraph, the date and the place, in EN and BCS', () => {
        const en = resolveEventSourceLine(acceptance, 'en') ?? '';
        const bcs = resolveEventSourceLine(acceptance, 'bcs') ?? '';
        expect(en).toMatch(/Karadžić \(IT-95-5\/18-T\).*para\. 424.*Dobanovci.*29 August 1995/);
        expect(bcs).toMatch(/Karadžić \(IT-95-5\/18-T\).*par\. 424.*Dobanovcima.*29\. augusta 1995/);
        expect(bcs).toContain('24. marta 2016.');
        expect(en).toContain('Balkan Battlegrounds, Vol. I, p. 391');
    });

    it('the visible note does not attribute the name "Patriarch Paper" to the judgment or Balkan Battlegrounds', () => {
        // Historian check 2026-11-15: neither source uses the name (it is attested in Holbrooke, which
        // could not be retrieved), so the note that cites them leaves it out; the narrative keeps it.
        for (const locale of ['en', 'bcs'] as const) {
            expect(resolveEventSourceLine(acceptance, locale) ?? '', locale).not.toMatch(/Patriarch|Patrijarh/i);
        }
    });

    it('Holbrooke is further reading only: no date or chapter is attributed to him', () => {
        for (const locale of ['en', 'bcs'] as const) {
            const line = resolveEventSourceLine(acceptance, locale) ?? '';
            expect(line, locale).toMatch(/Holbrooke, To End a War \(1998\)/);
            expect(line, locale).not.toMatch(/Holbrooke[^.]*(ch\.|chapter|pogl)/i);
            expect(line, locale).not.toMatch(/30 August|30\. august/i);
        }
    });

    it('the hidden provenance no longer cites the Srebrenica paragraphs for the Dayton passages', () => {
        const note = acceptance.source_note ?? '';
        expect(note).toContain('paras 431-437');
        expect(note).toContain('29 August 1995');
        expect(note).not.toMatch(/Karadžić IT-95-5\/18-T §§5020-5067\)\./);
    });
});
