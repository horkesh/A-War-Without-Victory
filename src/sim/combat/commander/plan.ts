/**
 * plan.ts — PLAN phase for v0.8 Corps Commander Intelligence.
 *
 * Manages multi-turn commander intentions. A plan represents a sustained
 * operational objective: "Take Jajce in 4 weeks, concentrate 5 brigades at
 * Donji Vakuf." Plans are intentions, not orders — the EMIT phase converts
 * ready plans into actual CorpsOperations.
 *
 * Lifecycle: create → concentrating → ready → executing → (done via EMIT)
 *            create → concentrating → suspended → abandoned (if conditions worsen)
 *
 * Besieged Corps Rule: encircled corps (5th Corps Bihac) can still plan LOCAL
 * ops within 2 hops of zone boundary, but cannot plan distant offensives.
 *
 * Deterministic: strictCompare for all sorting, no Math.random(), no Date.now().
 */

import type { FormationId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

import type {
    CommanderBriefing,
    CommanderPlan,
    CommanderPlanStatus,
    ZoneAssessment,
    ZoneId,
    ForceAssessment,
    BrigadeEvaluation,
} from './commander_state.js';

import { BESIEGED_SURPLUS_HOP_LIMIT } from './allocate.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum surplus brigades required to create a plan. */
export const MIN_BRIGADES_FOR_PLAN = 3;

/** Fraction of required brigades at staging before plan is 'ready'. */
export const CONCENTRATION_READY_THRESHOLD = 0.8;

/** Turns of suspension before a plan is abandoned. */
export const MAX_SUSPENSION_TURNS = 3;

/** Brigades that can concentrate per turn (movement rate). */
export const PLAN_CONCENTRATION_RATE = 2;

/** Viability score below which a plan is abandoned. */
const VIABILITY_ABANDON_THRESHOLD = 0.2;

// ═══════════════════════════════════════════════════════════════════════════
// PlanDecision — output of managePlan
// ═══════════════════════════════════════════════════════════════════════════

export interface PlanDecision {
    /** Updated or new plan, or null if no active plan. */
    plan: CommanderPlan | null;
    /** What happened to the plan this turn. */
    action: 'created' | 'advanced' | 'suspended' | 'abandoned' | 'launched' | 'none';
    /** Reason for the action. */
    reason: string;
    /** Brigades that should be concentrating toward staging zone. */
    concentration_orders: Array<{ brigade_id: FormationId; destination_zone: ZoneId }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// managePlan — main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manage the commander's multi-turn plan:
 * 1. If no plan exists, evaluate whether to create one (pre-planned ops first, then opportunity).
 * 2. If plan exists, advance it (check viability, update concentration progress).
 * 3. Plans can be suspended (threat on flank) or abandoned (lost too many brigades).
 */
export function managePlan(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    previousPlan: CommanderPlan | null,
    turn: number,
): PlanDecision {
    // If we have an existing plan, manage its lifecycle
    if (previousPlan) {
        return advanceExistingPlan(briefing, zones, forces, surplusPool, previousPlan, turn);
    }

    // No existing plan — evaluate whether to create one
    // Priority 1: pre-planned operations
    const prePlannedDecision = tryCreateFromPrePlanned(briefing, zones, surplusPool, turn);
    if (prePlannedDecision) return prePlannedDecision;

    // Priority 2: opportunity (weak/undefended enemy zone adjacent to surplus)
    const opportunityDecision = tryCreateFromOpportunity(briefing, zones, forces, surplusPool, turn);
    if (opportunityDecision) return opportunityDecision;

    // No plan created
    return { plan: null, action: 'none', reason: 'no viable plan available', concentration_orders: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// advanceExistingPlan — lifecycle management for active plans
// ═══════════════════════════════════════════════════════════════════════════

function advanceExistingPlan(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    plan: CommanderPlan,
    turn: number,
): PlanDecision {
    // Check for abandon conditions first
    const abandonReason = checkAbandonConditions(plan, zones, surplusPool, turn);
    if (abandonReason) {
        return {
            plan: { ...plan, status: 'abandoned' },
            action: 'abandoned',
            reason: abandonReason,
            concentration_orders: [],
        };
    }

    // Check for suspend conditions
    const suspendReason = checkSuspendConditions(plan, zones, surplusPool, briefing);
    if (suspendReason) {
        // If already suspended, check duration
        if (plan.status === 'suspended') {
            const suspendedTurns = turn - (plan.created_turn + estimateTurnsActive(plan, turn));
            if (suspendedTurns >= MAX_SUSPENSION_TURNS) {
                return {
                    plan: { ...plan, status: 'abandoned' },
                    action: 'abandoned',
                    reason: `suspended for ${suspendedTurns} turns: ${suspendReason}`,
                    concentration_orders: [],
                };
            }
        }
        return {
            plan: { ...plan, status: 'suspended', suspension_reason: suspendReason },
            action: 'suspended',
            reason: suspendReason,
            concentration_orders: [],
        };
    }

    // Executing plans have been handed to EMIT — they're done from the planner's perspective.
    // Clear the plan so new plans can be created next turn.
    if (plan.status === 'executing') {
        return {
            plan: null,
            action: 'none',
            reason: 'plan handed to execution pipeline',
            concentration_orders: [],
        };
    }

    // If previously suspended, resume to concentrating
    const effectiveStatus: CommanderPlanStatus = plan.status === 'suspended' ? 'concentrating' : plan.status;

    // Compute concentration progress
    const brigadesAtStaging = countBrigadesInZone(plan.assigned_brigades, surplusPool, plan.staging_zone);
    const concentrationProgress = plan.required_brigades > 0
        ? Math.min(1.0, brigadesAtStaging / plan.required_brigades)
        : 0;

    // Compute viability
    const viability = computeViabilityScore(plan, zones, surplusPool);

    if (viability < VIABILITY_ABANDON_THRESHOLD) {
        return {
            plan: { ...plan, status: 'abandoned', viability_score: viability },
            action: 'abandoned',
            reason: `viability dropped to ${viability.toFixed(2)}`,
            concentration_orders: [],
        };
    }

    // Ready check: enough brigades concentrated
    if (effectiveStatus === 'concentrating' && concentrationProgress >= CONCENTRATION_READY_THRESHOLD) {
        const readyPlan: CommanderPlan = {
            ...plan,
            status: 'ready',
            concentration_progress: concentrationProgress,
            viability_score: viability,
        };
        return {
            plan: readyPlan,
            action: 'advanced',
            reason: `concentration complete (${(concentrationProgress * 100).toFixed(0)}%), ready to launch`,
            concentration_orders: [],
        };
    }

    // Launch check: ready for 1+ turns means execute
    if (effectiveStatus === 'ready' || plan.status === 'ready') {
        const launchPlan: CommanderPlan = {
            ...plan,
            status: 'executing',
            concentration_progress: concentrationProgress,
            viability_score: viability,
        };
        return {
            plan: launchPlan,
            action: 'launched',
            reason: 'plan ready, launching operation',
            concentration_orders: [],
        };
    }

    // Still concentrating — issue movement orders
    const concentrationOrders = buildConcentrationOrders(
        plan.assigned_brigades,
        surplusPool,
        plan.staging_zone,
    );

    const advancedPlan: CommanderPlan = {
        ...plan,
        status: effectiveStatus,
        concentration_progress: concentrationProgress,
        viability_score: viability,
    };

    return {
        plan: advancedPlan,
        action: 'advanced',
        reason: `concentrating: ${brigadesAtStaging}/${plan.required_brigades} brigades at staging`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// tryCreateFromPrePlanned — adopt pre-planned operations
// ═══════════════════════════════════════════════════════════════════════════

function tryCreateFromPrePlanned(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    turn: number,
): PlanDecision | null {
    if (!briefing.pre_planned_ops || briefing.pre_planned_ops.length === 0) return null;

    // Take the first pre-planned op (queue order is priority order)
    const opDef = briefing.pre_planned_ops[0] as Record<string, unknown>;
    if (!opDef) return null;

    const opName = (opDef['name'] as string) ?? 'pre_planned_op';

    // Find the best staging zone: zone with most surplus, preferring projecting posture
    const stagingZone = findBestStagingZone(zones, surplusPool);
    if (!stagingZone) return null;

    // Determine required brigades: scale to estimated task, minimum 3
    const requiredBrigades = Math.max(MIN_BRIGADES_FOR_PLAN, surplusPool.length);

    // Estimate concentration time: 1 turn per 2 brigades that need to move
    const brigadesAlreadyAtStaging = countBrigadesInZone(
        surplusPool.map(e => e.brigade_id),
        surplusPool,
        stagingZone.zone_id,
    );
    const brigadesToMove = Math.max(0, requiredBrigades - brigadesAlreadyAtStaging);
    const concentrationTurns = Math.ceil(brigadesToMove / PLAN_CONCENTRATION_RATE);

    // Check besieged corps rule
    if (isBesiegedCorps(zones) && !isLocalTarget(opDef, stagingZone)) {
        return null; // Cannot plan distant offensives from besieged position
    }

    // Assign brigades from surplus pool (sorted by offensive fitness)
    const assignedBrigades = selectBrigadesForPlan(surplusPool, requiredBrigades);

    const plan: CommanderPlan = {
        plan_id: `plan_${briefing.corps_id}_t${turn}_${opName.replace(/\s+/g, '_').toLowerCase()}`,
        objective_description: opName,
        target_osids: extractTargetOsids(opDef),
        required_brigades: requiredBrigades,
        assigned_brigades: assignedBrigades,
        staging_zone: stagingZone.zone_id,
        status: 'concentrating',
        created_turn: turn,
        target_ready_turn: turn + concentrationTurns,
        concentration_progress: requiredBrigades > 0
            ? Math.min(1.0, brigadesAlreadyAtStaging / requiredBrigades)
            : 0,
        viability_score: 1.0,
        source: 'pre_planned',
    };

    const concentrationOrders = buildConcentrationOrders(assignedBrigades, surplusPool, stagingZone.zone_id);

    return {
        plan,
        action: 'created',
        reason: `adopted pre-planned op: ${opName}`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// tryCreateFromOpportunity — detect weak/undefended adjacent zone
// ═══════════════════════════════════════════════════════════════════════════

function tryCreateFromOpportunity(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forces: ForceAssessment,
    surplusPool: BrigadeEvaluation[],
    turn: number,
): PlanDecision | null {
    if (surplusPool.length < MIN_BRIGADES_FOR_PLAN) return null;

    // Find projecting zones with surplus
    const projectingZones = zones
        .filter(z => z.posture === 'projecting' && z.surplus_brigades.length >= MIN_BRIGADES_FOR_PLAN)
        .sort((a, b) => {
            const diff = b.surplus_brigades.length - a.surplus_brigades.length;
            if (diff !== 0) return diff;
            return strictCompare(a.zone_id, b.zone_id);
        });

    if (projectingZones.length === 0) return null;

    // Check besieged corps rule
    if (isBesiegedCorps(zones)) {
        // Besieged corps can only do local ops
        // Still allow opportunity within hop limit
        const bestZone = projectingZones[0]!;
        return createOpportunityPlan(briefing, bestZone, surplusPool, turn, true);
    }

    const bestZone = projectingZones[0]!;
    return createOpportunityPlan(briefing, bestZone, surplusPool, turn, false);
}

function createOpportunityPlan(
    briefing: CommanderBriefing,
    stagingZone: ZoneAssessment,
    surplusPool: BrigadeEvaluation[],
    turn: number,
    isLocal: boolean,
): PlanDecision {
    const requiredBrigades = Math.max(
        MIN_BRIGADES_FOR_PLAN,
        Math.min(surplusPool.length, stagingZone.surplus_brigades.length),
    );

    const assignedBrigades = selectBrigadesForPlan(surplusPool, requiredBrigades);

    const brigadesAlreadyAtStaging = countBrigadesInZone(assignedBrigades, surplusPool, stagingZone.zone_id);
    const brigadesToMove = Math.max(0, requiredBrigades - brigadesAlreadyAtStaging);
    const concentrationTurns = Math.ceil(brigadesToMove / PLAN_CONCENTRATION_RATE);

    const plan: CommanderPlan = {
        plan_id: `plan_${briefing.corps_id}_t${turn}_opportunity`,
        objective_description: isLocal
            ? `local opportunity from ${stagingZone.zone_id}`
            : `offensive opportunity from ${stagingZone.zone_id}`,
        target_osids: selectOpportunityTargets(stagingZone, requiredBrigades),
        required_brigades: requiredBrigades,
        assigned_brigades: assignedBrigades,
        staging_zone: stagingZone.zone_id,
        status: 'concentrating',
        created_turn: turn,
        target_ready_turn: turn + concentrationTurns,
        concentration_progress: requiredBrigades > 0
            ? Math.min(1.0, brigadesAlreadyAtStaging / requiredBrigades)
            : 0,
        viability_score: 0.8,  // Opportunity plans start with lower viability than pre-planned
        source: 'opportunity',
    };

    const concentrationOrders = buildConcentrationOrders(assignedBrigades, surplusPool, stagingZone.zone_id);

    return {
        plan,
        action: 'created',
        reason: isLocal
            ? `local opportunity: ${requiredBrigades} brigades at ${stagingZone.zone_id}`
            : `offensive opportunity: ${requiredBrigades} brigades at ${stagingZone.zone_id}`,
        concentration_orders: concentrationOrders,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: select opportunity targets from zone's enemy adjacency
// ═══════════════════════════════════════════════════════════════════════════

function selectOpportunityTargets(
    stagingZone: ZoneAssessment,
    requiredBrigades: number,
): string[] {
    const enemyOsids = stagingZone.enemy_adjacent_osids;
    if (enemyOsids.length === 0) return [];
    const maxObjectives = Math.max(1, Math.min(6, Math.floor(requiredBrigades * 0.5)));
    return [...enemyOsids].sort(strictCompare).slice(0, maxObjectives);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check abandon conditions
// ═══════════════════════════════════════════════════════════════════════════

function checkAbandonConditions(
    plan: CommanderPlan,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    turn: number,
): string | null {
    // Already abandoned
    if (plan.status === 'abandoned') return null;

    // Staging zone became besieged
    const stagingZone = zones.find(z => z.zone_id === plan.staging_zone);
    if (stagingZone && stagingZone.posture === 'besieged') {
        return 'staging zone is now besieged';
    }

    // Required brigades no longer achievable
    const availableSurplus = surplusPool.length;
    if (availableSurplus < Math.ceil(plan.required_brigades * 0.5)) {
        return `insufficient brigades: ${availableSurplus} available, ${plan.required_brigades} required`;
    }

    // Plan has been active too long without reaching ready (stalled)
    const turnsSinceCreation = turn - plan.created_turn;
    const expectedDuration = (plan.target_ready_turn - plan.created_turn) * 2;
    if (plan.status === 'concentrating' && turnsSinceCreation > Math.max(expectedDuration, 6)) {
        return `stalled: ${turnsSinceCreation} turns without reaching ready state`;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check suspend conditions
// ═══════════════════════════════════════════════════════════════════════════

function checkSuspendConditions(
    plan: CommanderPlan,
    zones: ZoneAssessment[],
    surplusPool: BrigadeEvaluation[],
    briefing: CommanderBriefing,
): string | null {
    // Only concentrating or ready plans can be suspended
    if (plan.status !== 'concentrating' && plan.status !== 'ready' && plan.status !== 'suspended') {
        return null;
    }

    // Check for high/critical threat in any zone
    const previousThreat = briefing.previous_state?.threat_assessment;
    if (previousThreat) {
        for (const tz of previousThreat.threatened_zones) {
            if (tz.threat_level === 'high' || tz.threat_level === 'critical') {
                return `zone ${tz.zone_id} under ${tz.threat_level} threat`;
            }
        }
    }

    // Surplus dropped below required
    if (surplusPool.length < plan.required_brigades) {
        return `surplus dropped to ${surplusPool.length}, need ${plan.required_brigades}`;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: count brigades in zone
// ═══════════════════════════════════════════════════════════════════════════

function countBrigadesInZone(
    brigadeIds: readonly FormationId[],
    evaluations: readonly BrigadeEvaluation[],
    zoneId: ZoneId,
): number {
    const idSet = new Set(brigadeIds);
    let count = 0;
    for (const ev of evaluations) {
        if (idSet.has(ev.brigade_id) && ev.current_zone === zoneId) {
            count++;
        }
    }
    return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: build concentration orders for brigades not yet at staging
// ═══════════════════════════════════════════════════════════════════════════

function buildConcentrationOrders(
    assignedBrigades: readonly FormationId[],
    evaluations: readonly BrigadeEvaluation[],
    stagingZone: ZoneId,
): Array<{ brigade_id: FormationId; destination_zone: ZoneId }> {
    const orders: Array<{ brigade_id: FormationId; destination_zone: ZoneId }> = [];
    const idSet = new Set(assignedBrigades);

    // Collect brigades not at staging zone, sort deterministically
    const needsMovement: BrigadeEvaluation[] = [];
    for (const ev of evaluations) {
        if (idSet.has(ev.brigade_id) && ev.current_zone !== stagingZone) {
            needsMovement.push(ev);
        }
    }
    needsMovement.sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));

    for (const ev of needsMovement) {
        orders.push({ brigade_id: ev.brigade_id, destination_zone: stagingZone });
    }

    return orders;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: select brigades for a plan (best offensive fitness first)
// ═══════════════════════════════════════════════════════════════════════════

function selectBrigadesForPlan(
    surplusPool: readonly BrigadeEvaluation[],
    count: number,
): FormationId[] {
    const sorted = [...surplusPool]
        .filter(ev => ev.is_combat_effective && !ev.is_disrupted)
        .sort((a, b) => {
            const fitDiff = b.fitness_offense - a.fitness_offense;
            if (fitDiff !== 0) return fitDiff;
            return strictCompare(a.brigade_id, b.brigade_id);
        });

    const selected: FormationId[] = [];
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
        selected.push(sorted[i]!.brigade_id);
    }
    return selected;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: find best staging zone
// ═══════════════════════════════════════════════════════════════════════════

function findBestStagingZone(
    zones: readonly ZoneAssessment[],
    surplusPool: readonly BrigadeEvaluation[],
): ZoneAssessment | null {
    // Prefer projecting > balanced > defending. Never stage from besieged.
    const posturePriority: Record<string, number> = {
        projecting: 0,
        balanced: 1,
        defending: 2,
        besieged: 99,
    };

    const candidates = zones
        .filter(z => z.posture !== 'besieged' && z.front_edge_count > 0)
        .sort((a, b) => {
            // 1. Posture priority
            const posA = posturePriority[a.posture] ?? 99;
            const posB = posturePriority[b.posture] ?? 99;
            if (posA !== posB) return posA - posB;
            // 2. Most surplus brigades
            const surpDiff = b.surplus_brigades.length - a.surplus_brigades.length;
            if (surpDiff !== 0) return surpDiff;
            // 3. Deterministic tiebreaker
            return strictCompare(a.zone_id, b.zone_id);
        });

    return candidates.length > 0 ? candidates[0]! : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check if corps is besieged (all zones besieged)
// ═══════════════════════════════════════════════════════════════════════════

function isBesiegedCorps(zones: readonly ZoneAssessment[]): boolean {
    if (zones.length === 0) return false;
    return zones.every(z => z.posture === 'besieged');
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: check if op target is local to staging zone (within hop limit)
// ═══════════════════════════════════════════════════════════════════════════

function isLocalTarget(opDef: Record<string, unknown>, stagingZone: ZoneAssessment): boolean {
    // For pre-planned ops, check if target OSIDs overlap with or are adjacent to staging zone
    const targetOsids = extractTargetOsids(opDef);
    if (targetOsids.length === 0) return true; // No specific targets = local by default
    // If any target OSID is in the staging zone's OSIDs, it's local
    const zoneOsidSet = new Set(stagingZone.osids);
    return targetOsids.some(osid => zoneOsidSet.has(osid));
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: extract target OSIDs from an op definition
// ═══════════════════════════════════════════════════════════════════════════

function extractTargetOsids(opDef: Record<string, unknown>): string[] {
    // Pre-planned ops may have target_osids, objectives, or similar fields
    const targets = opDef['target_osids'] as string[] | undefined;
    if (Array.isArray(targets)) return [...targets].sort(strictCompare);

    const objectives = opDef['objectives'] as Array<{ osid?: string }> | undefined;
    if (Array.isArray(objectives)) {
        return objectives
            .map(o => o.osid)
            .filter((osid): osid is string => typeof osid === 'string')
            .sort(strictCompare);
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: compute viability score for an existing plan
// ═══════════════════════════════════════════════════════════════════════════

function computeViabilityScore(
    plan: CommanderPlan,
    zones: readonly ZoneAssessment[],
    surplusPool: readonly BrigadeEvaluation[],
): number {
    let score = 1.0;

    // Penalty if staging zone is under pressure
    const stagingZone = zones.find(z => z.zone_id === plan.staging_zone);
    if (!stagingZone) return 0.0; // Staging zone lost entirely
    if (stagingZone.posture === 'defending') score *= 0.7;
    if (stagingZone.deficit > 0) score *= 0.8;

    // Penalty for insufficient surplus
    const combatEffectiveSurplus = surplusPool.filter(ev => ev.is_combat_effective).length;
    if (combatEffectiveSurplus < plan.required_brigades) {
        score *= combatEffectiveSurplus / plan.required_brigades;
    }

    // Penalty for assigned brigades lost (no longer in surplus pool)
    const surplusIds = new Set(surplusPool.map(ev => ev.brigade_id));
    const assignedStillAvailable = plan.assigned_brigades.filter(id => surplusIds.has(id)).length;
    if (plan.assigned_brigades.length > 0) {
        const retentionRate = assignedStillAvailable / plan.assigned_brigades.length;
        score *= retentionRate;
    }

    return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: estimate turns a plan has been actively concentrating
// ═══════════════════════════════════════════════════════════════════════════

function estimateTurnsActive(plan: CommanderPlan, currentTurn: number): number {
    // Simple estimate: total turns minus expected concentration time
    const totalTurns = currentTurn - plan.created_turn;
    const expectedConcentration = plan.target_ready_turn - plan.created_turn;
    return Math.min(totalTurns, expectedConcentration);
}
