/**
 * v0.9.0 Packet C2 pressure completion: patron-distance mirror closure.
 *
 * These tests prove the non-RS patron-distance chain has real consequence
 * writers before the catalog is extended:
 *   - RBiH / HRHB formal arms-review triggers set faction-scoped flags.
 *   - RBiH / HRHB partial-disavowal triggers consume those flags.
 *   - Both stages write live substrates already consumed elsewhere:
 *     recruitment_modifier, supply_delta or patron_pressure, and CostLedger.
 *
 * No new condition kind, effect kind, or sensitive-history surface is added.
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);

function getEvent(id: string): EventDefinition {
    const ev = ALL_EVENTS.find(e => e.id === id);
    if (!ev) throw new Error(`event ${id} missing from consequences.json`);
    return ev;
}

function effectsOf(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function dims(patronConfidence: number) {
    const dim = (value = 50) => ({ base_value: value, event_modifier: 0, effective_value: value });
    return {
        military_credibility: dim(),
        territorial_legitimacy: dim(),
        international_standing: dim(),
        patron_confidence: dim(patronConfidence),
        internal_cohesion: dim(),
        negotiating_leverage: dim(),
    };
}

function capital() {
    return {
        military_advantage: 0,
        territorial_control: 0,
        civilian_harm: 0,
        war_crimes_events: 0,
        displacement_burden: 0,
        international_support: 0,
        exhaustion: 0,
        patron_pressure: 0,
    };
}

function baseState(turn: number): GameState {
    return {
        schema_version: 1,
        meta: {
            turn,
            phase: 'war',
            scenario_id: 'test',
            player_faction: 'RBiH',
            seed: 'c2-patron-distance',
        } as GameState['meta'],
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
            general_supply_reserve: { RBiH: 55, RS: 70, HRHB: 45 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: {},
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
            negotiation: {
                strategic_dimensions: {
                    RBiH: dims(50),
                    RS: dims(50),
                    HRHB: dims(50),
                },
                patron_relationships: {
                    RBiH: { override_authority: 30, support_level: 30 } as any,
                    RS: { override_authority: 30, support_level: 30 } as any,
                    HRHB: { override_authority: 30, support_level: 30 } as any,
                },
                capital: {
                    RBiH: capital(),
                    RS: capital(),
                    HRHB: capital(),
                },
            },
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 1,
            political_controllers: {},
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function setPatronConfidence(state: GameState, faction: FactionId, value: number): void {
    (state.military.negotiation as any).strategic_dimensions[faction] = dims(value);
}

describe('Packet C2 patron-distance pressure completion', () => {
    it('csq_patron_arms_review_imposed_RBiH fires on RBiH resistance + low patron confidence', () => {
        const def = getEvent('csq_patron_arms_review_imposed_RBiH');
        const cond = def.trigger.condition!;
        const fires = baseState(18);
        fires.military.event_flags = { patron_resist_streak_RBiH: 3 };
        setPatronConfidence(fires, 'RBiH', 35);

        const lapsed = baseState(18);
        lapsed.military.event_flags = { patron_resist_streak_RBiH: 3 };
        setPatronConfidence(lapsed, 'RBiH', 40);

        expect(evaluateCondition(cond, fires)).toBe(true);
        expect(evaluateCondition(cond, lapsed)).toBe(false);
        expect(def.sets_flags).toMatchObject({
            patron_arms_review_active_RBiH: 1,
            patron_arms_review_imposed_turn_RBiH: 1,
        });

        const supplyBefore = fires.military.general_supply_reserve!.RBiH;
        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.general_supply_reserve!.RBiH).toBeLessThan(supplyBefore);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.90)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find(a => a.tag === 'patron_arms_review_imposed_RBiH')).toBeTruthy();
    });

    it('csq_patron_disavowal_partial_RBiH consumes the RBiH review flag and records disavowal', () => {
        const def = getEvent('csq_patron_disavowal_partial_RBiH');
        const cond = def.trigger.condition!;
        const fires = baseState(28);
        fires.military.event_flags = { patron_arms_review_active_RBiH: 1, patron_resist_streak_RBiH: 5 };

        const lapsed = baseState(28);
        lapsed.military.event_flags = { patron_resist_streak_RBiH: 5 };

        expect(evaluateCondition(cond, fires)).toBe(true);
        expect(evaluateCondition(cond, lapsed)).toBe(false);
        expect(def.sets_flags).toMatchObject({ patron_partial_disavowal_RBiH: true });

        applyEventEffects(fires, effectsOf(def));
        expect((fires.military.negotiation as any).patron_relationships.RBiH.support_level).toBeLessThan(30);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.85)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find(a => a.tag === 'patron_partial_disavowal_RBiH')).toBeTruthy();
    });

    it('csq_patron_arms_review_imposed_HRHB fires on HRHB resistance + low patron confidence', () => {
        const def = getEvent('csq_patron_arms_review_imposed_HRHB');
        const cond = def.trigger.condition!;
        const fires = baseState(18);
        fires.military.event_flags = { patron_resist_streak_HRHB: 3 };
        setPatronConfidence(fires, 'HRHB', 35);

        const lapsed = baseState(18);
        lapsed.military.event_flags = { patron_resist_streak_HRHB: 1 };
        setPatronConfidence(lapsed, 'HRHB', 35);

        expect(evaluateCondition(cond, fires)).toBe(true);
        expect(evaluateCondition(cond, lapsed)).toBe(false);
        expect(def.sets_flags).toMatchObject({
            patron_arms_review_active_HRHB: 1,
            patron_arms_review_imposed_turn_HRHB: 1,
        });

        const supplyBefore = fires.military.general_supply_reserve!.HRHB;
        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.general_supply_reserve!.HRHB).toBeLessThan(supplyBefore);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.90)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find(a => a.tag === 'patron_arms_review_imposed_HRHB')).toBeTruthy();
    });

    it('csq_patron_disavowal_partial_HRHB consumes the HRHB review flag and records disavowal', () => {
        const def = getEvent('csq_patron_disavowal_partial_HRHB');
        const cond = def.trigger.condition!;
        const fires = baseState(28);
        fires.military.event_flags = { patron_arms_review_active_HRHB: 1, patron_resist_streak_HRHB: 5 };

        const lapsed = baseState(28);
        lapsed.military.event_flags = { patron_arms_review_active_HRHB: 1, patron_resist_streak_HRHB: 3 };

        expect(evaluateCondition(cond, fires)).toBe(true);
        expect(evaluateCondition(cond, lapsed)).toBe(false);
        expect(def.sets_flags).toMatchObject({ patron_partial_disavowal_HRHB: true });

        applyEventEffects(fires, effectsOf(def));
        expect((fires.military.negotiation as any).patron_relationships.HRHB.support_level).toBeLessThan(30);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.85)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find(a => a.tag === 'patron_partial_disavowal_HRHB')).toBeTruthy();
    });
});
