import { describe, expect, it } from 'vitest';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
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

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_primary_sector_test' as FormationId;
const PRIMARY_APPROACH = 'op:test:primary:approach';
const PRIMARY_OBJECTIVE = 'op:test:primary:objective';
const PRIMARY_OBJECTIVE_2 = 'op:test:primary:objective:2';
const SECONDARY_APPROACH = 'op:test:secondary:approach';
const SECONDARY_OBJECTIVE = 'op:test:enemy:secondary';

const personality: OfficerPersonality = {
    aggression: 0.6,
    caution: 0.3,
    initiative: 0.7,
    competence: 0.6,
};

function makeBrigade(id: string): FormationState {
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
        location_osid: PRIMARY_APPROACH,
    } as FormationState;
}

function makeSector(
    sectorId: string,
    approach: string,
    objectives: string[],
    brigades: string[],
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: CORPS_ID,
        faction: FACTION,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: [],
        sub_segments: [{
            sub_segment_id: `${sectorId}:sub`,
            edge_ids: [],
            friendly_osids: [approach],
            enemy_osids: objectives,
            primary_brigade_ids: brigades as FormationId[],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: [approach],
        assigned_brigade_ids: brigades as FormationId[],
        reserve_brigade_ids: [],
        density: brigades.length,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeBriefing(): CommanderBriefing {
    const primaryBrigades = ['primary_1', 'primary_2'];
    const sectors = [
        makeSector(
            `sector:${CORPS_ID}:0`,
            PRIMARY_APPROACH,
            [PRIMARY_OBJECTIVE, PRIMARY_OBJECTIVE_2],
            primaryBrigades,
        ),
        makeSector(
            `sector:${CORPS_ID}:1`,
            SECONDARY_APPROACH,
            [SECONDARY_OBJECTIVE],
            ['secondary_1', 'secondary_2'],
        ),
    ];
    const adjacency = new Map<string, readonly string[]>([
        [PRIMARY_APPROACH, [PRIMARY_OBJECTIVE, PRIMARY_OBJECTIVE_2]],
        [PRIMARY_OBJECTIVE, [PRIMARY_APPROACH]],
        [PRIMARY_OBJECTIVE_2, [PRIMARY_APPROACH]],
        [SECONDARY_APPROACH, [SECONDARY_OBJECTIVE]],
        [SECONDARY_OBJECTIVE, [SECONDARY_APPROACH]],
    ]);
    const spatial = {
        adjacency,
        sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
            [FACTION, new Set([PRIMARY_APPROACH, SECONDARY_APPROACH])],
            ['RBiH' as FactionId, new Set([PRIMARY_OBJECTIVE, PRIMARY_OBJECTIVE_2, SECONDARY_OBJECTIVE])],
            ['HRHB' as FactionId, new Set()],
        ]),
        componentsByFaction: new Map(),
        frontEdgesOsid: undefined,
        computedAtTurn: 10,
        phase: 'pre-combat',
    } as SpatialContext;

    return {
        corps_id: CORPS_ID,
        faction: FACTION,
        turn: 10,
        spatial,
        sectors,
        brigades: primaryBrigades.map(makeBrigade),
        state_ref: undefined,
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
        officer_personality: personality,
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
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

function makeEval(id: string): BrigadeEvaluation {
    return {
        brigade_id: id as FormationId,
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

function makeForces(): ForceAssessment {
    const evaluations = ['primary_1', 'primary_2'].map(makeEval);
    return {
        total_brigades: evaluations.length,
        combat_effective: evaluations.length,
        evaluations,
        by_zone: { 'zone:test:0': evaluations },
        tier_counts: { main_effort: 0, active_defense: evaluations.length, garrison: 0 },
        total_surplus: evaluations.length,
    };
}

function makeAllocation(): AllocationResult {
    return {
        zones: [],
        garrison_locks: [],
        surplus_pool: ['primary_1', 'primary_2'].map(makeEval),
        total_garrison_budget: 0,
        can_launch_ops: true,
    };
}

function makePlanDecision(targetOsids: string[]): PlanDecision {
    return {
        plan: {
            plan_id: 'plan:primary-sector-scope',
            created_turn: 9,
            source: 'opportunity',
            status: 'ready',
            staging_zone: 'zone:test:0' as ZoneId,
            target_osids: targetOsids,
            required_brigades: 2,
            concentrated_brigades: ['primary_1' as FormationId, 'primary_2' as FormationId],
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

const decisions: DecisionResult = {
    stance_changes: [],
    reserve_shifts: [],
    intel_picture: { enemy_concentration_zone: null, known_enemy_osids: [], known_enemy_strength: {} } as any,
    activity_entries: [],
    suspend_plan: false,
    reinforcement_requests: [],
};

const threats: ThreatAssessment = {
    threatened_zones: [],
    enemy_concentration_zones: [],
    recent_losses: [],
    overall_pressure: 'low',
};

function emit(targetOsids: string[]) {
    return emitCommanderOutput(
        makeBriefing(),
        [],
        makeForces(),
        makeAllocation(),
        makePlanDecision(targetOsids),
        decisions,
        threats,
    );
}

describe('commander operation objective scope', () => {
    it('keeps explicit objectives within the participant primary sector', () => {
        const output = emit([PRIMARY_OBJECTIVE, PRIMARY_OBJECTIVE_2, SECONDARY_OBJECTIVE]);

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.sector_id).toBe(`sector:${CORPS_ID}:0`);
        expect(output.operations[0]!.participating_brigades).toEqual(['primary_1', 'primary_2']);
        expect(output.operations[0]!.objectives).toEqual([PRIMARY_OBJECTIVE, PRIMARY_OBJECTIVE_2]);
    });

    it('derives empty-target opportunity objectives from the primary sector', () => {
        const output = emit([]);

        expect(output.operations).toHaveLength(1);
        expect(output.operations[0]!.sector_id).toBe(`sector:${CORPS_ID}:0`);
        expect(output.operations[0]!.objectives).toEqual([PRIMARY_OBJECTIVE]);
    });
});
