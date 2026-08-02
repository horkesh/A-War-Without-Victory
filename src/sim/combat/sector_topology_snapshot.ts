import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPoliticalControllerOSIDFromReadModel } from '../../state/settlement_control.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency } from './osid_adjacency.js';
import { buildFriendlyComponents } from './sector_utils.js';
import type {
    SectorTopologyCampaignPlan,
    SectorTopologyCorpsCommand,
    SectorTopologyFormation,
    SectorTopologyFrontEdge,
    SectorTopologyNamedOfficerData,
    SectorTopologyNamedOfficerState,
    SectorTopologySolveInput,
    SectorTopologySolveOptions,
    SectorTopologySpatialSnapshot,
} from './sector_topology_solver_types.js';

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
}

function copySortedRecord<T, U>(
    source: Readonly<Record<string, T>> | null | undefined,
    copyValue: (value: T, key: string) => U,
): Record<string, U> {
    const result: Record<string, U> = {};
    for (const key of Object.keys(source ?? {}).sort(strictCompare)) {
        const value = source?.[key];
        if (value !== undefined) result[key] = copyValue(value, key);
    }
    return result;
}

function copyStringRecord(
    source: Readonly<Record<string, string>> | null | undefined,
): Record<string, string> {
    return copySortedRecord(source, (value) => value);
}

function copyOptionalStringRecord(
    source: Readonly<Record<string, string | null | undefined>> | null | undefined,
): Record<string, string | null | undefined> {
    const result: Record<string, string | null | undefined> = {};
    for (const key of Object.keys(source ?? {}).sort(strictCompare)) {
        result[key] = source?.[key];
    }
    return result;
}

function copyFormation(formation: FormationState): SectorTopologyFormation {
    return {
        id: formation.id,
        faction: formation.faction,
        status: formation.status,
        kind: formation.kind,
        readiness: formation.readiness,
        lifecycle_status: formation.lifecycle_status,
        tags: formation.tags == null ? undefined : [...formation.tags],
        corps_id: formation.corps_id,
        location_osid: formation.location_osid,
        home_osid: formation.home_osid,
        hq_osid: formation.hq_osid,
        hq_sid: formation.hq_sid,
        personnel: formation.personnel,
        personnel_lent_by_tg: formation.personnel_lent_by_tg == null
            ? undefined
            : copySortedRecord(formation.personnel_lent_by_tg, (value) => value),
        cohesion: formation.cohesion,
        experience: formation.experience,
        honor: formation.honor,
        assignment: formation.assignment == null ? null : { ...formation.assignment },
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
            },
    };
}

function copyCorpsCommand(
    command: NonNullable<GameState['military']['corps_command']>[string],
): SectorTopologyCorpsCommand {
    return {
        directive: command.directive == null
            ? command.directive
            : { priority_sector_id: command.directive.priority_sector_id },
        active_operations: (command.active_operations ?? []).map((operation) => ({
            name: operation.name,
            type: operation.type,
            phase: operation.phase,
            sector_id: operation.sector_id,
            preparation_sub_phase: operation.preparation_sub_phase,
            participating_brigades: [...operation.participating_brigades],
            axes: operation.axes?.map((axis) => ({
                objectives: axis.objectives == null ? undefined : [...axis.objectives],
            })),
            objectives: operation.objectives == null ? undefined : [...operation.objectives],
        })),
    };
}

function copyCampaignPlan(
    plan: NonNullable<GameState['military']['campaign_plans']>[string],
): SectorTopologyCampaignPlan | null {
    if (plan == null) return null;
    return {
        valid_until_turn: plan.valid_until_turn,
        front_priorities: plan.front_priorities.map((priority) => ({
            corps_id: priority.corps_id,
            role: priority.role,
        })),
    };
}

function copyNamedOfficerState(
    officer: NonNullable<GameState['military']['named_officers']>[string],
): SectorTopologyNamedOfficerState {
    return {
        status: officer.status,
        assigned_corps_id: officer.assigned_corps_id,
        effective_competence_penalty: officer.effective_competence_penalty,
    };
}

function copyNamedOfficerData(
    officer: NonNullable<GameState['military']['named_officer_data']>[number],
): SectorTopologyNamedOfficerData {
    return {
        id: officer.id,
        competence: officer.competence,
        aggressiveness: officer.aggressiveness,
    };
}

function copyMapEntries<T>(
    source: ReadonlyMap<string, T> | undefined,
    copyValue: (value: T) => T,
): Array<readonly [string, T]> {
    if (!source) return [];
    return [...source.keys()]
        .sort(strictCompare)
        .map((key) => [key, copyValue(source.get(key)!)] as const);
}

function copyStringListEntries(
    source: ReadonlyMap<string, readonly string[]> | undefined,
): Array<readonly [string, readonly string[]]> {
    return copyMapEntries(source, (values) => [...values]);
}

