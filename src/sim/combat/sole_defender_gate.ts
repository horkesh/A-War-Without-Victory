/**
 * sole_defender_gate.ts — SOLE-DEFENDER-STRIP (rulings §73, §78.3).
 *
 * One geometric question, shared by the operation roster draw, the phased-axis handoff and the
 * post-operation return: is a brigade the LAST of its faction standing on an own cell that touches
 * hostile ground? A corps commander does not take the last rifle off such a cell to feed an
 * offensive, and he re-mans the line when the offensive ends.
 *
 * Geometry only: no names, no tags, no new GameState field. Enemy contact is tactical adjacency
 * (static adjacency plus `war_front_edges_osid`) to a cell whose controller the faction may fight
 * (`isOperationObjectiveHostile`, which respects the RBiH-HRHB alliance). `contact_cells.ts` is
 * deliberately not used: it is engagement history, not adjacency.
 *
 * Determinism: sorted iteration and strictCompare tie-breaks only.
 */

import type { FactionId, FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isOperationalLineFormationKind } from '../../state/formation_constants.js';
import { isOperationObjectiveHostile } from './operation_objective_hostility.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';
import type { Osid } from './osid_adjacency.js';

const EMPTY_ADJACENCY: Map<Osid, Osid[]> = new Map();

/** An own-controlled cell with at least one tactically adjacent cell the faction may fight. */
export function isEnemyAdjacentOwnCell(
    state: GameState,
    faction: FactionId,
    cell: string,
    adjacency?: Map<Osid, Osid[]> | null,
): boolean {
    if (getPoliticalControllerOSID(state, cell, undefined) !== faction) return false;
    for (const neighbour of getTacticalAdjacentOsids(state, cell as Osid, adjacency ?? EMPTY_ADJACENCY)) {
        const controller = getPoliticalControllerOSID(state, neighbour, undefined);
        if (controller !== null && isOperationObjectiveHostile(state, faction, controller)) return true;
    }
    return false;
}

/**
 * Same-faction active line formations that will still be standing on `cell`: deployed (not in
 * column transit) and holding no movement order that takes them away. `exclude` removes the
 * candidate itself and any brigade already drawn from the cell in the same selection.
 */
export function countStayingDefenders(
    state: GameState,
    faction: FactionId,
    cell: string,
    exclude: ReadonlySet<FormationId>,
): number {
    const formations = state.military.formations ?? {};
    const movementState = state.military.brigade_movement_state ?? {};
    const movementOrders = state.military.brigade_movement_orders ?? {};
    let count = 0;
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id]!;
        if (formation.faction !== faction || formation.status !== 'active') continue;
        if (!isOperationalLineFormationKind(formation.kind ?? 'brigade')) continue;
        if (formation.location_osid !== cell) continue;
        if (exclude.has(id as FormationId)) continue;
        const status = movementState[id]?.status;
        if (status !== undefined && status !== 'deployed') continue;
        if (movementOrders[id as FormationId]) continue;
        count += 1;
    }
    return count;
}

/**
 * True when `brigadeId` stands on an own enemy-adjacent cell and no other same-faction defender
 * (outside `alreadyDrawn`) would remain there if it left. A brigade with no location, or one in
 * transit, is never a sole defender here.
 */
export function isSoleDefenderOfFrontCell(
    state: GameState,
    brigadeId: FormationId,
    alreadyDrawn: ReadonlySet<FormationId>,
    adjacency?: Map<Osid, Osid[]> | null,
): boolean {
    const formation = state.military.formations?.[brigadeId];
    if (!formation?.faction || !formation.location_osid) return false;
    const status = state.military.brigade_movement_state?.[brigadeId]?.status;
    if (status !== undefined && status !== 'deployed') return false;
    const cell = formation.location_osid;
    if (!isEnemyAdjacentOwnCell(state, formation.faction, cell, adjacency)) return false;
    const exclude = new Set<FormationId>(alreadyDrawn);
    exclude.add(brigadeId);
    return countStayingDefenders(state, formation.faction, cell, exclude) === 0;
}

/**
 * The cell is where the axis wants the brigade anyway: the axis staging cell, or a cell tactically
 * adjacent to one of the axis objectives (the brigade attacks from where it stands, so the draw
 * does not empty it).
 */
export function isAxisStagingOrApproachCell(
    state: GameState,
    cell: string,
    stagingOsid: string | null | undefined,
    objectives: readonly string[],
    adjacency?: Map<Osid, Osid[]> | null,
): boolean {
    if (stagingOsid && cell === stagingOsid) return true;
    if (objectives.length === 0) return false;
    const objectiveSet = new Set(objectives);
    return getTacticalAdjacentOsids(state, cell as Osid, adjacency ?? EMPTY_ADJACENCY)
        .some((neighbour) => objectiveSet.has(neighbour));
}

/**
 * Post-operation return target: the nearest own enemy-adjacent cell of the brigade's corps sector
 * front that no own brigade stands on (and that no earlier return this pass claimed). Breadth-first
 * over own-controlled ground from `from`; ties by hop distance, then strictCompare.
 */
export function findNearestVacantSectorFrontCell(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    from: string,
    adjacency: Map<Osid, Osid[]> | null | undefined,
    claimed: ReadonlySet<string>,
): string | null {
    const candidates = new Set<string>();
    const sectors = state.military.corps_front_sectors ?? {};
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId]!;
        if (sector.corps_id !== corpsId) continue;
        for (const sub of sector.sub_segments ?? []) {
            for (const osid of sub.friendly_osids) candidates.add(osid);
        }
    }
    if (candidates.size === 0) return null;
    const isVacantFrontCell = (cell: string): boolean => candidates.has(cell)
        && cell !== from
        && !claimed.has(cell)
        && isEnemyAdjacentOwnCell(state, faction, cell, adjacency)
        && countStayingDefendersOrArriving(state, faction, cell) === 0;

    const adj = adjacency ?? EMPTY_ADJACENCY;
    const visited = new Set<string>([from]);
    let frontier: string[] = [from];
    while (frontier.length > 0) {
        const next: string[] = [];
        for (const cell of frontier) {
            for (const neighbour of getTacticalAdjacentOsids(state, cell as Osid, adj)) {
                if (visited.has(neighbour)) continue;
                visited.add(neighbour);
                if (getPoliticalControllerOSID(state, neighbour, undefined) !== faction) continue;
                next.push(neighbour);
            }
        }
        next.sort(strictCompare);
        const hit = next.find(isVacantFrontCell);
        if (hit) return hit;
        frontier = next;
    }
    return null;
}

/** Own brigades on the cell (any movement status) plus own brigades ordered to it. */
function countStayingDefendersOrArriving(state: GameState, faction: FactionId, cell: string): number {
    const formations = state.military.formations ?? {};
    const movementOrders = state.military.brigade_movement_orders ?? {};
    let count = 0;
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id]!;
        if (formation.faction !== faction || formation.status !== 'active') continue;
        if (!isOperationalLineFormationKind(formation.kind ?? 'brigade')) continue;
        const order = movementOrders[id as FormationId];
        const destination = order?.destination_sids?.[order.destination_sids.length - 1];
        if (formation.location_osid === cell || destination === cell) count += 1;
    }
    return count;
}
