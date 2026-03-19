/**
 * Sector offensive lifecycle management.
 *
 * A sector offensive IS a CorpsOperation with type === 'sector_attack'.
 * Lifecycle: planning → execution → recovery → removed from state.
 *
 * Pipeline integration:
 *   advance-sector-offensives  (after corps orders, before brigade orders)
 *   update-sector-offensive-results (after attack resolution)
 *
 * **Launch and eligible-attacker gates (Phase D Trust-and-Baseline):**
 * - Launch: Corps may launch when sector has ≥ MIN_BRIGADES_FOR_OFFENSIVE (2) assigned,
 *   no existing sector op for that corps, and sector has valid offensive targets. Planning
 *   duration is computed from objective count; force_launch can shorten.
 * - Transition to execution: when planning_elapsed >= planning_duration (or force_launch
 *   and elapsed >= 1). Supply readiness is recorded but does not block launch.
 * - Eligible attacker: a brigade that may actually attack in execution is one that is in
 *   participating_brigades, assigned to the operation's sector (or explicitly in the op),
 *   can adopt attack/assault posture (not blocked by home_defense_active unless exempt as
 *   operation participant), and has the target in effectiveDirective.offensive_targets.
 *   See bot_brigade_ai_osid.ts (attack order generation) and combat-causality invalidation
 *   "operation_execution_without_eligible_attackers" when execution runs with zero such brigades.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    CorpsCommandState,
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { pickOperationName } from './operation_names.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { ControlSide } from '../../state/political_control_types.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { releaseOperationCommander } from './officer_system.js';
import { finalizeOperationAAR } from './operation_aar.js';
import { applyOperationExperience, gradeStarsToOutcome, checkDefeatism } from './officer_experience.js';
import { isEastHerzegovinaPair, isGrazAccordsActive } from '../local_truces.js';
import { isFriendlyFaction as isFriendlyFactionCtrl } from '../early_war/alliance_update.js';
import { isOsidInSameEnclave } from './enclave_resilience.js';
import { tickPreparation, hasUnresolvedProbe, autoResolveProbe } from './operation_preparation.js';
import { RS_BLITZ_PHASE_END_WEEK } from './bot_constants.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import type { PreparationEvent } from '../turn_pipeline_types.js';
import { checkLoanedArrivals, areLoanedBrigadesReady, cleanupDissolvedLoans } from './operation_reinforcement.js';
import { MAX_OP_LOAN_DISTANCE, LOAN_STAGING_BUFFER_TURNS } from './operation_reinforcement_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Equipment priority
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Equipment class priority for operation participant ordering.
 * Higher = selected first for offensive operations.
 * Motorized/mechanized brigades are the most valuable offensive assets.
 */
export function getEquipmentOffensivePriority(equipmentClass: string | undefined): number {
    switch (equipmentClass) {
        case 'mechanized': return 3;
        case 'motorized': return 2;
        case 'mountain': return 1;
        default: return 0; // light_infantry, police, special, undefined
    }
}

/**
 * Resolve a formation's equipment class from `equipment_class` field or `equip:` tag.
 * OOB early-war entry doesn't set the field, but does set the tag.
 */
