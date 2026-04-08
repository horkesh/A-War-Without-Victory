/**
 * CANONICAL LIFECYCLE OWNER — Corps Operations
 *
 * This file is the single authoritative owner of the corps operation lifecycle:
 * planning → preparation → execution → recovery.
 *
 * All operation creation, advancement, and recovery flows through here.
 * bot_corps_operations.ts is the legacy/transitional path and is non-authoritative.
 * operation_preparation.ts owns the preparation sub-phase.
 * operation_prediction.ts owns predictive/advisory computation.
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
 * **Sector-anchored launch contract (Phase 3 implemented):**
 * Every commander-generated operation declares a primary sector (`sector_id`). The default
 * eligible brigade pool derives from that sector's assigned brigades. Cross-sector brigades
 * join only as explicit bounded attachments (`attached_brigades`, `reinforcement_source`,
 * `supporting_sector_ids`). See `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`.
 * All current live operation creation paths are expected to provide a primary
 * `sector_id` anchor. Legacy flat-field save compatibility remains supported
 * during lifecycle advancement, but new operation birth without a sector anchor
 * should be treated as a contract violation.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 *
 * MOVEMENT TIER: T4 — Combat Consequence (Operation March)
 * Writes brigade_movement_orders during operation preparation/execution.
 * Must not override commander's operation plan — only marches participants to objectives.
 * (see MOVEMENT_AUTHORITY.md)
 */

