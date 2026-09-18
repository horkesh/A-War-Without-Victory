/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Operation approach geometry (leaf module)
 * DOMAIN:    Which friendly OSIDs count as an operation's approach
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted VERBATIM from `bot_brigade_ai_osid.ts` (owner packet 2026-09-18) so that the
 * movement-authority scope decision (`brigade_routine_scope.ts`) can use the SAME predicate
 * the attack evaluator uses, instead of a narrower approximation of it.
 *
 * `bot_brigade_ai_osid.ts` imports the brigade evaluators, and the evaluators import
 * `brigade_routine_scope.ts` — so `brigade_routine_scope.ts` cannot import
 * `bot_brigade_ai_osid.ts` without creating a cycle. This module has only leaf dependencies
 * (tactical adjacency, settlement control, alliance) and is importable from both sides.
 *
 * `bot_brigade_ai_osid.ts` re-exports these symbols, so every existing import path and the
 * public API are unchanged.
 *
 * MUST NOT: mutate state.
 */

import type { CorpsOperation, FactionId, FormationId, GameState, OperationAxis } from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { Osid } from './osid_adjacency.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';

/** Find the axis a brigade belongs to, or null if flat/not found. */
export function getBrigadeAxis(op: CorpsOperation, brigadeId: FormationId): OperationAxis | null {
    const axes = op.axes;
    if (!Array.isArray(axes) || axes.length === 0) return null;
    return axes.find(a => a.assigned_brigades.includes(brigadeId)) ?? null;
}

/** Check if a brigade participates in the operation (axis-aware). */
export function isOperationParticipant(op: CorpsOperation, brigadeId: FormationId): boolean {
    const axes = op.axes;
    if (Array.isArray(axes) && axes.length > 0) {
        return axes.some(a => a.assigned_brigades.includes(brigadeId));
    }
    return op.participating_brigades.includes(brigadeId);
}

export function getSectorOffensiveApproachOsids(
    state: GameState,
    activeOp: CorpsOperation,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    brigadeId?: FormationId,
): Set<Osid> {
    const axis = brigadeId ? getBrigadeAxis(activeOp, brigadeId) : null;
    const objectives = axis ? axis.objectives : (activeOp.objectives ?? []);
    const currentIdx = axis ? axis.current_objective_index : (activeOp.current_objective_index ?? 0);
    const approachOsids = new Set<Osid>();
    for (const objective of objectives.slice(currentIdx)) {
        for (const neighbor of getTacticalAdjacentOsids(state, objective as Osid, adjacency)) {
            const neighborController = getPoliticalControllerOSID(state, neighbor, reverseMap);
            if (neighborController === faction || isFriendlyFaction(neighborController, faction, state)) {
                approachOsids.add(neighbor);
            }
        }
        if (approachOsids.size > 0) {
            break;
        }
    }
    // Wave 10 fallback: tactical_adjacency ∪ war_front_edges_osid is under-authored
    // for HVO–VRS deep targets (Kupres / Glamoč / Jajce zones). When the stricter
    // graph yields no friendly approach OSIDs, fall through to the corps's front
    // sector sub-segment scan — the permissive check used by the launch gate
    // (sector_offensive.ts collectAdjacentFriendlyOsids). Without this fallback
    // the launch gate passes but per-turn brigade brain stalls, producing
    // spawned-no-attack ops with no_logged_attempt recovery_reason.
    if (approachOsids.size === 0 && state.military.corps_front_sectors && brigadeId) {
        const corpsId = state.military.formations?.[brigadeId]?.corps_id;
        if (corpsId) {
            for (const objective of objectives.slice(currentIdx)) {
                for (const sector of Object.values(state.military.corps_front_sectors)) {
                    if (sector.corps_id !== corpsId) continue;
                    for (const subSegment of sector.sub_segments) {
                        if (!subSegment.enemy_osids.includes(objective as string)) continue;
                        for (const fo of subSegment.friendly_osids) {
                            approachOsids.add(fo as Osid);
                        }
                    }
                }
                if (approachOsids.size > 0) break;
            }
        }
    }
    return approachOsids;
}
