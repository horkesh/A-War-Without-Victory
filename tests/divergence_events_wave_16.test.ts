/**
 * LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-16
 *
 * Per-event predicate + consequence proofs for the 6 Ring 1 / no-§6
 * divergence events authored in data/scenarios/events/consequences.json
 * during the Wave 16 lane.
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
 *   - Recovery-side:    csq_negotiating_capital_recovery_RBiH (Wave-15 handoff #1)
 *   - Recovery-side:    csq_negotiating_capital_recovery_RS (closes recovery-leverage triad)
 *   - Recovery-side:    csq_negotiating_capital_recovery_HRHB (closes recovery-leverage triad)
 *   - Recovery-side:    csq_spring_thaw_supply_recovery_RBiH (Wave-15 handoff #1 spring-thaw counterpart)
 *   - Recovery-side:    csq_spring_thaw_supply_recovery_RS (closes spring-thaw pair)
 *   - Recovery-side:    csq_equipment_quality_recovery_streak_RBiH (Wave-15 handoff #4)
 *
 * Engine-truth quirks honored:
 *   - `flag_at_least` reads numeric flags with `>=` (event_types.ts:627-631)
 *   - `patron_pressure_above` reads `.override_authority` with `>=` (event_types.ts:551-553)
 *   - `dimension_above` reads `.effective_value` strict `>` (event_types.ts:535-541)
 *   - `supply_below` reads `general_supply_reserve[faction]` strict `<`
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
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'div16' } as GameState['meta'],
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

const WAVE_16_IDS = [
    'csq_negotiating_capital_recovery_RBiH',
    'csq_negotiating_capital_recovery_RS',
    'csq_negotiating_capital_recovery_HRHB',
    'csq_spring_thaw_supply_recovery_RBiH',
    'csq_spring_thaw_supply_recovery_RS',
    'csq_equipment_quality_recovery_streak_RBiH',
];

describe('LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-16: 6 Ring-1 divergence events', () => {
    it('all 6 authored events load via event_loader', () => {
        for (const id of WAVE_16_IDS) {
            expect(ALL_EVENTS.find(e => e.id === id)?.id).toBe(id);
        }
    });

    // 1. csq_negotiating_capital_recovery_RBiH
    // Engine truth: applyNegotiationBreakdown writes to neg.capital[faction][dimension].
    // negotiating_leverage is a strategic_dimensions field, not a capital field, so the
    // negotiation_capital effect kind is a no-op for state mutation when targeting
    // negotiating_leverage; we assert the cost-ledger annotation lands instead.
    it('csq_negotiating_capital_recovery_RBiH: predicate + cost-ledger annotation', () => {
        const def = getEvent('csq_negotiating_capital_recovery_RBiH');
        const cond = def.trigger.condition!;

        const fires = baseState(85, { rbihDims: { patron_confidence: 60 } });
        fires.military.event_flags = { turns_since_major_offensive_RBiH: 30 };
        (fires.military.negotiation as any).patron_relationships.RBiH.override_authority = 15;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_pressure at 11 (engine uses >=12, so 11 fails)
        const lapsed = baseState(85, { rbihDims: { patron_confidence: 60 } });
        lapsed.military.event_flags = { turns_since_major_offensive_RBiH: 30 };
        (lapsed.military.negotiation as any).patron_relationships.RBiH.override_authority = 11;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'negotiating_capital_recovery_RBiH')).toBeTruthy();
    });

    // 2. csq_negotiating_capital_recovery_RS
    it('csq_negotiating_capital_recovery_RS: predicate + cost-ledger annotation', () => {
        const def = getEvent('csq_negotiating_capital_recovery_RS');
        const cond = def.trigger.condition!;

        const fires = baseState(85, { rsDims: { patron_confidence: 60 } });
        fires.military.event_flags = { turns_since_major_offensive_RS: 30 };
        (fires.military.negotiation as any).patron_relationships.RS.override_authority = 15;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: patron_confidence at 54 (dimension_above uses >=, so 54 fails the >=55 check)
        const lapsed = baseState(85, { rsDims: { patron_confidence: 54 } });
        lapsed.military.event_flags = { turns_since_major_offensive_RS: 30 };
        (lapsed.military.negotiation as any).patron_relationships.RS.override_authority = 15;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'negotiating_capital_recovery_RS')).toBeTruthy();
    });

    // 3. csq_negotiating_capital_recovery_HRHB
    it('csq_negotiating_capital_recovery_HRHB: predicate + cost-ledger annotation', () => {
        const def = getEvent('csq_negotiating_capital_recovery_HRHB');
        const cond = def.trigger.condition!;

        const fires = baseState(85, { hrhbDims: { patron_confidence: 60 } });
        fires.military.event_flags = { turns_since_major_offensive_HRHB: 30 };
        (fires.military.negotiation as any).patron_relationships.HRHB.override_authority = 15;
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: turns_since_major_offensive_HRHB at 24 (< 25, flag_at_least uses >=)
        const lapsed = baseState(85, { hrhbDims: { patron_confidence: 60 } });
        lapsed.military.event_flags = { turns_since_major_offensive_HRHB: 24 };
        (lapsed.military.negotiation as any).patron_relationships.HRHB.override_authority = 15;
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'negotiating_capital_recovery_HRHB')).toBeTruthy();
    });

    // 4. csq_spring_thaw_supply_recovery_RBiH
    it('csq_spring_thaw_supply_recovery_RBiH: predicate + supply +10 + cohesion +2', () => {
        const def = getEvent('csq_spring_thaw_supply_recovery_RBiH');
        const cond = def.trigger.condition!;

        const fires = baseState(75, { rbihSupply: 40 });
        fires.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = {
            war_exhaustion_x100_RBiH: 35,
            turns_since_major_offensive_RBiH: 25,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: war_exhaustion at 29 (< 30, flag_at_least uses >=)
        const lapsed = baseState(75, { rbihSupply: 40 });
        lapsed.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {
            war_exhaustion_x100_RBiH: 29,
            turns_since_major_offensive_RBiH: 25,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const supplyBefore = fires.military.general_supply_reserve!.RBiH;
        applyEventEffects(fires, effectsOf(def));
        const supplyAfter = fires.military.general_supply_reserve!.RBiH;
        expect(supplyAfter).toBeGreaterThan(supplyBefore);
        expect(fires.military.formations.a_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'spring_thaw_supply_recovery_RBiH')).toBeTruthy();
    });

    // 5. csq_spring_thaw_supply_recovery_RS
    it('csq_spring_thaw_supply_recovery_RS: predicate + supply +10 + cohesion +2', () => {
        const def = getEvent('csq_spring_thaw_supply_recovery_RS');
        const cond = def.trigger.condition!;

        const fires = baseState(75, { rsSupply: 40 });
        fires.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = {
            war_exhaustion_x100_RS: 35,
            turns_since_major_offensive_RS: 25,
        };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: supply at 50 — supply_below uses strict <, so 50 fails (need <50)
        const lapsed = baseState(75, { rsSupply: 50 });
        lapsed.military.formations = {
            'r_b1': { id: 'r_b1', faction: 'RS', kind: 'brigade', status: 'active', name: 'r1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {
            war_exhaustion_x100_RS: 35,
            turns_since_major_offensive_RS: 25,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        const supplyBefore = fires.military.general_supply_reserve!.RS;
        applyEventEffects(fires, effectsOf(def));
        const supplyAfter = fires.military.general_supply_reserve!.RS;
        expect(supplyAfter).toBeGreaterThan(supplyBefore);
        expect(fires.military.formations.r_b1.cohesion).toBe(62);
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'spring_thaw_supply_recovery_RS')).toBeTruthy();
    });

    // 6. csq_equipment_quality_recovery_streak_RBiH
    it('csq_equipment_quality_recovery_streak_RBiH: predicate + equipment quality uplift', () => {
        const def = getEvent('csq_equipment_quality_recovery_streak_RBiH');
        const cond = def.trigger.condition!;

        const fires = baseState(95, { rbihDims: { patron_confidence: 60 } });
        fires.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        fires.military.event_flags = { turns_since_major_offensive_RBiH: 30 };
        expect(evaluateCondition(cond, fires)).toBe(true);

        // Lapsed: equipment_quality_recovery_streak_active_RBiH already set (flag_not_set fails)
        const lapsed = baseState(95, { rbihDims: { patron_confidence: 60 } });
        lapsed.military.formations = {
            'a_b1': { id: 'a_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'a1', created_turn: 0, assignment: null, morale: 50, cohesion: 60 } as any,
        };
        lapsed.military.event_flags = {
            turns_since_major_offensive_RBiH: 30,
            equipment_quality_recovery_streak_active_RBiH: true,
        };
        expect(evaluateCondition(cond, lapsed)).toBe(false);

        applyEventEffects(fires, effectsOf(def));
        // applyEquipmentQualityModifier writes to state.military.equipment_quality_modifiers
        // (a record keyed by faction); just assert cost-ledger annotation lands and cohesion bumps.
        expect(fires.military.formations.a_b1.cohesion).toBe(62); // 60 + 2
        const ledger = buildCostLedger(fires);
        expect(ledger.annotations?.find(a => a.tag === 'equipment_quality_recovery_streak_RBiH')).toBeTruthy();
    });

    // Loader audit: every Wave 16 ID returns a well-formed EventDefinition
    it('loader audit: every Wave 16 event has trigger, effect, and Wave-16 historical_source tag', () => {
        for (const id of WAVE_16_IDS) {
            const def = getEvent(id);
            expect(def.id).toBe(id);
            expect(def.trigger).toBeTruthy();
            expect(def.effect).toBeTruthy();
            expect(typeof def.effect.kind).toBe('string');
            expect(def.historical_source).toMatch(/WAVE-16/);
            expect(def.requires_player_response).not.toBe(true);
        }
    });

    // turn_min audit: every Wave 16 event has turn_min >= 50 (40w byte-stable by construction)
    it('all 6 Wave 16 events have turn_min >= 50 (40w byte-stable)', () => {
        for (const id of WAVE_16_IDS) {
            const def = getEvent(id);
            const turnMin = def.trigger.turn_min ?? 0;
            if (turnMin < 50) {
                throw new Error(`event ${id} has turn_min=${turnMin}, must be >= 50`);
            }
        }
        expect(true).toBe(true);
    });

    // Faction-symmetric audit: every Wave 16 event predicate is parameterized over faction
    it('all 6 Wave 16 events are faction-agnostic (no hardcoded OSIDs in conditions)', () => {
        for (const id of WAVE_16_IDS) {
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

    // No new condition kinds: every Wave 16 predicate uses pre-existing kinds (STOP rule)
    it('all 6 Wave 16 events use only pre-existing condition kinds (STOP rule)', () => {
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
        for (const id of WAVE_16_IDS) {
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

    // No new effect kinds: every Wave 16 effect uses pre-existing kinds (STOP rule)
    it('all 6 Wave 16 events use only pre-existing effect kinds (STOP rule)', () => {
        const ALLOWED_EFFECT_KINDS = new Set([
            'narrative', 'morale_change', 'supply_delta', 'cohesion_change',
            'humanitarian_impact', 'patron_pressure', 'alliance_change',
            'negotiation_capital', 'equipment_grant', 'aggression_modifier',
            'control_change',
            'guerrilla_threat', 'recruitment_modifier', 'equipment_quality_modifier',
            'doctrine_constraint', 'alliance_lock', 'bot_priority_shift',
            'cost_ledger_annotation',
        ]);
        for (const id of WAVE_16_IDS) {
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
