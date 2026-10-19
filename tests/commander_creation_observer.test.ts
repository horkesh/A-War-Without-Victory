/**
 * Opt-in `commander_creation` stdout receipt of the REAL commander emitter (`emitCommanderOutput` -> `buildOperations`) and the
 * per-faction commander pass markers of `generateAllCorpsOrders`.
 *
 * Production paths only. The fixture helpers below are copied verbatim from tests/commander/operation_emit_overlap_guards.test.ts
 * (real briefing/allocation/plan builders). Contract: topic off => no output; topic on => IDENTICAL returned operations/output and
 * identical real `serializeState`; one completion row per real buildOperations call, whose `exit` is the branch that actually
 * returned; inner-callback emptiness is a reached INPUT, never an outer terminal; unreached fields are absent (never false/0);
 * emitted does not prove admitted; no feasibility verdict exists in this path.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type {
    BrigadeEvaluation,
    CommanderBriefing,
    ForceAssessment,
    OfficerPersonality,
    ThreatAssessment,
    ZoneId,
} from '../src/sim/combat/commander/commander_state.js';
import type { AllocationResult } from '../src/sim/combat/commander/allocate.js';
import type { PlanDecision } from '../src/sim/combat/commander/plan.js';
import type { DecisionResult } from '../src/sim/combat/commander/decide.js';
import type { SpatialContext } from '../src/sim/spatial_context.js';
import { emitCommanderOutput } from '../src/sim/combat/commander/emit.js';
import { applyCommanderOutput } from '../src/sim/combat/commander/commander_loop.js';
import { generateAllCorpsOrders } from '../src/sim/combat/bot_corps_ai.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';
import { COMMANDER_CREATION_PREFIX, resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import { buildBotOrdersPerfSnapshot, resetBotOrdersPerfProfile } from '../src/sim/combat/_perf_profile_bot_orders.js';

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_test_corps' as FormationId;
const defaultPersonality: OfficerPersonality = {
    aggression: 0.6,
    caution: 0.3,
    initiative: 0.8,
    competence: 0.6,
};

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setTopics(undefined);
    vi.restoreAllMocks();
});

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

function makeIntelBriefing(
    confidences: readonly number[],
    options: {
        turn?: number;
        consecutiveProbes?: number;
        probeExempt?: boolean;
    } = {},
): CommanderBriefing {
    const turn = options.turn ?? 20;
    const briefing = makeBriefing();
    const sectorId = makeSector().sector_id;
    const records = confidences.map((confidence, index) => ({
        enemy_sector_id: `sector:enemy:${index}`,
        confidence,
        last_updated_turn: turn,
        sources: ['passive_contact'] as const,
    }));
    const state = briefing.state_ref!;
    state.meta.turn = turn;
    state.military.sector_intel = { [sectorId]: records as any };
    state.military.corps_command![CORPS_ID]!.consecutive_probes = options.consecutiveProbes ?? 0;
    if (options.probeExempt != null) {
        state.military.war_timeline = {
            doctrine_phases: {
                RS: [{
                    start_week: 0,
                    end_week: 9999,
                    default_corps_stance: 'offensive',
                    probe_exempt: options.probeExempt,
                }],
            },
        } as any;
    }
    return {
        ...briefing,
        turn,
        intel_data: {
            sector_intel: { [sectorId]: records as any },
            opsec_active_sectors: [],
        },
    };
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

function noPlan(turn: number): PlanDecision {
    return {
        plan: null,
        action: 'none',
        reason: 'no major plan',
        decision_trace: {
            turn,
            winning_intent_id: null,
            candidates: [],
            hard_constraints: [],
            lessons_applied: [],
            relationships_applied: [],
        },
    };
}

interface EmitInputs {
    briefing: CommanderBriefing;
    plan: PlanDecision;
    allocation: AllocationResult;
}

const OVERLAPPING_RECOVERY_OPERATION = {
    name: 'Existing Recovery Operation', type: 'sector_attack', phase: 'recovery', sector_id: `sector:${CORPS_ID}:0`,
    started_turn: 4, phase_started_turn: 7,
    objectives: ['op:test:objective'], participating_brigades: ['b1', 'b2'],
} as any;

function makeIntelBriefingWith(confidences: readonly number[], options: { turn?: number; consecutiveProbes?: number }, activeOperations: any[]): CommanderBriefing {
    const briefing = makeIntelBriefing(confidences, options);
    (briefing as { active_operations: unknown }).active_operations = activeOperations;
    return briefing;
}

function boundedPositionBriefing(consecutiveProbes: number, bounded: boolean): CommanderBriefing {
    const briefing = makeBriefing();
    if (bounded) {
        briefing.state_ref!.political.political_controllers = {
            'op:test:approach': FACTION,
            'op:test:objective': 'RBiH',
        } as any;
    }
    briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes = consecutiveProbes;
    return briefing;
}

const SCENARIOS: Array<{
    name: string;
    build: () => EmitInputs;
    expectExit: string;
    expectPresent: string[];
    expectAbsent: string[];
    expectSite?: string;
    expectFields?: Record<string, unknown>;
    expectReturned: number;
}> = [
    {
        name: 'general plan creation (site A)',
        build: () => ({ briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }), plan: makePlanDecision(), allocation: makeAllocation() }),
        expectExit: 'general_created',
        expectPresent: ['primary_pool_size', 'attached_pool_size', 'participating_count', 'effective_min_for_op', 'objective_ids', 'eligible_count', 'launch_probe_evaluated', 'launch_probe', 'overlap_checked', 'overlap_found', 'probe_on_cooldown', 'can_consider_local_opportunity'],
        expectAbsent: ['fallback_considered', 'probe_brigade_selected', 'reduction_participant_count'],
        expectSite: 'general',
        expectReturned: 1,
    },
    {
        name: 'plan-probe substitution when intel is below the launch threshold',
        build: () => ({ briefing: makeIntelBriefing([0], { turn: 20, consecutiveProbes: 0 }), plan: makePlanDecision(), allocation: makeAllocation() }),
        expectExit: 'plan_probe_created',
        expectPresent: ['primary_pool_size', 'participating_count', 'objective_ids', 'launch_probe_evaluated', 'launch_probe', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered'],
        expectSite: 'plan_probe',
        expectReturned: 1,
    },
    {
        name: 'active-slot cap is an OUTER terminal before pool assembly',
        build: () => ({
            briefing: makeBriefing([{
                name: 'Existing Main Effort', type: 'sector_attack', phase: 'execution', sector_id: `sector:${CORPS_ID}:0`,
                objectives: ['op:test:objective'], participating_brigades: ['b1', 'b2'],
            } as any]),
            plan: makePlanDecision(),
            allocation: makeAllocation(),
        }),
        expectExit: 'active_slot_full',
        expectPresent: ['active_slot_users', 'max_operation_slots'],
        expectAbsent: ['primary_pool_size', 'participating_count', 'effective_min_for_op', 'objective_ids', 'launch_probe', 'probe_on_cooldown', 'overlap_checked'],
        expectReturned: 0,
    },
    {
        name: 'below the effective participant minimum is an OUTER terminal',
        build: () => ({
            briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }),
            plan: makePlanDecision(),
            allocation: { ...makeAllocation(), surplus_pool: [makeEval('b1')] },
        }),
        expectExit: 'below_min_participants',
        expectPresent: ['primary_pool_size', 'participating_count', 'effective_min_for_op'],
        expectAbsent: ['objective_ids', 'launch_probe', 'overlap_checked', 'probe_on_cooldown'],
        expectReturned: 0,
    },
    {
        name: 'fallback escalation into an occupying operation against a bounded position (site B)',
        build: () => ({ briefing: boundedPositionBriefing(2, true), plan: noPlan(10), allocation: makeAllocation() }),
        expectExit: 'reduction_created',
        expectPresent: ['probe_on_cooldown', 'can_consider_local_opportunity', 'local_occupation_candidate_present', 'fallback_considered', 'probe_brigade_selected', 'probe_objective_ids', 'probe_reachable', 'target_is_bounded_position', 'reduction_participant_count', 'single_brigade_sufficient', 'escalate_to_operation', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['primary_pool_size', 'active_slot_users', 'launch_probe'],
        expectSite: 'reduction',
        expectReturned: 1,
    },
    {
        name: 'fallback probe without a bounded position stays a probe',
        build: () => ({ briefing: boundedPositionBriefing(0, false), plan: noPlan(10), allocation: makeAllocation() }),
        expectExit: 'fallback_probe_created',
        expectPresent: ['fallback_considered', 'probe_brigade_selected', 'probe_objective_ids', 'probe_reachable', 'target_is_bounded_position', 'reduction_participant_count', 'escalate_to_operation', 'overlap_checked'],
        expectAbsent: ['primary_pool_size', 'launch_probe'],
        expectSite: 'fallback_probe',
        expectReturned: 1,
    },
    {
        name: 'a plan target that is not a reachable enemy OSID leaves no objective (OUTER terminal)',
        build: () => {
            const plan = makePlanDecision();
            (plan.plan as unknown as { target_osids: string[] }).target_osids = ['op:test:not_an_enemy_osid'];
            return { briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }), plan, allocation: makeAllocation() };
        },
        expectExit: 'no_objectives',
        expectPresent: ['primary_pool_size', 'participating_count', 'effective_min_for_op', 'reachable_enemy_osid_count', 'objective_ids'],
        expectAbsent: ['launch_probe', 'overlap_checked', 'probe_on_cooldown'],
        expectReturned: 0,
    },
    {
        name: 'plan-probe substitution suppressed by an overlapping live operation (recovery phase holds no slot)',
        build: () => ({ briefing: makeIntelBriefingWith([0], { turn: 20, consecutiveProbes: 0 }, [OVERLAPPING_RECOVERY_OPERATION]), plan: makePlanDecision(), allocation: makeAllocation() }),
        expectExit: 'plan_probe_overlap_suppressed',
        expectPresent: ['active_slot_users', 'max_operation_slots', 'launch_probe', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['probe_on_cooldown', 'fallback_considered'],
        expectSite: 'plan_probe',
        expectReturned: 0,
    },
    {
        name: 'general operation suppressed by an overlapping live operation (recovery phase holds no slot)',
        build: () => ({ briefing: makeIntelBriefingWith([0.25], { turn: 20, consecutiveProbes: 2 }, [OVERLAPPING_RECOVERY_OPERATION]), plan: makePlanDecision(), allocation: makeAllocation() }),
        expectExit: 'general_overlap_suppressed',
        expectPresent: ['active_slot_users', 'launch_probe', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['probe_on_cooldown', 'fallback_considered'],
        expectSite: 'general',
        expectReturned: 0,
    },
    {
        name: 'reduction operation suppressed by an overlapping live operation',
        build: () => {
            const briefing = boundedPositionBriefing(2, true);
            // overlaps by sector/objective only: its participants are NOT this corps's available brigades, so the reduction path still escalates
            (briefing as { active_operations: unknown }).active_operations = [{ ...OVERLAPPING_RECOVERY_OPERATION, participating_brigades: ['x_other_1'] }];
            return { briefing, plan: noPlan(10), allocation: makeAllocation() };
        },
        expectExit: 'reduction_overlap_suppressed',
        expectPresent: ['fallback_considered', 'escalate_to_operation', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['primary_pool_size', 'launch_probe'],
        expectSite: 'reduction',
        expectReturned: 0,
    },
    {
        name: 'fallback probe suppressed by an overlapping live operation',
        build: () => {
            const briefing = boundedPositionBriefing(0, false);
            (briefing as { active_operations: unknown }).active_operations = [OVERLAPPING_RECOVERY_OPERATION];
            return { briefing, plan: noPlan(10), allocation: makeAllocation() };
        },
        expectExit: 'fallback_probe_overlap_suppressed',
        expectPresent: ['fallback_considered', 'escalate_to_operation', 'overlap_checked', 'overlap_found'],
        expectAbsent: ['primary_pool_size', 'launch_probe'],
        expectSite: 'fallback_probe',
        expectReturned: 0,
    },
    {
        name: 'below the minimum AFTER the objective-eligibility filter (enough participants before it) is an OUTER terminal',
        build: () => {
            const inputs: EmitInputs = { briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }), plan: makePlanDecision(), allocation: makeAllocation() };
            // one enclave-tagged brigade located outside the objective's enclave: real isBrigadeEligibleForOperationObjectives() drops it
            (inputs.briefing as unknown as { brigades: unknown }).brigades = [
                makeBrigade('b1', 'op:test:approach'),
                makeBrigade('b2', 'op:test:approach', { tags: ['enclave'] }),
            ];
            return inputs;
        },
        expectExit: 'below_min_after_eligibility',
        expectPresent: ['primary_pool_size', 'participating_count', 'effective_min_for_op', 'reachable_enemy_osid_count', 'objective_ids', 'eligible_count'],
        expectAbsent: ['launch_probe_evaluated', 'launch_probe', 'overlap_checked', 'probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered'],
        expectFields: { participating_count: 2, effective_min_for_op: 2, eligible_count: 1, objective_ids: ['op:test:objective'] },
        expectReturned: 0,
    },
    {
        name: 'inner friendly-approach helper returns [] (no friendly OSID set for the faction) and the REAL outer terminal below_min_participants follows',
        build: () => {
            const inputs: EmitInputs = { briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }), plan: makePlanDecision(), allocation: makeAllocation() };
            // friendlyOsidsByFaction has no entry for the faction: friendlyApproachOsids' helper returns [] (emit.ts, not bilateral-specific),
            // canReach is false for every brigade, the primary pool is empty and buildOperations returns at the below-minimum guard
            (inputs.briefing.spatial as unknown as { friendlyOsidsByFaction: Map<FactionId, ReadonlySet<string>> }).friendlyOsidsByFaction = new Map<FactionId, ReadonlySet<string>>([
                ['RBiH' as FactionId, new Set(['op:test:objective'])],
            ]);
            return inputs;
        },
        expectExit: 'below_min_participants',
        expectPresent: ['primary_pool_size', 'participating_count', 'effective_min_for_op'],
        expectAbsent: ['objective_ids', 'reachable_enemy_osid_count', 'eligible_count', 'launch_probe', 'overlap_checked', 'probe_on_cooldown'],
        expectFields: { primary_pool_size: 0, participating_count: 0, effective_min_for_op: 2 },
        expectReturned: 0,
    },
    {
        name: 'no plan and no launch capacity completes without an operation and leaves the fallback unevaluated',
        build: () => ({ briefing: makeBriefing(), plan: noPlan(10), allocation: { ...makeAllocation(), can_launch_ops: false } }),
        expectExit: 'completed_no_operation',
        expectPresent: ['probe_on_cooldown', 'can_consider_local_opportunity'],
        expectAbsent: ['fallback_considered', 'local_occupation_candidate_present', 'probe_brigade_selected', 'primary_pool_size', 'active_slot_users'],
        expectReturned: 0,
    },
];

/** Test SETUP only (applied identically to the off and on runs): make the fixture state a valid save so the REAL serializer can parity-check it. */
function prepare(inputs: EmitInputs): EmitInputs {
    const state = inputs.briefing.state_ref as any;
    state.political = { ...(state.political ?? {}), political_controllers: state.political?.political_controllers ?? {} };
    for (const records of Object.values(state.military.sector_intel ?? {})) {
        for (const record of records as any[]) {
            Object.assign(record, {
                enemy_faction: 'RBiH', enemy_corps_id: 'rbih_test_corps', front_edge_count: 1, turns_in_contact: 1,
                strength_category: 'moderate', posture_observed: 'defensive', offensive_signs: false, visible_brigade_ids: [],
            });
        }
    }
    return inputs;
}

