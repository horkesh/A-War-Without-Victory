/**
 * Orderly evacuation when the capture of a salient neck would strand a brigade.
 *
 * The capture is already politically applied when this runs. The just-captured
 * OSID remains available as the final collapsing corridor for withdrawal; no
 * other hostile territory is traversable. This models commanders withdrawing
 * as the neck gives way, rather than leaving a brigade to be replenished inside
 * a newly created pocket.
 */

import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';
import { isEnclaveBrigade } from './enclave_resilience.js';

export interface SalientWithdrawalReport {
    evacuated_formation_ids: string[];
}

function operationPocketHolders(state: GameState, faction: FactionId): {
    participants: Set<string>;
    stagingOsids: Set<string>;
} {
    const participants = new Set<string>();
    const stagingOsids = new Set<string>();
    const commands = state.military.corps_command ?? {};
    const formations = state.military.formations ?? {};
    const controllers = state.political.political_controllers ?? {};
    for (const corpsId of Object.keys(commands).sort(strictCompare)) {
        for (const operation of commands[corpsId]?.active_operations ?? []) {
            if (operation.phase !== 'planning' && operation.phase !== 'execution') continue;
            for (const brigadeId of operation.participating_brigades ?? []) {
                if (formations[brigadeId]?.faction === faction) participants.add(brigadeId);
            }
            if (operation.staging_osid && controllers[operation.staging_osid] === faction) {
                stagingOsids.add(operation.staging_osid);
            }
            for (const axis of operation.axes ?? []) {
                if (axis.staging_osid && controllers[axis.staging_osid] === faction) {
                    stagingOsids.add(axis.staging_osid);
                }
            }
        }
    }
    return { participants, stagingOsids };
}

function ownComponents(
    controllers: Readonly<Record<string, string | null>>,
    faction: FactionId,
    adjacency: ReadonlyMap<string, readonly string[]>,
): string[][] {
    const remaining = new Set(
        Object.keys(controllers).filter(osid => controllers[osid] === faction).sort(strictCompare),
    );
    const components: string[][] = [];
    while (remaining.size > 0) {
        const start = [...remaining].sort(strictCompare)[0]!;
        remaining.delete(start);
        const component: string[] = [];
        const queue = [start];
        for (let i = 0; i < queue.length; i += 1) {
            const current = queue[i]!;
            component.push(current);
            for (const neighbor of adjacency.get(current) ?? []) {
                if (remaining.has(neighbor) && controllers[neighbor] === faction) {
                    remaining.delete(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        component.sort(strictCompare);
        components.push(component);
    }
    return components;
}

function canReachMainWithoutCapturedNeck(
    state: GameState,
    start: string,
    capturedOsid: string,
    faction: FactionId,
    main: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
): boolean {
    const controllers = state.political.political_controllers ?? {};
    const visited = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
        const current = queue[i]!;
        if (main.has(current)) return true;
        for (const neighbor of adjacency.get(current) ?? []) {
            if (neighbor === capturedOsid || visited.has(neighbor)) continue;
            if (!isFriendlyFaction(controllers[neighbor], faction, state)) continue;
            visited.add(neighbor);
            queue.push(neighbor);
        }
    }
    return false;
}

function findEvacuationDestination(
    state: GameState,
    start: string,
    capturedOsid: string,
    faction: FactionId,
    main: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
): string | null {
    if (canReachMainWithoutCapturedNeck(state, start, capturedOsid, faction, main, adjacency)) return null;
    const controllers = state.political.political_controllers ?? {};
    const visited = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
        const current = queue[i]!;
        if (main.has(current)) return current;
        for (const neighbor of adjacency.get(current) ?? []) {
            if (visited.has(neighbor)) continue;
            const passable = neighbor === capturedOsid
                || isFriendlyFaction(controllers[neighbor], faction, state);
            if (!passable) continue;
            visited.add(neighbor);
            queue.push(neighbor);
        }
    }
    return null;
}

export function evacuateFormationsSeveredByCapture(
    state: GameState,
    capturedOsid: string,
    displacedFaction: FactionId,
    adjacency: ReadonlyMap<string, readonly string[]>,
): SalientWithdrawalReport {
    const report: SalientWithdrawalReport = { evacuated_formation_ids: [] };
    const controllers = state.political.political_controllers ?? {};
    const components = ownComponents(controllers, displacedFaction, adjacency);
    if (components.length < 2) return report;

    const supply = state.political.last_supply_state_by_osid ?? {};
    components.sort((a, b) => {
        const suppliedA = a.filter(osid => supply[osid] !== 'critical').length;
        const suppliedB = b.filter(osid => supply[osid] !== 'critical').length;
        if (suppliedA !== suppliedB) return suppliedB - suppliedA;
        if (a.length !== b.length) return b.length - a.length;
        return strictCompare(a[0]!, b[0]!);
    });
    const main = new Set(components[0]!);
    const operationHolders = operationPocketHolders(state, displacedFaction);

    const formations = state.military.formations ?? {};
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id] as FormationState | undefined;
        if (!formation || formation.status !== 'active' || formation.kind !== 'brigade') continue;
        if (formation.faction !== displacedFaction || isEnclaveBrigade(formation)) continue;
        const start = formation.location_osid;
        if (!start || start === capturedOsid || main.has(start) || controllers[start] !== displacedFaction) continue;
        // The operation commander owns formations committed to a live plan and
        // local troops physically holding its assembly area. Generic salient
        // evacuation must not silently cancel that deliberate pocket defense.
        if (operationHolders.participants.has(id) || operationHolders.stagingOsids.has(start)) continue;
        const destination = findEvacuationDestination(
            state, start, capturedOsid, displacedFaction, main, adjacency,
        );
        if (!destination) continue;

        formation.location_osid = destination;
        formation.assignment = null;
        formation.entrenchment_turns = 0;
        formation.stranded_status = 'reconnected';
        delete formation.stranded_since_turn;
        formation.last_reachable_turn = state.meta.turn;
        delete state.military.brigade_movement_orders?.[id];
        delete state.military.brigade_movement_state?.[id];
        report.evacuated_formation_ids.push(id);
    }
    return report;
}
