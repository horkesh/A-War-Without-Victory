/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9-REDO
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 9 RE-DO lane.
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
 *   - Wave-8 mirror inversions (RS / RBiH variants of csq_war_exhaustion_high_streak,
 *     csq_supply_corridor_chronic_strain, csq_winter_supply_attrition)
 *   - Recovery / positive-side mobilization events:
 *       csq_post_cease_fire_recruitment_decline (demobilization slope after sustained alliance)
 *       csq_third_party_arms_channel (alternate equipment pipeline under principal-patron attenuation)
 *       csq_arbih_resistance_revival (existential-pressure morale surge under territory loss)
 *
 * NOTE: `dimension_above` predicate uses `>=` despite its name (engine truth at
 * src/sim/events/event_types.ts:536). Mirror semantic applies to `dimension_below`
 * which uses `<` strictly. Lapsed assertions tighten thresholds accordingly.
 * NOTE: `alliance_above` uses strict `>` (event_types.ts:497).
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div9redo' } as GameState['meta'],
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

const WAVE_9_REDO_IDS = [
    'csq_war_exhaustion_high_streak_RS',
    'csq_supply_corridor_chronic_strain_RS',
    'csq_winter_supply_attrition_RBiH',
    'csq_post_cease_fire_recruitment_decline',
    'csq_third_party_arms_channel',
    'csq_arbih_resistance_revival',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9-REDO: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_9_REDO_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_war_exhaustion_high_streak_RS ────────────────────────────────
    it('csq_war_exhaustion_high_streak_RS: predicate + recruitment 0.88x + cohesion drain', () => {
        const def = getEvent('csq_war_exhaustion_high_streak_RS');
        const cond = def.trigger.condition!;
        const fires = baseState(75);
        // Need at least one active RS brigade with morale<50 for morale_average_below(RS, 50)
        fires.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'rs_b2': { id: 'rs_b2', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs2', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
        };
        fires.military.event_flags = { war_exhaustion_x100_RS: 75 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion below threshold
        const lapsed = baseState(75);
        lapsed.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 50 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RS' && m.pool_multiplier === 0.88)).toBe(true);
        expect(fires.military.formations.rs_b1.cohesion).toBe(57); // 60 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'war_exhaustion_high_streak_RS')).toBeTruthy();
    });

    // ── 2. csq_supply_corridor_chronic_strain_RS ────────────────────────────
    it('csq_supply_corridor_chronic_strain_RS: predicate + cohesion drain + recruitment 0.92x', () => {
        const def = getEvent('csq_supply_corridor_chronic_strain_RS');
        const cond = def.trigger.condition!;
        const fires = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 25, HRHB: 40 } },
        });
        // Re-attach negotiation since military was overridden
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'rs_b2': { id: 'rs_b2', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs2', created_turn: 0, assignment: null, morale: 45, cohesion: 60 } as any,
        };
        fires.military.event_flags = {};
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at/above threshold (supply_below uses strict <)
        const lapsed = baseState(65, {
            military: { general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 40 } as any,
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rs_b1.cohesion).toBe(56); // 60 - 4
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RS' && m.pool_multiplier === 0.92)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'supply_corridor_chronic_strain_RS')).toBeTruthy();
    });

    // ── 3. csq_winter_supply_attrition_RBiH ─────────────────────────────────
    it('csq_winter_supply_attrition_RBiH: predicate + cohesion drain + supply -8', () => {
        const def = getEvent('csq_winter_supply_attrition_RBiH');
        const cond = def.trigger.condition!;
        const fires = baseState(55, {
            military: { general_supply_reserve: { RBiH: 30, RS: 70, HRHB: 40 } },
        });
        (fires.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 60 };
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
            'rb_b2': { id: 'rb_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb2', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion below threshold
        const lapsed = baseState(55, {
            military: { general_supply_reserve: { RBiH: 30, RS: 70, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 30 };
        lapsed.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.rb_b1.cohesion).toBe(57); // 60 - 3
        expect((fires.military.general_supply_reserve as any).RBiH).toBe(22); // 30 - 8
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'winter_supply_attrition_RBiH')).toBeTruthy();
    });

    // ── 4. csq_post_cease_fire_recruitment_decline ──────────────────────────
    it('csq_post_cease_fire_recruitment_decline: predicate + recruitment 0.90x', () => {
        const def = getEvent('csq_post_cease_fire_recruitment_decline');
        const cond = def.trigger.condition!;
        // alliance_above uses strict `>`: need > 0.55
        const fires = baseState(70, { political: { war_alliance_rbih_hrhb: 0.65 } });
        fires.military.event_flags = { cumulative_casualties_x100_RBiH: 50 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at/below 0.55 threshold
        const lapsed = baseState(70, { political: { war_alliance_rbih_hrhb: 0.40 } });
        lapsed.military.event_flags = { cumulative_casualties_x100_RBiH: 50 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 0.90)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'post_cease_fire_recruitment_decline')).toBeTruthy();
    });

    // ── 5. csq_third_party_arms_channel ─────────────────────────────────────
    it('csq_third_party_arms_channel: predicate + equipment_quality 1.05x', () => {
        const def = getEvent('csq_third_party_arms_channel');
        const cond = def.trigger.condition!;
        const fires = baseState(65);
        // dimension_below(patron_confidence, 40) uses strict `<`: need < 40
        (fires.military.negotiation as any).strategic_dimensions.RBiH.patron_confidence.effective_value = 35;
        // patron_pressure_above reads .override_authority (engine truth): need >= 20
        (fires.military.negotiation as any).patron_relationships.RBiH.override_authority = 25;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at/above 40 (dimension_below strict <)
        const lapsed = baseState(65);
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.patron_confidence.effective_value = 45;
        (lapsed.military.negotiation as any).patron_relationships.RBiH.override_authority = 25;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 1.05)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'third_party_arms_channel')).toBeTruthy();
    });

    // ── 6. csq_arbih_resistance_revival ─────────────────────────────────────
    it('csq_arbih_resistance_revival: predicate + recruitment 1.08x + morale +3', () => {
        const def = getEvent('csq_arbih_resistance_revival');
        const cond = def.trigger.condition!;
        // territory_loss_window: needs turn_summaries[0] (latest) and turn_summaries[window_turns]
        // (or oldest available) with territory_snapshot[faction]; loss = past - latest must be >= 0.03
        const summaries = Array.from({ length: 11 }, (_, i) => ({
            // index 0 = latest. loss = past(0.50) - latest(0.40) = 0.10 >= 0.03
            territory_snapshot: { RBiH: i === 0 ? 0.40 : 0.50, RS: 0.30, HRHB: 0.20 },
        })) as any;
        const fires = baseState(60, { turn_summaries: summaries });
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
            'rb_b2': { id: 'rb_b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb2', created_turn: 0, assignment: null, morale: 42, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: no territory loss (latest == past)
        const lapsedSummaries = Array.from({ length: 11 }, () => ({
            territory_snapshot: { RBiH: 0.50, RS: 0.30, HRHB: 0.20 },
        })) as any;
        const lapsed = baseState(60, { turn_summaries: lapsedSummaries });
        lapsed.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.08)).toBe(true);
        expect(fires.military.formations.rb_b1.morale).toBe(43); // 40 + 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'resistance_revival')).toBeTruthy();
    });

    // ── Loader audit: every Wave 9-redo ID returns a well-formed EventDefinition
    it('loader audit: every Wave 9-redo event has trigger, effect, and Wave-9-REDO historical_source tag', () => {
        for (const id of WAVE_9_REDO_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-9-REDO
            expect(def.historical_source).toMatch(/WAVE-9-REDO/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 9-redo event predicate is parameterized over faction
    it('all 6 Wave 9-redo events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_9_REDO_IDS) {
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

    // ── No new condition kinds: every Wave 9-redo predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 9-redo events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_9_REDO_IDS) {
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

    // ── No new effect kinds: every Wave 9-redo effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 9-redo events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_9_REDO_IDS) {
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
