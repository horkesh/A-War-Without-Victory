/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-12
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 12 lane.
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
 *   - Wave-8 mirrors: csq_war_exhaustion_high_streak_HRHB,
 *     csq_mobilization_demographics_strained_HRHB,
 *     csq_patron_arms_pipeline_attenuated_HRHB
 *   - Wave-8 mirror (RBiH side): csq_supply_corridor_chronic_strain_RBiH
 *   - Wave-10 mirror: csq_arbih_doctrine_modernization_HRHB
 *   - Wave-9-redo mirror: csq_post_cease_fire_recruitment_decline_HRHB
 *
 * NOTE: `dimension_above` predicate uses `>=` despite its name (engine truth at
 * src/sim/events/event_types.ts:536). Mirror semantic applies to `dimension_below`
 * which uses `<` strictly.
 * NOTE: `alliance_above` uses strict `>` (event_types.ts:497).
 * NOTE: `patron_pressure_above` reads `.override_authority` (event_types.ts:553).
 * NOTE: `morale_average_below` uses strict `<` (event_types.ts:564).
 * NOTE: `supply_below` uses strict `<` (event_types.ts:520).
 * NOTE: `flag_at_least` reads numeric flags (event_types.ts:627).
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div12' } as GameState['meta'],
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

const WAVE_12_IDS = [
    'csq_war_exhaustion_high_streak_HRHB',
    'csq_supply_corridor_chronic_strain_RBiH',
    'csq_mobilization_demographics_strained_HRHB',
    'csq_arbih_doctrine_modernization_HRHB',
    'csq_post_cease_fire_recruitment_decline_HRHB',
    'csq_patron_arms_pipeline_attenuated_HRHB',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-12: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_12_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_war_exhaustion_high_streak_HRHB ──────────────────────────────
    it('csq_war_exhaustion_high_streak_HRHB: predicate + recruitment 0.88x + cohesion -3', () => {
        const def = getEvent('csq_war_exhaustion_high_streak_HRHB');
        const cond = def.trigger.condition!;
        // war_exhaustion>=70, morale_avg<50 (strict)
        const fires = baseState(75);
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 75 };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 47, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: morale at 50 (morale_average_below strict <)
        const lapsed = baseState(75);
        lapsed.military.event_flags = { war_exhaustion_x100_HRHB: 75 };
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 50 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.88)).toBe(true);
        expect(fires.military.formations.h_b1.cohesion).toBe(57); // 60 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'war_exhaustion_high_streak_HRHB')).toBeTruthy();
    });

    // ── 2. csq_supply_corridor_chronic_strain_RBiH ──────────────────────────
    it('csq_supply_corridor_chronic_strain_RBiH: predicate + cohesion -4 + recruitment 0.92x', () => {
        const def = getEvent('csq_supply_corridor_chronic_strain_RBiH');
        const cond = def.trigger.condition!;
        // supply<30 (strict), morale_avg<50 (strict)
        const fires = baseState(65, {
            military: { general_supply_reserve: { RBiH: 20, RS: 70, HRHB: 40 } },
        });
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
            'r_b2': { id: 'r_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'r2', created_turn: 0, assignment: null, morale: 47, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at 30 (supply_below strict <)
        const lapsed = baseState(65, {
            military: { general_supply_reserve: { RBiH: 30, RS: 70, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 45 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.r_b1.cohesion).toBe(56); // 60 - 4
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.92)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'supply_corridor_chronic_strain_RBiH')).toBeTruthy();
    });

    // ── 3. csq_mobilization_demographics_strained_HRHB ──────────────────────
    it('csq_mobilization_demographics_strained_HRHB: predicate + recruitment 0.85x + morale -2', () => {
        const def = getEvent('csq_mobilization_demographics_strained_HRHB');
        const cond = def.trigger.condition!;
        // cumulative_casualties>=60, war_exhaustion>=60
        const fires = baseState(85);
        fires.military.event_flags = {
            cumulative_casualties_x100_HRHB: 65,
            war_exhaustion_x100_HRHB: 65,
        };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: cumulative_casualties below threshold (flag_at_least uses >=)
        const lapsed = baseState(85);
        lapsed.military.event_flags = {
            cumulative_casualties_x100_HRHB: 55,
            war_exhaustion_x100_HRHB: 65,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.85)).toBe(true);
        expect(fires.military.formations.h_b1.morale).toBe(48); // 50 - 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'mobilization_demographics_strained_HRHB')).toBeTruthy();
    });

    // ── 4. csq_arbih_doctrine_modernization_HRHB ────────────────────────────
    it('csq_arbih_doctrine_modernization_HRHB: predicate + equipment 1.05x + cohesion +2', () => {
        const def = getEvent('csq_arbih_doctrine_modernization_HRHB');
        const cond = def.trigger.condition!;
        // dimension_above(internal_cohesion)>=60, corps_reorganization_active_HRHB>=1
        const fires = baseState(85);
        (fires.military.negotiation as any).strategic_dimensions.HRHB.internal_cohesion.effective_value = 65;
        fires.military.event_flags = { corps_reorganization_active_HRHB: 1 };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: cohesion at 55 (dimension_above uses >= so 60 passes; 55 fails)
        const lapsed = baseState(85);
        (lapsed.military.negotiation as any).strategic_dimensions.HRHB.internal_cohesion.effective_value = 55;
        lapsed.military.event_flags = { corps_reorganization_active_HRHB: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'HRHB' && m.multiplier === 1.05)).toBe(true);
        expect(fires.military.formations.h_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'doctrine_modernization_HRHB')).toBeTruthy();
    });

    // ── 5. csq_post_cease_fire_recruitment_decline_HRHB ─────────────────────
    it('csq_post_cease_fire_recruitment_decline_HRHB: predicate + recruitment 0.90x', () => {
        const def = getEvent('csq_post_cease_fire_recruitment_decline_HRHB');
        const cond = def.trigger.condition!;
        // alliance>0.55 (strict), cumulative_casualties>=40
        const fires = baseState(65, { political: { war_alliance_rbih_hrhb: 0.65 } });
        fires.military.event_flags = { cumulative_casualties_x100_HRHB: 45 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at 0.55 (alliance_above strict >)
        const lapsed = baseState(65, { political: { war_alliance_rbih_hrhb: 0.55 } });
        lapsed.military.event_flags = { cumulative_casualties_x100_HRHB: 45 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.90)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'post_cease_fire_recruitment_decline_HRHB')).toBeTruthy();
    });

    // ── 6. csq_patron_arms_pipeline_attenuated_HRHB ─────────────────────────
    it('csq_patron_arms_pipeline_attenuated_HRHB: predicate + equipment 0.94x + recruitment 0.93x', () => {
        const def = getEvent('csq_patron_arms_pipeline_attenuated_HRHB');
        const cond = def.trigger.condition!;
        // dimension_below(patron_confidence)<35 (strict), patron_pressure>=25
        const fires = baseState(65);
        (fires.military.negotiation as any).strategic_dimensions.HRHB.patron_confidence.effective_value = 30;
        (fires.military.negotiation as any).patron_relationships.HRHB.override_authority = 30;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at 35 (dimension_below strict <)
        const lapsed = baseState(65);
        (lapsed.military.negotiation as any).strategic_dimensions.HRHB.patron_confidence.effective_value = 35;
        (lapsed.military.negotiation as any).patron_relationships.HRHB.override_authority = 30;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'HRHB' && m.multiplier === 0.94)).toBe(true);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.93)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'patron_arms_pipeline_attenuated_HRHB')).toBeTruthy();
    });

    // ── Loader audit: every Wave 12 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 12 event has trigger, effect, and Wave-12 historical_source tag', () => {
        for (const id of WAVE_12_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-12
            expect(def.historical_source).toMatch(/WAVE-12/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 12 event predicate is parameterized over faction
    it('all 6 Wave 12 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_12_IDS) {
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

    // ── No new condition kinds: every Wave 12 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 12 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_12_IDS) {
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

    // ── No new effect kinds: every Wave 12 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 12 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_12_IDS) {
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