export function resolveEquipmentClass(f: { equipment_class?: string; tags?: string[] }): string | undefined {
    if (f.equipment_class) return f.equipment_class;
    const tag = f.tags?.find(t => t.startsWith('equip:'));
    return tag ? tag.slice(6) : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum brigades in sector to launch an offensive. */
// Minimum brigades required to launch a sector offensive.
// Single-brigade "operations" are not operations — they hammer one objective,
// fail 3 consecutive idle turns, and "complete" with 0 captures.
// 2 brigades = minimum for realistic combined-arms commitment.
const MIN_BRIGADES_FOR_OFFENSIVE = 2;

/** Maximum objectives per offensive (absolute cap). */
const MAX_OBJECTIVES_CAP = 6;
/** Objectives per brigade ratio — scales op scope with force size. */
const OBJECTIVES_PER_BRIGADE = 0.5; // 1 objective per 2 brigades

/** Personnel floor below which a brigade cannot attack (mirrors bot_brigade_eval_attack gate). */
const COMBAT_INEFFECTIVE_PERSONNEL = 400;

/** Build OSID adjacency from front edges — fallback when caller doesn't provide one. */
function buildOsidAdjacencyFromFrontEdges(state: GameState): Map<string, string[]> {
    const frontEdges = state.military.war_front_edges_osid ?? [];
    const adj = new Map<string, string[]>();
    for (const fe of frontEdges) {
        if (!fe.a || !fe.b) continue;
        let listA = adj.get(fe.a);
        if (!listA) { listA = []; adj.set(fe.a, listA); }
        if (!listA.includes(fe.b)) listA.push(fe.b);
        let listB = adj.get(fe.b);
        if (!listB) { listB = []; adj.set(fe.b, listB); }
        if (!listB.includes(fe.a)) listB.push(fe.a);
    }
    return adj;
}

/** Maximum brigades participating in a single sector offensive. */
const MAX_PARTICIPATING_BRIGADES = 20;

/** Momentum cap. */
const MOMENTUM_CAP = 3;

/**
 * Number of failed operation attempts on the same objective before triggering a cooldown.
 * After this many failures, the objective is suppressed for OBJECTIVE_FAILURE_COOLDOWN_TURNS.
 * Set to 2: one probe-style failure is tolerable, but a second consecutive failure
 * signals the position is hardened and the corps should redirect effort.
 */
const OBJECTIVE_FAILURE_THRESHOLD = 2;

/**
 * How many turns a repeatedly-failed objective is suppressed from directive targeting.
 * 8 turns (~2 months) gives time for reinforcements, resupply, or re-assessment —
 * consistent with historical pauses after failed assaults in the Bosnian War.
 */
const OBJECTIVE_FAILURE_COOLDOWN_TURNS = 8;

/** Corps exhaustion decay per turn when idle (no active operation). */
const EXHAUSTION_DECAY_IDLE = 3;

/** Corps exhaustion decay per turn while running an operation. */
const EXHAUSTION_DECAY_ACTIVE = 1;

/** Maximum total failures before abort.
 *
 * WARNING (Issue #29 — REAL_WAR_MASTER.md): In multi-axis operations this cap
 * is applied PER AXIS, not per operation. With 5 axes × 5 failures each, the
 * operation can sustain 25 total failures before all axes stall and recovery
 * begins. Operacija Izlaz (3rd Corps, n701 run) ran 12 weeks, 0/5 objectives,
 * burning ~3,500 ARBiH personnel at 7-21:1 attacker:defender ratios because
 * each axis failed independently. A real corps commander would abort after the
 * 2nd catastrophic failure with 500+ casualties. Fix candidates:
 *   (a) Add an OPERATION-LEVEL failure cap that fires independently of per-axis
 *       counting — e.g. MAX_OPERATION_TOTAL_FAILURES = 8 across all axes.
 *   (b) Add a power-ratio viability gate: if predicted power_ratio < 0.35 for
 *       all remaining axes, abort regardless of failure budget.
 *   (c) Reduce to MAX_TOTAL_FAILURES = 3 for multi-axis and keep 5 for single. */
const MAX_TOTAL_FAILURES = 5;

/** Consecutive failures on same objective before skip. */
const MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3;

/** Maximum execution turns with movement but zero attacks before abort.
 *  Prevents operations from marching brigades around indefinitely when
 *  no brigade can find an attackable target (e.g. ARBiH 1st Corps under siege). */
const MAX_MOVEMENT_ONLY_EXECUTION_TURNS = 4;

/** Zero-progress failure abort threshold for multi-axis operations (Issue #29).
 *  When total axis failures reach this number AND zero objectives have been
 *  captured AND at least 1 attack has been made (not just marching), the
 *  operation is terminated early. This fires BEFORE the per-axis cap
 *  (MAX_TOTAL_FAILURES=5) for single-axis operations, cutting suicidal
 *  attack runs from 5 turns to 3. Multi-axis operations making any progress
 *  (≥1 capture) are exempt and run to their full per-axis budget. */
const MAX_OPERATION_ZERO_PROGRESS_FAILURES = 3;

/** Consecutive catastrophic outcomes on the same objective before axis stalls.
 *  A desperate attack at bad odds can happen once — commanders sometimes gamble.
 *  But no one sends men to die at the same fortified position three turns running.
 *  After 2 consecutive catastrophics, the axis stalls. */
const MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT = 2;
const EARLY_LAUNCH_COHESION_PENALTY = 15;
const ALL_OUT_EXTRA_COHESION_COST = 1;
const BOMBARDMENT_PREP_COST = 2;
const FEINT_PLANNING_TURNS = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Post-operation brigade release
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Issue column march orders for brigades that are away from their home
 * municipality after an operation completes. Without this, brigades stay
 * at their operation endpoint and drift into wrong sectors.
 *
 * Called at the moment the operation is about to be cleared, while
 * participating_brigades is still available on the op.
 */
function issuePostOperationReturnMarches(state: GameState, op: CorpsOperation): void {
    const formations = state.military.formations ?? {};
    const allBrigades = isMultiAxis(op) ? getAllAxisBrigades(op) : (op.participating_brigades ?? []);

    for (const bid of allBrigades) {
        const f = formations[bid];
        if (!f || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;

        const loc = f.location_osid;
        const homeOsid = f.home_osid;
        if (!loc || !homeOsid) continue;

        // Already home — no march needed
        const homeMun = homeOsid.split(':')[1] ?? '';
        const currentMun = loc.split(':')[1] ?? '';
        if (currentMun === homeMun) continue;

        // Skip disrupted brigades — they can't march
        if ((f.disrupted_turns ?? 0) > 0) continue;

        // Skip if already has pending movement orders (e.g. from another system)
        const existingOrders = state.military.brigade_movement_orders ?? {};
        if (existingOrders[bid]) continue;

        // Issue column march toward home_osid (the movement system will BFS there)
        if (!state.military.brigade_movement_orders) {
            (state.military as any).brigade_movement_orders = {};
        }
        state.military.brigade_movement_orders![bid] = {
            destination_sids: [homeOsid],
            stance: 'column',
        } as any;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-axis helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Check if an operation uses the multi-axis structure. */
export function isMultiAxis(op: CorpsOperation): boolean {
    return Array.isArray(op.axes) && op.axes.length > 0;
}

/** Get all objectives across all axes (deduplicated, sorted). */
export function getAllAxisObjectives(op: CorpsOperation): string[] {
    if (!isMultiAxis(op)) return op.objectives ?? [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const axis of op.axes!) {
        for (const obj of axis.objectives) {
            if (!seen.has(obj)) {
                seen.add(obj);
                result.push(obj);
            }
        }
    }
    return result;
}

/** Get all participating brigades across all axes (deduplicated, sorted). */
export function getAllAxisBrigades(op: CorpsOperation): FormationId[] {
    if (!isMultiAxis(op)) return op.participating_brigades;
    const seen = new Set<string>();
    const result: FormationId[] = [];
    for (const axis of op.axes!) {
        for (const bid of axis.assigned_brigades) {
            if (!seen.has(bid)) {
                seen.add(bid);
                result.push(bid);
            }
        }
    }
    return result.sort(strictCompare);
}

/** Check if all axes are terminal (complete or stalled). */
function allAxesTerminal(axes: OperationAxis[]): boolean {
    return axes.every(a => a.status === 'complete' || a.status === 'stalled');
}

/** Sum a numeric field across all axes. */
function sumAxesField(axes: OperationAxis[], field: keyof OperationAxis): number {
    let total = 0;
    for (const axis of axes) {
        const val = axis[field];
        if (typeof val === 'number') total += val;
    }
    return total;
}

/** Reset an axis to execution-start state. */
function resetAxisForExecution(axis: OperationAxis): void {
    axis.current_objective_index = 0;
    axis.status = 'executing';
    axis.failure_count = 0;
    axis.consecutive_failures_on_current = 0;
    axis.momentum = 0;
    axis.last_result = undefined;
    axis.attack_attempt_count = 0;
    axis.objective_capture_count = 0;
    axis.movement_only_execution_turns = 0;
    axis.idle_execution_turn_streak = 0;
}

/** Create a single-axis wrapper for bot-generated operations. */
export function createSingleAxis(
    brigades: FormationId[],
    objectives: string[],
    stagingOsid?: string,
): OperationAxis {
    return {
        axis_id: 'main',
        name: 'Main Advance',
        assigned_brigades: brigades.sort(strictCompare),
        objectives,
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...(stagingOsid && { staging_osid: stagingOsid }),
    };
}

/** Compute planning duration for multi-axis ops: based on longest axis. */
function computeMultiAxisPlanningDuration(axes: OperationAxis[]): number {
    let maxLen = 0;
    for (const axis of axes) {
        if (axis.objectives.length > maxLen) maxLen = axis.objectives.length;
    }
    return computePlanningDuration(maxLen);
}

/**
 * Validate that an axis's objective chain is contiguous via the adjacency map.
 * Each objective must be adjacent to the staging OSID or to a prior objective in the chain.
 * Returns null if valid, or an error string if invalid.
 */
export function validateAxisContiguity(
    axis: OperationAxis,
    adjacency: Map<string, string[]>,
): string | null {
    if (axis.objectives.length === 0) return null;
    const reachable = new Set<string>();
    if (axis.staging_osid) reachable.add(axis.staging_osid);
    for (let i = 0; i < axis.objectives.length; i++) {
        const obj = axis.objectives[i];
        if (i === 0) {
            // First objective must be adjacent to staging or we skip the check if no staging
            if (axis.staging_osid) {
                const neighbors = adjacency.get(axis.staging_osid) ?? [];
                if (!neighbors.includes(obj)) {
                    return `Axis "${axis.name}": objective[0] "${obj}" is not adjacent to staging "${axis.staging_osid}"`;
                }
            }
        } else {
            // Must be adjacent to any prior objective (branching chains allowed)
            let connected = false;
            for (const prior of axis.objectives.slice(0, i)) {
                const neighbors = adjacency.get(prior) ?? [];
                if (neighbors.includes(obj)) {
                    connected = true;
                    break;
                }
            }
            if (!connected) {
                return `Axis "${axis.name}": objective[${i}] "${obj}" is not adjacent to any prior objective`;
            }
        }
        reachable.add(obj);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Planning duration
// ═══════════════════════════════════════════════════════════════════════════

/** Compute planning duration from number of objectives. */
export function computePlanningDuration(objectiveCount: number): number {
    if (objectiveCount <= 2) return 1;
    if (objectiveCount <= 5) return Math.ceil(objectiveCount * 0.6);
    return Math.min(5, Math.ceil(objectiveCount * 0.8));
}

function collectObjectiveApproachOsids(
    state: GameState,
    corpsId: FormationId,
    objectives: string[]
): Set<string> {
    const approachOsids = new Set<string>();
    if (!state.military.corps_front_sectors || objectives.length === 0) return approachOsids;
    const objectiveSet = new Set(objectives);
    for (const sector of Object.values(state.military.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            const touchesObjective = subSegment.enemy_osids.some((osid) => objectiveSet.has(osid));
            if (!touchesObjective) continue;
            for (const osid of subSegment.friendly_osids) {
                approachOsids.add(osid);
            }
        }
    }
    return approachOsids;
}

function areParticipantsReadyForExecution(
    state: GameState,
    corpsId: FormationId,
    participatingBrigades: FormationId[],
    stagingOsid: string | undefined,
    objectives: string[]
): boolean {
    const objectiveApproachOsids = collectObjectiveApproachOsids(state, corpsId, objectives);
    let activeParticipantCount = 0;
    for (const brigadeId of participatingBrigades) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const location = brigade.location_osid;
        if (typeof location !== 'string' || location.length === 0) return false;
        activeParticipantCount += 1;
        if (location === stagingOsid) continue;
        if (objectiveApproachOsids.has(location)) continue;
        return false;
    }
    return activeParticipantCount > 0;
}

/**
 * Record failed objectives for a corps when an operation ends without success.
 * After OBJECTIVE_FAILURE_THRESHOLD failures, the objective enters a cooldown period.
 * This prevents suicidal repeated assaults on hardened positions (Ripac pattern).
 */
function recordFailedObjectives(cmd: CorpsCommandState, op: CorpsOperation, turn: number): void {
    if (op.recovery_reason === 'completed') return; // Success — no failure to record
    if (op.recovery_reason === 'probe_complete') return; // Probes gather intel — not a failure

    const failedOsids: string[] = [];
    if (isMultiAxis(op) && op.axes) {
        for (const axis of op.axes) {
            if (axis.status !== 'complete') {
                for (const obj of axis.objectives) failedOsids.push(obj);
            }
        }
    } else {
        for (const obj of op.objectives ?? []) failedOsids.push(obj);
    }

    if (failedOsids.length === 0) return;

    if (!cmd.failed_offensive_objectives) cmd.failed_offensive_objectives = {};
    for (const osid of failedOsids) {
        const entry = cmd.failed_offensive_objectives[osid] ?? { failure_count: 0, cooldown_until_turn: 0 };
        entry.failure_count += 1;
        if (entry.failure_count >= OBJECTIVE_FAILURE_THRESHOLD) {
            entry.cooldown_until_turn = turn + OBJECTIVE_FAILURE_COOLDOWN_TURNS;
        }
        cmd.failed_offensive_objectives[osid] = entry;
    }
}

function beginRecovery(op: CorpsOperation, turn: number, reason: CorpsOperation['recovery_reason']): void {
    op.phase = 'recovery';
    op.phase_started_turn = turn;
    op.recovery_reason = reason;
    op.force_launch = false;
}

function getRecoveryDuration(op: CorpsOperation): number {
    const objectiveCount = op.objectives?.length ?? 2;
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
        case 'probe_complete':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(objectiveCount / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(objectiveCount / 2));
    }
}

function getNoAttemptRecoveryReason(op: CorpsOperation): CorpsOperation['recovery_reason'] {
    if (isMultiAxis(op)) {
        return sumAxesField(op.axes!, 'attack_attempt_count') > 0 ? 'max_failures' : 'no_logged_attempt';
    }
    return (op.attack_attempt_count ?? 0) > 0 ? 'max_failures' : 'no_logged_attempt';
}

function getMultiAxisRecoveryDuration(op: CorpsOperation): number {
    let maxLen = 0;
    for (const axis of op.axes ?? []) {
        if (axis.objectives.length > maxLen) maxLen = axis.objectives.length;
    }
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
        case 'probe_complete':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(maxLen / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(maxLen / 2));
    }
}

function applyCohesionDelta(state: GameState, brigadeIds: FormationId[], delta: number): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const next = Math.max(0, Math.min(100, (brigade.cohesion ?? 100) + delta));
        brigade.cohesion = Math.round(next * 10) / 10;
    }
}

function applyDigInOnHalt(state: GameState, brigadeIds: FormationId[]): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        brigade.posture = 'dig_in';
    }
}

