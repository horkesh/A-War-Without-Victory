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
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { pickOperationName } from './operation_names.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum brigades in sector to launch an offensive. */
const MIN_BRIGADES_FOR_OFFENSIVE = 3;

/** Maximum objectives per offensive. */
const MAX_OBJECTIVES = 6;

/** Momentum cap. */
const MOMENTUM_CAP = 3;

/** Maximum total failures before abort. */
const MAX_TOTAL_FAILURES = 3;

/** Consecutive failures on same objective before skip. */
const MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 2;
const EARLY_LAUNCH_COHESION_PENALTY = 15;
const ALL_OUT_EXTRA_COHESION_COST = 1;
const BOMBARDMENT_PREP_COST = 2;
const FEINT_PLANNING_TURNS = 2;

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
    if (!state.corps_front_sectors || objectives.length === 0) return approachOsids;
    const objectiveSet = new Set(objectives);
    for (const sector of Object.values(state.corps_front_sectors)) {
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
        const brigade = state.formations?.[brigadeId];
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
    return (op.attack_attempt_count ?? 0) > 0 ? 'max_failures' : 'no_logged_attempt';
}

function applyCohesionDelta(state: GameState, brigadeIds: FormationId[], delta: number): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const next = Math.max(0, Math.min(100, (brigade.cohesion ?? 100) + delta));
        brigade.cohesion = Math.round(next * 10) / 10;
    }
}

function applyDigInOnHalt(state: GameState, brigadeIds: FormationId[]): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.formations?.[brigadeId];
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
    if (!state.heavy_munitions_reserve) state.heavy_munitions_reserve = {};
    const currentReserve = state.heavy_munitions_reserve[faction] ?? 0;
    if (currentReserve < BOMBARDMENT_PREP_COST) return;
    state.heavy_munitions_reserve[faction] = Math.max(0, currentReserve - BOMBARDMENT_PREP_COST);
    for (const formationId of Object.keys(state.formations ?? {}).sort(strictCompare)) {
        const formation = state.formations?.[formationId];
        if (!formation || formation.status !== 'active') continue;
        if (formation.location_osid !== currentObjective || formation.faction === faction) continue;
        formation.dig_in_progress = 0;
        formation.cohesion = Math.max(0, (formation.cohesion ?? 100) - 10);
    }
    operation.artillery_preparation_consumed = true;
}

function fullyRevealProbeSectorIntel(state: GameState, operation: CorpsOperation): void {
    if (operation.type !== 'probe' || !operation.sector_id || !state.sector_intel?.[operation.sector_id]) return;
    for (const record of state.sector_intel[operation.sector_id]) {
        record.confidence = 1;
    }
}

