import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    CorpsFrontSector,
    CorpsOperation,
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
import {
    capOpportunityOperationParticipants,
    emitCommanderOutput,
    selectBoundedPositionDonorAttachments,
} from '../../src/sim/combat/commander/emit.js';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import { evaluateOpeningAttackReadiness } from '../../src/sim/combat/sector_offensive_launch_helpers.js';
import { predictCombatOutcome } from '../../src/sim/combat/combat_predictor.js';
import { isOutcomeSufficientForAttack } from '../../src/sim/combat/bot_brigade_targeting.js';
import { generateAllBotOrdersOsid } from '../../src/sim/combat/bot_brigade_ai_osid.js';
import { autoResolveProbe, tickPreparation } from '../../src/sim/combat/operation_preparation.js';
import { resetReasonCodeTopicCacheForTests } from '../../src/sim/combat/reason_code_debug.js';

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_test_corps' as FormationId;
const defaultPersonality: OfficerPersonality = {
    aggression: 0.6,
    caution: 0.3,
    initiative: 0.8,
    competence: 0.6,
};

function setReasonCodeTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setReasonCodeTopics(undefined);
    vi.restoreAllMocks();
});

describe('opportunity operation force contract', () => {
    it('does not let launch-time sector attachments exceed the planned force', () => {
        const assembled = Array.from({ length: 11 }, (_, index) => `b${index + 1}`);
        expect(capOpportunityOperationParticipants(assembled, 'opportunity', 6)).toEqual(assembled.slice(0, 6));
        expect(capOpportunityOperationParticipants(assembled, 'pre_planned', 6)).toEqual(assembled);
    });

    it('uses one aggregate adjacent-sector attachment budget while preserving each donor density floor', () => {
        const primary = makeSector();
        const donor = (id: number, lengthEdges: number, brigadeIds: string[]) => ({
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:${id}`,
            territory_osids: [`op:test:donor-${id}`],
            length_edges: lengthEdges,
            assigned_brigade_ids: brigadeIds as FormationId[],
        } as CorpsFrontSector);
        const sectors = [
            primary,
            donor(1, 3, ['sole']),
            donor(2, 4, ['b3', 'line-2']),
            donor(3, 16, ['b4', 'line-3a', 'line-3b']),
        ];
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:donor-1', 'op:test:donor-2', 'op:test:donor-3']],
        ]);

        expect(selectBoundedPositionDonorAttachments(
            primary,
            sectors,
            ['sole', 'b3', 'b4'],
            new Map([
                [`sector:${CORPS_ID}:1`, new Set(['sole'])],
                // b3 is already packing for the operation; line-2 alone retains the floor.
                [`sector:${CORPS_ID}:2`, new Set(['line-2'])],
                [`sector:${CORPS_ID}:3`, new Set(['b4', 'line-3a', 'line-3b'])],
            ]),
            adjacency,
            3,
        )).toEqual({ brigade_ids: ['b3'], sector_ids: [`sector:${CORPS_ID}:2`] });

        const fullyStaffedLongFront = { ...sectors[3]!, length_edges: 17 } as CorpsFrontSector;
        expect(selectBoundedPositionDonorAttachments(
            primary,
            [...sectors.slice(0, 3), fullyStaffedLongFront],
            ['b4'],
            new Map([
                [`sector:${CORPS_ID}:1`, new Set(['sole'])],
                [`sector:${CORPS_ID}:2`, new Set(['b3', 'line-2'])],
                [`sector:${CORPS_ID}:3`, new Set(['b4', 'line-3a', 'line-3b'])],
            ]),
            adjacency,
            3,
        )).toEqual({ brigade_ids: [], sector_ids: [] });
    });

    it('fails closed for missing donor length and excludes candidates outside the surplus pool', () => {
        const primary = makeSector();
        const missingLength = {
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:1`,
            territory_osids: ['op:test:donor-1'],
            length_edges: undefined,
            assigned_brigade_ids: ['b3', 'line'] as FormationId[],
        } as unknown as CorpsFrontSector;
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:donor-1']],
        ]);

        expect(selectBoundedPositionDonorAttachments(
            primary,
            [primary, missingLength],
            ['b3'],
            new Map([[`sector:${CORPS_ID}:1`, new Set(['b3', 'line'])]]),
            adjacency,
            3,
        )).toEqual({ brigade_ids: [], sector_ids: [] });

        const validDonor = { ...missingLength, length_edges: 4 } as CorpsFrontSector;
        expect(selectBoundedPositionDonorAttachments(
            primary,
            [primary, validDonor],
            [],
            new Map([[`sector:${CORPS_ID}:1`, new Set(['b3', 'line'])]]),
            adjacency,
            3,
        )).toEqual({ brigade_ids: [], sector_ids: [] });
    });
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

const OMITTED_TARGET = 'op:test:objective';
const OMITTED_APPROACH = 'op:test:approach';
const ADJACENCY_ONLY_TARGET = 'op:test:aaa-adjacency-only';

interface OmittedTargetHarness {
    briefing: CommanderBriefing;
    allocation: AllocationResult;
    state: GameState;
    primary: CorpsFrontSector;
}

function makeOmittedTargetHarness(): OmittedTargetHarness {
    const localBrigades = ['b1', 'b2', 'b3'].map((id) => makeBrigade(id, OMITTED_APPROACH, { personnel: 500 }));
    const probe = makeBrigade('probe', 'op:test:other-approach', { personnel: 1_600 });
    const brigades = [...localBrigades, probe];
    const primary = {
        ...makeSector(),
        assigned_brigade_ids: localBrigades.map((brigade) => brigade.id),
        sub_segments: makeSector().sub_segments.map((subSegment) => ({
            ...subSegment,
            enemy_osids: [],
            primary_brigade_ids: localBrigades.map((brigade) => brigade.id),
        })),
    } as CorpsFrontSector;
    const probeSector = {
        ...makeSector(),
        sector_id: `sector:${CORPS_ID}:probe`,
        territory_osids: ['op:test:other-approach'],
        assigned_brigade_ids: ['probe'] as FormationId[],
        sub_segments: [{
            ...makeSector().sub_segments[0]!,
            sub_segment_id: `subseg:${CORPS_ID}:probe`,
            friendly_osids: ['op:test:other-approach'],
            enemy_osids: ['op:test:other-target'],
            primary_brigade_ids: ['probe'] as FormationId[],
        }],
    } as CorpsFrontSector;
    const genericDepth = Array.from({ length: 6 }, (_, index) => `op:test:other-depth:${index}`);
    const adjacency = new Map<string, readonly string[]>([
        [OMITTED_APPROACH, [OMITTED_TARGET]],
        [OMITTED_TARGET, [OMITTED_APPROACH]],
        ['op:test:other-approach', ['op:test:other-target']],
        ['op:test:other-target', ['op:test:other-approach', ...genericDepth]],
        ...genericDepth.map((osid) => [osid, ['op:test:other-target']] as const),
    ]);
    const base = makeBriefing([], brigades);
    const state = {
        ...base.state_ref!,
        meta: { ...base.state_ref!.meta, turn: 30 },
        military: {
            ...base.state_ref!.military,
            formations: Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade])),
            corps_front_sectors: {
                [primary.sector_id]: primary,
                [probeSector.sector_id]: probeSector,
            },
        },
        political: {
            ...base.state_ref!.political,
            political_controllers: {
                [OMITTED_APPROACH]: FACTION,
                [OMITTED_TARGET]: 'RBiH',
                'op:test:other-approach': FACTION,
                'op:test:other-target': 'RBiH',
                ...Object.fromEntries(genericDepth.map((osid) => [osid, 'RBiH'])),
            },
        },
    } as GameState;
    state.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
    const briefing = {
        ...base,
        turn: 30,
        brigades,
        sectors: [primary, probeSector],
        state_ref: state,
        reverse_map: new Map([
            [OMITTED_APPROACH, ['S1']],
            [OMITTED_TARGET, ['S2']],
            ['op:test:other-approach', ['S3']],
            ['op:test:other-target', ['S4']],
        ]),
        osid_population_map: new Map([
            [OMITTED_TARGET, 40_000],
            ['op:test:other-target', 10_000],
        ]),
        spatial: {
            ...makeSpatial(),
            adjacency,
            sharedBoundaryAdjacency: adjacency,
            friendlyOsidsByFaction: new Map([
                [FACTION, new Set([OMITTED_APPROACH, 'op:test:other-approach'])],
                ['RBiH' as FactionId, new Set([OMITTED_TARGET, 'op:test:other-target', ...genericDepth])],
                ['HRHB' as FactionId, new Set()],
            ]),
        } as SpatialContext,
    } as CommanderBriefing;
    return {
        briefing,
        allocation: {
            ...makeAllocation(),
            surplus_pool: [
                { ...makeEval('probe'), fitness_offense: 0.99 },
                ...localBrigades.map((brigade) => makeEval(brigade.id)),
            ],
        },
        state,
        primary,
    };
}

function emitOmittedTargetHarness(harness: OmittedTargetHarness) {
    return emitCommanderOutput(
        harness.briefing,
        [],
        makeForces(),
        harness.allocation,
        { ...makePlanDecision(), plan: null, action: 'none' },
        makeDecisions(),
        makeThreats(),
    );
}

function replaceHarnessBrigades(
    harness: OmittedTargetHarness,
    transform: (brigade: FormationState) => FormationState,
): void {
    harness.briefing = {
        ...harness.briefing,
        brigades: harness.briefing.brigades.map((brigade) => (
            brigade.id === 'probe' ? brigade : transform(brigade)
        )),
    };
    harness.state.military.formations = Object.fromEntries(
        harness.briefing.brigades.map((brigade) => [brigade.id, brigade]),
    );
}