function runEmit(rawInputs: EmitInputs) {
    const inputs = prepare(rawInputs);
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    try {
        const output = emitCommanderOutput(
            inputs.briefing, [], makeForces(), inputs.allocation, inputs.plan, makeDecisions(), makeThreats(),
        );
        return {
            output,
            lines: lines.filter((line) => line.startsWith(COMMANDER_CREATION_PREFIX)),
            localLines: lines.filter((line) => line.startsWith('[local_occupation_candidate]')),
            state: inputs.briefing.state_ref!,
        };
    } finally {
        spy.mockRestore();
    }
}

const parseRow = (line: string): Record<string, any> => JSON.parse(line.slice(COMMANDER_CREATION_PREFIX.length + 1));
const parseLocalRow = (line: string): Record<string, any> => JSON.parse(line.slice('[local_occupation_candidate]'.length + 1));

function localOccupationInputs(options: {
    listed?: boolean;
    turn?: number;
    allocation?: AllocationResult;
    brigadeCount?: number;
    intelConfidence?: number;
    consecutiveProbes?: number;
    targetOsid?: string;
    brigadeIds?: string[];
    corpsId?: FormationId;
} = {}): EmitInputs {
    const corpsId = options.corpsId ?? 'arbih_3rd_corps' as FormationId;
    const faction = 'RBiH' as FactionId;
    const turn = options.turn ?? 112;
    const approach = 'op:test:local_approach';
    const target = options.targetOsid ?? 'op:test:local_target';
    const brigadeIds = options.brigadeIds ?? Array.from(
        { length: options.brigadeCount ?? 2 },
        (_, index) => `local_b${index + 1}`,
    );
    const brigades = brigadeIds.map((brigadeId) => (
        makeBrigade(brigadeId, approach, { faction, corps_id: corpsId, personnel: 5000 })
    ));
    const briefing = makeBriefing([], brigades);
    const adjacency = new Map<string, readonly string[]>([[approach, [target]], [target, [approach]]]);
    const sectorId = `sector:${corpsId}:0`;
    const sector = makeSector();
    Object.assign(sector, {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: ['RS'],
        territory_osids: [approach],
        assigned_brigade_ids: brigades.map((brigade) => brigade.id),
        sub_segments: [{
            sub_segment_id: `subseg:${corpsId}:0`, edge_ids: ['local-edge'], friendly_osids: [approach],
            enemy_osids: options.listed === false ? [] : [target], primary_brigade_ids: brigades.map((brigade) => brigade.id), length_edges: 1,
        }],
    });
    Object.assign(briefing, {
        corps_id: corpsId,
        faction,
        turn,
        sectors: [sector],
        reverse_map: new Map([[approach, ['sid:approach']], [target, ['sid:target']]]),
        osid_population_map: new Map([[approach, 1000], [target, 1]]),
        spatial: {
            ...briefing.spatial,
            adjacency,
            sharedBoundaryAdjacency: adjacency,
            friendlyOsidsByFaction: new Map([
                [faction, new Set([approach])],
                ['RS', new Set([target])],
                ['HRHB', new Set()],
            ]),
            computedAtTurn: turn,
        },
    });
    const state = briefing.state_ref!;
    state.meta.turn = turn;
    state.factions = [{ id: faction }] as any;
    state.political.political_controllers = { [approach]: faction, [target]: 'RS' } as any;
    state.military.formations = Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade]));
    state.military.corps_command = {
        [corpsId]: {
            command_span: 5, subordinate_count: brigades.length, og_slots: 0, active_ogs: [], active_operations: [],
            corps_exhaustion: 0, faction_war_exhaustion: 0, stance: 'offensive', consecutive_probes: options.consecutiveProbes ?? 2,
        },
    } as any;
    state.military.sector_intel = {
        [sectorId]: [{ enemy_sector_id: 'sector:enemy:local', confidence: options.intelConfidence ?? 1, last_updated_turn: turn, sources: ['passive_contact'] }],
    } as any;
    const allocation = options.allocation ?? {
        ...makeAllocation(),
        surplus_pool: brigades.map((brigade) => makeEval(brigade.id)),
    };
    return { briefing, plan: noPlan(turn), allocation };
}

