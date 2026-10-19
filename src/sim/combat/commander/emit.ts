/**
 * emit.ts — EMIT phase for v0.8 Corps Commander Intelligence.
 *
 * Converts the commander's internal decisions into the existing output types
 * that downstream systems expect: CorpsDirective, CorpsOperation, SectorStance.
 * This is the bridge between new commander intelligence and existing execution pipeline.
 *
 * Downstream systems (sector_offensive, combat resolution, brigade AI) don't change.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Directive emission — converts commander decisions to engine outputs
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Which ready plans become CorpsOperations; what CorpsDirective is issued
 * WRITES:    active_operations (creates CorpsOperation from ready plan), CorpsDirective, SectorStance
 * READS:     PlanDecision (ready plans), AllocationResult (surplus pool), DecideOutput (stance)
 * MUST NOT:  write brigade_movement_orders — only emits directives that T2 routing executes
 *
 * UPSTREAM:  plan.ts (ready plans), allocate.ts (surplus pool), decide.ts (stance adjustments)
 * DOWNSTREAM: sector_offensive.ts (operation lifecycle), bot_brigade_ai_osid.ts (directive execution)
 *
 * TRUTH INVARIANTS:
 * - Bridge between new commander intelligence and existing execution pipeline
 * - Only emit.ts creates CorpsOperations from commander plans (not bot_corps_operations.ts)
 * - Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now()
 *
 * MOVEMENT TIER: T1 — Strategic Intent Owner (issues directives; no movement applied here)
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    CorpsFrontSector,
    CorpsDirective,
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    SectorStance,
} from '../../../state/game_state.js';
import { isEligibleOperationFormation, MIN_ATTACK_PERSONNEL } from '../../../state/formation_constants.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { spatialFriendlyDistance, spatialSameComponent } from '../../spatial_context.js';
import { buildCommanderOperation, buildProbeOperation, derivePrimarySectorForBrigades, getMaxOperationSlots, getOperationSlotUsageForOperations } from '../corps_operation_helpers.js';
import { isBrigadeEligibleForOperationObjectives } from '../enclave_resilience.js';
import { pickOperationName } from '../operation_names.js';
import { emitCommanderCreationRecord, emitLocalOccupationCandidateRecord, isReasonCodeTopicEnabled } from '../reason_code_debug.js';
import { buildTerrainCache, predictCombatOutcome, type CombatPrediction } from '../combat_predictor.js';
import { buildOfficerCombatLookup } from '../combat_math.js';
import { isOutcomeSufficientForAttack } from '../bot_brigade_targeting.js';
import {
    getCohesionCautionBiasMultiplier,
    getEmbargoOpsHesitationMultiplier,
    getIntlStandingOpsHesitationMultiplier,
    getMilitaryCredibilityCautionBiasMultiplier,
    getPatronConfidenceOpsHesitationMultiplier,
} from '../sector_offensive.js';
import { getPoliticalControllerOSID } from '../../../state/settlement_control.js';
import { isRbihHrhbCombatBlocked } from '../../early_war/alliance_update.js';
import { shouldGrazBlockAttack } from '../../local_truces.js';
import { getHeadQueuedPrePlannedBrigadeIds } from '../pre_planned_operations.js';
import type {
    CommanderBeliefState,
    CommanderBriefing,
    CommanderLesson,
    CommanderOutput,
    CommanderPlanStatus,
    CommanderState,
    BrigadeEvaluation,
    ForceAssessment,
    OfficerPersonality,
    OperationHistoryEntry,
    SectorActivityEntry,
    ThreatAssessment,
    ZoneAssessment,
    ZoneId,
    ZonePosture,
} from './commander_state.js';
import type { AllocationResult } from './allocate.js';
import type { PlanDecision } from './plan.js';
import { isBoundedIsolatedEnemyPosition, MIN_BRIGADES_FOR_PLAN } from './plan.js';
import { COMMITMENT_RATIO_UNBOUNDED_PERSISTED } from './zone_detection.js';
import type { DecisionResult } from './decide.js';
import { augmentOffensiveTargetsWithShifts } from './bot_priority_shift_augmentation.js';
import { botOrdersPerfTime } from '../_perf_profile_bot_orders.js';
import { shouldLaunchProbeInstead, type ProbeLaunchDecisionTrace } from '../bot_corps_directives.js';
import { getStalestSectorIntelConfidence } from '../sector_intel.js';
import { computePlanningDuration } from '../sector_offensive_axis_helpers.js';
import { canFormationReachAssemblyInTime } from '../sector_offensive_launch_helpers.js';
import { mayEliteJoinOperation } from '../historical_elite_reservations.js';

export function capOpportunityOperationParticipants(
    participantIds: readonly string[],
    source: 'pre_planned' | 'reactive' | 'opportunity',
    requiredBrigades: number,
): string[] {
    return source === 'opportunity'
        ? participantIds.slice(0, Math.max(0, requiredBrigades))
        : [...participantIds];
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Default max simultaneous attackers per target OSID. */
const DEFAULT_MAX_ATTACKERS = 3;

/** Max reserve fraction clamp. */
const MAX_RESERVE_FRACTION = 0.5;

/** Max sector activity log entries to retain. */
const MAX_SECTOR_ACTIVITY_LOG = 20;

/** Max operation history entries to retain in CommanderState. */
const MAX_OPERATION_HISTORY_ENTRIES = 20;

/** Minimal local group for reducing a bounded position without stripping the corps front. */
const ISOLATED_POSITION_OPERATION_MIN_BRIGADES = 2;
const ISOLATED_POSITION_OPERATION_MAX_BRIGADES = 3;

/** Max BFS hops from brigade location to first objective OSID (through friendly territory). */
const MAX_REACHABILITY_HOPS = 8;

/** Max fraction of an adjacent sector's total assigned brigades that may attach to an op. */
const ADJACENT_SECTOR_ATTACH_RATE = 0.33;
/** Minimum brigades that must remain in an adjacent sector after attachment. */
const ADJACENT_SECTOR_MIN_RESIDUAL = 1;

/** Front density floor shared with sector staffing: one brigade per eight edges. */
const FRONT_DENSITY_EDGES_PER_BRIGADE = 8;

export function selectBoundedPositionDonorAttachments(
    primarySector: CorpsFrontSector,
    corpsSectors: readonly CorpsFrontSector[],
    rankedCandidateIds: readonly string[],
    stationaryLineStaffBySector: ReadonlyMap<string, ReadonlySet<string>>,
    adjacencyMap: ReadonlyMap<string, readonly string[]>,
    maxParticipants: number,
): { brigade_ids: string[]; sector_ids: string[] } {
    const primaryNeighborSet = new Set<string>();
    for (const osid of primarySector.territory_osids) {
        for (const neighbor of adjacencyMap.get(osid) ?? []) primaryNeighborSet.add(neighbor);
    }
    const donors = corpsSectors
        .filter((sector) => sector.corps_id === primarySector.corps_id && sector.sector_id !== primarySector.sector_id)
        .filter((sector) => sector.territory_osids.some((osid) => primaryNeighborSet.has(osid)))
        .filter((sector) => Number.isFinite(sector.length_edges) && sector.length_edges > 0)
        .sort((left, right) => strictCompare(left.sector_id, right.sector_id));

    const donorByBrigade = new Map<string, CorpsFrontSector>();
    const lineStaffBySector = new Map<string, ReadonlySet<string>>();
    const minimumLineBySector = new Map<string, number>();
    const selectedLineStaffBySector = new Map<string, number>();
    let aggregateActiveStaff = 0;
    for (const donor of donors) {
        const stationaryLineStaff = stationaryLineStaffBySector.get(donor.sector_id) ?? new Set<string>();
        const activeAssigned = donor.assigned_brigade_ids.filter((id) => stationaryLineStaff.has(id));
        const minimumLine = Math.max(1, Math.ceil(donor.length_edges / FRONT_DENSITY_EDGES_PER_BRIGADE));
        aggregateActiveStaff += activeAssigned.length;
        lineStaffBySector.set(donor.sector_id, stationaryLineStaff);
        minimumLineBySector.set(donor.sector_id, minimumLine);
        selectedLineStaffBySector.set(donor.sector_id, 0);
        for (const brigadeId of donor.assigned_brigade_ids) donorByBrigade.set(brigadeId, donor);
    }

    const aggregateBudget = Math.min(
        Math.max(0, maxParticipants - 1),
        Math.floor(aggregateActiveStaff * ADJACENT_SECTOR_ATTACH_RATE),
    );
    const brigadeIds: string[] = [];
    const sectorIds = new Set<string>();
    for (const brigadeId of rankedCandidateIds) {
        if (brigadeIds.length >= aggregateBudget) break;
        const donor = donorByBrigade.get(brigadeId);
        if (!donor) continue;
        const lineStaff = lineStaffBySector.get(donor.sector_id) ?? new Set<string>();
        const selectedLineStaff = selectedLineStaffBySector.get(donor.sector_id) ?? 0;
        const candidateUsesLineStaff = lineStaff.has(brigadeId) ? 1 : 0;
        const retainedLineStaff = lineStaff.size - selectedLineStaff - candidateUsesLineStaff;
        if (retainedLineStaff < (minimumLineBySector.get(donor.sector_id) ?? Number.POSITIVE_INFINITY)) continue;
        brigadeIds.push(brigadeId);
        sectorIds.add(donor.sector_id);
        selectedLineStaffBySector.set(donor.sector_id, selectedLineStaff + candidateUsesLineStaff);
    }
    return { brigade_ids: brigadeIds, sector_ids: [...sectorIds].sort(strictCompare) };
}

/** Min attack outcome by zone posture (most restrictive → least). */
const POSTURE_MIN_OUTCOME: Record<ZonePosture, CorpsDirective['min_attack_outcome']> = {
    besieged: 'decisive_victory',
    defending: 'victory',
    balanced: 'costly_victory',
    projecting: 'stalemate',
};

/** Plan statuses that produce operations. */
const ACTIVE_PLAN_STATUSES: ReadonlySet<CommanderPlanStatus> = new Set([
    'executing',
    'ready',
]);

function isCombatReadyParticipant(
    briefing: CommanderBriefing,
    brigadeId: string,
): boolean {
    const brigade = briefing.brigades.find((candidate) => candidate.id === brigadeId);
    if (!brigade) return false;
    if (!isEligibleOperationFormation(brigade)) return false;
    if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
    if ((brigade.disrupted_turns ?? 0) > 0) return false;
    const movementState = briefing.state_ref?.military?.brigade_movement_state?.[brigadeId];
    if (movementState?.status === 'in_transit') return false;
    return true;
}

type CommanderCreationOverlapClause = 'same_sector' | 'shared_objective' | 'shared_participant';

interface CommanderCreationOverlapPredicates {
    same_sector: boolean;
    shared_objective: boolean | null;
    shared_participant: boolean | null;
    first_matched_clause: CommanderCreationOverlapClause | null;
}

function operationsOverlap(
    left: Pick<CorpsOperation, 'sector_id' | 'objectives' | 'participating_brigades'>,
    right: Pick<CorpsOperation, 'sector_id' | 'objectives' | 'participating_brigades'>,
    observe?: (predicates: CommanderCreationOverlapPredicates) => void,
): boolean {
    const sameSector = Boolean(left.sector_id && right.sector_id && left.sector_id === right.sector_id);
    if (sameSector) {
        observe?.({
            same_sector: true,
            shared_objective: null,
            shared_participant: null,
            first_matched_clause: 'same_sector',
        });
        return true;
    }
    const leftObjectives = new Set(left.objectives ?? []);
    const sharedObjective = (right.objectives ?? []).some((objective) => leftObjectives.has(objective));
    if (sharedObjective) {
        observe?.({
            same_sector: false,
            shared_objective: true,
            shared_participant: null,
            first_matched_clause: 'shared_objective',
        });
        return true;
    }
    const leftBrigades = new Set(left.participating_brigades ?? []);
    const sharedParticipant = (right.participating_brigades ?? []).some((brigadeId) => leftBrigades.has(brigadeId));
    observe?.({
        same_sector: false,
        shared_objective: false,
        shared_participant: sharedParticipant,
        first_matched_clause: sharedParticipant ? 'shared_participant' : null,
    });
    return sharedParticipant;
}

/** Plan action → plan_updates action mapping (plan.ts uses past tense). */
const PLAN_ACTION_MAP: Record<string, 'advance' | 'suspend' | 'abandon' | undefined> = {
    advanced: 'advance',
    suspended: 'suspend',
    abandoned: 'abandon',
};

const BUILD_OPERATIONS_PROFILE_PREFIX = 'commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations';

type PredictedProbeTarget = {
    osid: string;
    prediction: CombatPrediction;
};

type LocalOccupationCandidate = {
    brigade: BrigadeEvaluation;
    sector_id: string;
    target_osid: string;
    prediction: CombatPrediction;
    participating_brigade_ids: FormationId[];
    /** Planning may begin while the sector still requires an operation-owned intelligence probe. */
    prepare_before_intel: boolean;
};