function applyArtilleryPreparation(
    state: GameState,
    faction: FactionId,
    operation: CorpsOperation
): void {
    if (!operation.artillery_preparation || operation.artillery_preparation_consumed) return;
    const currentObjective = operation.objectives?.[operation.current_objective_index ?? 0];
    if (typeof currentObjective !== 'string' || currentObjective.length === 0) return;
    if (!state.military.heavy_munitions_reserve) state.military.heavy_munitions_reserve = {};
    const currentReserve = state.military.heavy_munitions_reserve[faction] ?? 0;
    if (currentReserve < BOMBARDMENT_PREP_COST) return;
    state.military.heavy_munitions_reserve[faction] = Math.max(0, currentReserve - BOMBARDMENT_PREP_COST);
    for (const formationId of Object.keys(state.military.formations ?? {}).sort(strictCompare)) {
        const formation = state.military.formations?.[formationId];
        if (!formation || formation.status !== 'active') continue;
        if (formation.location_osid !== currentObjective || formation.faction === faction) continue;
        formation.dig_in_progress = 0;
        formation.cohesion = Math.max(0, (formation.cohesion ?? 100) - 10);
    }
    operation.artillery_preparation_consumed = true;
}

function fullyRevealProbeSectorIntel(state: GameState, operation: CorpsOperation): void {
    if (operation.type !== 'probe' || !operation.sector_id || !state.military.sector_intel?.[operation.sector_id]) return;
    for (const record of state.military.sector_intel[operation.sector_id]) {
        record.confidence = 1;
    }
}

function resolveOperationSectorId(
    state: GameState,
    corpsId: FormationId,
    objectives: string[],
): string | null {
    if (!state.military.corps_front_sectors || objectives.length === 0) return null;
    const objectiveSet = new Set(objectives);
    let bestSectorId: string | null = null;
    let bestOverlap = 0;
    for (const sector of Object.values(state.military.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        let overlap = 0;
        for (const ss of sector.sub_segments ?? []) {
            for (const eo of ss.enemy_osids) {
                if (objectiveSet.has(eo)) overlap += 1;
            }
        }
        if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestSectorId = sector.sector_id;
        }
    }
    return bestSectorId;
}

// ═══════════════════════════════════════════════════════════════════════════
// Supply readiness
// ═══════════════════════════════════════════════════════════════════════════

