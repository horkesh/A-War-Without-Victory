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

import type { CorpsOperation, FormationId, GameState, OperationAxis } from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { strictCompare } from '../../state/validateGameState.js';
// Function-only use at call time: launch helpers reach this module back through
// combat_predictor / osid_column_movement, an import cycle that is safe because nothing here runs at load.
import { launchAxisObjectiveView } from './sector_offensive_launch_helpers.js';
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

/** The corps whose command holds `op` (sorted corps ids), or undefined for a detached copy. */
function findOperationHostCorpsId(state: GameState, op: CorpsOperation): FormationId | undefined {
    const commands = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(commands).sort(strictCompare)) {
        if (commands[corpsId]?.active_operations?.includes(op)) return corpsId;
    }
    return undefined;
}

export function getSectorOffensiveApproachOsids(
    state: GameState,
    activeOp: CorpsOperation,
    // Declared `string`, not the narrower faction id type: this value is only compared against
    // a controller and passed to `isFriendlyFaction`, which itself takes a string. Because
    // `FormationState.faction` is declared `string`, narrowing here would force a type
    // assertion at the caller — a new strict-null escape, which
    // `tests/strict_null_inventory_progress.test.ts` ratchets against. The narrower type is
    // assignable to `string`, so every existing caller is unaffected.
    faction: string,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    brigadeId?: FormationId,
    staticAdjacency?: Map<string, string[]>,
): Set<Osid> {
    // PRIM-RAW-AXIS (rulings §31). In execution the raw index is right: launch reset it, so it is
    // the live objective, and the preserve-sequence slice keys on the authored order (march
    // correction's synthetic axes set index 0 themselves). In planning the stored index is not
    // where the first battle is: the launch resets it to 0 after the reconcile, so a planning
    // march reads from the reconciled axis's first objective.
    const indexOf = (stored: number | undefined): number =>
        activeOp.phase === 'execution' ? (stored ?? 0) : 0;
    const axis = brigadeId ? getBrigadeAxis(activeOp, brigadeId) : null;
    const axisIndex = axis ? indexOf(axis.current_objective_index) : 0;
    // PRIM-RAW-AXIS (rulings §31/§34): in planning an axis is read through its launch view (a null
    // view = no approach). No caller holds the static map today, so for a pre-planned non-preserve
    // op the prune here can differ from the reconcile's.
    const axisObjectives: readonly string[] = !axis
        ? []
        : activeOp.phase === 'execution'
            ? axis.objectives
            : (launchAxisObjectiveView(
                state,
                findOperationHostCorpsId(state, activeOp)
                    ?? (brigadeId ? state.military.formations?.[brigadeId]?.corps_id : undefined)
                    ?? '',
                faction,
                activeOp,
                axis,
                activeOp.is_pre_planned === true ? staticAdjacency : undefined,
            )?.objectives ?? []);
    const objectives = axis
        ? axis.preserve_objective_sequence === true
            ? axisObjectives.slice(axisIndex, axisIndex + 1)
            : axisObjectives
        : (activeOp.objectives ?? []);
    const currentIdx = axis
        ? axis.preserve_objective_sequence === true ? 0 : axisIndex
        : indexOf(activeOp.current_objective_index);
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
