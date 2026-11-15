/**
 * Citation sweep 2 (historian check, 2026-11-15). Three more Karadžić IT-95-5/18-T ranges and a
 * family of Balkan Battlegrounds references were wrong:
 * - §§4263-4310 (and §§4280-4310) are the Markale II witness evidence of 28 August 1995, not the
 *   1994 embargo, Owen-Stoltenberg or the Pale-Belgrade friction they were cited for;
 * - §§3471-3475 are SDS ideology and impunity, not Vance-Owen; §§3526-3530 open the Sarajevo section;
 * - §§5810-5876 open with Srebrenica; the UN peacekeepers hostage count (Count 11) is §§5852-5993;
 * - "BB Vol. II Ch. 11-16" does not exist: BB Vol. II is annexes and addenda, not chapters.
 *
 * Same two surfaces and rules as tests/ui/event_karadzic_citation_ranges.test.ts: hidden text
 * records the correction wherever the old cite stands; player-visible text is never annotated, and
 * the visible strings that still carry an old cite are a known list that may only shrink (they need
 * the historian and narrative seats, and several claims beside them are contradicted by the judgment).
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

const SWEPT = /§§?(4263-4310|4280-4310|3471-3475|3526-3530|5810-5876)|BB Vol\. II[^.;)]{0,30}Chs?\. ?\d+/g;
const CORRECTION_MARKER = /(earlier cite|the earlier|earlier range|earlier ")/;

const mentions = (text: string): boolean => {
    SWEPT.lastIndex = 0;
    return SWEPT.test(text);
};

/** Player-visible strings that still carry a swept citation. Fix them with the seats, then remove the entry. */
const KNOWN_VISIBLE_TO_FIX: ReadonlyArray<string> = [
    'rs_assembly_rejects_voplan_1993:ro0.fc0', 'rs_strategic_goals:ro0.fc3', 'rs_strategic_goals:ro0.fc4', 'rs_strategic_goals:ro0.fc8', 'rs_strategic_goals:ro0.fc9',
    'rs_strategic_goals:ro1.fc0', 'rs_strategic_goals:ro1.fc2', 'rs_strategic_goals:ro1.fc3', 'rs_strategic_goals:ro1.fc7', 'rs_strategic_goals:ro1.fc8',
    'rs_strategic_goals:ro2.fc0', 'rs_strategic_goals:ro2.fc2', 'rs_strategic_goals:ro2.fc3', 'rs_strategic_goals:ro2.fc7', 'rs_strategic_goals:ro2.fc8',
    'rbih_state_identity:ro0.fc6', 'rbih_state_identity:ro0.fc11', 'rbih_state_identity:ro1.fc5', 'rbih_state_identity:ro1.fc10',
    'rbih_state_identity:ro2.fc5', 'rbih_state_identity:ro2.fc10',
    'hrhb_political_goal:ro0.fc12', 'hrhb_political_goal:ro1.fc11', 'hrhb_political_goal:ro2.fc11',
    'os_rbih_tactical_acceptance_1993:historical_source', 'hrhb_owen_stoltenberg_response_1993:historical_source',
    'rs_owen_stoltenberg_response_1993:historical_source', 'rs_belgrade_pressure_response_1993:historical_source',
    'rbih_reintegration_offers_1993:historical_source', 'rs_autonomy_path_decision_1993:historical_source',
    'rs_washington_rejection_1994:historical_source', 'rs_contact_group_response_1994:historical_source',
    'un_hostage_crisis_1995:historical_source',
];

/**
 * Events whose whole definition (hidden text included) is pinned by a reviewed-contract hash in
 * src/sim/events/opening_policy_transition.ts. Editing any string of `rbih_state_identity` breaks that
 * pin, and a UI lane makes no sim change, so its hidden notes keep the old cites until the contract
 * owner re-pins the hash. They are listed here so the hole is explicit and may only shrink.
 */
const PINNED_BY_REVIEWED_CONTRACT: ReadonlyArray<string> = ['rbih_state_identity'];

describe('event notes no longer cite the Markale II, SDS and Srebrenica paragraphs, or a BB Vol. II chapter, as support', () => {
    it('is not vacuous: the corrections are recorded in the hidden data', () => {
        const hidden = ENTRIES.filter((entry) => !entry.visible && mentions(entry.text));
        expect(hidden.length).toBeGreaterThanOrEqual(25);
    });

    it('the pinned event is the only one left with an uncorrected hidden cite, and it is pinned by the reviewed contract', () => {
        const source = withoutComments(readFileSync('src/sim/events/opening_policy_transition.ts', 'utf8'));
        expect(source).toContain("const IDENTITY = 'rbih_state_identity'");
        expect(source).toContain('REVIEWED_IDENTITY_FNV64');
        const pinnedHidden = ENTRIES.filter((entry) => !entry.visible && PINNED_BY_REVIEWED_CONTRACT.includes(entry.id) && mentions(entry.text));
        expect(pinnedHidden.length).toBeGreaterThan(0);
    });

    it('hidden text: every mention of a swept citation says it is the earlier, wrong cite', () => {
        const live: string[] = [];
        for (const entry of ENTRIES.filter((row) => !row.visible && !PINNED_BY_REVIEWED_CONTRACT.includes(row.id))) {
            for (const match of entry.text.matchAll(SWEPT)) {
                const at = match.index ?? 0;
                const around = entry.text.slice(Math.max(0, at - 70), at + match[0].length + 60);
                if (!CORRECTION_MARKER.test(around)) live.push(`${entry.id}:${entry.where} ${match[0]}`);
            }
        }
        expect(live).toEqual([]);
    });

    it('player-visible text is never annotated with audit notes', () => {
        const AUDIT_NOTE = /historian check|paragraph not verified|corrected 2026-11-15|the earlier cite|earlier text of this field|design inference|does not exist/;
        const leaked = ENTRIES.filter((entry) => entry.visible && AUDIT_NOTE.test(entry.text)).map((entry) => `${entry.id}:${entry.where}`);
        expect(leaked).toEqual([]);
    });

    it('the player-visible strings that still carry a swept citation are exactly the known list (it may only shrink)', () => {
        const visible = ENTRIES.filter((entry) => entry.visible && mentions(entry.text)).map((entry) => `${entry.id}:${entry.where}`);
        expect(visible.sort()).toEqual([...KNOWN_VISIBLE_TO_FIX].sort());
    });

    it('the paragraphs and pages that do support the claims are cited where the old ones stood', () => {
        const hidden = ENTRIES.filter((entry) => !entry.visible).map((entry) => entry.text).join('\n');
        for (const supported of [
            'paras 396-401',
            'para. 3295',
            'paras 377-383',
            'paras 3283-3295',
            'Count 11 paras 5852-5993',
            'BB Vol. II Annex 58, pp. 507-511',
            'BB Vol. II Annex 64, pp. 563-569',
            'BB Vol. I ch. 91 (Maestral), pp. 379-381',
        ]) expect(hidden, supported).toContain(supported);
    });
});