function predictDirectEnemyTargets(
    briefing: CommanderBriefing,
    probeBrigadeId: string,
    directEnemyTargets: ReadonlySet<string>,
    adjacency: Map<any, any>,
    terrainCache: Record<string, number> | null,
    osidPopulationMap?: CommanderBriefing['osid_population_map'],
): PredictedProbeTarget[] {
    if (directEnemyTargets.size === 0 || !briefing.state_ref || !briefing.reverse_map) {
        return [];
    }

    const terrainMultByOsid = terrainCache ?? {};
    const officerCombatLookup = briefing.state_ref.military.named_officers && briefing.state_ref.military.named_officer_data
        ? botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.predictDirectTargets.officerIndex`,
            () => buildOfficerCombatLookup(briefing.state_ref!),
        )
        : undefined;
    const profilePrefix = `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.predictDirectTargets.predictCombatOutcome`;
    const predictedTargets: PredictedProbeTarget[] = [];
    for (const target of [...directEnemyTargets].sort(strictCompare)) {
        const targetController = getPoliticalControllerOSID(
            briefing.state_ref,
            target,
            briefing.reverse_map,
        );
        if (targetController === null || targetController === briefing.faction) {
            continue;
        }

        const prediction = predictCombatOutcome(
            briefing.state_ref,
            probeBrigadeId,
            target,
            adjacency,
            briefing.reverse_map,
            terrainMultByOsid,
            'attack',
            undefined,
            briefing.supply_by_osid ?? undefined,
            osidPopulationMap,
            undefined,
            briefing.ethnic_map ?? undefined,
            profilePrefix,
            officerCombatLookup,
        );
        if (prediction) {
            predictedTargets.push({ osid: target, prediction });
        }
    }

    return predictedTargets;
}

/**
 * P-A admission sanity check (owner packet 2026-09-18): can this formation physically reach the
 * commander operation's required assembly/approach area inside the operation's own assembly
 * budget? Delegates to `canFormationReachAssemblyInTime`, which uses the production
 * terrain-weighted column model. Fail-open when the briefing lacks the state/terrain needed to
 * judge — this must not suppress an operation for missing data.
 */
function canReachAssemblyInTime(
    briefing: CommanderBriefing,
    brigadeId: FormationId,
    objective: string,
    planningDuration: number,
): boolean {
    if (!briefing.state_ref) return true;
    return canFormationReachAssemblyInTime(
        briefing.state_ref,
        brigadeId,
        briefing.corps_id,
        briefing.faction,
        objective,
        planningDuration,
        briefing.spatial.adjacency as Map<string, string[]>,
        briefing.reverse_map ?? null,
        briefing.terrain_data ?? null,
    );
}

type LocalOccupationCandidateClass =
    | 'sector-listed_single'
    | 'sector-listed_group'
    | 'adjacency-only_single'
    | 'adjacency-only_group';

interface LocalOccupationPredicateObservation {
    predicate: string;
    passed: boolean;
}

interface LocalOccupationAttemptObservation {
    candidate_class: LocalOccupationCandidateClass;
    sector_id: string | null;
    target_osid: string | null;
    considered_roster: string[] | null;
    predicates: LocalOccupationPredicateObservation[];
    outcome: 'rejected' | 'qualified';
    first_failed_predicate: string | null;
}

interface LocalOccupationSurplusObservation {
    brigade_id: string;
    predicates: LocalOccupationPredicateObservation[];
    first_failed_predicate: string | null;
}

interface LocalOccupationGroupRosterObservation {
    candidate_class: Extract<LocalOccupationCandidateClass, 'sector-listed_group' | 'adjacency-only_group'>;
    roster_path: 'projected_surplus' | 'staged_primary_garrison';
    sector_id: string;
    target_osid: string;
    brigade_id: string;
    predicates: LocalOccupationPredicateObservation[];
    outcome: 'rejected' | 'eligible';
    first_failed_predicate: string | null;
}

interface LocalOccupationSearchObservation {
    surplus: Map<string, LocalOccupationSurplusObservation>;
    group_roster: LocalOccupationGroupRosterObservation[];
    attempts: LocalOccupationAttemptObservation[];
    class_outcomes: Array<{ candidate_class: LocalOccupationCandidateClass; outcome: 'selected' | 'rejected' | 'no_enumerated_candidate' | 'skipped_after_selection' }>;
    precondition_failure: string | null;
}

interface LocalOccupationSearchOptions {
    only_class?: LocalOccupationCandidateClass;
    enumerate_all_qualified?: boolean;
    suppress_profile?: boolean;
}

function recordLocalOccupationGroupRoster(
    observation: LocalOccupationSearchObservation | undefined,
    candidateClass: Extract<LocalOccupationCandidateClass, 'sector-listed_group' | 'adjacency-only_group'>,
    rosterPath: LocalOccupationGroupRosterObservation['roster_path'],
    sectorId: string,
    targetOsid: string,
    brigadeId: string,
    predicates: LocalOccupationPredicateObservation[] | undefined,
    eligible: boolean,
): void {
    if (!observation || !predicates) return;
    observation.group_roster.push({
        candidate_class: candidateClass,
        roster_path: rosterPath,
        sector_id: sectorId,
        target_osid: targetOsid,
        brigade_id: brigadeId,
        predicates: [...predicates],
        outcome: eligible ? 'eligible' : 'rejected',
        first_failed_predicate: predicates.find((entry) => !entry.passed)?.predicate ?? null,
    });
}

const LOCAL_OCCUPATION_CLASSES: readonly LocalOccupationCandidateClass[] = [
    'sector-listed_single',
    'sector-listed_group',
    'adjacency-only_single',
    'adjacency-only_group',
];

function observeLocalOccupationPredicate(
    predicates: LocalOccupationPredicateObservation[] | undefined,
    predicate: string,
    passed: boolean,
): boolean {
    predicates?.push({ predicate, passed });
    return passed;
}

function observeLocalOccupationSurplusPredicate(
    observation: LocalOccupationSearchObservation | undefined,
    brigadeId: string,
    predicate: string,
    passed: boolean,
): boolean {
    if (!observation) return passed;
    let entry = observation.surplus.get(brigadeId);
    if (!entry) {
        entry = { brigade_id: brigadeId, predicates: [], first_failed_predicate: null };
        observation.surplus.set(brigadeId, entry);
    }
    entry.predicates.push({ predicate, passed });
    if (!passed && entry.first_failed_predicate === null) entry.first_failed_predicate = predicate;
    return passed;
}

function recordLocalOccupationAttempt(
    observation: LocalOccupationSearchObservation | undefined,
    candidateClass: LocalOccupationCandidateClass,
    sectorId: string | null | undefined,
    targetOsid: string | null,
    consideredRoster: readonly string[] | null,
    predicates: LocalOccupationPredicateObservation[] | undefined,
    qualified: boolean,
): void {
    if (!observation || !predicates) return;
    observation.attempts.push({
        candidate_class: candidateClass,
        sector_id: sectorId ?? null,
        target_osid: targetOsid,
        considered_roster: consideredRoster === null ? null : [...consideredRoster].sort(strictCompare),
        predicates: [...predicates],
        outcome: qualified ? 'qualified' : 'rejected',
        first_failed_predicate: predicates.find((entry) => !entry.passed)?.predicate ?? null,
    });
}

function emitLocalOccupationSearchObservation(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    observation: LocalOccupationSearchObservation,
    result: LocalOccupationCandidate | null,
): void {
    const base = {
        schema: 'local_occupation_candidate.v1',
        faction: briefing.faction,
        corps_id: briefing.corps_id,
        turn: briefing.turn,
    };
    emitLocalOccupationCandidateRecord({
        ...base,
        phase: 'search_start',
        surplus_inventory: allocation.surplus_pool.map((entry) => entry.brigade_id).sort(strictCompare),
    });
    for (const entry of [...observation.surplus.values()].sort((left, right) => strictCompare(left.brigade_id, right.brigade_id))) {
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'surplus_filter',
            brigade_id: entry.brigade_id,
            target_osid: null,
            considered_roster: null,
            predicates: entry.predicates,
            outcome: entry.first_failed_predicate === null ? 'eligible' : 'rejected',
            first_failed_predicate: entry.first_failed_predicate,
        });
    }
    for (const entry of [...observation.group_roster].sort((left, right) => (
        LOCAL_OCCUPATION_CLASSES.indexOf(left.candidate_class) - LOCAL_OCCUPATION_CLASSES.indexOf(right.candidate_class)
        || strictCompare(left.sector_id, right.sector_id)
        || strictCompare(left.target_osid, right.target_osid)
        || strictCompare(left.roster_path, right.roster_path)
        || strictCompare(left.brigade_id, right.brigade_id)
    ))) {
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'group_roster',
            ...entry,
            considered_roster: null,
        });
    }
    for (const attempt of observation.attempts) {
        emitLocalOccupationCandidateRecord({ ...base, phase: 'candidate', ...attempt });
    }
    const eligibleCount = [...observation.surplus.values()].filter((entry) => entry.first_failed_predicate === null).length;
    emitLocalOccupationCandidateRecord({
        ...base,
        phase: 'search_end',
        outcome: observation.precondition_failure != null
            ? 'skipped_precondition'
            : eligibleCount === 0
                ? 'no_eligible_surplus'
                : result
                    ? 'selected'
                    : observation.attempts.length === 0
                        ? 'no_enumerated_candidate'
                        : 'rejected',
        precondition_failure: observation.precondition_failure,
        selected_class: result ? observation.class_outcomes.find((entry) => entry.outcome === 'selected')?.candidate_class ?? null : null,
        selected_sector_id: result?.sector_id ?? null,
        selected_target_osid: result?.target_osid ?? null,
        selected_roster: result ? [...result.participating_brigade_ids].sort(strictCompare) : null,
        selection_scope: 'candidate_search',
        downstream_operation_status: 'unmeasured',
        class_outcomes: observation.class_outcomes,
    });
}

function emitVaroslukSkippedGroupShadow(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    actualResult: LocalOccupationCandidate,
    actualClass: LocalOccupationCandidateClass | null,
): void {
    if (briefing.faction !== 'RBiH'
        || briefing.corps_id !== 'arbih_3rd_corps'
        || actualClass !== 'adjacency-only_single'
        || actualResult.target_osid !== 'op:travnik:varosluk') return;

    const base = {
        schema: 'local_occupation_skipped_alternative.v1',
        shadow: true,
        actual_selected: false,
        evaluation_scope: 'adjacency-only_group_only',
        coverage_status: 'partial_skipped_class_only',
        candidate_disposition: 'shadow_only_never_selected_or_emitted',
        lawful_operation_status: 'unmeasured',
        operation_construction_status: 'not_performed',
        emission_status: 'not_performed',
        faction: briefing.faction,
        corps_id: briefing.corps_id,
        turn: briefing.turn,
        actual_selected_class: actualClass,
        actual_selected_sector_id: actualResult.sector_id,
        actual_selected_target_osid: actualResult.target_osid,
        actual_selected_roster: [...actualResult.participating_brigade_ids].sort(strictCompare),
        admission_status: 'unmeasured',
        officer_ownership_status: 'unmeasured',
        launch_status: 'unmeasured',
    };
    emitLocalOccupationCandidateRecord({
        ...base,
        phase: 'skipped_alternative_shadow_start',
        outcome: 'started',
    });
    let detached: { briefing: CommanderBriefing; allocation: AllocationResult };
    try {
        detached = structuredClone({ briefing, allocation });
    } catch {
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'skipped_alternative_shadow_end',
            outcome: 'isolation_unavailable',
            enumerated_count: 0,
            roster_count: 0,
            attempt_count: 0,
            qualified_count: 0,
            rejected_count: 0,
        });
        return;
    }

    try {
    const shadowObservation: LocalOccupationSearchObservation = {
        surplus: new Map(),
        group_roster: [],
        attempts: [],
        class_outcomes: [],
        precondition_failure: null,
    };
    findLocalOccupationCandidateImpl(
        detached.briefing,
        detached.allocation,
        shadowObservation,
        { only_class: 'adjacency-only_group', enumerate_all_qualified: true, suppress_profile: true },
    );

    for (const entry of shadowObservation.group_roster) {
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'skipped_alternative_shadow_roster',
            ...entry,
            considered_roster: null,
            overlap: { evaluated: false, found: null, checks: [] },
        });
    }
    for (const attempt of shadowObservation.attempts) {
        const checks: Array<CommanderCreationOverlapPredicates & {
            existing_operation: CommanderCreationOperationTuple;
        }> = [];
        let firstMatchedClause: CommanderCreationOverlapClause | null = null;
        let conflictingOperation: CommanderCreationOperationTuple | null = null;
        let overlapFound: boolean | null = null;
        if (attempt.outcome === 'qualified' && attempt.sector_id && attempt.target_osid && attempt.considered_roster) {
            const candidate = {
                sector_id: attempt.sector_id,
                objectives: [attempt.target_osid],
                participating_brigades: attempt.considered_roster,
            };
            const conflict = detached.briefing.active_operations.find((existing) => operationsOverlap(
                existing,
                candidate,
                (predicates) => {
                    const existingOperation = commanderCreationOperationTuple(detached.briefing.corps_id, existing);
                    checks.push({ existing_operation: existingOperation, ...predicates });
                    if (predicates.first_matched_clause !== null && firstMatchedClause === null) {
                        firstMatchedClause = predicates.first_matched_clause;
                        conflictingOperation = existingOperation;
                    }
                },
            ));
            overlapFound = conflict != null;
        }
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'skipped_alternative_shadow',
            ...attempt,
            overlap: attempt.outcome === 'qualified'
                ? {
                    evaluated: true,
                    found: overlapFound,
                    checks,
                    first_matched_clause: firstMatchedClause,
                    conflicting_operation: conflictingOperation,
                }
                : { evaluated: false, found: null, checks: [] },
        });
    }
    const qualifiedCount = shadowObservation.attempts.filter((entry) => entry.outcome === 'qualified').length;
    emitLocalOccupationCandidateRecord({
        ...base,
        phase: 'skipped_alternative_shadow_end',
        outcome: shadowObservation.attempts.length === 0
            ? 'no_enumerated_candidate'
            : qualifiedCount > 0
                ? 'qualified_candidate_observed'
                : 'rejected_only',
        enumerated_count: shadowObservation.attempts.length,
        roster_count: shadowObservation.group_roster.length,
        attempt_count: shadowObservation.attempts.length,
        qualified_count: qualifiedCount,
        rejected_count: shadowObservation.attempts.length - qualifiedCount,
    });
    } catch {
        emitLocalOccupationCandidateRecord({
            ...base,
            phase: 'skipped_alternative_shadow_end',
            outcome: 'shadow_evaluation_failed',
            enumerated_count: 0,
            roster_count: 0,
            attempt_count: 0,
            qualified_count: 0,
            rejected_count: 0,
        });
    }
}

/**
 * Find a surplus brigade that is already adjacent to a bounded enemy pocket it
 * can defeat by itself. This is deliberately evaluated before the generic
 * highest-fitness probe choice: fitness elsewhere on the front must not hide a
 * legal local occupation opportunity.
 */
function findLocalOccupationCandidate(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
): LocalOccupationCandidate | null {
    if (!isReasonCodeTopicEnabled('local_occupation_candidate')) {
        return findLocalOccupationCandidateImpl(briefing, allocation, undefined);
    }
    const observation: LocalOccupationSearchObservation = {
        surplus: new Map(),
        group_roster: [],
        attempts: [],
        class_outcomes: [],
        precondition_failure: null,
    };
    const result = findLocalOccupationCandidateImpl(briefing, allocation, observation);
    emitLocalOccupationSearchObservation(briefing, allocation, observation, result);
    if (result) {
        const selectedClass = observation.class_outcomes.find((entry) => entry.outcome === 'selected')?.candidate_class ?? null;
        emitVaroslukSkippedGroupShadow(briefing, allocation, result, selectedClass);
    }
    return result;
}

function findLocalOccupationCandidateImpl(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    observation: LocalOccupationSearchObservation | undefined,
    options: LocalOccupationSearchOptions = {},
): LocalOccupationCandidate | null {
    const stateRef = briefing.state_ref;
    const reverseMap = briefing.reverse_map;
    const osidPopulationMap = briefing.osid_population_map;
    if (!stateRef || !reverseMap || !osidPopulationMap) {
        if (observation) observation.precondition_failure = !stateRef
            ? 'state_ref_present'
            : !reverseMap
                ? 'reverse_map_present'
                : 'osid_population_map_present';
        return null;
    }
    if (briefing.turn <= 20) {
        if (observation) observation.precondition_failure = 'turn_after_20';
        return null;
    }
    // A standalone local opportunity has no proposal identity for the Level-1
    // approval flow. Fail closed instead of admitting it around player authority.
    if ((stateRef.meta?.autonomy_level ?? 0) === 1) {
        if (observation) observation.precondition_failure = 'autonomy_not_level_1';
        return null;
    }
    const queuedHistoricalParticipants = getHeadQueuedPrePlannedBrigadeIds(stateRef);
    const activeOperationParticipants = new Set(
        briefing.active_operations
            .flatMap((operation) => operation.participating_brigades ?? []),
    );
    const executingOperationObjectives = new Set(
        briefing.active_operations
            .filter((operation) => operation.phase === 'execution')
            .flatMap((operation) => operation.objectives ?? []),
    );
    const corpsSectors = briefing.sectors
        .filter((sector) => sector.corps_id === briefing.corps_id)
        .sort((left, right) => strictCompare(left.sector_id, right.sector_id));
    const formationById = Object.fromEntries(briefing.brigades.map((brigade) => [brigade.id, brigade]));
    const terrainCache = buildTerrainCache(reverseMap);
    const candidates = (observation
        ? allocation.surplus_pool
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'combat_effective_and_not_disrupted',
            evaluation.is_combat_effective && !evaluation.is_disrupted,
        ))
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'elite_hold_allows_operation',
            mayEliteJoinOperation(evaluation.brigade_id, briefing.turn),
        ))
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'not_queued_historical_participant',
            !queuedHistoricalParticipants.has(evaluation.brigade_id),
        ))
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'not_active_operation_participant',
            !activeOperationParticipants.has(evaluation.brigade_id),
        ))
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'combat_ready',
            isCombatReadyParticipant(briefing, evaluation.brigade_id),
        ))
        .filter((evaluation) => observeLocalOccupationSurplusPredicate(
            observation,
            evaluation.brigade_id,
            'not_on_elite_loan',
            formationById[evaluation.brigade_id]?.elite_loan_state?.on_loan !== true,
        ))
        : allocation.surplus_pool
            .filter((evaluation) => evaluation.is_combat_effective && !evaluation.is_disrupted)
            .filter((evaluation) => mayEliteJoinOperation(evaluation.brigade_id, briefing.turn))
            .filter((evaluation) => !queuedHistoricalParticipants.has(evaluation.brigade_id))
            .filter((evaluation) => !activeOperationParticipants.has(evaluation.brigade_id))
            .filter((evaluation) => isCombatReadyParticipant(briefing, evaluation.brigade_id))
            .filter((evaluation) => formationById[evaluation.brigade_id]?.elite_loan_state?.on_loan !== true))
        .sort((left, right) => {
            const fitnessDiff = right.fitness_offense - left.fitness_offense;
            return fitnessDiff !== 0
                ? fitnessDiff
                : strictCompare(left.brigade_id, right.brigade_id);
        });

    type TargetPass = 'sector-listed' | 'adjacency-only';
    const findSingleCandidate = (targetPass: TargetPass): LocalOccupationCandidate | null => {
        const candidateClass: LocalOccupationCandidateClass = targetPass === 'sector-listed'
            ? 'sector-listed_single'
            : 'adjacency-only_single';
        for (const brigade of candidates) {
            const prefixPredicates: LocalOccupationPredicateObservation[] | undefined = observation ? [] : undefined;
            const formation = formationById[brigade.brigade_id];
            const location = formation?.location_osid;
            if (!observeLocalOccupationPredicate(prefixPredicates, 'location_present', location != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, null, null, null, prefixPredicates, false);
                continue;
            }
            if (!observeLocalOccupationPredicate(prefixPredicates, 'belongs_to_corps', formation?.corps_id === briefing.corps_id)) {
                recordLocalOccupationAttempt(observation, candidateClass, null, null, [brigade.brigade_id], prefixPredicates, false);
                continue;
            }
            const sectorId = derivePrimarySectorForBrigades(
                corpsSectors,
                briefing.corps_id,
                [brigade.brigade_id],
                formationById,
            );
            if (!observeLocalOccupationPredicate(prefixPredicates, 'primary_sector_present', sectorId != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, null, null, [brigade.brigade_id], prefixPredicates, false);
                continue;
            }
            const sector = corpsSectors.find((entry) => entry.sector_id === sectorId);
            const selectedSector = sector ?? null;
            if (!observeLocalOccupationPredicate(prefixPredicates, 'sector_present', selectedSector != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, sectorId!, null, [brigade.brigade_id], prefixPredicates, false);
                continue;
            }
            if (selectedSector == null) continue;
            const commandState = stateRef.military.corps_command?.[briefing.corps_id];
            const sectorIntelConfidence = getStalestSectorIntelConfidence(stateRef, sectorId!);
            const launchProbeInstead = shouldLaunchProbeInstead(
                briefing.faction,
                sectorIntelConfidence,
                commandState?.consecutive_probes ?? 0,
                briefing.turn,
                stateRef.military.war_timeline,
            );
            if (!observeLocalOccupationPredicate(prefixPredicates, 'launch_intel_sufficient', !launchProbeInstead)) {
                recordLocalOccupationAttempt(observation, candidateClass, sectorId!, null, [brigade.brigade_id], prefixPredicates, false);
                continue;
            }

            const listedTargets = new Set<string>();
            for (const subSegment of selectedSector.sub_segments ?? []) {
                for (const target of subSegment.enemy_osids ?? []) {
                    if ((briefing.spatial.adjacency.get(target) ?? []).includes(location!)) {
                        listedTargets.add(target);
                    }
                }
            }
            const directTargets = targetPass === 'sector-listed'
                ? listedTargets
                : new Set(
                    (briefing.spatial.adjacency.get(location!) ?? [])
                        .filter((target) => !listedTargets.has(target)),
                );
            for (const target of [...directTargets].sort(strictCompare)) {
                const predicates = prefixPredicates ? [...prefixPredicates] : undefined;
                const targetPopulation = osidPopulationMap.get(target);
                if (!observeLocalOccupationPredicate(predicates, 'target_population_present', Number.isFinite(targetPopulation))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (!observeLocalOccupationPredicate(predicates, 'target_not_on_cooldown', (briefing.failed_offensive_objectives?.[target]?.cooldown_until_turn ?? 0) <= briefing.turn)) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (!observeLocalOccupationPredicate(predicates, 'bounded_isolated_enemy_position', isBoundedIsolatedEnemyPosition(target, briefing))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (!observeLocalOccupationPredicate(predicates, 'formation_eligible_for_objective', isBrigadeEligibleForOperationObjectives(formation, [target]))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                const targetController = getPoliticalControllerOSID(
                    stateRef,
                    target,
                    reverseMap,
                );
                const hostileTargetController = targetController != null && targetController !== briefing.faction
                    ? targetController
                    : null;
                if (!observeLocalOccupationPredicate(predicates, 'target_controller_hostile_known', hostileTargetController != null)) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (hostileTargetController == null) continue;
                if (!observeLocalOccupationPredicate(predicates, 'rbih_hrhb_combat_allowed', !isRbihHrhbCombatBlocked(stateRef, briefing.faction, hostileTargetController))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                const grazBlocked = shouldGrazBlockAttack(
                    stateRef,
                    briefing.corps_id,
                    briefing.faction,
                    target,
                    hostileTargetController,
                );
                if (!observeLocalOccupationPredicate(predicates, 'graz_attack_allowed', !grazBlocked)) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                const prediction = predictDirectEnemyTargets(
                    briefing,
                    brigade.brigade_id,
                    new Set([target]),
                    briefing.spatial.adjacency as Map<any, any>,
                    terrainCache,
                    briefing.osid_population_map,
                )[0]?.prediction;
                const presentPrediction = prediction ?? null;
                if (!observeLocalOccupationPredicate(predicates, 'prediction_present', presentPrediction != null)) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (presentPrediction == null) continue;
                if (!observeLocalOccupationPredicate(predicates, 'defender_has_no_reachable_brigade', !presentPrediction.defender_has_reachable_brigade)) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (!observeLocalOccupationPredicate(predicates, 'outcome_sufficient', isOutcomeSufficientForAttack(presentPrediction.predicted_outcome, 'costly_victory'))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                if (!observeLocalOccupationPredicate(predicates, 'target_not_claimed_by_executing_operation', !executingOperationObjectives.has(target))) {
                    recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, false);
                    continue;
                }
                recordLocalOccupationAttempt(observation, candidateClass, sectorId, target, [brigade.brigade_id], predicates, true);
                return {
                    brigade,
                    sector_id: sectorId!,
                    target_osid: target,
                    prediction: presentPrediction,
                    participating_brigade_ids: [brigade.brigade_id],
                    prepare_before_intel: false,
                };
            }
        }
        return null;
    };

    const runCandidateClass = (
        candidateClass: LocalOccupationCandidateClass,
        search: () => LocalOccupationCandidate | null,
    ): LocalOccupationCandidate | null => {
        const attemptsBefore = observation?.attempts.length ?? 0;
        const result = search();
        if (observation) {
            observation.class_outcomes.push({
                candidate_class: candidateClass,
                outcome: result
                    ? 'selected'
                    : observation.attempts.length > attemptsBefore
                        ? 'rejected'
                        : 'no_enumerated_candidate',
            });
        }
        return result;
    };
    const markSkippedClasses = (): void => {
        if (!observation) return;
        const reached = new Set(observation.class_outcomes.map((entry) => entry.candidate_class));
        for (const candidateClass of LOCAL_OCCUPATION_CLASSES) {
            if (!reached.has(candidateClass)) {
                observation.class_outcomes.push({ candidate_class: candidateClass, outcome: 'skipped_after_selection' });
            }
        }
    };

    if (options.only_class !== 'adjacency-only_group') {
        const listedSingle = runCandidateClass('sector-listed_single', () => findSingleCandidate('sector-listed'));
        if (listedSingle) {
            markSkippedClasses();
            return listedSingle;
        }
    }

    // A bounded position may require a small concentration even though no one
    // brigade can clear the normal attack threshold alone. Select and predict
    // that group here, before generic probe fitness can hide the opportunity.
    // This is a read-only projected staging view: real locations, movement and
    // launch assembly remain owned by the downstream operation pipeline.
    const stationaryLineStaffBySector = new Map<string, ReadonlySet<string>>();
    const findGroupCandidate = (targetPass: TargetPass): LocalOccupationCandidate | null => {
        const candidateClass: LocalOccupationCandidateClass = targetPass === 'sector-listed'
            ? 'sector-listed_group'
            : 'adjacency-only_group';
        let firstQualified: LocalOccupationCandidate | null = null;
        for (const sector of corpsSectors) {
        const staff = new Set<string>();
        for (const brigadeId of sector.assigned_brigade_ids) {
            const formation = formationById[brigadeId];
            if (!formation || formation.status !== 'active' || !isEligibleOperationFormation(formation)) continue;
            if (!formation.location_osid || !sector.territory_osids.includes(formation.location_osid)) continue;
            if (activeOperationParticipants.has(brigadeId)) continue;
            const movementStatus = stateRef.military.brigade_movement_state?.[brigadeId]?.status;
            if (movementStatus === 'packing' || movementStatus === 'in_transit') continue;
            if (stateRef.military.brigade_movement_orders?.[brigadeId]) continue;
            staff.add(brigadeId);
        }
        stationaryLineStaffBySector.set(sector.sector_id, staff);
    }
    const rankedCandidateIds = candidates.map((candidate) => candidate.brigade_id);
    const evaluationById = new Map(candidates.map((candidate) => [candidate.brigade_id, candidate]));
    const candidatePrimarySectorById = new Map<FormationId, string>();
    for (const brigadeId of rankedCandidateIds) {
        const sectorId = derivePrimarySectorForBrigades(
            corpsSectors,
            briefing.corps_id,
            [brigadeId],
            formationById,
        );
        if (sectorId) candidatePrimarySectorById.set(brigadeId, sectorId);
    }
    const predictionAdjacency = briefing.spatial.adjacency as Map<any, any>;
    const officerCombatLookup = stateRef.military.named_officers && stateRef.military.named_officer_data
        ? buildOfficerCombatLookup(stateRef)
        : undefined;

    for (const sector of corpsSectors) {
        const commandState = stateRef.military.corps_command?.[briefing.corps_id];
        const sectorIntelConfidence = getStalestSectorIntelConfidence(stateRef, sector.sector_id);
        const prepareBeforeIntel = shouldLaunchProbeInstead(
            briefing.faction,
            sectorIntelConfidence,
            commandState?.consecutive_probes ?? 0,
            briefing.turn,
            stateRef.military.war_timeline,
        );
        const sectorParticipantIds = new Set<FormationId>([
            ...(sector.reserve_brigade_ids ?? []),
            ...(sector.rear_brigade_ids ?? []),
            ...sector.assigned_brigade_ids,
        ]);
        const listedTargets = new Set<string>();
        for (const subSegment of sector.sub_segments ?? []) {
            for (const target of subSegment.enemy_osids ?? []) listedTargets.add(target);
        }
        // Use the same bounded local discovery window for concentrations: only
        // eligible same-corps surplus brigades whose real primary assignment is
        // this sector may contribute adjacent candidates. This does not reassign
        // a brigade or sweep enemy territory globally.
        const targets = new Set(listedTargets);
        if (targetPass === 'adjacency-only') {
            targets.clear();
            for (const brigadeId of rankedCandidateIds) {
                if (candidatePrimarySectorById.get(brigadeId) !== sector.sector_id) continue;
                const location = formationById[brigadeId]?.location_osid;
                if (!location) continue;
                for (const target of briefing.spatial.adjacency.get(location) ?? []) {
                    if (!listedTargets.has(target)) targets.add(target);
                }
            }
        }
        for (const target of [...targets].sort(strictCompare)) {
            const predicates: LocalOccupationPredicateObservation[] | undefined = observation ? [] : undefined;
            const targetPopulation = osidPopulationMap.get(target);
            if (!observeLocalOccupationPredicate(predicates, 'target_population_present', Number.isFinite(targetPopulation))) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            if (!observeLocalOccupationPredicate(predicates, 'target_not_on_cooldown', (briefing.failed_offensive_objectives?.[target]?.cooldown_until_turn ?? 0) <= briefing.turn)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            if (!observeLocalOccupationPredicate(predicates, 'bounded_isolated_enemy_position', isBoundedIsolatedEnemyPosition(target, briefing))) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            const targetController = getPoliticalControllerOSID(stateRef, target, reverseMap);
            const hostileTargetController = targetController != null && targetController !== briefing.faction
                ? targetController
                : null;
            if (!observeLocalOccupationPredicate(predicates, 'target_controller_hostile_known', hostileTargetController != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            if (hostileTargetController == null) continue;
            if (!observeLocalOccupationPredicate(predicates, 'rbih_hrhb_combat_allowed', !isRbihHrhbCombatBlocked(stateRef, briefing.faction, hostileTargetController))) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            const grazBlocked = shouldGrazBlockAttack(stateRef, briefing.corps_id, briefing.faction, target, hostileTargetController);
            if (!observeLocalOccupationPredicate(predicates, 'graz_attack_allowed', !grazBlocked)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }

            const approaches = (
                briefing.spatial.sharedBoundaryAdjacency?.get(target)
                ?? briefing.spatial.adjacency.get(target)
                ?? []
            )
                .filter((osid) => briefing.spatial.friendlyOsidsByFaction?.get(briefing.faction)?.has(osid))
                .sort(strictCompare);
            if (!observeLocalOccupationPredicate(predicates, 'friendly_approach_present', approaches.length > 0)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, null, predicates, false);
                continue;
            }
            const projectedApproachByBrigade = new Map<FormationId, string>();
            const distanceToTarget = (brigadeId: FormationId): number => {
                const location = formationById[brigadeId]?.location_osid;
                if (!location) return Number.POSITIVE_INFINITY;
                let bestDistance = Number.POSITIVE_INFINITY;
                let bestApproach: string | null = null;
                for (const approach of approaches) {
                    const distance = spatialFriendlyDistance(
                        briefing.spatial,
                        briefing.faction,
                        location,
                        approach,
                        MAX_REACHABILITY_HOPS,
                    );
                    if (distance < 0) continue;
                    if (distance < bestDistance || (distance === bestDistance && bestApproach != null && strictCompare(approach, bestApproach) < 0)) {
                        bestDistance = distance;
                        bestApproach = approach;
                    }
                }
                if (bestApproach != null) projectedApproachByBrigade.set(brigadeId, bestApproach);
                return bestDistance;
            };
            const eligibleSurplusIds = rankedCandidateIds
                .filter((brigadeId) => {
                    const formation = formationById[brigadeId];
                    if (observation) {
                        const rosterPredicates: LocalOccupationPredicateObservation[] = [];
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'same_corps', formation?.corps_id === briefing.corps_id)) {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        }
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'not_on_elite_loan', formation.elite_loan_state?.on_loan !== true)) {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        }
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'formation_eligible_for_objective', isBrigadeEligibleForOperationObjectives(formation, [target]))) {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        }
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'approach_distance_finite', Number.isFinite(distanceToTarget(brigadeId)))) {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        }
                        const atApproach = formation.location_osid != null && approaches.includes(formation.location_osid);
                        if (!observeLocalOccupationPredicate(
                            rosterPredicates,
                            'at_approach_or_reachable_in_time',
                            atApproach || canReachAssemblyInTime(briefing, brigadeId, target, computePlanningDuration(1)),
                        )) {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        }
                        recordLocalOccupationGroupRoster(observation, candidateClass, 'projected_surplus', sector.sector_id, target, brigadeId, rosterPredicates, true);
                        return true;
                    }
                    return formation?.corps_id === briefing.corps_id
                        && formation.elite_loan_state?.on_loan !== true
                        && isBrigadeEligibleForOperationObjectives(formation, [target])
                        && Number.isFinite(distanceToTarget(brigadeId))
                        // P-A: an admitted brigade must be able to physically reach the
                        // objective's assembly/approach area inside the operation's own
                        // assembly budget (planning_duration + grace). The escalation path
                        // builds a multi-brigade op with planning_duration =
                        // computePlanningDuration(objectiveCount).
                        && (
                            (formation.location_osid != null && approaches.includes(formation.location_osid))
                            || canReachAssemblyInTime(briefing, brigadeId, target, computePlanningDuration(1))
                        );
                });
            const primaryEnemyTargets = new Set(
                (sector.sub_segments ?? []).flatMap((subSegment) => subSegment.enemy_osids ?? []),
            );
            const primaryFrontIsTargetOnly = primaryEnemyTargets.size === 1
                && primaryEnemyTargets.has(target);
            const garrisonLockedIds = new Set(
                allocation.garrison_locks.map((lock) => lock.brigade_id),
            );
            const hasEligibleSurplusPrimary = eligibleSurplusIds.some((brigadeId) => (
                sectorParticipantIds.has(brigadeId)
            ));
            const stagedPrimaryGarrisonIds = primaryFrontIsTargetOnly && hasEligibleSurplusPrimary
                ? sector.assigned_brigade_ids.filter((brigadeId) => {
                    const formation = formationById[brigadeId];
                    const movementStatus = briefing.state_ref?.military.brigade_movement_state?.[brigadeId]?.status;
                    if (observation) {
                        const rosterPredicates: LocalOccupationPredicateObservation[] = [];
                        const reject = (): false => {
                            recordLocalOccupationGroupRoster(observation, candidateClass, 'staged_primary_garrison', sector.sector_id, target, brigadeId, rosterPredicates, false);
                            return false;
                        };
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'garrison_locked', garrisonLockedIds.has(brigadeId))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'elite_available', mayEliteJoinOperation(brigadeId, briefing.turn))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'not_queued_historical', !queuedHistoricalParticipants.has(brigadeId))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'not_active_operation', !activeOperationParticipants.has(brigadeId))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'combat_ready', isCombatReadyParticipant(briefing, brigadeId))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'movement_not_packing', movementStatus !== 'packing')) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'movement_not_in_transit', movementStatus !== 'in_transit')) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'no_movement_order', !briefing.state_ref?.military.brigade_movement_orders?.[brigadeId])) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'same_corps', formation?.corps_id === briefing.corps_id)) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'not_on_elite_loan', formation.elite_loan_state?.on_loan !== true)) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'formation_eligible_for_objective', isBrigadeEligibleForOperationObjectives(formation, [target]))) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'location_present', !!formation.location_osid)) return reject();
                        if (!observeLocalOccupationPredicate(rosterPredicates, 'location_is_friendly_approach', approaches.includes(formation.location_osid!))) return reject();
                        recordLocalOccupationGroupRoster(observation, candidateClass, 'staged_primary_garrison', sector.sector_id, target, brigadeId, rosterPredicates, true);
                        return true;
                    }
                    return garrisonLockedIds.has(brigadeId)
                        && mayEliteJoinOperation(brigadeId, briefing.turn)
                        && !queuedHistoricalParticipants.has(brigadeId)
                        && !activeOperationParticipants.has(brigadeId)
                        && isCombatReadyParticipant(briefing, brigadeId)
                        && movementStatus !== 'packing'
                        && movementStatus !== 'in_transit'
                        && !briefing.state_ref?.military.brigade_movement_orders?.[brigadeId]
                        && formation?.corps_id === briefing.corps_id
                        && formation.elite_loan_state?.on_loan !== true
                        && isBrigadeEligibleForOperationObjectives(formation, [target])
                        && !!formation.location_osid
                        && approaches.includes(formation.location_osid);
                })
                : [];
            const eligibleIds = [...new Set([
                ...eligibleSurplusIds,
                ...stagedPrimaryGarrisonIds,
            ])]
                .sort((left, right) => {
                    const sectorDiff = Number(sectorParticipantIds.has(right)) - Number(sectorParticipantIds.has(left));
                    if (sectorDiff !== 0) return sectorDiff;
                    const surplusDiff = Number(evaluationById.has(right)) - Number(evaluationById.has(left));
                    if (surplusDiff !== 0) return surplusDiff;
                    const distanceDiff = distanceToTarget(left) - distanceToTarget(right);
                    return distanceDiff !== 0 ? distanceDiff : strictCompare(left, right);
                });
            const predictParticipants = (
                participants: FormationId[],
                projectUnstaged: boolean,
            ): CombatPrediction | null => {
                if (!briefing.state_ref?.military.formations || predictionAdjacency.size === 0) return null;
                const projectedFormations = { ...briefing.state_ref.military.formations };
                for (const brigadeId of participants) {
                    const formation = projectedFormations[brigadeId];
                    if (!formation) return null;
                    if (!projectUnstaged || (formation.location_osid && approaches.includes(formation.location_osid))) {
                        continue;
                    }
                    const approach = projectedApproachByBrigade.get(brigadeId);
                    if (!approach) return null;
                    projectedFormations[brigadeId] = { ...formation, location_osid: approach };
                }
                const projectedState: GameState = {
                    ...briefing.state_ref,
                    military: {
                        ...briefing.state_ref.military,
                        formations: projectedFormations,
                    },
                };
                return predictCombatOutcome(
                    projectedState,
                    participants[0]!,
                    target,
                    predictionAdjacency,
                    reverseMap,
                    terrainCache,
                    'attack',
                    participants.slice(1).sort(strictCompare),
                    briefing.supply_by_osid,
                    briefing.osid_population_map,
                    undefined,
                    briefing.ethnic_map,
                    options.suppress_profile
                        ? undefined
                        : `${BUILD_OPERATIONS_PROFILE_PREFIX}.localOccupation.predictConcentration`,
                    officerCombatLookup,
                );
            };
            const stagedPrimaryParticipants = eligibleIds
                .filter((brigadeId) => sectorParticipantIds.has(brigadeId))
                .filter((brigadeId) => {
                    const location = formationById[brigadeId]?.location_osid;
                    return !!location && approaches.includes(location);
                })
                .slice(0, ISOLATED_POSITION_OPERATION_MAX_BRIGADES);
            if (!prepareBeforeIntel && stagedPrimaryParticipants.length >= ISOLATED_POSITION_OPERATION_MIN_BRIGADES) {
                const stagedPrediction = predictParticipants(stagedPrimaryParticipants, false);
                const stagedLead = stagedPrimaryParticipants.find((brigadeId) => evaluationById.has(brigadeId));
                const stagedPredicates = predicates ? [...predicates] : undefined;
                observeLocalOccupationPredicate(stagedPredicates, 'minimum_group_roster', true);
                const stagedLeadPresent = observeLocalOccupationPredicate(stagedPredicates, 'staged_lead_present', stagedLead != null);
                const stagedPredictionPresent = stagedLeadPresent
                    && observeLocalOccupationPredicate(stagedPredicates, 'prediction_present', stagedPrediction != null);
                let stagedDefenderClear = false;
                let stagedOutcomeSufficient = false;
                if (stagedPredictionPresent && stagedPrediction != null) {
                    stagedDefenderClear = observeLocalOccupationPredicate(stagedPredicates, 'defender_has_no_reachable_brigade', !stagedPrediction.defender_has_reachable_brigade);
                    stagedOutcomeSufficient = stagedDefenderClear
                        && observeLocalOccupationPredicate(stagedPredicates, 'outcome_sufficient', isOutcomeSufficientForAttack(stagedPrediction.predicted_outcome, 'stalemate'));
                }
                if (stagedOutcomeSufficient && stagedPrediction != null) {
                    if (!observeLocalOccupationPredicate(stagedPredicates, 'target_not_claimed_by_executing_operation', !executingOperationObjectives.has(target))) {
                        recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, stagedPrimaryParticipants, stagedPredicates, false);
                        continue;
                    }
                    recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, stagedPrimaryParticipants, stagedPredicates, true);
                    const candidate = {
                        brigade: evaluationById.get(stagedLead!)!,
                        sector_id: sector.sector_id,
                        target_osid: target,
                        prediction: stagedPrediction,
                        participating_brigade_ids: stagedPrimaryParticipants,
                        prepare_before_intel: false,
                    };
                    if (!options.enumerate_all_qualified) return candidate;
                    firstQualified ??= candidate;
                    continue;
                }
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, stagedPrimaryParticipants, stagedPredicates, false);
            }
            const primaryParticipants = [
                ...stagedPrimaryParticipants,
                ...eligibleIds.filter((brigadeId) => (
                    sectorParticipantIds.has(brigadeId)
                    && !stagedPrimaryParticipants.includes(brigadeId)
                )),
            ].slice(0, ISOLATED_POSITION_OPERATION_MAX_BRIGADES);
            const donors = primaryParticipants.length < ISOLATED_POSITION_OPERATION_MAX_BRIGADES
                ? selectBoundedPositionDonorAttachments(
                    sector,
                    corpsSectors,
                    eligibleSurplusIds.filter((brigadeId) => !sectorParticipantIds.has(brigadeId)),
                    stationaryLineStaffBySector,
                    briefing.spatial.adjacency,
                    ISOLATED_POSITION_OPERATION_MAX_BRIGADES,
                )
                : { brigade_ids: [], sector_ids: [] };
            const participants = [
                ...primaryParticipants,
                ...donors.brigade_ids.slice(0, ISOLATED_POSITION_OPERATION_MAX_BRIGADES - primaryParticipants.length),
            ] as FormationId[];
            if (!observeLocalOccupationPredicate(predicates, 'minimum_group_roster', participants.length >= ISOLATED_POSITION_OPERATION_MIN_BRIGADES)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            // Before launch-grade intelligence exists, preparation must own the
            // complete bounded roster from birth. Preparation cannot add a donor
            // later, so a weak pair must remain a probe instead of reserving an
            // under-strength assault.
            if (!observeLocalOccupationPredicate(predicates, 'preparation_roster_complete', !prepareBeforeIntel || participants.length === ISOLATED_POSITION_OPERATION_MAX_BRIGADES)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            const prediction = predictParticipants(participants, true);
            const presentPrediction = prediction ?? null;
            if (!observeLocalOccupationPredicate(predicates, 'prediction_present', presentPrediction != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            if (presentPrediction == null) continue;
            if (!observeLocalOccupationPredicate(predicates, 'defender_has_no_reachable_brigade', !presentPrediction.defender_has_reachable_brigade)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            if (!observeLocalOccupationPredicate(predicates, 'outcome_sufficient', isOutcomeSufficientForAttack(presentPrediction.predicted_outcome, 'stalemate'))) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            const leadId = participants.find((brigadeId) => evaluationById.has(brigadeId));
            const brigade = leadId ? evaluationById.get(leadId) : undefined;
            if (!observeLocalOccupationPredicate(predicates, 'surplus_lead_present', brigade != null)) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            if (!observeLocalOccupationPredicate(predicates, 'target_not_claimed_by_executing_operation', !executingOperationObjectives.has(target))) {
                recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, false);
                continue;
            }
            recordLocalOccupationAttempt(observation, candidateClass, sector.sector_id, target, participants, predicates, true);
            const candidate = {
                brigade: brigade!,
                sector_id: sector.sector_id,
                target_osid: target,
                prediction: presentPrediction,
                participating_brigade_ids: participants,
                prepare_before_intel: prepareBeforeIntel,
            };
            if (!options.enumerate_all_qualified) return candidate;
            firstQualified ??= candidate;
        }
        }
        return firstQualified;
    };

    if (options.only_class === 'adjacency-only_group') {
        return runCandidateClass('adjacency-only_group', () => findGroupCandidate('adjacency-only'));
    }

    const listedGroup = runCandidateClass('sector-listed_group', () => findGroupCandidate('sector-listed'));
    if (listedGroup) {
        markSkippedClasses();
        return listedGroup;
    }
    const adjacencySingle = runCandidateClass('adjacency-only_single', () => findSingleCandidate('adjacency-only'));
    if (adjacencySingle) {
        markSkippedClasses();
        return adjacencySingle;
    }
    return runCandidateClass('adjacency-only_group', () => findGroupCandidate('adjacency-only'));
}

// ═══════════════════════════════════════════════════════════════════════════
// emitCommanderOutput — main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert commander decisions into downstream-compatible output types.
 * Produces CorpsDirective (same shape as today), operations, sector stances.
 * Downstream systems (sector_offensive, combat resolution, brigade AI) don't change.
 */
export function emitCommanderOutput(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    allocation: AllocationResult,
    planDecision: PlanDecision,
    decisions: DecisionResult,
    threats: ThreatAssessment,
    beliefState?: CommanderBeliefState | null,
): CommanderOutput {
    const personality = briefing.officer_personality;

    // 1. Build CorpsDirective
    const directive = botOrdersPerfTime(
        'commander.runCommanderForCorps.decide.emitCommanderOutput.buildDirective',
        () => buildDirective(
            briefing,
            zones,
            forces,
            allocation,
            planDecision,
            decisions,
            personality,
        ),
    );

    // 2. Build operations list
    const operations = botOrdersPerfTime(
        BUILD_OPERATIONS_PROFILE_PREFIX,
        () => buildOperations(
            briefing,
            allocation,
            planDecision,
            personality,
        ),
    );

    // 3. Build sector stances
    const sectorStances = botOrdersPerfTime(
        'commander.runCommanderForCorps.decide.emitCommanderOutput.buildSectorStances',
        () => buildSectorStances(briefing, decisions),
    );

    // 4. Build updated commander state
    const updatedState = botOrdersPerfTime(
        'commander.runCommanderForCorps.decide.emitCommanderOutput.buildUpdatedState',
        () => buildUpdatedState(
            briefing,
            zones,
            forces,
            threats,
            planDecision,
            decisions,
            beliefState ?? null,
        ),
    );

    // 5. Garrison locks directly from allocation (same shape, pass through)
    const garrisonLocks = allocation.garrison_locks;

    // 6. Reinforcement requests from decisions
    const reinforcementRequests = decisions.reinforcement_requests;

    // 7. Plan updates from plan decision
    const planUpdates = botOrdersPerfTime(
        'commander.runCommanderForCorps.decide.emitCommanderOutput.buildPlanUpdates',
        () => buildPlanUpdates(planDecision),
    );

    // 8. Prepositioning: move unreachable main_effort surplus toward front
    const prepositioningOrders = botOrdersPerfTime(
        'commander.runCommanderForCorps.decide.emitCommanderOutput.buildPrepositioningOrders',
        () => buildPrepositioningOrders(briefing, allocation),
    );

    return {
        directive,
        operations,
        sector_stances: sectorStances,
        updated_state: updatedState,
        garrison_locks: garrisonLocks,
        reinforcement_requests: reinforcementRequests,
        plan_updates: planUpdates,
        prepositioning_orders: prepositioningOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// buildDirective — map commander state to CorpsDirective
// ═══════════════════════════════════════════════════════════════════════════

function buildDirective(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    allocation: AllocationResult,
    planDecision: PlanDecision,
    decisions: DecisionResult,
    personality: OfficerPersonality,
): CorpsDirective {
    // assigned_front_ids: all edge IDs from all sectors for this corps
    const assignedFrontIds = collectAssignedFrontIds(briefing);

    // offensive_targets: from plan's target_osids if plan is executing, else fall back to active ops.
    // v0.9.0 Consequence System: after the plan/ops path resolves, merge in any active
    // bot_priority_shift effects so consequence events actually steer corps targeting
    // (the shift writer lives in src/sim/events/apply_effects.ts; the reader chain is
    //  directive.offensive_targets → scoreTargetFromDirective → brigade AI).
    const offensiveTargets = augmentOffensiveTargetsWithShifts(
        buildOffensiveTargets(planDecision, briefing),
        briefing,
    );

    // hold_osids: front OSIDs in zones with posture 'besieged' or 'defending'
    const holdOsids = buildHoldOsids(zones, briefing);

    // avoid_osids: empty (deprecated field, keep for compatibility)
    const avoidOsids: string[] = [];

    // max_attackers_per_target: 3 default, personality modifies
    const maxAttackers = computeMaxAttackers(personality);

    // reserve_fraction: from garrison locks vs total brigades, clamped 0-0.5
    const reserveFraction = computeReserveFraction(allocation, forces);

    // min_attack_outcome: based on dominant posture
    const minAttackOutcome = computeMinAttackOutcome(zones);

    // aggression_modifier: from personality (doctrine stance removed — emergent behavior)
    const aggressionModifier = computeAggressionModifier(personality);

    // sector_targets: plan targets mapped to sectors
    const sectorTargets = buildSectorTargets(planDecision, briefing);

    // reinforce_sector_ids: sectors with deficit zones
    const reinforceSectorIds = buildReinforceSectorIds(allocation.zones, briefing);

    // priority_sector_id: sector with most plan target overlap
    const prioritySectorId = findSectorWithMostTargetOverlap(planDecision, briefing);

    // sector_reassignment_orders: from decide.reserve_shifts mapped to sectors
    const sectorReassignmentOrders = buildSectorReassignmentOrders(decisions, briefing, zones);

    return {
        assigned_front_ids: assignedFrontIds,
        offensive_targets: offensiveTargets,
        hold_osids: holdOsids,
        avoid_osids: avoidOsids,
        max_attackers_per_target: maxAttackers,
        reserve_fraction: reserveFraction,
        min_attack_outcome: minAttackOutcome,
        aggression_modifier: aggressionModifier,
        sector_targets: Object.keys(sectorTargets).length > 0 ? sectorTargets : undefined,
        reinforce_sector_ids: reinforceSectorIds.length > 0 ? reinforceSectorIds : undefined,
        priority_sector_id: prioritySectorId ?? undefined,
        sector_reassignment_orders: sectorReassignmentOrders.length > 0
            ? sectorReassignmentOrders
            : undefined,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Directive field builders
// ═══════════════════════════════════════════════════════════════════════════

/** Collect all edge IDs from all sectors belonging to this corps. */
function collectAssignedFrontIds(briefing: CommanderBriefing): string[] {
    const edgeIds = new Set<string>();
    const corpsSectors = briefing.sectors.filter(s => s.corps_id === briefing.corps_id);
    for (const sector of corpsSectors) {
        for (const edgeId of sector.edge_ids) {
            edgeIds.add(edgeId);
        }
    }
    return [...edgeIds].sort(strictCompare);
}

/** Build offensive targets from plan if plan is executing/ready.
 *  When no active plan, fall back to objectives from operations already
 *  in the field — prevents the directive losing targets after plan hands off
 *  to the execution pipeline and gets cleared to null. */
function buildOffensiveTargets(
    planDecision: PlanDecision,
    briefing: CommanderBriefing,
): string[] {
    if (
        planDecision.plan &&
        ACTIVE_PLAN_STATUSES.has(planDecision.plan.status)
    ) {
        return [...planDecision.plan.target_osids].sort(strictCompare);
    }

    // No live plan — derive targets from any operation currently executing
    const executingObjectives = new Set<string>();
    for (const op of briefing.active_operations) {
        if (op.phase === 'execution' || op.phase === 'planning') {
            for (const obj of op.objectives ?? []) {
                executingObjectives.add(obj);
            }
        }
    }
    if (executingObjectives.size > 0) {
        return [...executingObjectives].sort(strictCompare);
    }

    return [];
}

/** Build hold_osids from zones with posture 'besieged' or 'defending'. */
function buildHoldOsids(zones: ZoneAssessment[], briefing: CommanderBriefing): string[] {
    const holdSet = new Set<string>();
    const corpsSectors = briefing.sectors.filter(s => s.corps_id === briefing.corps_id);

    // Collect front OSIDs from sectors that overlap with besieged/defending zones
    const holdZoneOsids = new Set<string>();
    for (const zone of zones) {
        if (zone.posture === 'besieged' || zone.posture === 'defending') {
            for (const osid of zone.osids) {
                holdZoneOsids.add(osid);
            }
        }
    }

    // Intersect with front-facing OSIDs from sector sub-segments
    for (const sector of corpsSectors) {
        for (const subSeg of sector.sub_segments) {
            const friendlyOsids = subSeg.friendly_osids ?? [];
            for (const osid of friendlyOsids) {
                if (holdZoneOsids.has(osid)) {
                    holdSet.add(osid);
                }
            }
        }
    }

    return [...holdSet].sort(strictCompare);
}

/** Compute max attackers per target, modified by personality. */
function computeMaxAttackers(personality: OfficerPersonality): number {
    let max = DEFAULT_MAX_ATTACKERS;
    if (personality.aggression > 0.7) max += 1;
    if (personality.caution > 0.5) max -= 1;
    return Math.max(1, max);
}

/** Compute reserve fraction from garrison locks vs total brigades. */
function computeReserveFraction(allocation: AllocationResult, forces: ForceAssessment): number {
    if (forces.total_brigades === 0) return 0;
    const raw = allocation.garrison_locks.length / forces.total_brigades;
    return Math.min(MAX_RESERVE_FRACTION, Math.max(0, raw));
}

/** Posture severity: lower = more constrained. */
const POSTURE_SEVERITY: Record<ZonePosture, number> = {
    besieged: 0,
    defending: 1,
    balanced: 2,
    projecting: 3,
};

/** Compute min attack outcome based on the most constrained (worst) zone posture. */
function computeMinAttackOutcome(zones: ZoneAssessment[]): CorpsDirective['min_attack_outcome'] {
    let worstPosture: ZonePosture = 'projecting';

    for (const zone of zones) {
        if (POSTURE_SEVERITY[zone.posture] < POSTURE_SEVERITY[worstPosture]) {
            worstPosture = zone.posture;
        }
    }

    return POSTURE_MIN_OUTCOME[worstPosture];
}

/** Compute aggression modifier from personality only.
 *  Doctrine stance removed — commander decides from zone posture + personality. */
function computeAggressionModifier(personality: OfficerPersonality): number {
    return (personality.aggression - 0.4) * 0.375;
}

/** Map plan targets to sectors via sector sub-segment enemy OSIDs. */
function buildSectorTargets(
    planDecision: PlanDecision,
    briefing: CommanderBriefing,
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    if (!planDecision.plan || !ACTIVE_PLAN_STATUSES.has(planDecision.plan.status)) {
        return result;
    }

    const targetSet = new Set(planDecision.plan.target_osids);
    if (targetSet.size === 0) return result;

    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of corpsSectors) {
        const sectorEnemyOsids = new Set<string>();
        for (const subSeg of sector.sub_segments) {
            for (const eo of subSeg.enemy_osids) {
                sectorEnemyOsids.add(eo);
            }
        }

        const matching = [...targetSet].filter(t => sectorEnemyOsids.has(t)).sort(strictCompare);
        if (matching.length > 0) {
            result[sector.sector_id] = matching;
        }
    }

    return result;
}

/** Build reinforce_sector_ids from zones with deficit mapped to sectors. */
function buildReinforceSectorIds(
    allocatedZones: ZoneAssessment[],
    briefing: CommanderBriefing,
): string[] {
    const deficitZoneOsids = new Set<string>();
    for (const zone of allocatedZones) {
        if (zone.deficit > 0) {
            for (const osid of zone.osids) {
                deficitZoneOsids.add(osid);
            }
        }
    }

    if (deficitZoneOsids.size === 0) return [];

    const sectorIds = new Set<string>();
    const corpsSectors = briefing.sectors.filter(s => s.corps_id === briefing.corps_id);
    for (const sector of corpsSectors) {
        const hasDeficitOsid = sector.territory_osids.some(osid => deficitZoneOsids.has(osid));
        if (hasDeficitOsid) {
            sectorIds.add(sector.sector_id);
        }
    }

    return [...sectorIds].sort(strictCompare);
}

/**
 * Find the sector with the most target OSID overlap in its enemy OSIDs.
 * Shared by both priority_sector_id and operation sector_id logic.
 * Falls back to the first corps sector when no targets match.
 */
function findSectorWithMostTargetOverlap(
    planDecision: PlanDecision,
    briefing: CommanderBriefing,
): string | null {
    if (!planDecision.plan) return null;

    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    const targetSet = new Set(planDecision.plan.target_osids);
    if (targetSet.size === 0 && corpsSectors.length > 0) {
        return corpsSectors[0]!.sector_id;
    }

    let bestSector: string | null = null;
    let bestCount = 0;
    for (const sector of corpsSectors) {
        let count = 0;
        for (const subSeg of sector.sub_segments) {
            for (const eo of subSeg.enemy_osids) {
                if (targetSet.has(eo)) count++;
            }
        }
        if (count > bestCount) {
            bestCount = count;
            bestSector = sector.sector_id;
        }
    }

    // Fallback to first sector
    if (!bestSector && corpsSectors.length > 0) {
        bestSector = corpsSectors[0]!.sector_id;
    }

    return bestSector;
}

/** Map reserve shifts to sector reassignment orders. */
function buildSectorReassignmentOrders(
    decisions: DecisionResult,
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
): Array<{ brigade_id: string; to_sector_id: string }> {
    const directRelief = [...(decisions.empty_sector_relief_reassignments ?? [])]
        .sort((left, right) => strictCompare(left.brigade_id, right.brigade_id));
    if (decisions.reserve_shifts.length === 0 && directRelief.length === 0) return [];

    // Build zone-to-sector mapping: zone OSIDs → overlapping sector
    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    const zoneById = new Map(zones.map((zone) => [zone.zone_id, zone]));

    const osidToSector = new Map<string, string>();
    for (const sector of corpsSectors) {
        for (const osid of sector.territory_osids) {
            // First sector wins — deterministic because sectors are sorted
            if (!osidToSector.has(osid)) {
                osidToSector.set(osid, sector.sector_id);
            }
        }
    }

    const orders: Array<{ brigade_id: string; to_sector_id: string }> = directRelief.map((relief) => ({
        brigade_id: relief.brigade_id,
        to_sector_id: relief.to_sector_id,
    }));
    const orderedBrigades = new Set(orders.map((order) => order.brigade_id));

    for (const shift of [...decisions.reserve_shifts].sort((a, b) =>
        strictCompare(a.brigade_id, b.brigade_id),
    )) {
        if (orderedBrigades.has(shift.brigade_id)) continue;
        // Find a sector in the destination zone
        // We need to find any OSID in the destination zone and look up its sector
        // Since we don't have zone->osid mapping here, use briefing.sectors territory
        // to find which sector covers the destination zone's territory.
        // For now, find the first sector that has territory OSIDs in common with the zone.
        // The shift.to_zone is a ZoneId — find sectors overlapping.
        // Without full zone data here, we map by checking all sectors.
        let targetSectorId: string | null = null;
        for (const sector of corpsSectors) {
            // The sector's territory_osids may overlap with the destination zone
            // We use the sector_id from the first matching sector
            if (sector.assigned_brigade_ids.length > 0 || sector.territory_osids.length > 0) {
                targetSectorId = sector.sector_id;
                // We accept the first sector — this is a best-effort mapping.
                // Step 8 (wiring) can refine with full zone-to-sector maps.
                break;
            }
        }

        const destinationOsids = new Set(zoneById.get(shift.to_zone)?.osids ?? []);
        if (destinationOsids.size > 0) {
            let bestOverlap = 0;
            let overlapSectorId: string | null = null;
            for (const sector of corpsSectors) {
                let overlap = 0;
                for (const osid of sector.territory_osids ?? []) {
                    if (destinationOsids.has(osid)) overlap++;
                }
                if (
                    overlap > bestOverlap
                    || (
                        overlap === bestOverlap
                        && overlap > 0
                        && overlapSectorId != null
                        && strictCompare(sector.sector_id, overlapSectorId) < 0
                    )
                ) {
                    bestOverlap = overlap;
                    overlapSectorId = sector.sector_id;
                }
            }
            if (overlapSectorId) targetSectorId = overlapSectorId;
        }

        if (targetSectorId) {
            orders.push({
                brigade_id: shift.brigade_id,
                to_sector_id: targetSectorId,
            });
            orderedBrigades.add(shift.brigade_id);
        }
    }

    return orders;
}

// ═══════════════════════════════════════════════════════════════════════════
// buildOperations — create CorpsOperation list
// ═══════════════════════════════════════════════════════════════════════════

type CommanderCreationExit =
    | 'active_slot_full'
    | 'below_min_participants'
    | 'no_objectives'
    | 'below_min_after_eligibility'
    | 'plan_probe_created'
    | 'plan_probe_overlap_suppressed'
    | 'general_created'
    | 'general_overlap_suppressed'
    | 'reduction_created'
    | 'reduction_overlap_suppressed'
    | 'fallback_probe_created'
    | 'fallback_probe_overlap_suppressed'
    | 'completed_no_operation';

type CommanderCreationSite = 'general' | 'plan_probe' | 'reduction' | 'fallback_probe';

interface CommanderCreationBuiltOperation {
    site: CommanderCreationSite;
    name: string;
    type: string;
    /** Stored CorpsOperation.started_turn (the operation has no stored id; any id is derived from host corps + name + started_turn). */
    started_turn: number;
}

interface CommanderCreationOperationTuple {
    derived_id: string;
    host_corps_id: string;
    name: string;
    type: string;
    started_turn: number;
    sector_id: string | null;
    objective_ids: string[];
    participant_ids: string[];
}

interface CommanderCreationOverlapCheck extends CommanderCreationOverlapPredicates {
    existing_operation: CommanderCreationOperationTuple;
}

interface CommanderCreationOverlapDetail {
    candidate: CommanderCreationOperationTuple;
    checks: CommanderCreationOverlapCheck[];
    first_matched_clause: CommanderCreationOverlapClause | null;
    conflicting_operation: CommanderCreationOperationTuple | null;
}

type CommanderCreationProbeDecisionSite = 'plan' | 'fallback_escalation';

interface CommanderCreationProbeDecision extends ProbeLaunchDecisionTrace {
    reached: true;
    site: CommanderCreationProbeDecisionSite;
    sector_id: string | null;
    sector_intel_confidence: number;
    consecutive_probes: number;
    bilateral_offensive: boolean | null;
}

interface CommanderCreationProbeGateReceipt {
    selector: { faction: FactionId; corps_id: FormationId; turn: number };
    first_reached_exit: CommanderCreationExit | null;
    plan_decision: CommanderCreationProbeDecision | null;
    fallback_escalation_decision: CommanderCreationProbeDecision | null;
    candidate_operations: Array<{ site: CommanderCreationSite; operation: CommanderCreationOperationTuple }>;
    returned_operations: CommanderCreationOperationTuple[];
    target_selection_detail?: CommanderCreationProbeTargetSelectionDetail;
}

type CommanderCreationProbeTargetSelectionStatus =
    | 'not_reached'
    | 'no_brigade'
    | 'no_sector'
    | 'missing_adjacency_or_friendly_set_or_location'
    | 'local_occupation_bypass'
    | 'empty_enemy_set'
    | 'empty_direct_set'
    | 'all_filtered'
    | 'generic_search';

type CommanderCreationProbeTargetRejector =
    | 'cooldown'
    | 'politics'
    | 'direct'
    | 'reachable'
    | 'predicted_viable';

interface CommanderCreationProbeTargetDetail {
    target_id: string;
    cooldown_raw_present: boolean | null;
    cooldown_raw_value: number | null;
    cooldown_effective_value: number | null;
    controller: FactionId | null;
    politically_blocked: boolean | null;
    prediction_present: boolean | null;
    prediction_outcome: string | null;
    prediction_threshold: 'stalemate';
    predicted_viable: boolean | null;
    direct: boolean;
    reachable: boolean | null;
    approach_distance: number | null;
    cooldown_filter_reached: boolean;
    cooldown_filter_passed: boolean | null;
    politics_filter_reached: boolean;
    politics_filter_passed: boolean | null;
    direct_filter_reached: boolean;
    direct_filter_passed: boolean | null;
    reachable_filter_reached: boolean;
    reachable_filter_passed: boolean | null;
    prediction_filter_reached: boolean;
    prediction_filter_passed: boolean | null;
    passed: boolean;
    first_rejecting_filter: CommanderCreationProbeTargetRejector | null;
}

interface CommanderCreationProbeTargetSelectionDetail {
    status: CommanderCreationProbeTargetSelectionStatus;
    selected_brigade_id: FormationId | null;
    selected_brigade_location: string | null;
    derived_sector_id: string | null;
    enemy_candidate_ids: string[];
    direct_candidate_ids: string[];
    survivor_ids: string[];
    ranked_objective_ids: string[];
    targets: CommanderCreationProbeTargetDetail[];
}

type CommanderCreationLocalOpportunityOperand =
    | 'ops_length_zero'
    | 'allocation_can_launch_ops'
    | 'surplus_pool_nonempty'
    | 'initiative_above_threshold'
    | 'active_slot_free';

type CommanderCreationLocalOpportunityOperands = Record<
    CommanderCreationLocalOpportunityOperand,
    boolean | null
>;

/**
 * Detached reached-field receipt of ONE buildOperations call (opt-in `commander_creation`). Every optional field is set only
 * where its decision was actually reached (absent otherwise, never inferred false/0); inner-callback emptiness is a reached
 * INPUT, never an outer terminal. Scalars/strings and copied sorted id arrays only.
 */
interface CommanderCreationObservation {
    plan_present: boolean;
    plan_source: string | null;
    plan_status: string | null;
    plan_target_ids: string[];
    general_entry_passed: boolean;
    exit: CommanderCreationExit | null;
    built: CommanderCreationBuiltOperation[];
    active_slot_users?: number;
    max_operation_slots?: number;
    primary_pool_size?: number;
    attached_pool_size?: number;
    participating_count?: number;
    effective_min_for_op?: number;
    reachable_enemy_osid_count?: number;
    objective_ids?: string[];
    eligible_count?: number;
    launch_probe_evaluated?: boolean;
    launch_probe?: boolean;
    probe_on_cooldown?: boolean;
    can_consider_local_opportunity?: boolean;
    local_opportunity_operands?: CommanderCreationLocalOpportunityOperands;
    local_opportunity_first_failed_operand?: CommanderCreationLocalOpportunityOperand | null;
    local_occupation_candidate_present?: boolean;
    fallback_considered?: boolean;
    probe_brigade_selected?: boolean;
    probe_objective_ids?: string[];
    probe_reachable?: boolean;
    target_is_bounded_position?: boolean;
    reduction_participant_count?: number;
    single_brigade_sufficient?: boolean;
    escalate_to_operation?: boolean;
    overlap_checked?: boolean;
    overlap_found?: boolean;
    overlap_detail?: CommanderCreationOverlapDetail;
    probe_gate_receipt?: CommanderCreationProbeGateReceipt;
}

function commanderCreationOperation(site: CommanderCreationSite, op: CorpsOperation): CommanderCreationBuiltOperation {
    return { site, name: op.name, type: String(op.type), started_turn: op.started_turn };
}

function commanderCreationOperationTuple(
    hostCorpsId: string,
    op: Pick<CorpsOperation, 'name' | 'type' | 'started_turn' | 'sector_id' | 'objectives' | 'participating_brigades'>,
): CommanderCreationOperationTuple {
    return {
        derived_id: `${hostCorpsId}:${op.name}:t${op.started_turn}`,
        host_corps_id: hostCorpsId,
        name: op.name,
        type: String(op.type),
        started_turn: op.started_turn,
        sector_id: op.sector_id ?? null,
        objective_ids: [...(op.objectives ?? [])].sort(strictCompare),
        participant_ids: [...(op.participating_brigades ?? [])].sort(strictCompare),
    };
}

function findCommanderCreationOverlap(
    activeOperations: readonly CorpsOperation[],
    candidate: CorpsOperation,
    hostCorpsId: string,
    obs: CommanderCreationObservation | undefined,
): CorpsOperation | undefined {
    if (!obs) {
        return activeOperations.find((existing) => operationsOverlap(existing, candidate));
    }
    const detail: CommanderCreationOverlapDetail = {
        candidate: commanderCreationOperationTuple(hostCorpsId, candidate),
        checks: [],
        first_matched_clause: null,
        conflicting_operation: null,
    };
    obs.overlap_detail = detail;
    return activeOperations.find((existing) => operationsOverlap(existing, candidate, (predicates) => {
        const existingOperation = commanderCreationOperationTuple(hostCorpsId, existing);
        detail.checks.push({ existing_operation: existingOperation, ...predicates });
        if (predicates.first_matched_clause !== null && detail.first_matched_clause === null) {
            detail.first_matched_clause = predicates.first_matched_clause;
            detail.conflicting_operation = existingOperation;
        }
    }));
}

function observeCanConsiderLocalOpportunity(
    obs: CommanderCreationObservation,
    ops: readonly CorpsOperation[],
    allocation: AllocationResult,
    personality: OfficerPersonality,
    briefing: CommanderBriefing,
): boolean {
    const operands: CommanderCreationLocalOpportunityOperands = {
        ops_length_zero: null,
        allocation_can_launch_ops: null,
        surplus_pool_nonempty: null,
        initiative_above_threshold: null,
        active_slot_free: null,
    };
    let firstFailed: CommanderCreationLocalOpportunityOperand | null = null;
    const reached = (operand: CommanderCreationLocalOpportunityOperand, value: boolean): boolean => {
        operands[operand] = value;
        if (!value && firstFailed === null) firstFailed = operand;
        return value;
    };
    const result =
        reached('ops_length_zero', ops.length === 0) &&
        reached('allocation_can_launch_ops', allocation.can_launch_ops) &&
        reached('surplus_pool_nonempty', allocation.surplus_pool.length > 0) &&
        reached('initiative_above_threshold', personality.initiative > 0.3) &&
        reached(
            'active_slot_free',
            getOperationSlotUsageForOperations(briefing.active_operations.filter(op => op.phase !== 'recovery'))
                < getMaxOperationSlots(briefing.brigades.length),
        );
    obs.local_opportunity_operands = operands;
    obs.local_opportunity_first_failed_operand = firstFailed;
    return result;
}

function markCommanderCreationExit(obs: CommanderCreationObservation | undefined, exit: CommanderCreationExit): void {
    if (obs && obs.exit === null) obs.exit = exit;
}

function isFourthCorpsProbeWindow(briefing: CommanderBriefing): boolean {
    return briefing.faction === 'RBiH'
        && briefing.corps_id === 'arbih_4th_corps'
        && briefing.turn >= 177
        && briefing.turn <= 179;
}

function observeProbeDecision(
    obs: CommanderCreationObservation | undefined,
    site: CommanderCreationProbeDecisionSite,
    briefing: CommanderBriefing,
    sectorId: string | null,
    sectorIntelConfidence: number,
    consecutiveProbes: number,
): boolean {
    const receipt = obs?.probe_gate_receipt;
    if (!receipt) {
        return shouldLaunchProbeInstead(
            briefing.faction,
            sectorIntelConfidence,
            consecutiveProbes,
            briefing.turn,
            briefing.state_ref?.military.war_timeline,
        );
    }
    let trace: ProbeLaunchDecisionTrace | undefined;
    const launchProbe = shouldLaunchProbeInstead(
        briefing.faction,
        sectorIntelConfidence,
        consecutiveProbes,
        briefing.turn,
        briefing.state_ref?.military.war_timeline,
        (actual) => { trace = actual; },
    );
    if (trace) {
        receipt[site === 'plan' ? 'plan_decision' : 'fallback_escalation_decision'] = {
            reached: true,
            site,
            sector_id: sectorId,
            sector_intel_confidence: sectorIntelConfidence,
            consecutive_probes: consecutiveProbes,
            bilateral_offensive: briefing.bilateral_offensive ?? null,
            ...trace,
        };
    }
    return launchProbe;
}

function recordProbeWindowCandidate(
    obs: CommanderCreationObservation | undefined,
    site: CommanderCreationSite,
    operation: CorpsOperation,
    hostCorpsId: FormationId,
): void {
    obs?.probe_gate_receipt?.candidate_operations.push({
        site,
        operation: commanderCreationOperationTuple(hostCorpsId, operation),
    });
}

/**
 * Observation wrapper (opt-in `commander_creation`). The decision body is unchanged; `obs` exists only when the topic is on,
 * and one completion row is written to stdout when the REAL body returns normally (an exception writes no row).
 */
function buildOperations(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    planDecision: PlanDecision,
    personality: OfficerPersonality,
): CorpsOperation[] {
    if (!isReasonCodeTopicEnabled('commander_creation')) {
        return buildOperationsImpl(briefing, allocation, planDecision, personality, undefined);
    }
    const plan = planDecision.plan;
    const obs: CommanderCreationObservation = {
        plan_present: plan != null,
        plan_source: plan ? String(plan.source) : null,
        plan_status: plan ? String(plan.status) : null,
        plan_target_ids: plan ? [...plan.target_osids].sort(strictCompare) : [],
        general_entry_passed: false,
        exit: null,
        built: [],
    };
    if (isFourthCorpsProbeWindow(briefing)) {
        obs.probe_gate_receipt = {
            selector: { faction: briefing.faction, corps_id: briefing.corps_id, turn: briefing.turn },
            first_reached_exit: null,
            plan_decision: null,
            fallback_escalation_decision: null,
            candidate_operations: [],
            returned_operations: [],
            ...(briefing.turn === 178 ? { target_selection_detail: {
                status: 'not_reached',
                selected_brigade_id: null,
                selected_brigade_location: null,
                derived_sector_id: null,
                enemy_candidate_ids: [],
                direct_candidate_ids: [],
                survivor_ids: [],
                ranked_objective_ids: [],
                targets: [],
            } } : {}),
        };
    }
    const ops = buildOperationsImpl(briefing, allocation, planDecision, personality, obs);
    if (obs.exit === null) obs.exit = 'completed_no_operation';
    if (obs.probe_gate_receipt) {
        obs.probe_gate_receipt.first_reached_exit = obs.exit;
        obs.probe_gate_receipt.returned_operations = ops.map((operation) => (
            commanderCreationOperationTuple(briefing.corps_id, operation)
        ));
    }
    emitCommanderCreationRecord({
        schema: 'commander_creation.v1',
        phase: 'build_operations_complete',
        turn: briefing.turn,
        faction: briefing.faction,
        corps_id: briefing.corps_id,
        ...obs,
        host_corps_id: briefing.corps_id,
        returned: ops.map((op) => ({ name: op.name, type: String(op.type), started_turn: op.started_turn })),
    });
    return ops;
}

function buildOperationsImpl(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    planDecision: PlanDecision,
    personality: OfficerPersonality,
    obs: CommanderCreationObservation | undefined,
): CorpsOperation[] {
    const ops: CorpsOperation[] = [];

    // Keep existing active operations from briefing (don't re-create active ops)
    // Pre-planned ops are passed through as-is since they have their own lifecycle
    // Active operations live on corps_command state, not here.

    // If plan is executing or ready, create a new CorpsOperation from the plan
    if (
        planDecision.plan &&
        ACTIVE_PLAN_STATUSES.has(planDecision.plan.status) &&
        (planDecision.plan.target_osids.length > 0 || planDecision.plan.source === 'opportunity')
    ) {
        const activePlan = planDecision.plan;
        if (obs) obs.general_entry_passed = true;
        const authoredOperationName = activePlan.source === 'pre_planned'
            ? activePlan.objective_description
            : undefined;
        const mayJoinPlanOperation = (brigadeId: string): boolean => mayEliteJoinOperation(
            brigadeId as FormationId,
            briefing.turn,
            authoredOperationName,
        );
        // Slot cap guard: don't emit a new op if corps is already at capacity.
        // Mirrors hasAvailableSlot() used in bot_corps_directives / bot_corps_operations.
        // Exclude recovery-phase ops — they don't occupy an active slot.
        const activeSlotUsers = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.activeSlotUsers`,
            () => briefing.active_operations.filter(op => op.phase !== 'recovery'),
        );
        const activeSlotUsage = getOperationSlotUsageForOperations(activeSlotUsers);
        const maxOperationSlots = getMaxOperationSlots(briefing.brigades.length);
        if (obs) {
            obs.active_slot_users = activeSlotUsage;
            obs.max_operation_slots = maxOperationSlots;
        }
        if (activeSlotUsage >= maxOperationSlots) {
            markCommanderCreationExit(obs, 'active_slot_full');
            return ops;
        }
        const surplusSet = new Set(
            allocation.surplus_pool.map(ev => ev.brigade_id),
        );
        if (activePlan.bilateral_offensive) {
            // The plan reserved these brigades on creation. A subsequent front
            // repartition may garrison-lock them because the bilateral front has
            // many edges; that allocation churn must not erase the real operation
            // between READY and emission. Combat readiness and reachability remain
            // enforced below for every reserved participant.
            for (const brigadeId of activePlan.assigned_brigades) {
                if (mayJoinPlanOperation(brigadeId)) surplusSet.add(brigadeId);
            }
        }

        // Build brigade location lookup from briefing
        const brigadeLocationMap = new Map<string, string>();
        for (const b of briefing.brigades) {
            if (b.location_osid) brigadeLocationMap.set(b.id, b.location_osid);
        }

        // Primary sector is identified first. The default participant pool derives
        // from that sector's assigned brigades (∩ surplusSet ∩ reachable).
        // Cross-sector brigades join only as explicit bounded attachments via the
        // adjacent-sector cap (ADJACENT_SECTOR_ATTACH_RATE). No silent corps-wide draft.

        const sectorId = findSectorWithMostTargetOverlap(planDecision, briefing);
        const primarySector = sectorId
            ? briefing.sectors.find(s => s.sector_id === sectorId)
            : undefined;

        // Determine the first objective OSID for reachability filtering.
        // When plan has no specific target OSIDs, pre-derive them so reachability
        // validation can still apply (prevents rear-area brigades entering the pool).
        // Root of the original ZEA / 13-15 turn stall bug — preserve this guard.
        const planTargetOsids = activePlan.target_osids;
        const scopedPlanTargetOsids = primarySector
            ? selectSectorObjectives(primarySector, planTargetOsids)
            : [...planTargetOsids].sort(strictCompare);
        const firstObjectiveOsid = planTargetOsids.length > 0
            ? scopedPlanTargetOsids[0] ?? null
            : deriveTargetsFromSectors(briefing, 1, primarySector)[0] ?? null;
        const reachabilityObjectiveOsid = firstObjectiveOsid;

        const adjacencyMap = briefing.spatial.adjacency;
        const friendlyOsids = briefing.spatial.friendlyOsidsByFaction.get(briefing.faction);

        // Reachability check: brigade must BFS through friendly territory to a
        // friendly OSID adjacent to the first objective within MAX_REACHABILITY_HOPS.
        // NOTE: home_defense brigades CAN be op participants — evaluateHomeDefense in
        // bot_brigade_eval_attack.ts already exempts them via isActiveSectorOperationParticipant.
        // Approach OSIDs are constant for the whole buildOperations call — computed once here.
        const friendlyApproachOsids: readonly string[] = (() => {
            if (!reachabilityObjectiveOsid || !friendlyOsids) return [];
            const neighbors = (adjacencyMap.get(reachabilityObjectiveOsid) ?? []) as readonly string[];
            return neighbors.filter(n => friendlyOsids.has(n)).sort(strictCompare);
        })();
        const canReach = (brigadeId: string): boolean => {
            if (!reachabilityObjectiveOsid) return true;
            if (friendlyApproachOsids.length === 0) return false;
            const locationOsid = brigadeLocationMap.get(brigadeId);
            if (!locationOsid) return false;
            for (const approachOsid of friendlyApproachOsids) {
                const dist = spatialFriendlyDistance(briefing.spatial, briefing.faction, locationOsid, approachOsid, MAX_REACHABILITY_HOPS);
                if (dist >= 0) {
                    // P-A: 8-hop reachability is necessary but not sufficient — the brigade must
                    // also be able to physically arrive inside this operation's own assembly
                    // budget. A plan-driven commander op carries the factory-default
                    // planning_duration of 1.
                    return canReachAssemblyInTime(briefing, brigadeId, reachabilityObjectiveOsid, 1);
                }
            }
            return false;
        };

        // Primary pool: brigades assigned to the primary sector that are surplus + reachable.
        let primaryPool: string[] = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.primaryPool`,
            () => primarySector
                ? primarySector.assigned_brigade_ids
                    .filter(id => surplusSet.has(id)
                        && mayJoinPlanOperation(id)
                        && canReach(id)
                        && isCombatReadyParticipant(briefing, id))
                    .sort(strictCompare)
                : [],
        );
        if (activePlan.bilateral_offensive) {
            // The planner explicitly formed this small assault group from the
            // same corps zone. Sector topology may place the selected objective
            // under a neighboring sub-sector between planning and launch; keep
            // the reserved group coherent so that bookkeeping churn does not
            // turn a real corps operation into a paper plan.
            primaryPool = [...new Set([
                ...primaryPool,
                ...activePlan.assigned_brigades.filter(id =>
                    mayJoinPlanOperation(id)
                    && canReach(id)
                    && isCombatReadyParticipant(briefing, id)),
            ])].sort(strictCompare);
        }

        // Adjacent-sector attachments: bounded by ADJACENT_SECTOR_ATTACH_RATE per sector.
        // Only sectors territory-adjacent to the primary sector may contribute.
        const { attachedPool, attachmentSectorIds } = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.attachedPool`,
            () => {
                const attachedPool: string[] = [];
                const attachmentSectorIds = new Set<string>();
                if (primarySector) {
                    // Pre-build the set of all OSIDs neighboring any primary-sector territory OSID.
                    // Avoids creating a new Set per candidate sector inside the filter.
                    const primaryNeighborSet = new Set<string>();
                    for (const osid of primarySector.territory_osids) {
                        for (const n of (adjacencyMap.get(osid) ?? []) as readonly string[]) {
                            primaryNeighborSet.add(n);
                        }
                    }

                    const adjacentCorpsSectors = briefing.sectors
                        .filter(s => {
                            if (s.corps_id !== briefing.corps_id || s.sector_id === sectorId) return false;
                            return s.territory_osids.some(osid => primaryNeighborSet.has(osid));
                        })
                        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

                    for (const adjSector of adjacentCorpsSectors) {
                        const totalAssigned = adjSector.assigned_brigade_ids.length;
                        // Cap: floor(total × ADJACENT_SECTOR_ATTACH_RATE), leaving ≥ ADJACENT_SECTOR_MIN_RESIDUAL behind.
                        const maxAttachable = Math.min(
                            Math.floor(totalAssigned * ADJACENT_SECTOR_ATTACH_RATE),
                            Math.max(0, totalAssigned - ADJACENT_SECTOR_MIN_RESIDUAL),
                        );
                        if (maxAttachable <= 0) continue;

                        const eligibleFromSector = adjSector.assigned_brigade_ids
                            .filter(id => surplusSet.has(id)
                                && mayJoinPlanOperation(id)
                                && canReach(id)
                                && isCombatReadyParticipant(briefing, id))
                            .sort(strictCompare)
                            .slice(0, maxAttachable);

                        if (eligibleFromSector.length > 0) {
                            attachedPool.push(...eligibleFromSector);
                            attachmentSectorIds.add(adjSector.sector_id);
                        }
                    }
                }
                return { attachedPool, attachmentSectorIds };
            },
        );

        if (obs) {
            obs.primary_pool_size = primaryPool.length;
            obs.attached_pool_size = attachedPool.length;
        }
        let participatingBrigades = capOpportunityOperationParticipants(
            [...new Set([...primaryPool, ...attachedPool])].sort(strictCompare),
            activePlan.source,
            activePlan.required_brigades,
        );

        // When the primary sector is anchored, 2 brigades is viable — the sector
        // anchor provides strategic coherence the old broad-pool lacked. The predictor
        // (force_ratio_estimate) will determine how quickly a thin op fails at execution.
        // Without an anchor (fallback: no sector matched) keep the corps-wide floor.
        const baseMinForOp = primarySector ? 2 : MIN_BRIGADES_FOR_PLAN;

        // Phase E MVS: international_standing → op-launch hesitation.
        // The multiplier reads the briefing-surfaced intl_standing (which is
        // populated only when the two-tier propagation gate is ON; see
        // briefing.ts §11). When the gate is OFF, `political_dimensions` is
        // undefined → `getIntlStandingOpsHesitationMultiplier(undefined, ...)` ===
        // 1.0 → `effectiveMinForOp === baseMinForOp` → byte-identical to
        // pre-Phase-E launch behavior. Gated `!== 1.0` mirrors the canonical
        // equipment-quality-modifier consumer pattern in combat_math.ts:1305-1310.
        // ACTIVATION GUARD: `briefing.turn` is passed as the turn-gate input so the
        // channel stays inert before mid-1994 (INTL_STANDING_OPS_HESITATION_MIN_TURN)
        // even when the flags are flipped ON — avoids back-dating the 1994–95
        // diplomatic-isolation dynamic onto the 1992–93 war.
        const hesitationMult = getIntlStandingOpsHesitationMultiplier(
            briefing.political_dimensions?.international_standing,
            briefing.turn,
        );
        // Phase E Packet 2: internal_cohesion → op-launch caution bias.
        // Chained alongside the MVS hesitation multiplier; same byte-stability
        // contract. When the cohesion sub-flag is OFF, briefing has no
        // `internal_cohesion` field → `getCohesionCautionBiasMultiplier(undefined)`
        // === 1.0 → multiplicative composition is a no-op. The combined `!== 1.0`
        // guard below keeps the `effectiveMinForOp === baseMinForOp` byte-stable
        // fast-path when EITHER sub-flag is OFF (both multipliers 1.0 → product
        // 1.0 → branch not taken).
        const cohesionMult = getCohesionCautionBiasMultiplier(
            briefing.political_dimensions?.internal_cohesion,
        );
        // Phase E extension: patron_confidence → op-launch patron-hesitation and
        // military_credibility → op-launch caution-bias. Chained alongside the two
        // MVS multipliers; same byte-stability contract. When a sub-flag is OFF, the
        // briefing has no corresponding field → the helper receives undefined →
        // returns 1.0 → multiplicative composition is a no-op. With all four OFF the
        // product is exactly 1.0 → the `!== 1.0` guard keeps the byte-stable fast-path.
        const patronMult = getPatronConfidenceOpsHesitationMultiplier(
            briefing.political_dimensions?.patron_confidence,
        );
        const credibilityMult = getMilitaryCredibilityCautionBiasMultiplier(
            briefing.political_dimensions?.military_credibility,
        );
        // Embargo-driven op-launch dampener (independent of the four MVS/Phase-E
        // political multipliers above — see getEmbargoOpsHesitationMultiplier doc).
        // No-op (1.0) unless embargo_offensive_gate_enabled and briefing.state_ref
        // is present.
        const embargoMult = briefing.state_ref
            ? getEmbargoOpsHesitationMultiplier(briefing.state_ref, briefing.faction)
            : 1.0;
        const combinedMult = hesitationMult * cohesionMult * patronMult * credibilityMult * embargoMult;
        const effectiveMinForOp = combinedMult !== 1.0
            ? Math.ceil(baseMinForOp / combinedMult)
            : baseMinForOp;
        if (obs) {
            obs.participating_count = participatingBrigades.length;
            obs.effective_min_for_op = effectiveMinForOp;
        }
        if (participatingBrigades.length < effectiveMinForOp) {
            markCommanderCreationExit(obs, 'below_min_participants');
            return ops;
        }

        // Build the set of enemy OSIDs actually present in the primary sector's sub_segments.
        // An objective that is no longer in any sub_segment.enemy_osids means the sector
        // front has shifted and collectObjectiveApproachOsids will return an empty approach
        // set — causing every brigade to have no valid attack position and the op to stall
        // indefinitely (zero attacks per turn). Drop such stale objectives now.
        const reachableEnemyOsids = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.reachableEnemyOsids`,
            () => {
                const reachableEnemyOsids = new Set<string>();
                const objectiveSectors = primarySector
                    ? [primarySector]
                    : briefing.sectors.filter(sector => sector.corps_id === briefing.corps_id);
                for (const sector of objectiveSectors) {
                    for (const seg of sector.sub_segments ?? []) {
                        for (const osid of seg.enemy_osids ?? []) {
                            reachableEnemyOsids.add(osid);
                        }
                    }
                }
                return reachableEnemyOsids;
            },
        );

        const objectives = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.objectives`,
            () => {
                const rawObjectives = activePlan.target_osids.length > 0
                    ? scopedPlanTargetOsids
                    : deriveTargetsFromSectors(
                        briefing,
                        Math.floor(participatingBrigades.length * 0.5),
                        primarySector,
                    );

                // Filter: drop any objective OSID not reachable from this corps's front segments.
                // Only apply when the corps has at least one reachable enemy OSID (i.e., the set
                // is non-empty), to avoid incorrectly zeroing objectives for a corps with no sectors.
                return reachableEnemyOsids.size > 0
                    ? rawObjectives.filter(osid => reachableEnemyOsids.has(osid))
                    : rawObjectives;
            },
        );

        // Guard: if every plan objective was stale (none survived the filter), skip
        // creating this operation rather than injecting an empty-objectives op that
        // would immediately stall. The plan will be abandoned on the next assess cycle.
        if (obs) {
            obs.reachable_enemy_osid_count = reachableEnemyOsids.size;
            obs.objective_ids = [...objectives].sort(strictCompare);
        }
        if (objectives.length === 0) {
            markCommanderCreationExit(obs, 'no_objectives');
            return ops;
        }

        // ENCLAVE ELIGIBILITY — added 2026-08-26. This creation site had NO enclave awareness of
        // any kind, so a besieged brigade could be committed to objectives on the far side of the
        // map. Measured: after Srebrenica fell, a displaced 28th Division survivor joined 2nd Corps
        // operations that took Lopare, Priboj, Jablanica and Šekovići — all RS in EVERY painted
        // checkpoint, and both towns were VRS brigade HQs in 1995. A §6 panel ruled the result
        // NON-COMPLIANT. The rule already existed in `sector_offensive.ts`; it was simply never
        // asked here, and 14 of the run's 60 axes take this path.
        //
        // It has to sit HERE, after `objectives` is derived — the eligibility question is
        // "eligible FOR WHAT", so it cannot be answered at participant-selection time above, where
        // objectives do not exist yet. A first attempt placed it beside the participant list and
        // crashed the run on the temporal dead zone. Because the `effectiveMinForOp` check has
        // already run against the UNFILTERED list, the minimum is re-checked below: dropping under
        // strength must abort the operation, not launch it understrength.
        {
            const eligibilityById = new Map(briefing.brigades.map((b) => [b.id, b]));
            const eligible = participatingBrigades.filter((id) =>
                isBrigadeEligibleForOperationObjectives(eligibilityById.get(id), objectives));
            if (obs) obs.eligible_count = eligible.length;
            if (eligible.length < effectiveMinForOp) {
                markCommanderCreationExit(obs, 'below_min_after_eligibility');
                return ops;
            }
            participatingBrigades = eligible;
        }

        const commandState = briefing.state_ref?.military.corps_command?.[briefing.corps_id];
        const sectorIntelConfidence = briefing.state_ref && sectorId
            ? getStalestSectorIntelConfidence(briefing.state_ref, sectorId)
            : 0;
        // The designated ARBiH bilateral corps already has an explicit,
        // front-derived campaign objective. Treat that as sufficient command
        // intent to commit rather than converting the short war window into
        // another non-occupying reconnaissance probe.
        const launchProbe = !briefing.bilateral_offensive && observeProbeDecision(
            obs,
            'plan',
            briefing,
            sectorId ?? null,
            sectorIntelConfidence,
            commandState?.consecutive_probes ?? 0,
        );
        if (obs) {
            obs.launch_probe_evaluated = !briefing.bilateral_offensive;
            if (!briefing.bilateral_offensive) obs.launch_probe = launchProbe;
        }
        if (launchProbe) {
            const probeOp = buildProbeOperation(
                briefing.corps_id,
                briefing.turn,
                participatingBrigades[0]!,
                sectorId ?? undefined,
                objectives,
            );
            const conflictingProbe = findCommanderCreationOverlap(
                briefing.active_operations,
                probeOp,
                briefing.corps_id,
                obs,
            );
            if (obs) {
                obs.built.push(commanderCreationOperation('plan_probe', probeOp));
                recordProbeWindowCandidate(obs, 'plan_probe', probeOp, briefing.corps_id);
                obs.overlap_checked = true;
                obs.overlap_found = conflictingProbe != null;
                markCommanderCreationExit(obs, conflictingProbe ? 'plan_probe_overlap_suppressed' : 'plan_probe_created');
            }
            if (!conflictingProbe) {
                ops.push(probeOp);
            }
            return ops;
        }

        const op = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.buildOperation`,
            () => {
                // Build a personnel lookup for initial_strength calculation.
                const personnelById = new Map<string, number>();
                for (const b of briefing.brigades) personnelById.set(b.id, b.personnel ?? 0);

                const initialStrength = participatingBrigades.reduce(
                    (sum, id) => sum + (personnelById.get(id) ?? 0), 0,
                );

                // PERMITTED CREATION ENTRY POINT — commander-generated operations only.
                // All CorpsOperation objects must be built via the factory functions in corps_operation_helpers.ts.
                const opName = pickOperationName(briefing.corps_id, briefing.turn, briefing.faction, briefing.state_ref);
                const op = buildCommanderOperation(
                    briefing.corps_id,
                    briefing.turn,
                    participatingBrigades,
                    sectorId ?? undefined,
                    objectives,
                    initialStrength,
                    opName,
                );

                // Sector-anchored launch contract fields — direct from Phase 3 pool selection.
                if (primaryPool.length > 0) op.primary_sector_brigades = primaryPool;
                if (attachedPool.length > 0) {
                    op.attached_brigades = attachedPool;
                    op.reinforcement_source = 'adjacent_sector';
                }
                if (attachmentSectorIds.size > 0) {
                    op.supporting_sector_ids = [...attachmentSectorIds].sort(strictCompare);
                }
                return op;
            },
        );

        const conflictingOp = findCommanderCreationOverlap(
            briefing.active_operations,
            op,
            briefing.corps_id,
            obs,
        );
        if (obs) {
            obs.built.push(commanderCreationOperation('general', op));
            recordProbeWindowCandidate(obs, 'general', op, briefing.corps_id);
            obs.overlap_checked = true;
            obs.overlap_found = conflictingOp != null;
        }
        if (conflictingOp) {
            markCommanderCreationExit(obs, 'general_overlap_suppressed');
            return ops;
        }

        // Phase 4 (Force Quality Foundation): copy the readiness trait snapshot
        // taken at plan-creation time into the operation lifecycle. This is the
        // single transfer point — sector_offensive's finalizeOperationAAR reads
        // it back into the AAR. No new computation here; pure copy.
        if (activePlan.force_quality_traits) {
            op.force_quality_traits_at_launch = activePlan.force_quality_traits;
        }
        if (activePlan.force_quality_blocked) {
            op.force_quality_blocked_at_launch = true;
        }
        if (typeof activePlan.force_quality_max_axes === 'number') {
            op.force_quality_max_axes_at_launch = activePlan.force_quality_max_axes;
        }

        markCommanderCreationExit(obs, 'general_created');
        ops.push(op);
    }

    // Per-corps probe cooldown: probes are recon-by-force, not a continuous
    // pressure tool. Without this gate, a corps with a stable surplus brigade
    // re-emits a probe every ~2 turns against whichever enemy OSID is adjacent,
    // turning probes into a probe-spam attrition channel. Considers both
    // in-flight probes (active_operations) and previously-completed probes
    // (previous_state.operation_history) to bridge the recovery transition.
    const PROBE_COOLDOWN_TURNS = 4;
    const probeOnCooldown = botOrdersPerfTime(
        `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.cooldown`,
        () => {
            const recentProbeStartTurns: number[] = [];
            for (const op of briefing.active_operations) {
                if (op.type === 'probe') recentProbeStartTurns.push(op.started_turn);
            }
            for (const entry of briefing.previous_state?.operation_history ?? []) {
                if (entry.type === 'probe') recentProbeStartTurns.push(entry.started_turn);
            }
            const lastProbeTurn = recentProbeStartTurns.length > 0
                ? recentProbeStartTurns.reduce((max, t) => t > max ? t : max, -Infinity)
                : -Infinity;
            return Number.isFinite(lastProbeTurn) && (briefing.turn - lastProbeTurn) < PROBE_COOLDOWN_TURNS;
        },
    );

    const canConsiderLocalOpportunity = obs
        ? observeCanConsiderLocalOpportunity(obs, ops, allocation, personality, briefing)
        : ops.length === 0 &&
            allocation.can_launch_ops &&
            allocation.surplus_pool.length > 0 &&
            personality.initiative > 0.3 &&
            getOperationSlotUsageForOperations(briefing.active_operations.filter(op => op.phase !== 'recovery')) < getMaxOperationSlots(briefing.brigades.length);
    const localOccupationCandidate = canConsiderLocalOpportunity
        ? botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.localOccupation.selectCandidate`,
            () => findLocalOccupationCandidate(briefing, allocation),
        )
        : null;
    if (obs) {
        obs.probe_on_cooldown = probeOnCooldown;
        obs.can_consider_local_opportunity = canConsiderLocalOpportunity;
        if (canConsiderLocalOpportunity) obs.local_occupation_candidate_present = localOccupationCandidate != null;
    }

    // If no plan but surplus and high-initiative commander: occupy a verified
    // local pocket, or retain the cooldown-governed generic probe fallback.
    if (canConsiderLocalOpportunity && (localOccupationCandidate != null || !probeOnCooldown)) {
        if (obs) obs.fallback_considered = true;

        // A verified local occupation pair takes precedence. If there is none,
        // retain the existing highest-fitness probe selection unchanged.
        const probeBrigade = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.selectBrigade`,
            () => localOccupationCandidate?.brigade ?? (() => {
                const queuedHistoricalParticipants = briefing.state_ref
                    ? getHeadQueuedPrePlannedBrigadeIds(briefing.state_ref)
                    : new Set<FormationId>();
                return allocation.surplus_pool
                    .filter(ev => ev.is_combat_effective && !ev.is_disrupted)
                    .filter(ev => mayEliteJoinOperation(ev.brigade_id, briefing.turn))
                    .filter(ev => !queuedHistoricalParticipants.has(ev.brigade_id))
                    .filter(ev => isCombatReadyParticipant(briefing, ev.brigade_id))
                    .sort((a, b) => {
                        const fitDiff = b.fitness_offense - a.fitness_offense;
                        if (fitDiff !== 0) return fitDiff;
                        return strictCompare(a.brigade_id, b.brigade_id);
                    })[0];
            })(),
        );
        if (obs) obs.probe_brigade_selected = probeBrigade != null;
        const targetSelectionDetail = obs?.probe_gate_receipt?.target_selection_detail;
        if (targetSelectionDetail && !probeBrigade) targetSelectionDetail.status = 'no_brigade';

        if (probeBrigade) {
            if (targetSelectionDetail) {
                targetSelectionDetail.selected_brigade_id = probeBrigade.brigade_id;
                targetSelectionDetail.selected_brigade_location = briefing.brigades.find(
                    (brigade) => brigade.id === probeBrigade.brigade_id,
                )?.location_osid ?? null;
            }
            const probeSectorId = localOccupationCandidate?.sector_id
                ?? derivePrimarySectorForBrigades(
                    briefing.sectors.filter((sector) => sector.corps_id === briefing.corps_id),
                    briefing.corps_id,
                    [probeBrigade.brigade_id],
                    Object.fromEntries(briefing.brigades.map((brigade) => [brigade.id, brigade])),
                );
            if (targetSelectionDetail) targetSelectionDetail.derived_sector_id = probeSectorId ?? null;

            // Derive probe objective: first enemy-adjacent OSID in the probe sector.
            // Without objectives the probe op has no axis targets and would be ZEA.
            const probeObjectives: string[] = botOrdersPerfTime(
                `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives`,
                () => {
                    if (localOccupationCandidate) {
                        if (targetSelectionDetail) {
                            targetSelectionDetail.status = 'local_occupation_bypass';
                            targetSelectionDetail.survivor_ids = [localOccupationCandidate.target_osid];
                            targetSelectionDetail.ranked_objective_ids = [localOccupationCandidate.target_osid];
                        }
                        return [localOccupationCandidate.target_osid];
                    }
                    let probeObjectives: string[] = [];
                    if (probeSectorId) {
                        const sector = briefing.sectors.find(s => s.sector_id === probeSectorId);
                        if (sector) {
                            const adjacency = briefing.spatial.adjacency;
                            const friendlySet = briefing.spatial.friendlyOsidsByFaction?.get(briefing.faction);
                            const probeBrigLoc = briefing.brigades.find(b => b.id === probeBrigade.brigade_id)?.location_osid;
                            const terrainCache = botOrdersPerfTime(
                                `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.terrainCache`,
                                () => briefing.reverse_map ? buildTerrainCache(briefing.reverse_map) : null,
                            );
                            if (adjacency && friendlySet && probeBrigLoc) {
                                const enemyTargets = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.enemyTargets`,
                                    () => {
                                        const enemyTargets = new Set<string>();
                                        for (const sub of sector.sub_segments ?? []) {
                                            for (const fOsid of sub.friendly_osids ?? []) {
                                                for (const neighbor of adjacency.get(fOsid) ?? []) {
                                                    if (!friendlySet.has(neighbor)) {
                                                        enemyTargets.add(neighbor);
                                                    }
                                                }
                                            }
                                        }
                                        return enemyTargets;
                                    },
                                );
                                const targetDetailByOsid = targetSelectionDetail
                                    ? new Map<string, CommanderCreationProbeTargetDetail>()
                                    : null;
                                if (targetSelectionDetail && targetDetailByOsid) {
                                    targetSelectionDetail.enemy_candidate_ids = [...enemyTargets].sort(strictCompare);
                                    for (const target of targetSelectionDetail.enemy_candidate_ids) {
                                        const targetNeighbors = (adjacency.get(target) ?? []) as readonly string[];
                                        const direct = targetNeighbors.includes(probeBrigLoc);
                                        targetDetailByOsid.set(target, {
                                            target_id: target,
                                            cooldown_raw_present: null,
                                            cooldown_raw_value: null,
                                            cooldown_effective_value: null,
                                            controller: null,
                                            politically_blocked: null,
                                            prediction_present: null,
                                            prediction_outcome: null,
                                            prediction_threshold: 'stalemate',
                                            predicted_viable: null,
                                            direct,
                                            reachable: null,
                                            approach_distance: null,
                                            cooldown_filter_reached: false,
                                            cooldown_filter_passed: null,
                                            politics_filter_reached: false,
                                            politics_filter_passed: null,
                                            direct_filter_reached: true,
                                            direct_filter_passed: direct,
                                            reachable_filter_reached: false,
                                            reachable_filter_passed: null,
                                            prediction_filter_reached: false,
                                            prediction_filter_passed: null,
                                            passed: false,
                                            first_rejecting_filter: direct ? null : 'direct',
                                        });
                                    }
                                }
                                const directEnemyTargets = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.directEnemyTargets`,
                                    () => {
                                        const directEnemyTargets = new Set<string>();
                                        for (const target of [...enemyTargets].sort(strictCompare)) {
                                            const targetNeighbors = (adjacency.get(target) ?? []) as readonly string[];
                                            if (targetNeighbors.includes(probeBrigLoc)) {
                                                directEnemyTargets.add(target);
                                            }
                                        }
                                        return directEnemyTargets;
                                    },
                                );
                                if (targetSelectionDetail) {
                                    targetSelectionDetail.direct_candidate_ids = [...directEnemyTargets].sort(strictCompare);
                                }
                                const predictedTargets = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.predictDirectTargets`,
                                    () => predictDirectEnemyTargets(
                                        briefing,
                                        probeBrigade.brigade_id,
                                        directEnemyTargets,
                                        adjacency as Map<any, any>,
                                        terrainCache,
                                    ),
                                );
                                const predictedTargetByOsid = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.predictedTargetMap`,
                                    () => new Map(
                                        predictedTargets.map((candidate) => [candidate.osid, candidate]),
                                    ),
                                );
                                const rankedTargets = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.rankTargets`,
                                    () => {
                                        const mappedTargets = [...directEnemyTargets]
                                        .map((target) => {
                                            const cooldown = briefing.failed_offensive_objectives?.[target];
                                            const targetController = briefing.reverse_map && briefing.state_ref
                                                ? getPoliticalControllerOSID(briefing.state_ref, target, briefing.reverse_map)
                                                : null;
                                            const targetNeighbors = (adjacency.get(target) ?? []) as readonly string[];
                                            const direct = true;
                                            const directPrediction = predictedTargetByOsid.get(target);
                                            let bestApproachDistance = direct ? 0 : Number.POSITIVE_INFINITY;
                                            for (const approachOsid of targetNeighbors.filter(n => friendlySet.has(n)).sort(strictCompare)) {
                                                const dist = spatialFriendlyDistance(
                                                    briefing.spatial,
                                                    briefing.faction,
                                                    probeBrigLoc,
                                                    approachOsid,
                                                    MAX_REACHABILITY_HOPS,
                                                );
                                                if (dist >= 0 && dist < bestApproachDistance) {
                                                    bestApproachDistance = dist;
                                                }
                                            }
                                            const candidate = {
                                                target,
                                                onCooldown: (cooldown?.cooldown_until_turn ?? 0) > briefing.turn,
                                                direct,
                                                politicallyBlocked: briefing.state_ref != null
                                                    && targetController != null
                                                    && (
                                                        isRbihHrhbCombatBlocked(
                                                            briefing.state_ref,
                                                            briefing.faction,
                                                            targetController,
                                                        )
                                                        || shouldGrazBlockAttack(
                                                            briefing.state_ref,
                                                            briefing.corps_id,
                                                            briefing.faction,
                                                            target,
                                                            targetController,
                                                        )
                                                    ),
                                                predictedViable: directPrediction == null
                                                    ? true
                                                    : isOutcomeSufficientForAttack(
                                                        directPrediction.prediction.predicted_outcome,
                                                        'stalemate',
                                                    ),
                                                reachable: Number.isFinite(bestApproachDistance),
                                                approachDistance: bestApproachDistance,
                                            };
                                            if (targetDetailByOsid) {
                                                const cooldownRawPresent = cooldown != null
                                                    && Object.prototype.hasOwnProperty.call(cooldown, 'cooldown_until_turn');
                                                const detail = targetDetailByOsid.get(target)!;
                                                Object.assign(detail, {
                                                    cooldown_raw_present: cooldownRawPresent,
                                                    cooldown_raw_value: cooldownRawPresent
                                                        ? cooldown?.cooldown_until_turn ?? null
                                                        : null,
                                                    cooldown_effective_value: cooldown?.cooldown_until_turn ?? 0,
                                                    controller: targetController,
                                                    politically_blocked: candidate.politicallyBlocked,
                                                    prediction_present: directPrediction != null,
                                                    prediction_outcome: directPrediction?.prediction.predicted_outcome ?? null,
                                                    predicted_viable: candidate.predictedViable,
                                                    reachable: candidate.reachable,
                                                    approach_distance: candidate.approachDistance,
                                                });
                                            }
                                            return candidate;
                                        });
                                        const filteredTargets = targetDetailByOsid
                                            ? mappedTargets
                                                .filter((candidate) => {
                                                    const detail = targetDetailByOsid.get(candidate.target)!;
                                                    detail.cooldown_filter_reached = true;
                                                    detail.cooldown_filter_passed = !candidate.onCooldown;
                                                    if (candidate.onCooldown) detail.first_rejecting_filter = 'cooldown';
                                                    return !candidate.onCooldown;
                                                })
                                                .filter((candidate) => {
                                                    const detail = targetDetailByOsid.get(candidate.target)!;
                                                    detail.politics_filter_reached = true;
                                                    detail.politics_filter_passed = !candidate.politicallyBlocked;
                                                    if (candidate.politicallyBlocked) detail.first_rejecting_filter = 'politics';
                                                    return !candidate.politicallyBlocked;
                                                })
                                                .filter((candidate) => {
                                                    const detail = targetDetailByOsid.get(candidate.target)!;
                                                    if (!candidate.direct) {
                                                        detail.first_rejecting_filter = 'direct';
                                                        return false;
                                                    }
                                                    detail.reachable_filter_reached = true;
                                                    detail.reachable_filter_passed = candidate.reachable;
                                                    if (!candidate.reachable) {
                                                        detail.first_rejecting_filter = 'reachable';
                                                        return false;
                                                    }
                                                    detail.prediction_filter_reached = true;
                                                    detail.prediction_filter_passed = candidate.predictedViable;
                                                    if (!candidate.predictedViable) {
                                                        detail.first_rejecting_filter = 'predicted_viable';
                                                        return false;
                                                    }
                                                    detail.passed = true;
                                                    return true;
                                                })
                                            : mappedTargets
                                                .filter((candidate) => !candidate.onCooldown)
                                                .filter((candidate) => !candidate.politicallyBlocked)
                                        // Probe ops are one-brigade recon-by-force, not small marches.
                                        // Only launch when the chosen brigade is already on a valid
                                        // approach node for the target this turn and the brigade can
                                        // already clear the probe threshold on that exact target.
                                                .filter((candidate) => candidate.direct && candidate.reachable && candidate.predictedViable);
                                        const ranked = filteredTargets.sort((a, b) =>
                                            Number(b.direct) - Number(a.direct)
                                            || a.approachDistance - b.approachDistance
                                            || strictCompare(a.target, b.target)
                                        );
                                        if (targetSelectionDetail && targetDetailByOsid) {
                                            targetSelectionDetail.targets = [...targetDetailByOsid.values()];
                                            targetSelectionDetail.survivor_ids = ranked.map((candidate) => candidate.target);
                                        }
                                        return ranked;
                                    },
                                );
                                probeObjectives = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.pickObjective`,
                                    () => rankedTargets.slice(0, 1).map((candidate) => candidate.target),
                                );
                                if (targetSelectionDetail) {
                                    targetSelectionDetail.ranked_objective_ids = [...probeObjectives];
                                    targetSelectionDetail.status = enemyTargets.size === 0
                                        ? 'empty_enemy_set'
                                        : directEnemyTargets.size === 0
                                            ? 'empty_direct_set'
                                            : rankedTargets.length === 0
                                                ? 'all_filtered'
                                                : 'generic_search';
                                }
                            } else if (targetSelectionDetail) {
                                targetSelectionDetail.status = 'missing_adjacency_or_friendly_set_or_location';
                            }
                        } else if (targetSelectionDetail) {
                            targetSelectionDetail.status = 'no_sector';
                        }
                    } else if (targetSelectionDetail) {
                        targetSelectionDetail.status = 'no_sector';
                    }
                    return probeObjectives;
                },
            );

            // Skip probe if no enemy-adjacent OSIDs found — empty objectives cause immediate ZEA.
            if (obs) obs.probe_objective_ids = [...probeObjectives].sort(strictCompare);
            if (probeObjectives.length > 0) {
                const probeReachable = botOrdersPerfTime(
                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.reachability`,
                    () => {
                        // Reachability check: probe brigade must BFS-reach the target within MAX_REACHABILITY_HOPS.
                        const probeTarget = probeObjectives[0]!;
                        const probeAdj = briefing.spatial.sharedBoundaryAdjacency ?? briefing.spatial.adjacency;
                        const probeFriendly = briefing.spatial.friendlyOsidsByFaction?.get(briefing.faction);
                        const probeBrigLoc = briefing.brigades.find(b => b.id === probeBrigade.brigade_id)?.location_osid;
                        if (probeAdj && probeFriendly && probeBrigLoc) {
                            const targetNeighbors = (probeAdj.get(probeTarget) ?? []) as readonly string[];
                            const approachOsids = targetNeighbors.filter(n => probeFriendly.has(n)).sort(strictCompare);
                            for (const approachOsid of approachOsids) {
                                const dist = spatialFriendlyDistance(briefing.spatial, briefing.faction, probeBrigLoc, approachOsid, MAX_REACHABILITY_HOPS);
                                if (dist >= 0) return true;
                            }
                        }
                        return false;
                    }
                );

                if (obs) obs.probe_reachable = probeReachable;
                if (probeReachable) {
                    const commandState = briefing.state_ref?.military.corps_command?.[briefing.corps_id];
                    const sectorIntelConfidence = briefing.state_ref && probeSectorId
                        ? getStalestSectorIntelConfidence(briefing.state_ref, probeSectorId)
                        : 0;
                    const targetIsBoundedPosition = isBoundedIsolatedEnemyPosition(
                        probeObjectives[0]!,
                        briefing,
                    );
                    const queuedHistoricalParticipants = briefing.state_ref
                        ? getHeadQueuedPrePlannedBrigadeIds(briefing.state_ref)
                        : new Set<FormationId>();
                    const probeSector = briefing.sectors.find((sector) => sector.sector_id === probeSectorId);
                    const targetApproaches = (
                        briefing.spatial.sharedBoundaryAdjacency?.get(probeObjectives[0]!)
                        ?? briefing.spatial.adjacency.get(probeObjectives[0]!)
                        ?? []
                    ).filter((osid) => briefing.spatial.friendlyOsidsByFaction?.get(briefing.faction)?.has(osid));
                    const distanceToReduction = (brigadeId: FormationId): number => {
                        const location = briefing.brigades.find((entry) => entry.id === brigadeId)?.location_osid;
                        if (!location) return Number.POSITIVE_INFINITY;
                        let best = Number.POSITIVE_INFINITY;
                        for (const approach of [...targetApproaches].sort(strictCompare)) {
                            const distance = spatialFriendlyDistance(
                                briefing.spatial,
                                briefing.faction,
                                location,
                                approach,
                                MAX_REACHABILITY_HOPS,
                            );
                            if (distance >= 0 && distance < best) best = distance;
                        }
                        return best;
                    };
                    const sameSectorParticipants = new Set<FormationId>([
                        ...(probeSector?.reserve_brigade_ids ?? []),
                        ...(probeSector?.rear_brigade_ids ?? []),
                        ...(probeSector?.assigned_brigade_ids ?? []),
                    ]);
                    const surplusParticipantIds = new Set(
                        allocation.surplus_pool.map((entry) => entry.brigade_id),
                    );
                    const activeOperationParticipants = new Set(
                        briefing.active_operations
                            .flatMap((operation) => operation.participating_brigades ?? []),
                    );
                    const formationById = new Map(briefing.brigades.map((brigade) => [brigade.id, brigade]));
                    const stationaryLineStaffBySector = new Map<string, ReadonlySet<string>>();
                    for (const sector of briefing.sectors) {
                        const staff = new Set<string>();
                        for (const brigadeId of sector.assigned_brigade_ids) {
                            const brigade = formationById.get(brigadeId);
                            if (!brigade || brigade.status !== 'active' || !isEligibleOperationFormation(brigade)) continue;
                            if (!brigade.location_osid || !sector.territory_osids.includes(brigade.location_osid)) continue;
                            if (activeOperationParticipants.has(brigadeId)) continue;
                            const movementStatus = briefing.state_ref?.military.brigade_movement_state?.[brigadeId]?.status;
                            if (movementStatus === 'packing' || movementStatus === 'in_transit') continue;
                            if (briefing.state_ref?.military.brigade_movement_orders?.[brigadeId]) continue;
                            staff.add(brigadeId);
                        }
                        stationaryLineStaffBySector.set(sector.sector_id, staff);
                    }
                    const rankedReductionCandidates = [
                        probeBrigade.brigade_id,
                        ...(probeSector?.reserve_brigade_ids ?? []),
                        ...(probeSector?.rear_brigade_ids ?? []),
                        ...(probeSector?.assigned_brigade_ids ?? []),
                        ...briefing.brigades.map((entry) => entry.id),
                    ]
                        .filter((brigadeId, index, all) => all.indexOf(brigadeId) === index)
                        .filter((brigadeId) => surplusParticipantIds.has(brigadeId))
                        .filter((brigadeId) => mayEliteJoinOperation(brigadeId as FormationId, briefing.turn))
                        .filter((brigadeId) => !queuedHistoricalParticipants.has(brigadeId))
                        .filter((brigadeId) => !activeOperationParticipants.has(brigadeId))
                        .filter((brigadeId) => isCombatReadyParticipant(briefing, brigadeId))
                        .filter((brigadeId) => {
                            const brigade = briefing.brigades.find((entry) => entry.id === brigadeId);
                            return brigade?.corps_id === briefing.corps_id
                                && brigade.elite_loan_state?.on_loan !== true
                                && isBrigadeEligibleForOperationObjectives(brigade, probeObjectives)
                                && Number.isFinite(distanceToReduction(brigadeId))
                                // P-A: same time-bounded admission as the local-occupation path.
                                && canReachAssemblyInTime(
                                    briefing,
                                    brigadeId,
                                    probeObjectives[0]!,
                                    computePlanningDuration(probeObjectives.length),
                                );
                        })
                        .sort((left, right) => {
                            if (left === probeBrigade.brigade_id) return -1;
                            if (right === probeBrigade.brigade_id) return 1;
                            const sectorDiff = Number(sameSectorParticipants.has(right)) - Number(sameSectorParticipants.has(left));
                            if (sectorDiff !== 0) return sectorDiff;
                            const distanceDiff = distanceToReduction(left) - distanceToReduction(right);
                            return distanceDiff !== 0 ? distanceDiff : strictCompare(left, right);
                        });
                    const reductionParticipants = localOccupationCandidate
                        ? [...localOccupationCandidate.participating_brigade_ids]
                        : (() => {
                            const primaryParticipants = rankedReductionCandidates
                                .filter((brigadeId) => sameSectorParticipants.has(brigadeId))
                                .slice(0, ISOLATED_POSITION_OPERATION_MAX_BRIGADES);
                            if (!probeSector || primaryParticipants.length >= ISOLATED_POSITION_OPERATION_MAX_BRIGADES) {
                                return primaryParticipants;
                            }
                            const donors = selectBoundedPositionDonorAttachments(
                                probeSector,
                                briefing.sectors,
                                rankedReductionCandidates.filter((brigadeId) => !sameSectorParticipants.has(brigadeId)),
                                stationaryLineStaffBySector,
                                briefing.spatial.adjacency,
                                ISOLATED_POSITION_OPERATION_MAX_BRIGADES,
                            );
                            return [
                                ...primaryParticipants,
                                ...donors.brigade_ids.slice(
                                    0,
                                    ISOLATED_POSITION_OPERATION_MAX_BRIGADES - primaryParticipants.length,
                                ),
                            ];
                        })();
                    const singleBrigadeOccupationIsSufficient = localOccupationCandidate != null
                        && reductionParticipants.length === 1;
                    const escalateToOperation = targetIsBoundedPosition
                        && (
                            reductionParticipants.length >= ISOLATED_POSITION_OPERATION_MIN_BRIGADES
                            || singleBrigadeOccupationIsSufficient
                        )
                        && (
                            localOccupationCandidate?.prepare_before_intel === true
                            || !observeProbeDecision(
                                obs,
                                'fallback_escalation',
                                briefing,
                                probeSectorId ?? null,
                                sectorIntelConfidence,
                                commandState?.consecutive_probes ?? 0,
                            )
                        );
                    if (obs) {
                        obs.target_is_bounded_position = targetIsBoundedPosition;
                        obs.reduction_participant_count = reductionParticipants.length;
                        obs.single_brigade_sufficient = singleBrigadeOccupationIsSufficient;
                        obs.escalate_to_operation = escalateToOperation;
                    }
                    const probeOp = botOrdersPerfTime(
                        escalateToOperation
                            ? `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.buildIsolatedPositionOperation`
                            : `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.buildProbeOperation`,
                        () => {
                            // PERMITTED CREATION ENTRY POINT — commander-generated operations only.
                            // All CorpsOperation objects must be built via the factory functions in corps_operation_helpers.ts.
                            if (!escalateToOperation) {
                                return buildProbeOperation(
                                    briefing.corps_id,
                                    briefing.turn,
                                    probeBrigade.brigade_id,
                                    probeSectorId,
                                    probeObjectives,
                                );
                            }
                            const personnelById = new Map(
                                briefing.brigades.map((entry) => [entry.id, entry.personnel ?? 0]),
                            );
                            const operation = buildCommanderOperation(
                                briefing.corps_id,
                                briefing.turn,
                                reductionParticipants,
                                probeSectorId,
                                probeObjectives,
                                reductionParticipants.reduce(
                                    (sum, brigadeId) => sum + (personnelById.get(brigadeId) ?? 0),
                                    0,
                                ),
                                pickOperationName(
                                    briefing.corps_id,
                                    briefing.turn,
                                    briefing.faction,
                                    briefing.state_ref,
                                ),
                            );
                            // A bounded reduction plan is already the commander's
                            // full-operation answer to the isolated position. Preserve
                            // its selected concentration as the launch assembly floor.
                            // The normal adjacency, prediction, combat and control-change
                            // gates still decide whether an attack occurs and succeeds.
                            operation.minimum_viable_participants = reductionParticipants.length;
                            operation.minimum_assembled_participants = reductionParticipants.length;
                            for (const axis of operation.axes ?? []) {
                                axis.minimum_staged_brigades = reductionParticipants.length;
                            }
                            if (!singleBrigadeOccupationIsSufficient) {
                                operation.planning_duration = computePlanningDuration(operation.objectives?.length ?? 0);
                            }
                            const primarySectorBrigades = reductionParticipants
                                .filter((brigadeId) => sameSectorParticipants.has(brigadeId));
                            const attachedBrigades = reductionParticipants
                                .filter((brigadeId) => !sameSectorParticipants.has(brigadeId));
                            if (primarySectorBrigades.length > 0) {
                                operation.primary_sector_brigades = primarySectorBrigades;
                            }
                            if (attachedBrigades.length > 0) {
                                operation.attached_brigades = attachedBrigades;
                                operation.reinforcement_source = 'adjacent_sector';
                            }
                            const supportingSectorIds = briefing.sectors
                                .filter((sector) => sector.sector_id !== probeSectorId)
                                .filter((sector) => sector.assigned_brigade_ids.some((id) => reductionParticipants.includes(id)))
                                .map((sector) => sector.sector_id)
                                .sort(strictCompare);
                            if (supportingSectorIds.length > 0) {
                                operation.supporting_sector_ids = supportingSectorIds;
                            }
                            if (singleBrigadeOccupationIsSufficient) {
                                operation.minimum_viable_participants = 1;
                                operation.minimum_assembled_participants = 1;
                                operation.min_attack_outcome = 'costly_victory';
                                operation.preparation_sub_phase = 'ready';
                            }
                            return operation;
                        },
                    );
                    const conflictingOp = findCommanderCreationOverlap(
                        briefing.active_operations,
                        probeOp,
                        briefing.corps_id,
                        obs,
                    );
                    if (obs) {
                        obs.built.push(commanderCreationOperation(escalateToOperation ? 'reduction' : 'fallback_probe', probeOp));
                        recordProbeWindowCandidate(
                            obs,
                            escalateToOperation ? 'reduction' : 'fallback_probe',
                            probeOp,
                            briefing.corps_id,
                        );
                        obs.overlap_checked = true;
                        obs.overlap_found = conflictingOp != null;
                        markCommanderCreationExit(obs, escalateToOperation
                            ? (conflictingOp ? 'reduction_overlap_suppressed' : 'reduction_created')
                            : (conflictingOp ? 'fallback_probe_overlap_suppressed' : 'fallback_probe_created'));
                    }
                    if (!conflictingOp) {
                        ops.push(probeOp);
                    }
                }
            }
        }
    }

    return ops;
}