/** Compute supply readiness as fraction of participating brigades with adequate supply. */
function computeSupplyReadiness(
    state: GameState,
    participatingBrigades: FormationId[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null
): number {
    // Supply readiness only meaningful when full supply reserves system is active
    if (!state.meta?.supply_reserves_enabled) return 1.0;
    if (!supplyByOsid?.factions || participatingBrigades.length === 0) return 1.0;
    const fac = supplyByOsid.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return 1.0;
    const osidState = new Map<string, SupplyStateLevel>();
    for (const e of fac.by_osid) osidState.set(e.osid, e.state);

    const reserveLevel = state.meta?.supply_reserves_enabled
        ? ((state.military.general_supply_reserve as Record<string, number> | undefined)?.[faction] ?? 100)
        : 100;

    let adequate = 0;
    for (const bid of participatingBrigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        const rawSt = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        const st = state.meta?.supply_reserves_enabled
            ? getEffectiveSupplyState(rawSt, reserveLevel)
            : rawSt;
        if (st === 'adequate') adequate++;
    }
    return participatingBrigades.length > 0 ? adequate / participatingBrigades.length : 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Advance sector offensives (phase transitions, validation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advance all sector offensives: manage phase transitions, supply readiness, sector validation.
 * Called after generate-bot-corps-orders, before generate-bot-brigade-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 */
export function advanceSectorOffensives(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null
): PreparationEvent[] {
    const prepEvents: PreparationEvent[] = [];
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return prepEvents;

    // ── Per-turn corps exhaustion decay ────────────────────────────────────
    // Corps recover from operational exhaustion each turn. Without decay,
    // corps permanently exhaust after 2 operations and the war stalls.
    const allCorpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const cid of allCorpsIds) {
        const cmd = corpsCommand[cid];
        if (!cmd || cmd.corps_exhaustion <= 0) continue;
        // Faster recovery when idle (no active op), slower when operating
        const decayRate = cmd.active_operation ? EXHAUSTION_DECAY_ACTIVE : EXHAUSTION_DECAY_IDLE;
        cmd.corps_exhaustion = Math.max(0, Math.round((cmd.corps_exhaustion - decayRate) * 10) / 10);
    }

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if (op.type !== 'sector_attack' && op.type !== 'feint' && op.type !== 'probe') continue;

        // Reset per-turn combat feedback counters
        op.battles_this_turn = 0;
        op.territory_gained_this_turn = 0;

        const turn = state.meta?.turn ?? 0;
        const corps = state.military.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;
        const multiAxis = isMultiAxis(op);

        const allObjectives = multiAxis ? getAllAxisObjectives(op) : (op.objectives ?? []);
        const allBrigades = multiAxis ? getAllAxisBrigades(op) : op.participating_brigades;

        const resolvedSectorId = resolveOperationSectorId(state, corpsId, allObjectives);
        if (resolvedSectorId) {
            op.sector_id = resolvedSectorId;
        }

        // Validate sector still exists
        if (op.sector_id && state.military.corps_front_sectors) {
            if (!state.military.corps_front_sectors[op.sector_id]) {
                if (op.phase !== 'recovery') {
                    const anyAttempts = multiAxis
                        ? sumAxesField(op.axes!, 'attack_attempt_count') > 0
                        : (op.attack_attempt_count ?? 0) > 0;
                    beginRecovery(op, turn, anyAttempts ? 'orphaned_sector' : 'no_logged_attempt');
                    continue;
                }
            }
        }

        // Recompute supply readiness
        op.supply_readiness = computeSupplyReadiness(state, allBrigades, faction, supplyByOsid);

        if (op.recovery_reason === 'manual_termination' && op.phase !== 'recovery') {
            if (op.dig_in_on_halt) {
                applyDigInOnHalt(state, allBrigades);
            }
            beginRecovery(op, turn, 'manual_termination');
            continue;
        }

        if (op.phase === 'planning') {
            if (op.type === 'probe') {
                op.planning_duration = 1;
                op.participating_brigades = [...(op.participating_brigades ?? [])].sort(strictCompare).slice(0, 2);
            }

            // ── Preparation sub-phase state machine (sector_attack only) ──
            // Probes and feints skip preparation — they are too small/fast.
            // force_launch bypasses preparation entirely (player override).
            // RS blitz phase (w0-12): pre-planned JNA-style ops skip preparation.
            const isPrePlannedBlitz = faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK;
            if (op.type === 'sector_attack' && op.force_launch !== true && !isPrePlannedBlitz) {
                // Auto-resolve any pending probes that didn't trigger combat
                if (hasUnresolvedProbe(op) && (turn - (op.active_probe!.started_turn)) >= 1) {
                    autoResolveProbe(state, op, faction);
                }

                const prepResult = tickPreparation(state, op, corpsId, faction, op.supply_readiness ?? 1.0);

                // Collect preparation event for turn report
                prepEvents.push({
                    corps_id: corpsId,
                    operation_name: op.name,
                    sub_phase: prepResult.sub_phase,
                    intel_confidence: prepResult.intel_confidence,
                    supply_readiness: prepResult.supply_readiness,
                    force_ratio_estimate: prepResult.force_ratio_estimate,
                    commander_assessment: prepResult.assessment,
                    probe_ordered: prepResult.probe_ordered || undefined,
                });

                if (prepResult.aborted) {
                    // Commander recommends abort — low exhaustion cost
                    beginRecovery(op, turn, 'manual_termination');
                    continue;
                }

                if (!prepResult.ready) {
                    // Preparation still in progress — skip the planning→execution transition
                    continue;
                }
                // Preparation complete (sub_phase === 'ready') — fall through to execution transition
            }

            // ── Loaned brigade arrival tracking ──
            // Check arrivals each planning turn. Extend staging if loans haven't arrived.
            if (op.loaned_brigades && op.loaned_brigades.length > 0) {
                cleanupDissolvedLoans(op, state.military.formations ?? {});
                const targetSector = op.sector_id ? state.military.corps_front_sectors?.[op.sector_id] : undefined;
                if (targetSector) {
                    const arrivalFraction = checkLoanedArrivals(op, state.military.formations ?? {}, targetSector);

                    // During force_staging, block transition if loans haven't arrived
                    if (op.preparation_sub_phase === 'force_staging' && !areLoanedBrigadesReady(arrivalFraction)) {
                        const elapsed = op.preparation_turns_elapsed ?? 0;
                        const maxWait = MAX_OP_LOAN_DISTANCE + LOAN_STAGING_BUFFER_TURNS;
                        if (elapsed < maxWait) {
                            continue; // Keep waiting for arrivals
                        }
                        // Timeout: drop non-arrived loans from participating_brigades
                        for (const loan of op.loaned_brigades) {
                            if (!loan.arrived) {
                                op.participating_brigades = op.participating_brigades.filter(id => id !== loan.brigade_id);
                                if (op.axes) {
                                    for (const axis of op.axes) {
                                        axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== loan.brigade_id);
                                    }
                                }
                            }
                        }
                        op.loaned_brigades = op.loaned_brigades.filter(l => l.arrived);
                    }
                }
            }

            const elapsed = turn - op.phase_started_turn;
            const planDuration = op.planning_duration
                ?? (multiAxis ? computeMultiAxisPlanningDuration(op.axes!) : 1);
            const stagedEarly = elapsed >= 1 && areParticipantsReadyForExecution(
                state,
                corpsId,
                allBrigades,
                op.staging_osid,
                allObjectives
            );
            const forcedLaunch = op.force_launch === true && elapsed >= 1;

            if (op.type === 'feint' && elapsed >= FEINT_PLANNING_TURNS) {
                applyCohesionDelta(state, allBrigades, -5);
                if (!state.military.general_supply_reserve) state.military.general_supply_reserve = {};
                state.military.general_supply_reserve[faction] = Math.max(0, (state.military.general_supply_reserve[faction] ?? 0) - 0.5);
                beginRecovery(op, turn, 'manual_termination');
                continue;
            }

            // For sector_attack with preparation: only reach here when preparation is 'ready'
            // (or force_launch / probe / feint which skip preparation).
            // Keep existing elapsed/staged/forcedLaunch gates for non-preparation ops.
            const preparationReady = op.type === 'sector_attack' && op.preparation_sub_phase === 'ready';
            if (preparationReady || elapsed > planDuration || stagedEarly || forcedLaunch) {
                op.phase = 'execution';
                op.phase_started_turn = turn;
                op.recovery_reason = undefined;

                if (multiAxis) {
                    for (const axis of op.axes!) resetAxisForExecution(axis);
                } else {
                    op.current_objective_index = 0;
                    op.momentum = 0;
                    op.failure_count = 0;
                    op.consecutive_failures_on_current = 0;
                    op.attack_attempt_count = 0;
                    op.objective_capture_count = 0;
                    op.movement_only_execution_turns = 0;
                    op.idle_execution_turn_streak = 0;
                }

                if (op.sector_id && Array.isArray(state.military.opsec_sectors)) {
                    state.military.opsec_sectors = state.military.opsec_sectors.filter((sectorId) => sectorId !== op.sector_id);
                }
                if (forcedLaunch) {
                    applyCohesionDelta(state, allBrigades, -EARLY_LAUNCH_COHESION_PENALTY);
                    op.force_launch = false;
                }
                applyArtilleryPreparation(state, faction, op);
            }
        } else if (op.phase === 'execution') {
            if (op.tempo === 'all_out') {
                applyCohesionDelta(state, allBrigades, -ALL_OUT_EXTRA_COHESION_COST);
            }

            if (multiAxis) {
                // Multi-axis: check if all axes are terminal
                if (allAxesTerminal(op.axes!)) {
                    const allComplete = op.axes!.every(a => a.status === 'complete');
                    beginRecovery(op, turn, allComplete ? 'completed' : 'max_failures');
                    continue;
                }
            } else {
                // Legacy flat: check completion and failures
                const objectives = op.objectives ?? [];
                if ((op.current_objective_index ?? 0) >= objectives.length) {
                    beginRecovery(op, turn, 'completed');
                    continue;
                }
                if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
                    continue;
                }
            }

            if (op.type === 'probe' && !multiAxis && (op.attack_attempt_count ?? 0) > 0) {
                beginRecovery(op, turn, op.last_result === 'captured' ? 'completed' : 'probe_complete');
                continue;
            }
        } else if (op.phase === 'recovery') {
            const elapsed = turn - op.phase_started_turn;
            const recoveryDuration = multiAxis
                ? getMultiAxisRecoveryDuration(op)
                : getRecoveryDuration(op);
            if (elapsed >= recoveryDuration) {
                const exhaustionCost = op.type === 'feint' || op.type === 'probe' ? 5 : 15;
                cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + exhaustionCost);
                if (op.type === 'sector_attack') {
                    finalizeOperationAAR(state, corpsId, op);
                    recordFailedObjectives(cmd, op, turn);
                    // Apply experience gain to operation commander based on AAR grade
                    if (op.commander_officer_id && state.operation_history?.length) {
                        const latestAAR = state.operation_history[state.operation_history.length - 1];
                        if (latestAAR && latestAAR.commander_officer_id === op.commander_officer_id) {
                            const outcome = gradeStarsToOutcome(latestAAR.grade.stars);
                            applyOperationExperience(state, op.commander_officer_id, outcome);
                        }
                    }
                    // Track consecutive operation failures for defeatism
                    if (op.commander_officer_id && state.military.named_officers) {
                        const os = state.military.named_officers[op.commander_officer_id];
                        if (os) {
                            if (op.recovery_reason === 'completed') {
                                os.consecutive_op_failures = 0; // Reset on success
                            } else if (op.recovery_reason !== 'probe_complete') {
                                os.consecutive_op_failures = (os.consecutive_op_failures ?? 0) + 1;
                                checkDefeatism(state, op.commander_officer_id, os.consecutive_op_failures);
                            }
                        }
                    }
                }
                releaseOperationCommander(state, op);

                // Activate east Herzegovina truce after Op Jackal (HRHB east-pair op) ends.
                // Historical: VRS-HRHB ceasefire in east Herzegovina held after June 1992 HVO offensive.
                // Only triggered by HRHB side — VRS Herzegovina ops completing should NOT freeze the truce.
                if (isGrazAccordsActive(state)
                    && isEastHerzegovinaPair(corpsId)
                    && faction === 'HRHB'
                    && state.political.graz_east_herzegovina_active_turn == null) {
                    state.political.graz_east_herzegovina_active_turn = turn;
                }

                // Release brigades: issue return-march orders for participants away from home.
                // Without this, brigades stay at their operation endpoint and get classified
                // into whatever sector owns that OSID — potentially far from home.
                issuePostOperationReturnMarches(state, op);

                cmd.consecutive_probes = 0;
                // Save completed op for theater-aware follow-on suppression.
                cmd.last_completed_operation = cmd.active_operation;
                cmd.last_completed_operation_turn = turn;
                cmd.active_operation = null;
            }
        }
    }
    return prepEvents;
}

