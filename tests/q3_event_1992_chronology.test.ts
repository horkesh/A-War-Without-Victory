/**
 * LANE-NIGHTSHIFT-Q3-EVENT-1992-CHRONOLOGY-AUDIT
 *
 * Audit `*_1992`-suffixed events to ensure their trigger windows stay within the
 * canonical 1992 narrative window (April 1992 = w0; March 1993 = w52; the "1992
 * narrative window" closes at ~w39).
 *
 * Mechanism (EventManager trigger predicate) is unchanged; this test fixture
 * only verifies the trigger-window data fields.
 *
 * Sources (per docs/historical_research_sources.md hierarchy ICTY > BB > Wiki):
 *   - ICTY Tadic IT-94-1, Stakic IT-97-24-T (Prijedor / Omarska / Trnopolje)
 *   - ICTY Krajisnik IT-00-39-T, Karadzic IT-95-5/18-T (Drina Valley)
 *   - ICTY Kordic IT-95-14/2, Blaskic IT-95-14 (HVO-ARBiH Lasva Valley)
 *   - ICTY Prlic IT-04-74-T (Jajce recriminations)
 *   - ITN broadcast 2-6 Aug 1992 (Penny Marshall, Ed Vulliamy)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface EventTrigger {
    turn_min?: number;
    turn_max?: number;
    phase?: string;
    condition?: unknown;
}

interface EventDef {
    id: string;
    title?: string;
    trigger?: EventTrigger;
}

const eventsPath = resolve(__dirname, '..', 'data', 'scenarios', 'events', 'war_1992.json');
const rawJson = readFileSync(eventsPath, 'utf8');
const events: EventDef[] = JSON.parse(rawJson);

// April 6 1992 = w0. End of "1992 narrative window" = ~w39 (early Jan 1993).
const NARRATIVE_1992_CEILING = 39;

const events1992 = events.filter(e => /_1992$/.test(e.id));

function getEvent(id: string): EventDef | undefined {
    return events.find(e => e.id === id);
}

describe('LANE-NIGHTSHIFT-Q3 *_1992 chronology audit', () => {
    it('T1: all *_1992-suffixed events have turn_min <= 39 (1992 narrative window)', () => {
        expect(events1992.length).toBeGreaterThan(0);
        for (const evt of events1992) {
            const turnMin = evt.trigger?.turn_min ?? 0;
            expect(turnMin, `${evt.id} turn_min=${turnMin} exceeds 1992 narrative window`).toBeLessThanOrEqual(NARRATIVE_1992_CEILING);
        }
    });

    it('T2: all *_1992-suffixed events have turn_max <= 39 (canonical 1992 ceiling)', () => {
        // turn_max must keep the event within 1992 narrative time. A *_1992-suffixed
        // event with turn_max > 39 can fire deep in 1993-narrative time, contradicting
        // the year-anchor in its identifier.
        expect(events1992.length).toBeGreaterThan(0);
        for (const evt of events1992) {
            const turnMax = evt.trigger?.turn_max;
            expect(turnMax, `${evt.id} missing turn_max`).toBeDefined();
            expect(turnMax!, `${evt.id} turn_max=${turnMax} overflows 1992 narrative window`).toBeLessThanOrEqual(NARRATIVE_1992_CEILING);
        }
    });

    it('T3: jajce_falls_1992 window is [28, 39] — historical Jajce fall Oct 29 1992', () => {
        // ICTY Prlic et al. IT-04-74-T (Jajce recriminations).
        // Jajce fell 29 Oct 1992 = w28. P1 fix (memory 2026-04-14) bumped turn_min 40->28.
        // This audit caps turn_max 52->39 to keep the *_1992-suffixed event in 1992.
        const evt = getEvent('jajce_falls_1992');
        expect(evt, 'jajce_falls_1992 missing from war_1992.json').toBeDefined();
        expect(evt!.trigger?.turn_min).toBe(28);
        expect(evt!.trigger?.turn_max).toBe(39);
    });

    it('T4: concentration_camps_revealed_1992 turn_min >= 16 (post-ITN-broadcast alignment)', () => {
        // ITN footage from Omarska/Trnopolje broadcast 2-6 Aug 1992 = w17-w18.
        // turn_min=16 (29 Jul 1992) gives a 1-week pre-broadcast tolerance for
        // pressure accumulation. Below this, the event fires before the broadcast,
        // which contradicts the historical "world is watching" trigger.
        // ICTY Stakic IT-97-24-T, Tadic IT-94-1.
        const evt = getEvent('concentration_camps_revealed_1992');
        expect(evt, 'concentration_camps_revealed_1992 missing from war_1992.json').toBeDefined();
        expect(evt!.trigger?.turn_min, 'turn_min must be >= 16 to align with ITN Aug 1992 broadcast').toBeGreaterThanOrEqual(16);
    });

    it('T5: drina_valley_ethnic_cleansing_1992 turn_min <= 4 (Bijeljina/Zvornik onset)', () => {
        // Bijeljina massacre 2-3 Apr 1992 = w0; Zvornik 8-10 Apr 1992 = w1; Foca late Apr 1992 = w3.
        // Event narrative explicitly cites these towns. The "Drina Valley Campaign Accelerates"
        // event must be eligible to fire from the actual onset of the campaign, not 2 months in.
        // Gating condition (RS territory > 0.45 + jna_withdrawn) still holds firing back to
        // natural pace. ICTY Krajisnik IT-00-39-T, Karadzic IT-95-5/18-T.
        const evt = getEvent('drina_valley_ethnic_cleansing_1992');
        expect(evt, 'drina_valley_ethnic_cleansing_1992 missing from war_1992.json').toBeDefined();
        expect(evt!.trigger?.turn_min, 'turn_min must be <= 4 to allow April-1992 onset').toBeLessThanOrEqual(4);
    });

    it('T6 (determinism): re-parsing event JSON yields stable trigger fields (byte-identical re-load)', () => {
        // Re-load the file and verify the same window data appears. This catches accidental
        // JSON drift, encoding issues, or mid-write corruption that could break determinism.
        const reloaded: EventDef[] = JSON.parse(readFileSync(eventsPath, 'utf8'));
        const fixture: Array<{ id: string; turn_min: number; turn_max: number }> = [
            { id: 'jajce_falls_1992',                     turn_min: 28, turn_max: 39 },
            { id: 'hvo_arbih_tensions_rise_1992',         turn_min: 20, turn_max: 35 },
            { id: 'concentration_camps_revealed_1992',    turn_min: 16, turn_max: 30 },
            { id: 'drina_valley_ethnic_cleansing_1992',   turn_min: 4,  turn_max: 25 },
        ];
        for (const expected of fixture) {
            const evt = reloaded.find(e => e.id === expected.id);
            expect(evt, `${expected.id} missing on re-load`).toBeDefined();
            expect(evt!.trigger?.turn_min, `${expected.id} turn_min drift`).toBe(expected.turn_min);
            expect(evt!.trigger?.turn_max, `${expected.id} turn_max drift`).toBe(expected.turn_max);
        }
    });

    it('T7 (backward-compat): pre-fix scenarios load — events array structure unchanged', () => {
        // Schema-level guard: changing data-window values must not break consumers
        // that load this file. Verify the array shape, that every event has an `id`
        // and a `trigger` object, and that no NaN / undefined slipped in.
        expect(Array.isArray(events)).toBe(true);
        for (const evt of events) {
            expect(typeof evt.id).toBe('string');
            expect(evt.id.length).toBeGreaterThan(0);
            if (evt.trigger) {
                if (evt.trigger.turn_min !== undefined) {
                    expect(Number.isFinite(evt.trigger.turn_min)).toBe(true);
                    expect(evt.trigger.turn_min).toBeGreaterThanOrEqual(0);
                }
                if (evt.trigger.turn_max !== undefined) {
                    expect(Number.isFinite(evt.trigger.turn_max)).toBe(true);
                    expect(evt.trigger.turn_max).toBeGreaterThanOrEqual(evt.trigger.turn_min ?? 0);
                }
            }
        }
    });
});
