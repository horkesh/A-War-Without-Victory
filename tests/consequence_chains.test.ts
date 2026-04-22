/**
 * v0.9.0 Consequence System — integration tests for authored divergence chains.
 *
 * Verifies:
 *   - consequences.json loads via event_loader.
 *   - Each chain is gated by its ahistorical flag (NO csq_* event fires on
 *     the historical path).
 *   - Each chain event fires within its declared turn window when the flag
 *     is set and downstream effects land on MilitaryState.
 *
 * Writers and engine consumers are covered by sibling files:
 *   tests/consequence_effects.test.ts (writer contracts)
 *   tests/consequence_consumers.test.ts (reader / pipeline contracts)
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

/** Deterministic RNG for probabilistic events (consequence chains are
 *  flag-gated, not probabilistic, but evaluateEvents requires an rng). */
function rng(): number { return 0.5; }

function makeRBiHState(turn: number, flags: Record<string, string | number | boolean> = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'csq' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_brig_1: {
                    id: 'rbih_brig_1', faction: 'RBiH', name: 'B1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale: 60, cohesion: 70,
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: { ...flags },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
        } as GameState['political'],
    } as unknown as GameState;
}

// Load the real consequences.json through the event loader to prove the
// loader wiring works end to end.
const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
const CSQ_EVENTS = ALL_EVENTS.filter(e => e.id.startsWith('csq_'));

describe('consequences.json loads via event_loader', () => {
    it('loader returns at least one csq_ event', () => {
        expect(CSQ_EVENTS.length).toBeGreaterThan(0);
    });

    it('Chain 6 events are all present in the registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_minority_defections_1992')).toBe(true);
        expect(ids.has('csq_bosniak_unity_1993')).toBe(true);
        expect(ids.has('csq_international_disillusionment_1993')).toBe(true);
    });
});

describe('Chain 6 — RBiH Identity: historical path fires nothing', () => {
    it('no csq_ event fires when rbih_state_identity is unset', () => {
        const state = makeRBiHState(15);
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });

    it('no csq_ event fires when rbih_state_identity = civic (historical)', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'civic' });
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });

    it('no csq_ event fires when rbih_state_identity = pragmatic', () => {
        // pragmatic is a weaker variant; MVP only gates on bosniak_national.
        const state = makeRBiHState(15, { rbih_state_identity: 'pragmatic' });
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });
});

describe('Chain 6 — RBiH Identity: ahistorical path fires chain', () => {
    it('csq_minority_defections_1992 fires in w8-w20 when flag = bosniak_national', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 15, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 does NOT fire before w8', () => {
        const state = makeRBiHState(6, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 6, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 does NOT fire after w20', () => {
        const state = makeRBiHState(25, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 25, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 lands a recruitment_modifier and morale drop', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'bosniak_national' });
        const moraleBefore = (state.military.formations as any).rbih_brig_1.morale;
        evaluateEvents(state, rng, 15, ALL_EVENTS);
        const mods = state.military.recruitment_modifiers ?? [];
        const rbihMods = mods.filter(m => m.faction === 'RBiH');
        expect(rbihMods).toHaveLength(1);
        expect(rbihMods[0].pool_multiplier).toBeCloseTo(0.80);
        const moraleAfter = (state.military.formations as any).rbih_brig_1.morale;
        expect(moraleAfter).toBeLessThan(moraleBefore);
    });

    it('csq_bosniak_unity_1993 fires in w30-w55 with +1.15 recruitment modifier', () => {
        const state = makeRBiHState(40, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 40, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_bosniak_unity_1993');
        const mods = state.military.recruitment_modifiers ?? [];
        const unityMod = mods.find(m => m.pool_multiplier > 1);
        expect(unityMod).toBeDefined();
        expect(unityMod!.pool_multiplier).toBeCloseTo(1.15);
    });

    it('csq_international_disillusionment_1993 requires low international_standing', () => {
        // With no strategic_dimensions configured, dimension_below defaults to 50
        // → NOT below 40 → event should NOT fire.
        const stateHigh = makeRBiHState(50, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(stateHigh, rng, 50, ALL_EVENTS);
        expect(stateHigh.military.fired_event_ids ?? []).not.toContain('csq_international_disillusionment_1993');
    });

    it('csq_international_disillusionment_1993 fires when both gates are met', () => {
        const state = makeRBiHState(50, { rbih_state_identity: 'bosniak_national' });
        state.military.negotiation = {
            strategic_dimensions: {
                RBiH: {
                    international_standing: { base_value: 30, event_modifier: 0, effective_value: 30 },
                } as any,
            } as any,
        } as any;
        evaluateEvents(state, rng, 50, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_international_disillusionment_1993');
    });
});