function localOccupationGroupInputs(): EmitInputs {
    return localOccupationInputs({ brigadeCount: 3, intelConfidence: 0, consecutiveProbes: 0 });
}

function varoslukSkippedGroupInputs(): EmitInputs {
    const inputs = localOccupationInputs({
        listed: false,
        brigadeCount: 3,
        targetOsid: 'op:travnik:varosluk',
        brigadeIds: ['arbih_737th_muslim_light', 'arbih_shadow_b2', 'arbih_shadow_b3'],
    });
    const approach = 'op:test:local_approach';
    const rejectedListedTarget = 'op:test:listed_rejected_before_varosluk';
    inputs.briefing.sectors[0]!.sub_segments![0]!.enemy_osids = [rejectedListedTarget];
    const adjacency = inputs.briefing.spatial.adjacency as Map<string, readonly string[]>;
    adjacency.set(approach, ['op:travnik:varosluk', rejectedListedTarget]);
    adjacency.set(rejectedListedTarget, [approach]);
    (inputs.briefing.spatial.sharedBoundaryAdjacency as Map<string, readonly string[]>).set(rejectedListedTarget, [approach]);
    (inputs.briefing.spatial.friendlyOsidsByFaction as Map<FactionId, Set<string>>).get('RS')!.add(rejectedListedTarget);
    inputs.briefing.state_ref!.political.political_controllers![rejectedListedTarget] = 'RS';
    return inputs;
}

function setLocalOccupationTargetFaction(
    inputs: EmitInputs,
    targetFaction: FactionId,
    allianceValue?: number,
): void {
    setLocalOccupationFactions(inputs, inputs.briefing.faction, targetFaction, allianceValue);
}

function setLocalOccupationFactions(
    inputs: EmitInputs,
    attackerFaction: FactionId,
    targetFaction: FactionId,
    allianceValue?: number,
): void {
    const approach = 'op:test:local_approach';
    const target = 'op:test:local_target';
    const state = inputs.briefing.state_ref!;
    const brigades = inputs.briefing.brigades.map((brigade) => ({
        ...brigade,
        faction: attackerFaction,
    } as FormationState));
    inputs.briefing = {
        ...inputs.briefing,
        faction: attackerFaction,
        brigades,
        sectors: inputs.briefing.sectors.map((sector, index) => index === 0 ? {
            ...sector,
            faction: attackerFaction,
            opposing_factions: [targetFaction],
        } : sector),
    };
    state.factions = [{ id: attackerFaction }] as any;
    state.military.formations = Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade]));
    state.political.political_controllers = { [approach]: attackerFaction, [target]: targetFaction } as any;
    if (allianceValue != null) state.political.war_alliance_rbih_hrhb = allianceValue;
    const friendly = inputs.briefing.spatial.friendlyOsidsByFaction as Map<FactionId, ReadonlySet<string>>;
    for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
        friendly.set(faction, faction === attackerFaction
            ? new Set([approach])
            : faction === targetFaction
                ? new Set([target])
                : new Set());
    }
}

