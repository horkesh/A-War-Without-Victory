/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Operation factory functions — CorpsOperation construction
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Nothing — pure factory functions, no decision logic
 * WRITES:    Nothing in GameState — returns constructed CorpsOperation objects
 * READS:     Pre-planned op definitions, sector data, corps command state
 * MUST NOT:  add to active_operations directly; make planning decisions
 *
 * UPSTREAM:  emit.ts (commander-generated ops), bot_corps_operations.ts (emergency/OG ops)
 * DOWNSTREAM: sector_offensive.ts (canonical lifecycle owner receives created ops)
 *
 * TRUTH INVARIANTS:
 * - Four canonical factories: buildCorpsOperation, buildCommanderOperation,
 *   buildEmergencyDefenseOperation, buildProbeOperation
 * - All CorpsOperation creation must flow through one of these factories
 * - Deterministic: sorted via strictCompare; no Math.random(), no Date.now()
 * ═══════════════════════════════════════════════════════════════
 */

import type { CorpsCommandState, CorpsFrontSector, CorpsOperation, FormationId, FormationState, GameState, OperationAxis } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ─── Minimal type for pre-planned op fields consumed by buildCorpsOperation ──
interface PrePlannedOpDef {
    name: string;
    planning_duration?: number;
    staging_osid: string;
    min_attack_outcome?: CorpsOperation['min_attack_outcome'];
}

/** Max concurrent operation slots for a corps based on brigade count */
export function getMaxOperationSlots(activeBrigadeCount: number): number {
    return Math.max(1, Math.floor(activeBrigadeCount / 12));
}

/** Whether the corps has a free operation slot */
export function hasAvailableSlot(cmd: CorpsCommandState, activeBrigadeCount: number): boolean {
    return cmd.active_operations.length < getMaxOperationSlots(activeBrigadeCount);
}

/** Find which operation (if any) a brigade participates in */
export function findBrigadeOperation(cmd: CorpsCommandState, brigadeId: string): CorpsOperation | null {
    for (const op of cmd.active_operations) {
        if (op.participating_brigades.includes(brigadeId)) return op;
    }
    return null;
}

/**
 * State-wide variant of findBrigadeOperation. Searches every corps's
 * active_operations and returns the first match in deterministic
 * (sorted-corps-id) order.
 *
 * USE THIS when a brigade may participate in a multi-corps operation. The
 * triggered-operation injector pushes joint ops onto the primary corps's
 * active_operations only (`triggered_operations.ts:checkTriggeredOperations`),
 * so a brigade whose `corps_id` matches an op's secondary axis will not find
 * its op via the corps-local `findBrigadeOperation`.
 *
 * Determinism: corps_command keys are iterated via `strictCompare` to keep
 * resolution stable when two operations could theoretically claim the same
 * brigade (the alphabetically-earliest corps wins).
 *
 * Returned `cmd` is the corps that physically hosts the operation in
 * `active_operations`, not necessarily the brigade's own corps. Callers that
 * need the brigade's own command for stance / sector reads should still
 * resolve those via `state.military.corps_command[brigade.corps_id]`.
 *
 * Owner cross-reference: `bot_brigade_ai_osid.ts` evaluation hot path uses
 * this helper so secondary-axis brigades can see their op during planning
 * and execution. See `tests/multi_corps_operation_visibility.test.ts` for
 * the contract.
 */
export function findBrigadeOperationAnywhere(
    state: GameState,
    brigadeId: string,
): { cmd: CorpsCommandState; op: CorpsOperation } | null {
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return null;
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const cid of corpsIds) {
        const cmd = corpsCommand[cid];
        if (!cmd) continue;
        for (const op of cmd.active_operations) {
            if (op.participating_brigades.includes(brigadeId)) {
                return { cmd, op };
            }
        }
    }
    return null;
}

/** Get brigade IDs not committed to any active operation */
export function getAvailableBrigades(cmd: CorpsCommandState, allCorpsBrigadeIds: string[]): string[] {
    const busy = new Set<string>();
    for (const op of cmd.active_operations) {
        for (const bid of op.participating_brigades) busy.add(bid);
    }
    return allCorpsBrigadeIds.filter(bid => !busy.has(bid));
}

/** Whether the corps has ANY active operation (replaces `if (cmd.active_operation)`) */
export function hasActiveOperation(cmd: CorpsCommandState): boolean {
    return cmd.active_operations.length > 0;
}

/**
 * Whether slot 0 is available for a queued pre-planned operation.
 * Queued ops are sequential and always occupy slot 0. Bot AI ops (probe/sector_attack)
 * in slots 1+ do NOT block queued op injection — only an existing pre-planned op does.
 */
