/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-8
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json.
 *
 * Each test:
 *   1. Constructs a GameState that satisfies the predicate.
 *   2. Constructs a sibling state that violates a single key clause.
 *   3. Asserts evaluateCondition fires only in the satisfied state.
 *   4. Applies the event's effects directly via applyEventEffects (no rng path)
 *      and verifies the consequence wiring lands.
 *
 * Per spec STOP rule, no condition kind or effect kind was invented in this lane.
 * All 6 events reuse predicates and effects already declared on the union types
 * in src/sim/events/event_types.ts and writers in src/sim/events/apply_effects.ts.
 *
 * Themes covered (additive Ring 1 / no-§6):
 *   - Mobilization/exhaustion chain: csq_war_exhaustion_high_streak,
 *     csq_mobilization_demographics_strained
 *   - Equipment-flow chain (patron-pressure variant): csq_patron_arms_pipeline_attenuated
 *   - Economic/logistic chain: csq_supply_corridor_chronic_strain,
 *     csq_winter_supply_attrition
 *   - Faction-internal political chain: csq_political_split_temporary
 *
 * NOTE: `dimension_above` predicate uses `>=` despite its name (engine truth at
 * src/sim/events/event_types.ts:536). Mirror semantic applies to `dimension_below`
 * which uses `<` strictly. Lapsed assertions tighten thresholds accordingly.
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
function getEvent(id: string): EventDefinition {
    const ev = ALL_EVENTS.find(e => e.id === id);
    if (!ev) throw new Error(`event ${id} missing from consequences.json`);
    return ev;
}

function effectsOf(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function fullStrategicDims() {
    return {
        military_credibility: { base_value: 50, event_modifier: 0, effective_value: 50 },
        territorial_legitimacy: { base_value: 50, event_modifier: 0, effective_value: 50 },
        international_standing: { base_value: 50, event_modifier: 0, effective_value: 50 },
        patron_confidence: { base_value: 50, event_modifier: 0, effective_value: 50 },
        internal_cohesion: { base_value: 50, event_modifier: 0, effective_value: 50 },
        negotiating_leverage: { base_value: 50, event_modifier: 0, effective_value: 50 },
    };
}

function baseState(turn: number, overrides: { political?: any; military?: any; displacement?: any; turn_summaries?: any } = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div8' } as GameState['meta'],
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
            event_last_fired_turn: {},
            negotiation: {
                capital: {
                    RBiH: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    RS: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    HRHB: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                },
                patron_relationships: {
                    RBiH: { support_level: 60, override_authority: 0 } as any,
                    RS: { support_level: 70, override_authority: 25 } as any,
                    HRHB: { support_level: 60, override_authority: 0 } as any,
                },
                strategic_dimensions: {
                    RBiH: fullStrategicDims(),
                    RS: fullStrategicDims(),
                    HRHB: fullStrategicDims(),
                },
            } as any,
            ...overrides.military,
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
            ...overrides.political,
        } as GameState['political'],
        displacement: overrides.displacement ?? ({} as any),
        turn_summaries: overrides.turn_summaries,
    } as unknown as GameState;
}