describe('local_occupation_candidate observer (real commander builder)', () => {
    it('shadows the skipped Varošluk adjacency group while preserving the actual adjacency-single selection', () => {
        setTopics(undefined);
        const off = runEmit(varoslukSkippedGroupInputs());
        setTopics('local_occupation_candidate');
        const on = runEmit(varoslukSkippedGroupInputs());
        const rows = on.localLines.map(parseLocalRow);
        const shadow = rows.filter((row) => row.phase === 'skipped_alternative_shadow');

        expect(on.output).toEqual(off.output);
        expect(serializeState(on.state)).toBe(serializeState(off.state));
        expect(on.output.operations[0]?.objectives).toEqual(['op:travnik:varosluk']);
        expect(shadow.length).toBeGreaterThan(0);
        expect(shadow.every((row) => row.candidate_class === 'adjacency-only_group')).toBe(true);
        expect(shadow).toContainEqual(expect.objectContaining({
            schema: 'local_occupation_skipped_alternative.v1',
            shadow: true,
            actual_selected: false,
            evaluation_scope: 'adjacency-only_group_only',
            coverage_status: 'partial_skipped_class_only',
            candidate_disposition: 'shadow_only_never_selected_or_emitted',
            lawful_operation_status: 'unmeasured',
            operation_construction_status: 'not_performed',
            emission_status: 'not_performed',
            candidate_class: 'adjacency-only_group',
            target_osid: 'op:travnik:varosluk',
            outcome: 'qualified',
            admission_status: 'unmeasured',
            officer_ownership_status: 'unmeasured',
            launch_status: 'unmeasured',
        }));
        expect(rows.at(-1)).toMatchObject({
            schema: 'local_occupation_skipped_alternative.v1',
            phase: 'skipped_alternative_shadow_end',
            evaluation_scope: 'adjacency-only_group_only',
            actual_selected_class: 'adjacency-only_single',
            actual_selected_target_osid: 'op:travnik:varosluk',
            qualified_count: 1,
        });
    });

    it('enumerates multiple skipped group targets and preserves exact reached rejection predicates', () => {
        const inputs = varoslukSkippedGroupInputs();
        const approach = 'op:test:local_approach';
        const rejectedTarget = 'op:zz:missing_population';
        const adjacency = inputs.briefing.spatial.adjacency as Map<string, readonly string[]>;
        adjacency.set(approach, ['op:travnik:varosluk', rejectedTarget]);
        adjacency.set(rejectedTarget, [approach]);
        (inputs.briefing.spatial.sharedBoundaryAdjacency as Map<string, readonly string[]>).set(rejectedTarget, [approach]);
        const friendly = inputs.briefing.spatial.friendlyOsidsByFaction as Map<FactionId, Set<string>>;
        friendly.get('RS')!.add(rejectedTarget);
        inputs.briefing.state_ref!.political.political_controllers![rejectedTarget] = 'RS';
        setTopics('local_occupation_candidate');

        const rows = runEmit(inputs).localLines.map(parseLocalRow);
        const shadow = rows.filter((row) => row.phase === 'skipped_alternative_shadow');
        expect(shadow.map((row) => row.target_osid)).toEqual([
            'op:travnik:varosluk',
            rejectedTarget,
        ]);
        expect(shadow[1]).toMatchObject({
            outcome: 'rejected',
            first_failed_predicate: 'target_population_present',
            predicates: [{ predicate: 'target_population_present', passed: false }],
            overlap: { evaluated: false, found: null, checks: [] },
        });
    });

    it.each([
        ['same sector', { sector_id: 'sector:arbih_3rd_corps:0', objectives: ['op:test:other'], participating_brigades: ['other'] }, {
            same_sector: true, shared_objective: null, shared_participant: null, first_matched_clause: 'same_sector',
        }],
        ['shared objective', { sector_id: 'sector:other:0', objectives: ['op:travnik:varosluk'], participating_brigades: ['other'] }, {
            same_sector: false, shared_objective: true, shared_participant: null, first_matched_clause: 'shared_objective',
        }],
        ['disjoint operation', { sector_id: 'sector:other:0', objectives: ['op:test:other'], participating_brigades: ['other'] }, {
            same_sector: false, shared_objective: false, shared_participant: false, first_matched_clause: null,
        }],
    ] as const)('uses detached short-circuit overlap predicates for %s', (_name, existingFields, expected) => {
        const inputs = varoslukSkippedGroupInputs();
        (inputs.briefing as { active_operations: unknown }).active_operations = [{
            name: 'Existing', type: 'sector_attack', phase: 'recovery', started_turn: 100,
            ...existingFields,
        }];
        setTopics('local_occupation_candidate');
        const row = runEmit(inputs).localLines.map(parseLocalRow).find((entry) => (
            entry.phase === 'skipped_alternative_shadow' && entry.outcome === 'qualified'
        ));
        expect(row?.overlap).toMatchObject({
            evaluated: true,
            found: expected.first_matched_clause !== null,
            checks: [expect.objectContaining(expected)],
            first_matched_clause: expected.first_matched_clause,
        });
    });

    it('does not clone or continue when off and contains clone failure when on', () => {
        const original = globalThis.structuredClone;
        const clone = vi.spyOn(globalThis, 'structuredClone').mockImplementation(() => {
            throw new Error('shadow clone unavailable');
        });
        try {
            setTopics(undefined);
            expect(() => runEmit(varoslukSkippedGroupInputs())).not.toThrow();
            expect(clone).not.toHaveBeenCalled();

            setTopics('local_occupation_candidate');
            const on = runEmit(varoslukSkippedGroupInputs());
            expect(on.output.operations[0]?.objectives).toEqual(['op:travnik:varosluk']);
            expect(on.localLines.map(parseLocalRow)).toContainEqual(expect.objectContaining({
                schema: 'local_occupation_skipped_alternative.v1',
                phase: 'skipped_alternative_shadow_end',
                outcome: 'isolation_unavailable',
                qualified_count: 0,
            }));
        } finally {
            clone.mockRestore();
            globalThis.structuredClone = original;
        }
    });

    it('contains a detached shadow evaluation exception after cloning', () => {
        const original = globalThis.structuredClone;
        setTopics(undefined);
        const offInputs = varoslukSkippedGroupInputs();
        const off = runEmit(offInputs);
        const offLiveAfter = JSON.stringify([
            offInputs.allocation,
            offInputs.briefing.brigades,
            offInputs.briefing.sectors,
            offInputs.briefing.active_operations,
        ]);
        const clone = vi.spyOn(globalThis, 'structuredClone').mockImplementation((value) => {
            const detached = original(value) as { briefing?: CommanderBriefing };
            if (detached.briefing?.osid_population_map) {
                detached.briefing.osid_population_map.get = () => { throw new Error('shadow predicate failed'); };
            }
            return detached;
        });
        try {
            setTopics('local_occupation_candidate');
            const inputs = varoslukSkippedGroupInputs();
            const on = runEmit(inputs);
            expect(on.output).toEqual(off.output);
            expect(serializeState(on.state)).toBe(serializeState(off.state));
            expect(JSON.stringify([
                inputs.allocation,
                inputs.briefing.brigades,
                inputs.briefing.sectors,
                inputs.briefing.active_operations,
            ])).toBe(offLiveAfter);
            expect(on.localLines.map(parseLocalRow)).toContainEqual(expect.objectContaining({
                schema: 'local_occupation_skipped_alternative.v1',
                phase: 'skipped_alternative_shadow_end',
                outcome: 'shadow_evaluation_failed',
            }));
        } finally {
            clone.mockRestore();
        }
    });

    it('reports rejected-only when the skipped group has no qualifying roster', () => {
        const inputs = localOccupationInputs({
            listed: false,
            brigadeCount: 1,
            targetOsid: 'op:travnik:varosluk',
            brigadeIds: ['arbih_737th_muslim_light'],
        });
        setTopics('local_occupation_candidate');
        const rows = runEmit(inputs).localLines.map(parseLocalRow);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'skipped_alternative_shadow',
            target_osid: 'op:travnik:varosluk',
            outcome: 'rejected',
            first_failed_predicate: 'minimum_group_roster',
        }));
        expect(rows.at(-1)).toMatchObject({
            phase: 'skipped_alternative_shadow_end',
            outcome: 'rejected_only',
            qualified_count: 0,
        });
    });

    it('preserves the real overlap-suppressed fallback result while shadowing on detached data', () => {
        const build = (): EmitInputs => {
            const inputs = varoslukSkippedGroupInputs();
            (inputs.briefing as { active_operations: unknown }).active_operations = [{
                name: 'Existing', type: 'sector_attack', phase: 'recovery', started_turn: 100,
                sector_id: 'sector:arbih_3rd_corps:0', objectives: ['op:test:other'],
                participating_brigades: ['other'],
            }];
            return inputs;
        };
        setTopics(undefined);
        const off = runEmit(build());
        setTopics('local_occupation_candidate');
        const on = runEmit(build());
        expect(on.output).toEqual(off.output);
        expect(on.output.operations).toEqual([]);
        expect(serializeState(on.state)).toBe(serializeState(off.state));
        expect(on.localLines.map(parseLocalRow)).toContainEqual(expect.objectContaining({
            phase: 'skipped_alternative_shadow',
            actual_selected: false,
            candidate_disposition: 'shadow_only_never_selected_or_emitted',
            overlap: expect.objectContaining({ evaluated: true, found: true }),
        }));
    });

    it('does not add shadow samples to the production bot-orders profile', () => {
        const original = process.env.PERF_PROFILE_BOT_ORDERS;
        try {
            process.env.PERF_PROFILE_BOT_ORDERS = 'true';
            setTopics(undefined);
            resetBotOrdersPerfProfile();
            runEmit(varoslukSkippedGroupInputs());
            const offCounts = buildBotOrdersPerfSnapshot().labels.map(({ label, count }) => ({ label, count }));

            setTopics('local_occupation_candidate');
            resetBotOrdersPerfProfile();
            runEmit(varoslukSkippedGroupInputs());
            const onCounts = buildBotOrdersPerfSnapshot().labels.map(({ label, count }) => ({ label, count }));
            expect(onCounts).toEqual(offCounts);
        } finally {
            resetBotOrdersPerfProfile();
            if (original === undefined) delete process.env.PERF_PROFILE_BOT_ORDERS;
            else process.env.PERF_PROFILE_BOT_ORDERS = original;
        }
    });

    it('is default-off and preserves the real result and canonical state when enabled', () => {
        setTopics(undefined);
        const off = runEmit(localOccupationInputs());
        expect(off.localLines).toEqual([]);
        setTopics('local_occupation_candidate');
        const on = runEmit(localOccupationInputs());
        expect(on.localLines.length).toBeGreaterThan(0);
        expect(on.output).toEqual(off.output);
        expect(serializeState(on.state)).toBe(serializeState(off.state));
    });

    it('records the selected sector-listed single class and marks later classes skipped', () => {
        setTopics('local_occupation_candidate');
        const result = runEmit(localOccupationInputs());
        const rows = result.localLines.map(parseLocalRow);
        expect(rows[0]).toMatchObject({
            schema: 'local_occupation_candidate.v1', phase: 'search_start', faction: 'RBiH',
            corps_id: 'arbih_3rd_corps', turn: 112,
        });
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_single', outcome: 'qualified',
            sector_id: 'sector:arbih_3rd_corps:0', target_osid: 'op:test:local_target',
            considered_roster: ['local_b1'], first_failed_predicate: null,
        }));
        const end = rows.at(-1)!;
        expect(end).toMatchObject({
            phase: 'search_end', outcome: 'selected', selected_class: 'sector-listed_single',
            selected_target_osid: 'op:test:local_target', selected_roster: ['local_b1'],
            selection_scope: 'candidate_search', downstream_operation_status: 'unmeasured',
        });
        expect(end.class_outcomes).toEqual([
            { candidate_class: 'sector-listed_single', outcome: 'selected' },
            { candidate_class: 'sector-listed_group', outcome: 'skipped_after_selection' },
            { candidate_class: 'adjacency-only_single', outcome: 'skipped_after_selection' },
            { candidate_class: 'adjacency-only_group', outcome: 'skipped_after_selection' },
        ]);
    });

    it('records actual surplus-filter rejection and explicit unmeasured target/roster', () => {
        const inputs = localOccupationInputs();
        inputs.allocation = {
            ...inputs.allocation,
            surplus_pool: [{ ...makeEval('local_b1'), is_combat_effective: false }],
        };
        setTopics('local_occupation_candidate');
        const result = runEmit(inputs);
        const rows = result.localLines.map(parseLocalRow);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'surplus_filter', brigade_id: 'local_b1', outcome: 'rejected',
            first_failed_predicate: 'combat_effective_and_not_disrupted', target_osid: null,
            considered_roster: null,
        }));
        expect(rows.at(-1)).toMatchObject({ phase: 'search_end', outcome: 'no_eligible_surplus' });
    });

    it('falls through both sector-listed classes before selecting adjacency-only single', () => {
        setTopics('local_occupation_candidate');
        const rows = runEmit(localOccupationInputs({ listed: false })).localLines.map(parseLocalRow);
        expect(rows.at(-1)).toMatchObject({
            phase: 'search_end', outcome: 'selected', selected_class: 'adjacency-only_single',
            class_outcomes: [
                { candidate_class: 'sector-listed_single', outcome: 'no_enumerated_candidate' },
                { candidate_class: 'sector-listed_group', outcome: 'no_enumerated_candidate' },
                { candidate_class: 'adjacency-only_single', outcome: 'selected' },
                { candidate_class: 'adjacency-only_group', outcome: 'skipped_after_selection' },
            ],
        });
    });

    it('emits deterministic rows across surplus insertion permutations and isolates a throwing stdout sink', () => {
        setTopics('local_occupation_candidate');
        const forward = localOccupationInputs();
        const reversed = localOccupationInputs();
        reversed.allocation = { ...reversed.allocation, surplus_pool: [...reversed.allocation.surplus_pool].reverse() };
        expect(runEmit(reversed).localLines.map(parseLocalRow)).toEqual(runEmit(forward).localLines.map(parseLocalRow));

        setTopics(undefined);
        const baseline = runEmit(localOccupationInputs());
        setTopics('local_occupation_candidate');
        const throwingInputs = prepare(localOccupationInputs());
        const spy = vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('diagnostic sink failed'); });
        let throwingOutput: ReturnType<typeof emitCommanderOutput> | undefined;
        expect(() => {
            throwingOutput = emitCommanderOutput(
                throwingInputs.briefing, [], makeForces(), throwingInputs.allocation,
                throwingInputs.plan, makeDecisions(), makeThreats(),
            );
        }).not.toThrow();
        spy.mockRestore();
        expect(throwingOutput).toEqual(baseline.output);
        expect(serializeState(throwingInputs.briefing.state_ref!)).toBe(serializeState(baseline.state));
    });

    it('records the qualified sector-listed group roster and preserves on/off result and state across permutations', () => {
        setTopics(undefined);
        const off = runEmit(localOccupationGroupInputs());

        setTopics('local_occupation_candidate');
        const forward = localOccupationGroupInputs();
        const reversed = localOccupationGroupInputs();
        reversed.allocation = { ...reversed.allocation, surplus_pool: [...reversed.allocation.surplus_pool].reverse() };
        const on = runEmit(forward);
        const reversedOn = runEmit(reversed);
        const rows = on.localLines.map(parseLocalRow);

        expect(on.output).toEqual(off.output);
        expect(serializeState(on.state)).toBe(serializeState(off.state));
        expect(reversedOn.localLines.map(parseLocalRow)).toEqual(rows);
        expect(rows.filter((row) => (
            row.phase === 'group_roster'
            && row.candidate_class === 'sector-listed_group'
            && row.roster_path === 'projected_surplus'
        ))).toEqual([
            expect.objectContaining({
                roster_path: 'projected_surplus', brigade_id: 'local_b1', target_osid: 'op:test:local_target',
                outcome: 'eligible', first_failed_predicate: null, considered_roster: null,
            }),
            expect.objectContaining({
                roster_path: 'projected_surplus', brigade_id: 'local_b2', target_osid: 'op:test:local_target',
                outcome: 'eligible', first_failed_predicate: null, considered_roster: null,
            }),
            expect.objectContaining({
                roster_path: 'projected_surplus', brigade_id: 'local_b3', target_osid: 'op:test:local_target',
                outcome: 'eligible', first_failed_predicate: null, considered_roster: null,
            }),
        ]);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_group', outcome: 'qualified',
            considered_roster: ['local_b1', 'local_b2', 'local_b3'], first_failed_predicate: null,
        }));
        expect(rows.at(-1)).toMatchObject({
            phase: 'search_end', outcome: 'selected', selected_class: 'sector-listed_group',
            selected_roster: ['local_b1', 'local_b2', 'local_b3'],
        });
    });

    it('rejects a nominal-allied HRHB target on the single-brigade local candidate path', () => {
        const inputs = localOccupationInputs();
        setLocalOccupationTargetFaction(inputs, 'HRHB');
        setTopics('local_occupation_candidate');

        const result = runEmit(inputs);
        const rows = result.localLines.map(parseLocalRow);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_single', outcome: 'rejected',
            target_osid: 'op:test:local_target', first_failed_predicate: 'rbih_hrhb_combat_allowed',
        }));
        expect(rows.at(-1)).toMatchObject({ phase: 'search_end', outcome: 'rejected' });
        expect(result.output.operations.every(
            (operation) => operation.objectives?.includes('op:test:local_target') !== true,
        )).toBe(true);
        applyCommanderOutput(result.state, inputs.briefing.corps_id, result.output);
        expect(result.state.military.corps_command![inputs.briefing.corps_id]!.active_operations.every(
            (operation) => operation.objectives?.includes('op:test:local_target') !== true,
        )).toBe(true);
    });

    it('rejects a nominal-allied HRHB target on the grouped local candidate path', () => {
        const inputs = localOccupationGroupInputs();
        setLocalOccupationTargetFaction(inputs, 'HRHB');
        setTopics('local_occupation_candidate');

        const result = runEmit(inputs);
        const rows = result.localLines.map(parseLocalRow);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_group', outcome: 'rejected',
            target_osid: 'op:test:local_target', first_failed_predicate: 'rbih_hrhb_combat_allowed',
        }));
        expect(rows.at(-1)).toMatchObject({ phase: 'search_end', outcome: 'rejected' });
        expect(result.output.operations.every(
            (operation) => operation.objectives?.includes('op:test:local_target') !== true,
        )).toBe(true);
        applyCommanderOutput(result.state, inputs.briefing.corps_id, result.output);
        expect(result.state.military.corps_command![inputs.briefing.corps_id]!.active_operations.every(
            (operation) => operation.objectives?.includes('op:test:local_target') !== true,
        )).toBe(true);
    });

    it.each([
        ['nominal alliance', undefined, 'rejected'],
        ['open war', -0.1, 'qualified'],
    ] as const)('enforces the centralized HRHB-to-RBiH combat gate during %s', (_name, allianceValue, outcome) => {
        const inputs = localOccupationInputs();
        setLocalOccupationFactions(inputs, 'HRHB', 'RBiH', allianceValue);
        setTopics('local_occupation_candidate');

        const result = runEmit(inputs);
        const candidate = result.localLines.map(parseLocalRow).find((row) => (
            row.phase === 'candidate' && row.candidate_class === 'sector-listed_single'
        ));
        expect(candidate).toMatchObject({
            outcome,
            first_failed_predicate: outcome === 'rejected' ? 'rbih_hrhb_combat_allowed' : null,
        });
        expect(result.output.operations.some(
            (operation) => operation.objectives?.includes('op:test:local_target') === true,
        )).toBe(outcome === 'qualified');
    });

    it.each([
        ['single', () => localOccupationInputs(), 'sector-listed_single'],
        ['group', () => localOccupationGroupInputs(), 'sector-listed_group'],
    ] as const)('admits a hostile HRHB target on the %s local candidate path', (_name, build, candidateClass) => {
        const inputs = build();
        setLocalOccupationTargetFaction(inputs, 'HRHB', -0.1);
        setTopics('local_occupation_candidate');

        const rows = runEmit(inputs).localLines.map(parseLocalRow);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: candidateClass, outcome: 'qualified',
            target_osid: 'op:test:local_target', first_failed_predicate: null,
        }));
        expect(rows.at(-1)).toMatchObject({ phase: 'search_end', outcome: 'selected', selected_class: candidateClass });
    });

    it('records actual group eligibility, approach, and staged staffing failures with later predicates unreached', () => {
        const inputs = localOccupationGroupInputs();
        const formations = inputs.briefing.state_ref!.military.formations!;
        const b2 = formations['local_b2']!;
        const b3 = formations['local_b3']!;
        formations['local_b2'] = { ...b2, tags: ['enclave'] };
        formations['local_b3'] = { ...b3, location_osid: 'op:test:remote' };
        Object.assign(inputs.briefing, {
            brigades: [formations['local_b1']!, formations['local_b2']!, formations['local_b3']!],
        });
        const friendly = inputs.briefing.spatial.friendlyOsidsByFaction as Map<FactionId, ReadonlySet<string>>;
        friendly.set('RBiH', new Set(['op:test:local_approach', 'op:test:remote']));
        const sector = inputs.briefing.sectors[0]!;
        inputs.allocation = {
            ...inputs.allocation,
            surplus_pool: [makeEval('local_b1'), makeEval('local_b2'), makeEval('local_b3')],
            garrison_locks: [{
                brigade_id: 'local_b2' as FormationId,
                zone_id: 'zone:test:0' as ZoneId,
                reason: 'observer staffing fixture',
            }],
        };
        inputs.briefing.state_ref!.military.brigade_movement_state = {
            local_b2: { status: 'packing' },
        } as any;
        // Keep one eligible surplus primary so the original staged-garrison filter is reached.
        sector.assigned_brigade_ids = ['local_b1', 'local_b2', 'local_b3'] as FormationId[];

        setTopics('local_occupation_candidate');
        const rows = runEmit(inputs).localLines.map(parseLocalRow);
        const groupRows = rows.filter((row) => row.phase === 'group_roster' && row.candidate_class === 'sector-listed_group');
        const eligibility = groupRows.find((row) => row.roster_path === 'projected_surplus' && row.brigade_id === 'local_b2');
        expect(eligibility).toMatchObject({ outcome: 'rejected', first_failed_predicate: 'formation_eligible_for_objective' });
        expect(eligibility!.predicates.map((entry: any) => entry.predicate)).toEqual([
            'same_corps', 'not_on_elite_loan', 'formation_eligible_for_objective',
        ]);
        const approach = groupRows.find((row) => row.roster_path === 'projected_surplus' && row.brigade_id === 'local_b3');
        expect(approach).toMatchObject({ outcome: 'rejected', first_failed_predicate: 'approach_distance_finite' });
        expect(approach!.predicates.map((entry: any) => entry.predicate)).toEqual([
            'same_corps', 'not_on_elite_loan', 'formation_eligible_for_objective', 'approach_distance_finite',
        ]);
        const staffing = groupRows.find((row) => row.roster_path === 'staged_primary_garrison' && row.brigade_id === 'local_b2');
        expect(staffing).toMatchObject({ outcome: 'rejected', first_failed_predicate: 'movement_not_packing' });
        expect(staffing!.predicates.map((entry: any) => entry.predicate)).toEqual([
            'garrison_locked', 'elite_available', 'not_queued_historical', 'not_active_operation', 'combat_ready',
            'movement_not_packing',
        ]);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_group', outcome: 'rejected',
            first_failed_predicate: 'minimum_group_roster', considered_roster: ['local_b1'],
        }));
    });

    it('records an enumerated group target rejection before any group roster is measured', () => {
        const inputs = localOccupationGroupInputs();
        inputs.briefing.osid_population_map!.delete('op:test:local_target');
        setTopics('local_occupation_candidate');
        const rows = runEmit(inputs).localLines.map(parseLocalRow);
        expect(rows.filter((row) => row.phase === 'group_roster')).toEqual([]);
        expect(rows).toContainEqual(expect.objectContaining({
            phase: 'candidate', candidate_class: 'sector-listed_group', target_osid: 'op:test:local_target',
            considered_roster: null, outcome: 'rejected', first_failed_predicate: 'target_population_present',
            predicates: [{ predicate: 'target_population_present', passed: false }],
        }));
        expect(rows.at(-1)).toMatchObject({ phase: 'search_end', outcome: 'rejected' });
    });
});