export function isSlot0AvailableForQueue(cmd: CorpsCommandState): boolean {
    return !cmd.active_operations.some(op => op.is_pre_planned);
}

/** Get the primary (first/oldest) active operation, or null */
export function getPrimaryOperation(cmd: CorpsCommandState): CorpsOperation | null {
    return cmd.active_operations[0] ?? null;
}

/** Remove a specific operation from the active list by reference or name */
export function removeOperation(cmd: CorpsCommandState, op: CorpsOperation): void {
    const idx = cmd.active_operations.indexOf(op);
    if (idx >= 0) cmd.active_operations.splice(idx, 1);
}

/**
 * R13b operational concentration support count.
 *
 * Counts same-axis op-mates within 2 hops of target with distance weighting:
 *   target OSID + 1-hop neighbour = 1.0 contribution
 *   2-hop neighbour              = 0.5 contribution
 * Floored to int for getConcentrationBonus. Excludes brigades already in
 * `attackerIds` (those add via attackerFormations.length directly).
 *
 * Doctrine: a brigade attacking with axis-mates within striking distance
 * is concentrated even if only one is hitting THIS OSID this turn. 2-hop
 * window captures HV expeditionary phantoms staged 2+ hops from objectives
 * (livno/duvno → drvar) without over-amplifying tight clusters (Sarajevo,
 * Drina) where 5+ stacked brigades cap at 2 instead of 4.
 *
 * Deterministic: axisBrigades iterated via strictCompare-sorted copy.
 */
export function countAxisConcentrationSupport(
    state: GameState,
    axisBrigades: readonly FormationId[],
    attackerIds: ReadonlySet<FormationId>,
    adjacency: Map<string, readonly string[]>,
    targetOsid: string,
    maxHops = 2,
): number {
    const hopByOsid = new Map<string, number>();
    hopByOsid.set(targetOsid, 0);
    let frontier: string[] = [targetOsid];
    for (let h = 1; h <= maxHops; h++) {
        const next: string[] = [];
        for (const o of frontier) {
            const nbrs = adjacency.get(o) ?? [];
            for (const nbr of nbrs) {
                if (!hopByOsid.has(nbr)) {
                    hopByOsid.set(nbr, h);
                    next.push(nbr);
                }
            }
        }
        frontier = next;
    }
    let weighted = 0;
    for (const bid of [...axisBrigades].sort(strictCompare)) {
        if (attackerIds.has(bid)) continue;
        const f = state.military.formations?.[bid];
        if (!f?.location_osid || f.status !== 'active') continue;
        const hop = hopByOsid.get(f.location_osid);
        if (hop === undefined) continue;
        weighted += hop <= 1 ? 1.0 : 0.5;
    }
    return Math.floor(weighted);
}

// ═══════════════════════════════════════════════════════════════════════════
// CorpsOperation factory functions — canonical construction entry points.
// ALL CorpsOperation objects must be built via one of these factories.
// Entry points: buildCorpsOperation (pre-planned), buildCommanderOperation,
// buildProbeOperation (commander-generated).
// ═══════════════════════════════════════════════════════════════════════════

/** Factory for pre-planned, player-queued, and triggered operations. */
export function buildCorpsOperation(
    def: PrePlannedOpDef,
    axes: OperationAxis[],
    participating: FormationId[],
    turn: number,
    isPrePlanned = true,
    sectorId?: string,
): CorpsOperation {
    const allObjectives = axes.flatMap(a => a.objectives);
    return {
        name: def.name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [...new Set(participating)].sort(strictCompare),
        axes,
        objectives: [...new Set(allObjectives)],
        current_objective_index: 0,
        planning_duration: def.planning_duration ?? 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: def.staging_osid,
        ...(sectorId ? { sector_id: sectorId } : {}),
        ...(isPrePlanned ? { is_pre_planned: true } : {}),
        ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
    };
}

/**
 * Factory for commander-generated sector-attack operations.
 *
 * `sectorId` is the primary sector anchor (`op.sector_id`).
 */
