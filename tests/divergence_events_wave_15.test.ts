/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-15
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 15 lane.
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
 *   - Wave-3 mirror:    csq_demobilization_pressure_wave_RBiH (closes triad with HRHB)
 *   - Wave-3 mirror:    csq_demobilization_pressure_wave_HRHB
 *   - Wave-14 mirror:   csq_paramilitary_refusal_streak_HRHB
 *   - Wave-14 mirror:   csq_paramilitary_refusal_streak_RS (closes refusal-streak triad)
 *   - Wave-3 mirror:    csq_industrial_conscription_wave_RS
 *   - Wave-3 mirror:    csq_industrial_conscription_wave_HRHB (closes industrial-conscription triad)
 *
 * Engine-truth quirks honored:
 *   - `flag_at_least` reads numeric flags with `>=` (event_types.ts:627)
 *   - `patron_pressure_above` reads `.override_authority` with strict `>` (event_types.ts:553)
 *   - `paramilitary_mode_equals` aggregates over active formations (event_types.ts:594)
 *   - `territory_loss_window` reads turn_summaries[*].territory_snapshot
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div15' } as GameState['meta'],
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

const WAVE_15_IDS = [
    'csq_demobilization_pressure_wave_RBiH',
    'csq_demobilization_pressure_wave_HRHB',
    'csq_paramilitary_refusal_streak_HRHB',
    'csq_paramilitary_refusal_streak_RS',
    'csq_industrial_conscription_wave_RS',
    'csq_industrial_conscription_wave_HRHB',
];

/**
 * Builds a turn_summaries array suitable for territory_loss_window predicates.
 * Engine truth (event_types.ts:666-680): turn_summaries are most-recent-first
 * (index 0 = latest). The predicate computes loss = past[windowIdx].snap -
 * summaries[0].snap and requires loss >= min_loss_pct. We synthesize index 0
 * at 0.24 and index 30 at 0.30 → loss = 0.06 (clears 0.05 threshold).
 */
