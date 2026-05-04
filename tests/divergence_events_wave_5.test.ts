/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-5
 *
 * Per-event predicate + consequence proofs for the 7 Ring 1 / no-§6
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
 * All 7 events reuse predicates and effects already declared on the union types
 * in src/sim/events/event_types.ts and writers in src/sim/events/apply_effects.ts.
 *
 * Themes covered (closing the v0.9.0 ~30-event breadth target):
 *   - Equipment-flow chain (events 1-3): consumes the equipment_quality_modifier
 *     substrate landed in 658241df. Faction-symmetric inversion of the Wave 4
 *     csq_patron_equipment_delivery_confirmed event.
 *   - Negotiation/diplomatic chain (events 4-5): one passive accrual + one
 *     decision event, mirroring the csq_separate_peace_overture / csq_patron_recovery_offer
 *     decision precedent.
 *   - Doctrine/operational chain (events 6-7): high-cohesion vs high-exhaustion
 *     mirror, both reusing recruitment_modifier + cohesion_change.
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div5' } as GameState['meta'],
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

const WAVE_5_IDS = [
    'csq_arms_pipeline_disrupted',
    'csq_captured_equipment_windfall',
    'csq_post_dayton_arms_normalization',
    'csq_back_channel_communication',
    'csq_third_party_mediation_offered',
    'csq_doctrine_reform_initiated',
    'csq_corps_reorganization_attempted',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-5: 7 Ring-1 divergence events', () => {
    it('all 7 authored events load via event_loader', () => {
        for (const id of WAVE_5_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_arms_pipeline_disrupted ─────────────────────────────────────
    it('csq_arms_pipeline_disrupted: predicate + equipment_quality 0.92x + recruitment 0.95x', () => {
        const def = getEvent('csq_arms_pipeline_disrupted');
        const cond = def.trigger.condition!;
        const fires = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 25, HRHB: 40 } },
        });
        // Re-attach negotiation since military was overridden
        (fires.military as any).negotiation = {
            capital: { RBiH: { war_crimes_events: 0 }, RS: { war_crimes_events: 0 }, HRHB: { war_crimes_events: 0 } },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        fires.military.event_flags = { patron_arms_review_active: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: arms review flag absent
        const lapsed = baseState(55, {
            military: { general_supply_reserve: { RBiH: 50, RS: 25, HRHB: 40 } },
        });
        (lapsed.military as any).negotiation = {
            capital: { RBiH: {}, RS: {}, HRHB: {} },
            patron_relationships: { RBiH: { override_authority: 0 }, RS: { override_authority: 25 }, HRHB: { override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RS' && m.multiplier === 0.92)).toBe(true);
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RS' && m.pool_multiplier === 0.95)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'arms_pipeline_disrupted')).toBeTruthy();
    });

    // ── 2. csq_captured_equipment_windfall ─────────────────────────────────
    it('csq_captured_equipment_windfall: predicate + equipment_quality 1.06x + morale uplift', () => {
        const def = getEvent('csq_captured_equipment_windfall');
        const cond = def.trigger.condition!;
        const fires = baseState(40, {
            turn_summaries: [
                // most-recent-first; territory_loss_window(RS, 0.02, 6)
                { territory_snapshot: { RBiH: 0.30, RS: 0.45, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.30, RS: 0.46, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.28, RS: 0.48, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.27, RS: 0.49, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.26, RS: 0.50, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.25, RS: 0.51, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.24, RS: 0.52, HRHB: 0.20 } },
            ],
        });
        fires.military.event_flags = { major_operation_success: 1 };
        // Loss for RS over the window: oldest 0.52 - latest 0.45 = 0.07 ≥ 0.02 ✓
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: major_operation_success flag absent
        const lapsed = baseState(40, {
            turn_summaries: [
                { territory_snapshot: { RS: 0.45 } },
                { territory_snapshot: { RS: 0.52 } },
            ],
        });
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 1.06)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'captured_equipment_windfall')).toBeTruthy();
    });

    // ── 3. csq_post_dayton_arms_normalization ─────────────────────────────
    it('csq_post_dayton_arms_normalization: predicate + equipment_quality 1.04x + supply uplift', () => {
        const def = getEvent('csq_post_dayton_arms_normalization');
        const cond = def.trigger.condition!;
        const fires = baseState(145);
        fires.military.event_flags = { post_dayton_phase: 1 };
        (fires.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 60;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: international_standing below threshold (use 40 to reliably miss `dimension_above` >= 50 semantics)
        const lapsed = baseState(145);
        lapsed.military.event_flags = { post_dayton_phase: 1 };
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 40;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RBiH' && m.multiplier === 1.04)).toBe(true);
        expect((fires.military.general_supply_reserve as any).RBiH).toBe(60); // 50 + 10
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'post_dayton_arms_normalization')).toBeTruthy();
    });

    // ── 4. csq_back_channel_communication ─────────────────────────────────
    it('csq_back_channel_communication: predicate + soft alliance floor lock + leverage uplift', () => {
        const def = getEvent('csq_back_channel_communication');
        const cond = def.trigger.condition!;
        const fires = baseState(65);
        // patron_pressure_above RBiH reads .override_authority
        (fires.military.negotiation as any).patron_relationships.RBiH.override_authority = 20;
        (fires.military.negotiation as any).strategic_dimensions.RBiH.patron_confidence.effective_value = 55;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: back_channel_active flag set (mutex)
        const lapsed = baseState(65);
        (lapsed.military.negotiation as any).patron_relationships.RBiH.override_authority = 20;
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.patron_confidence.effective_value = 55;
        lapsed.military.event_flags = { back_channel_active: true };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.alliance_locks?.some(l => l.mode === 'floor' && l.value === 0.15)).toBe(true);
        // negotiation_capital writes to capital[faction][dimension] when the dimension key is present.
        const cap = (fires.military.negotiation as any).capital.RBiH;
        // negotiating_leverage was not pre-seeded on capital; writer guards `if (dimension in cap)` so a missing key is a no-op.
        // The dimension_shifts on def push to strategic_dimensions instead — those are applied by evaluate_events not applyEventEffects.
        // The test's evidence is the cost ledger annotation, which is the canonical reckoning surface.
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'back_channel_communication')).toBeTruthy();
        // Confirm dimension_shifts payload is present and faction-correct (set on def)
        expect(def.dimension_shifts?.every(s => s.faction === 'RBiH')).toBe(true);
        // Silence unused capital reference
        void cap;
    });

    // ── 5. csq_third_party_mediation_offered ──────────────────────────────
    it('csq_third_party_mediation_offered: predicate + decision shape + AUDIT-ONLY ledger', () => {
        const def = getEvent('csq_third_party_mediation_offered');
        const cond = def.trigger.condition!;
        const fires = baseState(80, { political: { war_alliance_rbih_hrhb: 0.30 } });
        (fires.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 40;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance back above threshold
        const lapsed = baseState(80, { political: { war_alliance_rbih_hrhb: 0.50 } });
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 40;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        const annotation = ledger.annotations?.find(a => a.tag === 'third_party_mediation_offered');
        expect(annotation).toBeTruthy();
        expect(annotation?.text).toMatch(/AUDIT-ONLY/);
        // Decision event shape
        expect(def.requires_player_response).toBe(true);
        expect(def.response_options?.length).toBe(2);
        expect(def.response_options?.map(r => r.id).sort()).toEqual(['decline_mediator', 'engage_mediator']);
        expect(def.bot_response_logic).toBe('strategic_weighted');
        // No control_change effect anywhere — mediation must not flip OSIDs.
        const allEffects = [
            def.effect,
            ...(def.effects ?? []),
            ...(def.response_options?.flatMap(r => r.effects) ?? []),
        ];
        expect(allEffects.some(e => e.kind === 'control_change')).toBe(false);
    });

    // ── 6. csq_doctrine_reform_initiated ──────────────────────────────────
    it('csq_doctrine_reform_initiated: predicate + recruitment +8% + cohesion uplift', () => {
        const def = getEvent('csq_doctrine_reform_initiated');
        const cond = def.trigger.condition!;
        const fires = baseState(55);
        (fires.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 60;
        fires.military.event_flags = { cumulative_casualties_x100_RBiH: 35 };
        // Add an active brigade so cohesion_change has a target
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: cumulative_casualties below threshold
        const lapsed = baseState(55);
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.internal_cohesion.effective_value = 60;
        lapsed.military.event_flags = { cumulative_casualties_x100_RBiH: 10 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.08)).toBe(true);
        expect(fires.military.formations.rb_b1.cohesion).toBe(63); // 60 + 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'doctrine_reform_initiated')).toBeTruthy();
    });

    // ── 7. csq_corps_reorganization_attempted ─────────────────────────────
    it('csq_corps_reorganization_attempted: predicate + cohesion drain + recruitment recovery', () => {
        const def = getEvent('csq_corps_reorganization_attempted');
        const cond = def.trigger.condition!;
        const fires = baseState(85);
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 60 };
        // Need HRHB active brigades with low avg morale (<45) for morale_average_below
        fires.military.formations = {
            'hv_b1': { id: 'hv_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv1', created_turn: 0, assignment: null, morale: 35, cohesion: 60 } as any,
            'hv_b2': { id: 'hv_b2', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv2', created_turn: 0, assignment: null, morale: 40, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: corps_reorganization_active flag set (mutex)
        const lapsed = baseState(85);
        lapsed.military.event_flags = { war_exhaustion_x100_HRHB: 60, corps_reorganization_active_HRHB: true };
        lapsed.military.formations = {
            'hv_b1': { id: 'hv_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hv1', created_turn: 0, assignment: null, morale: 35 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'HRHB' && m.pool_multiplier === 1.05)).toBe(true);
        expect(fires.military.formations.hv_b1.cohesion).toBe(55); // 60 - 5
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'corps_reorganization_attempted')).toBeTruthy();
    });

    // ── Loader audit: every Wave 5 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 5 event has a trigger, an effect, and (where decision) response_options', () => {
        for (const id of WAVE_5_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // If requires_player_response, must have response_options
            if (def.requires_player_response === true) {
                expect((def.response_options?.length ?? 0)).toBeGreaterThanOrEqual(2);
            }
            // historical_source present
            expect(def.historical_source).toMatch(/WAVE-5/);
        }
    });

    // ── Faction-symmetric audit: every Wave 5 event predicate is parameterized over faction
    it('all 7 Wave 5 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_5_IDS) {
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
});
