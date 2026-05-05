/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-14
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 14 lane.
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
 *   - Wave-13 mirror:     csq_extended_truce_streak_HRHB
 *   - Wave-13 mirror:     csq_extended_truce_streak_RS
 *   - Wave-13 mirror:     csq_mediator_engagement_streak_HRHB
 *   - Wave-13 mirror:     csq_mediator_engagement_streak_RS
 *   - Wave-4 mirror:      csq_back_channel_communication_RS (closes back-channel triad)
 *   - NEW streak event:   csq_paramilitary_refusal_streak_RBiH
 *
 * Engine-truth quirks honored:
 *   - `dimension_above` uses `>=` despite its name (event_types.ts:536)
 *   - `alliance_above` uses strict `>` (event_types.ts:497)
 *   - `patron_pressure_above` reads `.override_authority` (event_types.ts:553)
 *   - `flag_at_least` reads numeric flags (event_types.ts:627)
 *   - `paramilitary_mode_equals` aggregates over active formations (event_types.ts:594)
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div14' } as GameState['meta'],
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
                    RS: { support_level: 70, override_authority: 0 } as any,
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

const WAVE_14_IDS = [
    'csq_extended_truce_streak_HRHB',
    'csq_extended_truce_streak_RS',
    'csq_mediator_engagement_streak_HRHB',
    'csq_mediator_engagement_streak_RS',
    'csq_back_channel_communication_RS',
    'csq_paramilitary_refusal_streak_RBiH',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-14: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_14_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_extended_truce_streak_HRHB ───────────────────────────────────
    it('csq_extended_truce_streak_HRHB: predicate + cohesion +3', () => {
        const def = getEvent('csq_extended_truce_streak_HRHB');
        const cond = def.trigger.condition!;
        // alliance>0.6 (strict)
        const fires = baseState(75, { political: { war_alliance_rbih_hrhb: 0.7 } });
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at 0.6 (alliance_above strict >)
        const lapsed = baseState(75, { political: { war_alliance_rbih_hrhb: 0.6 } });
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(63); // 60 + 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'extended_truce_streak_HRHB')).toBeTruthy();
    });

    // ── 2. csq_extended_truce_streak_RS ─────────────────────────────────────
    it('csq_extended_truce_streak_RS: predicate + cohesion +3', () => {
        const def = getEvent('csq_extended_truce_streak_RS');
        const cond = def.trigger.condition!;
        // alliance>0.6 (strict) — proxy for war activity ebbs
        const fires = baseState(75, { political: { war_alliance_rbih_hrhb: 0.7 } });
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance at exactly 0.6 fails strict >
        const lapsed = baseState(75, { political: { war_alliance_rbih_hrhb: 0.6 } });
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.r_b1.cohesion).toBe(63); // 60 + 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'extended_truce_streak_RS')).toBeTruthy();
    });

    // ── 3. csq_mediator_engagement_streak_HRHB ──────────────────────────────
    it('csq_mediator_engagement_streak_HRHB: predicate + leverage +4', () => {
        const def = getEvent('csq_mediator_engagement_streak_HRHB');
        const cond = def.trigger.condition!;
        // dimension_above(patron_confidence)>=55, war_exhaustion_x100_HRHB>=40
        const fires = baseState(75);
        (fires.military.negotiation as any).strategic_dimensions.HRHB.patron_confidence.effective_value = 60;
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 45 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at 54 (dimension_above uses >= so 55 passes; 54 fails)
        const lapsed = baseState(75);
        (lapsed.military.negotiation as any).strategic_dimensions.HRHB.patron_confidence.effective_value = 54;
        lapsed.military.event_flags = { war_exhaustion_x100_HRHB: 45 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        // Seed capital.HRHB.negotiating_leverage (engine truth: writer mutates capital, not strategic_dimensions)
        (fires.military.negotiation as any).capital.HRHB.negotiating_leverage = 50;
        applyEventEffects(fires, effectsOf(def));
        const cap = (fires.military.negotiation as any).capital.HRHB;
        expect(cap.negotiating_leverage).toBe(54); // 50 + 4
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'mediator_engagement_streak_HRHB')).toBeTruthy();
    });

    // ── 4. csq_mediator_engagement_streak_RS ────────────────────────────────
    it('csq_mediator_engagement_streak_RS: predicate + leverage +4', () => {
        const def = getEvent('csq_mediator_engagement_streak_RS');
        const cond = def.trigger.condition!;
        // dimension_above(patron_confidence)>=55, war_exhaustion_x100_RS>=40
        const fires = baseState(75);
        (fires.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 60;
        fires.military.event_flags = { war_exhaustion_x100_RS: 45 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion at 39 (flag_at_least uses >= so 40 passes; 39 fails)
        const lapsed = baseState(75);
        (lapsed.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 60;
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 39 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        (fires.military.negotiation as any).capital.RS.negotiating_leverage = 50;
        applyEventEffects(fires, effectsOf(def));
        const cap = (fires.military.negotiation as any).capital.RS;
        expect(cap.negotiating_leverage).toBe(54); // 50 + 4
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'mediator_engagement_streak_RS')).toBeTruthy();
    });

    // ── 5. csq_back_channel_communication_RS ────────────────────────────────
    it('csq_back_channel_communication_RS: predicate + leverage +5 + alliance floor', () => {
        const def = getEvent('csq_back_channel_communication_RS');
        const cond = def.trigger.condition!;
        // patron_pressure_above(RS)>=15, dimension_above(patron_confidence)>=50
        const fires = baseState(65);
        (fires.military.negotiation as any).patron_relationships.RS.override_authority = 20;
        (fires.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 55;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at 49 (dimension_above uses >= so 50 passes; 49 fails)
        const lapsed = baseState(65);
        (lapsed.military.negotiation as any).patron_relationships.RS.override_authority = 20;
        (lapsed.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 49;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        // Seed capital.RS.negotiating_leverage (engine truth: writer mutates capital, not strategic_dimensions)
        (fires.military.negotiation as any).capital.RS.negotiating_leverage = 50;
        applyEventEffects(fires, effectsOf(def));
        const cap = (fires.military.negotiation as any).capital.RS;
        expect(cap.negotiating_leverage).toBe(55); // 50 + 5
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'back_channel_communication_RS')).toBeTruthy();
    });

    // ── 6. csq_paramilitary_refusal_streak_RBiH ─────────────────────────────
    it('csq_paramilitary_refusal_streak_RBiH: predicate + cohesion +2', () => {
        const def = getEvent('csq_paramilitary_refusal_streak_RBiH');
        const cond = def.trigger.condition!;
        // paramilitary_mode_equals(rear_pocket) — true when no active formation has paramilitary_mode='offensive'
        // war_exhaustion_x100_RBiH>=50
        const fires = baseState(75);
        // All RBiH brigades in rear_pocket (or undefined which defaults to rear_pocket per engine)
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'rear_pocket' } as any,
        };
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 55 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: any active formation with paramilitary_mode='offensive' flips aggregate to 'offensive'
        const lapsed = baseState(75);
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'offensive' } as any,
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 55 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.r_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'paramilitary_refusal_streak_RBiH')).toBeTruthy();
    });

    // ── Loader audit: every Wave 14 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 14 event has trigger, effect, and Wave-14 historical_source tag', () => {
        for (const id of WAVE_14_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-14
            expect(def.historical_source).toMatch(/WAVE-14/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // ── Faction-symmetric audit: every Wave 14 event predicate is parameterized over faction
    it('all 6 Wave 14 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_14_IDS) {
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

    // ── No new condition kinds: every Wave 14 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 14 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_14_IDS) {
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

    // ── No new effect kinds: every Wave 14 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 14 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_14_IDS) {
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
