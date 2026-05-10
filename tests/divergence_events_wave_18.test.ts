/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-18
 *
 * Four additive Ring 1 / no-section-6 consequence authoring records.
 * No new condition kinds, effect kinds, state fields, or sensitive-history
 * rupture wiring are introduced in this lane.
 */
import { describe, expect, it } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);

const WAVE_18_IDS = [
    'csq_third_party_arms_channel_HRHB',
    'csq_captured_equipment_windfall_HRHB',
    'csq_winter_supply_attrition_RS',
    'csq_doctrine_drift_RS',
];

function getEvent(id: string): EventDefinition {
    const event = ALL_EVENTS.find((candidate) => candidate.id === id);
    if (!event) throw new Error(`event ${id} missing from consequences.json`);
    return event;
}

function effectsOf(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function strategicDims(overrides: Partial<Record<string, number>> = {}) {
    const dim = (key: string, fallback = 50) => {
        const value = overrides[key] ?? fallback;
        return { base_value: value, event_modifier: 0, effective_value: value };
    };
    return {
        military_credibility: dim('military_credibility'),
        territorial_legitimacy: dim('territorial_legitimacy'),
        international_standing: dim('international_standing'),
        patron_confidence: dim('patron_confidence'),
        internal_cohesion: dim('internal_cohesion'),
        negotiating_leverage: dim('negotiating_leverage'),
    };
}

function baseState(turn: number, opts: {
    rbihSupply?: number;
    rsSupply?: number;
    hrhbSupply?: number;
    rbihDims?: Partial<Record<string, number>>;
    rsDims?: Partial<Record<string, number>>;
    hrhbDims?: Partial<Record<string, number>>;
    turn_summaries?: any[];
} = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'wave18' } as GameState['meta'],
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
            general_supply_reserve: {
                RBiH: opts.rbihSupply ?? 50,
                RS: opts.rsSupply ?? 70,
                HRHB: opts.hrhbSupply ?? 40,
            },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            negotiation: {
                capital: {
                    RBiH: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    RS: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    HRHB: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                },
                patron_relationships: {
                    RBiH: { support_level: 60, override_authority: 0 } as any,
                    RS: { support_level: 70, override_authority: 0 } as any,
                    HRHB: { support_level: 60, override_authority: 0 } as any,
                },
                strategic_dimensions: {
                    RBiH: strategicDims(opts.rbihDims),
                    RS: strategicDims(opts.rsDims),
                    HRHB: strategicDims(opts.hrhbDims),
                },
            } as any,
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
        turn_summaries: opts.turn_summaries,
    } as unknown as GameState;
}

function rsFormation(morale = 40, cohesion = 60) {
    return {
        rs_b1: {
            id: 'rs_b1',
            faction: 'RS',
            kind: 'brigade',
            status: 'active',
            name: 'RS B1',
            created_turn: 0,
            assignment: null,
            morale,
            cohesion,
        } as any,
    };
}

