import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { EventDefinition } from '../../src/sim/events/event_types';
import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { withoutComments } from '../helpers/sourceComments';

/**
 * rs_dayton_acceptance_1995 used to read "Pale Ratifies the Patriarch Paper" with options to ratify
 * or repudiate "the delegation" and declare independence. The historian seat found that the Patriarch
 * Paper (29 August 1995) only delegated negotiating authority; what the Bosnian Serb leadership
 * accepted in late November 1995 was the Dayton Agreement (Karadžić IT-95-5/18-T paras 435-436);
 * and the judgment records no Assembly vote, no independence declaration and no delegation
 * initialling (Milošević, Tuđman and Izetbegović initialled). Only wording changed: ids, flags, option
 * effects and the bot default are pinned here so they cannot drift with the copy.
 */

const events = JSON.parse(withoutComments(readFileSync('data/scenarios/events/war_1995.json', 'utf8'))) as EventDefinition[];
const event = events.find((def) => def.id === 'rs_dayton_acceptance_1995')!;
// What a player can read: the hidden provenance (`source_note`, `historical_source`) is left out,
// because it records the old wording on purpose when it explains what the judgment does not support.
const { source_note: _sourceNote, historical_source: _historicalSource, localizations: _localizations, ...playerFacing } = event as EventDefinition & {
    localizations?: unknown;
};
const everything = JSON.stringify(playerFacing);

describe('rs_dayton_acceptance_1995 says what happened', () => {
    it('is retitled and the options and headlines match', () => {
        expect(event.title).toBe('Pale Accepts the Dayton Agreement');
        const labels = (event.response_options ?? []).map((option) => option.label);
        expect(labels).toEqual(['Accept the Dayton Agreement', 'Reject the Dayton Agreement']);
        const headlines = Object.values(event.notifications_to_other_factions ?? {}).flatMap((byFaction) =>
            Object.values(byFaction as Record<string, { headline: string }>).map((entry) => entry.headline),
        );
        expect(headlines.sort()).toEqual([
            'Pale accepts the Dayton Agreement',
            'Pale rejects the Dayton Agreement',
            'RS leadership accepts the Dayton Agreement',
            'RS rejects Dayton; war continues',
        ]);
    });

    it('no longer treats the Patriarch Paper as something Pale ratifies, or invents an Assembly vote or an independence declaration', () => {
        expect(everything).not.toMatch(/ratif/i);
        expect(everything).not.toMatch(/Repudiate/i);
        expect(everything).not.toMatch(/declare(s)? (RS )?(unilateral )?independence|declaration of independence/i);
        expect(everything).not.toMatch(/December 1995 internal alternative|Karadžić's December/i);
        // The only place "National Assembly" may still appear is the hidden provenance recording that the judgment has no such vote.
        const visible = JSON.stringify({
            narrative: event.narrative,
            trigger_evidence: event.trigger_evidence,
            effect: event.effect,
            staff: event.staff_assessment,
            options: event.response_options?.map((option) => [option.label, option.description]),
            notes: event.notifications_to_other_factions,
        });
        expect(visible).not.toMatch(/National Assembly|Assembly/);
    });

    it('does not repeat the claims the judgment does not support', () => {
        const visible = `${event.narrative} ${(event.trigger_evidence ?? []).join(' ')}`;
        expect(visible).not.toMatch(/eastern enclaves/i);
        expect(visible).not.toMatch(/annexed to FRY/i);
        expect(visible).not.toMatch(/Karadžić's objections are loud|Mladić's reservations/);
        expect(visible).not.toMatch(/delegation initiali[sz]ed|delegation initialed/);
        expect(visible).toContain('together with Tuđman and Izetbegović');
        expect(visible).toContain('The RS delegation stayed away from the final plenary and the initialling');
    });

    it('keeps the ids, flags, bot default and option effects exactly as they were', () => {
        expect(event.historical_default_response_id).toBe('accept');
        expect(event.bot_response_logic).toBe('historical');
        expect(event.responding_faction).toBe('RS');
        const [accept, hardline] = event.response_options ?? [];
        expect([accept.id, hardline.id]).toEqual(['accept', 'hardline']);
        expect([accept.branch_tag, hardline.branch_tag]).toEqual(['rs_dayton_accept', 'rs_dayton_hardline']);
        expect(accept.historical_marker).toBe('historical_default');
        expect(hardline.historical_marker).toBe('counterfactual');
        expect(accept.sets_flags).toEqual({ rs_dayton_acceptance: 'accept' });
        expect(hardline.sets_flags).toEqual({ rs_dayton_acceptance: 'hardline' });
        expect(accept.aggression_affinity).toBe(-0.6);
        expect(hardline.aggression_affinity).toBe(0.7);
        expect(accept.dimension_shifts).toEqual([
            { faction: 'RS', dimension: 'international_standing', delta: 20 },
            { faction: 'RS', dimension: 'territorial_legitimacy', delta: 15 },
            { faction: 'RS', dimension: 'internal_cohesion', delta: -8 },
            { faction: 'RS', dimension: 'military_credibility', delta: -3 },
        ]);
        expect(hardline.dimension_shifts).toEqual([
            { faction: 'RS', dimension: 'international_standing', delta: -25 },
            { faction: 'RS', dimension: 'territorial_legitimacy', delta: -20 },
            { faction: 'RS', dimension: 'patron_confidence', delta: -40 },
            { faction: 'RS', dimension: 'internal_cohesion', delta: 10 },
            { faction: 'RS', dimension: 'military_credibility', delta: 5 },
        ]);
        expect(event.trigger?.turn_min).toBe(190);
        expect(event.trigger?.turn_max).toBe(212);
    });

    it('the visible source note says who initialled and what the leadership accepted, EN and BCS, without the unverified name', () => {
        const en = resolveEventSourceLine(event, 'en') ?? '';
        const bcs = resolveEventSourceLine(event, 'bcs') ?? '';
        expect(en).toMatch(/paras 424 and 431-437/);
        expect(en).toMatch(/Milošević, Tuđman and Izetbegović initialled the Dayton Agreement on 21 November 1995/);
        expect(en).toMatch(/statement that the RS leadership had accepted the agreement \(para\. 436\)/);
        expect(bcs).toMatch(/par\. 424 i 431–437/);
        expect(bcs).toMatch(/Milošević, Tuđman i Izetbegović parafirali su Daytonski sporazum 21\. novembra 1995\./);
        expect(bcs).toMatch(/prihvatilo sporazum \(par\. 436\)/);
        for (const line of [en, bcs]) expect(line).not.toMatch(/Patriarch|Patrijarh/i);
    });

    it('the Codex essay is retitled in the essay and its index entry, and no longer says Pale "ratifies"', () => {
        const essay = JSON.parse(withoutComments(readFileSync('data/scenarios/essays/rs_dayton_acceptance_1995.json', 'utf8'))) as { title: string; content: string };
        const index = JSON.parse(withoutComments(readFileSync('data/scenarios/essays/essay_index.json', 'utf8'))) as {
            essays: Array<{ event_id: string; title: string; content: string }>;
        };
        const entry = index.essays.find((row) => row.event_id === 'rs_dayton_acceptance_1995')!;
        for (const row of [essay, entry]) {
            expect(row.title).toBe('Pale Accepts the Dayton Agreement');
            expect(row.content).not.toMatch(/ratif|held the pen|over its head|Belgrade-led delegation|70 percent/i);
            expect(row.content).toContain('Milošević, not Karadžić, initialled the agreement');
        }
        expect(JSON.stringify(index)).not.toContain('Pale Ratifies the Dayton Framework');
    });
});