describe('commander_creation emitter observation', () => {
    for (const scenario of SCENARIOS) {
        it(`${scenario.name}: records the REAL exit with reached fields only, without changing operations or state`, () => {
            setTopics(undefined);
            const off = runEmit(scenario.build());
            expect(off.lines).toEqual([]);
            setTopics('commander_creation');
            const inputs = prepare(scenario.build());
            const liveBefore = JSON.stringify([inputs.plan, inputs.allocation, inputs.briefing.brigades, inputs.briefing.sectors, inputs.briefing.active_operations]);
            const on = runEmit(inputs);
            // on/off parity: identical returned output and identical real serialized canonical state; live inputs untouched
            expect(on.output).toEqual(off.output);
            expect(serializeState(on.state)).toBe(serializeState(off.state));
            expect(JSON.stringify([inputs.plan, inputs.allocation, inputs.briefing.brigades, inputs.briefing.sectors, inputs.briefing.active_operations])).toBe(liveBefore);
            // exactly one completion row for the one real buildOperations call
            expect(on.lines).toHaveLength(1);
            const row = parseRow(on.lines[0]!);
            expect(row.schema).toBe('commander_creation.v1');
            expect(row.phase).toBe('build_operations_complete');
            expect(row.corps_id).toBe(CORPS_ID);
            expect(row.host_corps_id).toBe(CORPS_ID);
            expect(row.faction).toBe(FACTION);
            expect(row.turn).toBe(inputs.briefing.turn);
            expect(row.exit).toBe(scenario.expectExit);
            for (const key of scenario.expectPresent) expect(row, `present: ${key}`).toHaveProperty(key);
            for (const key of scenario.expectAbsent) expect(row, `absent (never inferred): ${key}`).not.toHaveProperty(key);
            expect(row.returned).toHaveLength(scenario.expectReturned);
            expect(row.returned.map((entry: any) => entry.name)).toEqual(on.output.operations.map((op) => op.name));
            expect(row.returned.map((entry: any) => entry.started_turn)).toEqual(on.output.operations.map((op) => op.started_turn));
            if (scenario.expectSite) {
                expect(row.built.map((entry: any) => entry.site)).toContain(scenario.expectSite);
                expect(row.built.length).toBeGreaterThanOrEqual(1);
            }
            for (const [key, value] of Object.entries(scenario.expectFields ?? {})) expect(row[key], `field: ${key}`).toEqual(value);
            // the reduction inputs are REACHED inputs of the fallback even when the outcome is a plain probe (escalation false)
            if (scenario.expectExit === 'fallback_probe_created') expect(row.escalate_to_operation).toBe(false);
            if (scenario.expectExit === 'reduction_created') expect(row.escalate_to_operation).toBe(true);
            if (scenario.expectExit.endsWith('_overlap_suppressed')) {
                expect(row.overlap_detail).toBeDefined();
                expect(row.overlap_detail.candidate).toMatchObject({
                    host_corps_id: CORPS_ID,
                    derived_id: `${CORPS_ID}:${row.built[0]?.name}:t${row.built[0]?.started_turn}`,
                    name: row.built[0]?.name,
                    type: row.built[0]?.type,
                    started_turn: row.built[0]?.started_turn,
                });
                expect(row.overlap_detail.checks.length).toBeGreaterThan(0);
                const matched = row.overlap_detail.checks.find((check: any) => check.first_matched_clause !== null);
                expect(matched).toBeDefined();
                expect(row.overlap_detail.first_matched_clause).toBe(matched?.first_matched_clause);
                expect(row.overlap_detail.conflicting_operation).toEqual(matched?.existing_operation);
                expect(row.overlap_detail.checks.at(-1)).toEqual(matched);
            }
            // never a feasibility verdict in this path
            expect(JSON.stringify(row)).not.toContain('feasib');
        });
    }

    it('writes nothing and allocates no observation when the topic is off', () => {
        setTopics(undefined);
        const result = runEmit(SCENARIOS[0]!.build());
        expect(result.lines).toEqual([]);
        expect(result.output.operations).toHaveLength(1);
    });

    it('reversed brigade/surplus insertion order gives an identical row and identical operations', () => {
        setTopics('commander_creation');
        for (const scenario of [SCENARIOS[0]!, SCENARIOS[4]!]) {
            const forward = scenario.build();
            const reversed = scenario.build();
            (reversed.briefing as unknown as { brigades: unknown }).brigades = [...reversed.briefing.brigades].reverse();
            reversed.allocation = { ...reversed.allocation, surplus_pool: [...reversed.allocation.surplus_pool].reverse() };
            expect(reversed.briefing.brigades.map((b) => b.id)).not.toEqual(forward.briefing.brigades.map((b) => b.id));
            const a = runEmit(forward);
            const b = runEmit(reversed);
            expect(a.lines).toHaveLength(1);
            expect(b.lines).toHaveLength(1);
            expect(parseRow(b.lines[0]!)).toEqual(parseRow(a.lines[0]!));
            expect(b.output.operations.map((op) => op.name)).toEqual(a.output.operations.map((op) => op.name));
        }
    });

    it('records emitted operations by stored fields only: no stored operation id exists, host corps comes from the briefing', () => {
        setTopics('commander_creation');
        const result = runEmit(SCENARIOS[0]!.build());
        const row = parseRow(result.lines[0]!);
        expect(Object.keys(row.returned[0]).sort()).toEqual(['name', 'started_turn', 'type']);
        expect(row.host_corps_id).toBe(CORPS_ID);
    });

    it('records each actually reached local-opportunity operand and nulls every later short-circuited operand', () => {
        setTopics('commander_creation');
        const cases: Array<{
            name: string;
            build: () => EmitInputs;
            values: Record<string, boolean | null>;
            firstFailed: string | null;
        }> = [
            {
                name: 'operation already built',
                build: () => ({
                    briefing: makeIntelBriefing([0.25], { turn: 20, consecutiveProbes: 2 }),
                    plan: makePlanDecision(),
                    allocation: makeAllocation(),
                }),
                values: {
                    ops_length_zero: false,
                    allocation_can_launch_ops: null,
                    surplus_pool_nonempty: null,
                    initiative_above_threshold: null,
                    active_slot_free: null,
                },
                firstFailed: 'ops_length_zero',
            },
            {
                name: 'launch capacity false',
                build: () => ({
                    briefing: makeBriefing(),
                    plan: noPlan(10),
                    allocation: { ...makeAllocation(), can_launch_ops: false },
                }),
                values: {
                    ops_length_zero: true,
                    allocation_can_launch_ops: false,
                    surplus_pool_nonempty: null,
                    initiative_above_threshold: null,
                    active_slot_free: null,
                },
                firstFailed: 'allocation_can_launch_ops',
            },
            {
                name: 'surplus empty',
                build: () => ({
                    briefing: makeBriefing(),
                    plan: noPlan(10),
                    allocation: { ...makeAllocation(), surplus_pool: [] },
                }),
                values: {
                    ops_length_zero: true,
                    allocation_can_launch_ops: true,
                    surplus_pool_nonempty: false,
                    initiative_above_threshold: null,
                    active_slot_free: null,
                },
                firstFailed: 'surplus_pool_nonempty',
            },
            {
                name: 'initiative at threshold',
                build: () => {
                    const briefing = makeBriefing();
                    (briefing as unknown as { officer_personality: OfficerPersonality }).officer_personality = {
                        ...defaultPersonality,
                        initiative: 0.3,
                    };
                    return { briefing, plan: noPlan(10), allocation: makeAllocation() };
                },
                values: {
                    ops_length_zero: true,
                    allocation_can_launch_ops: true,
                    surplus_pool_nonempty: true,
                    initiative_above_threshold: false,
                    active_slot_free: null,
                },
                firstFailed: 'initiative_above_threshold',
            },
            {
                name: 'active slot full',
                build: () => ({
                    briefing: makeBriefing([{
                        ...OVERLAPPING_RECOVERY_OPERATION,
                        phase: 'execution',
                        sector_id: 'sector:other',
                        objectives: ['op:test:other'],
                        participating_brigades: ['other_brigade'],
                    }]),
                    plan: noPlan(10),
                    allocation: makeAllocation(),
                }),
                values: {
                    ops_length_zero: true,
                    allocation_can_launch_ops: true,
                    surplus_pool_nonempty: true,
                    initiative_above_threshold: true,
                    active_slot_free: false,
                },
                firstFailed: 'active_slot_free',
            },
            {
                name: 'all operands pass',
                build: () => ({
                    briefing: boundedPositionBriefing(2, true),
                    plan: noPlan(10),
                    allocation: makeAllocation(),
                }),
                values: {
                    ops_length_zero: true,
                    allocation_can_launch_ops: true,
                    surplus_pool_nonempty: true,
                    initiative_above_threshold: true,
                    active_slot_free: true,
                },
                firstFailed: null,
            },
        ];

        for (const c of cases) {
            const row = parseRow(runEmit(c.build()).lines[0] ?? '');
            expect(row.local_opportunity_operands, c.name).toEqual(c.values);
            expect(row.local_opportunity_first_failed_operand, c.name).toBe(c.firstFailed);
        }
    });

    it('keeps probe cooldown separate from the local-opportunity composite failure', () => {
        setTopics('commander_creation');
        const recentProbe = {
            ...OVERLAPPING_RECOVERY_OPERATION,
            name: 'Recent Probe',
            type: 'probe',
            started_turn: 9,
            sector_id: 'sector:other',
            objectives: ['op:test:other'],
            participating_brigades: ['other_brigade'],
        };
        const row = parseRow(runEmit({
            briefing: makeBriefing([recentProbe]),
            plan: noPlan(10),
            allocation: { ...makeAllocation(), can_launch_ops: false },
        }).lines[0] ?? '');
        expect(row.probe_on_cooldown).toBe(true);
        expect(row.can_consider_local_opportunity).toBe(false);
        expect(row.local_opportunity_first_failed_operand).toBe('allocation_can_launch_ops');
        expect(JSON.stringify(row.local_opportunity_operands)).not.toContain('cooldown');
    });

    it('records exact overlap predicate reachability, first matching operation identity, and detached sorted tuples', () => {
        setTopics('commander_creation');
        const baseExisting = {
            ...OVERLAPPING_RECOVERY_OPERATION,
            sector_id: 'sector:other',
            objectives: ['op:test:other-b', 'op:test:other-a'],
            participating_brigades: ['z_other', 'a_other'],
        };
        const cases = [
            {
                name: 'same sector wins even when every clause would match',
                existing: [{
                    ...baseExisting,
                    sector_id: `sector:${CORPS_ID}:0`,
                    objectives: ['op:test:objective'],
                    participating_brigades: ['b1'],
                }],
                expectedChecks: [{
                    same_sector: true,
                    shared_objective: null,
                    shared_participant: null,
                    first_matched_clause: 'same_sector',
                }],
                firstMatched: 'same_sector',
                suppressed: true,
            },
            {
                name: 'shared objective is reached after sector misses',
                existing: [{ ...baseExisting, objectives: ['op:test:objective'] }],
                expectedChecks: [{
                    same_sector: false,
                    shared_objective: true,
                    shared_participant: null,
                    first_matched_clause: 'shared_objective',
                }],
                firstMatched: 'shared_objective',
                suppressed: true,
            },
            {
                name: 'shared participant is reached after sector and objective miss',
                existing: [{ ...baseExisting, participating_brigades: ['b1'] }],
                expectedChecks: [{
                    same_sector: false,
                    shared_objective: false,
                    shared_participant: true,
                    first_matched_clause: 'shared_participant',
                }],
                firstMatched: 'shared_participant',
                suppressed: true,
            },
            {
                name: 'disjoint operation is fully checked before a later objective conflict',
                existing: [
                    baseExisting,
                    { ...baseExisting, name: 'Later Conflict', started_turn: 6, objectives: ['op:test:objective'] },
                ],
                expectedChecks: [
                    {
                        same_sector: false,
                        shared_objective: false,
                        shared_participant: false,
                        first_matched_clause: null,
                    },
                    {
                        same_sector: false,
                        shared_objective: true,
                        shared_participant: null,
                        first_matched_clause: 'shared_objective',
                    },
                ],
                firstMatched: 'shared_objective',
                suppressed: true,
            },
            {
                name: 'fully disjoint operation does not suppress',
                existing: [baseExisting],
                expectedChecks: [{
                    same_sector: false,
                    shared_objective: false,
                    shared_participant: false,
                    first_matched_clause: null,
                }],
                firstMatched: null,
                suppressed: false,
            },
        ];

        for (const c of cases) {
            const existingObjectivesBefore = c.existing.map((op) => [...op.objectives]);
            const existingParticipantsBefore = c.existing.map((op) => [...op.participating_brigades]);
            const briefing = makeIntelBriefingWith([0.25], { turn: 20, consecutiveProbes: 2 }, c.existing);
            const row = parseRow(runEmit({ briefing, plan: makePlanDecision(), allocation: makeAllocation() }).lines[0] ?? '');
            const detail = row.overlap_detail;
            expect(detail.checks.map((check: any) => ({
                same_sector: check.same_sector,
                shared_objective: check.shared_objective,
                shared_participant: check.shared_participant,
                first_matched_clause: check.first_matched_clause,
            })), c.name).toEqual(c.expectedChecks);
            expect(detail.first_matched_clause, c.name).toBe(c.firstMatched);
            expect(detail.conflicting_operation !== null, c.name).toBe(c.suppressed);
            expect(row.overlap_found, c.name).toBe(c.suppressed);
            expect(detail.candidate).toMatchObject({
                host_corps_id: CORPS_ID,
                derived_id: expect.stringMatching(new RegExp(`^${CORPS_ID}:.*:t20$`)),
                sector_id: `sector:${CORPS_ID}:0`,
                type: 'sector_attack',
                started_turn: 20,
                objective_ids: ['op:test:objective'],
                participant_ids: ['b1', 'b2'],
            });
            for (const check of detail.checks) {
                expect(check.existing_operation.objective_ids).toEqual([...check.existing_operation.objective_ids].sort());
                expect(check.existing_operation.participant_ids).toEqual([...check.existing_operation.participant_ids].sort());
            }
            expect(c.existing.map((op) => op.objectives)).toEqual(existingObjectivesBefore);
            expect(c.existing.map((op) => op.participating_brigades)).toEqual(existingParticipantsBefore);
        }
    });

    function fourthCorpsProbeWindowInputs(options: {
        turn?: number;
        faction?: FactionId;
        corpsId?: FormationId;
        confidence?: number;
        consecutiveProbes?: number;
        bilateralOffensive?: boolean;
        probeExempt?: boolean;
        activeOperations?: any[];
        plan?: PlanDecision;
    } = {}): EmitInputs {
        const turn = options.turn ?? 178;
        const faction = options.faction ?? 'RBiH';
        const corpsId = options.corpsId ?? 'arbih_4th_corps' as FormationId;
        const confidence = options.confidence ?? 0;
        const activeOperations = options.activeOperations ?? [];
        const briefing = makeIntelBriefingWith(
            [confidence],
            { turn, consecutiveProbes: options.consecutiveProbes ?? 0 },
            activeOperations,
        );
        const oldCorpsId = briefing.corps_id;
        const oldSectorId = briefing.sectors[0]!.sector_id;
        const sectorId = `sector:${corpsId}:0`;
        Object.assign(briefing as any, {
            corps_id: corpsId,
            faction,
            turn,
            bilateral_offensive: options.bilateralOffensive,
        });
        briefing.state_ref!.meta.turn = turn;
        briefing.state_ref!.factions = [{ id: faction }] as any;
        briefing.state_ref!.military.corps_command![corpsId] = briefing.state_ref!.military.corps_command![oldCorpsId]!;
        delete briefing.state_ref!.military.corps_command![oldCorpsId];
        briefing.state_ref!.military.corps_command![corpsId]!.consecutive_probes = options.consecutiveProbes ?? 0;
        if (options.probeExempt != null) {
            briefing.state_ref!.military.war_timeline = {
                doctrine_phases: {
                    [faction]: [{
                        start_week: 0,
                        end_week: 9999,
                        default_corps_stance: 'offensive',
                        probe_exempt: options.probeExempt,
                    }],
                },
            } as any;
        }
        briefing.sectors[0]!.corps_id = corpsId;
        briefing.sectors[0]!.faction = faction;
        briefing.sectors[0]!.opposing_factions = [faction === 'RBiH' ? 'RS' : 'RBiH'];
        briefing.sectors[0]!.sector_id = sectorId;
        briefing.sectors[0]!.sub_segments[0]!.sub_segment_id = `subseg:${corpsId}:0`;
        briefing.state_ref!.military.sector_intel = {
            [sectorId]: briefing.state_ref!.military.sector_intel![oldSectorId]!,
        };
        (briefing as any).intel_data = {
            sector_intel: briefing.state_ref!.military.sector_intel,
            opsec_active_sectors: [],
        };
        (briefing.spatial as any).friendlyOsidsByFaction = new Map([
            [faction, new Set(['op:test:approach'])],
            [faction === 'RBiH' ? 'RS' : 'RBiH', new Set(['op:test:objective'])],
            ['HRHB', new Set()],
        ]) as Map<FactionId, ReadonlySet<string>>;
        for (const brigade of briefing.brigades) {
            brigade.faction = faction;
            brigade.corps_id = corpsId;
        }
        const plan = options.plan ?? makePlanDecision();
        if (options.bilateralOffensive === true && plan.plan) {
            (plan.plan as any).bilateral_offensive = true;
            (plan.plan as any).assigned_brigades = ['b1' as FormationId, 'b2' as FormationId];
        }
        return {
            briefing,
            plan,
            allocation: makeAllocation(),
        };
    }

    describe('exact RBiH 4th Corps turns 177-179 probe-gate receipt', () => {
        it('is absent outside the exact selector and remains default-off', () => {
            setTopics(undefined);
            expect(runEmit(fourthCorpsProbeWindowInputs()).lines).toEqual([]);

            setTopics('commander_creation');
            const controls = [
                fourthCorpsProbeWindowInputs({ faction: 'RS' }),
                fourthCorpsProbeWindowInputs({ corpsId: 'arbih_3rd_corps' as FormationId }),
                fourthCorpsProbeWindowInputs({ turn: 176 }),
                fourthCorpsProbeWindowInputs({ turn: 180 }),
            ];
            for (const input of controls) {
                const row = parseRow(runEmit(input).lines[0]!);
                expect(row).not.toHaveProperty('probe_gate_receipt');
            }
        });

        it('records an outer exit before the predicate as not reached, without manufacturing false inputs', () => {
            const blocker = {
                ...OVERLAPPING_RECOVERY_OPERATION,
                phase: 'execution',
                sector_id: 'sector:other',
                objectives: ['op:test:other'],
                participating_brigades: ['other_brigade'],
            };
            setTopics('commander_creation');
            const row = parseRow(runEmit(fourthCorpsProbeWindowInputs({ activeOperations: [blocker] })).lines[0]!);
            expect(row.exit).toBe('active_slot_full');
            expect(row.probe_gate_receipt).toEqual({
                selector: { faction: 'RBiH', corps_id: 'arbih_4th_corps', turn: 178 },
                first_reached_exit: 'active_slot_full',
                plan_decision: null,
                fallback_escalation_decision: null,
                candidate_operations: [],
                returned_operations: [],
                target_selection_detail: {
                    status: 'not_reached',
                    selected_brigade_id: null,
                    selected_brigade_location: null,
                    derived_sector_id: null,
                    enemy_candidate_ids: [],
                    direct_candidate_ids: [],
                    survivor_ids: [],
                    ranked_objective_ids: [],
                    targets: [],
                },
            });
        });

        it.each([
            ['zero confidence launches', 0, 0, undefined, true, null, false, 0.4, true, 'intel_threshold'],
            ['threshold confidence commits', 0.4, 0, undefined, false, null, false, 0.4, false, 'intel_threshold'],
            ['consecutive-probe cap commits', 0, 2, undefined, false, null, true, null, null, 'consecutive_probe_cap'],
            ['doctrine exemption commits before the cap', 0, 2, true, false, true, null, null, null, 'doctrine_probe_exempt'],
        ] as const)('records exact predicate inputs and truthy/falsy/zero boundaries: %s', (
            _name,
            confidence,
            consecutiveProbes,
            probeExempt,
            launchProbe,
            doctrineProbeExempt,
            consecutiveProbeCapReached,
            resolvedThreshold,
            intelBelowThreshold,
            predicateExit,
        ) => {
            setTopics('commander_creation');
            const row = parseRow(runEmit(fourthCorpsProbeWindowInputs({ confidence, consecutiveProbes, probeExempt })).lines[0]!);
            expect(row.probe_gate_receipt.plan_decision).toEqual({
                reached: true,
                site: 'plan',
                sector_id: 'sector:arbih_4th_corps:0',
                sector_intel_confidence: confidence,
                consecutive_probes: consecutiveProbes,
                resolved_threshold: resolvedThreshold,
                doctrine_probe_exempt: doctrineProbeExempt,
                consecutive_probe_cap_reached: consecutiveProbeCapReached,
                intel_below_threshold: intelBelowThreshold,
                first_reached_exit: predicateExit,
                bilateral_offensive: null,
                launch_probe: launchProbe,
            });
            expect(row.probe_gate_receipt.first_reached_exit).toBe(launchProbe ? 'plan_probe_created' : 'general_created');
            expect(row.probe_gate_receipt.candidate_operations).toHaveLength(1);
            expect(row.probe_gate_receipt.returned_operations).toHaveLength(1);
            expect(row.probe_gate_receipt.candidate_operations[0].operation).toEqual(row.probe_gate_receipt.returned_operations[0]);
            expect(row.probe_gate_receipt.candidate_operations[0].site).toBe(launchProbe ? 'plan_probe' : 'general');
        });

        it('keeps bilateral short-circuit distinct from a reached false predicate', () => {
            setTopics('commander_creation');
            const row = parseRow(runEmit(fourthCorpsProbeWindowInputs({ bilateralOffensive: true })).lines[0]!);
            expect(row.exit).toBe('general_created');
            expect(row.probe_gate_receipt.plan_decision).toBeNull();
            expect(row.launch_probe_evaluated).toBe(false);
            expect(row).not.toHaveProperty('launch_probe');
        });

        it('records a returned fallback probe while truthfully leaving the fallback predicate not reached', () => {
            setTopics('commander_creation');
            const row = parseRow(runEmit(fourthCorpsProbeWindowInputs({
                plan: noPlan(178),
                confidence: 0,
                consecutiveProbes: 0,
            })).lines[0]!);
            expect(row.exit).toBe('fallback_probe_created');
            expect(row.fallback_considered).toBe(true);
            expect(row.probe_gate_receipt.plan_decision).toBeNull();
            expect(row.probe_gate_receipt.fallback_escalation_decision).toBeNull();
            expect(row.probe_gate_receipt.candidate_operations).toHaveLength(1);
            expect(row.probe_gate_receipt.candidate_operations[0].site).toBe('fallback_probe');
            expect(row.probe_gate_receipt.candidate_operations[0].operation).toEqual(row.probe_gate_receipt.returned_operations[0]);
        });

        it('records the reached local-occupation bypass without inventing generic target filters', () => {
            setTopics('commander_creation');
            const row = parseRow(runEmit(localOccupationInputs({
                turn: 178,
                corpsId: 'arbih_4th_corps' as FormationId,
            })).lines[0]!);

            expect(row.probe_gate_receipt.target_selection_detail).toMatchObject({
                status: 'local_occupation_bypass',
                selected_brigade_id: 'local_b1',
                selected_brigade_location: 'op:test:local_approach',
                derived_sector_id: 'sector:arbih_4th_corps:0',
                enemy_candidate_ids: [],
                direct_candidate_ids: [],
                survivor_ids: ['op:test:local_target'],
                ranked_objective_ids: ['op:test:local_target'],
                targets: [],
            });
        });

        it('preserves output, canonical state, and detached probe tuples when the selected detail is enabled', () => {
            setTopics(undefined);
            const off = runEmit(fourthCorpsProbeWindowInputs({ confidence: 0 }));
            setTopics('commander_creation');
            const on = runEmit(fourthCorpsProbeWindowInputs({ confidence: 0 }));
            const row = parseRow(on.lines[0]!);
            expect(on.output).toEqual(off.output);
            expect(serializeState(on.state)).toBe(serializeState(off.state));
            expect(row.probe_gate_receipt.candidate_operations[0]).toMatchObject({
                site: 'plan_probe',
                operation: {
                    host_corps_id: 'arbih_4th_corps',
                    type: 'probe',
                    started_turn: 178,
                    sector_id: 'sector:arbih_4th_corps:0',
                    objective_ids: ['op:test:objective'],
                    participant_ids: ['b1'],
                },
            });
            expect(row.probe_gate_receipt.returned_operations[0]).toEqual(row.probe_gate_receipt.candidate_operations[0].operation);
        });
    });
});