// ═══════════════════════════════════════════════════════════════════════════
// buildSectorStances — from decisions
// ═══════════════════════════════════════════════════════════════════════════

function buildSectorStances(
    briefing: CommanderBriefing,
    decisions: DecisionResult,
): Array<{ sector_id: string; stance: SectorStance }> {
    const stanceMap = new Map<string, SectorStance>();

    // Default all corps sectors to 'defend'
    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    for (const sector of corpsSectors) {
        stanceMap.set(sector.sector_id, 'defend');
    }

    // Apply stance changes from decisions
    for (const change of decisions.stance_changes) {
        if (stanceMap.has(change.sector_id)) {
            stanceMap.set(change.sector_id, change.new_stance);
        }
    }

    // Convert to sorted array
    return [...stanceMap.entries()]
        .sort((a, b) => strictCompare(a[0], b[0]))
        .map(([sector_id, stance]) => ({ sector_id, stance }));
}

// ═══════════════════════════════════════════════════════════════════════════
// buildUpdatedLessons — extract, decay, and cap commander lesson memory
// ═══════════════════════════════════════════════════════════════════════════

/** Max lessons retained in commander memory (oldest dropped first). */
const MAX_LESSON_MEMORY = 12;

/**
 * Assembles the updated lesson list for the new CommanderState:
 *   Step A: filter expired lessons from previous state
 *   Step B: extract new lessons from operations that closed this turn
 *   Step C: merge, sort by created_turn ascending, cap at MAX_LESSON_MEMORY
 *
 * Deterministic: no Math.random(), no Date.now(). Sorted via strictCompare.
 */
