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
    FormationState,
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

/** Minimum supply readiness to launch (fraction adequate). */
const SUPPLY_READINESS_LAUNCH = 0.6;

/** Minimum supply readiness to continue (abort below). */
const SUPPLY_READINESS_ABORT = 0.4;

/** Maximum objectives per offensive. */
const MAX_OBJECTIVES = 6;

/** Momentum cap. */
const MOMENTUM_CAP = 3;

/** Maximum total failures before abort. */
const MAX_TOTAL_FAILURES = 3;

/** Consecutive failures on same objective before skip. */
const MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Planning duration
// ═══════════════════════════════════════════════════════════════════════════

/** Compute planning duration from number of objectives. */
export function computePlanningDuration(objectiveCount: number): number {
    if (objectiveCount <= 2) return 1;
    if (objectiveCount <= 5) return Math.ceil(objectiveCount * 0.6);
    return Math.min(5, Math.ceil(objectiveCount * 0.8));
}

function areParticipantsStaged(state: GameState, participatingBrigades: FormationId[], stagingOsid: string | undefined): boolean {
    if (typeof stagingOsid !== 'string' || stagingOsid.length === 0) return false;
    let activeParticipantCount = 0;
    for (const brigadeId of participatingBrigades) {
        const brigade = state.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        activeParticipantCount += 1;
        if (brigade.location_osid !== stagingOsid) {
            return false;
        }
    }
    return activeParticipantCount > 0;
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
        if (op.type !== 'sector_attack') continue;

        const turn = state.meta?.turn ?? 0;
        const corps = state.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;

        // Resolve missing sector_id: match operation objectives to sector enemy_osids
        if (!op.sector_id && state.corps_front_sectors) {
            const objectives = new Set(op.objectives ?? []);
            let bestSectorId: string | null = null;
            let bestOverlap = 0;
            for (const sector of Object.values(state.corps_front_sectors)) {
                if (sector.corps_id !== corpsId) continue;
                let overlap = 0;
                for (const ss of sector.sub_segments) {
                    for (const eo of ss.enemy_osids) {
                        if (objectives.has(eo)) overlap++;
                    }
                }
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestSectorId = sector.sector_id;
                }
            }
            if (bestSectorId) {
                op.sector_id = bestSectorId;
            }
        }

        // Validate sector still exists
        if (op.sector_id && state.corps_front_sectors) {
            if (!state.corps_front_sectors[op.sector_id]) {
                // Sector orphaned — abort to recovery
                op.phase = 'recovery';
                op.phase_started_turn = turn;
                continue;
            }
        }

        // Recompute supply readiness
        op.supply_readiness = computeSupplyReadiness(state, op.participating_brigades, faction, supplyByOsid);

        if (op.phase === 'planning') {
            const elapsed = turn - op.phase_started_turn;
            const planDuration = op.planning_duration ?? 1;
            const stagedEarly = elapsed >= 1 && areParticipantsStaged(state, op.participating_brigades, op.staging_osid);

            // Transition to execution only after completing the configured number of
            // full planning turns. This preserves one real staging turn for
            // pre-planned operations injected at turn 0 with planning_duration = 1.
            // Supply readiness is NOT gated here — the per-brigade supply gate in bot_brigade_ai_osid
            // handles individual attack eligibility. Sector-level supply gating caused pre-planned
            // VRS operations to never execute (critical-reachability brigades at game start don't
            // have supply routes yet, making readiness < 0.6 indefinitely).
            if (elapsed > planDuration || stagedEarly) {
                op.phase = 'execution';
                op.phase_started_turn = turn;
                op.current_objective_index = 0;
                op.momentum = 0;
                op.failure_count = 0;
                op.consecutive_failures_on_current = 0;
            }
        } else if (op.phase === 'execution') {
            // No supply-based abort during execution — per-brigade gates handle attack eligibility.
            // (Removed: if supply_readiness < SUPPLY_READINESS_ABORT → recovery)

            // Check if all objectives completed
            const objectives = op.objectives ?? [];
            if ((op.current_objective_index ?? 0) >= objectives.length) {
                op.phase = 'recovery';
                op.phase_started_turn = turn;
                continue;
            }

            // Check total failure abort
            if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                op.phase = 'recovery';
                op.phase_started_turn = turn;
                continue;
            }
        } else if (op.phase === 'recovery') {
            const elapsed = turn - op.phase_started_turn;
            const recoveryDuration = Math.max(2, (op.objectives?.length ?? 2));
            if (elapsed >= recoveryDuration) {
                // Apply exhaustion from completed operation
                cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + 15);
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
        if (op.type !== 'sector_attack' || op.phase !== 'execution') continue;

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
            op.last_result = 'captured';
            op.momentum = Math.min(MOMENTUM_CAP, (op.momentum ?? 0) + 1);
            op.current_objective_index = currentIdx + 1;
            op.consecutive_failures_on_current = 0;
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

            if (anyAttacked) {
                // Failed to capture
                op.last_result = 'failed';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;

                // Skip current objective after too many consecutive failures
                if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    op.current_objective_index = currentIdx + 1;
                    op.consecutive_failures_on_current = 0;
                }
            } else {
                op.last_result = 'stalemate';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;

                if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    op.current_objective_index = currentIdx + 1;
                    op.consecutive_failures_on_current = 0;
                }
            }
        }

        // Check if all objectives done or abort
        if ((op.current_objective_index ?? 0) >= objectives.length) {
            op.phase = 'recovery';
            op.phase_started_turn = turn;
        }
        if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
            op.phase = 'recovery';
            op.phase_started_turn = turn;
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
 * - Supply readiness >= SUPPLY_READINESS_LAUNCH
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

    // Compute supply readiness
    const supplyReadiness = computeSupplyReadiness(state, sectorBrigadeIds, faction, supplyByOsid);
    if (supplyReadiness < SUPPLY_READINESS_LAUNCH) return null;

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
