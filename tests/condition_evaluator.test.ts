import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

function minState(): GameState {
    return {
        meta: { turn: 20, phase: 'war', scenario_start_date: '1992-04-06' },
        political: {
            political_controllers: {},
            war_alliance_rbih_hrhb: 0.5,
        },
        military: {
            formations: {},
            general_supply_reserve: { RS: 50, RBiH: 30, HRHB: 40 },
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
                strategic_dimensions: {},
            },
            event_flags: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

describe('evaluateCondition — new v0.6.0 condition types', () => {
    it('supply_below: true when below threshold', () => {
        const state = minState();
        expect(evaluateCondition({ type: 'supply_below', faction: 'RBiH', threshold: 40 }, state)).toBe(true);
    });

    it('supply_below: false when above threshold', () => {
        const state = minState();
        expect(evaluateCondition({ type: 'supply_below', faction: 'RS', threshold: 40 }, state)).toBe(false);
    });

    it('supply_above: true when above threshold', () => {
        const state = minState();
        expect(evaluateCondition({ type: 'supply_above', faction: 'RS', threshold: 40 }, state)).toBe(true);
    });

    it('flag_equals: matches set flag', () => {
        const state = minState();
        (state.military as any).event_flags = { rs_strategic_goals: 'all_six' };
        expect(evaluateCondition({ type: 'flag_equals', flag: 'rs_strategic_goals', value: 'all_six' }, state)).toBe(true);
    });

    it('flag_equals: false when different value', () => {
        const state = minState();
        (state.military as any).event_flags = { rs_strategic_goals: 'selective' };
        expect(evaluateCondition({ type: 'flag_equals', flag: 'rs_strategic_goals', value: 'all_six' }, state)).toBe(false);
    });

    it('flag_not_set: true when flag missing', () => {
        const state = minState();
        (state.military as any).event_flags = {};
        expect(evaluateCondition({ type: 'flag_not_set', flag: 'nonexistent' }, state)).toBe(true);
    });

    it('flag_not_set: false when flag exists', () => {
        const state = minState();
        (state.military as any).event_flags = { test: 'yes' };
        expect(evaluateCondition({ type: 'flag_not_set', flag: 'test' }, state)).toBe(false);
    });

    it('dimension_below: true when effective below threshold', () => {
        const state = minState();
        (state.military as any).negotiation.strategic_dimensions = {
            RS: { international_standing: { base_value: 60, event_modifier: -25, effective_value: 35 } },
        };
        expect(evaluateCondition({ type: 'dimension_below', faction: 'RS', dimension: 'international_standing', threshold: 40 }, state)).toBe(true);
    });

    it('dimension_above: true when effective above threshold', () => {
        const state = minState();
        (state.military as any).negotiation.strategic_dimensions = {
            RBiH: { international_standing: { base_value: 60, event_modifier: 10, effective_value: 70 } },
        };
        expect(evaluateCondition({ type: 'dimension_above', faction: 'RBiH', dimension: 'international_standing', threshold: 60 }, state)).toBe(true);
    });

    it('event_fire_count: true when fired enough times', () => {
        const state = minState();
        (state.military as any).event_fire_counts = { srebrenica_assault: 2 };
        expect(evaluateCondition({ type: 'event_fire_count', event_id: 'srebrenica_assault', min_count: 2 }, state)).toBe(true);
    });

    it('event_fire_count: false when not fired enough', () => {
        const state = minState();
        (state.military as any).event_fire_counts = { srebrenica_assault: 1 };
        expect(evaluateCondition({ type: 'event_fire_count', event_id: 'srebrenica_assault', min_count: 2 }, state)).toBe(false);
    });

    it('week_since_event: true when enough weeks passed', () => {
        const state = minState(); // turn 20
        (state.military as any).event_last_fired_turn = { camp_revelations: 10 };
        expect(evaluateCondition({ type: 'week_since_event', event_id: 'camp_revelations', min_weeks: 8 }, state)).toBe(true);
    });

    it('week_since_event: false when not enough weeks', () => {
        const state = minState(); // turn 20
        (state.military as any).event_last_fired_turn = { camp_revelations: 15 };
        expect(evaluateCondition({ type: 'week_since_event', event_id: 'camp_revelations', min_weeks: 8 }, state)).toBe(false);
    });

    it('war_crimes_above: true when above threshold', () => {
        const state = minState();
        (state.military as any).negotiation.capital = { RS: { war_crimes_events: 5 } };
        expect(evaluateCondition({ type: 'war_crimes_above', faction: 'RS', threshold: 3 }, state)).toBe(true);
    });

    it('patron_pressure_above: true when override_authority above threshold', () => {
        const state = minState();
        (state.military as any).negotiation.patron_relationships = { RS: { override_authority: 45 } };
        expect(evaluateCondition({ type: 'patron_pressure_above', faction: 'RS', threshold: 40 }, state)).toBe(true);
    });

    it('territory_percentage above: true when faction holds enough', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RS', 'op:a:a_2': 'RS', 'op:a:a_3': 'RS',
            'op:b:b_1': 'RBiH', 'op:b:b_2': 'RBiH',
        };
        expect(evaluateCondition({ type: 'territory_percentage', faction: 'RS', comparator: 'above', threshold: 0.5 }, state)).toBe(true);
    });

    it('territory_percentage below: true when faction holds less', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RS', 'op:a:a_2': 'RS', 'op:a:a_3': 'RS',
            'op:b:b_1': 'RBiH', 'op:b:b_2': 'RBiH',
        };
        expect(evaluateCondition({ type: 'territory_percentage', faction: 'RBiH', comparator: 'below', threshold: 0.5 }, state)).toBe(true);
    });

    it('morale_average_below: true when avg morale is low', () => {
        const state = minState();
        (state.military as any).formations = {
            bde1: { faction: 'RS', kind: 'brigade', status: 'active', morale: 20 },
            bde2: { faction: 'RS', kind: 'brigade', status: 'active', morale: 30 },
            bde3: { faction: 'RBiH', kind: 'brigade', status: 'active', morale: 80 },
        };
        expect(evaluateCondition({ type: 'morale_average_below', faction: 'RS', threshold: 30 }, state)).toBe(true); // avg 25
    });

    // ── enclave_supply_status (v0.7.0) ──────────────────────────────

    it('enclave_supply_status: true when OSID in municipality has critical supply', () => {
        const state = minState();
        (state.political as any).last_supply_state_by_osid = {
            'op:srebrenica:srebrenica_2': 'critical',
            'op:srebrenica:potocari_2': 'strained',
            'op:gorazde:gorazde_2': 'adequate',
        };
        expect(evaluateCondition({ type: 'enclave_supply_status', municipality: 'srebrenica', status: 'critical' }, state)).toBe(true);
    });

    it('enclave_supply_status: true when checking strained and OSID is critical (worse than target)', () => {
        const state = minState();
        (state.political as any).last_supply_state_by_osid = {
            'op:srebrenica:srebrenica_2': 'critical',
        };
        expect(evaluateCondition({ type: 'enclave_supply_status', municipality: 'srebrenica', status: 'strained' }, state)).toBe(true);
    });

    it('enclave_supply_status: false when supply is adequate', () => {
        const state = minState();
        (state.political as any).last_supply_state_by_osid = {
            'op:srebrenica:srebrenica_2': 'adequate',
            'op:srebrenica:potocari_2': 'adequate',
        };
        expect(evaluateCondition({ type: 'enclave_supply_status', municipality: 'srebrenica', status: 'critical' }, state)).toBe(false);
    });

    it('enclave_supply_status: false when no supply data', () => {
        const state = minState();
        expect(evaluateCondition({ type: 'enclave_supply_status', municipality: 'srebrenica', status: 'critical' }, state)).toBe(false);
    });

    // ── corridor_severed (v0.7.0) ────────────────────────────────────

    it('corridor_severed: true when enemy OSID blocks path', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RBiH',
            'op:a:a_2': 'RS', // blocks path
            'op:a:a_3': 'RBiH',
        };
        (state as any).derived = {
            edges: [
                { a: 'op:a:a_1', b: 'op:a:a_2' },
                { a: 'op:a:a_2', b: 'op:a:a_3' },
            ],
        };
        expect(evaluateCondition({ type: 'corridor_severed', from_osid: 'op:a:a_1', to_osid: 'op:a:a_3', faction: 'RBiH' }, state)).toBe(true);
    });

    it('corridor_severed: false when path exists through friendly territory', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RBiH',
            'op:a:a_2': 'RBiH',
            'op:a:a_3': 'RBiH',
        };
        (state as any).derived = {
            edges: [
                { a: 'op:a:a_1', b: 'op:a:a_2' },
                { a: 'op:a:a_2', b: 'op:a:a_3' },
            ],
        };
        expect(evaluateCondition({ type: 'corridor_severed', from_osid: 'op:a:a_1', to_osid: 'op:a:a_3', faction: 'RBiH' }, state)).toBe(false);
    });

    it('corridor_severed: true when start OSID not held by faction', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RS',
            'op:a:a_3': 'RBiH',
        };
        expect(evaluateCondition({ type: 'corridor_severed', from_osid: 'op:a:a_1', to_osid: 'op:a:a_3', faction: 'RBiH' }, state)).toBe(true);
    });

    it('corridor_severed: false when no edges (cannot evaluate)', () => {
        const state = minState();
        state.political.political_controllers = {
            'op:a:a_1': 'RBiH',
            'op:a:a_3': 'RBiH',
        };
        expect(evaluateCondition({ type: 'corridor_severed', from_osid: 'op:a:a_1', to_osid: 'op:a:a_3', faction: 'RBiH' }, state)).toBe(false);
    });
});
