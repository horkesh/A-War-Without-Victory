import { describe, expect, it } from 'vitest';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../src/state/game_state.js';
import type {
    BrigadeEvaluation,
    CommanderBriefing,
    ForceAssessment,
    OfficerPersonality,
    ThreatAssessment,
    ZoneId,
} from '../../src/sim/combat/commander/commander_state.js';
import type { AllocationResult } from '../../src/sim/combat/commander/allocate.js';
import type { PlanDecision } from '../../src/sim/combat/commander/plan.js';
import type { DecisionResult } from '../../src/sim/combat/commander/decide.js';
import type { SpatialContext } from '../../src/sim/spatial_context.js';
import { emitCommanderOutput } from '../../src/sim/combat/commander/emit.js';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_test_corps' as FormationId;
const defaultPersonality: OfficerPersonality = {
    aggression: 0.6,
    caution: 0.3,
    initiative: 0.8,
    competence: 0.6,
};

function makeBrigade(id: string, locationOsid: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: id as FormationId,
        faction: FACTION,
        corps_id: CORPS_ID,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1200,
        cohesion: 70,
        morale: 65,
        disrupted_turns: 0,
        entrenchment_turns: 0,
        location_osid: locationOsid,
        ...overrides,
    } as FormationState;
}

function makeEval(brigadeId: string): BrigadeEvaluation {
    return {
        brigade_id: brigadeId as FormationId,
        fitness_offense: 0.7,
        fitness_defense: 0.5,
        fitness_garrison: 0.4,
        equipment_class: undefined,
        equipment_priority: 0,
        tier: 'active_defense',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 65,
        current_zone: 'zone:test:0' as ZoneId,
    };
}

function makeSector(): CorpsFrontSector {
    return {
        sector_id: `sector:${CORPS_ID}:0`,
        corps_id: CORPS_ID,
        faction: FACTION,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: `subseg:${CORPS_ID}:0`,
            edge_ids: ['e1'],
            friendly_osids: ['op:test:approach'],
            enemy_osids: ['op:test:objective'],
            primary_brigade_ids: ['b1', 'b2'],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: ['op:test:approach'],
        assigned_brigade_ids: ['b1', 'b2'] as FormationId[],
        reserve_brigade_ids: [],
        density: 2,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeSpatial(): SpatialContext {
    const adjacency = new Map<string, readonly string[]>([
        ['op:test:approach', ['op:test:objective']],
        ['op:test:objective', ['op:test:approach']],
    ]);
    return {
        adjacency,
        sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
            [FACTION, new Set(['op:test:approach'])],
            ['RBiH' as FactionId, new Set(['op:test:objective'])],
            ['HRHB' as FactionId, new Set()],
        ]),
        componentsByFaction: new Map(),
        frontEdgesOsid: undefined,
        computedAtTurn: 1,
        phase: 'pre-combat',
    } as SpatialContext;
}

function makeBriefing(activeOperations: any[] = [], brigades: FormationState[] = [
    makeBrigade('b1', 'op:test:approach'),
    makeBrigade('b2', 'op:test:approach'),
]): CommanderBriefing {
    return {
        corps_id: CORPS_ID,
        faction: FACTION,
        turn: 10,
        spatial: makeSpatial(),
        sectors: [makeSector()],
        brigades,
        state_ref: {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 10, phase: 'war', seed: 'emit-overlap' } as any,
            factions: [{ id: FACTION }] as any,
            military: {
                brigade_movement_state: {},
                corps_command: {
                    [CORPS_ID]: {
                        command_span: 5,
                        subordinate_count: brigades.length,
                        og_slots: 0,
                        active_ogs: [],
                        active_operations: activeOperations,
                        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
                        stance: 'offensive',
                    },
                },
            },
            political: {} as any,
            displacement: {} as any,
        } as unknown as GameState,
        reverse_map: null,
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'offensive',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: defaultPersonality,
        pre_planned_ops: [],
        previous_state: null,
        active_operations: activeOperations as any,
        failed_offensive_objectives: {},
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
    } as CommanderBriefing;
}

