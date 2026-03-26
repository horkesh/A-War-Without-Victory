import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EventDefinition, EventCondition } from '../src/sim/events/event_types.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { GameState } from '../src/state/game_state.js';

const EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');
const EVENT_FILES = ['war_1992.json', 'war_1993.json', 'war_1994.json', 'war_1995.json'];

function loadAllEvents(): EventDefinition[] {
    const all: EventDefinition[] = [];
    for (const file of EVENT_FILES) {
        const raw = readFileSync(resolve(EVENTS_DIR, file), 'utf-8');
        const parsed = JSON.parse(raw);
        expect(Array.isArray(parsed), `${file} should parse to an array`).toBe(true);
        all.push(...parsed);
    }
    return all;
}

describe('event system integration', () => {
    const allEvents = loadAllEvents();

    it('loads all event files without error and they are non-empty', () => {
        expect(allEvents.length).toBeGreaterThan(0);
        // Memory says 94 events -- verify ballpark
        expect(allEvents.length).toBeGreaterThanOrEqual(90);
    });

    it('every event has required fields: id, trigger, effect', () => {
        for (const ev of allEvents) {
            expect(ev.id, `event missing id`).toBeDefined();
            expect(typeof ev.id).toBe('string');
            expect(ev.trigger, `${ev.id} missing trigger`).toBeDefined();
            // effect is the primary effect field
            expect(ev.effect, `${ev.id} missing effect`).toBeDefined();
        }
    });

    it('no duplicate event IDs across all files', () => {
        const ids = allEvents.map(e => e.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
    });

    it('all event conditions evaluate without throwing on a stub GameState', () => {
        // Minimal but real-shaped state
        const state = {
            meta: { turn: 20, phase: 'war', seed: 'test' },
            political: {
                political_controllers: {
                    'op:sarajevo:sarajevo_2': 'RBiH',
                    'op:banja-luka:banja_luka_2': 'RS',
                },
                war_alliance_rbih_hrhb: 0.5,
            },
            military: {
                formations: {},
                fired_event_ids: [],
            },
            displacement: {},
            factions: [
                { id: 'RBiH', profile: {} },
                { id: 'RS', profile: {} },
                { id: 'HRHB', profile: {} },
            ],
        } as unknown as GameState;

        for (const ev of allEvents) {
            // EventTrigger uses condition (singular), not conditions
            if (!ev.trigger.condition) continue;
            // Must not throw -- result (true/false) is irrelevant
            expect(() => evaluateCondition(ev.trigger.condition!, state)).not.toThrow();
        }
    });

    it('control_change effect flips OSID controller', () => {
        const state = {
            meta: { turn: 10, phase: 'war', seed: 'x' },
            factions: [
                { id: 'RBiH', profile: {} },
                { id: 'RS', profile: {} },
                { id: 'HRHB', profile: {} },
            ],
            military: { formations: {}, fired_event_ids: [] },
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RBiH',
                },
            },
            displacement: {},
        } as unknown as GameState;

        applyEventEffects(state, [{
            kind: 'control_change',
            faction: 'RS',
            osids: ['op:srebrenica:srebrenica_2'],
        }]);

        expect((state as any).political.political_controllers['op:srebrenica:srebrenica_2']).toBe('RS');
    });

    it('requires_events references all point to existing event IDs', () => {
        const idSet = new Set(allEvents.map(e => e.id));
        for (const ev of allEvents) {
            const reqs = ev.trigger?.requires_events;
            if (!reqs) continue;
            for (const reqId of reqs) {
                expect(idSet.has(reqId), `${ev.id} requires unknown event ${reqId}`).toBe(true);
            }
        }
    });

    it('requires_events have turn_min <= the dependent event turn_min', () => {
        const turnMap = new Map(allEvents.map(e => [e.id, e.trigger.turn_min ?? 0]));
        for (const ev of allEvents) {
            const reqs = ev.trigger?.requires_events;
            if (!reqs) continue;
            const evTurn = ev.trigger.turn_min ?? 0;
            for (const reqId of reqs) {
                const reqTurn = turnMap.get(reqId) ?? 0;
                expect(evTurn).toBeGreaterThanOrEqual(reqTurn);
            }
        }
    });
});
