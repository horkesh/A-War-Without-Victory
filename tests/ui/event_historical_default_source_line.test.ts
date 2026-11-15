/**
 * Every event that marks a historical default shows the player a source line for it.
 *
 * R8 render check (2026-11-15): `us_halts_federation_advance_1995` marked `comply` as the
 * historical default, but its `source_note` and `historical_source` both carry authoring
 * provenance, which the player-copy filter hides, so the default showed no source at all. The
 * event now carries a player-facing `localizations.<locale>.source_note`. This pins that no
 * historical default is left without a visible citation, in either locale.
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

/**
 * Events found without a visible source line when this guard was written (2026-11-15). Each
 * authored citation is developer text (a lane id, a worksheet or a repo path), so the filter hides
 * it. They need a player-facing `localizations.<locale>.source_note` written by the event lane;
 * this list may only shrink, and the test fails when an entry gains a source so it gets removed.
 */
const KNOWN_WITHOUT_SOURCE_LINE: ReadonlyArray<string> = [
    'csq_patron_recovery_offer',
    'gornji_vakuf_clashes_1993',
    'hrhb_1992_graz_cooperation_collapse',
    'rbih_late_war_offensive_1995',
];

describe('historical defaults carry a visible source line', () => {
    const defaults = CATALOGS.flat()
        .filter((def) => def.historical_default_response_id)
        .sort((a, b) => strictCompare(a.id, b.id));

    it('is not vacuous', () => {
        expect(defaults.length).toBeGreaterThan(20);
    });

    it('every other event with a historical default resolves a player-safe source line in en and bcs', () => {
        const missing: string[] = [];
        for (const def of defaults) {
            if (KNOWN_WITHOUT_SOURCE_LINE.includes(def.id)) continue;
            for (const locale of ['en', 'bcs'] as const) {
                if (resolveEventSourceLine(def, locale) === null) missing.push(`${def.id}:${locale}`);
            }
        }
        expect(missing).toEqual([]);
    });

    it('the known gaps are still gaps (remove an entry once its event has a source line)', () => {
        for (const id of KNOWN_WITHOUT_SOURCE_LINE) {
            const def = defaults.find((entry) => entry.id === id);
            expect(def, id).toBeDefined();
            expect(resolveEventSourceLine(def, 'en'), id).toBeNull();
        }
    });

    it('Washington Halts the Federation Advance names Balkan Battlegrounds in both locales', () => {
        const def = defaults.find((entry) => entry.id === 'us_halts_federation_advance_1995');
        expect(def).toBeDefined();
        expect(resolveEventSourceLine(def, 'en')).toMatch(/Balkan Battlegrounds/);
        expect(resolveEventSourceLine(def, 'bcs')).toMatch(/Balkan Battlegrounds/);
    });
});