import type {
    CorpsCommandState,
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OperationAxis,
    SettlementId,
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
import { isEastHerzegovinaPair, isGrazAccordsActive, shouldGrazBlockAttack } from '../local_truces.js';
import { isFriendlyFaction as isFriendlyFactionCtrl } from '../early_war/alliance_update.js';
import { isEnclaveBrigade, isOsidInSameEnclave } from './enclave_resilience.js';
import { tickPreparation, hasUnresolvedProbe, autoResolveProbe } from './operation_preparation.js';
import {
    BRIGADE_LOSS_THRESHOLD,
    COHESION_HEALTHY_THRESHOLD,
    EXECUTION_MAX_DURATION,
    PLANNING_DURATION,
    PROGRESS_FAILURE_THRESHOLD,
    PROGRESS_SUCCESS_THRESHOLD,
    RECOVERY_DURATION,
    PERSONNEL_HEALTHY_THRESHOLD,
} from './bot_constants.js';
import { getActiveDoctrinePhase } from './bot_strategy.js';
import { getFactionCorps, getCorpsSubordinates, sortByPersonnelDesc } from './bot_corps_helpers.js';
import {
    ENTRENCHMENT_PER_TURN,
    MAX_ENTRENCHMENT,
    basePower,
    VICTORY_THRESHOLD_COSTLY,
    getDefensiveFireMult,
    getForestMult,
    getUrbanMult,
} from './combat_math.js';
import { findSectorForEnemyOsid } from './corps_front_sectors.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import type { PreparationEvent } from '../turn_pipeline_types.js';
import { checkLoanedArrivals, areLoanedBrigadesReady, cleanupDissolvedLoans } from './operation_reinforcement.js';
import { MAX_OP_LOAN_DISTANCE, LOAN_STAGING_BUFFER_TURNS } from './operation_reinforcement_constants.js';
import { hasActiveOperation, removeOperation } from './corps_operation_helpers.js';
import { MIN_ATTACK_PERSONNEL, MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';

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
// Single-brigade "operations" are not operations — they hammer one objective,
// fail 3 consecutive idle turns, and "complete" with 0 captures.
// 2 brigades = minimum for realistic combined-arms commitment.
const MIN_BRIGADES_FOR_OFFENSIVE = 2;

/** Maximum objectives per offensive (absolute cap). */
const MAX_OBJECTIVES_CAP = 6;
/** Objectives per brigade ratio — scales op scope with force size. */
const OBJECTIVES_PER_BRIGADE = 0.5; // 1 objective per 2 brigades

// Personnel floor below which a brigade cannot attack — use MIN_ATTACK_PERSONNEL (500) from
// formation_constants (canonical single source, shared with bot_brigade_eval_attack).
// NOTE: the local constant was previously 400 — unified to 500 to match MIN_ATTACK_PERSONNEL.

/**
 * Attack posture discount for feasibility estimation.
 * Conservative: uses attack (0.8×), not assault (0.6×).
 * This intentionally overestimates attacker power relative to the real predictor
 * (which includes fog-of-war, terrain, supply, etc.) so we only reject truly hopeless ops.
 */
const FEASIBILITY_ATTACK_POSTURE_MULT = 0.8;

/**
 * Feasibility check: can the attacker pool achieve at least costly_victory against
 * ANY proposed objective? Uses basePower (personnel × equipment × experience × cohesion)
 * with a conservative attack posture discount vs the full defender sector.
 *
 * This is intentionally optimistic — it only rejects operations where even the most
 * generous estimate shows no objective is achievable. The real predictor with terrain,
 * fog-of-war, entrenchment, and supply will further filter at brigade execution time.
 *
 * Returns true if at least one objective appears feasible.
 */
function checkLaunchFeasibility(
    state: GameState,
    attackerBrigadeIds: FormationId[],
    objectives: string[],
    faction: FactionId,
    corpsId: FormationId,
): boolean {
    const formations = state.military.formations ?? {};

    // Compute total attacker base power (all corps brigades that can attack)
    let totalAttackerPower = 0;
    for (const bid of attackerBrigadeIds) {
        const f = formations[bid];
        if (!f || f.status !== 'active') continue;
        if ((f.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        totalAttackerPower += basePower(f) * FEASIBILITY_ATTACK_POSTURE_MULT;
    }

    if (totalAttackerPower <= 0) return false;

    // Check each objective: estimate defender power from the defending sector
    for (const obj of objectives) {
        // Find the sector defending this objective
        const pc = state.political?.political_controllers ?? {};
        const defenderFaction = pc[obj];
        if (!defenderFaction || defenderFaction === faction) continue;

        const sector = findSectorForEnemyOsid(state, obj, defenderFaction);
        if (!sector) {
            // No defending sector means militia-only defense — always feasible
            return true;
        }

        // Sum defender sector base power (all brigades in the sector)
        let sectorDefenderPower = 0;
        const defenders: FormationState[] = [];
        for (const defBid of sector.assigned_brigade_ids) {
            const df = formations[defBid];
            if (!df || df.status !== 'active') continue;
            sectorDefenderPower += basePower(df);
            defenders.push(df);
        }

        if (sectorDefenderPower <= 0) return true; // Undefended sector

        const defensiveFireMult = getDefensiveFireMult(defenders, defenderFaction, state);
        const entrenchmentMult = defenders.reduce((best, defender) => {
            const entrenchmentTurns = Math.min(
                MAX_ENTRENCHMENT,
                (defender as { entrenchment_turns?: number }).entrenchment_turns ?? 0,
            );
            const mult = 1.0 + Math.sqrt(entrenchmentTurns) * ENTRENCHMENT_PER_TURN * 2;
            return Math.max(best, mult);
        }, 1.0);
        const terrainMult = Math.max(getUrbanMult(obj), getForestMult(obj));
        const adjustedDefenderPower = sectorDefenderPower * defensiveFireMult * entrenchmentMult * terrainMult;

        // Power ratio: attacker pool vs entire defending sector.
        // This is generous to the attacker because in reality only a fraction
        // of the sector's brigades would react to any single OSID attack.
        const ratio = totalAttackerPower / adjustedDefenderPower;
        if (ratio >= VICTORY_THRESHOLD_COSTLY) return true;
    }

    // No objective appears achievable
    return false;
}

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

/**
 * FIX 3: Check if a staging OSID is reachable from the corps' main territory
 * without passing through a single-OSID chokepoint (corridor width = 1).
 *
 * Algorithm: find a shortest path from `staging` to any OSID in `mainBody`
 * through `friendlySet`. For each intermediate OSID on that path, temporarily
 * block it and re-BFS. If the staging becomes unreachable, that OSID is a
 * chokepoint — reject this staging OSID.
 *
 * Returns true if the corridor is safe (no single chokepoint), false if risky.
 */
function isStagingCorridorSafe(
    staging: string,
    mainBody: Set<string>,
    friendlySet: Set<string>,
    adj: Map<string, readonly string[]>,
): boolean {
    if (mainBody.has(staging)) return true; // staging IS in main body

    // BFS to find shortest path from staging to mainBody
    const parent = new Map<string, string | null>();
    parent.set(staging, null);
    const queue: string[] = [staging];
    let head = 0;
    let target: string | null = null;
    while (head < queue.length) {
        const curr = queue[head++]!;
        if (mainBody.has(curr) && curr !== staging) {
            target = curr;
            break;
        }
        for (const nb of adj.get(curr) ?? []) {
            if (parent.has(nb)) continue;
            if (!friendlySet.has(nb)) continue;
            parent.set(nb, curr);
            queue.push(nb);
        }
    }
    if (!target) return false; // unreachable — definitely not safe

    // Reconstruct path (excluding endpoints)
    const path: string[] = [];
    let node: string | null = target;
    while (node !== null) {
        path.push(node);
        node = parent.get(node) ?? null;
    }
    path.reverse(); // staging → ... → target
    // Intermediate nodes: exclude staging (index 0) and target (last)
    const intermediates = path.slice(1, path.length - 1);
    if (intermediates.length === 0) return true; // directly adjacent, no chokepoint possible

    // For each intermediate, check if blocking it disconnects staging from mainBody
    for (const blocked of intermediates) {
        const visited = new Set<string>([staging, blocked]);
        const q: string[] = [staging];
        let h = 0;
        let found = false;
        while (h < q.length) {
            const c = q[h++]!;
            if (mainBody.has(c) && c !== staging) { found = true; break; }
            for (const nb of adj.get(c) ?? []) {
                if (visited.has(nb)) continue;
                if (!friendlySet.has(nb)) continue;
                visited.add(nb);
                q.push(nb);
            }
        }
        if (!found) return false; // blocking this node disconnects — chokepoint
    }
    return true;
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
const MAX_TOTAL_FAILURES = 8;

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
    const lineAssigned = new Set<string>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        for (const bid of sector.assigned_brigade_ids ?? []) lineAssigned.add(bid);
    }

    for (const bid of allBrigades) {
        const f = formations[bid];
        if (!f || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;
        // Line-assigned brigades should return to their assigned sector fronts via
        // brigade AI, not be force-pulled to home municipality after each operation.
        if (lineAssigned.has(bid)) continue;

        const loc = f.location_osid;
        const homeOsid = f.home_osid;
        if (!loc || !homeOsid) continue;
        // Check whether the brigade is actually IN one of its corps' sector territories.
        // Previously this checked whether the corps has ANY front at all, which blocked
        // return marches for brigades stranded in disconnected pockets far from the main front.
        const isInCorpsSectorTerritory = Object.values(state.military.corps_front_sectors ?? {})
            .some((s) => s.corps_id === f.corps_id
                && (s.sub_segments?.length ?? 0) > 0
                && s.territory_osids?.includes(loc) === true);
        if (isInCorpsSectorTerritory) continue;

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
            state.military.brigade_movement_orders = {};
        }
        state.military.brigade_movement_orders![bid] = {
            destination_sids: [homeOsid as SettlementId],
            stance: 'column',
        } as { destination_sids: SettlementId[] };
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
    formations?: Record<string, FormationState>,
): OperationAxis {
    const sorted = brigades.sort(strictCompare);
    const { main, support } = assignBrigadeRoles(sorted, formations);
    return {
        axis_id: 'main',
        name: 'Main Advance',
        assigned_brigades: sorted,
        ...(main && { main_brigade: main }),
        ...(support.length > 0 && { support_brigades: support }),
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

/**
 * Assign main/support roles to brigades on an axis.
 * Main brigade = highest basePower (deterministic tiebreak by ID).
 * All others = support.
 */
export function assignBrigadeRoles(
    brigadeIds: FormationId[],
    formations?: Record<string, FormationState>,
): { main: FormationId | undefined; support: FormationId[] } {
    if (!formations || brigadeIds.length === 0) {
        return { main: undefined, support: [] };
    }
    if (brigadeIds.length === 1) {
        return { main: brigadeIds[0], support: [] };
    }
    const ranked = [...brigadeIds].sort((a, b) => {
        const fa = formations[a];
        const fb = formations[b];
        const pa = fa ? basePower(fa) : 0;
        const pb = fb ? basePower(fb) : 0;
        if (pb !== pa) return pb - pa;
        return strictCompare(a, b);
    });
    return {
        main: ranked[0],
        support: ranked.slice(1).sort(strictCompare),
    };
}

/**
 * Check whether a brigade is a SUPPORT brigade on its corps' active operation.
 * Main brigades and non-participants return false.
 */
export function isSupportBrigadeOnActiveOp(
    state: GameState,
    brigadeId: FormationId,
    corpsId: FormationId | null | undefined,
): boolean {
    if (!corpsId) return false;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    for (const op of cmd.active_operations) {
        if (op.phase !== 'execution') continue;
        if (!op.axes) continue;
        for (const axis of op.axes) {
            if (axis.support_brigades?.includes(brigadeId)) return true;
        }
    }
    return false;
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

/** Minimum extra turns added to planning for bot-generated ops (brigade march buffer). */
export const PLANNING_MARCH_BUFFER = 2;

/** Compute planning duration from number of objectives.
 *  Adds PLANNING_MARCH_BUFFER turns so brigades can march to staging before execution.
 *  Capped at MAX_PLANNING_DURATION to prevent long idle periods for large operations. */
export const MAX_PLANNING_DURATION = 4;
export function computePlanningDuration(objectiveCount: number): number {
    let base: number;
    if (objectiveCount <= 2) base = 1;
    else if (objectiveCount <= 5) base = Math.ceil(objectiveCount * 0.6);
    else base = Math.min(5, Math.ceil(objectiveCount * 0.8));
    return Math.min(MAX_PLANNING_DURATION, base + PLANNING_MARCH_BUFFER);
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
    if (op.recovery_reason === 'political_blocked') return; // Truce/political block is not a failed assault

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

function beginRecovery(op: CorpsOperation, turn: number, reason: CorpsOperation['recovery_reason'], state?: GameState): void {
    op.phase = 'recovery';
    op.phase_started_turn = turn;
    op.recovery_reason = reason;
    op.force_launch = false;
    // Clean up OPSEC marking when operation leaves active phase
    if (op.sector_id && state && Array.isArray(state.military.opsec_sectors)) {
        state.military.opsec_sectors = state.military.opsec_sectors.filter(s => s !== op.sector_id);
    }
}

function getRecoveryDuration(op: CorpsOperation): number {
    const objectiveCount = op.objectives?.length ?? 2;
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
        case 'probe_complete':
        case 'brigade_attrition':
        case 'political_blocked':
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

function getTotalObjectiveCount(op: CorpsOperation): number {
    if (isMultiAxis(op)) {
        return op.axes!.reduce((count, axis) => count + axis.objectives.length, 0);
    }
    return op.objectives?.length ?? 0;
}

function hasCapturedAllObjectives(op: CorpsOperation): boolean {
    const totalObjectives = getTotalObjectiveCount(op);
    if (totalObjectives <= 0) return false;
    return (op.objective_capture_count ?? 0) >= totalObjectives;
}

function getCompletedObjectiveRecoveryReason(op: CorpsOperation): CorpsOperation['recovery_reason'] {
    if (op.type === 'probe') {
        if (hasCapturedAllObjectives(op)) return 'completed';
        return getNoAttemptRecoveryReason(op) === 'no_logged_attempt' ? 'no_logged_attempt' : 'probe_complete';
    }
    if (hasCapturedAllObjectives(op)) return 'completed';
    return getNoAttemptRecoveryReason(op);
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
        case 'political_blocked':
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

/** Compute supply readiness as the mean graded readiness of participating brigades. */
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

    let score = 0;
    for (const bid of participatingBrigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        const rawSt = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        const st = state.meta?.supply_reserves_enabled
            ? getEffectiveSupplyState(rawSt, reserveLevel)
            : rawSt;
        // Graduated scoring: aligns planner with resolver's getSupplyMult treatment.
        // adequate=1.0 (full capability), strained=0.5 (degraded but functional), critical=0.0 (non-functional).
        score += st === 'adequate' ? 1.0 : st === 'strained' ? 0.5 : 0.0;
    }
    return participatingBrigades.length > 0 ? score / participatingBrigades.length : 1.0;
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
        const decayRate = cmd.active_operations.length > 0 ? EXHAUSTION_DECAY_ACTIVE : EXHAUSTION_DECAY_IDLE;
        cmd.corps_exhaustion = Math.max(0, Math.round((cmd.corps_exhaustion - decayRate) * 10) / 10);
    }

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const op of [...cmd.active_operations]) {
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
                    beginRecovery(op, turn, anyAttempts ? 'orphaned_sector' : 'no_logged_attempt', state);
                    continue;
                }
            }
        }

        // Recompute supply readiness
        op.supply_readiness = computeSupplyReadiness(state, allBrigades, faction, supplyByOsid);

        // Tick down player-ordered halt delay (set by interpretOperationHalt via IPC).
        // Phase 3 will own the full decay pipeline; this gate must exist now.
        if (op.halt_delay_turns_remaining != null && op.halt_delay_turns_remaining > 0) {
            op.halt_delay_turns_remaining--;
            if (op.halt_delay_turns_remaining === 0) {
                op.recovery_reason = 'manual_termination';
            }
            // Do not advance attack this turn while delay is counting down
            continue;
        }

        if (op.recovery_reason === 'manual_termination' && op.phase !== 'recovery') {
            if (op.dig_in_on_halt) {
                applyDigInOnHalt(state, allBrigades);
            }
            beginRecovery(op, turn, 'manual_termination', state);
            continue;
        }

        if (op.phase === 'planning') {
            // Ensure OPSEC marking during planning — enables passive intel
            // buildup reduction (sector_intel.ts) and cohesion penalty (cohesion_drift.ts)
            if (op.sector_id) {
                if (!Array.isArray(state.military.opsec_sectors)) {
                    state.military.opsec_sectors = [];
                }
                if (!state.military.opsec_sectors.includes(op.sector_id)) {
                    state.military.opsec_sectors.push(op.sector_id);
                }
            }

            if (op.type === 'probe') {
                op.planning_duration = 1;
                op.participating_brigades = [...(op.participating_brigades ?? [])].sort(strictCompare).slice(0, 2);
            }

            // ── Preparation sub-phase state machine (sector_attack only) ──
            // Probes and feints skip preparation — they are too small/fast.
            // force_launch bypasses preparation entirely (player override).
            // RS blitz phase (w0-12): pre-planned JNA-style ops skip preparation.
            const activePhase = getActiveDoctrinePhase(faction, turn, state.military.war_timeline);
            const isPrePlannedBlitz = activePhase?.probe_exempt === true;
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
                    beginRecovery(op, turn, 'manual_termination', state);
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
                beginRecovery(op, turn, 'manual_termination', state);
                continue;
            }

            // For sector_attack with preparation: only reach here when preparation is 'ready'
            // (or force_launch / probe / feint which skip preparation).
            // Keep existing elapsed/staged/forcedLaunch gates for non-preparation ops.
            //
            const preparationReady = op.type === 'sector_attack' && op.preparation_sub_phase === 'ready';
            if (preparationReady || elapsed > planDuration || stagedEarly || forcedLaunch) {
                if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
                    beginRecovery(op, turn, 'political_blocked', state);
                    continue;
                }
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
            if (hasOnlyPoliticallyBlockedCurrentObjectives(state, corpsId, faction, op)) {
                beginRecovery(op, turn, 'political_blocked', state);
                continue;
            }
            if (op.tempo === 'all_out') {
                applyCohesionDelta(state, allBrigades, -ALL_OUT_EXTRA_COHESION_COST);
            }

            if (multiAxis) {
                // Multi-axis: check if all axes are terminal
                if (allAxesTerminal(op.axes!)) {
                    beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
                    continue;
                }
            } else {
                // Legacy flat: check completion and failures
                const objectives = op.objectives ?? [];
                if ((op.current_objective_index ?? 0) >= objectives.length) {
                    beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
                    continue;
                }
                if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
                    continue;
                }
            }

            // Execution-phase backstop: abort any op that has been executing for
            // MAX_EXECUTION_TURNS_ZERO_ATTACKS turns without a single logged attack.
            // Prevents dead ops from consuming corps op slots for 13-15 turns due to
            // the anyMoved/idle oscillation that prevents normal abort thresholds
            // (idle_execution_turn_streak, movement_only_execution_turns) from
            // accumulating fast enough. Canon-approved: equivalent to corps commander
            // discretion to abort when operational window has closed (Systems Manual §7.6).
            const MAX_EXECUTION_TURNS_ZERO_ATTACKS = 5;
            if ((op.attack_attempt_count ?? 0) === 0) {
                const executionTurnsElapsed = turn - (op.phase_started_turn ?? turn);
                if (executionTurnsElapsed >= MAX_EXECUTION_TURNS_ZERO_ATTACKS) {
                    beginRecovery(op, turn, 'no_logged_attempt', state);
                    continue;
                }
            }

            if (op.type === 'probe' && !multiAxis && (op.attack_attempt_count ?? 0) > 0) {
                beginRecovery(op, turn, op.last_result === 'captured' ? 'completed' : 'probe_complete', state);
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
                if (op.type === 'sector_attack' || op.type === 'probe') {
                    recordFailedObjectives(cmd, op, turn);
                }
                if (op.type === 'sector_attack') {
                    finalizeOperationAAR(state, corpsId, op);
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

                // Activate east Herzegovina truce only when Op Jackal (pre-planned HRHB op) completes.
                // Historical: VRS-HRHB ceasefire in east Herzegovina held after June 1992 HVO offensive.
                // Op Jackal is an exception from Graz accords — it proceeds regardless of Graz status.
                // Probes and bot-generated ops must NOT trigger the truce prematurely.
                if (isGrazAccordsActive(state)
                    && isEastHerzegovinaPair(corpsId)
                    && faction === 'HRHB'
                    && op.is_pre_planned === true
                    && state.political.graz_east_herzegovina_active_turn == null) {
                    state.political.graz_east_herzegovina_active_turn = turn;
                }

                // Release brigades: issue return-march orders for participants away from home.
                // Without this, brigades stay at their operation endpoint and get classified
                // into whatever sector owns that OSID — potentially far from home.
                issuePostOperationReturnMarches(state, op);

                // Only reset probe counter when a FULL operation completes.
                // Probe completions must preserve the counter so it can reach
                // MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT and force a real commitment.
                // Bug: resetting on probe completion created an infinite probe loop —
                // counter went 0→1→complete→0→1→complete→... never reaching 2.
                if (op.type !== 'probe') {
                    cmd.consecutive_probes = 0;
                }
                // Save completed op for theater-aware follow-on suppression.
                // Probes are reconnaissance — they should NOT trigger the cooldown
                // that blocks follow-up operations. The whole point of a probe is to
                // gather intel for an immediate follow-up operation.
                if (op.type !== 'probe') {
                    cmd.last_completed_operation = op;
                    cmd.last_completed_operation_turn = turn;
                }
                removeOperation(cmd, op);
            }
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
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const op of cmd.active_operations) {
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
            (state.political.control_events ??= []).push({
                turn: state.meta?.turn ?? 0,
                settlement_id: currentObj,
                mechanism: 'combat' as const,
                from: null,
                to: faction,
                mun_id: currentObj.split(':')[1],
            });
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
                // Only reset movement_only counter when no brigades are also marching.
                // If some axis brigades are in transit while others attack, the marching
                // signal must persist — stranded brigades cycling attack/march never reset.
                if (!anyMoved) axis.movement_only_execution_turns = 0;
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
                const idleStallThreshold = op.type === 'probe' ? 1 : 4;
                if (!anyMoved && axis.attack_attempt_count === 0 && axis.idle_execution_turn_streak >= idleStallThreshold) {
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

    // Zero-progress early abort — now PER-AXIS for true parallel execution.
    // Each axis stalls from its own zero-progress failures, not contaminated
    // by other axes. A stalled Foča Valley axis won't kill a progressing Kalinovik axis.
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const axisFailures = axis.failure_count ?? 0;
        const axisCaptures = axis.objective_capture_count ?? 0;
        const axisAttempts = axis.attack_attempt_count ?? 0;
        if (
            axisFailures >= MAX_OPERATION_ZERO_PROGRESS_FAILURES
            && axisCaptures === 0
            && axisAttempts >= 1
        ) {
            axis.status = 'stalled';
        }
    }

    // Check if all axes terminal → operation enters recovery
    if (allAxesTerminal(axes)) {
        beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
    }
}

function hasOnlyPoliticallyBlockedCurrentObjectives(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    op: CorpsOperation,
): boolean {
    const politicalControllers = state.political.political_controllers ?? {};
    if (isMultiAxis(op) && op.axes) {
        const activeAxes = op.axes.filter((axis) => axis.status === 'executing');
        if (activeAxes.length === 0) return false;
        return activeAxes.every((axis) => {
            const objective = axis.objectives[axis.current_objective_index ?? 0];
            if (!objective) return false;
            const controller = politicalControllers[objective] ?? '';
            return shouldGrazBlockAttack(state, corpsId, faction, objective, controller);
        });
    }
    const objective = op.objectives?.[op.current_objective_index ?? 0];
    if (!objective) return false;
    const controller = politicalControllers[objective] ?? '';
    return shouldGrazBlockAttack(state, corpsId, faction, objective, controller);
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
    if (currentIdx >= objectives.length) {
        beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
        return;
    }

    const currentObjective = objectives[currentIdx]!;
    let effectiveController = getPoliticalControllerOSID(state, currentObjective, reverseMap ?? undefined);

    // Null-controlled OSID: auto-claim — no enemy, no battle needed
    if (effectiveController == null) {
        if (!state.political.political_controllers) state.political.political_controllers = {};
        state.political.political_controllers[currentObjective] = faction;
        (state.political.control_events ??= []).push({
            turn: state.meta?.turn ?? 0,
            settlement_id: currentObjective,
            mechanism: 'combat' as const,
            from: null,
            to: faction,
            mun_id: currentObjective.split(':')[1],
        });
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
            // Only reset movement_only counter when no brigades are also marching.
            // If some op brigades are in transit while others attack, the marching
            // signal must persist — stranded brigades cycling attack/march never reset.
            if (!anyMoved) op.movement_only_execution_turns = 0;
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
            const idleStallThreshold = op.type === 'probe' ? 1 : 4;
            if (!anyMoved && (op.attack_attempt_count ?? 0) === 0 && (op.idle_execution_turn_streak ?? 0) >= idleStallThreshold) {
                op.movement_only_execution_turns = Math.max(1, op.movement_only_execution_turns ?? 0);
                beginRecovery(op, turn, 'no_logged_attempt', state);
                return;
            }

            // Movement-only stall: brigades are marching but not attacking objectives.
            // Happens when brigades can't reach objectives or fail probe thresholds.
            // Abort before wasting the entire command cycle.
            if ((op.movement_only_execution_turns ?? 0) >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                beginRecovery(op, turn, 'no_logged_attempt', state);
                return;
            }

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        }
    }

    if ((op.current_objective_index ?? 0) >= objectives.length) {
        beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
    }
    if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
        beginRecovery(op, turn, getNoAttemptRecoveryReason(op), state);
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
        if ((f.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
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

    // ── Feasibility gate ─────────────────────────────────────────────────
    // Reject operations where the attacker pool cannot achieve even costly_victory
    // against ANY proposed objective. Prevents zombie ops that permanently block
    // the corps slot because brigades refuse to execute hopeless attacks.
    if (!checkLaunchFeasibility(state, corpsBrigadeIds, objectives, faction, corpsId)) {
        const corpsName = formations[corpsId]?.name ?? corpsId;
        console.warn(`[feasibility] ${corpsName}: rejected op — no objective achievable at costly_victory (${objectives.length} objectives, ${corpsBrigadeIds.length} brigades)`);
        return null;
    }

    // Enclave brigade filter: enclave-tagged brigades cannot participate in operations
    // targeting OSIDs outside their enclave. Organically implements the "corridor-widening only"
    // constraint — besieged units can raid adjacent VRS positions or expand their perimeter,
    // but cannot march through a supply corridor to attack towns 20km away.
    // This prevents Goražde brigades marching through northern Foča to attack Foča objectives.
    corpsBrigadeIds = corpsBrigadeIds.filter(bid => {
        const b = formations[bid];
        if (!b || !isEnclaveBrigade(b)) return true; // Non-enclave brigades: always eligible
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
    if (participating.length < MIN_BRIGADES_FOR_OFFENSIVE) return null;
    if (!hasEligibleAttackersForLaunch(formations, participating)) return null;
    if (!checkLaunchFeasibility(state, participating, objectives, faction, corpsId)) {
        const corpsName = formations[corpsId]?.name ?? corpsId;
        console.warn(`[feasibility] ${corpsName}: rejected op after participant trim - no objective achievable at costly_victory (${objectives.length} objectives, ${participating.length} participating brigades)`);
        return null;
    }

    // Pick staging OSID: nearest corps friendly OSID to first objective.
    // Falls back to first friendly OSID in corps territory (deterministic, sorted).
    // FIX 3: Reject staging OSIDs behind a single-OSID chokepoint (corridor width = 1).
    //
    // Build friendly set and main body for corridor width check.
    // Main body = OSIDs where participating brigades are located (the force's center of mass).
    // Friendly set = all territory OSIDs from the corps' sectors.
    const corpsMainBody = new Set<string>();
    for (const bid of participating) {
        const b = formations[bid];
        if (b?.location_osid) corpsMainBody.add(b.location_osid);
    }
    const corpsFriendlySet = new Set<string>(reachable);
    for (const sec of Object.values(allSectors)) {
        if (sec.corps_id !== corpsId) continue;
        for (const osid of sec.territory_osids) corpsFriendlySet.add(osid);
    }

    let stagingOsid: string | undefined;
    const firstObj = objectives[0];
    if (firstObj) {
        // Check OSID adjacency for nearest friendly to first objective
        const neighbors = osidAdj.get(firstObj);
        if (neighbors) {
            // Sort for determinism, pick first reachable neighbor
            const sortedNeighbors = [...neighbors].sort(strictCompare);
            for (const n of sortedNeighbors) {
                if (!reachable.has(n)) continue;
                // FIX 3: corridor width check — reject if single chokepoint
                if (!isStagingCorridorSafe(n, corpsMainBody, corpsFriendlySet, osidAdj)) continue;
                stagingOsid = n;
                break;
            }
        }
    }
    if (!stagingOsid) {
        // Fallback: first friendly OSID in corps territory (deterministic)
        const sorted = [...reachable].sort(strictCompare);
        for (const candidate of sorted) {
            if (isStagingCorridorSafe(candidate, corpsMainBody, corpsFriendlySet, osidAdj)) {
                stagingOsid = candidate;
                break;
            }
        }
        // Ultimate fallback: if all candidates have chokepoints, use first anyway
        // (better to stage somewhere than to cancel the entire operation)
        if (!stagingOsid) stagingOsid = sorted[0];
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
        axes: [createSingleAxis(sortedParticipating, objectives, stagingOsid, formations)],
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

// ═══════════════════════════════════════════════════════════════════════════
// Operation reevaluation — detect and abort weakened operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Minimum active brigades required to sustain an operation by type.
 * Below this threshold the operation is aborted as infeasible.
 * probe/feint need only 1; sector_attack needs 2 for combined-arms.
 */
const MIN_BRIGADES_BY_TYPE: Record<string, number> = {
    probe: 1,
    feint: 1,
    sector_attack: 2,
    general_offensive: 2,
    strategic_defense: 1,
    reorganization: 0,
};

/**
 * Fraction of initial_strength below which the operation is aborted.
 * 50% = if the force has lost half its starting personnel, the op is no
 * longer viable regardless of how many brigades remain nominally assigned.
 */
const POWER_ATTRITION_ABORT_THRESHOLD = 0.50;

/** Reevaluation log entry (diagnostic — attached to operation for traceability). */
export interface ReevaluationLogEntry {
    turn: number;
    reason: string;
    decision: 'continue' | 'abort';
    active_brigades: number;
    total_personnel: number;
}

/**
 * Reevaluate all active operations for viability after brigade mutations.
 *
 * Called after brigade dissolution, lifecycle events, and combat resolution
 * but BEFORE bot order generation. Detects operations that have lost too
 * many brigades (through dissolution, emergency retreat, or combat death)
 * and cannot feasibly continue. Such operations are aborted into recovery
 * to free the corps slot.
 *
 * Decision tree per operation:
 *   1. Count active participating brigades (alive + active status).
 *   2. If 0 active brigades → abort (empty operation, slot blocked).
 *   3. If below type minimum → abort (cannot achieve objectives).
 *   4. If remaining personnel < 50% of initial_strength → abort (spent force).
 *   5. For multi-axis: stall any axis with 0 active brigades.
 *   6. Otherwise → continue (operation still viable).
 *
 * Deterministic: sorted corps iteration via strictCompare.
 */
export function reevaluateWeakenedOperations(state: GameState): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd || cmd.active_operations.length === 0) continue;

        for (const op of [...cmd.active_operations]) {

        // Only reevaluate operations in planning or execution phase.
        // Recovery-phase operations are already winding down.
        if (op.phase === 'recovery') continue;

        // Count active participating brigades and total personnel
        const multiAxis = isMultiAxis(op);
        const allBrigadeIds = multiAxis ? getAllAxisBrigades(op) : op.participating_brigades;
        let activeBrigadeCount = 0;
        let totalPersonnel = 0;
        for (const bid of allBrigadeIds) {
            const f = formations[bid];
            if (!f || f.status !== 'active') continue;
            activeBrigadeCount++;
            totalPersonnel += f.personnel ?? 0;
        }

        // --- Decision: should this operation be aborted? ---
        const minRequired = MIN_BRIGADES_BY_TYPE[op.type] ?? 2;
        let abortReason: string | null = null;

        if (activeBrigadeCount === 0) {
            abortReason = 'zero_active_brigades';
        } else if (activeBrigadeCount < minRequired) {
            abortReason = `below_minimum_brigades (${activeBrigadeCount}/${minRequired})`;
        } else if (op.initial_strength && op.initial_strength > 0
            && totalPersonnel < op.initial_strength * POWER_ATTRITION_ABORT_THRESHOLD) {
            abortReason = `power_attrition (${totalPersonnel}/${op.initial_strength}, threshold ${POWER_ATTRITION_ABORT_THRESHOLD})`;
        }

        // For multi-axis operations: stall any axis with 0 active brigades,
        // even if the operation as a whole continues.
        if (multiAxis && op.axes && !abortReason) {
            for (const axis of op.axes) {
                if (axis.status !== 'executing') continue;
                let axisActive = 0;
                for (const bid of axis.assigned_brigades) {
                    const f = formations[bid];
                    if (f && f.status === 'active') axisActive++;
                }
                if (axisActive === 0) {
                    axis.status = 'stalled';
                }
            }
            // After stalling empty axes, if ALL axes are now terminal, abort the operation
            if (allAxesTerminal(op.axes)) {
                const anyComplete = op.axes.some(a => a.status === 'complete');
                abortReason = anyComplete ? null : 'all_axes_stalled';
                if (anyComplete) {
                    // Some axes completed, treat as partial success — enter recovery normally
                    beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op));
                    appendReevaluationLog(op, turn, 'abort', activeBrigadeCount, totalPersonnel,
                        'all_axes_terminal_partial_success');
                    continue;
                }
            }
        }

        // Append diagnostic log
        if (abortReason) {
            // Abort: enter recovery with brigade_attrition reason
            beginRecovery(op, turn, 'brigade_attrition');
            appendReevaluationLog(op, turn, 'abort', activeBrigadeCount, totalPersonnel, abortReason);

            // Clean up participating_brigades: remove inactive brigade IDs
            // so recovery/finalization doesn't reference dead formations
            if (multiAxis && op.axes) {
                for (const axis of op.axes) {
                    axis.assigned_brigades = axis.assigned_brigades.filter(bid => {
                        const f = formations[bid];
                        return f && f.status === 'active';
                    });
                    if (axis.status === 'executing') axis.status = 'stalled';
                }
            }
            op.participating_brigades = op.participating_brigades.filter(bid => {
                const f = formations[bid];
                return f && f.status === 'active';
            });
        }
        }
    }
}

/** Append a reevaluation log entry to the operation. */
function appendReevaluationLog(
    op: CorpsOperation,
    turn: number,
    decision: 'continue' | 'abort',
    activeBrigades: number,
    totalPersonnel: number,
    reason: string,
): void {
    if (!op.reevaluation_log) op.reevaluation_log = [];
    op.reevaluation_log.push({
        turn,
        reason,
        decision,
        active_brigades: activeBrigades,
        total_personnel: totalPersonnel,
    });
}

/**
 * Evaluate progress of active operations and advance/abort them.
 * Handles general_offensive and strategic_defense op types.
 * sector_attack, probe, and feint have their own lifecycle in advanceSectorOffensives().
 * Called each turn for active operations.
 */
export function evaluateOperationProgress(
    state: GameState,
    faction: FactionId
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political.political_controllers ?? {};
    const formations = state.military.formations ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of [...cmd.active_operations]) {
            // sector_attack, probe, and feint ops have their own lifecycle in
            // advanceSectorOffensives(). Processing them here would cause double
            // phase transitions and double exhaustion costs.
            if (op.type === 'sector_attack' || op.type === 'probe' || op.type === 'feint') continue;

            const turnsInPhase = turn - op.phase_started_turn;

            if (op.phase === 'planning') {
                // Advance to execution after planning duration
                if (turnsInPhase >= PLANNING_DURATION) {
                    op.phase = 'execution';
                    op.phase_started_turn = turn;
                }
            } else if (op.phase === 'execution') {
                // Check progress
                const targets = op.target_settlements ?? [];
                if (targets.length > 0) {
                    const captured = targets.filter(sid => pc[sid] === faction).length;
                    const captureRate = captured / targets.length;

                    // Abort if failing after 2 turns
                    if (turnsInPhase >= 2 && captureRate < PROGRESS_FAILURE_THRESHOLD) {
                        op.phase = 'recovery';
                        op.phase_started_turn = turn;
                        continue;
                    }

                    // Success or max duration reached
                    if (captureRate >= PROGRESS_SUCCESS_THRESHOLD || turnsInPhase >= EXECUTION_MAX_DURATION) {
                        op.phase = 'recovery';
                        op.phase_started_turn = turn;
                        continue;
                    }
                } else if (turnsInPhase >= EXECUTION_MAX_DURATION) {
                    op.phase = 'recovery';
                    op.phase_started_turn = turn;
                    continue;
                }

                // Replace heavily damaged brigades
                const updatedParticipants: FormationId[] = [];
                const replacementMap = new Map<FormationId, FormationId>();
                for (const brigId of op.participating_brigades) {
                    const brig = formations[brigId];
                    if (!brig || brig.status !== 'active') continue;
                    const startPersonnel = MAX_BRIGADE_PERSONNEL; // approximate
                    const currentPersonnel = brig.personnel ?? 0;
                    const lossRate = 1 - (currentPersonnel / startPersonnel);
                    if (lossRate > BRIGADE_LOSS_THRESHOLD) {
                        // Try to find a replacement from the same corps
                        const subordinates = getCorpsSubordinates(state, corps.id);
                        const replacement = subordinates.find(s =>
                            !op.participating_brigades.includes(s.id) &&
                            (s.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= PERSONNEL_HEALTHY_THRESHOLD &&
                            (s.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD
                        );
                        if (replacement) {
                            updatedParticipants.push(replacement.id);
                            replacementMap.set(brigId, replacement.id);
                            continue;
                        }
                    }
                    updatedParticipants.push(brigId);
                }
                op.participating_brigades = updatedParticipants;
                if (replacementMap.size > 0 && Array.isArray(op.axes)) {
                    for (const axis of op.axes) {
                        axis.assigned_brigades = axis.assigned_brigades
                            .map((brigadeId) => replacementMap.get(brigadeId) ?? brigadeId)
                            .filter((brigadeId, index, ids) => ids.indexOf(brigadeId) === index);
                    }
                }
            } else if (op.phase === 'recovery') {
                // Clear operation after recovery duration
                if (turnsInPhase >= RECOVERY_DURATION) {
                    releaseOperationCommander(state, op);
                    removeOperation(cmd, op);
                    // Add exhaustion from the operation
                    cmd.corps_exhaustion = Math.min(100, cmd.corps_exhaustion + 15);
                }
            }
        }
    }
}