function buildUpdatedLessons(
    briefing: CommanderBriefing,
    cappedHistory: OperationHistoryEntry[],
    planDecision: PlanDecision,
): readonly CommanderLesson[] | undefined {
    // Step A: expiry filter — remove lessons that have passed their expires_turn
    const surviving = (briefing.previous_state?.lessons ?? []).filter(
        entry => entry.expires_turn === undefined || entry.expires_turn > briefing.turn,
    );

    // Step B: extract lessons from operations that ended this turn
    const newLessons: CommanderLesson[] = [];
    for (const entry of cappedHistory) {
        if (entry.ended_turn !== briefing.turn) continue;

        if (entry.outcome === 'abandoned') {
            const stagingZone = briefing.previous_state?.current_plan?.staging_zone;
            const lesson: CommanderLesson = {
                lesson_id: `lesson_${briefing.corps_id}_abandon_t${briefing.turn}`,
                category: 'offensive_failure',
                ...(stagingZone !== undefined ? { zone_id: stagingZone } : {}),
                relevant_osids: [...(planDecision.plan?.target_osids ?? [])].sort(strictCompare),
                weight: -0.20,
                created_turn: briefing.turn,
                expires_turn: briefing.turn + 8,
            };
            newLessons.push(lesson);
        } else if (entry.outcome === 'success') {
            const stagingZone = briefing.previous_state?.current_plan?.staging_zone;
            const lesson: CommanderLesson = {
                lesson_id: `lesson_${briefing.corps_id}_success_t${briefing.turn}`,
                category: 'success_pattern',
                ...(stagingZone !== undefined ? { zone_id: stagingZone } : {}),
                relevant_osids: [...entry.osids_captured].sort(strictCompare),
                weight: 0.12,
                created_turn: briefing.turn,
                expires_turn: briefing.turn + 5,
            };
            newLessons.push(lesson);
        }
        // 'partial', 'stalemate', 'failure' → no lesson created in Phase 4
    }

    // Step C: merge, sort by created_turn ascending (deterministic), cap at MAX_LESSON_MEMORY
    const merged = [...surviving, ...newLessons].sort((a, b) => {
        const turnDiff = a.created_turn - b.created_turn;
        if (turnDiff !== 0) return turnDiff;
        return strictCompare(a.lesson_id, b.lesson_id);
    });

    const capped = merged.slice(-MAX_LESSON_MEMORY);
    return capped.length > 0 ? capped : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// buildUpdatedState — assemble CommanderState from all phases
// ═══════════════════════════════════════════════════════════════════════════

function buildUpdatedState(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    threats: ThreatAssessment,
    planDecision: PlanDecision,
    decisions: DecisionResult,
    beliefState: CommanderBeliefState | null,
): CommanderState {
    // Merge sector activity log: previous + new entries from DECIDE phase, cap at MAX_SECTOR_ACTIVITY_LOG turns
    const previousLog = briefing.previous_state?.sector_activity_log ?? [];
    const newEntries: SectorActivityEntry[] = decisions.activity_entries;

    // Merge and cap log entries
    const mergedLog = [...previousLog, ...newEntries];
    const minTurn = briefing.turn - MAX_SECTOR_ACTIVITY_LOG;
    const cappedLog = mergedLog
        .filter(e => e.turn > minTurn)
        .sort((a, b) => {
            const turnDiff = a.turn - b.turn;
            if (turnDiff !== 0) return turnDiff;
            return strictCompare(a.sector_id, b.sector_id);
        });

    // Merge operation history: previous + newly-closed plans this turn.
    // Written when a plan is abandoned (explicit failure) or handed off to
    // execution (cleared from executing status). This gives the commander
    // memory of recent attempts so plan.ts can avoid re-targeting the same
    // objectives immediately after failure.
    const previousHistory = briefing.previous_state?.operation_history ?? [];
    const operationHistory: OperationHistoryEntry[] = [...previousHistory];

    if (planDecision.action === 'abandoned' && planDecision.plan) {
        // Plan was explicitly abandoned (viability drop, suspension timeout, etc.)
        operationHistory.push({
            operation_name: `cmd_${briefing.corps_id}_t${planDecision.plan.created_turn}`,
            type: 'sector_attack',
            started_turn: planDecision.plan.created_turn,
            ended_turn: briefing.turn,
            outcome: 'abandoned',
            osids_captured: [],
            // Store targeted osids in osids_lost so plan.ts can detect repeat-failure
            // patterns and cool down before re-targeting the same objectives.
            osids_lost: [...planDecision.plan.target_osids].sort(strictCompare),
            casualties_inflicted: 0,
            casualties_suffered: 0,
        });
    } else if (
        planDecision.action === 'none' &&
        planDecision.plan === null &&
        briefing.previous_state?.current_plan?.status === 'executing'
    ) {
        // Plan just cleared from executing status — handed off to the execution
        // pipeline. Outcome unknown at this stage; record as 'partial'.
        const prev = briefing.previous_state.current_plan;
        operationHistory.push({
            operation_name: `cmd_${briefing.corps_id}_t${prev.created_turn}`,
            type: 'sector_attack',
            started_turn: prev.created_turn,
            ended_turn: briefing.turn,
            outcome: 'partial',
            osids_captured: [],
            osids_lost: [],
            casualties_inflicted: 0,
            casualties_suffered: 0,
        });
    }

    // Cap history at the last MAX_OPERATION_HISTORY_ENTRIES entries (oldest first).
    const cappedHistory = operationHistory.slice(-MAX_OPERATION_HISTORY_ENTRIES);

    // Build garrison budget record
    const garrisonBudget: Record<string, number> = {};
    for (const zone of zones) {
        garrisonBudget[zone.zone_id] = zone.garrison_budget;
    }

    // Phase 4 fix-up (FORCE QUALITY FOUNDATION): preserve the most-recent
    // force_quality_traits across non-offensive turns. `planDecision.decision_trace`
    // is set on every turn that calls `managePlan` — including the early-return
    // defensive/exhaustion/fatigue/role/major-op-active branches in plan.ts. Those
    // branches return a bare trace WITHOUT a `force_quality_traits` field
    // (augmentTraceWithForceQuality only fires inside the offensive-winner branch).
    // Without this merge, any non-offensive turn after a launch would silently drop
    // the gated readiness snapshot, leaving decision_trace.force_quality_traits empty
    // in final_save.json even though the wiring at plan.ts emits it on offensive turns.
    //
    // Strategy A: one-way merge. A new trace with explicit `force_quality_traits`
    // always wins; if the new trace lacks the field, fall back to the previous
    // trace's value. This preserves the live-reasoning surface for diagnostic
    // visibility without leaking stale data into a fresh offensive turn that
    // recomputes traits via augmentTraceWithForceQuality.
    const newTrace = planDecision.decision_trace ?? briefing.previous_state?.decision_trace;
    const previousTraits = briefing.previous_state?.decision_trace?.force_quality_traits;
    const mergedTrace = newTrace
        ? {
            ...newTrace,
            force_quality_traits: newTrace.force_quality_traits ?? previousTraits,
        }
        : undefined;

    return {
        zone_assessments: sanitizeZoneAssessmentsForPersistence(zones),
        threat_assessment: threats,
        force_assessment: forces,
        current_plan: planDecision.plan,
        sector_activity_log: cappedLog,
        operation_history: cappedHistory,
        intel_picture: decisions.intel_picture,
        garrison_budget: garrisonBudget,
        last_assessment_turn: briefing.turn,
        last_plan_action: planDecision.action,
        last_plan_reason: planDecision.reason,

        // v0.8.1 fields — belief_state actively assembled in Phase 2; others carry forward.
        belief_state: beliefState ?? undefined,
        relationships: briefing.previous_state?.relationships,
        lessons: buildUpdatedLessons(briefing, cappedHistory, planDecision),
        decision_trace: mergedTrace,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// sanitizeZoneAssessmentsForPersistence — finite-only persisted copies (#95)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Robustness fix (task #95, audit P1-A/P2-D): the CommanderState returned here is
 * assigned verbatim into `corps_command[*].commander_state` (commander_loop.ts) and
 * serialized — non-finite numbers would silently become `null` in the save (pre-#95)
 * or throw the P1-A serializer guard (post-#95).
 *
 * `commitment_ratio` is Infinity for a zone with front edges and zero brigades
 * (computeCommitmentRatio) and MUST stay Infinity in memory (see
 * COMMITMENT_RATIO_UNBOUNDED_PERSISTED in zone_detection.ts for the reader audit).
 * This boundary swap replaces it with the documented finite sentinel in the
 * persisted copy ONLY. The cross-turn previous-state readers (assess.ts/decide.ts)
 * read only zone_id/osids, so the sanitized copy is sim-inert.
 *
 * Finite zones are passed through by reference (no copy) — the persisted bytes for
 * a fully-finite assessment are unchanged.
 */
export function sanitizeZoneAssessmentsForPersistence(zones: ZoneAssessment[]): ZoneAssessment[] {
    return zones.map(zone =>
        Number.isFinite(zone.commitment_ratio)
            ? zone
            : { ...zone, commitment_ratio: COMMITMENT_RATIO_UNBOUNDED_PERSISTED }
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// buildPlanUpdates — map plan decision action to plan_updates format
// ═══════════════════════════════════════════════════════════════════════════

function buildPlanUpdates(
    planDecision: PlanDecision,
): Array<{ plan_id: string; action: 'advance' | 'suspend' | 'abandon'; reason: string }> {
    if (!planDecision.plan) return [];

    const mappedAction = PLAN_ACTION_MAP[planDecision.action];
    if (!mappedAction) return [];

    return [{
        plan_id: planDecision.plan.plan_id,
        action: mappedAction,
        reason: planDecision.reason,
    }];
}

// ═══════════════════════════════════════════════════════════════════════════
// deriveTargetsFromSectors — fallback for opportunity plans with empty targets
// ═══════════════════════════════════════════════════════════════════════════

function selectSectorObjectives(
    sector: CommanderBriefing['sectors'][number],
    planTargets: readonly string[],
): string[] {
    const targetSet = new Set(planTargets);
    const subSegments = [...(sector.sub_segments ?? [])]
        .sort((left, right) => strictCompare(left.sub_segment_id, right.sub_segment_id));

    if (targetSet.size > 0) {
        let selected: readonly string[] = [];
        let selectedCount = 0;
        for (const subSegment of subSegments) {
            const matches = subSegment.enemy_osids
                .filter(osid => targetSet.has(osid))
                .sort(strictCompare);
            if (matches.length > selectedCount) {
                selected = matches;
                selectedCount = matches.length;
            }
        }
        return [...selected];
    }

    for (const subSegment of subSegments) {
        const enemyOsids = [...subSegment.enemy_osids].sort(strictCompare);
        if (enemyOsids.length > 0) return enemyOsids;
    }
    return [];
}

function deriveTargetsFromSectors(
    briefing: CommanderBriefing,
    maxTargets: number,
    primarySector?: CommanderBriefing['sectors'][number],
): string[] {
    if (primarySector) {
        return selectSectorObjectives(primarySector, []).slice(0, Math.max(1, maxTargets));
    }

    const targets = new Set<string>();
    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of corpsSectors) {
        for (const subSeg of sector.sub_segments) {
            for (const eo of subSeg.enemy_osids) {
                targets.add(eo);
            }
        }
    }

    // If sector scan yielded nothing, fall back to active operation objectives
    if (targets.size === 0) {
        for (const op of briefing.active_operations) {
            for (const obj of op.objectives ?? []) {
                targets.add(obj);
            }
        }
    }

    return [...targets].sort(strictCompare).slice(0, Math.max(1, maxTargets));
}

// ═══════════════════════════════════════════════════════════════════════════
// buildPrepositioningOrders — move unreachable main_effort surplus toward front
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Identifies main_effort surplus brigades that are too far from any sector
 * front to participate in operations, and emits march orders toward the
 * nearest front-adjacent friendly OSID in their sector.
 *
 * A real commander would preposition armor and elite assets near likely
 * offensive axes, not leave them in deep rear garrisons. This mechanism
 * applies only to main_effort-tier surplus — garrison-tier brigades stay
 * where they are.
 *
 * One march order per turn per brigade. Column movement handles pathing.
 * Deterministic: sorted iteration, spatialFriendlyDistance for BFS.
 */
/** @internal Exported for targeted testing only. */
export function buildPrepositioningOrders(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
): Array<{ brigade_id: string; destination_osid: string }> {
    const orders: Array<{ brigade_id: string; destination_osid: string }> = [];

    // Only preposition when the corps has offensive posture and surplus
    if (!allocation.can_launch_ops) return orders;

    const adjacency = briefing.spatial.adjacency;
    const fofMap = briefing.spatial.friendlyOsidsByFaction;
    if (!adjacency || !fofMap) return orders;
    const friendlyOsids = fofMap.get(briefing.faction);
    if (!friendlyOsids) return orders;

    // Collect front-adjacent friendly OSIDs from all corps sectors
    const frontApproachOsids: string[] = [];
    for (const sector of briefing.sectors) {
        if (sector.corps_id !== briefing.corps_id) continue;
        for (const sub of sector.sub_segments ?? []) {
            for (const osid of sub.friendly_osids ?? []) {
                frontApproachOsids.push(osid);
            }
        }
    }
    if (frontApproachOsids.length === 0) return orders;
    const sortedFrontOsids = [...new Set(frontApproachOsids)].sort(strictCompare);

    // Build brigade location map
    const brigadeLocationMap = new Map<string, string>();
    for (const b of briefing.brigades) {
        if (b.location_osid) brigadeLocationMap.set(b.id, b.location_osid);
    }

    // Find main_effort surplus brigades that are unreachable from any front approach
    const mainEffortSurplus = allocation.surplus_pool
        .filter(ev => ev.tier === 'main_effort' && !ev.is_on_loan && !ev.is_disrupted)
        .sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));

    for (const ev of mainEffortSurplus) {
        const locationOsid = brigadeLocationMap.get(ev.brigade_id);
        if (!locationOsid) continue;

        // Check if already reachable — no prepositioning needed
        let alreadyReachable = false;
        for (const frontOsid of sortedFrontOsids) {
            const dist = spatialFriendlyDistance(
                briefing.spatial, briefing.faction,
                locationOsid, frontOsid, MAX_REACHABILITY_HOPS,
            );
            if (dist >= 0) { alreadyReachable = true; break; }
        }
        if (alreadyReachable) continue;

        // Find the nearest front approach OSID by BFS (use a larger hop limit
        // for destination selection — we're pathfinding, not filtering).
        let bestOsid: string | null = null;
        let bestDist = Infinity;
        for (const frontOsid of sortedFrontOsids) {
            if (!spatialSameComponent(briefing.spatial, briefing.faction, locationOsid, frontOsid)) continue;
            const dist = spatialFriendlyDistance(
                briefing.spatial, briefing.faction,
                locationOsid, frontOsid, 30, // wider search for destination
            );
            if (dist >= 0 && dist < bestDist) {
                bestDist = dist;
                bestOsid = frontOsid;
            }
        }

        if (bestOsid) {
            orders.push({ brigade_id: ev.brigade_id, destination_osid: bestOsid });
        }
    }

    return orders;
}
