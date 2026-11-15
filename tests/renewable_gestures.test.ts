/**
 * Renewable presidential gestures (Fable consult 1 appendix D; ratified in L7 #670, 2026-11-15).
 *
 * The twelve gesture events (front visit, address to the nation, decoration, strategic posture
 * review; one per faction) carry a cooldown only, no lifetime cap: front visit 26 weeks, address
 * 52, decoration 52, posture review 26. The engine never reads `action_cadence` (only the desktop
 * contracts do), so headless runs are unchanged. This pins the data, the loader rule (no cap needs
 * a positive cooldown) and the contracts' "renewable" reading (firesLeft null, never exhausted).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
/* eslint-disable @typescript-eslint/no-explicit-any */
const { computeActionCadenceAvailability } = require('../src/desktop/action_cadence_contract.cjs');
const { computeFrontVisitAvailability } = require('../src/desktop/front_visit_contract.cjs');

const events: any[] = (() => {
    const raw = JSON.parse(readFileSync('data/scenarios/events/war_1993.json', 'utf8'));
    return Array.isArray(raw) ? raw : (raw.events ?? Object.values(raw).find(Array.isArray) ?? []);
})();

const EXPECTED_COOLDOWN: Record<string, number> = {
    visit_to_front: 26,
    address_to_nation: 52,
    decorate_a_unit: 52,
    strategic_posture_review: 26,
};

describe('renewable gesture data', () => {
    it('every gesture event has a cooldown and no lifetime cap', () => {
        const gestures = events.filter((e) => e.action_cadence);
        expect(gestures.map((e) => e.id).sort()).toEqual(
            Object.keys(EXPECTED_COOLDOWN).flatMap((base) => ['hrhb', 'rbih', 'rs'].map((f) => `${base}_${f}`)).sort(),
        );
        for (const event of gestures) {
            const base = event.id.replace(/_(rbih|rs|hrhb)$/, '');
            expect(event.action_cadence.max_fires, event.id).toBeUndefined();
            expect(event.action_cadence.cooldown_turns, event.id).toBe(EXPECTED_COOLDOWN[base]);
        }
    });
});

describe('renewable gesture contracts', () => {
    const def = { id: 'address_to_nation_rbih', action_cadence: { cooldown_turns: 52, escalation: 'static' } };
    const state = (fires: number, lastFired: number | undefined, turn: number): any => ({
        meta: { turn, player_faction: 'RBiH' },
        military: {
            event_fire_counts: { address_to_nation_rbih: fires },
            ...(lastFired === undefined ? {} : { event_last_fired_turn: { address_to_nation_rbih: lastFired } }),
            pending_event_decisions: [],
        },
    });

    it('is never exhausted, however often it has been used', () => {
        const result = computeActionCadenceAvailability(state(40, 100, 200), def.id, def);
        expect(result).toMatchObject({ available: true, reason: null, firesLeft: null, maxFires: null, nextFireNumber: 41 });
    });

    it('still respects the cooldown', () => {
        expect(computeActionCadenceAvailability(state(3, 180, 200), def.id, def))
            .toMatchObject({ available: false, reason: 'on_cooldown', cooldownUntil: 232 });
        expect(computeActionCadenceAvailability(state(3, 180, 232), def.id, def).available).toBe(true);
    });

    it('a capped cadence still counts down and runs out', () => {
        const capped = { ...def, action_cadence: { max_fires: 5, cooldown_turns: 10, escalation: 'static' } };
        expect(computeActionCadenceAvailability(state(4, 1, 50), def.id, capped)).toMatchObject({ available: true, firesLeft: 1, maxFires: 5 });
        expect(computeActionCadenceAvailability(state(5, 1, 50), def.id, capped)).toMatchObject({ available: false, reason: 'exhausted', firesLeft: 0 });
    });

    it('front visit reports a renewable cadence as null fires left, not 0', () => {
        const visit = events.find((e) => e.id === 'visit_to_front_rbih');
        const result = computeFrontVisitAvailability(
            { meta: { turn: 300, player_faction: 'RBiH' }, military: { event_fire_counts: { visit_to_front_rbih: 12 }, pending_event_decisions: [] }, political: { political_controllers: {} } },
            'RBiH',
            visit,
        );
        expect(result.firesLeft).toBeNull();
        expect(result.reason).not.toBe('exhausted');
    });
});