function hrhbFormation(morale = 50, cohesion = 60) {
    return {
        h_b1: {
            id: 'h_b1',
            faction: 'HRHB',
            kind: 'brigade',
            status: 'active',
            name: 'HVO B1',
            created_turn: 0,
            assignment: null,
            morale,
            cohesion,
        } as any,
    };
}

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-18', () => {
    it('all four authored events load via event_loader', () => {
        for (const id of WAVE_18_IDS) {
            expect(ALL_EVENTS.find((event) => event.id === id)?.id).toBe(id);
        }
    });

    it('csq_third_party_arms_channel_HRHB: predicate and equipment-quality annotation', () => {
        const def = getEvent('csq_third_party_arms_channel_HRHB');
        const fires = baseState(65, { hrhbDims: { patron_confidence: 35 } });
        fires.military.negotiation!.patron_relationships!.HRHB = { support_level: 60, override_authority: 25 } as any;
        expect(evaluateCondition(def.trigger.condition!, fires)).toBe(true);

        const lapsed = baseState(65, { hrhbDims: { patron_confidence: 45 } });
        lapsed.military.negotiation!.patron_relationships!.HRHB = { support_level: 60, override_authority: 25 } as any;
        expect(evaluateCondition(def.trigger.condition!, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some((m) => m.faction === 'HRHB' && m.multiplier === 1.05)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find((a) => a.tag === 'third_party_arms_channel_HRHB')).toBeTruthy();
    });

    it('csq_captured_equipment_windfall_HRHB: predicate and morale uplift', () => {
        const def = getEvent('csq_captured_equipment_windfall_HRHB');
        const turn_summaries = [
            { turn: 75, territory_snapshot: { RBiH: 0.31, RS: 0.50, HRHB: 0.19 } },
            { turn: 74, territory_snapshot: { RBiH: 0.32, RS: 0.49, HRHB: 0.19 } },
            { turn: 73, territory_snapshot: { RBiH: 0.33, RS: 0.48, HRHB: 0.19 } },
            { turn: 72, territory_snapshot: { RBiH: 0.34, RS: 0.47, HRHB: 0.19 } },
            { turn: 71, territory_snapshot: { RBiH: 0.34, RS: 0.47, HRHB: 0.19 } },
            { turn: 70, territory_snapshot: { RBiH: 0.35, RS: 0.46, HRHB: 0.19 } },
        ];
        const fires = baseState(75, { turn_summaries });
        fires.military.formations = hrhbFormation(50);
        fires.military.event_flags = { major_operation_success_HRHB: 1 };
        expect(evaluateCondition(def.trigger.condition!, fires)).toBe(true);

        const lapsed = baseState(75, { turn_summaries });
        lapsed.military.formations = hrhbFormation(50);
        expect(evaluateCondition(def.trigger.condition!, lapsed)).toBe(false);

        const before = fires.military.formations.h_b1.morale ?? 0;
        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.morale).toBeGreaterThan(before);
        expect(buildCostLedger(fires).annotations?.find((a) => a.tag === 'captured_equipment_windfall_HRHB')).toBeTruthy();
    });

    it('csq_winter_supply_attrition_RS: predicate and supply/cohesion drain', () => {
        const def = getEvent('csq_winter_supply_attrition_RS');
        const fires = baseState(55, { rsSupply: 35 });
        fires.military.formations = rsFormation(50, 60);
        fires.military.event_flags = { war_exhaustion_x100_RS: 55 };
        expect(evaluateCondition(def.trigger.condition!, fires)).toBe(true);

        const lapsed = baseState(55, { rsSupply: 40 });
        lapsed.military.formations = rsFormation(50, 60);
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 55 };
        expect(evaluateCondition(def.trigger.condition!, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.general_supply_reserve!.RS).toBe(27);
        expect(fires.military.formations.rs_b1.cohesion).toBe(57);
        expect(buildCostLedger(fires).annotations?.find((a) => a.tag === 'winter_supply_attrition_RS')).toBeTruthy();
    });

    it('csq_doctrine_drift_RS: predicate and late-war institutional drag', () => {
        const def = getEvent('csq_doctrine_drift_RS');
        const fires = baseState(105);
        fires.military.formations = rsFormation(40, 60);
        fires.military.event_flags = {
            corps_reorganization_active_RS: 1,
            war_exhaustion_x100_RS: 75,
        };
        expect(evaluateCondition(def.trigger.condition!, fires)).toBe(true);

        const lapsed = baseState(105);
        lapsed.military.formations = rsFormation(50, 60);
        lapsed.military.event_flags = {
            corps_reorganization_active_RS: 1,
            war_exhaustion_x100_RS: 75,
        };
        expect(evaluateCondition(def.trigger.condition!, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rs_b1.cohesion).toBe(57);
        expect(fires.military.recruitment_modifiers?.some((m) => m.faction === 'RS' && m.pool_multiplier === 0.94)).toBe(true);
        expect(buildCostLedger(fires).annotations?.find((a) => a.tag === 'doctrine_drift_RS')).toBeTruthy();
    });

    it('Wave 18 authoring stays within existing event substrate', () => {
        const allowedConditions = new Set([
            'and',
            'dimension_below',
            'flag_at_least',
            'flag_not_set',
            'morale_average_below',
            'patron_pressure_above',
            'supply_below',
            'territory_loss_window',
        ]);
        const allowedEffects = new Set([
            'cohesion_change',
            'cost_ledger_annotation',
            'equipment_quality_modifier',
            'morale_change',
            'narrative',
            'recruitment_modifier',
            'supply_delta',
        ]);

        const visitCondition = (id: string, condition: any): void => {
            if (!condition) return;
            if (!allowedConditions.has(condition.type)) throw new Error(`${id} uses unexpected condition ${condition.type}`);
            if (condition.osid || condition.from_osid || condition.to_osid) throw new Error(`${id} hardcodes spatial OSID predicates`);
            if (Array.isArray(condition.conditions)) condition.conditions.forEach((child: any) => visitCondition(id, child));
        };

        for (const id of WAVE_18_IDS) {
            const def = getEvent(id);
            visitCondition(id, def.trigger.condition);
            for (const effect of effectsOf(def)) {
                if (!allowedEffects.has(effect.kind)) throw new Error(`${id} uses unexpected effect ${effect.kind}`);
            }
            expect(def.trigger.turn_min ?? 0).toBeGreaterThanOrEqual(50);
            expect(def.historical_source).toContain('WAVE-18');
            expect(def.requires_player_response).not.toBe(true);
        }
    });
});