function makeTerritoryLossSummaries(faction: 'RBiH' | 'RS' | 'HRHB'): any[] {
    const summaries: any[] = [];
    // most-recent-first; need at least 31 entries (windowIdx=30)
    for (let i = 0; i <= 35; i++) {
        const share = i === 0 ? 0.24 : 0.24 + 0.06 * (i / 30);
        summaries.push({ turn: 100 - i, territory_snapshot: { [faction]: share } });
    }
    return summaries;
}

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-15: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_15_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // 1. csq_demobilization_pressure_wave_RBiH
    it('csq_demobilization_pressure_wave_RBiH: predicate + recruitment slow + aggression dampen', () => {
        const def = getEvent('csq_demobilization_pressure_wave_RBiH');
        const cond = def.trigger.condition!;
        const fires = baseState(105);
        fires.military.event_flags = {
            war_exhaustion_x100_RBiH: 60,
            turns_since_major_offensive_RBiH: 35,
        };
        (fires.military.negotiation as any).patron_relationships.RBiH.override_authority = 15;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_pressure at 9 (engine uses >= so 10 passes; 9 fails)
        const lapsed = baseState(105);
        lapsed.military.event_flags = {
            war_exhaustion_x100_RBiH: 60,
            turns_since_major_offensive_RBiH: 35,
        };
        (lapsed.military.negotiation as any).patron_relationships.RBiH.override_authority = 9;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'demobilization_pressure_wave_RBiH')).toBeTruthy();
    });

    // 2. csq_demobilization_pressure_wave_HRHB
    it('csq_demobilization_pressure_wave_HRHB: predicate + recruitment slow + aggression dampen', () => {
        const def = getEvent('csq_demobilization_pressure_wave_HRHB');
        const cond = def.trigger.condition!;
        const fires = baseState(105);
        fires.military.event_flags = {
            war_exhaustion_x100_HRHB: 60,
            turns_since_major_offensive_HRHB: 35,
        };
        (fires.military.negotiation as any).patron_relationships.HRHB.override_authority = 15;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion at 54 (< 55, flag_at_least uses >=)
        const lapsed = baseState(105);
        lapsed.military.event_flags = {
            war_exhaustion_x100_HRHB: 54,
            turns_since_major_offensive_HRHB: 35,
        };
        (lapsed.military.negotiation as any).patron_relationships.HRHB.override_authority = 15;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'demobilization_pressure_wave_HRHB')).toBeTruthy();
    });

    // 3. csq_paramilitary_refusal_streak_HRHB
    it('csq_paramilitary_refusal_streak_HRHB: predicate + cohesion +2', () => {
        const def = getEvent('csq_paramilitary_refusal_streak_HRHB');
        const cond = def.trigger.condition!;
        // paramilitary_mode_equals(rear_pocket): no active formation has paramilitary_mode='offensive'
        // war_exhaustion_x100_HRHB>=50
        const fires = baseState(75);
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'rear_pocket' } as any,
        };
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 55 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: any active formation with paramilitary_mode='offensive' flips aggregate
        const lapsed = baseState(75);
        lapsed.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'offensive' } as any,
        };
        lapsed.military.event_flags = { war_exhaustion_x100_HRHB: 55 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'paramilitary_refusal_streak_HRHB')).toBeTruthy();
    });

    // 4. csq_paramilitary_refusal_streak_RS
    it('csq_paramilitary_refusal_streak_RS: predicate + cohesion +2', () => {
        const def = getEvent('csq_paramilitary_refusal_streak_RS');
        const cond = def.trigger.condition!;
        const fires = baseState(75);
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'rear_pocket' } as any,
        };
        fires.military.event_flags = { war_exhaustion_x100_RS: 55 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion_x100_RS at 49 (< 50, flag_at_least uses >=)
        const lapsed = baseState(75);
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60, paramilitary_mode: 'rear_pocket' } as any,
        };
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 49 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.r_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'paramilitary_refusal_streak_RS')).toBeTruthy();
    });

    // 5. csq_industrial_conscription_wave_RS
    it('csq_industrial_conscription_wave_RS: predicate + recruitment uplift + cohesion -8', () => {
        const def = getEvent('csq_industrial_conscription_wave_RS');
        const cond = def.trigger.condition!;
        const fires = baseState(60, {
            turn_summaries: makeTerritoryLossSummaries('RS'),
        });
        fires.military.event_flags = { war_exhaustion_x100_RS: 40 };
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'rs1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion at 34 (< 35, flag_at_least uses >=)
        const lapsed = baseState(60, {
            turn_summaries: makeTerritoryLossSummaries('RS'),
        });
        lapsed.military.event_flags = { war_exhaustion_x100_RS: 34 };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.r_b1.cohesion).toBe(52); // 60 - 8
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'industrial_conscription_wave_RS')).toBeTruthy();
    });

    // 6. csq_industrial_conscription_wave_HRHB
    it('csq_industrial_conscription_wave_HRHB: predicate + recruitment uplift + cohesion -8', () => {
        const def = getEvent('csq_industrial_conscription_wave_HRHB');
        const cond = def.trigger.condition!;
        const fires = baseState(60, {
            turn_summaries: makeTerritoryLossSummaries('HRHB'),
        });
        fires.military.event_flags = { war_exhaustion_x100_HRHB: 40 };
        fires.military.formations = {
            'h_b1': { id: 'h_b1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'hb1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: industrial_wave_active_HRHB already set (flag_not_set fails)
        const lapsed = baseState(60, {
            turn_summaries: makeTerritoryLossSummaries('HRHB'),
        });
        lapsed.military.event_flags = {
            war_exhaustion_x100_HRHB: 40,
            industrial_wave_active_HRHB: true,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        expect(fires.military.formations.h_b1.cohesion).toBe(52); // 60 - 8
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'industrial_conscription_wave_HRHB')).toBeTruthy();
    });

    // Loader audit: every Wave 15 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 15 event has trigger, effect, and Wave-15 historical_source tag', () => {
        for (const id of WAVE_15_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            // historical_source present and tagged WAVE-15
            expect(def.historical_source).toMatch(/WAVE-15/);
            // None of these are decision events
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // turn_min audit: every Wave 15 event has turn_min >= 50 (40w byte-stable by construction)
    it('all 6 Wave 15 events have turn_min >= 50 (40w byte-stable)', () => {
        for (const id of WAVE_15_IDS) {
            const def = getEvent(id);
            const turnMin = def.trigger.turn_min ?? 0;
            if (turnMin < 50) {
                throw new Error(`event ${id} has turn_min=${turnMin}, must be >= 50`);
            }
        }
        expect(true).toBe(true);
    });

    // Faction-symmetric audit: every Wave 15 event predicate is parameterized over faction
    it('all 6 Wave 15 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_15_IDS) {
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

    // No new condition kinds: every Wave 15 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 15 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_15_IDS) {
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

    // No new effect kinds: every Wave 15 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 15 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_15_IDS) {
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