// ═══════════════════════════════════════════════════════════════════════════
// Update sector offensive results (post-combat)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if objectives were captured after combat resolution.
 * Called after phase-ii-resolve-attack-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 * For multi-axis: each axis is evaluated independently; convergence objectives
 * (shared terminal targets) are captured for all axes when any axis captures them.
 */
export function updateSectorOffensiveResults(
    state: GameState,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if ((op.type !== 'sector_attack' && op.type !== 'probe') || op.phase !== 'execution') continue;

        const corps = state.military.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;
        const turn = state.meta?.turn ?? 0;

        if (isMultiAxis(op)) {
            updateMultiAxisResults(state, op, corpsId, faction, turn, reverseMap);
        } else {
            updateLegacyFlatResults(state, op, corpsId, faction, turn, reverseMap);
        }
    }
}

/** Update results for multi-axis operations. */
function updateMultiAxisResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const axes = op.axes!;

    // First pass: check for convergence captures (shared objectives captured by any axis)
    const capturedThisTurn = new Set<string>();
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) continue;
        const currentObj = axis.objectives[currentIdx]!;
        const controller = getPoliticalControllerOSID(state, currentObj, reverseMap ?? undefined);
        if (controller === faction || isFriendlyFactionCtrl(controller, faction, state)) {
            capturedThisTurn.add(currentObj);
        } else if (controller == null) {
            // Null-controlled OSID: auto-claim — no enemy, no battle needed
            if (!state.political.political_controllers) state.political.political_controllers = {};
            state.political.political_controllers[currentObj] = faction;
            capturedThisTurn.add(currentObj);
        }
    }

    // Second pass: advance each axis
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) {
            axis.status = 'complete';
            continue;
        }

        const currentObjective = axis.objectives[currentIdx]!;

        if (capturedThisTurn.has(currentObjective)) {
            // Captured (either by this axis's brigades or convergence from another axis)
            axis.attack_attempt_count += 1;
            axis.objective_capture_count += 1;
            axis.idle_execution_turn_streak = 0;
            axis.movement_only_execution_turns = 0; // reset: objective captured
            axis.last_result = 'captured';
            axis.momentum = Math.min(MOMENTUM_CAP, axis.momentum + 1);
            axis.current_objective_index = currentIdx + 1;
            axis.consecutive_failures_on_current = 0;
            axis.consecutive_catastrophic_on_current = 0;
            fullyRevealProbeSectorIntel(state, op);
        } else {
            // Check if any of THIS AXIS's brigades attacked (objective or intermediate)
            const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
            const anyAttackedObjective = axis.assigned_brigades.some(bid => {
                const b = state.military.formations?.[bid];
                if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
                return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
            });
            // Also count brigades attacking intermediate targets (fighting through)
            const anyAttackedAnything = axis.assigned_brigades.some(bid => {
                const b = state.military.formations?.[bid];
                return b != null && (b.posture === 'attack' || b.posture === 'assault');
            });
            const anyAttacked = anyAttackedObjective || anyAttackedAnything;
            // Check brigade_movement_state (persists across turns) NOT brigade_movement_orders
            // (which is cleared by apply-brigade-movement BEFORE this step runs).
            const anyMoved = axis.assigned_brigades.some(bid => {
                const movState = state.military.brigade_movement_state?.[bid];
                return movState?.status === 'in_transit' || movState?.status === 'packing';
            });

            if (anyAttackedObjective) {
                // Direct attack on current objective — standard failure tracking
                axis.attack_attempt_count += 1;
                axis.idle_execution_turn_streak = 0;
                axis.movement_only_execution_turns = 0; // reset: we ARE attacking
                axis.last_result = 'failed';
                axis.momentum = 0;
                axis.failure_count += 1;
                axis.consecutive_failures_on_current += 1;
                fullyRevealProbeSectorIntel(state, op);

                // ── Catastrophic outcome stall ──
                // Check if any attacking brigade's last engagement was catastrophic.
                // A desperate attack at bad odds can happen once — commanders sometimes gamble.
                // But no one sends men to die at the same fortified position three turns running.
                const wasCatastrophic = axis.assigned_brigades.some(bid => {
                    const b = state.military.formations?.[bid];
                    if (!b?.brigade_history?.engagements?.length) return false;
                    const lastEng = b.brigade_history.engagements[b.brigade_history.engagements.length - 1];
                    return lastEng.role === 'attacker' && lastEng.outcome === 'catastrophic';
                });
                if (wasCatastrophic) {
                    axis.consecutive_catastrophic_on_current = (axis.consecutive_catastrophic_on_current ?? 0) + 1;
                } else {
                    axis.consecutive_catastrophic_on_current = 0;
                }
                if ((axis.consecutive_catastrophic_on_current ?? 0) >= MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT) {
                    axis.status = 'stalled';
                    continue;
                }

                if (axis.consecutive_failures_on_current >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    axis.current_objective_index = currentIdx + 1;
                    axis.consecutive_failures_on_current = 0;
                    axis.consecutive_catastrophic_on_current = 0; // reset on objective change
                }
            } else if (anyAttackedAnything) {
                // Intermediate attack (fighting through toward objective)
                // Counts as approach progress, not a failure on the current objective
                axis.attack_attempt_count += 1;
                axis.idle_execution_turn_streak = 0;
                axis.last_result = 'approach';
                axis.momentum = 0;
                axis.movement_only_execution_turns += 1;
            } else {
                if (anyMoved) {
                    // Approach movement: brigade is marching toward objective.
                    // This is not a combat failure — don't increment failure counts.
                    axis.movement_only_execution_turns += 1;
                    axis.idle_execution_turn_streak = 0;
                    axis.last_result = 'approach';
                    axis.momentum = 0;
                } else {
                    // Truly idle: no movement, no attack.
                    axis.idle_execution_turn_streak += 1;
                    axis.last_result = 'stalemate';
                    axis.momentum = 0;
                    axis.failure_count += 1;
                    axis.consecutive_failures_on_current += 1;
                }

                // Idle stall: no movement and no attacks ever on this axis.
                // Threshold = 4 to give brigades time to march from staging to objectives
                // via regular movement (1 hop/turn). Column-marching brigades are already
                // detected via anyMoved (in_transit) and use the movement-only stall instead.
                if (!anyMoved && axis.attack_attempt_count === 0 && axis.idle_execution_turn_streak >= 4) {
                    axis.movement_only_execution_turns = Math.max(1, axis.movement_only_execution_turns);
                    axis.status = 'stalled';
                    continue;
                }

                // Movement-only stall: brigades marching but not attacking objectives
                if (axis.movement_only_execution_turns >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                    axis.status = 'stalled';
                    continue;
                }

                if (axis.consecutive_failures_on_current >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    axis.current_objective_index = currentIdx + 1;
                    axis.consecutive_failures_on_current = 0;
                }
            }
        }

        // Check axis completion or stall
        if (axis.current_objective_index >= axis.objectives.length) {
            axis.status = 'complete';
        }
        // Per-axis cap. The zero-progress backstop (MAX_OPERATION_ZERO_PROGRESS_FAILURES)
        // fires first for single-axis zero-capture operations; this per-axis cap remains
        // the backstop for multi-axis operations making partial progress.
        if (axis.failure_count >= MAX_TOTAL_FAILURES) {
            axis.status = 'stalled';
        }
    }

    // Aggregate axis-level captures to operation level
    let totalCaptures = 0;
    let totalAttempts = 0;
    let totalAxisFailures = 0;
    for (const axis of axes) {
        totalCaptures += axis.objective_capture_count ?? 0;
        totalAttempts += axis.attack_attempt_count ?? 0;
        totalAxisFailures += axis.failure_count ?? 0;
    }
    op.objective_capture_count = totalCaptures;
    op.attack_attempt_count = totalAttempts;

    // Zero-progress early abort: if ≥3 total axis failures with zero captures
    // and at least 1 real attack attempted, force all executing axes to stalled.
    // Fires before the per-axis cap (5) for single-axis operations, cutting
    // suicidal attack runs from 5 turns to 3. Exempt when any objective captured.
    if (
        totalAxisFailures >= MAX_OPERATION_ZERO_PROGRESS_FAILURES
        && totalCaptures === 0
        && totalAttempts >= 1
    ) {
        for (const axis of axes) {
            if (axis.status === 'executing') axis.status = 'stalled';
        }
    }

    // Check if all axes terminal → operation enters recovery
    if (allAxesTerminal(axes)) {
        const allComplete = axes.every(a => a.status === 'complete');
        beginRecovery(op, turn, allComplete ? 'completed' : 'max_failures');
    }
}

