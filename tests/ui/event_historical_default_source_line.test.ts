/**
 * Every event that marks a historical default shows the player a source line for it.
 *
 * R8 render check (2026-11-15): `us_halts_federation_advance_1995` marked `comply` as the
 * historical default, but its `source_note` and `historical_source` both carry authoring
 * provenance, which the player-copy filter hides, so the default showed no source at all. The
 * event now carries a player-facing `localizations.<locale>.source_note`. Four more events had the
 * same gap (csq_patron_recovery_offer, gornji_vakuf_clashes_1993,
 * hrhb_1992_graz_cooperation_collapse, rbih_late_war_offensive_1995); their notes were checked by
 * the historian seat against the ICTY judgments and the Balkan Battlegrounds pages (2026-11-15).
 * This pins that no historical default is left without a visible citation, in either locale, so
 * the known-gap list is now empty and stays empty.
 */

import { describe, expect, it } from 'vitest';

import type { EventDefinition } from '../../src/sim/events/event_types';
import { resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy';
import { strictCompare } from '../../src/state/validateGameState';
import war1992 from '../../data/scenarios/events/war_1992.json';
import war1992HrhbSummer from '../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993 from '../../data/scenarios/events/war_1993.json';
import war1994 from '../../data/scenarios/events/war_1994.json';
import war1995 from '../../data/scenarios/events/war_1995.json';
import consequences from '../../data/scenarios/events/consequences.json';

const CATALOGS = [war1992, war1992HrhbSummer, war1993, war1994, war1995, consequences] as unknown as EventDefinition[][];

describe('historical defaults carry a visible source line', () => {
    const defaults = CATALOGS.flat()
        .filter((def) => def.historical_default_response_id)
        .sort((a, b) => strictCompare(a.id, b.id));
    const byId = (id: string) => {
        const def = defaults.find((entry) => entry.id === id);
        expect(def, id).toBeDefined();
        return def;
    };

    it('is not vacuous', () => {
        expect(defaults.length).toBeGreaterThan(20);
    });

    it('every event with a historical default resolves a player-safe source line in en and bcs', () => {
        const missing: string[] = [];
        for (const def of defaults) {
            for (const locale of ['en', 'bcs'] as const) {
                if (resolveEventSourceLine(def, locale) === null) missing.push(`${def.id}:${locale}`);
            }
        }
        expect(missing).toEqual([]);
    });

    it('Washington Halts the Federation Advance names Balkan Battlegrounds in both locales', () => {
        const def = byId('us_halts_federation_advance_1995');
        expect(resolveEventSourceLine(def, 'en')).toMatch(/Balkan Battlegrounds/);
        expect(resolveEventSourceLine(def, 'bcs')).toMatch(/Balkan Battlegrounds/);
    });

    it('the Final Offensive cites Balkan Battlegrounds Vol. I ch. 91-93 and Holbrooke, not the wrong Vol. II chapters', () => {
        const def = byId('rbih_late_war_offensive_1995');
        expect(resolveEventSourceLine(def, 'en')).toMatch(/Vol\. I, ch\. 91-93 \(pp\. 379-391\).*Holbrooke, To End a War \(1998\)/);
        expect(resolveEventSourceLine(def, 'bcs')).toMatch(/tom I, pogl\. 91-93 \(str\. 379-391\).*Holbrooke, To End a War \(1998\)/);
        expect(resolveEventSourceLine(def, 'en')).not.toMatch(/Vol\. II|Ch\. 15/);
    });

    it('Graz cites the Prlić judgment paragraph for the meeting and says no agreement was signed', () => {
        const def = byId('hrhb_1992_graz_cooperation_collapse');
        expect(resolveEventSourceLine(def, 'en')).toMatch(/Prlić et al\. \(IT-04-74\).*para\. 439.*no signed agreement/);
        expect(resolveEventSourceLine(def, 'bcs')).toMatch(/Prlić i drugi \(IT-04-74\).*par\. 439.*bez potpisanog sporazuma/);
    });

    it('Gornji Vakuf is a bare judgment citation: no characterisation, no ultimatum, no BB page it does not support', () => {
        const def = byId('gornji_vakuf_clashes_1993');
        const en = resolveEventSourceLine(def, 'en') ?? '';
        const bcs = resolveEventSourceLine(def, 'bcs') ?? '';
        expect(en).toBe('ICTY, Prlić et al. (IT-04-74), Trial Judgment, 29 May 2013, Vol. 2, paras 336-355 (Gornji Vakuf Municipality, January 1993).');
        expect(bcs).toMatch(/Prlić i drugi \(IT-04-74\).*tom 2, par\. 336-355/);
        for (const line of [en, bcs]) {
            expect(line).not.toMatch(/ultimatum|Balkan Battlegrounds|448|452/i);
        }
    });

    it('the Patron Recovery Offer says it is a game construct, with no invented offer or "Patriarch Paper"', () => {
        const def = byId('csq_patron_recovery_offer');
        const en = resolveEventSourceLine(def, 'en') ?? '';
        const bcs = resolveEventSourceLine(def, 'bcs') ?? '';
        expect(en).toMatch(/^Not a documented offer: a game construct/);
        expect(bcs).toMatch(/^Nije dokumentirana ponuda, nego konstrukcija igre/);
        expect(en).toMatch(/29 August 1995.*para\. 424/);
        expect(bcs).toMatch(/29\. augusta 1995.*par\. 424/);
        expect(bcs).toContain('rukovodstvo u Palama');
        for (const line of [en, bcs]) {
            expect(line).not.toMatch(/Patriarch|Patrijarh|30 August|30\. august|4985|§/i);
        }
    });

    it('no source line reads like developer text', () => {
        const developerText = /\b(LANE-|lane |worksheet|docs\/|\.md\b|\.json\b|design_counterfactual|memory\/|packet)\b/i;
        for (const id of [
            'csq_patron_recovery_offer',
            'gornji_vakuf_clashes_1993',
            'hrhb_1992_graz_cooperation_collapse',
            'rbih_late_war_offensive_1995',
        ]) {
            const def = byId(id);
            for (const locale of ['en', 'bcs'] as const) {
                expect(resolveEventSourceLine(def, locale) ?? '', `${id}:${locale}`).not.toMatch(developerText);
            }
        }
    });
});