const WAVE_8_IDS = [
    'csq_war_exhaustion_high_streak',
    'csq_patron_arms_pipeline_attenuated',
    'csq_supply_corridor_chronic_strain',
    'csq_mobilization_demographics_strained',
    'csq_political_split_temporary',
    'csq_winter_supply_attrition',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-8: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_8_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_war_exhaustion_high_streak ───────────────────────────────────
    it('csq_war_exhaustion_high_streak: predicate + recruitment 0.88x + cohesion drain', () => {
        const def = getEvent('csq_war_exhaustion_high_streak');
        const cond = def.trigger.condition!;
        const fires = baseState(75);
        // Need at least one active RBiH brigade with morale<50 for morale_average_below(RBiH, 50)
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'rb_b2': { id: 'rb_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb2', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
        };
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 75 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion below threshold
        const lapsed = baseState(75);
        lapsed.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 50 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.88)).toBe(true);
        expect(fires.military.formations.rb_b1.cohesion).toBe(57); // 60 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'war_exhaustion_high_streak')).toBeTruthy();
    });

    // ── 2. csq_patron_arms_pipeline_attenuated ──────────────────────────────
    it('csq_patron_arms_pipeline_attenuated: predicate + equipment_quality 0.94x + recruitment 0.93x', () => {
        const def = getEvent('csq_patron_arms_pipeline_attenuated');
        const cond = def.trigger.condition!;
        const fires = baseState(65);
        // dimension_below uses strict `<` (engine truth at event_types.ts:540): need < 35
        (fires.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 30;
        // patron_pressure_above reads .override_authority (engine truth at event_types.ts:553): need >= 25
        (fires.military.negotiation as any).patron_relationships.RS.override_authority = 30;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at/above 35 (dimension_below strict <)
        const lapsed = baseState(65);
        (lapsed.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 40;
        (lapsed.military.negotiation as any).patron_relationships.RS.override_authority = 30;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RS' && m.multiplier === 0.94)).toBe(true);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RS' && m.pool_multiplier === 0.93)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'patron_arms_pipeline_attenuated')).toBeTruthy();
    });

    // ── 3. csq_supply_corridor_chronic_strain ───────────────────────────────
    it('csq_supply_corridor_chronic_strain: predicate + cohesion drain + recruitment 0.92x', () => {
        const def = getEvent('csq_supply_corridor_chronic_strain');
        const cond = def.trigger.condition!;
        const fires = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 25 } },
        });
        // Re-attach negotiation since military was overridden
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.formations = {
            'hv_b1': { id: 'hv_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'hv_b2': { id: 'hv_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv2', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
        };
        fires.military.event_flags = {};
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at/above threshold
        const lapsed = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 50 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.formations = {
            'hv_b1': { id: 'hv_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv1', created_turn: 0, assignment: null, morale: 40 } as any,
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.hv_b1.cohesion).toBe(56); // 60 - 4
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.92)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'supply_corridor_chronic_strain')).toBeTruthy();
    });

    // ── 4. csq_mobilization_demographics_strained ───────────────────────────
    it('csq_mobilization_demographics_strained: predicate + recruitment 0.85x + morale -2', () => {
        const def = getEvent('csq_mobilization_demographics_strained');
        const cond = def.trigger.condition!;
        const fires = baseState(85);
        fires.military.event_flags = { cumulative_casualties_x100_RBiH: 70, war_exhaustion_x100_RBiH: 65 };
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 60, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: cumulative_casualties below threshold
        const lapsed = baseState(85);
        lapsed.military.event_flags = { cumulative_casualties_x100_RBiH: 30, war_exhaustion_x100_RBiH: 65 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.85)).toBe(true);
        expect(fires.military.formations.rb_b1.morale).toBe(58); // 60 - 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'mobilization_demographics_strained')).toBeTruthy();
    });

    // ── 5. csq_political_split_temporary ────────────────────────────────────
    it('csq_political_split_temporary: predicate + cohesion drain + negotiation_capital -5', () => {
        const def = getEvent('csq_political_split_temporary');
        const cond = def.trigger.condition!;
        const fires = baseState(55, { political: { war_alliance_rbih_hrhb: 0.20 } });
        fires.military.event_flags = { cumulative_casualties_x100_HRHB: 40 };
        // dimension_below(international_standing, 45) uses strict `<`: need < 45
        (fires.military.negotiation as any).strategic_dimensions.HRHB.international_standing.effective_value = 40;
        fires.military.formations = {
            'hv_b1': { id: 'hv_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at/above 0.30 threshold (alliance_below uses strict `<`)
        const lapsed = baseState(55, { political: { war_alliance_rbih_hrhb: 0.40 } });
        lapsed.military.event_flags = { cumulative_casualties_x100_HRHB: 40 };
        (lapsed.military.negotiation as any).strategic_dimensions.HRHB.international_standing.effective_value = 40;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.hv_b1.cohesion).toBe(56); // 60 - 4
        // negotiation_capital writer guards `if (dimension in cap)`; international_credibility is pre-seeded.
        const cap = (fires.military.negotiation as any).capital.HRHB;
        expect(cap.international_credibility).toBe(45); // 50 - 5
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'political_split_temporary')).toBeTruthy();
    });

    // ── 6. csq_winter_supply_attrition ──────────────────────────────────────
    it('csq_winter_supply_attrition: predicate + cohesion drain + supply -8', () => {
        const def = getEvent('csq_winter_supply_attrition');
        const cond = def.trigger.condition!;
        const fires = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 30, HRHB: 40 } },
        });
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.event_flags = { war_exhaustion_x100_RS: 60 };
        fires.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
            'rs_b2': { id: 'rs_b2', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs2', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion below threshold
        const lapsed = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 30, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 30 };
        lapsed.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rs_b1.cohesion).toBe(57); // 60 - 3
        expect((fires.military.general_supply_reserve as any).RS).toBe(22); // 30 - 8
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'winter_supply_attrition')).toBeTruthy();
    });

    // ── Loader audit: every Wave 8 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 8 event has a trigger, an effect, and a Wave-8 historical_source tag', () => {
        for (const id of WAVE_8_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-8
            expect(def.historical_source).toMatch(/WAVE-8/);
            // None of these are decision events (no requires_player_response)
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 8 event predicate is parameterized over faction
    it('all 6 Wave 8 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_8_IDS) {
            const def = getEvent(id);
            const cond = def.trigger.condition;
            // Recursive walk — fail on any condition that names an OSID literal
            const visit = (c: any): void => {
                if (!c) return;
                if (typeof c.osid === 'string') throw new Error(`event ${id} has hardcoded osid in condition`);
                if (typeof c.from_osid === 'string' || typeof c.to_osid === 'string') throw new Error(`event ${id} has corridor osid literals`);
                if (Array.isArray(c.conditions)) c.conditions.forEach(visit);
                if (c.condition) visit(c.condition);
            };
            visit(cond);
        }
        expect(true).toBe(true);
    });

    // ── No new condition kinds: every Wave 8 predicate uses pre-existing kinds
    it('all 6 Wave 8 events use only pre-existing condition kinds (STOP rule)', () => {
        const ALLOWED_CONDITION_KINDS = new Set([
            'territory_control', 'alliance_below', 'alliance_above',
            'faction_controls_municipality', 'siege_active', 'operation_completed',
            'and', 'or', 'not',
            'supply_below', 'supply_above', 'territory_percentage',
            'dimension_above', 'dimension_below', 'flag_equals', 'flag_not_set',
            'patron_pressure_above', 'war_crimes_above', 'morale_average_below',
            'week_since_event', 'event_fire_count', 'enclave_supply_status',
            'corridor_severed',
            'paramilitary_mode_equals', 'enclave_resilience_aggregate', 'flag_at_least',
            'metric_compare_factions', 'alliance_drift', 'territory_loss_window',
            'displaced_in_aggregate',
        ]);
        for (const id of WAVE_8_IDS) {
            const def = getEvent(id);
            const cond = def.trigger.condition;
            const visit = (c: any): void => {
                if (!c) return;
                if (typeof c.type === 'string') {
                    if (!ALLOWED_CONDITION_KINDS.has(c.type)) {
                        throw new Error(`event ${id} uses non-allowed condition kind: ${c.type}`);
                    }
                }
                if (Array.isArray(c.conditions)) c.conditions.forEach(visit);
                if (c.condition) visit(c.condition);
            };
            visit(cond);
        }
        expect(true).toBe(true);
    });

    // ── No new effect kinds: every Wave 8 effect uses pre-existing kinds
    it('all 6 Wave 8 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_8_IDS) {
            const def = getEvent(id);
            const all = effectsOf(def);
            for (const e of all) {
                if (!ALLOWED_EFFECT_KINDS.has(e.kind)) {
                    throw new Error(`event ${id} uses non-allowed effect kind: ${e.kind}`);
                }
            }
        }
        expect(true).toBe(true);
    });
});
