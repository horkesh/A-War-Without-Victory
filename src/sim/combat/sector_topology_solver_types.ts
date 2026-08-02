import type { OsidCentroid } from '../../data/operational_data_types.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type {
    BrigadeMovementOrder,
    BrigadeMovementState,
    BrigadePostureOrder,
    ControlEvent,
    CorpsFrontSector,
    CorpsOperation,
    FactionId,
    FormationAssignment,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EnsureMinimumSectorCoverageOccupancyStrategy } from './brigade_assignment.js';
import type { SectorFrontEdgeAdjacencyStrategy } from './corps_front_sectors.js';

export interface SectorTopologySolveOptions {
    readonly isFinalPass: boolean;
    readonly finalSaveGeometryProjection: boolean;
    readonly useFixedPointShortcuts: boolean;
    readonly occupancyStrategy: EnsureMinimumSectorCoverageOccupancyStrategy;
    readonly frontEdgeAdjacencyStrategy: SectorFrontEdgeAdjacencyStrategy;
}

export interface SectorTopologyFrontEdge {
    readonly edge_id: string;
    readonly a: string;
    readonly b: string;
    readonly side_a: string | null;
    readonly side_b: string | null;
}

type SectorTopologyFormationScalarKeys =
    | 'id'
    | 'faction'
    | 'status'
    | 'kind'
    | 'readiness'
    | 'lifecycle_status'
    | 'corps_id'
    | 'location_osid'
    | 'home_osid'
    | 'hq_osid'
    | 'hq_sid'
    | 'personnel'
    | 'cohesion'
    | 'experience'
    | 'honor'
    | 'assigned_sub_segment_id'
    | 'posture'
    | 'disrupted'
    | 'disrupted_turns'
    | 'stranded_status'
    | 'entrenchment_turns';

export type SectorTopologyFormation = Readonly<
    Pick<FormationState, SectorTopologyFormationScalarKeys>
> & {
    readonly tags?: readonly string[];
    readonly assignment: Readonly<FormationAssignment> | null;
    readonly personnel_lent_by_tg?: Readonly<Record<string, number>>;
    readonly elite_loan_state?: Readonly<{
        on_loan: boolean;
        loaned_to_corps: FormationId | null;
        loan_start_turn: number | null;
    }>;
};

export interface SectorTopologyOperationAxis {
    readonly objectives?: readonly string[];
}

export interface SectorTopologyOperation {
    readonly name: string;
    readonly type: CorpsOperation['type'];
    readonly phase: CorpsOperation['phase'];
    readonly sector_id?: string;
    readonly preparation_sub_phase?: CorpsOperation['preparation_sub_phase'];
    readonly participating_brigades: readonly FormationId[];
    readonly axes?: readonly SectorTopologyOperationAxis[];
    readonly objectives?: readonly string[];
}

export interface SectorTopologyCorpsCommand {
    readonly directive?: Readonly<{ priority_sector_id?: string }> | null;
    readonly active_operations: readonly SectorTopologyOperation[];
}

export interface SectorTopologyCampaignPlan {
    readonly valid_until_turn: number;
    readonly front_priorities: readonly Readonly<{
        corps_id: string;
        role: 'primary' | 'secondary' | 'economy' | 'contain';
    }>[];
}

export interface SectorTopologyNamedOfficerState {
    readonly status: string;
    readonly assigned_corps_id: string | null;
    readonly effective_competence_penalty?: number;
}

export interface SectorTopologyNamedOfficerData {
    readonly id: string;
    readonly competence: number;
    readonly aggressiveness: number;
}

export interface SectorTopologySpatialSnapshot {
    readonly adjacencyEntries: readonly (readonly [string, readonly string[]])[];
    readonly sharedBoundaryAdjacencyEntries: readonly (readonly [string, readonly string[]])[];
    readonly friendlyOsidsByFactionEntries: readonly (
        readonly [FactionId, readonly string[]]
    )[];
    readonly componentsByFactionEntries: readonly (
        readonly [FactionId, readonly (readonly [string, number])[]]
    )[];
    readonly computedAtTurn: number | null;
    readonly phase: 'pre-combat' | 'post-combat' | null;
}

export interface SectorTopologySolveInput {
    readonly provenance: Readonly<{
        turn: number;
        frontEdgeFingerprint: string;
        spatialComputedAtTurn: number | null;
        spatialPhase: 'pre-combat' | 'post-combat' | null;
    }>;
    readonly options: SectorTopologySolveOptions;
    readonly turn: number;
    readonly decisionMode: GameState['meta']['decision_mode'];
    readonly factionIds: readonly FactionId[];
    readonly frontEdges: readonly SectorTopologyFrontEdge[];
    readonly edges: readonly Readonly<EdgeRecord>[];
    readonly reverseMapEntries: readonly (readonly [string, readonly string[]])[];
    readonly centroidEntries: readonly (readonly [string, Readonly<OsidCentroid>])[];
    readonly spatial: SectorTopologySpatialSnapshot;
    readonly politicalControllers: Readonly<Record<string, string | null | undefined>>;
    readonly grazEastHerzegovinaActiveTurn: number | null | undefined;
    readonly controlEvents: readonly Readonly<ControlEvent>[];
    readonly lastSupplyStateByOsid: Readonly<Record<string, string>>;
    readonly campaignPlans: Readonly<Record<string, SectorTopologyCampaignPlan | null>>;
    readonly formations: Readonly<Record<FormationId, SectorTopologyFormation>>;
    readonly brigadeMovementOrders: Readonly<Record<FormationId, Readonly<BrigadeMovementOrder>>>;
    readonly brigadeMovementState: Readonly<Record<FormationId, Readonly<BrigadeMovementState>>>;
    readonly brigadePostureOrders: readonly Readonly<BrigadePostureOrder>[];
    readonly brigadeSectorOverride: Readonly<Record<string, string>>;
    readonly corpsCommand: Readonly<Record<FormationId, SectorTopologyCorpsCommand>>;
    readonly namedOfficers: Readonly<Record<string, SectorTopologyNamedOfficerState>>;
    readonly namedOfficerData: readonly SectorTopologyNamedOfficerData[];
}

export type SectorTopologyMutation =
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-location';
        readonly formationId: FormationId;
        readonly before: string | undefined;
        readonly after: string;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-entrenchment';
        readonly formationId: FormationId;
        readonly before: number | undefined;
        readonly after: 0;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-assigned-sub-segment';
        readonly formationId: FormationId;
        readonly before: string | undefined;
        readonly after: string | undefined;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'formation-assignment';
        readonly formationId: FormationId;
        readonly before: FormationAssignment | null;
        readonly after: FormationAssignment | null;
    }
    | {
        readonly sequence: number;
        readonly stage: string;
        readonly kind: 'unresolved-sector-brigades';
        readonly before: readonly FormationId[] | undefined;
        readonly after: readonly FormationId[];
    };

export interface SectorTopologyDiagnostic {
    readonly sequence: number;
    readonly stage: string;
    readonly kind: 'warning';
    readonly message: string;
    readonly mutationBoundary: number;
}

export interface SectorTopologyDeterministicTrace {
    readonly stages: readonly Readonly<{
        stage: string;
        mutationCount: number;
    }>[];
}

export interface SectorTopologySolveOutput {
    readonly sectors: Readonly<Record<string, CorpsFrontSector>>;
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    readonly trace: SectorTopologyDeterministicTrace;
}