function makeForces(): ForceAssessment {
    const evals = [makeEval('b1'), makeEval('b2')];
    return {
        total_brigades: 2,
        combat_effective: 2,
        evaluations: evals,
        by_zone: { 'zone:test:0': evals },
        tier_counts: { main_effort: 0, active_defense: 2, garrison: 0 },
        total_surplus: 2,
    };
}

function makeAllocation(): AllocationResult {
    return {
        zones: [],
        garrison_locks: [],
        surplus_pool: [makeEval('b1'), makeEval('b2')],
        total_garrison_budget: 0,
        can_launch_ops: true,
    };
}

function makeDecisions(): DecisionResult {
    return {
        stance_changes: [],
        reserve_shifts: [],
        intel_picture: {
            enemy_concentration_zone: null,
            known_enemy_osids: [],
            known_enemy_strength: {},
        } as any,
        activity_entries: [],
        suspend_plan: false,
        reinforcement_requests: [],
    };
}

function makeThreats(): ThreatAssessment {
    return {
        threatened_zones: [],
        enemy_concentration_zones: [],
        recent_losses: [],
        overall_pressure: 'low',
    };
}

function makePlanDecision(): PlanDecision {
    return {
        plan: {
            plan_id: 'plan:test',
            created_turn: 9,
            source: 'opportunity',
            status: 'ready',
            staging_zone: 'zone:test:0' as ZoneId,
            target_osids: ['op:test:objective'],
            required_brigades: 2,
            concentrated_brigades: ['b1' as FormationId, 'b2' as FormationId],
            current_concentration_turn: 1,
            max_concentration_turns: 2,
            viability_score: 0.8,
            suspension_turns: 0,
        } as any,
        action: 'advanced',
        reason: 'ready',
        decision_trace: {
            turn: 10,
            winning_intent_id: 'launch',
            candidates: [],
            hard_constraints: [],
            lessons_applied: [],
            relationships_applied: [],
        },
    };
}

describe('commander emission overlap guards', () => {
    it('does not emit a new commander op that overlaps a live operation by sector/objective/brigades', () => {
        const briefing = makeBriefing([{
            name: 'Existing Main Effort',
            type: 'sector_attack',
            phase: 'execution',
            sector_id: `sector:${CORPS_ID}:0`,
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'b2'],
        } as any]);

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(0);
    });

    it('applyCommanderOutput rejects overlapping operations even when the generated name differs', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 10, phase: 'war', seed: 'apply-overlap' } as any,
            factions: [{ id: FACTION }] as any,
            military: {
                corps_command: {
                    [CORPS_ID]: {
                        command_span: 5,
                        subordinate_count: 2,
                        og_slots: 0,
                        active_ogs: [],
                        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
                        stance: 'offensive',
                        active_operations: [{
                            name: 'cmd_old',
                            type: 'sector_attack',
                            phase: 'execution',
                            sector_id: `sector:${CORPS_ID}:0`,
                            objectives: ['op:test:objective'],
                            participating_brigades: ['b1', 'b2'],
                        }],
                    },
                },
                brigade_movement_orders: {},
            },
        } as unknown as GameState;

        applyCommanderOutput(state, CORPS_ID, {
            directive: { type: 'hold', target_zone: null } as any,
            operations: [{
                name: 'cmd_new',
                type: 'sector_attack',
                phase: 'planning',
                sector_id: `sector:${CORPS_ID}:0`,
                objectives: ['op:test:objective'],
                participating_brigades: ['b1', 'b2'],
            } as any],
            sector_stances: [],
            updated_state: {
                current_plan: null,
                zone_assessments: [],
                threat_assessment: { threatened_zones: [], enemy_concentration_zones: [], recent_losses: [], overall_pressure: 'low' },
                force_assessment: makeForces(),
                sector_activity_log: [],
                operation_history: [],
                intel_picture: undefined,
                garrison_budget: {},
                last_assessment_turn: 10,
                last_plan_action: 'none',
                last_plan_reason: 'test',
            } as any,
            reinforcement_requests: [],
            prepositioning_orders: [],
            plan_updates: [],
            garrison_locks: [],
        });

        expect(state.military.corps_command?.[CORPS_ID]?.active_operations).toHaveLength(1);
        expect(state.military.corps_command?.[CORPS_ID]?.active_operations?.[0]?.name).toBe('cmd_old');
    });
});