function copySpatialSnapshot(
    spatial: SpatialContext | undefined,
    edges: readonly EdgeRecord[],
    politicalControllers: Readonly<Record<string, string | null | undefined>>,
    factionIds: readonly FactionId[],
): SectorTopologySpatialSnapshot {
    const adjacency = spatial?.adjacency ?? buildOsidAdjacency([...edges]);
    const sharedBoundaryAdjacency = spatial?.sharedBoundaryAdjacency
        ?? buildSharedBoundaryAdjacency([...edges]);
    const friendlyOsidsByFaction = new Map<FactionId, ReadonlySet<string>>();
    const componentsByFaction = new Map<FactionId, ReadonlyMap<string, number>>();

    for (const faction of factionIds) {
        const spatialFriendly = spatial?.friendlyOsidsByFaction.get(faction);
        const friendly = spatialFriendly == null
            ? new Set(Object.keys(politicalControllers)
                .filter((osid) => politicalControllers[osid] === faction)
                .sort(strictCompare))
            : new Set([...spatialFriendly].sort(strictCompare));
        friendlyOsidsByFaction.set(faction, friendly);
        const spatialComponents = spatial?.componentsByFaction.get(faction);
        componentsByFaction.set(
            faction,
            spatialComponents ?? buildFriendlyComponents(
                new Map([...adjacency].map(([osid, neighbors]) => [osid, [...neighbors]])),
                friendly,
            ),
        );
    }

    return {
        adjacencyEntries: copyStringListEntries(adjacency),
        sharedBoundaryAdjacencyEntries: copyStringListEntries(sharedBoundaryAdjacency),
        friendlyOsidsByFactionEntries: [...friendlyOsidsByFaction.keys()]
            .sort(strictCompare)
            .map((faction) => [
                faction,
                [...(friendlyOsidsByFaction.get(faction) ?? [])].sort(strictCompare),
            ] as const),
        componentsByFactionEntries: [...componentsByFaction.keys()]
            .sort(strictCompare)
            .map((faction) => [
                faction,
                [...(componentsByFaction.get(faction) ?? new Map()).entries()]
                    .sort(([a], [b]) => strictCompare(a, b))
                    .map(([osid, component]) => [osid, component] as const),
            ] as const),
        computedAtTurn: spatial?.computedAtTurn ?? null,
        phase: spatial?.phase ?? null,
    };
}

function frontEdgeFingerprint(frontEdges: readonly SectorTopologyFrontEdge[]): string {
    return JSON.stringify(frontEdges.map((edge) => [
        edge.edge_id,
        edge.a,
        edge.b,
        edge.side_a,
        edge.side_b,
    ]));
}

export function captureSectorTopologySolveInput(
    state: GameState,
    edges: readonly EdgeRecord[],
    reverseMap: ReadonlyMap<string, readonly string[]> | null,
    centroids: OsidCentroidMap | undefined,
    spatial: SpatialContext | undefined,
    options: SectorTopologySolveOptions,
): SectorTopologySolveInput {
    const turn = state.meta.turn;
    const decisionMode = state.meta.decision_mode;
    const factionIds = state.factions.map((faction) => faction.id).sort(strictCompare);
    const frontEdges = (state.military.war_front_edges_osid ?? []).map((edge) => ({
        edge_id: edge.edge_id,
        a: edge.a,
        b: edge.b,
        side_a: edge.side_a,
        side_b: edge.side_b,
    }));
    const edgeCopies = edges.map((edge) => ({ ...edge }));
    const politicalControllers = copyOptionalStringRecord(
        state.political.political_controllers,
    );
    const spatialSnapshot = copySpatialSnapshot(
        spatial,
        edgeCopies,
        politicalControllers,
        factionIds,
    );

    const input: SectorTopologySolveInput = {
        provenance: {
            turn,
            frontEdgeFingerprint: frontEdgeFingerprint(frontEdges),
            spatialComputedAtTurn: spatialSnapshot.computedAtTurn,
            spatialPhase: spatialSnapshot.phase,
        },
        options: { ...options },
        turn,
        decisionMode,
        factionIds,
        frontEdges,
        edges: edgeCopies,
        reverseMapEntries: reverseMap == null
            ? []
            : copyStringListEntries(reverseMap),
        centroidEntries: centroids == null
            ? []
            : copyMapEntries(centroids, (centroid) => ({ ...centroid })),
        spatial: spatialSnapshot,
        politicalControllers,
        grazEastHerzegovinaActiveTurn:
            state.political.graz_east_herzegovina_active_turn,
        controlEvents: (state.political.control_events ?? []).map((event) => ({ ...event })),
        lastSupplyStateByOsid: copyStringRecord(
            state.political.last_supply_state_by_osid,
        ),
        campaignPlans: copySortedRecord(
            state.military.campaign_plans,
            (plan) => copyCampaignPlan(plan),
        ),
        formations: copySortedRecord(
            state.military.formations,
            (formation) => copyFormation(formation),
        ),
        brigadeMovementOrders: copySortedRecord(
            state.military.brigade_movement_orders,
            (order) => ({
                destination_sids: [...order.destination_sids],
                stance: order.stance,
            }),
        ),
        brigadeMovementState: copySortedRecord(
            state.military.brigade_movement_state,
            (movement) => ({
                status: movement.status,
                stance: movement.stance,
                destination_sids: movement.destination_sids == null
                    ? undefined
                    : [...movement.destination_sids],
                path: movement.path == null ? undefined : [...movement.path],
                turns_remaining: movement.turns_remaining,
            }),
        ),
        brigadePostureOrders: (state.military.brigade_posture_orders ?? [])
            .map((order) => ({ ...order })),
        brigadeSectorOverride: copyStringRecord(
            state.military.brigade_sector_override,
        ),
        corpsCommand: copySortedRecord(
            state.military.corps_command,
            (command) => copyCorpsCommand(command),
        ),
        namedOfficers: copySortedRecord(
            state.military.named_officers,
            (officer) => copyNamedOfficerState(officer),
        ),
        namedOfficerData: (state.military.named_officer_data ?? [])
            .map((officer) => copyNamedOfficerData(officer)),
    };

    return deepFreeze(input);
}

export function sectorTopologyPoliticalController(
    input: Pick<SectorTopologySolveInput, 'politicalControllers' | 'reverseMapEntries'>,
    osid: string,
): string | null {
    return getPoliticalControllerOSIDFromReadModel(
        { politicalControllers: input.politicalControllers },
        osid,
        new Map(input.reverseMapEntries.map(([key, values]) => [key, values])),
    );
}
