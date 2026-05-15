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
    CorpsDirective,
    CorpsOperation,
    SectorStance,
} from '../../../state/game_state.js';
import { isEligibleOperationFormation, MIN_ATTACK_PERSONNEL } from '../../../state/formation_constants.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { spatialFriendlyDistance, spatialSameComponent } from '../../spatial_context.js';
import { buildCommanderOperation, buildProbeOperation, derivePrimarySectorForBrigades, getMaxOperationSlots } from '../corps_operation_helpers.js';
import { pickOperationName } from '../operation_names.js';
import { buildTerrainCache, predictCombatOutcome, type CombatPrediction } from '../combat_predictor.js';
import { buildOfficerCombatLookup } from '../combat_math.js';
import { isOutcomeSufficientForAttack } from '../bot_brigade_targeting.js';
import { getPoliticalControllerOSID } from '../../../state/settlement_control.js';
import { shouldGrazBlockAttack } from '../../local_truces.js';
import type {
    CommanderBeliefState,
    CommanderBriefing,
    CommanderLesson,
    CommanderOutput,
    CommanderPlanStatus,
    CommanderState,
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
import { MIN_BRIGADES_FOR_PLAN } from './plan.js';
import type { DecisionResult } from './decide.js';
import { augmentOffensiveTargetsWithShifts } from './bot_priority_shift_augmentation.js';
import { botOrdersPerfTime } from '../_perf_profile_bot_orders.js';

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

/** Max BFS hops from brigade location to first objective OSID (through friendly territory). */
const MAX_REACHABILITY_HOPS = 8;

/** Max fraction of an adjacent sector's total assigned brigades that may attach to an op. */
const ADJACENT_SECTOR_ATTACH_RATE = 0.33;
/** Minimum brigades that must remain in an adjacent sector after attachment. */
const ADJACENT_SECTOR_MIN_RESIDUAL = 1;

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

function operationsOverlap(
    left: Pick<CorpsOperation, 'sector_id' | 'objectives' | 'participating_brigades'>,
    right: Pick<CorpsOperation, 'sector_id' | 'objectives' | 'participating_brigades'>,
): boolean {
    if (left.sector_id && right.sector_id && left.sector_id === right.sector_id) {
        return true;
    }
    const leftObjectives = new Set(left.objectives ?? []);
    if ((right.objectives ?? []).some((objective) => leftObjectives.has(objective))) {
        return true;
    }
    const leftBrigades = new Set(left.participating_brigades ?? []);
    return (right.participating_brigades ?? []).some((brigadeId) => leftBrigades.has(brigadeId));
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

function predictDirectEnemyTargets(
    briefing: CommanderBriefing,
    probeBrigadeId: string,
    directEnemyTargets: ReadonlySet<string>,
    adjacency: Map<any, any>,
    terrainCache: Record<string, number> | null,
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
            target as any,
            adjacency,
            briefing.reverse_map,
            terrainMultByOsid,
            'attack',
            undefined,
            briefing.supply_by_osid ?? undefined,
            undefined,
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
    if (decisions.reserve_shifts.length === 0) return [];

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

    const orders: Array<{ brigade_id: string; to_sector_id: string }> = [];

    for (const shift of [...decisions.reserve_shifts].sort((a, b) =>
        strictCompare(a.brigade_id, b.brigade_id),
    )) {
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
        }
    }

    return orders;
}

// ═══════════════════════════════════════════════════════════════════════════
// buildOperations — create CorpsOperation list
// ═══════════════════════════════════════════════════════════════════════════

function buildOperations(
    briefing: CommanderBriefing,
    allocation: AllocationResult,
    planDecision: PlanDecision,
    personality: OfficerPersonality,
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
        // Slot cap guard: don't emit a new op if corps is already at capacity.
        // Mirrors hasAvailableSlot() used in bot_corps_directives / bot_corps_operations.
        // Exclude recovery-phase ops — they don't occupy an active slot.
        const activeSlotUsers = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.activeSlotUsers`,
            () => briefing.active_operations.filter(op => op.phase !== 'recovery'),
        );
        if (activeSlotUsers.length >= getMaxOperationSlots(briefing.brigades.length)) {
            return ops;
        }
        const surplusSet = new Set(
            allocation.surplus_pool.map(ev => ev.brigade_id),
        );

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
        const firstObjectiveOsid = planTargetOsids.length > 0
            ? [...planTargetOsids].sort(strictCompare)[0]!
            : null;
        const reachabilityObjectiveOsid = firstObjectiveOsid
            ?? deriveTargetsFromSectors(briefing, 1)[0]
            ?? null;

        const adjacencyMap = briefing.spatial.adjacency;
        const friendlyOsids = briefing.spatial.friendlyOsidsByFaction.get(briefing.faction);

        // Reachability check: brigade must BFS through friendly territory to a
        // friendly OSID adjacent to the first objective within MAX_REACHABILITY_HOPS.
        // NOTE: home_defense brigades CAN be op participants — evaluateHomeDefense in
        // bot_brigade_eval_attack.ts already exempts them via isActiveSectorOperationParticipant.
        // Approach OSIDs are constant for the whole buildOperations call — computed once here.
        const friendlyApproachOsids: readonly string[] = (() => {
            if (!reachabilityObjectiveOsid || !friendlyOsids) return [];
            const neighbors = (adjacencyMap.get(reachabilityObjectiveOsid as any) ?? []) as readonly string[];
            return neighbors.filter(n => friendlyOsids.has(n)).sort(strictCompare);
        })();
        const canReach = (brigadeId: string): boolean => {
            if (!reachabilityObjectiveOsid) return true;
            if (friendlyApproachOsids.length === 0) return false;
            const locationOsid = brigadeLocationMap.get(brigadeId);
            if (!locationOsid) return false;
            for (const approachOsid of friendlyApproachOsids) {
                const dist = spatialFriendlyDistance(briefing.spatial, briefing.faction, locationOsid, approachOsid, MAX_REACHABILITY_HOPS);
                if (dist >= 0) return true;
            }
            return false;
        };

        // Primary pool: brigades assigned to the primary sector that are surplus + reachable.
        const primaryPool: string[] = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.primaryPool`,
            () => primarySector
                ? primarySector.assigned_brigade_ids
                    .filter(id => surplusSet.has(id) && canReach(id) && isCombatReadyParticipant(briefing, id))
                    .sort(strictCompare)
                : [],
        );

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
                        for (const n of (adjacencyMap.get(osid as any) ?? []) as readonly string[]) {
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
                            .filter(id => surplusSet.has(id) && canReach(id) && isCombatReadyParticipant(briefing, id))
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

        let participatingBrigades = [...primaryPool, ...attachedPool].sort(strictCompare);

        // When the primary sector is anchored, 2 brigades is viable — the sector
        // anchor provides strategic coherence the old broad-pool lacked. The predictor
        // (force_ratio_estimate) will determine how quickly a thin op fails at execution.
        // Without an anchor (fallback: no sector matched) keep the corps-wide floor.
        const minForOp = primarySector ? 2 : MIN_BRIGADES_FOR_PLAN;
        if (participatingBrigades.length < minForOp) {
            return ops;
        }

        // Build the set of enemy OSIDs actually present in this corps's sector sub_segments.
        // An objective that is no longer in any sub_segment.enemy_osids means the sector
        // front has shifted and collectObjectiveApproachOsids will return an empty approach
        // set — causing every brigade to have no valid attack position and the op to stall
        // indefinitely (zero attacks per turn). Drop such stale objectives now.
        const reachableEnemyOsids = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.plan.reachableEnemyOsids`,
            () => {
                const reachableEnemyOsids = new Set<string>();
                for (const sector of briefing.sectors) {
                    if (sector.corps_id !== briefing.corps_id) continue;
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
                    ? [...activePlan.target_osids].sort(strictCompare)
                    : deriveTargetsFromSectors(briefing, Math.floor(participatingBrigades.length * 0.5));

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
        if (objectives.length === 0) {
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

        const conflictingOp = briefing.active_operations.find((existing) => operationsOverlap(existing, op));
        if (conflictingOp) {
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

    // If no plan but surplus and high-initiative commander: probe weak positions
    if (
        ops.length === 0 &&
        !probeOnCooldown &&
        allocation.can_launch_ops &&
        allocation.surplus_pool.length > 0 &&
        personality.initiative > 0.3 &&
        briefing.active_operations.filter(op => op.phase !== 'recovery').length < getMaxOperationSlots(briefing.brigades.length)
    ) {
        // Probe operations use a single surplus brigade on the weakest enemy position.
        // The actual probe target selection is left to sector_offensive downstream;
        // we just create the shell operation so the pipeline knows to attempt it.
        const probeBrigade = botOrdersPerfTime(
            `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.selectBrigade`,
            () => allocation.surplus_pool
                .filter(ev => ev.is_combat_effective && !ev.is_disrupted)
                .filter(ev => isCombatReadyParticipant(briefing, ev.brigade_id))
                .sort((a, b) => {
                    const fitDiff = b.fitness_offense - a.fitness_offense;
                    if (fitDiff !== 0) return fitDiff;
                    return strictCompare(a.brigade_id, b.brigade_id);
                })[0],
        );

        if (probeBrigade) {
            const probeSectorId = derivePrimarySectorForBrigades(
                briefing.sectors.filter((sector) => sector.corps_id === briefing.corps_id),
                briefing.corps_id,
                [probeBrigade.brigade_id],
                Object.fromEntries(briefing.brigades.map((brigade) => [brigade.id, brigade])),
            );

            // Derive probe objective: first enemy-adjacent OSID in the probe sector.
            // Without objectives the probe op has no axis targets and would be ZEA.
            const probeObjectives: string[] = botOrdersPerfTime(
                `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives`,
                () => {
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
                                const directEnemyTargets = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.directEnemyTargets`,
                                    () => {
                                        const directEnemyTargets = new Set<string>();
                                        for (const target of [...enemyTargets].sort(strictCompare)) {
                                            const targetNeighbors = (adjacency.get(target as any) ?? []) as readonly string[];
                                            if (targetNeighbors.includes(probeBrigLoc)) {
                                                directEnemyTargets.add(target);
                                            }
                                        }
                                        return directEnemyTargets;
                                    },
                                );
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
                                    () => [...directEnemyTargets]
                                        .map((target) => {
                                            const cooldown = briefing.failed_offensive_objectives?.[target];
                                            const targetController = briefing.reverse_map && briefing.state_ref
                                                ? getPoliticalControllerOSID(briefing.state_ref, target, briefing.reverse_map)
                                                : null;
                                            const targetNeighbors = (adjacency.get(target as any) ?? []) as readonly string[];
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
                                            return {
                                                target,
                                                onCooldown: (cooldown?.cooldown_until_turn ?? 0) > briefing.turn,
                                                direct,
                                                politicallyBlocked: briefing.state_ref != null
                                                    && targetController != null
                                                    && shouldGrazBlockAttack(
                                                        briefing.state_ref,
                                                        briefing.corps_id,
                                                        briefing.faction,
                                                        target,
                                                        targetController,
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
                                        })
                                        .filter((candidate) => !candidate.onCooldown)
                                        .filter((candidate) => !candidate.politicallyBlocked)
                                        // Probe ops are one-brigade recon-by-force, not small marches.
                                        // Only launch when the chosen brigade is already on a valid
                                        // approach node for the target this turn and the brigade can
                                        // already clear the probe threshold on that exact target.
                                        .filter((candidate) => candidate.direct && candidate.reachable && candidate.predictedViable)
                                        .sort((a, b) =>
                                            Number(b.direct) - Number(a.direct)
                                            || a.approachDistance - b.approachDistance
                                            || strictCompare(a.target, b.target)
                                        ),
                                );
                                probeObjectives = botOrdersPerfTime(
                                    `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.deriveObjectives.pickObjective`,
                                    () => rankedTargets.slice(0, 1).map((candidate) => candidate.target),
                                );
                            }
                        }
                    }
                    return probeObjectives;
                },
            );

            // Skip probe if no enemy-adjacent OSIDs found — empty objectives cause immediate ZEA.
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
                            const targetNeighbors = (probeAdj.get(probeTarget as any) ?? []) as readonly string[];
                            const approachOsids = targetNeighbors.filter(n => probeFriendly.has(n)).sort(strictCompare);
                            for (const approachOsid of approachOsids) {
                                const dist = spatialFriendlyDistance(briefing.spatial, briefing.faction, probeBrigLoc, approachOsid, MAX_REACHABILITY_HOPS);
                                if (dist >= 0) return true;
                            }
                        }
                        return false;
                    }
                );

                if (probeReachable) {
                    const probeOp = botOrdersPerfTime(
                        `${BUILD_OPERATIONS_PROFILE_PREFIX}.probe.buildProbeOperation`,
                        () => {
                            // PERMITTED CREATION ENTRY POINT — commander-generated operations only.
                            // All CorpsOperation objects must be built via the factory functions in corps_operation_helpers.ts.
                            return buildProbeOperation(
                                briefing.corps_id,
                                briefing.turn,
                                probeBrigade.brigade_id,
                                probeSectorId,
                                probeObjectives,
                            );
                        },
                    );
                    const conflictingOp = briefing.active_operations.find((existing) => operationsOverlap(existing, probeOp));
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
        zone_assessments: zones,
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

function deriveTargetsFromSectors(briefing: CommanderBriefing, maxTargets: number): string[] {
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