/** Collect friendly OSIDs adjacent to a target objective for attack detection. */
function collectAdjacentFriendlyOsids(state: GameState, corpsId: FormationId, targetOsid: string): Set<string> {
    const result = new Set<string>();
    if (!state.military.corps_front_sectors) return result;
    for (const sector of Object.values(state.military.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const ss of sector.sub_segments) {
            if (ss.enemy_osids.includes(targetOsid)) {
                for (const fo of ss.friendly_osids) result.add(fo);
            }
        }
    }
    return result;
}

/** Update results for legacy flat-field operations (no axes). */
function updateLegacyFlatResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const objectives = op.objectives ?? [];
    const currentIdx = op.current_objective_index ?? 0;
    if (currentIdx >= objectives.length) return;

    const currentObjective = objectives[currentIdx]!;
    let effectiveController = getPoliticalControllerOSID(state, currentObjective, reverseMap ?? undefined);

    // Null-controlled OSID: auto-claim — no enemy, no battle needed
    if (effectiveController == null) {
        if (!state.political.political_controllers) state.political.political_controllers = {};
        state.political.political_controllers[currentObjective] = faction;
        effectiveController = faction as ControlSide;
    }

    if (effectiveController === faction || isFriendlyFactionCtrl(effectiveController, faction, state)) {
        op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
        op.objective_capture_count = (op.objective_capture_count ?? 0) + 1;
        op.idle_execution_turn_streak = 0;
        op.movement_only_execution_turns = 0; // reset: objective captured
        op.last_result = 'captured';
        op.momentum = Math.min(MOMENTUM_CAP, (op.momentum ?? 0) + 1);
        op.current_objective_index = currentIdx + 1;
        op.consecutive_failures_on_current = 0;
        fullyRevealProbeSectorIntel(state, op);
    } else {
        const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
        const anyAttackedObjective = op.participating_brigades.some(bid => {
            const b = state.military.formations?.[bid];
            if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
            return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
        });
        const anyAttackedAnything = op.participating_brigades.some(bid => {
            const b = state.military.formations?.[bid];
            return b != null && (b.posture === 'attack' || b.posture === 'assault');
        });
        // Check brigade_movement_state (persists across turns) NOT brigade_movement_orders
        // (which is cleared by apply-brigade-movement BEFORE this step runs).
        const anyMoved = op.participating_brigades.some(bid => {
            const movState = state.military.brigade_movement_state?.[bid];
            return movState?.status === 'in_transit' || movState?.status === 'packing';
        });

        if (anyAttackedObjective) {
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            op.movement_only_execution_turns = 0; // reset: we ARE attacking
            op.last_result = 'failed';
            op.momentum = 0;
            op.failure_count = (op.failure_count ?? 0) + 1;
            op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            fullyRevealProbeSectorIntel(state, op);

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        } else if (anyAttackedAnything) {
            // Intermediate attack: fighting through toward objective
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            op.last_result = 'approach';
            op.momentum = 0;
            op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
        } else {
            if (anyMoved) {
                // Approach movement: brigade is marching toward objective.
                // Not a combat failure — don't increment failure counts.
                op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
                op.idle_execution_turn_streak = 0;
                op.last_result = 'approach';
                op.momentum = 0;
            } else {
                // Truly idle: no movement, no attack.
                op.idle_execution_turn_streak = (op.idle_execution_turn_streak ?? 0) + 1;
                op.last_result = 'stalemate';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            }

            // Idle stall: 4-turn threshold (matching multi-axis path) to give brigades
            // time to march from staging to objectives via regular movement (1 hop/turn).
            if (!anyMoved && (op.attack_attempt_count ?? 0) === 0 && (op.idle_execution_turn_streak ?? 0) >= 4) {
                op.movement_only_execution_turns = Math.max(1, op.movement_only_execution_turns ?? 0);
                beginRecovery(op, turn, 'no_logged_attempt');
                return;
            }

            // Movement-only stall: brigades are marching but not attacking objectives.
            // Happens when brigades can't reach objectives or fail probe thresholds.
            // Abort before wasting the entire command cycle.
            if ((op.movement_only_execution_turns ?? 0) >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                beginRecovery(op, turn, 'no_logged_attempt');
                return;
            }

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        }
    }

    if ((op.current_objective_index ?? 0) >= objectives.length) {
        beginRecovery(op, turn, 'completed');
    }
    if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
        beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Eligible attacker pre-screen
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check whether at least one brigade in the candidate list can adopt attack posture.
 * Hard gates only: active status, personnel >= 400, not disrupted.
 */