// ───────────────────────── caller pass markers (real generateAllCorpsOrders) ─────────────────────────
function callerState(corpsIds: readonly string[]): any {
    const brigade = (id: string, corps: string) => ({
        id, name: id, faction: 'RS', kind: 'brigade', status: 'active', corps_id: corps, created_turn: 0, assignment: null,
        personnel: 1200, cohesion: 70, morale: 65, location_osid: 'op:test:approach',
    });
    const formations: Record<string, unknown> = {};
    const corpsCommand: Record<string, unknown> = {};
    for (const id of corpsIds) {
        formations[id] = { id, name: id, faction: 'RS', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 };
        corpsCommand[id] = { command_span: 3, subordinate_count: 0, og_slots: 0, active_ogs: [], active_operations: [], corps_exhaustion: 0, stance: 'balanced' };
    }
    formations.b1 = brigade('b1', corpsIds[0]!);
    formations.b2 = brigade('b2', corpsIds[0]!);
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, phase: 'war', seed: 'caller-markers' },
        factions: [{ id: 'RS' }],
        political: { political_controllers: { 'op:test:approach': 'RS', 'op:test:objective': 'RBiH' }, control_events: [] },
        displacement: {},
        military: { formations, corps_command: corpsCommand, brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [] },
    };
}

function runCaller(corpsIds: readonly string[], withSpatial: boolean) {
    const state = callerState(corpsIds);
    const adjacency = new Map<string, readonly string[]>([['op:test:approach', ['op:test:objective']], ['op:test:objective', ['op:test:approach']]]);
    const spatial: any = {
        adjacency, sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map([['RS', new Set(['op:test:approach'])], ['RBiH', new Set(['op:test:objective'])], ['HRHB', new Set()]]),
        componentsByFaction: new Map(), frontEdgesOsid: undefined, computedAtTurn: 5, phase: 'pre-combat',
    };
    const edge = [{ a: 'op:test:approach', b: 'op:test:objective' } as any];
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    try {
        generateAllCorpsOrders(state, 'RS' as any, edge, new Map(), null, edge, null, null, adjacency as any, withSpatial ? spatial : null);
    } finally {
        spy.mockRestore();
    }
    return { state, rows: lines.filter((line) => line.startsWith(COMMANDER_CREATION_PREFIX)).map(parseRow) };
}

