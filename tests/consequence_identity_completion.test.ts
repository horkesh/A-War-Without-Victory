/**
 * v0.9.0 Consequence System closure: RBiH identity follow-through.
 *
 * The original seven-chain plan left the civic path historical and the
 * pragmatic path as a weaker future variant. The refreshed milestone can close
 * that non-sensitive gap with two bounded, live-substrate events:
 *   - civic identity consolidation rewards the historical civic commitment;
 *   - pragmatic coalition drift captures the weaker compromise cost/benefit.
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

function rng(): number { return 0.5; }

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
const CSQ_EVENTS = ALL_EVENTS.filter(e => e.id.startsWith('csq_'));

function getEvent(id: string): EventDefinition {
    const ev = ALL_EVENTS.find(e => e.id === id);
    if (!ev) throw new Error(`event ${id} missing`);
    return ev;
}

function effectsOf(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function dim(value = 50) {
    return { base_value: value, event_modifier: 0, effective_value: value };
}

function makeState(turn: number, identity: 'civic' | 'pragmatic' | 'bosniak_national'): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'identity-csq' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_brig_1: {
                    id: 'rbih_brig_1',
                    faction: 'RBiH',
                    name: 'B1',
                    kind: 'brigade',
                    status: 'active',
                    assignment: null,
                    created_turn: 0,
                    morale: 60,
                    cohesion: 60,
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
            event_flags: { rbih_state_identity: identity },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
            negotiation: {
                strategic_dimensions: {
                    RBiH: {
                        military_credibility: dim(),
                        territorial_legitimacy: dim(),
                        international_standing: dim(55),
                        patron_confidence: dim(),
                        internal_cohesion: dim(45),
                        negotiating_leverage: dim(55),
                    },
                    RS: {} as any,
                    HRHB: {} as any,
                },
                patron_relationships: {
                    RBiH: { support_level: 50, override_authority: 0 } as any,
                    RS: { support_level: 50, override_authority: 0 } as any,
                    HRHB: { support_level: 50, override_authority: 0 } as any,
                },
                capital: {
                    RBiH: { war_crimes_events: 0, patron_pressure: 0 } as any,
                    RS: { war_crimes_events: 0, patron_pressure: 0 } as any,
                    HRHB: { war_crimes_events: 0, patron_pressure: 0 } as any,
                },
            } as any,
        } as unknown as GameState['military'],
        political: { war_alliance_rbih_hrhb: 0.5, political_controllers: {} } as GameState['political'],
    } as unknown as GameState;
}

describe('v0.9.0 identity chain completion', () => {
    it('ships the two non-sensitive RBiH identity follow-through events', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_civic_identity_consolidation_1993')).toBe(true);
        expect(ids.has('csq_pragmatic_coalition_1993')).toBe(true);
    });

    it('civic identity consolidation fires after the founding choice and records live effects', () => {
        const state = makeState(35, 'civic');
        evaluateEvents(state, rng, 35, CSQ_EVENTS);

        expect(state.military.fired_event_ids).toContain('csq_civic_identity_consolidation_1993');
        expect(state.military.event_flags?.civic_identity_consolidation_1993).toBe(true);
        expect(state.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.04)).toBe(true);
        expect(buildCostLedger(state).annotations?.find(a => a.tag === 'civic_identity_consolidation_1993')).toBeTruthy();
    });

    it('pragmatic coalition fires later than the founding decision and carries the weaker mixed result', () => {
        const state = makeState(42, 'pragmatic');
        evaluateEvents(state, rng, 42, CSQ_EVENTS);

        expect(state.military.fired_event_ids).toContain('csq_pragmatic_coalition_1993');
        expect(state.military.event_flags?.pragmatic_coalition_1993).toBe(true);
        expect(state.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.02)).toBe(true);
        expect(buildCostLedger(state).annotations?.find(a => a.tag === 'pragmatic_coalition_1993')).toBeTruthy();
    });

    it('neither follow-through event fires during the initial decision window', () => {
        const civic = makeState(15, 'civic');
        const pragmatic = makeState(15, 'pragmatic');

        evaluateEvents(civic, rng, 15, CSQ_EVENTS);
        evaluateEvents(pragmatic, rng, 15, CSQ_EVENTS);

        expect(civic.military.fired_event_ids).not.toContain('csq_civic_identity_consolidation_1993');
        expect(pragmatic.military.fired_event_ids).not.toContain('csq_pragmatic_coalition_1993');
    });

    it('effects remain live if applied directly by the event bus', () => {
        const civic = makeState(35, 'civic');
        const def = getEvent('csq_civic_identity_consolidation_1993');
        applyEventEffects(civic, effectsOf(def));
        expect((civic.military.formations as any).rbih_brig_1.cohesion).toBeGreaterThan(60);
        expect(civic.military.recruitment_modifiers).toHaveLength(1);
    });
});
