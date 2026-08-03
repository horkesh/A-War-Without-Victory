/**
 * R5 Phase 2e Task 2 — narrow, immutable read-snapshot types for the
 * corps-sector topology solve.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 6 (complete builder input inventory / read allow-list) — the
 * source of truth for which fields belong here.
 *
 * This is NOT a `GameState` clone. It is a narrow projection containing only
 * fields the current `buildCorpsFrontSectors` call graph (`buildFactionSectors`,
 * `ensureMinimumSectorCoverage`, `sealMergedSectorTruth`, `recoverDroppedFrontEdges`,
 * `applyFinalSectorOwnerTruthPass`, `mapOsidsToCorps`, `getPoliticalControllerOSID`
 * callers, `getCorpsArmyPriorities`, `buildCorpsCommanderProfiles`, `getCorpsCommander`,
 * and `commanderReviewAssignment`) actually reads, verified against the current
 * source (not an inherited summary) as of this Task 2 session. Every field-level
 * narrowing below was confirmed by reading the consumer function body directly:
 * - `getCorpsArmyPriorities` (bot_strategy.ts): `state.meta.decision_mode`,
 *   `state.meta.turn`; emergent-only: `state.political.control_events`,
 *   `state.political.last_supply_state_by_osid`, `state.political.political_controllers`,
 *   `state.military.campaign_plans[faction].valid_until_turn`/`.front_priorities[].{corps_id,role}`.
 * - `buildCorpsCommanderProfiles` -> `getCorpsCommander` (commander_override.ts,
 *   officer_system.ts): only `NamedOfficerState.{status,assigned_corps_id,
 *   effective_competence_penalty}` and `NamedOfficer.{id,competence,aggressiveness}`;
 *   plus `corps_command[corpsId].directive.priority_sector_id` and
 *   `corps_command[corpsId].active_operations[].{preparation_sub_phase,sector_id}`.
 * - `commanderReviewAssignment` and its five `apply*` helpers take no `GameState`
 *   parameter at all — they read only from already-derived `CorpsFrontSector[]`,
 *   `formations`, `armyPriorities`, and `commanderProfile`.
 * - `mapOsidsToCorps` / `getPoliticalControllerOSID` (sector_territory.ts,
 *   sector_building.ts): `state.political.political_controllers` only.
 *
 * Adding a field here requires updating plan section 6 and the static
 * full-state-read inventory test (`sector_topology_snapshot.test.ts`).
 */