describe('commander_creation caller pass markers (real generateAllCorpsOrders)', () => {
    it('writes a pass-start marker with the sorted-on-copy corps inventory, one completion row per corps, and a pass-end marker only after normal completion', () => {
        setTopics('commander_creation');
        // formations inserted c1 BEFORE c0: the marker inventory is sorted on a copy and the completion rows follow the caller's own order
        const { rows } = runCaller(['vrs_c1', 'vrs_c0'], true);
        expect(rows.map((row) => row.phase)).toEqual(['pass_start', 'build_operations_complete', 'build_operations_complete', 'pass_end']);
        expect(rows[0]).toMatchObject({ schema: 'commander_creation.v1', faction: 'RS', turn: 5, spatial_present: true, corps_ids: ['vrs_c0', 'vrs_c1'] });
        expect(rows.slice(1, 3).map((row) => row.corps_id).sort()).toEqual(['vrs_c0', 'vrs_c1']);
        for (const row of rows.slice(1, 3)) expect(row).toMatchObject({ faction: 'RS', turn: 5, host_corps_id: row.corps_id });
        expect(rows[3]).toMatchObject({ phase: 'pass_end', status: 'completed', completed_corps_count: 2, faction: 'RS', turn: 5 });
    });

    it('records an explicit no-spatial skip (never coverage by absence)', () => {
        setTopics('commander_creation');
        const { rows } = runCaller(['vrs_c1'], false);
        expect(rows.map((row) => row.phase)).toEqual(['pass_start', 'pass_end']);
        expect(rows[0]).toMatchObject({ faction: 'RS', turn: 5, spatial_present: false });
        expect(rows[0]).not.toHaveProperty('corps_ids');
        expect(rows[1]).toMatchObject({ phase: 'pass_end', status: 'skipped_no_spatial' });
    });

    it('writes nothing when the topic is off and leaves the real canonical serialization identical when on', () => {
        setTopics(undefined);
        const off = runCaller(['vrs_c1', 'vrs_c0'], true);
        expect(off.rows).toEqual([]);
        setTopics('commander_creation');
        const on = runCaller(['vrs_c1', 'vrs_c0'], true);
        expect(on.rows.length).toBeGreaterThan(0);
        expect(serializeState(on.state)).toBe(serializeState(off.state));
    });
});
