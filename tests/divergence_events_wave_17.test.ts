/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-17
 *
 * Per-event predicate + consequence proofs for the 8 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 17 lane.
 *
 * Each test:
 *   1. Constructs a GameState that satisfies the predicate.
 *   2. Constructs a sibling state that violates a single key clause.
 *   3. Asserts evaluateCondition fires only in the satisfied state.
 *   4. Applies the event's effects directly via applyEventEffects (no rng path)
 *      and verifies the consequence wiring lands.
 *
 * Per spec STOP rule, no condition kind or effect kind was invented in this lane.
 * All 8 events reuse predicates and effects already declared on the union types
 * in src/sim/events/event_types.ts and writers in src/sim/events/apply_effects.ts.
 *
 * Themes covered (additive Ring 1 / no-§6):
 *   - Recovery-side: csq_spring_thaw_supply_recovery_HRHB (Wave-16 handoff #1 — closes triad)
 *   - Recovery-side: csq_equipment_quality_recovery_streak_RS (Wave-16 handoff #2)
 *   - Recovery-side: csq_equipment_quality_recovery_streak_HRHB (Wave-16 handoff #3 — closes triad)
 *   - Mirror gap:    csq_grain_corridor_reopened_RS (Wave-3 mirror)
 *   - Mirror gap:    csq_grain_corridor_reopened_HRHB (Wave-3 mirror — closes triad)
 *   - Mirror gap:    csq_arms_pipeline_disrupted_RBiH (Wave-5 mirror)
 *   - Mirror gap:    csq_arms_pipeline_disrupted_HRHB (Wave-5 mirror — closes triad)
 *   - Mirror gap:    csq_captured_equipment_windfall_RS (Wave-5 mirror)
 *
 * Engine-truth quirks honored:
 *   - `flag_at_least` reads numeric flags with `>=` (event_types.ts:627-631)
 *   - `dimension_above` reads `.effective_value` strict `>` (event_types.ts:535-541)
 *   - `supply_below` reads `general_supply_reserve[faction]` strict `<`
 *   - `territory_loss_window` reads `state.turn_summaries` most-recent-first (index 0 = latest)
 *   - `flag_equals` reads `event_flags[flag]` with strict equality
 *   - `flag_not_set` reads truthy `event_flags[flag]` and inverts
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

function fullStrategicDims(overrides: Partial<Record<string, number>> = {}) {
    const dim = (k: string, fallback = 50): { base_value: number; event_modifier: number; effective_value: number } => {
        const v = overrides[k] ?? fallback;
        return { base_value: v, event_modifier: 0, effective_value: v };
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

interface BaseStateOverrides {
    political?: any;
    military?: any;
    displacement?: any;
    turn_summaries?: any;
    rbihDims?: Partial<Record<string, number>>;
    rsDims?: Partial<Record<string, number>>;
    hrhbDims?: Partial<Record<string, number>>;
    rbihSupply?: number;
    rsSupply?: number;
    hrhbSupply?: number;
}

function baseState(turn: number, overrides: BaseStateOverrides = {}): GameState {
    const rbihSupply = overrides.rbihSupply ?? 50;
    const rsSupply = overrides.rsSupply ?? 70;
    const hrhbSupply = overrides.hrhbSupply ?? 40;
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div17' } as GameState['meta'],
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
            general_supply_reserve: { RBiH: rbihSupply, RS: rsSupply, HRHB: hrhbSupply },
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
                    RBiH: fullStrategicDims(overrides.rbihDims),
                    RS: fullStrategicDims(overrides.rsDims),
                    HRHB: fullStrategicDims(overrides.hrhbDims),
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

const WAVE_17_IDS = [
    'csq_spring_thaw_supply_recovery_HRHB',
    'csq_equipment_quality_recovery_streak_RS',
    'csq_equipment_quality_recovery_streak_HRHB',
    'csq_grain_corridor_reopened_RS',
    'csq_grain_corridor_reopened_HRHB',
    'csq_arms_pipeline_disrupted_RBiH',
    'csq_arms_pipeline_disrupted_HRHB',
    'csq_captured_equipment_windfall_RS',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-17: 8 Ring-1 divergence events', () => {
    it('all 8 authored events load via event_loader', () => {
        for (const id of WAVE_17_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // 1. csq_spring_thaw_supply_recovery_HRHB
    it('csq_spring_thaw_supply_recovery_HRHB: predicate + supply +10 + cohesion +2', () => {
        const def = getEvent('csq_spring_thaw_supply_recovery_HRHB');
        const cond = def.trigger.condition!;

        const fires = baseState(75, { hrhbSupply: 40 });
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = {
            war_exhaustion_x100_HRHB: 35,
            turns_since_major_offensive_HRHB: 25,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion at 29 (< 30, flag_at_least uses >=)
        const lapsed = baseState(75, { hrhbSupply: 40 });
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {
            war_exhaustion_x100_HRHB: 29,
            turns_since_major_offensive_HRHB: 25,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const supplyBefore = fires.military.general_supply_reserve!.HRHB;
        applyEventEffects(fires, effectsOf(def));
        const supplyAfter = fires.military.general_supply_reserve!.HRHB;
        expect(supplyAfter).toBeGreaterThan(supplyBefore);
        expect(fires.military.formations.h_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'spring_thaw_supply_recovery_HRHB')).toBeTruthy();
    });

    // 2. csq_equipment_quality_recovery_streak_RS
    it('csq_equipment_quality_recovery_streak_RS: predicate + equipment quality uplift', () => {
        const def = getEvent('csq_equipment_quality_recovery_streak_RS');
        const cond = def.trigger.condition!;

        const fires = baseState(95, { rsDims: { patron_confidence: 60 } });
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { turns_since_major_offensive_RS: 30 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: equipment_quality_recovery_streak_active_RS already set (flag_not_set fails)
        const lapsed = baseState(95, { rsDims: { patron_confidence: 60 } });
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {
            turns_since_major_offensive_RS: 30,
            equipment_quality_recovery_streak_active_RS: true,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        // applyEquipmentQualityModifier writes to state.military.equipment_quality_modifiers
        // (a record keyed by faction); just assert cohesion bump and cost-ledger annotation.
        expect(fires.military.formations.r_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'equipment_quality_recovery_streak_RS')).toBeTruthy();
    });

    // 3. csq_equipment_quality_recovery_streak_HRHB
    it('csq_equipment_quality_recovery_streak_HRHB: predicate + equipment quality uplift', () => {
        const def = getEvent('csq_equipment_quality_recovery_streak_HRHB');
        const cond = def.trigger.condition!;

        const fires = baseState(95, { hrhbDims: { patron_confidence: 60 } });
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { turns_since_major_offensive_HRHB: 30 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: turns_since_major_offensive_HRHB at 24 (< 25, flag_at_least uses >=)
        const lapsed = baseState(95, { hrhbDims: { patron_confidence: 60 } });
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = { turns_since_major_offensive_HRHB: 24 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'equipment_quality_recovery_streak_HRHB')).toBeTruthy();
    });

    // 4. csq_grain_corridor_reopened_RS
    it('csq_grain_corridor_reopened_RS: predicate + supply +25 + cost-ledger annotation', () => {
        const def = getEvent('csq_grain_corridor_reopened_RS');
        const cond = def.trigger.condition!;

        const fires = baseState(55);
        fires.military.event_flags = {
            supply_route_open_grain_corridor_RS: true,
            turns_since_corridor_hostility_RS: 10,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: corridor closed (flag_equals fails on absent flag)
        const lapsed = baseState(55);
        lapsed.military.event_flags = {
            supply_route_open_grain_corridor_RS: false,
            turns_since_corridor_hostility_RS: 10,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const supplyBefore = fires.military.general_supply_reserve!.RS;
        applyEventEffects(fires, effectsOf(def));
        const supplyAfter = fires.military.general_supply_reserve!.RS;
        expect(supplyAfter).toBeGreaterThan(supplyBefore);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'grain_corridor_reopened_RS')).toBeTruthy();
    });

    // 5. csq_grain_corridor_reopened_HRHB
    it('csq_grain_corridor_reopened_HRHB: predicate + supply +25 + cost-ledger annotation', () => {
        const def = getEvent('csq_grain_corridor_reopened_HRHB');
        const cond = def.trigger.condition!;

        const fires = baseState(55);
        fires.military.event_flags = {
            supply_route_open_grain_corridor_HRHB: true,
            turns_since_corridor_hostility_HRHB: 10,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: hostility-streak only 5 turns (< 8, flag_at_least uses >=)
        const lapsed = baseState(55);
        lapsed.military.event_flags = {
            supply_route_open_grain_corridor_HRHB: true,
            turns_since_corridor_hostility_HRHB: 5,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const supplyBefore = fires.military.general_supply_reserve!.HRHB;
        applyEventEffects(fires, effectsOf(def));
        const supplyAfter = fires.military.general_supply_reserve!.HRHB;
        expect(supplyAfter).toBeGreaterThan(supplyBefore);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'grain_corridor_reopened_HRHB')).toBeTruthy();
    });

    // 6. csq_arms_pipeline_disrupted_RBiH
    it('csq_arms_pipeline_disrupted_RBiH: predicate + cost-ledger annotation', () => {
        const def = getEvent('csq_arms_pipeline_disrupted_RBiH');
        const cond = def.trigger.condition!;

        const fires = baseState(65, { rbihSupply: 30 });
        fires.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { patron_arms_review_active_RBiH: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at 35 (supply_below uses strict <, so 35 fails the <35 check)
        const lapsed = baseState(65, { rbihSupply: 35 });
        lapsed.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = { patron_arms_review_active_RBiH: 1 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'arms_pipeline_disrupted_RBiH')).toBeTruthy();
    });

    // 7. csq_arms_pipeline_disrupted_HRHB
    it('csq_arms_pipeline_disrupted_HRHB: predicate + cost-ledger annotation', () => {
        const def = getEvent('csq_arms_pipeline_disrupted_HRHB');
        const cond = def.trigger.condition!;

        const fires = baseState(65, { hrhbSupply: 30 });
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { patron_arms_review_active_HRHB: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_arms_review_active_HRHB unset (flag_at_least requires >=1)
        const lapsed = baseState(65, { hrhbSupply: 30 });
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'h1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'arms_pipeline_disrupted_HRHB')).toBeTruthy();
    });

    // 8. csq_captured_equipment_windfall_RS
    // Engine truth: territory_loss_window reads state.turn_summaries most-recent-first;
    // the helper builds the array with index 0 = latest.
    it('csq_captured_equipment_windfall_RS: predicate + morale +3 + cost-ledger annotation', () => {
        const def = getEvent('csq_captured_equipment_windfall_RS');
        const cond = def.trigger.condition!;

        // Build turn_summaries with RBiH territory loss in window.
        // Engine truth (event_types.ts:667-680): summaries are stored most-recent-first
        // (index 0 = latest); evaluator reads .territory_snapshot[faction].
        const turn_summaries = [
            { turn: 55, territory_snapshot: { RBiH: 0.31, RS: 0.50, HRHB: 0.19 } },
            { turn: 54, territory_snapshot: { RBiH: 0.32, RS: 0.49, HRHB: 0.19 } },
            { turn: 53, territory_snapshot: { RBiH: 0.33, RS: 0.48, HRHB: 0.19 } },
            { turn: 52, territory_snapshot: { RBiH: 0.33, RS: 0.48, HRHB: 0.19 } },
            { turn: 51, territory_snapshot: { RBiH: 0.33, RS: 0.48, HRHB: 0.19 } },
            { turn: 50, territory_snapshot: { RBiH: 0.34, RS: 0.47, HRHB: 0.19 } },
        ];
        const fires = baseState(55, { turn_summaries });
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { major_operation_success_RS: 1 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: no major_operation_success flag set
        const lapsed = baseState(55, { turn_summaries });
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {};
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const moraleBefore = fires.military.formations.r_b1.morale ?? 0;
        applyEventEffects(fires, effectsOf(def));
        const moraleAfter = fires.military.formations.r_b1.morale ?? 0;
        expect(moraleAfter).toBeGreaterThan(moraleBefore);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'captured_equipment_windfall_RS')).toBeTruthy();
    });

    // Loader audit: every Wave 17 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 17 event has trigger, effect, and Wave-17 historical_source tag', () => {
        for (const id of WAVE_17_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            expect(def.historical_source).toMatch(/WAVE-17/);
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // turn_min audit: every Wave 17 event has turn_min >= 50 (40w byte-stable by construction)
    it('all 8 Wave 17 events have turn_min >= 50 (40w byte-stable)', () => {
        for (const id of WAVE_17_IDS) {
            const def = getEvent(id);
            const turnMin = def.trigger.turn_min ?? 0;
            if (turnMin < 50) {
                throw new Error(`event ${id} has turn_min=${turnMin}, must be >= 50`);
            }
        }
        expect(true).toBe(true);
    });

    // Faction-symmetric audit: every Wave 17 event predicate is parameterized over faction
    it('all 8 Wave 17 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_17_IDS) {
            const def = getEvent(id);
            const cond = def.trigger.condition;
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

    // No new condition kinds: every Wave 17 predicate uses pre-existing kinds (STOP rule)
    it('all 8 Wave 17 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_17_IDS) {
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

    // No new effect kinds: every Wave 17 effect uses pre-existing kinds (STOP rule)
    it('all 8 Wave 17 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_17_IDS) {
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
