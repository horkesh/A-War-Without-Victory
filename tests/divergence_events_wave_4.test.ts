/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-4
 *
 * Per-event predicate + consequence proofs for the 10 Ring 1 / no-§6
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
 * All 10 events reuse predicates and effects already declared on the union types
 * in src/sim/events/event_types.ts and writers in src/sim/events/apply_effects.ts.
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div4' } as GameState['meta'],
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

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-4: 10 Ring-1 divergence events', () => {
    it('all 10 authored events load via event_loader', () => {
        const expected = [
            'csq_separate_track_recovery',
            'csq_alliance_reset_after_rupture',
            'csq_tripartite_federation_overture',
            'csq_patron_equipment_delivery_confirmed',
            'csq_international_tribunal_observation',
            'csq_black_market_supply_route',
            'csq_refugee_labor_mobilization',
            'csq_late_war_volunteer_surge',
            'csq_reservist_exhaustion_callup',
            'csq_partition_referendum_proposal',
        ];
        for (const id of expected) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // ── 1. csq_separate_track_recovery ─────────────────────────────────────
    it('csq_separate_track_recovery: predicate + alliance ceiling lock + cost ledger', () => {
        const def = getEvent('csq_separate_track_recovery');
        const cond = def.trigger.condition!;
        const fires = baseState(65, { political: { war_alliance_rbih_hrhb: 0.30 } });
        fires.military.event_flags = { alliance_silent_drift: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: alliance below 0.25
        const lapsed = baseState(65, { political: { war_alliance_rbih_hrhb: 0.20 } });
        lapsed.military.event_flags = { alliance_silent_drift: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.alliance_locks?.some(l => l.mode === 'ceiling' && l.value === 0.55)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'separate_track_recovery')).toBeTruthy();
    });

    // ── 2. csq_alliance_reset_after_rupture ─────────────────────────────────
    it('csq_alliance_reset_after_rupture: predicate + alliance floor lock', () => {
        const def = getEvent('csq_alliance_reset_after_rupture');
        const cond = def.trigger.condition!;
        const fires = baseState(105, { political: { war_alliance_rbih_hrhb: 0.15 } });
        fires.military.event_flags = {
            alliance_low_water_mark_below_0_10: 1,
            joint_command_collapsed: 1,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war active flag set
        const lapsed = baseState(105, { political: { war_alliance_rbih_hrhb: 0.15 } });
        lapsed.military.event_flags = {
            alliance_low_water_mark_below_0_10: 1,
            joint_command_collapsed: 1,
            rbih_hrhb_war_active: true,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.alliance_locks?.some(l => l.mode === 'floor' && l.value === 0.10)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'alliance_reset_after_rupture')).toBeTruthy();
    });

    // ── 3. csq_tripartite_federation_overture ───────────────────────────────
    it('csq_tripartite_federation_overture: predicate + decision shape + ledger', () => {
        const def = getEvent('csq_tripartite_federation_overture');
        const cond = def.trigger.condition!;
        const fires = baseState(85);
        fires.military.event_flags = { alliance_reset_completed: true };
        // dimension_above RBiH international_standing > 50
        (fires.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 60;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: international_standing dropped below threshold (50).
        // (NOTE: `dimension_above` uses `>=` despite the name; threshold 50 fires at 50.
        // To reliably miss, set effective_value strictly below 50.)
        const lapsed = baseState(85);
        lapsed.military.event_flags = { alliance_reset_completed: true };
        (lapsed.military.negotiation as any).strategic_dimensions.RBiH.international_standing.effective_value = 40;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'tripartite_federation_overture')).toBeTruthy();
        // Decision event: requires_player_response true and binary response_options shape.
        expect(def.requires_player_response).toBe(true);
        expect(def.response_options?.length).toBe(2);
        expect(def.response_options?.map(r => r.id).sort()).toEqual(['decline_proposal', 'engage_proposal']);
    });

    // ── 4. csq_patron_equipment_delivery_confirmed ─────────────────────────
    it('csq_patron_equipment_delivery_confirmed: predicate + equipment_quality_modifier + supply', () => {
        const def = getEvent('csq_patron_equipment_delivery_confirmed');
        const cond = def.trigger.condition!;
        const fires = baseState(55);
        // patron_pressure_above RS reads .override_authority (per condition handler)
        (fires.military.negotiation as any).patron_relationships.RS.override_authority = 25;
        (fires.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 60;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: arms review active flag set
        const lapsed = baseState(55);
        (lapsed.military.negotiation as any).patron_relationships.RS.override_authority = 25;
        (lapsed.military.negotiation as any).strategic_dimensions.RS.patron_confidence.effective_value = 60;
        lapsed.military.event_flags = { patron_arms_review_active: true };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.equipment_quality_modifiers?.some(m => m.faction === 'RS' && m.multiplier === 1.04)).toBe(true);
        expect((fires.military.general_supply_reserve as any).RS).toBe(85); // 70 + 15
    });

    // ── 5. csq_international_tribunal_observation ──────────────────────────
    it('csq_international_tribunal_observation: predicate + cost ledger + dim shift target', () => {
        const def = getEvent('csq_international_tribunal_observation');
        const cond = def.trigger.condition!;
        const fires = baseState(55);
        (fires.military.negotiation as any).capital.RS.war_crimes_events = 5;
        (fires.military.negotiation as any).strategic_dimensions.RS.international_standing.effective_value = 35;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_crimes_events too low
        const lapsed = baseState(55);
        (lapsed.military.negotiation as any).capital.RS.war_crimes_events = 1;
        (lapsed.military.negotiation as any).strategic_dimensions.RS.international_standing.effective_value = 35;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'international_tribunal_observation')).toBeTruthy();
        // Faction-symmetric verification: dimension_shifts target the responding faction (RS) only.
        expect(def.dimension_shifts?.every(s => s.faction === 'RS')).toBe(true);
    });

    // ── 6. csq_black_market_supply_route ───────────────────────────────────
    it('csq_black_market_supply_route: predicate + supply uplift + cohesion drain', () => {
        const def = getEvent('csq_black_market_supply_route');
        const cond = def.trigger.condition!;
        const fires = baseState(55, {
            military: {
                general_supply_reserve: { RBiH: 20, RS: 70, HRHB: 40 },
            },
        });
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 35 };
        // Need to seed strategic dimensions etc — re-attach since we overrode military
        (fires.military as any).negotiation = {
            capital: {
                RBiH: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 },
                RS: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 },
                HRHB: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 },
            },
            patron_relationships: { RBiH: { support_level: 60, override_authority: 0 }, RS: { support_level: 70, override_authority: 0 }, HRHB: { support_level: 60, override_authority: 0 } },
            strategic_dimensions: { RBiH: fullStrategicDims(), RS: fullStrategicDims(), HRHB: fullStrategicDims() },
        };
        // Add an active formation so cohesion_change has a target (zero brigades = no-op, still valid)
        fires.military.formations = {
            'rb_b1': { id: 'rb_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'rb1', created_turn: 0, assignment: null, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at threshold (not below)
        const lapsed = baseState(55, {
            military: { general_supply_reserve: { RBiH: 35, RS: 70, HRHB: 40 } },
        });
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 35 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect((fires.military.general_supply_reserve as any).RBiH).toBe(40); // 20 + 20
        expect(fires.military.formations.rb_b1.cohesion).toBe(57); // 60 - 3
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'black_market_supply_route')).toBeTruthy();
    });

    // ── 7. csq_refugee_labor_mobilization ──────────────────────────────────
    it('csq_refugee_labor_mobilization: predicate + recruitment uplift + cohesion drain', () => {
        const def = getEvent('csq_refugee_labor_mobilization');
        const cond = def.trigger.condition!;
        const fires = baseState(45, {
            displacement: {
                displacement_state: {
                    'sarajevo': { displaced_in_by_faction: { RBiH: 50000 } },
                    'tuzla': { displaced_in_by_faction: { RBiH: 35000 } },
                },
            },
        });
        fires.military.event_flags = { refugee_absorption_strain_RBiH: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: displacement insufficient
        const lapsed = baseState(45, {
            displacement: {
                displacement_state: { 'sarajevo': { displaced_in_by_faction: { RBiH: 30000 } } },
            },
        });
        lapsed.military.event_flags = { refugee_absorption_strain_RBiH: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.08)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'refugee_labor_mobilization')).toBeTruthy();
    });

    // ── 8. csq_late_war_volunteer_surge ────────────────────────────────────
    it('csq_late_war_volunteer_surge: predicate + recruitment + morale uplift', () => {
        const def = getEvent('csq_late_war_volunteer_surge');
        const cond = def.trigger.condition!;
        const fires = baseState(75, {
            turn_summaries: [
                // most-recent-first
                { territory_snapshot: { RBiH: 0.30, RS: 0.50, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.32, RS: 0.48, HRHB: 0.20 } },
                { territory_snapshot: { RBiH: 0.36, RS: 0.44, HRHB: 0.20 } }, // window_turns=20 fallback to oldest
            ],
        });
        fires.military.event_flags = { war_exhaustion_x100_RBiH: 50 };
        // territory_loss_window: oldest 0.36 - latest 0.30 = 0.06 ≥ 0.04 ✓
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: exhaustion below threshold
        const lapsed = baseState(75, {
            turn_summaries: [
                { territory_snapshot: { RBiH: 0.30 } },
                { territory_snapshot: { RBiH: 0.36 } },
            ],
        });
        lapsed.military.event_flags = { war_exhaustion_x100_RBiH: 30 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RBiH' && m.pool_multiplier === 1.12)).toBe(true);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'late_war_volunteer_surge')).toBeTruthy();
    });

    // ── 9. csq_reservist_exhaustion_callup ─────────────────────────────────
    it('csq_reservist_exhaustion_callup: predicate + recruitment surge + cohesion drain', () => {
        const def = getEvent('csq_reservist_exhaustion_callup');
        const cond = def.trigger.condition!;
        const fires = baseState(95);
        fires.military.event_flags = { war_exhaustion_x100_RS: 55 };
        // Need RS active brigades with low avg morale for morale_average_below predicate
        fires.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 30, cohesion: 60 } as any,
            'rs_b2': { id: 'rs_b2', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs2', created_turn: 0, assignment: null, morale: 35, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: demobilization wave already active (mutex)
        const lapsed = baseState(95);
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 55, demobilization_wave_active_RS: true };
        lapsed.military.formations = {
            'rs_b1': { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 30 } as any,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.recruitment_modifiers?.some(m => m.faction === 'RS' && m.pool_multiplier === 1.15)).toBe(true);
        // Cohesion drain landed on at least one RS brigade
        expect(fires.military.formations.rs_b1.cohesion).toBe(55); // 60 - 5
    });

    // ── 10. csq_partition_referendum_proposal ──────────────────────────────
    it('csq_partition_referendum_proposal: predicate + decision shape + ledger + AUDIT-ONLY', () => {
        const def = getEvent('csq_partition_referendum_proposal');
        const cond = def.trigger.condition!;
        const fires = baseState(120);
        fires.military.event_flags = { tripartite_overture_engaged: 1 };
        // dimension_below RBiH negotiating_leverage < 45
        (fires.military.negotiation as any).strategic_dimensions.RBiH.negotiating_leverage.effective_value = 40;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: dimension at default 50 (not below 45)
        const lapsed = baseState(120);
        lapsed.military.event_flags = { tripartite_overture_engaged: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        const annotation = ledger.annotations?.find(a => a.tag === 'partition_referendum_proposal');
        expect(annotation).toBeTruthy();
        expect(annotation?.text).toMatch(/AUDIT-ONLY/);
        // Decision event shape
        expect(def.requires_player_response).toBe(true);
        expect(def.response_options?.length).toBe(2);
        expect(def.response_options?.map(r => r.id).sort()).toEqual(['engage_referendum', 'refuse_referendum']);
        // No control_change effect anywhere — partition referendum must not flip OSIDs.
        const allEffects = [
            def.effect,
            ...(def.effects ?? []),
            ...(def.response_options?.flatMap(r => r.effects) ?? []),
        ];
        expect(allEffects.some(e => e.kind === 'control_change')).toBe(false);
    });

    // ── Faction-symmetric audit: every event predicate is parameterized over faction
    it('all 10 events are faction-agnostic (no hardcoded enclave OSIDs in conditions)', () => {
        const expectedIds = [
            'csq_separate_track_recovery',
            'csq_alliance_reset_after_rupture',
            'csq_tripartite_federation_overture',
            'csq_patron_equipment_delivery_confirmed',
            'csq_international_tribunal_observation',
            'csq_black_market_supply_route',
            'csq_refugee_labor_mobilization',
            'csq_late_war_volunteer_surge',
            'csq_reservist_exhaustion_callup',
            'csq_partition_referendum_proposal',
        ];
        for (const id of expectedIds) {
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