function addPriorityTargets(
    harness: OmittedTargetHarness,
    listedPopulation: number | null,
    adjacencyOnlyPopulation: number,
): void {
    harness.primary.sub_segments = harness.primary.sub_segments.map((subSegment) => ({
        ...subSegment,
        enemy_osids: [OMITTED_TARGET],
    }));
    const adjacency = new Map(harness.briefing.spatial.adjacency);
    adjacency.set(OMITTED_APPROACH, [ADJACENCY_ONLY_TARGET, OMITTED_TARGET, OMITTED_TARGET]);
    adjacency.set(OMITTED_TARGET, [OMITTED_APPROACH]);
    adjacency.set(ADJACENCY_ONLY_TARGET, [OMITTED_APPROACH]);
    (harness.briefing as any).spatial = {
        ...harness.briefing.spatial,
        adjacency,
        sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map([
            [FACTION, new Set([OMITTED_APPROACH, 'op:test:other-approach'])],
            ['RBiH' as FactionId, new Set([
                OMITTED_TARGET,
                ADJACENCY_ONLY_TARGET,
                'op:test:other-target',
                ...Array.from({ length: 6 }, (_, index) => `op:test:other-depth:${index}`),
            ])],
            ['HRHB' as FactionId, new Set()],
        ]),
    } as SpatialContext;
    harness.state.political.political_controllers![ADJACENCY_ONLY_TARGET] = 'RBiH';
    harness.briefing.reverse_map!.set(ADJACENCY_ONLY_TARGET, ['S5']);
    if (listedPopulation == null) {
        harness.briefing.osid_population_map!.delete(OMITTED_TARGET);
    } else {
        harness.briefing.osid_population_map!.set(OMITTED_TARGET, listedPopulation);
    }
    harness.briefing.osid_population_map!.set(ADJACENCY_ONLY_TARGET, adjacencyOnlyPopulation);
}

function addObjectiveClaimWithSecondSlot(
    harness: OmittedTargetHarness,
    phase: CorpsOperation['phase'] = 'execution',
    objectives: string[] = [OMITTED_TARGET],
): void {
    const additionalBrigades = Array.from({ length: 20 }, (_, index) => (
        makeBrigade(`slot-${index}`, `op:test:rear-${index}`)
    ));
    harness.briefing = {
        ...harness.briefing,
        brigades: [...harness.briefing.brigades, ...additionalBrigades],
    };
    harness.state.military.formations = Object.fromEntries(
        harness.briefing.brigades.map((brigade) => [brigade.id, brigade]),
    );
    harness.state.military.corps_command![CORPS_ID]!.subordinate_count = harness.briefing.brigades.length;

    const executingClaim: CorpsOperation = {
        name: 'Existing claimed objective',
        type: 'sector_attack',
        phase,
        started_turn: 25,
        phase_started_turn: 27,
        sector_id: `sector:${CORPS_ID}:claimed`,
        objectives,
        participating_brigades: ['claim-owner' as FormationId],
    };
    harness.briefing = { ...harness.briefing, active_operations: [executingClaim] };
    harness.state.military.corps_command![CORPS_ID]!.active_operations = [executingClaim];
}

function emitClaimedObjectiveHarness(harness: OmittedTargetHarness, observe = true) {
    setReasonCodeTopics(observe ? 'local_occupation_candidate,commander_creation' : undefined);
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(' '));
    });
    try {
        return {
            output: emitOmittedTargetHarness(harness),
            localRows: lines
                .filter((line) => line.startsWith('[local_occupation_candidate] '))
                .map((line) => JSON.parse(line.slice('[local_occupation_candidate] '.length)) as Record<string, unknown>),
            commanderRows: lines
                .filter((line) => line.startsWith('[commander_creation] '))
                .map((line) => JSON.parse(line.slice('[commander_creation] '.length)) as Record<string, unknown>),
        };
    } finally {
        spy.mockRestore();
    }
}

