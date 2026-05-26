/**
 * LANE-NIGHTSHIFT-CONSEQUENCE-BREADTH — v2 breadth events + cost-ledger templates.
 *
 * Verifies:
 *   - 11 of 12 specified events fire under their predicates (#11 deferred).
 *   - The 8 cost-ledger templates are well-formed and discoverable.
 *
 * No 40w smoke is required for this lane (later-turn triggers, see lane spec).
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import {
    COST_LEDGER_TEMPLATES,
    getCostLedgerTemplate,
    getPerFactionTemplates,
    getFactionAgnosticTemplates,
} from '../src/sim/endgame/cost_ledger_templates/index.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

function rng(): number { return 0.5; }

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);

function baseState(turn: number, opts: {
    flags?: Record<string, string | number | boolean>;
    alliance?: number;
    factionFor?: FactionId;
} = {}): GameState {
    const faction = opts.factionFor ?? 'RBiH';
    return {
        schema_version: 1,
        meta: {
            turn,
            phase: 'war',
            scenario_id: 'test',
            player_faction: faction,
            seed: 'csq-breadth',
        } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_brig_1: {
                    id: 'rbih_brig_1', faction: 'RBiH', name: 'B1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale: 60, cohesion: 70,
                } as any,
                rs_brig_1: {
                    id: 'rs_brig_1', faction: 'RS', name: 'V1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale: 60, cohesion: 70,
                } as any,
                hrhb_brig_1: {
                    id: 'hrhb_brig_1', faction: 'HRHB', name: 'H1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale: 60, cohesion: 70,
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: { ...(opts.flags ?? {}) },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: opts.alliance ?? 1.0,
            political_controllers: {},
        } as GameState['political'],
        displacement: {
            displacement_state: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            sustainability_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
        } as GameState['displacement'],
    } as unknown as GameState;
}

// ─── Predicate tests (11 of 12 events; #11 deferred per lane spec) ──

describe('LANE-NIGHTSHIFT-CONSEQUENCE-BREADTH — event predicates', () => {

    it('csq_alliance_drift_silent_w20 fires under alliance below 0.40 with drop ≥0.20 and turn≥20', () => {
        const state = baseState(22, { alliance: 0.30 });
        evaluateEvents(state, rng, 22, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_alliance_drift_silent_w20');
    });

    it('csq_joint_command_collapse fires when joint_operations_agreement_active true and alliance <0.30', () => {
        const state = baseState(30, {
            flags: { joint_operations_agreement_active: true },
            alliance: 0.20,
        });
        evaluateEvents(state, rng, 30, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_joint_command_collapse');
    });

    it('csq_separate_peace_overture fires under peace_plan_offered + acceptance_gap ≥25', () => {
        const state = baseState(80, {
            flags: { peace_plan_offered: true, peace_plan_acceptance_gap: 30 },
        });
        evaluateEvents(state, rng, 80, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_separate_peace_overture');
    });

    it('csq_alliance_revival_after_hostility fires when alliance recovers above 0.30 after low-water mark', () => {
        const state = baseState(90, {
            flags: { alliance_low_water_mark_below_0_10: 1 },
            alliance: 0.40,
        });
        evaluateEvents(state, rng, 90, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_alliance_revival_after_hostility');
    });

    it('csq_patron_arms_review_imposed fires under patron_resist_streak ≥2 and patron_confidence <40', () => {
        const state = baseState(20, {
            flags: { patron_resist_streak: 3 },
        });
        // Configure low patron_confidence on RS strategic_dimensions
        state.military.negotiation = {
            strategic_dimensions: {
                RS: {
                    patron_confidence: { base_value: 30, event_modifier: 0, effective_value: 30 },
                } as any,
            } as any,
        } as any;
        evaluateEvents(state, rng, 20, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_patron_arms_review_imposed');
    });

    it('csq_patron_disavowal_partial fires when patron_arms_review_active and resist_streak ≥4', () => {
        const state = baseState(30, {
            flags: { patron_arms_review_active: true, patron_resist_streak: 5 },
        });
        evaluateEvents(state, rng, 30, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_patron_disavowal_partial');
    });

    it('csq_patron_recovery_offer fires when patron_partial_disavowal flag set after w45', () => {
        const state = baseState(50, {
            flags: { patron_partial_disavowal: true },
        });
        evaluateEvents(state, rng, 50, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_patron_recovery_offer');
    });

    it('csq_industrial_conscription_wave fires under exhaustion + territory_loss_window predicate', () => {
        const state = baseState(50, {
            flags: { war_exhaustion_x100_RBiH: 40 },
        });
        // Seed turn_summaries: latest=0.40, oldest-in-window=0.50 → 10pp loss > 5%.
        state.turn_summaries = [
            { territory_snapshot: { RBiH: 0.40 } } as any, // index 0 = latest
            { territory_snapshot: { RBiH: 0.45 } } as any,
            { territory_snapshot: { RBiH: 0.50 } } as any, // oldest available
        ];
        evaluateEvents(state, rng, 50, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_industrial_conscription_wave');
    });

    it('csq_demobilization_pressure_wave fires under exhaustion + patron_pressure + idle window', () => {
        const state = baseState(110, {
            flags: {
                war_exhaustion_x100_RS: 60,
                turns_since_major_offensive_RS: 35,
            },
            // Suppress Wave-13 csq_extended_truce_streak_* triad which fires
            // on alliance_above 0.6 + turn>=70 default-alliance=1.0 setup,
            // crowding the MAX_EVENTS_PER_TURN=4 cap and pushing
            // csq_demobilization_pressure_wave out of the firing slot.
            alliance: 0.50,
        });
        // patron_pressure_above reads override_authority on patron_relationships
        state.military.negotiation = {
            patron_relationships: {
                RS: { override_authority: 12 } as any,
            } as any,
        } as any;
        evaluateEvents(state, rng, 110, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_demobilization_pressure_wave');
    });

    it('csq_grain_corridor_reopened fires under route open + 8 turns no hostility', () => {
        const state = baseState(35, {
            flags: {
                supply_route_open_grain_corridor: true,
                turns_since_corridor_hostility: 10,
            },
        });
        evaluateEvents(state, rng, 35, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_grain_corridor_reopened');
    });

    it('csq_refugee_absorption_strain fires under displaced_in_aggregate ≥100,000 for receiving faction', () => {
        const state = baseState(30);
        state.displacement = {
            displacement_state: {
                'sarajevo-centar': {
                    mun_id: 'sarajevo-centar',
                    original_population: 100000, displaced_out: 0, displaced_in: 60000,
                    displaced_in_by_faction: { RBiH: 60000 },
                    lost_population: 0, last_updated_turn: 30,
                } as any,
                'tuzla': {
                    mun_id: 'tuzla',
                    original_population: 100000, displaced_out: 0, displaced_in: 50000,
                    displaced_in_by_faction: { RBiH: 50000 },
                    lost_population: 0, last_updated_turn: 30,
                } as any,
            },
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            sustainability_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
        } as GameState['displacement'];
        evaluateEvents(state, rng, 30, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_refugee_absorption_strain');
    });
});

// ─── Cost-ledger template registry tests (3) ──

describe('LANE-NIGHTSHIFT-CONSEQUENCE-BREADTH — cost-ledger templates', () => {
    it('exposes exactly 8 templates covering all spec slots T1–T8', () => {
        expect(COST_LEDGER_TEMPLATES).toHaveLength(8);
        const ids = COST_LEDGER_TEMPLATES.map(t => t.id).sort();
        expect(ids).toEqual([
            'alliance_arc_ledger',
            'casualty_ledger_per_faction',
            'civilian_displacement_aggregate',
            'condemnation_flags_recorded',
            'divergence_from_history_ledger',
            'economic_strain_ledger',
            'patron_relationship_ledger',
            'war_duration_and_endgame_ledger',
        ]);
        const categories = new Set(COST_LEDGER_TEMPLATES.map(t => t.category));
        expect(categories.size).toBe(8);
    });

    it('all templates declare a non-empty description_template and at least one data_source', () => {
        for (const t of COST_LEDGER_TEMPLATES) {
            expect(t.description_template.length).toBeGreaterThan(0);
            // ICTY-voice rule: no second-person pronouns in templates.
            expect(/\byou\b|\byour\b|\byours\b/i.test(t.description_template)).toBe(false);
            expect(t.data_sources.length).toBeGreaterThan(0);
        }
    });

    it('per-faction and faction-agnostic partition is exhaustive and disjoint', () => {
        const perFaction = getPerFactionTemplates();
        const agnostic = getFactionAgnosticTemplates();
        expect(perFaction.length + agnostic.length).toBe(COST_LEDGER_TEMPLATES.length);
        const perFactionIds = new Set(perFaction.map(t => t.id));
        for (const t of agnostic) {
            expect(perFactionIds.has(t.id)).toBe(false);
        }
        // Spot-check accessor: divergence template is faction-agnostic, casualty is per-faction.
        expect(getCostLedgerTemplate('divergence_from_history_ledger')?.per_faction).not.toBe(true);
        expect(getCostLedgerTemplate('casualty_ledger_per_faction')?.per_faction).toBe(true);
    });
});
