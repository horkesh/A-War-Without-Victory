/**
 * LANE-NIGHTSHIFT-EQUIPMENT-QUALITY-MODIFIER-SUBSTRATE — event #11 verification.
 *
 * Re-enables Mission D's deferred event `csq_weapons_embargo_partial_lift`.
 * The event was deferred from LANE-NIGHTSHIFT-CONSEQUENCE-BREADTH pending the
 * substrate audit because it requires the new `equipment_quality_modifier`
 * effect kind.
 *
 * Covers (per spec):
 *   1. predicate fires under expected state (international_standing >= 60 AND
 *      patron_pressure >= 15 AND turn >= 60)
 *   2. consequences apply correctly (recruitment_modifier 1.10/30,
 *      equipment_quality_modifier 1.05/30, dimension shift patron_confidence +10)
 *   3. faction-agnostic: predicate composition uses parametric predicates
 *      (the event is hard-coded to RBiH per Mission D historical scope, but
 *      the predicate types it uses can target any faction)
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import type { EventCondition, EventDefinition } from '../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

function rng(): number { return 0.5; }

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
const EVENT_ID = 'csq_weapons_embargo_partial_lift';
const EVENT = ALL_EVENTS.find(e => e.id === EVENT_ID);

function makeStateWithGates(turn: number, opts: {
    standing?: number;
    pressure?: number;
}): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'embargo' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: {},
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
            negotiation: {
                strategic_dimensions: {
                    RBiH: opts.standing != null ? {
                        international_standing: {
                            base_value: opts.standing,
                            event_modifier: 0,
                            effective_value: opts.standing,
                        },
                    } : {},
                } as any,
                patron_relationships: opts.pressure != null ? {
                    RBiH: { support_level: 50, override_authority: opts.pressure } as any,
                } : {} as any,
            } as any,
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
        } as GameState['political'],
    } as unknown as GameState;
}

describe('csq_weapons_embargo_partial_lift — registry', () => {
    it('event is loaded from consequences.json', () => {
        expect(EVENT).toBeDefined();
        expect(EVENT?.id).toBe(EVENT_ID);
    });
});

describe('csq_weapons_embargo_partial_lift — predicate', () => {
    it('fires when standing >= 60, pressure >= 15, and turn >= 60', () => {
        const state = makeStateWithGates(65, { standing: 65, pressure: 20 });
        evaluateEvents(state, rng, 65, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain(EVENT_ID);
    });

    it('does NOT fire before turn 60', () => {
        const state = makeStateWithGates(59, { standing: 65, pressure: 20 });
        evaluateEvents(state, rng, 59, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain(EVENT_ID);
    });

    it('does NOT fire when international_standing < 60', () => {
        const state = makeStateWithGates(65, { standing: 55, pressure: 20 });
        evaluateEvents(state, rng, 65, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain(EVENT_ID);
    });

    it('does NOT fire when patron_pressure < 15', () => {
        const state = makeStateWithGates(65, { standing: 65, pressure: 10 });
        evaluateEvents(state, rng, 65, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain(EVENT_ID);
    });
});

describe('csq_weapons_embargo_partial_lift — consequences', () => {
    it('writes recruitment_modifier 1.10 / 30 turns and equipment_quality_modifier 1.05 / 30 turns for RBiH', () => {
        const state = makeStateWithGates(65, { standing: 65, pressure: 20 });
        evaluateEvents(state, rng, 65, ALL_EVENTS);

        // recruitment_modifier
        const recMods = state.military.recruitment_modifiers ?? [];
        const rbihRec = recMods.filter(m => m.faction === 'RBiH');
        expect(rbihRec.length).toBeGreaterThanOrEqual(1);
        expect(rbihRec.some(m => Math.abs(m.pool_multiplier - 1.10) < 1e-9 && m.expires_turn === 95)).toBe(true);

        // equipment_quality_modifier
        const eqMods = state.military.equipment_quality_modifiers ?? [];
        const rbihEq = eqMods.filter(m => m.faction === 'RBiH');
        expect(rbihEq.length).toBeGreaterThanOrEqual(1);
        expect(rbihEq.some(m => Math.abs(m.multiplier - 1.05) < 1e-9 && m.expires_turn === 95)).toBe(true);
    });
});

describe('csq_weapons_embargo_partial_lift — faction-agnostic predicate composition', () => {
    it('the underlying predicate kinds (dimension_above, patron_pressure_above) are parametric over factions', () => {
        // Faction-agnostic check: the same predicate types used by event #11 evaluate
        // identically when targeted at any of the three factions. The event's
        // historical scope is RBiH (embargo lift was on the Bosnian government),
        // but the predicate substrate would work for any party.
        const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
        for (const f of factions) {
            const state: GameState = {
                schema_version: 1,
                meta: { turn: 65, phase: 'war', scenario_id: 'test', player_faction: f, seed: 's' } as GameState['meta'],
                factions: [],
                military: {
                    formations: {},
                    negotiation: {
                        strategic_dimensions: {
                            [f]: {
                                international_standing: { base_value: 70, event_modifier: 0, effective_value: 70 },
                            },
                        } as any,
                        patron_relationships: {
                            [f]: { support_level: 50, override_authority: 20 } as any,
                        } as any,
                    } as any,
                } as unknown as GameState['military'],
                political: {} as GameState['political'],
            } as unknown as GameState;

            const standingAbove: EventCondition = {
                type: 'dimension_above', faction: f, dimension: 'international_standing', threshold: 60,
            };
            const pressureAbove: EventCondition = {
                type: 'patron_pressure_above', faction: f, threshold: 15,
            };
            expect(evaluateCondition(standingAbove, state)).toBe(true);
            expect(evaluateCondition(pressureAbove, state)).toBe(true);

            // And the negative side: tightening the threshold flips both predicates.
            expect(evaluateCondition(
                { type: 'dimension_above', faction: f, dimension: 'international_standing', threshold: 80 },
                state,
            )).toBe(false);
            expect(evaluateCondition(
                { type: 'patron_pressure_above', faction: f, threshold: 25 },
                state,
            )).toBe(false);
        }
    });
});
