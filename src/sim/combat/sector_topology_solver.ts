import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FormationAssignment,
    FormationId,
    FormationState,
} from '../../state/game_state.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildCorpsFrontSectorsFromReadModel } from './corps_front_sectors.js';
import { createSectorTopologyMutationRecorder } from './sector_topology_mutation_journal.js';
import type {
    SectorTopologyFormation,
    SectorTopologyMutation,
    SectorTopologySolveInput,
    SectorTopologySolveOutput,
    SectorTopologyWorkingState,
} from './sector_topology_solver_types.js';

function copyAssignment(
    assignment: Readonly<FormationAssignment> | null,
): FormationAssignment | null {
    return assignment == null ? null : { ...assignment };
}

function createWorkingFormation(
    formation: SectorTopologyFormation,
): FormationState {
    return {
        id: formation.id,
        faction: formation.faction,
        name: formation.id,
        created_turn: 0,
        status: formation.status,
        assignment: copyAssignment(formation.assignment),
        tags: formation.tags == null ? undefined : [...formation.tags],
        kind: formation.kind,
        readiness: formation.readiness,
        lifecycle_status: formation.lifecycle_status,
        corps_id: formation.corps_id,
        location_osid: formation.location_osid,
        home_osid: formation.home_osid,
        hq_osid: formation.hq_osid,
        hq_sid: formation.hq_sid,
        personnel: formation.personnel,
        personnel_lent_by_tg: formation.personnel_lent_by_tg == null
            ? undefined
            : { ...formation.personnel_lent_by_tg },
        cohesion: formation.cohesion,
        experience: formation.experience,
        honor: formation.honor,
        assigned_sub_segment_id: formation.assigned_sub_segment_id,
        posture: formation.posture,
        disrupted: formation.disrupted,
        disrupted_turns: formation.disrupted_turns,
        stranded_status: formation.stranded_status,
        entrenchment_turns: formation.entrenchment_turns,
        elite_loan_state: formation.elite_loan_state == null
            ? undefined
            : {
                on_loan: formation.elite_loan_state.on_loan,
                loaned_to_corps: formation.elite_loan_state.loaned_to_corps,
                loan_start_turn: formation.elite_loan_state.loan_start_turn,
                last_recall_turn: null,
                loan_start_personnel: null,
                permanently_degraded: false,
                current_episode_id: null,
            },
    };
}

function createWorkingFormations(
    input: SectorTopologySolveInput,
): Record<FormationId, FormationState> {
    const formations: Record<FormationId, FormationState> = {};
    for (const formationId of Object.keys(input.formations)) {
        const formation = input.formations[formationId];
        if (formation) formations[formationId] = createWorkingFormation(formation);
    }
    return formations;
}

function createWorkingState(input: SectorTopologySolveInput): SectorTopologyWorkingState {
    const corpsCommand: NonNullable<SectorTopologyWorkingState['military']['corps_command']> = {};
    for (const corpsId of Object.keys(input.corpsCommand)) {
        const command = input.corpsCommand[corpsId];
        if (!command) continue;
        corpsCommand[corpsId] = {
            directive: command.directive == null
                ? command.directive
                : { priority_sector_id: command.directive.priority_sector_id },
            active_operations: command.active_operations.map((operation) => ({
                name: operation.name,
                type: operation.type,
                phase: operation.phase,
                sector_id: operation.sector_id,
                preparation_sub_phase: operation.preparation_sub_phase,
                participating_brigades: [...operation.participating_brigades],
                axes: operation.axes?.map((axis) => ({
                    objectives: axis.objectives == null ? undefined : [...axis.objectives],
                })),
                objectives: operation.objectives == null
                    ? undefined
                    : [...operation.objectives],
            })),
        };
    }

    return {
        meta: {
            turn: input.turn,
            decision_mode: input.decisionMode,
        },
        factions: input.factionIds.map((id) => ({ id })),
        political: {
            political_controllers: { ...input.politicalControllers },
            graz_east_herzegovina_active_turn: input.grazEastHerzegovinaActiveTurn,
            control_events: input.controlEvents.map((event) => ({ ...event })),
            last_supply_state_by_osid: { ...input.lastSupplyStateByOsid },
        },
        military: {
            war_front_edges_osid: input.frontEdges.map((edge) => ({ ...edge })),
            formations: createWorkingFormations(input),
            brigade_movement_orders: Object.fromEntries(
                Object.entries(input.brigadeMovementOrders).map(([id, order]) => [
                    id,
                    {
                        destination_sids: [...order.destination_sids],
                        stance: order.stance,
                    },
                ]),
            ),
            brigade_movement_state: Object.fromEntries(
                Object.entries(input.brigadeMovementState).map(([id, movement]) => [
                    id,
                    {
                        status: movement.status,
                        stance: movement.stance,
                        destination_sids: movement.destination_sids == null
                            ? undefined
                            : [...movement.destination_sids],
                        path: movement.path == null ? undefined : [...movement.path],
                        turns_remaining: movement.turns_remaining,
                    },
                ]),
            ),
            brigade_posture_orders: input.brigadePostureOrders.map((order) => ({ ...order })),
            brigade_sector_override: { ...input.brigadeSectorOverride },
            unresolved_sector_brigades: input.unresolvedSectorBrigades == null
                ? undefined
                : [...input.unresolvedSectorBrigades],
            corps_command: corpsCommand,
            campaign_plans: Object.fromEntries(
                Object.entries(input.campaignPlans).map(([faction, plan]) => [
                    faction,
                    plan == null
                        ? null
                        : {
                            valid_until_turn: plan.valid_until_turn,
                            front_priorities: plan.front_priorities.map((priority) => ({
                                corps_id: priority.corps_id,
                                role: priority.role,
                            })),
                        },
                ]),
            ),
            named_officers: Object.fromEntries(
                Object.entries(input.namedOfficers).map(([id, officer]) => [
                    id,
                    { ...officer },
                ]),
            ),
            named_officer_data: input.namedOfficerData.map((officer) => ({ ...officer })),
        },
    };
}