function hasEligibleAttackersForLaunch(
    formations: GameState['military']['formations'],
    brigadeIds: FormationId[],
): boolean {
    for (const id of brigadeIds) {
        const f = formations?.[id];
        if (!f) continue;
        if (f.status !== 'active') continue;
        if ((f.personnel ?? 0) < COMBAT_INEFFECTIVE_PERSONNEL) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Evaluate & launch sector offensives
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate whether a corps should launch a sector offensive from a given sector.
 * Called from bot_corps_ai.ts during directive generation.
 *
 * Requirements:
 * - Corps stance is offensive or balanced
 * - No active operation for this corps
 * - >= MIN_BRIGADES_FOR_OFFENSIVE brigades in sector
 * - Supply readiness is recorded on the operation but does not block launch
 * - >= 2 enemy OSIDs adjacent to sector
 *
 * Returns the operation to launch, or null.
 */
export function evaluateCorpsOffensiveLaunch(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    corpsBrigadeIds: FormationId[],
    corpsEnemyOsids: string[],
    offensiveTargets: string[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    minAttackOutcome?: CorpsOperation['min_attack_outcome'],
    primarySectorId?: string,
    osidAdjacency?: Map<string, readonly string[]>,
): CorpsOperation | null {
    const turn = state.meta?.turn ?? 0;
    const formations = state.military.formations ?? {};

    // Exclude brigades at critical supply from offensive operations.
    // Siege-isolated units lack ammunition, fuel, and rations to sustain attacks.
    // They can defend in place but cannot be committed to offensive operations.
    // Historical: Goražde/Srebrenica/Bihać enclave brigades were chronically supply-starved;
    // launching multi-week offensives from a besieged enclave is not historically plausible.
    if (supplyByOsid) {
        const fac = supplyByOsid.factions?.find(f => f.faction_id === faction);
        if (fac?.by_osid) {
            const osidState = new Map(fac.by_osid.map(e => [e.osid, e.state] as const));
            const reserveLevel = state.meta?.supply_reserves_enabled
                ? ((state.military.general_supply_reserve as Record<string, number> | undefined)?.[faction] ?? 100)
                : 100;
            corpsBrigadeIds = corpsBrigadeIds.filter(bid => {
                const b = formations[bid];
                if (!b) return true;
                const rawSt = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
                const st = state.meta?.supply_reserves_enabled
                    ? getEffectiveSupplyState(rawSt, reserveLevel)
                    : rawSt;
                return st !== 'critical';
            });
        }
    }

    // Must have enough brigades
    if (corpsBrigadeIds.length < MIN_BRIGADES_FOR_OFFENSIVE) return null;

    // Must have at least one brigade that can actually attack (active, not disrupted, personnel >= 400)
    if (!hasEligibleAttackersForLaunch(formations, corpsBrigadeIds)) return null;

    // Must have at least one enemy target adjacent to corps front
    if (corpsEnemyOsids.length < 1) return null;

    // Record supply readiness for diagnostics and downstream brigade-level attack gating.
    // Launch itself is allowed even under poor sector-wide supply so the force can stage and
    // reposition toward the next objective. Individual brigades still remain supply-gated when
    // bot_brigade_ai_osid decides whether an attack order is actually eligible.
    const supplyReadiness = computeSupplyReadiness(state, corpsBrigadeIds, faction, supplyByOsid);

    // Select objectives: offensive targets that are in this corps' enemy OSIDs,
    // filtered to a contiguous chain from the corps' friendly front.
    // Each objective must be OSID-adjacent (via war_front_edges_osid) to either
    // a friendly OSID or a previously accepted objective. Prevents operations
    // from targeting disconnected enemy OSIDs.
    const corpsTargetSet = new Set(corpsEnemyOsids);
    const candidateTargets = offensiveTargets.filter(t => corpsTargetSet.has(t));

    // Use caller's adjacency if provided; otherwise build from front edges.
    // Caller (bot_corps_directives) already builds adjacency once per turn.
    const osidAdj: Map<string, readonly string[]> = osidAdjacency ?? buildOsidAdjacencyFromFrontEdges(state);

    // Seed: ALL corps friendly front OSIDs (not just one sector).
    // Corps-level operations can target any enemy OSID adjacent to the corps' front,
    // regardless of which sector it belongs to.
    const allSectors = state.military.corps_front_sectors ?? {};
    const reachable = new Set<string>();
    for (const sec of Object.values(allSectors)) {
        if (sec.corps_id !== corpsId) continue;
        for (const ss of sec.sub_segments) {
            for (const fo of ss.friendly_osids) reachable.add(fo);
        }
    }

    // Greedy chain: accept objectives adjacent to the reachable set, expand.
    // Objective count scales with force size: 1 per 2 brigades, capped at 6.
    // A 3-brigade op gets 1-2 objectives; a 12-brigade corps offensive gets 6.
    const maxObjectives = Math.min(MAX_OBJECTIVES_CAP, Math.max(1, Math.floor(corpsBrigadeIds.length * OBJECTIVES_PER_BRIGADE)));
    const objectives: string[] = [];
    let changed = true;
    while (changed && objectives.length < maxObjectives) {
        changed = false;
        for (const t of candidateTargets) {
            if (objectives.length >= maxObjectives) break;
            if (reachable.has(t)) continue; // already accepted
            const neighbors = osidAdj.get(t);
            if (!neighbors) continue;
            let adjacent = false;
            for (const n of neighbors) {
                if (reachable.has(n)) { adjacent = true; break; }
            }
            if (adjacent) {
                objectives.push(t);
                reachable.add(t);
                changed = true;
            }
        }
    }

    // Need at least 1 objective for a sector offensive
    if (objectives.length < 1) return null;

    // Enclave brigade filter: enclave-tagged brigades cannot participate in operations
    // targeting OSIDs outside their enclave. Organically implements the "corridor-widening only"
    // constraint — besieged units can raid adjacent VRS positions or expand their perimeter,
    // but cannot march through a supply corridor to attack towns 20km away.
    // This prevents Goražde brigades marching through northern Foča to attack Foča objectives.
    corpsBrigadeIds = corpsBrigadeIds.filter(bid => {
        const b = formations[bid];
        if (!b?.tags?.includes('enclave')) return true; // Non-enclave brigades: always eligible
        const loc = b.location_osid;
        if (!loc) return true;
        // Enclave brigade: include only if at least one objective is in the same enclave.
        return objectives.some(obj => isOsidInSameEnclave(loc, obj));
    });
    if (corpsBrigadeIds.length < MIN_BRIGADES_FOR_OFFENSIVE) return null;

    const planningDuration = computePlanningDuration(objectives.length);
    const name = pickOperationName(corpsId, turn, faction, state);

    // Sort by equipment priority (mechanized/motorized first) before reserve slicing.
    // Best offensive assets become participants; weakest held back as reserves.
    const sortedByPriority = [...corpsBrigadeIds].sort((a, b) => {
        const fa = formations[a];
        const fb = formations[b];
        const pa = getEquipmentOffensivePriority(fa ? resolveEquipmentClass(fa) : undefined);
        const pb = getEquipmentOffensivePriority(fb ? resolveEquipmentClass(fb) : undefined);
        if (pa !== pb) return pb - pa; // Higher priority first
        return strictCompare(a, b); // Deterministic tiebreak
    });
    // Reserve: 15% of force, but no reserve for small ops (≤3 brigades — every unit needed)
    const reserveCount = sortedByPriority.length <= 3 ? 0 : Math.max(1, Math.floor(sortedByPriority.length * 0.15));
    const participating = sortedByPriority
        .slice(0, sortedByPriority.length - reserveCount)
        .slice(0, MAX_PARTICIPATING_BRIGADES);

    // Pick staging OSID: nearest corps friendly OSID to first objective.
    // Falls back to first friendly OSID in corps territory (deterministic, sorted).
    let stagingOsid: string | undefined;
    const firstObj = objectives[0];
    if (firstObj) {
        // Check OSID adjacency for nearest friendly to first objective
        const neighbors = osidAdj.get(firstObj);
        if (neighbors) {
            // Sort for determinism, pick first reachable neighbor
            const sortedNeighbors = [...neighbors].sort(strictCompare);
            for (const n of sortedNeighbors) {
                if (reachable.has(n)) { stagingOsid = n; break; }
            }
        }
    }
    if (!stagingOsid) {
        // Fallback: first friendly OSID in corps territory (deterministic)
        const sorted = [...reachable].sort(strictCompare);
        stagingOsid = sorted[0];
    }

    const sortedParticipating = participating.sort(strictCompare);

    return {
        name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: sortedParticipating,
        sector_id: primarySectorId,
        axes: [createSingleAxis(sortedParticipating, objectives, stagingOsid)],
        objectives,
        current_objective_index: 0,
        planning_duration: planningDuration,
        supply_readiness: supplyReadiness,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...(stagingOsid && { staging_osid: stagingOsid }),
        ...(minAttackOutcome && { min_attack_outcome: minAttackOutcome }),
    };
}

/** @deprecated Use evaluateCorpsOffensiveLaunch — this alias maps the old sector-scoped signature. */
export function evaluateSectorOffensiveLaunch(
    state: GameState,
    corpsId: FormationId,
    sectorId: string,
    faction: FactionId,
    sectorBrigadeIds: FormationId[],
    sectorEnemyOsids: string[],
    offensiveTargets: string[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    minAttackOutcome?: CorpsOperation['min_attack_outcome']
): CorpsOperation | null {
    return evaluateCorpsOffensiveLaunch(
        state, corpsId, faction, sectorBrigadeIds, sectorEnemyOsids,
        offensiveTargets, supplyByOsid, minAttackOutcome, sectorId
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Momentum bonuses (used by brigade AI)
// ═══════════════════════════════════════════════════════════════════════════

/** Get momentum-based aggression bonus for a sector offensive. */
export function getMomentumAggressionBonus(momentum: number): number {
    if (momentum >= 3) return 0.15;
    if (momentum >= 2) return 0.10;
    if (momentum >= 1) return 0.05;
    return 0;
}

/** Get momentum-based minimum outcome relaxation. Returns the relaxed min_outcome. */
export function getMomentumMinOutcome(momentum: number, base: string): string {
    const rank: Record<string, number> = {
        decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1
    };
    const baseRank = rank[base] ?? 2;
    if (momentum >= 3 && baseRank > 2) return 'stalemate';
    if (momentum >= 2 && baseRank > 3) return 'costly_victory';
    if (momentum >= 1 && baseRank > 4) return 'victory';
    return base;
}
