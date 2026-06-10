/**
 * Robustness audit P1-B / P2-B (task #95,
 * docs/40_reports/proposals/20260609_1.0_ROBUSTNESS_LANDMINE_AUDIT.md):
 * event-effect numeric payloads reach persisted morale / cohesion / supply /
 * alliance / negotiation-capital fields. A non-finite delta (NaN / ±Infinity)
 * must NEVER persist:
 *  - the writer keeps the prior value (effect is a deterministic no-op), and
 *  - the rejection is logged to the append-only `military.event_effect_anomalies`
 *    diagnostic (observability-only; never read by sim logic), and
 *  - the hardened `clamp` traps NaN to its floor as a backstop.
 * Finite deltas behave exactly as before, and no anomaly log is allocated on a
 * well-formed path (byte-identical serialization by construction).
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { EventEffect } from '../src/sim/events/event_types.js';

function fixtureState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 7, seed: 'nonfinite-guard' },
        factions: [],
        military: {
            formations: {
                brig_rbih_1: {
                    id: 'brig_rbih_1', faction: 'RBiH', name: '1st', created_turn: 0,
                    status: 'active', assignment: null, morale: 60, cohesion: 55,
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 40, RS: 50, HRHB: 45 },
            negotiation: {
                capital: {
                    RBiH: { war_crimes_events: 2, territorial_legitimacy: 10 },
                },
                patron_relationships: {
                    RS: { support_level: 70 },
                },
            },
        } as any,
        political: { war_alliance_rbih_hrhb: 0.25 } as any,
        displacement: {} as any,
    };
}

function anomalies(state: GameState): Array<{ turn: number; effect_kind: string; faction: string | null; value_repr: string }> {
    return (state.military as any).event_effect_anomalies ?? [];
}

describe('apply_effects non-finite payload guard (P1-B)', () => {
    it('finite deltas apply exactly as before and allocate NO anomaly log (calibration-inert)', () => {
        const state = fixtureState();
        applyEventEffects(state, [
            { kind: 'morale_change', faction: 'RBiH', delta: 5 } as EventEffect,
            { kind: 'supply_delta', faction: 'RBiH', delta: -10 } as EventEffect,
            { kind: 'alliance_change', delta: 0.1 } as EventEffect,
        ]);
        expect((state.military.formations as any).brig_rbih_1.morale).toBe(65);
        expect((state.military as any).general_supply_reserve.RBiH).toBe(30);
        expect(state.political.war_alliance_rbih_hrhb).toBeCloseTo(0.35, 10);
        // The diagnostic array must NOT exist on a well-formed path — its absence is
        // what keeps the historical-default serialized state byte-identical.
        expect((state.military as any).event_effect_anomalies).toBeUndefined();
    });

    it('NaN morale delta keeps prior morale and logs the rejection', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'morale_change', faction: 'RBiH', delta: NaN } as EventEffect]);
        expect((state.military.formations as any).brig_rbih_1.morale).toBe(60);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'morale_change', faction: 'RBiH', value_repr: 'NaN' },
        ]);
    });

    it('NaN cohesion delta keeps prior cohesion and logs the rejection', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'cohesion_change', faction: 'RBiH', delta: NaN } as EventEffect]);
        expect((state.military.formations as any).brig_rbih_1.cohesion).toBe(55);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'cohesion_change', faction: 'RBiH', value_repr: 'NaN' },
        ]);
    });

    it('Infinity supply delta keeps prior reserve (unbounded += accumulator guarded)', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'supply_delta', faction: 'RBiH', delta: Infinity } as EventEffect]);
        expect((state.military as any).general_supply_reserve.RBiH).toBe(40);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'supply_delta', faction: 'RBiH', value_repr: 'Infinity' },
        ]);
    });

    it('NaN humanitarian war_crimes_delta keeps prior accumulator and logs', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'humanitarian_impact', faction: 'RBiH', war_crimes_delta: NaN } as EventEffect]);
        expect((state.military as any).negotiation.capital.RBiH.war_crimes_events).toBe(2);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'humanitarian_impact', faction: 'RBiH', value_repr: 'NaN' },
        ]);
    });

    it('NaN patron pressure keeps prior support_level and logs', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'patron_pressure', faction: 'RS', delta: NaN } as EventEffect]);
        expect((state.military as any).negotiation.patron_relationships.RS.support_level).toBe(70);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'patron_pressure', faction: 'RS', value_repr: 'NaN' },
        ]);
    });

    it('NaN alliance delta keeps the prior FLOAT value (P2-B: NaN survives lock-bound compares)', () => {
        const state = fixtureState();
        applyEventEffects(state, [{ kind: 'alliance_change', delta: NaN } as EventEffect]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(0.25);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'alliance_change', faction: null, value_repr: 'NaN' },
        ]);
    });

    it('-Infinity negotiation_capital delta keeps prior dimension value and logs', () => {
        const state = fixtureState();
        applyEventEffects(state, [
            { kind: 'negotiation_capital', faction: 'RBiH', dimension: 'territorial_legitimacy', delta: -Infinity } as EventEffect,
        ]);
        expect((state.military as any).negotiation.capital.RBiH.territorial_legitimacy).toBe(10);
        expect(anomalies(state)).toEqual([
            { turn: 7, effect_kind: 'negotiation_capital', faction: 'RBiH', value_repr: '-Infinity' },
        ]);
    });

    it('non-finite aggression / equipment-quality payloads push NO entry and log', () => {
        const state = fixtureState();
        applyEventEffects(state, [
            { kind: 'aggression_modifier', faction: 'RS', delta: NaN, duration_turns: 4 } as EventEffect,
            { kind: 'equipment_quality_modifier', faction: 'HRHB', multiplier: Infinity, duration_turns: 4 } as EventEffect,
        ]);
        expect((state.military as any).event_aggression_modifiers ?? []).toEqual([]);
        expect((state.military as any).equipment_quality_modifiers ?? []).toEqual([]);
        expect(anomalies(state).map(a => a.effect_kind).sort()).toEqual(
            ['aggression_modifier', 'equipment_quality_modifier']
        );
    });

    it('hardened clamp backstop: NaN guerrilla intensity persists as the floor (0), never NaN', () => {
        const state = fixtureState();
        applyEventEffects(state, [
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['zvornik'], intensity: NaN, duration_turns: 6 } as EventEffect,
        ]);
        const threats = (state.military as any).guerrilla_threats;
        expect(threats).toHaveLength(1);
        expect(threats[0].intensity).toBe(0);
        expect(Number.isFinite(threats[0].intensity)).toBe(true);
    });
});
