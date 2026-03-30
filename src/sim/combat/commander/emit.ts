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

import type {
    CorpsDirective,
    CorpsOperation,
    SectorStance,
} from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type {
    CommanderBriefing,
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
import type { DecisionResult } from './decide.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Default max simultaneous attackers per target OSID. */
const DEFAULT_MAX_ATTACKERS = 3;

/** Max reserve fraction clamp. */
const MAX_RESERVE_FRACTION = 0.5;

/** Max sector activity log entries to retain. */
const MAX_SECTOR_ACTIVITY_LOG = 20;

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

/** Plan action → plan_updates action mapping (plan.ts uses past tense). */
const PLAN_ACTION_MAP: Record<string, 'advance' | 'suspend' | 'abandon' | undefined> = {
    advanced: 'advance',
    suspended: 'suspend',
    abandoned: 'abandon',
};

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
): CommanderOutput {
    const personality = briefing.officer_personality;

    // 1. Build CorpsDirective
    const directive = buildDirective(
        briefing,
        zones,
        forces,
        allocation,
        planDecision,
        decisions,
        personality,
    );

    // 2. Build operations list
    const operations = buildOperations(
        briefing,
        allocation,
        planDecision,
        personality,
    );

    // 3. Build sector stances
    const sectorStances = buildSectorStances(briefing, decisions);

    // 4. Build updated commander state
    const updatedState = buildUpdatedState(
        briefing,
        zones,
        forces,
        threats,
        planDecision,
        decisions,
    );

    // 5. Garrison locks directly from allocation (same shape, pass through)
    const garrisonLocks = allocation.garrison_locks;

    // 6. Reinforcement requests from decisions
    const reinforcementRequests = decisions.reinforcement_requests;

    // 7. Plan updates from plan decision
    const planUpdates = buildPlanUpdates(planDecision);

    return {
        directive,
        operations,
        sector_stances: sectorStances,
        updated_state: updatedState,
        garrison_locks: garrisonLocks,
        reinforcement_requests: reinforcementRequests,
        plan_updates: planUpdates,
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

    // offensive_targets: from plan's target_osids if plan is executing, else empty
    const offensiveTargets = buildOffensiveTargets(planDecision);

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
    const sectorReassignmentOrders = buildSectorReassignmentOrders(decisions, briefing);

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

/** Build offensive targets from plan if plan is executing/ready, else empty. */
function buildOffensiveTargets(planDecision: PlanDecision): string[] {
    if (
        planDecision.plan &&
        ACTIVE_PLAN_STATUSES.has(planDecision.plan.status)
    ) {
        return [...planDecision.plan.target_osids].sort(strictCompare);
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
): Array<{ brigade_id: string; to_sector_id: string }> {
    if (decisions.reserve_shifts.length === 0) return [];

    // Build zone-to-sector mapping: zone OSIDs → overlapping sector
    const corpsSectors = briefing.sectors
        .filter(s => s.corps_id === briefing.corps_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

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
        const surplusSet = new Set(
            allocation.surplus_pool.map(ev => ev.brigade_id),
        );

        // Intersect plan's assigned brigades with surplus pool
        const participatingBrigades = [...planDecision.plan.assigned_brigades]
            .filter(id => surplusSet.has(id))
            .sort(strictCompare);

        if (participatingBrigades.length > 0) {
            const sectorId = findSectorWithMostTargetOverlap(planDecision, briefing);
            const objectives = planDecision.plan.target_osids.length > 0
                ? [...planDecision.plan.target_osids].sort(strictCompare)
                : deriveTargetsFromSectors(briefing, Math.floor(participatingBrigades.length * 0.5));

            const op: CorpsOperation = {
                name: `cmd_${briefing.corps_id}_t${briefing.turn}`,
                type: 'sector_attack',
                phase: 'planning',
                started_turn: briefing.turn,
                phase_started_turn: briefing.turn,
                participating_brigades: participatingBrigades,
                sector_id: sectorId ?? undefined,
                objectives,
                current_objective_index: 0,
                planning_duration: 1,
                supply_readiness: 1.0,
                momentum: 0,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            };
            ops.push(op);
        }
    }

    // If no plan but surplus and high-initiative commander: probe weak positions
    if (
        ops.length === 0 &&
        allocation.can_launch_ops &&
        allocation.surplus_pool.length > 0 &&
        personality.initiative > 0.6
    ) {
        // Probe operations use a single surplus brigade on the weakest enemy position.
        // The actual probe target selection is left to sector_offensive downstream;
        // we just create the shell operation so the pipeline knows to attempt it.
        const probeBrigade = allocation.surplus_pool
            .filter(ev => ev.is_combat_effective && !ev.is_disrupted)
            .sort((a, b) => {
                const fitDiff = b.fitness_offense - a.fitness_offense;
                if (fitDiff !== 0) return fitDiff;
                return strictCompare(a.brigade_id, b.brigade_id);
            })[0];

        if (probeBrigade) {
            const probeOp: CorpsOperation = {
                name: `probe_${briefing.corps_id}_t${briefing.turn}`,
                type: 'probe',
                phase: 'planning',
                started_turn: briefing.turn,
                phase_started_turn: briefing.turn,
                participating_brigades: [probeBrigade.brigade_id],
                planning_duration: 0,
                supply_readiness: 1.0,
                momentum: 0,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            };
            ops.push(probeOp);
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
// buildUpdatedState — assemble CommanderState from all phases
// ═══════════════════════════════════════════════════════════════════════════

function buildUpdatedState(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    threats: ThreatAssessment,
    planDecision: PlanDecision,
    decisions: DecisionResult,
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

    // Merge operation history: previous + completed ops
    const previousHistory = briefing.previous_state?.operation_history ?? [];
    const operationHistory: OperationHistoryEntry[] = [...previousHistory];

    // Build garrison budget record
    const garrisonBudget: Record<string, number> = {};
    for (const zone of zones) {
        garrisonBudget[zone.zone_id] = zone.garrison_budget;
    }

    return {
        zone_assessments: zones,
        threat_assessment: threats,
        force_assessment: forces,
        current_plan: planDecision.plan,
        sector_activity_log: cappedLog,
        operation_history: operationHistory,
        intel_picture: decisions.intel_picture,
        garrison_budget: garrisonBudget,
        last_assessment_turn: briefing.turn,
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
    return [...targets].sort(strictCompare).slice(0, Math.max(1, maxTargets));
}
