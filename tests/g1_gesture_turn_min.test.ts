/**
 * G1 (2026-11-16): a human President's renewable leadership gestures honour the authored event's
 * own `trigger.turn_min`, exactly as the bot path does. Before this, address-to-nation, the front
 * visit, decorate-a-unit and the strategic posture review could all be used from turn 0 by a human
 * while bots fired them only from turn 84.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { computeAddressNationAvailability, addressNationEventIdForFaction } = require('../src/desktop/address_nation_contract.cjs');
const { computeFrontVisitAvailability, frontVisitEventIdForFaction } = require('../src/desktop/front_visit_contract.cjs');
const { computeDecorateUnitAvailability, decorateUnitEventIdForFaction } = require('../src/desktop/decorate_unit_contract.cjs');
const { computeStrategicPostureReviewAvailability } = require('../src/desktop/strategic_posture_review_contract.cjs');
const { eventNotYetAvailableUntil } = require('../src/desktop/action_cadence_contract.cjs');

type EventDef = { id: string; trigger?: { turn_min?: number }; action_cadence?: unknown };
const raw = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'scenarios', 'events', 'war_1993.json'), 'utf8'));
const EVENTS: EventDef[] = Array.isArray(raw) ? raw : raw.events;
const byId = (id: string) => EVENTS.find((e) => e.id === id)!;

function stateAt(turn: number) {
    return { meta: { turn, phase: 'war' }, military: { pending_event_decisions: [], event_fire_counts: {}, event_last_fired_turn: {}, formations: {} }, political: {} };
}

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const GESTURES = [
    { name: 'address to the nation', id: (f: string) => addressNationEventIdForFaction(f), check: computeAddressNationAvailability },
    { name: 'front visit', id: (f: string) => frontVisitEventIdForFaction(f), check: computeFrontVisitAvailability },
    { name: 'decorate a unit', id: (f: string) => decorateUnitEventIdForFaction(f), check: computeDecorateUnitAvailability },
    { name: 'strategic posture review', id: (f: string) => `strategic_posture_review_${f.toLowerCase()}`, check: computeStrategicPostureReviewAvailability },
];

describe('G1: renewable gestures honour the event trigger turn_min', () => {
    it('every renewable gesture event is authored with turn_min 84', () => {
        for (const g of GESTURES) for (const f of FACTIONS) {
            expect(byId(g.id(f))?.trigger?.turn_min, `${g.name} ${f}`).toBe(84);
        }
    });

    for (const g of GESTURES) {
        it(`${g.name}: not yet available before turn 84, for every faction`, () => {
            for (const f of FACTIONS) {
                const def = byId(g.id(f));
                const before = g.check(stateAt(0), f, def);
                expect(before.available, `${f} t0`).toBe(false);
                expect(before.reason, `${f} t0`).toBe('not_yet_available');
                expect(before.availableFromTurn).toBe(84);
                expect(g.check(stateAt(83), f, def).reason, `${f} t83`).toBe('not_yet_available');
                // From turn 84 the turn gate no longer applies (other gates, e.g. front reach, may).
                expect(g.check(stateAt(84), f, def).reason, `${f} t84`).not.toBe('not_yet_available');
            }
        });
    }

    it('the player copy names the opening date, and an old pending gesture still reads as pending', async () => {
        const { gestureNotYetText } = await import('../src/ui/map/utils/gestureCopy.js');
        const { turnToDateString } = await import('../src/ui/map/utils/formatters.js');
        const text = gestureNotYetText(84);
        expect(text).toContain(turnToDateString(84));
        expect(text).not.toMatch(/\b84\b/);
        expect(gestureNotYetText(undefined)).not.toContain('{date}');

        const def = byId(addressNationEventIdForFaction('RBiH'));
        const pending = stateAt(10);
        (pending.military.pending_event_decisions as unknown[]).push({ event_id: def.id });
        expect(computeAddressNationAvailability(pending, 'RBiH', def).reason).toBe('already_pending');
    });

    it('the shared helper only gates events that author a turn_min', () => {
        expect(eventNotYetAvailableUntil(10, { trigger: { turn_min: 84 } })).toBe(84);
        expect(eventNotYetAvailableUntil(84, { trigger: { turn_min: 84 } })).toBeNull();
        expect(eventNotYetAvailableUntil(0, { trigger: {} })).toBeNull();
        expect(eventNotYetAvailableUntil(0, {})).toBeNull();
    });
});