import type {
    BrigadeMovementStatus,
    BrigadePosture,
    CorpsFrontSector,
    FactionId,
    FormationAssignment,
    FormationId,
    FormationKind,
    FormationReadinessState,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { EnsureMinimumSectorCoverageOccupancyStrategy } from './brigade_assignment.js';
import type { SectorFrontEdgeAdjacencyStrategy } from './corps_front_sectors.js';
import type { SectorFrontEdgeRelationTestCounters } from './sector_front_edge_relation.js';
import type { SectorTopologyMutation } from './sector_topology_mutation_journal.js';
import type { SectorTopologyDiagnostic } from './sector_topology_diagnostic.js';
import type { SectorTopologyDeterministicTrace } from './sector_topology_trace.js';

// ── 1. Invocation modes ──────────────────────────────────────────────────

export interface SectorTopologySolveOptions {
    readonly isFinalPass: boolean;
    readonly finalSaveGeometryProjection: boolean;
    readonly useFixedPointShortcuts: boolean;
    readonly occupancyStrategy: EnsureMinimumSectorCoverageOccupancyStrategy;
    readonly frontEdgeAdjacencyStrategy: SectorFrontEdgeAdjacencyStrategy;
    readonly frontEdgeRelationTestCounters?: SectorFrontEdgeRelationTestCounters;
}

// ── 4. Front truth ────────────────────────────────────────────────────────

export interface SectorTopologyFrontEdgeRow {
    readonly edge_id: string;
    readonly a: string;
    readonly b: string;
    readonly side_a: string | null;
    readonly side_b: string | null;
}

// ── 5. Operational graph ─────────────────────────────────────────────────

export interface SectorTopologyEdgeRow {
    readonly a: string;
    readonly b: string;
    readonly one_way?: boolean;
    readonly allow_self_loop?: boolean;
    readonly type?: string;
    readonly min_dist?: number;
    readonly shared_segments?: number;
}

// ── 6. Spatial snapshot ──────────────────────────────────────────────────

export interface SectorTopologySpatialSnapshot {
    readonly adjacency: ReadonlyMap<Osid, readonly Osid[]>;
    readonly sharedBoundaryAdjacency: ReadonlyMap<Osid, readonly Osid[]>;
    readonly friendlyOsidsByFaction: ReadonlyMap<FactionId, ReadonlySet<string>>;
    readonly componentsByFaction: ReadonlyMap<FactionId, ReadonlyMap<string, number>>;
}

// ── 9. Emergent commander priority ───────────────────────────────────────

export interface SectorTopologyControlEventRow {
    readonly turn: number;
    readonly settlement_id: string;
    readonly from: string | null;
    readonly to: string | null;
    readonly mun_id?: string;
}

export interface SectorTopologyFrontPriorityRow {
    readonly corps_id: string;
    readonly role: 'primary' | 'secondary' | 'economy' | 'contain';
}

export interface SectorTopologyCampaignPlanRow {
    readonly valid_until_turn: number;
    readonly front_priorities: readonly SectorTopologyFrontPriorityRow[];
}

// ── 10-14. Formation identity/lifecycle/geography/strength/assignment/eligibility, elite/enclave movement ──

export interface SectorTopologyEliteLoanSnapshot {
    readonly on_loan: boolean;
    readonly loaned_to_corps: string | null;
    readonly loan_start_turn: number | null;
}

export interface SectorTopologyFormation {
    readonly id: FormationId;
    readonly faction: FactionId;
    readonly status: 'active' | 'inactive';
    /** Read by `sectorCorpsRegionalEdgeAffinity`'s Posavina/northwest text-match special case. */
    readonly name: string;
    readonly kind?: FormationKind;
    readonly readiness?: FormationReadinessState;
    readonly lifecycle_status?: 'active' | 'forming' | 'disbanded' | 'merged' | 'destroyed' | 'withdrawn' | 'displaced';
    readonly tags?: readonly string[];
    readonly corps_id?: string | null;
    readonly location_osid?: string;
    readonly home_osid?: string;
    readonly hq_osid?: string;
    readonly hq_sid?: string;
    readonly personnel?: number;
    readonly personnel_lent_by_tg?: Readonly<Record<string, number>>;
    readonly cohesion?: number;
    readonly experience?: number;
    readonly honor?: 'slavna' | 'viteska';
    readonly assignment: FormationAssignment | null;
    readonly assigned_sub_segment_id?: string;
    readonly posture?: BrigadePosture;
    readonly disrupted?: boolean;
    readonly disrupted_turns?: number;
    readonly stranded_status?: 'none' | 'holding' | 'reconnected' | 'collapsed';
    readonly elite_loan_state?: SectorTopologyEliteLoanSnapshot;
}

// ── 15. Movement ownership / 16. player sector direction ────────────────

export interface SectorTopologyBrigadeMovementState {
    readonly status: BrigadeMovementStatus;
    readonly stance?: 'combat' | 'column';
    readonly destination_sids?: readonly string[];
    readonly path?: readonly string[];
    readonly turns_remaining?: number;
}

export interface SectorTopologyBrigadeMovementOrder {
    readonly destination_sids: readonly string[];
    readonly stance?: 'combat' | 'column';
}

export interface SectorTopologyBrigadePostureOrder {
    readonly brigade_id: FormationId;
    readonly posture: BrigadePosture;
}

// ── 17. Corps/operation truth ────────────────────────────────────────────

export interface SectorTopologyOperationAxisRow {
    readonly axis_id: string;
    readonly assigned_brigades: readonly FormationId[];
    /** Read by `operationObjectives` (brigade_assignment.ts) via `hasActiveEnemyFeintAgainstSector`. */
    readonly objectives?: readonly string[];
}

export interface SectorTopologyOperationRow {
    /** CorpsOperation has no separate `id` field — `name` is the identity key. */
    readonly name: string;
    readonly type: string;
    readonly phase: 'planning' | 'execution' | 'recovery';
    readonly sector_id?: string;
    readonly preparation_sub_phase?: string;
    readonly participating_brigades: readonly FormationId[];
    readonly axes?: readonly SectorTopologyOperationAxisRow[];
    readonly objectives?: readonly string[];
}

export interface SectorTopologyCorpsCommandRow {
    readonly directive_priority_sector_id?: string;
    readonly active_operations: readonly SectorTopologyOperationRow[];
}

// ── 18. Officer profile ──────────────────────────────────────────────────
//
// Verified narrow surface (see file docstring): buildCorpsCommanderProfiles
// via getCorpsCommander reads only these five fields total. No lookup may
// fall through to live state — the officer id sort order below must match
// getCorpsCommander's `Object.keys(officers).sort(strictCompare)` traversal.

export interface SectorTopologyNamedOfficerStateRow {
    readonly officer_id: string;
    readonly status: string;
    readonly assigned_corps_id: string | null;
    readonly effective_competence_penalty: number;
}

export interface SectorTopologyNamedOfficerRow {
    readonly id: string;
    readonly competence: number;
    readonly aggressiveness: number;
}

// ── Complete solve input ─────────────────────────────────────────────────

export interface SectorTopologySolveInput {
    readonly options: SectorTopologySolveOptions;
    readonly turn: number;
    readonly decisionMode: 'historical' | 'emergent' | undefined;
    readonly factionIds: readonly FactionId[];
    readonly frontEdges: readonly SectorTopologyFrontEdgeRow[];
    readonly edges: readonly SectorTopologyEdgeRow[];
    readonly reverseMapEntries: ReadonlyMap<string, readonly string[]> | null;
    readonly centroids: OsidCentroidMap | undefined;
    readonly spatial: SectorTopologySpatialSnapshot | undefined;
    readonly politicalControllers: Readonly<Record<string, string | null | undefined>>;
    readonly grazEastHerzegovinaActiveTurn: number | null | undefined;
    readonly controlEvents: readonly SectorTopologyControlEventRow[];
    readonly lastSupplyStateByOsid: Readonly<Record<string, string>> | undefined;
    readonly campaignPlansByFaction: ReadonlyMap<FactionId, SectorTopologyCampaignPlanRow | null>;
    readonly formations: ReadonlyMap<FormationId, SectorTopologyFormation>;
    readonly formationIdsSorted: readonly FormationId[];
    readonly brigadeMovementState: ReadonlyMap<FormationId, SectorTopologyBrigadeMovementState>;
    readonly brigadeMovementOrders: ReadonlyMap<FormationId, SectorTopologyBrigadeMovementOrder>;
    readonly brigadePostureOrders: readonly SectorTopologyBrigadePostureOrder[];
    readonly brigadeSectorOverride: Readonly<Record<string, string>> | undefined;
    readonly corpsCommandByCorpsId: ReadonlyMap<string, SectorTopologyCorpsCommandRow>;
    readonly namedOfficers: ReadonlyMap<string, SectorTopologyNamedOfficerStateRow>;
    readonly namedOfficerData: readonly SectorTopologyNamedOfficerRow[];
}

// ── 7.1 Pure solve output ────────────────────────────────────────────────

export type { CorpsFrontSector };

export interface SectorTopologySolveOutput {
    readonly sectors: Readonly<Record<string, CorpsFrontSector>>;
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    readonly trace: SectorTopologyDeterministicTrace;
}
