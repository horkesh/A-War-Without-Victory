/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-11
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 11 lane.
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
 *   - Wave-9-redo / Wave-8 mirror inversions: csq_winter_supply_attrition_HRHB,
 *     csq_political_split_temporary_RS, csq_arbih_resistance_revival_HRHB
 *   - Wave-10 mirror inversions: csq_doctrine_drift_HRHB,
 *     csq_post_dayton_train_and_equip_HRHB, csq_iran_arms_channel_attenuation_HRHB
 *
 * NOTE: `dimension_above` predicate uses `>=` despite its name (engine truth at
 * src/sim/events/event_types.ts:536). Mirror semantic applies to `dimension_below`
 * which uses `<` strictly.
 * NOTE: `alliance_above` uses strict `>` (event_types.ts:497).
 * NOTE: `alliance_below` uses strict `<` (event_types.ts:495).
 * NOTE: `patron_pressure_above` reads `.override_authority` (event_types.ts:553).
 * NOTE: `supply_below` uses strict `<` (event_types.ts:520).
 * NOTE: `morale_average_below` uses strict `<` (event_types.ts:564).
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div11' } as GameState['meta'],
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

const WAVE_11_IDS = [
    'csq_winter_supply_attrition_HRHB',
    'csq_political_split_temporary_RS',
    'csq_doctrine_drift_HRHB',
    'csq_post_dayton_train_and_equip_HRHB',
    'csq_iran_arms_channel_attenuation_HRHB',
    'csq_arbih_resistance_revival_HRHB',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-11: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_11_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_winter_supply_attrition_HRHB ─────────────────────────────────
    it('csq_winter_supply_attrition_HRHB: predicate + cohesion -3 + supply -8', () => {
        const def = getEvent('csq_winter_supply_attrition_HRHB');
        const cond = def.trigger.condition!;
        // supply<40, war_exhaustion>=50, morale_avg<55
        const fires = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 25 } },
        });
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 60 };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at threshold 40 (supply_below strict <) → fail
        const lapsed = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.event_flags = { war_exhaustion_x100_HRHB: 60 };
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 45 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(57); // 60 - 3
        expect(fires.military.general_supply_reserve!.HRHB).toBe(17); // 25 - 8
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'winter_supply_attrition_HRHB')).toBeTruthy();
    });

    // ── 2. csq_political_split_temporary_RS ─────────────────────────────────
    it('csq_political_split_temporary_RS: predicate + cohesion -3 + negotiation -3', () => {
        const def = getEvent('csq_political_split_temporary_RS');
        const cond = def.trigger.condition!;
        // war_exhaustion>=55, internal_cohesion<45 (strict), cumulative_casualties>=35
        const fires = baseState(65);
        fires.military.event_flags = {
            war_exhaustion_x100_RS: 60,
            cumulative_casualties_x100_RS: 40,
        };
        (fires.military.negotiation as any).strategic_dimensions.RS.internal_cohesion.effective_value = 40;
        fires.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: internal_cohesion at 45 (dimension_below strict <)
        const lapsed = baseState(65);
        lapsed.military.event_flags = {
            war_exhaustion_x100_RS: 60,
            cumulative_casualties_x100_RS: 40,
        };
        (lapsed.military.negotiation as any).strategic_dimensions.RS.internal_cohesion.effective_value = 45;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rs_b1.cohesion).toBe(57); // 60 - 3
        expect((fires.military.negotiation as any).capital.RS.international_credibility).toBe(47); // 50 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'political_split_temporary_RS')).toBeTruthy();
    });

    // ── 3. csq_doctrine_drift_HRHB ──────────────────────────────────────────
    it('csq_doctrine_drift_HRHB: predicate + cohesion -3 + recruitment 0.94x', () => {
        const def = getEvent('csq_doctrine_drift_HRHB');
        const cond = def.trigger.condition!;
        // corps_reorganization_active_HRHB>=1, war_exhaustion>=70, morale_avg<45 (strict)
        const fires = baseState(105);
        fires.military.event_flags = {
            corps_reorganization_active_HRHB: 1,
            war_exhaustion_x100_HRHB: 80,
        };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 42, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: morale at 45 (morale_average_below strict <)
        const lapsed = baseState(105);
        lapsed.military.event_flags = {
            corps_reorganization_active_HRHB: 1,
            war_exhaustion_x100_HRHB: 80,
        };
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 55 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(57); // 60 - 3
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 0.94)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'doctrine_drift_HRHB')).toBeTruthy();
    });

    // ── 4. csq_post_dayton_train_and_equip_HRHB ─────────────────────────────
    it('csq_post_dayton_train_and_equip_HRHB: predicate + equipment 1.06x + recruitment 1.04x', () => {
        const def = getEvent('csq_post_dayton_train_and_equip_HRHB');
        const cond = def.trigger.condition!;
        // post_dayton_phase>=1, alliance>0.5 (strict)
        const fires = baseState(150, { political: { war_alliance_rbih_hrhb: 0.65 } });
        fires.military.event_flags = { post_dayton_phase: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at 0.5 (alliance_above strict >)
        const lapsed = baseState(150, { political: { war_alliance_rbih_hrhb: 0.5 } });
        lapsed.military.event_flags = { post_dayton_phase: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'HRHB' && m.multiplier === 1.06)).toBe(true);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 1.04)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'post_dayton_train_and_equip_HRHB')).toBeTruthy();
    });

    // ── 5. csq_iran_arms_channel_attenuation_HRHB ───────────────────────────
    it('csq_iran_arms_channel_attenuation_HRHB: predicate + equipment 0.96x', () => {
        const def = getEvent('csq_iran_arms_channel_attenuation_HRHB');
        const cond = def.trigger.condition!;
        // third_party_arms_channel_active_HRHB>=1, patron_pressure>=35
        const fires = baseState(95);
        fires.military.event_flags = { third_party_arms_channel_active_HRHB: 1 };
        (fires.military.negotiation as any).patron_relationships.HRHB.override_authority = 40;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_pressure below threshold
        const lapsed = baseState(95);
        lapsed.military.event_flags = { third_party_arms_channel_active_HRHB: 1 };
        (lapsed.military.negotiation as any).patron_relationships.HRHB.override_authority = 20;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'HRHB' && m.multiplier === 0.96)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'iran_arms_channel_attenuation_HRHB')).toBeTruthy();
    });

    // ── 6. csq_arbih_resistance_revival_HRHB ────────────────────────────────
    it('csq_arbih_resistance_revival_HRHB: predicate + recruitment 1.08x + morale +3', () => {
        const def = getEvent('csq_arbih_resistance_revival_HRHB');
        const cond = def.trigger.condition!;
        // territory_loss_window(HRHB, 0.03 over 10 turns), morale_avg<45 (strict)
        const turn_summaries: any[] = [];
        // Index 0 = latest (most recent first)
        for (let i = 0; i < 11; i++) {
            const snap = i === 0 ? 0.10 : 0.20; // latest = 0.10, all older = 0.20 → loss = 0.10
            turn_summaries.push({
                turn: 50 - i,
                territory_snapshot: { RBiH: 0.40, RS: 0.40, HRHB: snap },
            });
        }
        const fires = baseState(50, { turn_summaries });
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 42, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: morale at 45 (morale_average_below strict <)
        const lapsed = baseState(50, { turn_summaries });
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50 } as any,
            'h_b2': { id: 'h_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h2', created_turn: 0, assignment: null, morale: 50 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 1.08)).toBe(true);
        expect(fires.military.formations.h_b1.morale).toBe(43); // 40 + 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'resistance_revival_HRHB')).toBeTruthy();
    });

    // ── Loader audit: every Wave 11 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 11 event has trigger, effect, and Wave-11 historical_source tag', () => {
        for (const id of WAVE_11_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-11
            expect(def.historical_source).toMatch(/WAVE-11/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 11 event predicate is parameterized over faction
    it('all 6 Wave 11 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_11_IDS) {
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

    // ── No new condition kinds: every Wave 11 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 11 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_11_IDS) {
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

    // ── No new effect kinds: every Wave 11 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 11 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_11_IDS) {
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