export function buildCommanderOperation(
    corpsId: string,
    turn: number,
    participatingBrigades: string[],
    sectorId: string | undefined,
    objectives: string[],
    initialStrength: number,
    name?: string,
): CorpsOperation {
    return {
        name: name ?? `cmd_${corpsId}_t${turn}`,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: participatingBrigades,
        ...(sectorId ? { sector_id: sectorId } : {}),
        // Keep flat objectives for backward compat (getAllAxisObjectives falls back to these).
        objectives,
        current_objective_index: 0,
        // Wrap objectives + brigades into a single axis so the multi-axis execution
        // path in sector_offensive picks them up — fixes zero-eligible-attacker (ZEA).
        axes: [{
            axis_id: `cmd_${corpsId}_main`,
            name: 'Main Axis',
            assigned_brigades: participatingBrigades as FormationId[],
            objectives,
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
        planning_duration: 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        // Commander-generated ops: attack at rough parity (≥0.7 ratio).
        // Default costly_victory (≥1.0) causes drought when defenders are entrenched.
        // Pre-planned ops use 'repulsed' (≥0.5); 'stalemate' is appropriate for AI ops.
        min_attack_outcome: 'stalemate',
        // Set at emit time so power-attrition abort gate fires correctly for
        // commander-generated ops (operation_aar.ts skips the write when already set).
        initial_strength: initialStrength,
    };
}

/** Factory for AI-generated emergency defensive operations (strategic_defense type). */
export function buildEmergencyDefenseOperation(
    corpsId: string,
    turn: number,
    participatingBrigades: string[],
    targetSettlements: string[],
    sectorId?: string,
): CorpsOperation {
    return {
        name: `Emergency Defense (${corpsId})`,
        type: 'strategic_defense',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: participatingBrigades,
        sector_id: sectorId,
        target_settlements: targetSettlements,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        is_emergency: true,
    };
}

/**
 * Derive the primary sector anchor for a set of corps brigades.
 * Uses the sector with the strongest participant overlap; prefers assigned over reserve
 * membership and then narrower deterministic tiebreakers.
 */
export function derivePrimarySectorForBrigades(
    sectors: ReadonlyArray<CorpsFrontSector> | null | undefined,
    corpsId: string,
    brigadeIds: ReadonlyArray<string>,
    formations?: Readonly<Record<string, FormationState | undefined>> | null,
): string | undefined {
    if (!sectors || brigadeIds.length === 0) return undefined;
    const brigadeIdSet = new Set(brigadeIds);

    const candidates = sectors
        .filter((sector) => sector.corps_id === corpsId)
        .map((sector) => {
            const physicalMatches = brigadeIds.reduce((count, brigadeId) => {
                const locationOsid = formations?.[brigadeId]?.location_osid;
                if (!locationOsid) return count;
                const onTerritory = (sector.territory_osids ?? []).includes(locationOsid);
                const onFront = (sector.sub_segments ?? []).some((subSegment) => (subSegment.friendly_osids ?? []).includes(locationOsid));
                return count + (onTerritory || onFront ? 1 : 0);
            }, 0);
            const assignedMatches = sector.assigned_brigade_ids.filter((bid) => brigadeIdSet.has(bid)).length;
            const reserveMatches = (sector.reserve_brigade_ids ?? []).filter((bid) => brigadeIdSet.has(bid)).length;
            return {
                sectorId: sector.sector_id,
                physicalMatches,
                assignedMatches,
                reserveMatches,
                totalMatches: physicalMatches + assignedMatches + reserveMatches,
                lengthEdges: sector.length_edges,
            };
        })
        .filter((candidate) => candidate.totalMatches > 0)
        .sort((a, b) =>
            b.physicalMatches - a.physicalMatches
            || b.totalMatches - a.totalMatches
            || b.assignedMatches - a.assignedMatches
            || a.lengthEdges - b.lengthEdges
            || strictCompare(a.sectorId, b.sectorId)
        );

    return candidates[0]?.sectorId;
}

/** Factory for commander-generated probe operations (single surplus brigade). */
export function buildProbeOperation(
    corpsId: string,
    turn: number,
    brigadeId: string,
    sectorId?: string,
    objectives?: string[],
): CorpsOperation {
    return {
        name: `probe_${corpsId}_t${turn}`,
        type: 'probe',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [brigadeId],
        ...(sectorId ? { sector_id: sectorId } : {}),
        planning_duration: 0,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        // Probes are recon-by-force, not full offensive commitments.
        // Give them an explicit threshold so execution does not silently fall
        // back to the harsher costly_victory default intended for generic ops.
        min_attack_outcome: 'stalemate',
        // If objectives provided, create axis so multi-axis execution path fires (ZEA fix).
        ...(objectives && objectives.length > 0 ? {
            objectives,
            axes: [{
                axis_id: `probe_${corpsId}_t${turn}`,
                name: 'Probe',
                assigned_brigades: [brigadeId] as FormationId[],
                objectives,
                current_objective_index: 0,
                status: 'executing' as const,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        } : {}),
    };
}