function createSpatialContext(input: SectorTopologySolveInput): SpatialContext | undefined {
    if (input.spatial.computedAtTurn == null || input.spatial.phase == null) return undefined;
    return {
        adjacency: new Map(input.spatial.adjacencyEntries.map(([osid, neighbors]) => [
            osid,
            [...neighbors],
        ])),
        sharedBoundaryAdjacency: new Map(
            input.spatial.sharedBoundaryAdjacencyEntries.map(([osid, neighbors]) => [
                osid,
                [...neighbors],
            ]),
        ),
        friendlyOsidsByFaction: new Map(
            input.spatial.friendlyOsidsByFactionEntries.map(([faction, osids]) => [
                faction,
                new Set(osids),
            ]),
        ),
        componentsByFaction: new Map(
            input.spatial.componentsByFactionEntries.map(([faction, components]) => [
                faction,
                new Map(components),
            ]),
        ),
        frontEdgesOsid: input.frontEdges.map((edge) => ({ ...edge })),
        computedAtTurn: input.spatial.computedAtTurn,
        phase: input.spatial.phase,
    };
}

function traceFromMutations(mutations: readonly SectorTopologyMutation[]) {
    const stages: Array<{ stage: string; mutationCount: number }> = [];
    for (const mutation of mutations) {
        const last = stages.at(-1);
        if (last?.stage === mutation.stage) last.mutationCount += 1;
        else stages.push({ stage: mutation.stage, mutationCount: 1 });
    }
    return { stages };
}

/** Run the complete current topology solve over one detached mutable projection. */
export function solveCorpsFrontSectorsPure(
    input: SectorTopologySolveInput,
): SectorTopologySolveOutput {
    const working = createWorkingState(input);
    const edges: EdgeRecord[] = input.edges.map((edge) => ({ ...edge }));
    const reverseMap = input.reverseMapEntries.length === 0
        ? null
        : new Map(input.reverseMapEntries.map(([key, values]) => [key, [...values]]));
    const centroids: OsidCentroidMap | undefined = input.centroidEntries.length === 0
        ? undefined
        : new Map(input.centroidEntries.map(([key, centroid]) => [key, { ...centroid }]));
    const spatial = createSpatialContext(input);
    const recorder = createSectorTopologyMutationRecorder();
    const sectors = buildCorpsFrontSectorsFromReadModel(
        working,
        edges,
        reverseMap,
        centroids,
        spatial,
        input.options.isFinalPass,
        input.options.finalSaveGeometryProjection,
        input.options.useFixedPointShortcuts,
        input.options.occupancyStrategy,
        input.options.frontEdgeAdjacencyStrategy,
        undefined,
        'test-only-imperative-live-state',
        recorder,
    );

    return {
        sectors,
        mutations: recorder.mutations,
        diagnostics: recorder.diagnostics,
        trace: traceFromMutations(recorder.mutations),
    };
}