describe('commander emission overlap guards', () => {
    it('builds the later target when an explicit input change makes the earlier target ineligible', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, null, 1_000);
        const topicOffHarness = makeOmittedTargetHarness();
        addPriorityTargets(topicOffHarness, null, 1_000);

        const topicOff = emitClaimedObjectiveHarness(topicOffHarness, false);
        const result = emitClaimedObjectiveHarness(harness);

        expect(result.output.operations).toHaveLength(1);
        expect(result.output.operations[0]).toMatchObject({
            objectives: [ADJACENCY_ONLY_TARGET],
            participating_brigades: ['b1'],
        });
        expect(result.localRows.filter((row) => row.phase === 'candidate')).toEqual(expect.arrayContaining([
            expect.objectContaining({
                target_osid: OMITTED_TARGET,
                outcome: 'rejected',
                first_failed_predicate: 'target_population_present',
            }),
            expect.objectContaining({
                target_osid: ADJACENCY_ONLY_TARGET,
                outcome: 'qualified',
            }),
        ]));
        expect(result.output).toEqual(topicOff.output);
        expect(JSON.stringify(harness.briefing.state_ref)).toBe(JSON.stringify(topicOffHarness.briefing.state_ref));
    });

    it('still applies the recovery same-sector guard after reaching the later target', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, null, 1_000);
        const recoveryGuard: CorpsOperation = {
            name: 'Existing recovery guard',
            type: 'sector_attack',
            phase: 'recovery',
            started_turn: 20,
            phase_started_turn: 29,
            sector_id: harness.primary.sector_id,
            objectives: ['op:test:unrelated'],
            participating_brigades: ['recovery-owner' as FormationId],
        };
        harness.briefing = { ...harness.briefing, active_operations: [recoveryGuard] };
        harness.state.military.corps_command![CORPS_ID]!.active_operations = [recoveryGuard];

        const result = emitClaimedObjectiveHarness(harness);
        const completion = result.commanderRows.at(-1);

        expect(result.localRows.filter((row) => row.phase === 'candidate')).toEqual(expect.arrayContaining([
            expect.objectContaining({
                target_osid: ADJACENCY_ONLY_TARGET,
                outcome: 'qualified',
            }),
        ]));
        expect(completion).toMatchObject({
            exit: 'reduction_overlap_suppressed',
            overlap_found: true,
            overlap_detail: {
                first_matched_clause: 'same_sector',
                conflicting_operation: { name: 'Existing recovery guard' },
            },
            returned: [],
        });
        expect(result.output.operations).toEqual([]);
    });

    it('continues to the later target when an executing operation claims the first target', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, 1_000, 1_000);
        addObjectiveClaimWithSecondSlot(harness);
        const topicOffHarness = makeOmittedTargetHarness();
        addPriorityTargets(topicOffHarness, 1_000, 1_000);
        addObjectiveClaimWithSecondSlot(topicOffHarness);

        const topicOff = emitClaimedObjectiveHarness(topicOffHarness, false);
        const result = emitClaimedObjectiveHarness(harness);
        const candidateRows = result.localRows.filter((row) => row.phase === 'candidate');
        const completion = result.commanderRows.at(-1);

        expect(result.output.operations).toHaveLength(1);
        expect(result.output.operations[0]).toMatchObject({
            objectives: [ADJACENCY_ONLY_TARGET],
            participating_brigades: ['b1'],
        });
        expect(candidateRows).toEqual(expect.arrayContaining([
            expect.objectContaining({
                target_osid: OMITTED_TARGET,
                outcome: 'rejected',
                first_failed_predicate: 'target_not_claimed_by_executing_operation',
            }),
            expect.objectContaining({
                target_osid: ADJACENCY_ONLY_TARGET,
                outcome: 'qualified',
            }),
        ]));
        expect(completion).toMatchObject({
            exit: 'reduction_created',
            overlap_found: false,
        });
        expect(result.output).toEqual(topicOff.output);
        expect(JSON.stringify(harness.briefing.state_ref)).toBe(JSON.stringify(topicOffHarness.briefing.state_ref));
    });

    it('continues from a claimed sector-listed group target to an adjacency-only group target', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, 40_000, 40_000);
        addObjectiveClaimWithSecondSlot(harness);

        const result = emitClaimedObjectiveHarness(harness);
        const candidateRows = result.localRows.filter((row) => row.phase === 'candidate');

        expect(result.output.operations[0]).toMatchObject({
            objectives: [ADJACENCY_ONLY_TARGET],
            participating_brigades: ['b1', 'b2', 'b3'],
        });
        expect(candidateRows).toEqual(expect.arrayContaining([
            expect.objectContaining({
                candidate_class: 'sector-listed_group',
                target_osid: OMITTED_TARGET,
                outcome: 'rejected',
                first_failed_predicate: 'target_not_claimed_by_executing_operation',
            }),
            expect.objectContaining({
                candidate_class: 'adjacency-only_group',
                target_osid: ADJACENCY_ONLY_TARGET,
                outcome: 'qualified',
            }),
        ]));
    });

    it('rejects every claimed local target without changing the class search order', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, 40_000, 40_000);
        addObjectiveClaimWithSecondSlot(harness, 'execution', [OMITTED_TARGET, ADJACENCY_ONLY_TARGET]);

        const result = emitClaimedObjectiveHarness(harness);
        const candidateRows = result.localRows.filter((row) => row.phase === 'candidate');
        const searchEnd = result.localRows.find((row) => row.phase === 'search_end');
        const completion = result.commanderRows.at(-1);

        expect(candidateRows).toEqual(expect.arrayContaining([
            expect.objectContaining({
                candidate_class: 'sector-listed_group',
                target_osid: OMITTED_TARGET,
                first_failed_predicate: 'target_not_claimed_by_executing_operation',
            }),
            expect.objectContaining({
                candidate_class: 'adjacency-only_group',
                target_osid: ADJACENCY_ONLY_TARGET,
                first_failed_predicate: 'target_not_claimed_by_executing_operation',
            }),
        ]));
        expect(searchEnd).toMatchObject({
            outcome: 'rejected',
            selected_class: null,
            selected_target_osid: null,
            class_outcomes: [
                { candidate_class: 'sector-listed_single', outcome: 'rejected' },
                { candidate_class: 'sector-listed_group', outcome: 'rejected' },
                { candidate_class: 'adjacency-only_single', outcome: 'rejected' },
                { candidate_class: 'adjacency-only_group', outcome: 'rejected' },
            ],
        });
        expect(completion).toMatchObject({
            exit: 'fallback_probe_created',
            overlap_found: false,
        });
        expect(result.output.operations).toHaveLength(1);
        expect(result.output.operations.every((operation) => (
            operation.objectives?.includes(OMITTED_TARGET) !== true
            && operation.objectives?.includes(ADJACENCY_ONLY_TARGET) !== true
        ))).toBe(true);
    });

    it.each(['planning', 'recovery'] as const)(
        'keeps a %s objective claim in candidate search and lets the downstream shared-objective guard block it',
        (phase) => {
            const harness = makeOmittedTargetHarness();
            addPriorityTargets(harness, 1_000, 1_000);
            addObjectiveClaimWithSecondSlot(harness, phase);

            const result = emitClaimedObjectiveHarness(harness);
            const completion = result.commanderRows.at(-1);

            expect(result.localRows.filter((row) => row.phase === 'candidate')).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    target_osid: OMITTED_TARGET,
                    outcome: 'qualified',
                    first_failed_predicate: null,
                }),
            ]));
            expect(completion).toMatchObject({
                exit: 'reduction_overlap_suppressed',
                overlap_found: true,
                overlap_detail: {
                    first_matched_clause: 'shared_objective',
                    conflicting_operation: {
                        name: 'Existing claimed objective',
                        objective_ids: [OMITTED_TARGET],
                    },
                },
            });
            expect(result.output.operations).toEqual([]);
        },
    );

    it('prefers a qualifying sector-listed group over a qualifying adjacency-only single', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, 40_000, 1_000);

        expect(emitOmittedTargetHarness(harness).operations[0]).toMatchObject({
            objectives: [OMITTED_TARGET],
            participating_brigades: ['b1', 'b2', 'b3'],
        });
    });

    it('prefers a qualifying sector-listed single over an adjacency-only group', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, 1_000, 40_000);

        expect(emitOmittedTargetHarness(harness).operations[0]).toMatchObject({
            objectives: [OMITTED_TARGET],
            participating_brigades: ['b1'],
        });
    });

    it('uses an adjacency-only single after all sector-listed candidates reject', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, null, 1_000);

        expect(emitOmittedTargetHarness(harness).operations[0]).toMatchObject({
            objectives: [ADJACENCY_ONLY_TARGET],
            participating_brigades: ['b1'],
        });
    });

    it('uses an adjacency-only group after listed candidates reject and no single is strong enough', () => {
        const harness = makeOmittedTargetHarness();
        addPriorityTargets(harness, null, 40_000);

        expect(emitOmittedTargetHarness(harness).operations[0]).toMatchObject({
            objectives: [ADJACENCY_ONLY_TARGET],
            participating_brigades: ['b1', 'b2', 'b3'],
        });
    });

    it('keeps listed-target priority and output deterministic under duplicated adjacency and permuted inputs', () => {
        const baseline = makeOmittedTargetHarness();
        addPriorityTargets(baseline, 40_000, 1_000);
        const permuted = makeOmittedTargetHarness();
        addPriorityTargets(permuted, 40_000, 1_000);
        (permuted.briefing as any).brigades = [...permuted.briefing.brigades].reverse();
        (permuted.briefing as any).sectors = [...permuted.briefing.sectors].reverse();
        permuted.allocation.surplus_pool.reverse();
        for (const neighbours of permuted.briefing.spatial.adjacency.values()) {
            (neighbours as string[]).reverse();
        }

        expect(JSON.stringify(emitOmittedTargetHarness(permuted).operations))
            .toBe(JSON.stringify(emitOmittedTargetHarness(baseline).operations));
        expect(emitOmittedTargetHarness(permuted).operations[0]?.objectives)
            .toEqual([OMITTED_TARGET]);
    });

    it('admits a bounded adjacent target omitted from the associated sector enemy list', () => {
        const output = emitOmittedTargetHarness(makeOmittedTargetHarness());
        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: [OMITTED_TARGET],
            participating_brigades: ['b1', 'b2', 'b3'],
        });
    });

    it('retains the Graz block for an otherwise qualifying local occupation target', () => {
        const harness = makeOmittedTargetHarness();
        harness.state.political.political_controllers![OMITTED_TARGET] = 'HRHB';
        harness.state.political.vienna_declaration_turn = 4;
        harness.state.political.vienna_accepted = { RS: true, HRHB: true } as Record<FactionId, boolean>;
        harness.state.political.vienna_herzegovina_broken_by = undefined;
        const friendly = harness.briefing.spatial.friendlyOsidsByFaction as Map<FactionId, ReadonlySet<string>>;
        friendly.set('RBiH', new Set(['op:test:other-target', ...Array.from({ length: 6 }, (_, index) => `op:test:other-depth:${index}`)]));
        friendly.set('HRHB', new Set([OMITTED_TARGET]));

        const output = emitOmittedTargetHarness(harness);
        expect(output.operations.every(
            (operation) => operation.objectives?.includes(OMITTED_TARGET) !== true,
        )).toBe(true);
    });

    const omittedTargetNegativeCases: Array<[
        string,
        (harness: OmittedTargetHarness) => void,
    ]> = [
        ['no primary-sector association', (harness) => {
            harness.primary.assigned_brigade_ids = [];
            harness.primary.territory_osids = [];
            harness.primary.sub_segments = harness.primary.sub_segments.map((subSegment) => ({
                ...subSegment,
                friendly_osids: [],
                primary_brigade_ids: [],
            }));
        }],
        ['wrong corps association', (harness) => {
            replaceHarnessBrigades(harness, (brigade) => ({
                ...brigade,
                corps_id: 'vrs_other_corps' as FormationId,
            }));
        }],
        ['no target adjacency', (harness) => {
            const adjacency = new Map<string, readonly string[]>(([
                [OMITTED_APPROACH, []],
                [OMITTED_TARGET, []],
            ]));
            harness.briefing = {
                ...harness.briefing,
                spatial: {
                    ...harness.briefing.spatial,
                    adjacency,
                    sharedBoundaryAdjacency: adjacency,
                } as SpatialContext,
            };
        }],
        ['reachable organized defender', (harness) => {
            const defender = makeBrigade('enemy', OMITTED_TARGET, {
                faction: 'RBiH' as FactionId,
                corps_id: 'arbih_test_corps' as FormationId,
                personnel: 1_200,
            });
            harness.state.military.formations = {
                ...harness.state.military.formations,
                [defender.id]: defender,
            };
        }],
        ['unbounded enemy component', (harness) => {
            const depth = Array.from({ length: 6 }, (_, index) => `op:test:depth:${index}`);
            const adjacency = new Map(harness.briefing.spatial.adjacency);
            adjacency.set(OMITTED_TARGET, [OMITTED_APPROACH, ...depth]);
            for (const osid of depth) {
                adjacency.set(osid, [OMITTED_TARGET]);
                harness.state.political.political_controllers![osid] = 'RBiH';
            }
            harness.briefing = {
                ...harness.briefing,
                spatial: {
                    ...harness.briefing.spatial,
                    adjacency,
                    sharedBoundaryAdjacency: adjacency,
                } as SpatialContext,
            };
        }],
        ['excessive population', (harness) => {
            harness.briefing.osid_population_map!.set(OMITTED_TARGET, 100_000);
        }],
        ['missing population', (harness) => {
            harness.briefing.osid_population_map!.delete(OMITTED_TARGET);
        }],
        ['disrupted candidates', (harness) => {
            replaceHarnessBrigades(harness, (brigade) => ({ ...brigade, disrupted_turns: 1 }));
        }],
        ['in-transit candidates', (harness) => {
            harness.state.military.brigade_movement_state = Object.fromEntries(
                harness.briefing.brigades.map((brigade) => [brigade.id, { status: 'in_transit' }]),
            ) as any;
        }],
        ['understrength candidates', (harness) => {
            replaceHarnessBrigades(harness, (brigade) => ({ ...brigade, personnel: 100 }));
        }],
        ['active-operation commitment', (harness) => {
            const recovery = {
                name: 'existing recovery',
                type: 'sector_attack',
                phase: 'recovery',
                started_turn: 29,
                phase_started_turn: 29,
                participating_brigades: ['b1', 'b2', 'b3'],
            } as any;
            harness.briefing = { ...harness.briefing, active_operations: [recovery] };
        }],
        ['front-staffing floor', (harness) => {
            const b3 = harness.briefing.brigades.find((brigade) => brigade.id === 'b3')!;
            b3.location_osid = 'op:test:donor';
            harness.primary.assigned_brigade_ids = ['b1', 'b2'] as FormationId[];
            harness.primary.sub_segments = harness.primary.sub_segments.map((subSegment) => ({
                ...subSegment,
                primary_brigade_ids: ['b1', 'b2'] as FormationId[],
            }));
            const donor = {
                ...makeSector(),
                sector_id: `sector:${CORPS_ID}:1`,
                territory_osids: ['op:test:donor'],
                assigned_brigade_ids: ['b3'] as FormationId[],
                sub_segments: [],
                length_edges: 3,
            } as CorpsFrontSector;
            harness.briefing = { ...harness.briefing, sectors: [harness.primary, donor] };
            harness.state.military.corps_front_sectors = {
                [harness.primary.sector_id]: harness.primary,
                [donor.sector_id]: donor,
            };
            const adjacency = new Map(harness.briefing.spatial.adjacency);
            adjacency.set(OMITTED_APPROACH, [OMITTED_TARGET, 'op:test:donor']);
            adjacency.set('op:test:donor', [OMITTED_APPROACH]);
            harness.briefing = {
                ...harness.briefing,
                spatial: {
                    ...harness.briefing.spatial,
                    adjacency,
                    sharedBoundaryAdjacency: adjacency,
                } as SpatialContext,
            };
            harness.state.political.political_controllers!['op:test:donor'] = FACTION;
        }],
        ['enclave candidates', (harness) => {
            replaceHarnessBrigades(harness, (brigade) => ({ ...brigade, tags: ['enclave'] }));
        }],
        ['loaned candidates', (harness) => {
            replaceHarnessBrigades(harness, (brigade) => ({
                ...brigade,
                elite_loan_state: { on_loan: true } as any,
            }));
        }],
        ['player autonomy', (harness) => {
            harness.state.meta.autonomy_level = 1;
        }],
        ['friendly controller', (harness) => {
            harness.state.political.political_controllers![OMITTED_TARGET] = FACTION;
        }],
    ];

    it.each(omittedTargetNegativeCases)('rejects omitted-target discovery with %s', (_name, mutate) => {
        const harness = makeOmittedTargetHarness();
        mutate(harness);
        const output = emitOmittedTargetHarness(harness);
        expect(output.operations.every(
            (operation) => operation.objectives?.includes(OMITTED_TARGET) !== true,
        )).toBe(true);
    });
    it.each([
        { confidence: 0.25, expectedType: 'sector_attack' },
        { confidence: 0, expectedType: 'probe' },
    ] as const)('keeps a t154 Mistral 1 reservation out of a generic $expectedType roster', ({ confidence, expectedType }) => {
        const reservedId = 'hv_4th_guards_split';
        const lineIds = ['z_line_1', 'z_line_2'];
        const brigadeIds = [reservedId, ...lineIds];
        const brigades = brigadeIds.map((id) => makeBrigade(id, 'op:test:approach'));
        const baseBriefing = makeIntelBriefing([confidence], {
            turn: 154,
            consecutiveProbes: expectedType === 'sector_attack' ? 2 : 0,
        });
        const briefing = {
            ...baseBriefing,
            brigades,
            sectors: [{
                ...makeSector(),
                assigned_brigade_ids: brigadeIds as FormationId[],
                sub_segments: [{
                    ...makeSector().sub_segments[0]!,
                    primary_brigade_ids: brigadeIds as FormationId[],
                }],
            }],
        } as CommanderBriefing;
        briefing.state_ref!.meta.turn = 154;
        briefing.state_ref!.military.corps_command![CORPS_ID]!.subordinate_count = brigadeIds.length;
        const allocation: AllocationResult = {
            ...makeAllocation(),
            surplus_pool: brigadeIds.map(makeEval),
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            allocation,
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]?.type).toBe(expectedType);
        expect(output.operations[0]?.participating_brigades).not.toContain(reservedId);
        expect(output.operations[0]?.participating_brigades.length).toBeGreaterThan(0);
    });

    it('emits a bilateral operation from plan-reserved brigades even when the new allocation garrison-locks them', () => {
        const briefing = { ...makeBriefing(), bilateral_offensive: true } as CommanderBriefing;
        const planDecision = makePlanDecision();
        planDecision.plan = {
            ...planDecision.plan!,
            assigned_brigades: ['b1', 'b2'] as FormationId[],
            bilateral_offensive: true,
        } as any;
        const allocation: AllocationResult = {
            ...makeAllocation(),
            surplus_pool: [],
            garrison_locks: [
                { brigade_id: 'b1' as FormationId, zone_id: 'zone:test:0' as ZoneId },
                { brigade_id: 'b2' as FormationId, zone_id: 'zone:test:0' as ZoneId },
            ] as any,
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            allocation,
            planDecision,
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            participating_brigades: ['b1', 'b2'],
        });
    });

    it('emits a bilateral operation when its reserved group is elsewhere in the same corps zone', () => {
        const targetSector = {
            ...makeSector(),
            assigned_brigade_ids: ['b3'] as FormationId[],
            reserve_brigade_ids: [],
            sub_segments: [{
                ...makeSector().sub_segments[0]!,
                primary_brigade_ids: ['b3'] as FormationId[],
            }],
        } as CorpsFrontSector;
        const briefing = {
            ...makeBriefing([], [
                makeBrigade('b1', 'op:test:approach'),
                makeBrigade('b2', 'op:test:approach'),
                makeBrigade('b3', 'op:test:approach'),
            ]),
            bilateral_offensive: true,
            sectors: [targetSector],
        } as CommanderBriefing;
        const planDecision = makePlanDecision();
        planDecision.plan = {
            ...planDecision.plan!,
            assigned_brigades: ['b1', 'b2'] as FormationId[],
            bilateral_offensive: true,
        } as any;
        const allocation: AllocationResult = {
            ...makeAllocation(),
            surplus_pool: [],
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            allocation,
            planDecision,
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]?.participating_brigades).toEqual(['b1', 'b2']);
    });

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

    it('downgrades a ready full operation to a sector-scoped probe when the stalest intel is below threshold', () => {
        const briefing = makeIntelBriefing([0.8, 0.24]);

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]).toMatchObject({
            type: 'probe',
            sector_id: `sector:${CORPS_ID}:0`,
            objectives: ['op:test:objective'],
            planning_duration: 1,
            min_attack_outcome: 'repulsed',
        });
        expect(output.operations[0]!.participating_brigades.length).toBeGreaterThan(0);
        expect(output.operations[0]!.participating_brigades.length).toBeLessThanOrEqual(2);
    });

    it('launches the full operation at the exact canonical RS threshold', () => {
        const briefing = makeIntelBriefing([0.25]);

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.type).toBe('sector_attack');
    });

    it('honors the active doctrine probe exemption supplied by the scenario timeline', () => {
        const briefing = makeIntelBriefing([0], { probeExempt: true });

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.type).toBe('sector_attack');
    });

    it('commits the designated ARBiH bilateral attacker despite low intel', () => {
        const briefing = {
            ...makeIntelBriefing([0]),
            bilateral_offensive: true,
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.type).toBe('sector_attack');
    });

    it('forces a full commitment after two accepted probes', () => {
        const briefing = makeIntelBriefing([0], { consecutiveProbes: 2 });

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.type).toBe('sector_attack');
    });

    it('escalates fallback probing into an occupying operation against a bounded isolated position', () => {
        const briefing = makeBriefing();
        briefing.state_ref!.political.political_controllers = {
            'op:test:approach': FACTION,
            'op:test:objective': 'RBiH',
        } as any;
        briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
        const noPlan: PlanDecision = {
            plan: null,
            action: 'none',
            reason: 'no major plan',
            decision_trace: {
                turn: briefing.turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: [],
                lessons_applied: [],
                relationships_applied: [],
            },
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            noPlan,
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'b2'],
            minimum_viable_participants: 2,
            minimum_assembled_participants: 2,
            planning_duration: 3,
        });
        expect(output.operations[0]?.preparation_sub_phase).toBeUndefined();

        const operation = output.operations[0]!;
        briefing.state_ref!.military.formations = Object.fromEntries(
            briefing.brigades.map((brigade) => [brigade.id, brigade]),
        );
        briefing.state_ref!.military.war_front_edges_osid = [{
            a: 'op:test:approach',
            b: 'op:test:objective',
        } as any];
        expect(evaluateOpeningAttackReadiness(
            briefing.state_ref!,
            CORPS_ID,
            FACTION,
            operation,
        ).executable).toBe(true);

        briefing.state_ref!.military.formations.b2!.disrupted_turns = 1;
        expect(evaluateOpeningAttackReadiness(
            briefing.state_ref!,
            CORPS_ID,
            FACTION,
            operation,
        )).toEqual({
            executable: false,
            blocker: 'participants_below_assembly_floor',
        });
    });

    it('P-A: does not create an operation whose only second brigade cannot reach assembly in time', () => {
        // b1 is at the objective's approach (staged). b2 is 8 friendly hops away — WITHIN the
        // existing MAX_REACHABILITY_HOPS=8 reachability check, so the pre-P-A creator admitted
        // it — but 8 terrain-weighted edges at the RS column rate of 2 need 4 transit turns,
        // while this plan-driven op provides only planning_duration 1 + grace 2 = 3. P-A drops
        // b2; one brigade is below the two-brigade anchor minimum, so no operation is created.
        // The minimum is NOT lowered and no participant is manufactured.
        const farIds = Array.from({ length: 8 }, (_, i) => `op:test:far${i}`);
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:far7']],
            ['op:test:objective', ['op:test:approach']],
        ]);
        for (let i = 0; i < farIds.length; i += 1) {
            const cur = farIds[i]!;
            const next = i === farIds.length - 1 ? 'op:test:approach' : farIds[i + 1]!;
            const prev = i === 0 ? null : farIds[i - 1]!;
            adjacency.set(cur, prev ? [prev, next] : [next]);
        }
        const friendlyCells = new Set(['op:test:approach', ...farIds]);
        const briefing: CommanderBriefing = {
            ...makeBriefing([], [
                makeBrigade('b1', 'op:test:approach'),
                makeBrigade('b2', 'op:test:far0'),
            ]),
            spatial: {
                ...makeSpatial(),
                adjacency,
                sharedBoundaryAdjacency: adjacency,
                friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
                    [FACTION, friendlyCells],
                    ['RBiH' as FactionId, new Set(['op:test:objective'])],
                    ['HRHB' as FactionId, new Set()],
                ]),
            } as SpatialContext,
            reverse_map: new Map() as any,
        };
        const state = briefing.state_ref!;
        state.military.formations = Object.fromEntries(
            briefing.brigades.map((brigade) => [brigade.id, brigade]),
        );
        state.military.war_front_edges_osid = [{
            a: 'op:test:approach',
            b: 'op:test:objective',
        } as any];
        state.political.political_controllers = {
            ['op:test:approach']: FACTION,
            ['op:test:objective']: 'RBiH',
            ...Object.fromEntries(farIds.map((id) => [id, FACTION])),
        } as any;

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

    it('concentrates a third available brigade against a bounded position without raising the two-brigade formation minimum', () => {
        const baseBriefing = makeBriefing([], [
            makeBrigade('b1', 'op:test:approach'),
            makeBrigade('b2', 'op:test:approach'),
            makeBrigade('a0', 'op:test:donor'),
            makeBrigade('b3', 'op:test:donor', { posture: 'dig_in', dig_in_progress: 1 }),
            makeBrigade('b5', 'op:test:sole'),
            makeBrigade('b6', 'op:test:long'),
            makeBrigade('b7', 'op:test:long'),
            makeBrigade('b8', 'op:test:long'),
        ]);
        const donorSector = {
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:1`,
            edge_ids: ['e2', 'e3', 'e4', 'e5'],
            length_edges: 4,
            territory_osids: ['op:test:donor'],
            assigned_brigade_ids: ['a0', 'b3'] as FormationId[],
            sub_segments: [],
        } as CorpsFrontSector;
        const soleSector = {
            ...donorSector,
            sector_id: `sector:${CORPS_ID}:2`,
            edge_ids: ['e6', 'e7', 'e8'],
            length_edges: 3,
            territory_osids: ['op:test:sole'],
            assigned_brigade_ids: ['b5'] as FormationId[],
        } as CorpsFrontSector;
        const longSector = {
            ...donorSector,
            sector_id: `sector:${CORPS_ID}:3`,
            edge_ids: Array.from({ length: 16 }, (_, index) => `long-${index}`),
            length_edges: 16,
            territory_osids: ['op:test:long'],
            assigned_brigade_ids: ['b6', 'b7', 'b8'] as FormationId[],
        } as CorpsFrontSector;
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:donor', 'op:test:sole', 'op:test:long']],
            ['op:test:donor', ['op:test:approach']],
            ['op:test:sole', ['op:test:approach']],
            ['op:test:long', ['op:test:approach']],
            ['op:test:objective', ['op:test:approach']],
        ]);
        const briefing: CommanderBriefing = {
            ...baseBriefing,
            sectors: [makeSector(), donorSector, soleSector, longSector],
            spatial: {
                ...makeSpatial(),
                adjacency,
                sharedBoundaryAdjacency: adjacency,
                friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
                    [FACTION, new Set(['op:test:approach', 'op:test:donor', 'op:test:sole', 'op:test:long'])],
                    ['RBiH' as FactionId, new Set(['op:test:objective'])],
                    ['HRHB' as FactionId, new Set()],
                ]),
            } as SpatialContext,
        };
        briefing.state_ref!.political.political_controllers = {
            'op:test:approach': FACTION,
            'op:test:objective': 'RBiH',
        } as any;
        briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
        const noPlan: PlanDecision = {
            plan: null,
            action: 'none',
            reason: 'no major plan',
            decision_trace: {
                turn: briefing.turn,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: [],
                lessons_applied: [],
                relationships_applied: [],
            },
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            {
                ...makeAllocation(),
                surplus_pool: [makeEval('b1'), makeEval('b2'), makeEval('b3')],
            },
            noPlan,
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            participating_brigades: ['b1', 'b2', 'b3'],
            minimum_viable_participants: 3,
            minimum_assembled_participants: 3,
            min_attack_outcome: 'stalemate',
            supporting_sector_ids: [`sector:${CORPS_ID}:1`],
            primary_sector_brigades: ['b1', 'b2'],
            attached_brigades: ['b3'],
            reinforcement_source: 'adjacent_sector',
        });
        expect(output.operations[0]?.axes?.[0]?.minimum_staged_brigades).toBe(3);
    });

    it('prefers a bounded position that only the lawful projected concentration can reduce over a fitter generic probe', () => {
        const brigades = [
            makeBrigade('b1', 'op:test:approach', { personnel: 500 }),
            makeBrigade('b2', 'op:test:approach', { personnel: 500 }),
            makeBrigade('line', 'op:test:donor'),
            makeBrigade('line2', 'op:test:donor'),
            makeBrigade('line3', 'op:test:donor'),
            makeBrigade('b3', 'op:test:donor', { personnel: 500 }),
            makeBrigade('probe', 'op:test:other-approach', { personnel: 1600 }),
        ];
        const primary = makeSector();
        const donor = {
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:1`,
            edge_ids: ['donor-edge'],
            length_edges: 4,
            territory_osids: ['op:test:donor'],
            assigned_brigade_ids: ['line', 'line2', 'line3', 'b3'] as FormationId[],
            reserve_brigade_ids: [],
            sub_segments: [],
        } as CorpsFrontSector;
        const probeSector = {
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:2`,
            edge_ids: ['probe-edge'],
            territory_osids: ['op:test:other-approach'],
            assigned_brigade_ids: ['probe'] as FormationId[],
            reserve_brigade_ids: [],
            sub_segments: [{
                ...makeSector().sub_segments[0]!,
                sub_segment_id: `subseg:${CORPS_ID}:2`,
                edge_ids: ['probe-edge'],
                friendly_osids: ['op:test:other-approach'],
                enemy_osids: ['op:test:other-target'],
                primary_brigade_ids: ['probe'] as FormationId[],
            }],
        } as CorpsFrontSector;
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:donor']],
            ['op:test:donor', ['op:test:approach']],
            ['op:test:objective', ['op:test:approach']],
            ['op:test:other-approach', ['op:test:other-target']],
            ['op:test:other-target', [
                'op:test:other-approach',
                'op:test:enemy-depth-1',
                'op:test:enemy-depth-2',
                'op:test:enemy-depth-3',
                'op:test:enemy-depth-4',
                'op:test:enemy-depth-5',
                'op:test:enemy-depth-6',
            ]],
            ...Array.from({ length: 6 }, (_, index) => [
                `op:test:enemy-depth-${index + 1}`,
                ['op:test:other-target'],
            ] as const),
        ]);
        const base = makeBriefing([], brigades);
        const state = {
            ...base.state_ref!,
            military: {
                ...base.state_ref!.military,
                formations: Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade])),
                corps_front_sectors: Object.fromEntries(
                    [primary, donor, probeSector].map((sector) => [sector.sector_id, sector]),
                ),
            },
            political: {
                ...base.state_ref!.political,
                political_controllers: {
                    'op:test:approach': FACTION,
                    'op:test:donor': FACTION,
                    'op:test:other-approach': FACTION,
                    'op:test:objective': 'RBiH',
                    'op:test:other-target': 'RBiH',
                    ...Object.fromEntries(
                        Array.from({ length: 6 }, (_, index) => [`op:test:enemy-depth-${index + 1}`, 'RBiH']),
                    ),
                },
            },
        } as GameState;
        state.meta.turn = 30;
        state.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
        const briefing: CommanderBriefing = {
            ...base,
            turn: 30,
            state_ref: state,
            sectors: [primary, donor, probeSector],
            reverse_map: new Map<string, string[]>([
                ['op:test:approach', ['S1']],
                ['op:test:donor', ['S2']],
                ['op:test:objective', ['S3']],
                ['op:test:other-approach', ['S4']],
                ['op:test:other-target', ['S5']],
                ...Array.from({ length: 6 }, (_, index): [string, string[]] => [
                    `op:test:enemy-depth-${index + 1}`,
                    [`S${index + 6}`],
                ]),
            ]),
            osid_population_map: new Map([
                ['op:test:objective', 40_000],
                ['op:test:other-target', 10_000],
            ]),
            spatial: {
                ...makeSpatial(),
                adjacency,
                sharedBoundaryAdjacency: adjacency,
                friendlyOsidsByFaction: new Map([
                    [FACTION, new Set(['op:test:approach', 'op:test:donor', 'op:test:other-approach'])],
                    ['RBiH' as FactionId, new Set([
                        'op:test:objective',
                        'op:test:other-target',
                        ...Array.from({ length: 6 }, (_, index) => `op:test:enemy-depth-${index + 1}`),
                    ])],
                    ['HRHB' as FactionId, new Set()],
                ]),
            } as SpatialContext,
        };
        const allocation = {
            ...makeAllocation(),
            surplus_pool: [
                { ...makeEval('probe'), fitness_offense: 0.99 },
                makeEval('b1'),
                makeEval('b2'),
                makeEval('b3'),
            ],
        };
        const sourceLocations = Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade.location_osid]));
        const projectedState = {
            ...state,
            military: {
                ...state.military,
                formations: {
                    ...state.military.formations,
                    b3: { ...state.military.formations!.b3!, location_osid: 'op:test:approach' },
                },
            },
        } as GameState;
        const predict = (attacker: FormationId, support: FormationId[] = []) => predictCombatOutcome(
            projectedState,
            attacker,
            'op:test:objective',
            adjacency as Map<any, any>,
            briefing.reverse_map!,
            {},
            'attack',
            support,
            undefined,
            briefing.osid_population_map,
        );
        const soloOne = predict('b1' as FormationId);
        const soloTwo = predict('b2' as FormationId);
        const localPair = predict('b1' as FormationId, ['b2'] as FormationId[]);
        const combined = predict('b1' as FormationId, ['b2', 'b3'] as FormationId[]);
        expect(isOutcomeSufficientForAttack(soloOne!.predicted_outcome, 'costly_victory')).toBe(false);
        expect(isOutcomeSufficientForAttack(soloTwo!.predicted_outcome, 'costly_victory')).toBe(false);
        expect(combined!.predicted_outcome).toBe('stalemate');
        expect(isOutcomeSufficientForAttack(combined!.predicted_outcome, 'stalemate')).toBe(true);
        expect(isOutcomeSufficientForAttack(combined!.predicted_outcome, 'costly_victory')).toBe(false);
        expect(localPair!.predicted_outcome).toBe('repulsed');
        expect(isOutcomeSufficientForAttack(localPair!.predicted_outcome, 'costly_victory')).toBe(false);

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            allocation,
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'b2', 'b3'],
            attached_brigades: ['b3'],
            reinforcement_source: 'adjacent_sector',
        });
        expect(Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade.location_osid])))
            .toEqual(sourceLocations);

        const repulsedOutput = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            {
                ...makeAllocation(),
                surplus_pool: [
                    { ...makeEval('probe'), fitness_offense: 0.99 },
                    makeEval('b1'),
                    makeEval('b2'),
                ],
            },
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );
        expect(repulsedOutput.operations.every(
            (candidate) => candidate.objectives?.includes('op:test:objective') !== true,
        )).toBe(true);

        const soloBrigades = brigades.map((brigade) => brigade.id === 'b1'
            ? { ...brigade, personnel: 1_200 }
            : brigade);
        const soloPrimary = {
            ...primary,
            assigned_brigade_ids: ['b1'] as FormationId[],
            sub_segments: primary.sub_segments.map((subSegment) => ({
                ...subSegment,
                primary_brigade_ids: ['b1'] as FormationId[],
            })),
        } as CorpsFrontSector;
        const soloState = {
            ...state,
            military: {
                ...state.military,
                formations: Object.fromEntries(soloBrigades.map((brigade) => [brigade.id, brigade])),
                corps_front_sectors: Object.fromEntries(
                    [soloPrimary, donor, probeSector].map((sector) => [sector.sector_id, sector]),
                ),
            },
        } as GameState;
        const soloPrediction = predictCombatOutcome(
            soloState,
            'b1' as FormationId,
            'op:test:objective',
            adjacency as Map<any, any>,
            briefing.reverse_map!,
            {},
            'attack',
            undefined,
            undefined,
            briefing.osid_population_map,
        );
        expect(soloPrediction!.predicted_outcome).toBe('stalemate');
        const soloOutput = emitCommanderOutput(
            {
                ...briefing,
                brigades: soloBrigades,
                sectors: [soloPrimary, donor, probeSector],
                state_ref: soloState,
            },
            [],
            makeForces(),
            {
                ...makeAllocation(),
                surplus_pool: [
                    { ...makeEval('probe'), fitness_offense: 0.99 },
                    makeEval('b1'),
                ],
            },
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );
        expect(soloOutput.operations.every(
            (candidate) => candidate.objectives?.includes('op:test:objective') !== true,
        )).toBe(true);

        const operation = output.operations[0]!;
        const marchingState = {
            ...state,
            military: {
                ...state.military,
                war_front_edges_osid: [{ a: 'op:test:approach', b: 'op:test:objective' } as any],
                brigade_movement_state: {
                    b3: {
                        status: 'in_transit',
                        stance: 'column',
                        destination_sids: ['op:test:approach'],
                        turns_remaining: 1,
                    },
                },
            },
        } as GameState;
        expect(evaluateOpeningAttackReadiness(
            marchingState,
            CORPS_ID,
            FACTION,
            operation,
            undefined,
            {
                adjacency: adjacency as Map<any, any>,
                reverseMap: briefing.reverse_map!,
                terrainMultByOsid: {},
                osidPopulationMap: briefing.osid_population_map,
            },
        )).toEqual({
            executable: false,
            blocker: 'participants_below_assembly_floor',
        });
        const arrivedState = {
            ...projectedState,
            military: {
                ...projectedState.military,
                war_front_edges_osid: [{ a: 'op:test:approach', b: 'op:test:objective' } as any],
            },
        } as GameState;
        expect(evaluateOpeningAttackReadiness(
            arrivedState,
            CORPS_ID,
            FACTION,
            operation,
            undefined,
            {
                adjacency: adjacency as Map<any, any>,
                reverseMap: briefing.reverse_map!,
                terrainMultByOsid: {},
                osidPopulationMap: briefing.osid_population_map,
            },
        )).toEqual({ executable: true });

        const doesNotSelectBoundedTarget = (candidateBriefing: CommanderBriefing = briefing) => {
            const guarded = emitCommanderOutput(
                candidateBriefing,
                [],
                makeForces(),
                allocation,
                { ...makePlanDecision(), plan: null, action: 'none' },
                makeDecisions(),
                makeThreats(),
            );
            expect(guarded.operations.every(
                (candidate) => candidate.objectives?.includes('op:test:objective') !== true,
            )).toBe(true);
        };

        briefing.osid_population_map!.set('op:test:objective', 100_000);
        doesNotSelectBoundedTarget();
        briefing.osid_population_map!.set('op:test:objective', 40_000);

        const guardedBrigadeBriefing = (overrides: Partial<FormationState>): CommanderBriefing => {
            const guardedBrigades = brigades.map((brigade) => brigade.id === 'b3' ? { ...brigade, ...overrides } : brigade);
            return {
                ...briefing,
                brigades: guardedBrigades,
                state_ref: {
                    ...state,
                    military: {
                        ...state.military,
                        formations: Object.fromEntries(guardedBrigades.map((brigade) => [brigade.id, brigade])),
                    },
                },
            } as CommanderBriefing;
        };
        doesNotSelectBoundedTarget(guardedBrigadeBriefing({ elite_loan_state: { on_loan: true } as any }));
        doesNotSelectBoundedTarget(guardedBrigadeBriefing({ tags: ['enclave'] }));

        doesNotSelectBoundedTarget({
            ...briefing,
            state_ref: { ...state, meta: { ...state.meta, autonomy_level: 1 } },
        } as CommanderBriefing);

        doesNotSelectBoundedTarget({
            ...briefing,
            state_ref: {
                ...state,
                political: {
                    ...state.political,
                    political_controllers: {
                        ...state.political.political_controllers,
                        'op:test:objective': FACTION,
                    },
                },
            },
        } as CommanderBriefing);

        const lowIntelPreparation = emitCommanderOutput({
            ...briefing,
            state_ref: {
                ...state,
                military: {
                    ...state.military,
                    corps_command: {
                        ...state.military.corps_command,
                        [CORPS_ID]: {
                            ...state.military.corps_command![CORPS_ID]!,
                            consecutive_probes: 0,
                        },
                    },
                    sector_intel: {
                        [primary.sector_id]: [{
                            enemy_sector_id: 'sector:enemy:test',
                            confidence: 0,
                            last_updated_turn: 30,
                            sources: ['passive_contact'],
                        }],
                    } as any,
                },
            },
        } as CommanderBriefing, [], makeForces(), allocation, {
            ...makePlanDecision(),
            plan: null,
            action: 'none',
        }, makeDecisions(), makeThreats());
        expect(lowIntelPreparation.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'b2', 'b3'],
            planning_duration: 3,
        });
        expect(lowIntelPreparation.operations[0]?.preparation_sub_phase).toBeUndefined();
    });

    it('uses an already-staged primary garrison brigade without pulling a travelling donor', () => {
        const brigades = [
            makeBrigade('b1', 'op:test:approach', { personnel: 500 }),
            makeBrigade('garrison', 'op:test:approach', { personnel: 1_200 }),
            makeBrigade('line', 'op:test:donor'),
            makeBrigade('line2', 'op:test:donor'),
            makeBrigade('line3', 'op:test:donor'),
            makeBrigade('b3', 'op:test:donor', { personnel: 1_200 }),
        ];
        const primary = {
            ...makeSector(),
            assigned_brigade_ids: ['b1', 'garrison'] as FormationId[],
            sub_segments: makeSector().sub_segments.map((subSegment) => ({
                ...subSegment,
                primary_brigade_ids: ['b1', 'garrison'] as FormationId[],
            })),
        } as CorpsFrontSector;
        const donor = {
            ...makeSector(),
            sector_id: `sector:${CORPS_ID}:1`,
            edge_ids: ['donor-edge'],
            length_edges: 4,
            territory_osids: ['op:test:donor'],
            assigned_brigade_ids: ['line', 'line2', 'line3', 'b3'] as FormationId[],
            reserve_brigade_ids: [],
            sub_segments: [],
        } as CorpsFrontSector;
        const adjacency = new Map<string, readonly string[]>([
            ['op:test:approach', ['op:test:objective', 'op:test:donor']],
            ['op:test:donor', ['op:test:approach']],
            ['op:test:objective', ['op:test:approach']],
        ]);
        const base = makeBriefing([], brigades);
        const state = {
            ...base.state_ref!,
            military: {
                ...base.state_ref!.military,
                formations: Object.fromEntries(brigades.map((brigade) => [brigade.id, brigade])),
                corps_front_sectors: Object.fromEntries(
                    [primary, donor].map((sector) => [sector.sector_id, sector]),
                ),
                war_front_edges_osid: [{ a: 'op:test:approach', b: 'op:test:objective' } as any],
            },
            political: {
                ...base.state_ref!.political,
                political_controllers: {
                    'op:test:approach': FACTION,
                    'op:test:donor': FACTION,
                    'op:test:objective': 'RBiH',
                },
            },
        } as GameState;
        state.meta.turn = 30;
        state.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
        const briefing: CommanderBriefing = {
            ...base,
            turn: 30,
            state_ref: state,
            sectors: [primary, donor],
            reverse_map: new Map<string, string[]>([
                ['op:test:approach', ['S1']],
                ['op:test:donor', ['S2']],
                ['op:test:objective', ['S3']],
            ]),
            osid_population_map: new Map([['op:test:objective', 40_000]]),
            spatial: {
                ...makeSpatial(),
                adjacency,
                sharedBoundaryAdjacency: adjacency,
                friendlyOsidsByFaction: new Map([
                    [FACTION, new Set(['op:test:approach', 'op:test:donor'])],
                    ['RBiH' as FactionId, new Set(['op:test:objective'])],
                    ['HRHB' as FactionId, new Set()],
                ]),
            } as SpatialContext,
        };
        const allocation: AllocationResult = {
            ...makeAllocation(),
            garrison_locks: [{
                brigade_id: 'garrison' as FormationId,
                zone_id: 'zone:test:0' as ZoneId,
                reason: 'projecting garrison',
            }],
            surplus_pool: [makeEval('b1'), makeEval('b3')],
        };

        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            allocation,
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );

        expect(output.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'garrison'],
            primary_sector_brigades: ['b1', 'garrison'],
            minimum_viable_participants: 2,
            minimum_assembled_participants: 2,
        });
        expect(output.operations[0]?.attached_brigades).toBeUndefined();
        expect(state.military.brigade_movement_orders?.garrison).toBeUndefined();
        expect(state.military.formations!.garrison!.location_osid).toBe('op:test:approach');

        const emitVariant = ({
            garrisonOverrides = {},
            garrisonId = 'garrison' as FormationId,
            candidateTurn = 30,
            primaryOverride = primary,
            activeOperations = [],
            movementState,
            candidateAllocation = allocation,
        }: {
            garrisonOverrides?: Partial<FormationState>;
            garrisonId?: FormationId;
            candidateTurn?: number;
            primaryOverride?: CorpsFrontSector;
            activeOperations?: any[];
            movementState?: GameState['military']['brigade_movement_state'];
            candidateAllocation?: AllocationResult;
        }) => {
            const candidateBrigades = brigades.map((brigade) => brigade.id === 'garrison'
                ? { ...brigade, ...garrisonOverrides, id: garrisonId }
                : brigade);
            const candidatePrimary = {
                ...primaryOverride,
                assigned_brigade_ids: primaryOverride.assigned_brigade_ids.map(
                    (id) => id === 'garrison' ? garrisonId : id,
                ),
                reserve_brigade_ids: primaryOverride.reserve_brigade_ids.map(
                    (id) => id === 'garrison' ? garrisonId : id,
                ),
                sub_segments: primaryOverride.sub_segments.map((subSegment) => ({
                    ...subSegment,
                    primary_brigade_ids: subSegment.primary_brigade_ids.map(
                        (id) => id === 'garrison' ? garrisonId : id,
                    ),
                })),
            } as CorpsFrontSector;
            const normalizedAllocation = {
                ...candidateAllocation,
                garrison_locks: candidateAllocation.garrison_locks.map((lock) => ({
                    ...lock,
                    brigade_id: lock.brigade_id === 'garrison' ? garrisonId : lock.brigade_id,
                })),
            };
            const candidateState = {
                ...state,
                meta: { ...state.meta, turn: candidateTurn },
                military: {
                    ...state.military,
                    formations: Object.fromEntries(candidateBrigades.map((brigade) => [brigade.id, brigade])),
                    corps_front_sectors: Object.fromEntries(
                        [candidatePrimary, donor].map((sector) => [sector.sector_id, sector]),
                    ),
                    brigade_movement_state: movementState ?? {},
                    corps_command: {
                        ...state.military.corps_command,
                        [CORPS_ID]: {
                            ...state.military.corps_command![CORPS_ID]!,
                            active_operations: activeOperations,
                        },
                    },
                },
            } as GameState;
            return emitCommanderOutput(
                {
                    ...briefing,
                    turn: candidateTurn,
                    brigades: candidateBrigades,
                    sectors: [candidatePrimary, donor],
                    state_ref: candidateState,
                    active_operations: activeOperations,
                },
                [],
                makeForces(),
                normalizedAllocation,
                { ...makePlanDecision(), plan: null, action: 'none' },
                makeDecisions(),
                makeThreats(),
            );
        };
        const excludesPrimaryGarrison = (guarded: ReturnType<typeof emitCommanderOutput>) => {
            expect(guarded.operations.every(
                (candidate) => candidate.participating_brigades.includes('garrison' as FormationId) !== true,
            )).toBe(true);
        };

        const otherFrontPrimary = {
            ...primary,
            sub_segments: primary.sub_segments.map((subSegment) => ({
                ...subSegment,
                enemy_osids: [...subSegment.enemy_osids, 'op:test:other-front'],
            })),
        } as CorpsFrontSector;
        excludesPrimaryGarrison(emitVariant({ primaryOverride: otherFrontPrimary }));
        excludesPrimaryGarrison(emitVariant({
            primaryOverride: { ...primary, sub_segments: [] } as CorpsFrontSector,
        }));
        excludesPrimaryGarrison(emitVariant({
            garrisonOverrides: { location_osid: 'op:test:donor' as any },
        }));
        excludesPrimaryGarrison(emitVariant({
            movementState: {
                garrison: {
                    status: 'in_transit',
                    stance: 'column',
                    destination_sids: ['op:test:approach'],
                    turns_remaining: 1,
                },
            },
        }));
        for (const phase of ['execution', 'recovery'] as const) {
            excludesPrimaryGarrison(emitVariant({
                activeOperations: [{
                    name: 'Other operation',
                    type: 'sector_attack',
                    phase,
                    started_turn: 29,
                    participating_brigades: ['garrison'],
                    objectives: ['op:test:other-front'],
                }],
            }));
        }

        const inadequatePair = emitVariant({
            garrisonOverrides: { personnel: 500 },
        });
        expect(inadequatePair.operations[0]).toMatchObject({
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'garrison', 'b3'],
            attached_brigades: ['b3'],
            reinforcement_source: 'adjacent_sector',
        });

        const soloGarrison = emitVariant({
            candidateAllocation: {
                ...allocation,
                surplus_pool: [makeEval('b3')],
            },
        });
        excludesPrimaryGarrison(soloGarrison);

        const reservationWindowOutput = emitVariant({
            garrisonId: 'hv_4th_guards_split' as FormationId,
            candidateTurn: 154,
        });
        expect(reservationWindowOutput.operations[0]).toMatchObject({
            type: 'sector_attack',
            objectives: ['op:test:objective'],
        });
        expect(reservationWindowOutput.operations[0]?.participating_brigades).toContain('b1');
        expect(reservationWindowOutput.operations[0]?.participating_brigades)
            .not.toContain('hv_4th_guards_split');

        const lowIntelState = {
            ...state,
            military: {
                ...state.military,
                brigade_attack_orders: {},
                brigade_movement_orders: {},
                corps_command: {
                    ...state.military.corps_command,
                    [CORPS_ID]: {
                        ...state.military.corps_command![CORPS_ID]!,
                        consecutive_probes: 0,
                        active_operations: [],
                    },
                },
                sector_intel: {
                    [primary.sector_id]: [{
                        enemy_sector_id: 'sector:enemy:test',
                        confidence: 0,
                        front_edge_count: 1,
                        last_updated_turn: 30,
                        sources: ['passive_contact'],
                    }],
                } as any,
            },
        } as GameState;
        const lowIntelBriefing = {
            ...briefing,
            state_ref: lowIntelState,
            active_operations: [],
        } as CommanderBriefing;
        const earlyOutput = emitCommanderOutput(
            lowIntelBriefing,
            [],
            makeForces(),
            allocation,
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );
        expect(earlyOutput.operations[0]).toMatchObject({
            type: 'sector_attack',
            phase: 'planning',
            objectives: ['op:test:objective'],
            participating_brigades: ['b1', 'garrison', 'b3'],
            primary_sector_brigades: ['b1', 'garrison'],
            attached_brigades: ['b3'],
            reinforcement_source: 'adjacent_sector',
            minimum_viable_participants: 3,
            minimum_assembled_participants: 3,
            planning_duration: 3,
        });
        expect(earlyOutput.operations[0]?.preparation_sub_phase).toBeUndefined();

        const understrengthLowIntel = emitCommanderOutput(
            lowIntelBriefing,
            [],
            makeForces(),
            { ...allocation, surplus_pool: [makeEval('b1')] },
            { ...makePlanDecision(), plan: null, action: 'none' },
            makeDecisions(),
            makeThreats(),
        );
        expect(understrengthLowIntel.operations.some((candidate) => (
            candidate.type === 'sector_attack'
            && candidate.objectives?.includes('op:test:objective')
        ))).toBe(false);

        applyCommanderOutput(lowIntelState, CORPS_ID, earlyOutput);
        const preparingOperation = lowIntelState.military.corps_command![CORPS_ID]!.active_operations[0]!;
        const preparation = tickPreparation(
            lowIntelState,
            preparingOperation,
            CORPS_ID,
            FACTION,
            1,
            undefined,
            {},
            adjacency as Map<string, string[]>,
        );
        expect(preparation).toMatchObject({
            sub_phase: 'intel_gathering',
            ready: false,
            probe_ordered: true,
        });
        expect(preparingOperation.phase).toBe('planning');
        expect(preparingOperation.active_probe).toMatchObject({
            target_osid: 'op:test:objective',
            resolved: false,
        });

        generateAllBotOrdersOsid(lowIntelState, [FACTION], {
            edges: [
                { a: 'op:test:approach', b: 'op:test:objective' },
                { a: 'op:test:approach', b: 'op:test:donor' },
            ] as any,
            reverseMap: briefing.reverse_map!,
            supplyStateByOsid: {} as any,
            osidPopulationMap: briefing.osid_population_map,
        });
        expect(lowIntelState.military.brigade_attack_orders?.b1).toBeUndefined();
        expect(lowIntelState.military.brigade_attack_orders?.garrison).toBeUndefined();
        expect(lowIntelState.military.brigade_attack_orders?.b3).toBeUndefined();
        expect(lowIntelState.military.brigade_movement_orders?.b3?.destination_sids?.[0])
            .toBe('op:test:approach');
        expect(lowIntelState.military.brigade_movement_orders?.garrison).toBeUndefined();

        expect(evaluateOpeningAttackReadiness(
            lowIntelState,
            CORPS_ID,
            FACTION,
            preparingOperation,
            undefined,
            {
                adjacency: adjacency as Map<any, any>,
                reverseMap: briefing.reverse_map!,
                terrainMultByOsid: {},
                osidPopulationMap: briefing.osid_population_map,
            },
        )).toEqual({
            executable: false,
            blocker: 'participants_below_assembly_floor',
        });

        const preparationTimeline = [preparation];
        for (let step = 0; step < 6 && preparationTimeline.at(-1)?.ready !== true; step++) {
            autoResolveProbe(lowIntelState, preparingOperation, FACTION);
            lowIntelState.meta.turn += 1;
            preparationTimeline.push(tickPreparation(
                lowIntelState,
                preparingOperation,
                CORPS_ID,
                FACTION,
                1,
                undefined,
                {},
                adjacency as Map<string, string[]>,
            ));
        }
        expect(preparationTimeline.map((step) => ({
            sub_phase: step.sub_phase,
            ready: step.ready,
            probe_ordered: step.probe_ordered,
        }))).toEqual([
            { sub_phase: 'intel_gathering', ready: false, probe_ordered: true },
            { sub_phase: 'intel_gathering', ready: false, probe_ordered: true },
            { sub_phase: 'intel_gathering', ready: false, probe_ordered: true },
            { sub_phase: 'intel_gathering', ready: false, probe_ordered: true },
            { sub_phase: 'ready', ready: true, probe_ordered: false },
        ]);
        expect(preparingOperation.preparation_turns_elapsed).toBe(5);
        expect(preparationTimeline.at(-1)?.ready).toBe(true);
        expect(preparingOperation.preparation_sub_phase).toBe('ready');
        expect(preparingOperation.phase).toBe('planning');

        lowIntelState.military.formations!.b3 = {
            ...lowIntelState.military.formations!.b3!,
            location_osid: 'op:test:approach',
        };
        delete lowIntelState.military.brigade_movement_orders!.b3;
        expect(evaluateOpeningAttackReadiness(
            lowIntelState,
            CORPS_ID,
            FACTION,
            preparingOperation,
            undefined,
            {
                adjacency: adjacency as Map<any, any>,
                reverseMap: briefing.reverse_map!,
                terrainMultByOsid: {},
                osidPopulationMap: briefing.osid_population_map,
            },
        )).toEqual({ executable: true });

        applyCommanderOutput(state, CORPS_ID, output);
        state.military.corps_command![CORPS_ID]!.active_operations[0]!.phase = 'execution';
        generateAllBotOrdersOsid(state, [FACTION], {
            edges: [
                { a: 'op:test:approach', b: 'op:test:objective' },
                { a: 'op:test:approach', b: 'op:test:donor' },
            ] as any,
            reverseMap: briefing.reverse_map!,
            supplyStateByOsid: {} as any,
            osidPopulationMap: briefing.osid_population_map,
        });
        expect(state.military.brigade_attack_orders?.garrison).toBe('op:test:objective');
        expect(state.military.brigade_movement_orders?.garrison).toBeUndefined();
        expect(state.military.formations!.garrison!.location_osid).toBe('op:test:approach');
    });

    it.each(['committed', 'recovery', 'packing', 'transit', 'pending_move', 'unpacking', 'off_sector'] as const)(
        'does not count %s staff toward a donor residual',
        (blockedState) => {
            const blockedLocation = blockedState === 'off_sector' ? 'op:test:approach' : 'op:test:donor';
            const brigades = [
                makeBrigade('b1', 'op:test:approach'),
                makeBrigade('b2', 'op:test:approach'),
                makeBrigade('b3', 'op:test:donor'),
                makeBrigade('blocked', blockedLocation),
                makeBrigade('line1', 'op:test:long'),
                makeBrigade('line2', 'op:test:long'),
                makeBrigade('line3', 'op:test:long'),
            ];
            const committedOperation = blockedState === 'recovery' || blockedState === 'committed' ? [{
                name: 'Recovering operation',
                type: 'probe',
                phase: blockedState === 'recovery' ? 'recovery' : 'execution',
                sector_id: `sector:${CORPS_ID}:9`,
                objectives: ['op:test:other'],
                participating_brigades: ['blocked'],
            } as any] : [];
            const baseBriefing = makeBriefing(committedOperation, brigades);
            const donor = {
                ...makeSector(),
                sector_id: `sector:${CORPS_ID}:1`,
                territory_osids: ['op:test:donor'],
                length_edges: 4,
                assigned_brigade_ids: ['b3', 'blocked'] as FormationId[],
                sub_segments: [],
            } as CorpsFrontSector;
            const longFront = {
                ...donor,
                sector_id: `sector:${CORPS_ID}:2`,
                territory_osids: ['op:test:long'],
                length_edges: 16,
                assigned_brigade_ids: ['line1', 'line2', 'line3'] as FormationId[],
            } as CorpsFrontSector;
            const adjacency = new Map<string, readonly string[]>([
                ['op:test:approach', ['op:test:objective', 'op:test:donor', 'op:test:long']],
                ['op:test:donor', ['op:test:approach']],
                ['op:test:long', ['op:test:approach']],
                ['op:test:objective', ['op:test:approach']],
            ]);
            const briefing: CommanderBriefing = {
                ...baseBriefing,
                sectors: [makeSector(), donor, longFront],
                spatial: {
                    ...makeSpatial(),
                    adjacency,
                    sharedBoundaryAdjacency: adjacency,
                    friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
                        [FACTION, new Set(['op:test:approach', 'op:test:donor', 'op:test:long'])],
                        ['RBiH' as FactionId, new Set(['op:test:objective'])],
                        ['HRHB' as FactionId, new Set()],
                    ]),
                } as SpatialContext,
            };
            briefing.state_ref!.political.political_controllers = {
                'op:test:approach': FACTION,
                'op:test:donor': FACTION,
                'op:test:long': FACTION,
                'op:test:objective': 'RBiH',
            } as any;
            briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes = 2;
            if (blockedState === 'packing' || blockedState === 'transit' || blockedState === 'unpacking') {
                briefing.state_ref!.military.brigade_movement_state = {
                    blocked: { status: blockedState === 'transit' ? 'in_transit' : blockedState } as any,
                };
            }
            if (blockedState === 'pending_move') {
                briefing.state_ref!.military.brigade_movement_orders = {
                    blocked: { destination_sids: ['op:test:approach'] } as any,
                };
            }
            const noPlan = { ...makePlanDecision(), plan: null, action: 'none' as const };
            const output = emitCommanderOutput(
                briefing,
                [],
                makeForces(),
                { ...makeAllocation(), surplus_pool: [makeEval('b1'), makeEval('b2'), makeEval('b3')] },
                noPlan,
                makeDecisions(),
                makeThreats(),
            );

            if (blockedState === 'committed') {
                expect(output.operations).toHaveLength(0);
            } else if (blockedState === 'unpacking') {
                expect(output.operations[0]?.participating_brigades).toEqual(['b1', 'b2', 'b3']);
            } else {
                expect(output.operations[0]?.participating_brigades).toEqual(['b1', 'b2']);
                expect(output.operations[0]?.attached_brigades).toBeUndefined();
            }
        },
    );

    it('emits byte-identical intel-gated operations for identical inputs', () => {
        const briefing = makeIntelBriefing([0.24]);
        const emit = () => emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        ).operations;

        expect(JSON.stringify(emit())).toBe(JSON.stringify(emit()));
    });

    it('increments the probe counter only when a probe is accepted', () => {
        const briefing = makeIntelBriefing([0.24]);
        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        applyCommanderOutput(briefing.state_ref!, CORPS_ID, output);

        expect(briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes).toBe(1);
    });

    it('resets the probe counter when a full operation is accepted', () => {
        const briefing = makeIntelBriefing([0], { consecutiveProbes: 2 });
        const output = emitCommanderOutput(
            briefing,
            [],
            makeForces(),
            makeAllocation(),
            makePlanDecision(),
            makeDecisions(),
            makeThreats(),
        );

        applyCommanderOutput(briefing.state_ref!, CORPS_ID, output);

        expect(briefing.state_ref!.military.corps_command![CORPS_ID]!.consecutive_probes).toBe(0);
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

    it('keeps a Level-1 approval pending when an unrelated live operation blocks emission', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 10, phase: 'war', seed: 'approved-overlap', autonomy_level: 1 } as any,
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
                            name: 'blocking_probe',
                            type: 'probe',
                            phase: 'execution',
                            sector_id: `sector:${CORPS_ID}:0`,
                            objectives: ['op:test:objective'],
                            participating_brigades: ['b1'],
                        }],
                        player_op_response: { plan_id: 'p1', approved: true, turn: 9 },
                    },
                },
                brigade_movement_orders: {},
            },
        } as unknown as GameState;

        applyCommanderOutput(state, CORPS_ID, {
            directive: { type: 'hold', target_zone: null } as any,
            operations: [{
                name: 'approved_main_effort',
                type: 'sector_attack',
                phase: 'planning',
                sector_id: `sector:${CORPS_ID}:0`,
                objectives: ['op:test:objective'],
                participating_brigades: ['b1', 'b2'],
            } as any],
            sector_stances: [],
            updated_state: {
                current_plan: { plan_id: 'p1', status: 'executing' } as any,
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

        const command = state.military.corps_command?.[CORPS_ID];
        expect(command?.active_operations.map((operation) => operation.name)).toEqual(['blocking_probe']);
        expect(command?.player_op_response).toEqual({ plan_id: 'p1', approved: true, turn: 9 });
        expect(command?.commander_state?.current_plan?.status).toBe('ready');
    });

    // Codex P1 regression (#86): at autonomy level 1 the emitted op is tagged
    // force-launched ONLY for a force-launch (player_op_response.force_launched),
    // NOT for an ordinary Commit (which also stages approved:true).
    function runLevel1Launch(forceLaunched: boolean) {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 10, phase: 'war', seed: 'l1-launch', autonomy_level: 1 } as any,
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
                        active_operations: [],
                        player_op_response: {
                            plan_id: 'p1', approved: true, turn: 10,
                            ...(forceLaunched ? { force_launched: true } : {}),
                        },
                    },
                },
                brigade_movement_orders: {},
            },
        } as unknown as GameState;

        applyCommanderOutput(state, CORPS_ID, {
            directive: { type: 'hold', target_zone: null } as any,
            operations: [{
                name: 'l1_op', type: 'sector_attack', phase: 'planning',
                sector_id: `sector:${CORPS_ID}:0`, objectives: ['op:test:objective'],
                participating_brigades: ['b1', 'b2'],
            } as any],
            sector_stances: [],
            updated_state: {
                current_plan: { plan_id: 'p1', status: 'executing' } as any,
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
        return state.military.corps_command?.[CORPS_ID]?.active_operations?.[0] as any;
    }

    it('Level-1 ordinary Commit does NOT tag the emitted op as force-launched', () => {
        const op = runLevel1Launch(false);
        expect(op?.name).toBe('l1_op');
        expect(op?.was_force_launched).not.toBe(true);
    });

    it('Level-1 force-launch (player_op_response.force_launched) tags the emitted op', () => {
        const op = runLevel1Launch(true);
        expect(op?.name).toBe('l1_op');
        expect(op?.force_launch).toBe(true);
        expect(op?.was_force_launched).toBe(true);
    });
});
