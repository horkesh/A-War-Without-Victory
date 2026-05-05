/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-10
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 10 lane.
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
 *   - Wave-8 mirror inversions: csq_supply_corridor_chronic_strain_HRHB,
 *     csq_political_split_temporary_RBiH
 *   - Recovery / arms-channel chain: csq_post_dayton_train_and_equip_RBiH,
 *     csq_arbih_doctrine_modernization
 *   - Attenuation / counterpart chain: csq_iran_arms_channel_attenuation,
 *     csq_doctrine_drift
 *
 * NOTE: `dimension_above` predicate uses `>=` despite its name (engine truth at
 * src/sim/events/event_types.ts:536). Mirror semantic applies to `dimension_below`
 * which uses `<` strictly. Lapsed assertions tighten thresholds accordingly.
 * NOTE: `alliance_above` uses strict `>` (event_types.ts:497).
 * NOTE: `alliance_below` uses strict `<` (event_types.ts:495).
 * NOTE: `patron_pressure_above` reads `.override_authority` (event_types.ts:553).
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div10' } as GameState['meta'],
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

const WAVE_10_IDS = [
    'csq_supply_corridor_chronic_strain_HRHB',
    'csq_post_dayton_train_and_equip_RBiH',
    'csq_arbih_doctrine_modernization',
    'csq_iran_arms_channel_attenuation',
    'csq_political_split_temporary_RBiH',
    'csq_doctrine_drift',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-10: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_10_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_supply_corridor_chronic_strain_HRHB ──────────────────────────
    it('csq_supply_corridor_chronic_strain_HRHB: predicate + cohesion drain + recruitment 0.92x', () => {
        const def = getEvent('csq_supply_corridor_chronic_strain_HRHB');
        const cond = def.trigger.condition!;
        const fires = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 20 } },
        });
        // Re-attach negotiation since military was overridden
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.formations = {
            'hrhb_b1': { id: 'hrhb_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'hrhb_b2': { id: 'hrhb_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
        };
        fires.military.event_flags = {};
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at/above threshold (supply_below uses strict <)
        const lapsed = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 50 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.formations = {
            'hrhb_b1': { id: 'hrhb_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 40 } as any,
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.hrhb_b1.cohesion).toBe(56); // 60 - 4
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.92)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'supply_corridor_chronic_strain_HRHB')).toBeTruthy();
    });

    // ── 2. csq_post_dayton_train_and_equip_RBiH ─────────────────────────────
    it('csq_post_dayton_train_and_equip_RBiH: predicate + equipment 1.06x + recruitment 1.04x', () => {
        const def = getEvent('csq_post_dayton_train_and_equip_RBiH');
        const cond = def.trigger.condition!;
        // alliance_above uses strict `>`: need > 0.5
        const fires = baseState(150, { political: { war_alliance_rbih_hrhb: 0.65 } });
        fires.military.event_flags = { post_dayton_phase: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at/below 0.5 (alliance_above strict >)
        const lapsed = baseState(150, { political: { war_alliance_rbih_hrhb: 0.45 } });
        lapsed.military.event_flags = { post_dayton_phase: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 1.06)).toBe(true);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.04)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'post_dayton_train_and_equip_RBiH')).toBeTruthy();
    });

    // ── 3. csq_arbih_doctrine_modernization ─────────────────────────────────
    it('csq_arbih_doctrine_modernization: predicate + equipment 1.05x + cohesion +2', () => {
        const def = getEvent('csq_arbih_doctrine_modernization');
        const cond = def.trigger.condition!;
        // dimension_above(internal_cohesion, 60) uses `>=`: need >= 60
        const fires = baseState(85);
        (fires.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 65;
        fires.military.event_flags = { doctrine_reform_initiated_RBiH: 1 };
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: internal_cohesion below 60 (dimension_above >= used)
        const lapsed = baseState(85);
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 55;
        lapsed.military.event_flags = { doctrine_reform_initiated_RBiH: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 1.05)).toBe(true);
        expect(fires.military.formations.rb_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'doctrine_modernization_RBiH')).toBeTruthy();
    });

    // ── 4. csq_iran_arms_channel_attenuation ────────────────────────────────
    it('csq_iran_arms_channel_attenuation: predicate + equipment 0.96x', () => {
        const def = getEvent('csq_iran_arms_channel_attenuation');
        const cond = def.trigger.condition!;
        // Need third_party_arms_channel_active_RBiH flag AND patron_pressure>=35
        const fires = baseState(95);
        fires.military.event_flags = { third_party_arms_channel_active_RBiH: 1 };
        (fires.military.negotiation as any).patron_relationships.RBiH.override_authority = 40;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_pressure below threshold (patron_pressure_above uses >=)
        const lapsed = baseState(95);
        lapsed.military.event_flags = { third_party_arms_channel_active_RBiH: 1 };
        (lapsed.military.negotiation as any).patron_relationships.RBiH.override_authority = 20;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 0.96)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'iran_arms_channel_attenuation')).toBeTruthy();
    });

    // ── 5. csq_political_split_temporary_RBiH ───────────────────────────────
    it('csq_political_split_temporary_RBiH: predicate + cohesion -3 + negotiation -3', () => {
        const def = getEvent('csq_political_split_temporary_RBiH');
        const cond = def.trigger.condition!;
        // alliance_below(0.30) strict <; war_exhaustion>=50; cohesion<45 strict
        const fires = baseState(65, { political: { war_alliance_rbih_hrhb: 0.20 } });
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 60 };
        (fires.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 40;
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: cohesion at/above 45 (dimension_below strict <)
        const lapsed = baseState(65, { political: { war_alliance_rbih_hrhb: 0.20 } });
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 60 };
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 50;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rb_b1.cohesion).toBe(57); // 60 - 3
        expect((fires.military.negotiation as any).capital.RBiH.international_credibility).toBe(47); // 50 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'political_split_temporary_RBiH')).toBeTruthy();
    });

    // ── 6. csq_doctrine_drift ───────────────────────────────────────────────
    it('csq_doctrine_drift: predicate + cohesion -3 + recruitment 0.94x', () => {
        const def = getEvent('csq_doctrine_drift');
        const cond = def.trigger.condition!;
        // doctrine_reform_initiated_RBiH>=1; war_exhaustion>=70; morale_avg<45
        const fires = baseState(105);
        fires.military.event_flags = {
            doctrine_reform_initiated_RBiH: 1,
            war_exhaustion_x100_RBiH: 80,
        };
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'rb_b2': { id: 'rb_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb2', created_turn: 0, assignment: null, morale: 42, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: morale at/above 45 (morale_average_below strict <)
        const lapsed = baseState(105);
        lapsed.military.event_flags = {
            doctrine_reform_initiated_RBiH: 1,
            war_exhaustion_x100_RBiH: 80,
        };
        lapsed.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50 } as any,
            'rb_b2': { id: 'rb_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb2', created_turn: 0, assignment: null, morale: 55 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rb_b1.cohesion).toBe(57); // 60 - 3
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.94)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'doctrine_drift_RBiH')).toBeTruthy();
    });

    // ── Loader audit: every Wave 10 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 10 event has trigger, effect, and Wave-10 historical_source tag', () => {
        for (const id of WAVE_10_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-10
            expect(def.historical_source).toMatch(/WAVE-10/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 10 event predicate is parameterized over faction
    it('all 6 Wave 10 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_10_IDS) {
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

    // ── No new condition kinds: every Wave 10 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 10 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_10_IDS) {
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

    // ── No new effect kinds: every Wave 10 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 10 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_10_IDS) {
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