function resolveOperationSectorId(
    state: GameState,
    corpsId: FormationId,
    objectives: string[],
): string | null {
    if (!state.corps_front_sectors || objectives.length === 0) return null;
    const objectiveSet = new Set(objectives);
    let bestSectorId: string | null = null;
    let bestOverlap = 0;
    for (const sector of Object.values(state.corps_front_sectors)) {
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
        ? ((state.general_supply_reserve as Record<string, number> | undefined)?.[faction] ?? 100)
        : 100;

    let adequate = 0;
    for (const bid of participatingBrigades) {
        const b = state.formations?.[bid];
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
 */
export function advanceSectorOffensives(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if (op.type !== 'sector_attack' && op.type !== 'feint' && op.type !== 'probe') continue;

        const turn = state.meta?.turn ?? 0;
        const corps = state.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;

        const resolvedSectorId = resolveOperationSectorId(state, corpsId, op.objectives ?? []);
        if (resolvedSectorId) {
            op.sector_id = resolvedSectorId;
        }

        // Validate sector still exists
        if (op.sector_id && state.corps_front_sectors) {
            if (!state.corps_front_sectors[op.sector_id]) {
                // Sector orphaned — abort once, but do not keep resetting recovery timers.
                if (op.phase !== 'recovery') {
                    beginRecovery(
                        op,
                        turn,
                        (op.attack_attempt_count ?? 0) > 0 ? 'orphaned_sector' : 'no_logged_attempt'
                    );
                    continue;
                }
            }
        }

        // Recompute supply readiness
        op.supply_readiness = computeSupplyReadiness(state, op.participating_brigades, faction, supplyByOsid);

        if (op.recovery_reason === 'manual_termination' && op.phase !== 'recovery') {
            if (op.dig_in_on_halt) {
                applyDigInOnHalt(state, op.participating_brigades);
            }
            beginRecovery(op, turn, 'manual_termination');
            continue;
        }

        if (op.phase === 'planning') {
            if (op.type === 'probe') {
                op.planning_duration = 1;
                op.participating_brigades = [...(op.participating_brigades ?? [])].sort(strictCompare).slice(0, 2);
            }
            const elapsed = turn - op.phase_started_turn;
            const planDuration = op.planning_duration ?? 1;
            const stagedEarly = elapsed >= 1 && areParticipantsReadyForExecution(
                state,
                corpsId,
                op.participating_brigades,
                op.staging_osid,
                op.objectives ?? []
            );
            const forcedLaunch = op.force_launch === true && elapsed >= 1;

            // Transition to execution only after completing the configured number of
            // full planning turns. This preserves one real staging turn for
            // pre-planned operations injected at turn 0 with planning_duration = 1.
            // Supply readiness is NOT gated here — the per-brigade supply gate in bot_brigade_ai_osid
            // handles individual attack eligibility. Sector-level supply gating caused pre-planned
            // VRS operations to never execute (critical-reachability brigades at game start don't
            // have supply routes yet, making readiness < 0.6 indefinitely).
            if (op.type === 'feint' && elapsed >= FEINT_PLANNING_TURNS) {
                applyCohesionDelta(state, op.participating_brigades, -5);
                if (!state.general_supply_reserve) state.general_supply_reserve = {};
                state.general_supply_reserve[faction] = Math.max(0, (state.general_supply_reserve[faction] ?? 0) - 0.5);
                beginRecovery(op, turn, 'manual_termination');
                continue;
            }
            if (elapsed > planDuration || stagedEarly || forcedLaunch) {
                op.phase = 'execution';
                op.phase_started_turn = turn;
                op.current_objective_index = 0;
                op.momentum = 0;
                op.failure_count = 0;
                op.consecutive_failures_on_current = 0;
                op.attack_attempt_count = 0;
                op.objective_capture_count = 0;
                op.movement_only_execution_turns = 0;
                op.idle_execution_turn_streak = 0;
                op.recovery_reason = undefined;
                if (op.sector_id && Array.isArray(state.opsec_sectors)) {
                    state.opsec_sectors = state.opsec_sectors.filter((sectorId) => sectorId !== op.sector_id);
                }
                if (forcedLaunch) {
                    applyCohesionDelta(state, op.participating_brigades, -EARLY_LAUNCH_COHESION_PENALTY);
                    op.force_launch = false;
                }
                applyArtilleryPreparation(state, faction, op);
            }
        } else if (op.phase === 'execution') {
            if (op.tempo === 'all_out') {
                applyCohesionDelta(state, op.participating_brigades, -ALL_OUT_EXTRA_COHESION_COST);
            }
            // No supply-based abort during execution — per-brigade gates handle attack eligibility.
            // (Removed: if supply_readiness < SUPPLY_READINESS_ABORT → recovery)

            // Check if all objectives completed
            const objectives = op.objectives ?? [];
            if ((op.current_objective_index ?? 0) >= objectives.length) {
                beginRecovery(op, turn, 'completed');
                continue;
            }

            // Check total failure abort
            if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
                continue;
            }

            if (op.type === 'probe' && (op.attack_attempt_count ?? 0) > 0) {
                beginRecovery(op, turn, op.last_result === 'captured' ? 'completed' : 'manual_termination');
                continue;
            }
        } else if (op.phase === 'recovery') {
            const elapsed = turn - op.phase_started_turn;
            const recoveryDuration = getRecoveryDuration(op);
            if (elapsed >= recoveryDuration) {
                // Apply exhaustion from completed operation
                const exhaustionCost = op.type === 'feint' || op.type === 'probe' ? 5 : 15;
                cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + exhaustionCost);
                cmd.active_operation = null;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Update sector offensive results (post-combat)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if objectives were captured after combat resolution.
 * Called after phase-ii-resolve-attack-orders.
 */
export function updateSectorOffensiveResults(
    state: GameState,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if ((op.type !== 'sector_attack' && op.type !== 'probe') || op.phase !== 'execution') continue;

        const objectives = op.objectives ?? [];
        const currentIdx = op.current_objective_index ?? 0;
        if (currentIdx >= objectives.length) continue;

        const currentObjective = objectives[currentIdx]!;
        const corps = state.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;

        // Check if we now control the current objective
        const controller = getPoliticalControllerOSID(state, currentObjective, reverseMap ?? undefined);
        const turn = state.meta?.turn ?? 0;

        if (controller === faction) {
            // Captured!
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.objective_capture_count = (op.objective_capture_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            op.last_result = 'captured';
            op.momentum = Math.min(MOMENTUM_CAP, (op.momentum ?? 0) + 1);
            op.current_objective_index = currentIdx + 1;
            op.consecutive_failures_on_current = 0;
            fullyRevealProbeSectorIntel(state, op);
        } else {
            // Check if any participating brigade actually attacked this specific objective this turn.
            // Use corps_front_sectors adjacency to determine which brigades are adjacent to the
            // current objective — prevents false failure counting from brigades attacking elsewhere.
            const adjacentFriendlyOsids = new Set<string>();
            if (state.corps_front_sectors) {
                for (const sector of Object.values(state.corps_front_sectors)) {
                    if (sector.corps_id !== corpsId) continue;
                    for (const ss of sector.sub_segments) {
                        if (ss.enemy_osids.includes(currentObjective)) {
                            for (const fo of ss.friendly_osids) adjacentFriendlyOsids.add(fo);
                        }
                    }
                }
            }
            const anyAttacked = op.participating_brigades.some(bid => {
                const b = state.formations?.[bid];
                if (!b || b.posture !== 'attack') return false;
                // Brigade is adjacent to this specific objective and was attacking
                return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
            });
            const anyMoved = op.participating_brigades.some(bid => {
                const movement = state.brigade_movement_orders?.[bid];
                return Array.isArray(movement?.destination_sids) && movement.destination_sids.length > 0;
            });

            if (anyAttacked) {
                // Failed to capture
                op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
                op.idle_execution_turn_streak = 0;
                op.last_result = 'failed';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
                fullyRevealProbeSectorIntel(state, op);

                // Skip current objective after too many consecutive failures
                if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    op.current_objective_index = currentIdx + 1;
                    op.consecutive_failures_on_current = 0;
                }
            } else {
                if (anyMoved) {
                    op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
                    op.idle_execution_turn_streak = 0;
                } else {
                    op.idle_execution_turn_streak = (op.idle_execution_turn_streak ?? 0) + 1;
                }
                op.last_result = 'stalemate';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;

                if (!anyMoved && !anyAttacked && (op.attack_attempt_count ?? 0) === 0 && (op.idle_execution_turn_streak ?? 0) >= 1) {
                    op.movement_only_execution_turns = Math.max(1, op.movement_only_execution_turns ?? 0);
                    beginRecovery(op, turn, 'no_logged_attempt');
                    continue;
                }

                if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    op.current_objective_index = currentIdx + 1;
                    op.consecutive_failures_on_current = 0;
                }
            }
        }

        // Check if all objectives done or abort
        if ((op.current_objective_index ?? 0) >= objectives.length) {
            beginRecovery(op, turn, 'completed');
        }
        if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
            beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
        }
    }
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
export function evaluateSectorOffensiveLaunch(
    state: GameState,
    corpsId: FormationId,
    sectorId: string,
    faction: FactionId,
    sectorBrigadeIds: FormationId[],
    sectorEnemyOsids: string[],
    offensiveTargets: string[],
    supplyByOsid?: SupplyStateByOsidReport | null
): CorpsOperation | null {
    const turn = state.meta?.turn ?? 0;

    // Must have enough brigades
    if (sectorBrigadeIds.length < MIN_BRIGADES_FOR_OFFENSIVE) return null;

    // Must have enough enemy targets
    if (sectorEnemyOsids.length < 2) return null;

    // Record supply readiness for diagnostics and downstream brigade-level attack gating.
    // Launch itself is allowed even under poor sector-wide supply so the force can stage and
    // reposition toward the next objective. Individual brigades still remain supply-gated when
    // bot_brigade_ai_osid decides whether an attack order is actually eligible.
    const supplyReadiness = computeSupplyReadiness(state, sectorBrigadeIds, faction, supplyByOsid);

    // Select objectives: offensive targets that are in this sector's enemy OSIDs
    const sectorTargetSet = new Set(sectorEnemyOsids);
    const objectives = offensiveTargets
        .filter(t => sectorTargetSet.has(t))
        .slice(0, MAX_OBJECTIVES);

    // Need at least 1 objective for a sector offensive
    if (objectives.length < 1) return null;

    const planningDuration = computePlanningDuration(objectives.length);
    const name = pickOperationName(corpsId, turn, faction);

    // Reserve fraction: keep 1 brigade in reserve, rest participate
    const reserveCount = Math.max(1, Math.floor(sectorBrigadeIds.length * 0.15));
    const participating = sectorBrigadeIds.slice(0, sectorBrigadeIds.length - reserveCount);

    // Pick staging OSID: first friendly OSID in the sector (deterministic, sorted)
    let stagingOsid: string | undefined;
    const sector = state.corps_front_sectors?.[sectorId];
    if (sector) {
        const friendlyOsids: string[] = [];
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) friendlyOsids.push(o);
        }
        friendlyOsids.sort(strictCompare);
        if (friendlyOsids.length > 0) stagingOsid = friendlyOsids[0];
    }

    return {
        name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: participating.sort(strictCompare),
        sector_id: sectorId,
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
    };
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
