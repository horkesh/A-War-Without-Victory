import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EventDefinition, EventCondition } from '../src/sim/events/event_types.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
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

    it('does not announce the Cerska fall unless RS controls the canonical Cerska OSID', () => {
        const event = allEvents.find((candidate) => candidate.id === 'vrs_cerska_offensive_1993')!;
        const state = {
            political: { political_controllers: { 'op:vlasenica:cerska_2': 'RBiH' } },
            military: { formations: {}, fired_event_ids: [] },
            displacement: {},
            factions: [],
            meta: { turn: 44, phase: 'war', seed: 'cerska-truth' },
        } as unknown as GameState;

        expect(event.trigger.condition).toEqual({
            type: 'territory_control',
            osid: 'op:vlasenica:cerska_2',
            faction: 'RS',
        });
        expect(evaluateCondition(event.trigger.condition!, state)).toBe(false);

        state.political.political_controllers!['op:vlasenica:cerska_2'] = 'RS';
        expect(evaluateCondition(event.trigger.condition!, state)).toBe(true);
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
                if (
                    ['zepa_falls_1995', 'un_safe_area_enforcement_1995'].includes(ev.id)
                    && reqId === 'srebrenica_falls_1995'
                ) {
                    expect(evTurn).toBe(160);
                    expect(reqTurn).toBe(169);
                } else if (ev.id === 'federation_ground_offensive_1995' && reqId === 'nato_deliberate_force_1995') {
                    expect(evTurn).toBe(165);
                    expect(reqTurn).toBe(178);
                } else {
                    expect(evTurn).toBeGreaterThanOrEqual(reqTurn);
                }
            }
        }
    });

    it('produces the ratified 1995 receipt sequence with same-week causal dependents', () => {
        const ids = [
            'tuzla_gate_massacre_1995',
            'un_hostage_crisis_1995',
            'srebrenica_falls_1995',
            'srebrenica_column_breakout_1995',
            'zepa_falls_1995',
            'second_markale_massacre_1995',
            'nato_deliberate_force_1995',
        ];
        const registry = ids.map((id) => {
            const source = allEvents.find((event) => event.id === id)!;
            return {
                ...source,
                effect: { kind: 'narrative', text: id },
                effects: undefined,
                response_options: undefined,
                requires_player_response: undefined,
                responding_faction: undefined,
            } as EventDefinition;
        });
        const state = {
            meta: { turn: 164, phase: 'war', seed: 'p2-sequence' },
            factions: [],
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RBiH',
                    'op:rogatica:zepa_2': 'RBiH',
                },
            },
            military: {
                formations: {},
                fired_event_ids: [],
                enabled_event_ids: ['un_hostage_crisis_1995'],
                event_flags: {
                    rs_strategic_goals: 'all_six',
                    srebrenica_enclave_formed: true,
                    srebrenica_demilitarized: true,
                    coha_expired: true,
                    rrf_deployed: true,
                    sarajevo_siege_active: true,
                },
                event_readiness: {},
                negotiation: { capital: { RS: { war_crimes_events: 8 } }, patron_relationships: {}, peace_plan_history: [] },
            },
            displacement: {},
        } as unknown as GameState;
        const receipts: Array<[string, number]> = [];

        for (const turn of [164, 169, 170, 171, 172, 173, 177, 178]) {
            state.meta.turn = turn;
            updateEventReadiness(state, registry);
            const report = evaluateEvents(state, () => { throw new Error('unexpected RNG'); }, turn, registry);
            receipts.push(...report.fired.map((event) => [event.id, turn] as [string, number]));
        }

        expect(receipts).toEqual([
            ['tuzla_gate_massacre_1995', 164],
            ['un_hostage_crisis_1995', 164],
            ['srebrenica_falls_1995', 171],
            ['srebrenica_column_breakout_1995', 171],
            ['zepa_falls_1995', 173],
            ['second_markale_massacre_1995', 178],
            ['nato_deliberate_force_1995', 178],
        ]);
    });
});
