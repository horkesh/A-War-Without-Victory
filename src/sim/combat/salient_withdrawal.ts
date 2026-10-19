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
import { emitSalientEvacuationRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';

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
    trace?: SalientReachTrace,
): boolean {
    const controllers = state.political.political_controllers ?? {};
    const visited = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
        const current = queue[i]!;
        if (main.has(current)) {
            if (trace) {
                trace.without_neck_visited = [...visited].sort(strictCompare);
                trace.without_neck_terminal = 'reached_main';
            }
            return true;
        }
        for (const neighbor of adjacency.get(current) ?? []) {
            if (neighbor === capturedOsid || visited.has(neighbor)) continue;
            if (!isFriendlyFaction(controllers[neighbor], faction, state)) continue;
            visited.add(neighbor);
            queue.push(neighbor);
        }
    }
    if (trace) {
        trace.without_neck_visited = [...visited].sort(strictCompare);
        trace.without_neck_terminal = 'not_reached';
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
    trace?: SalientReachTrace,
): string | null {
    if (canReachMainWithoutCapturedNeck(state, start, capturedOsid, faction, main, adjacency, trace)) return null;
    const controllers = state.political.political_controllers ?? {};
    const visited = new Set([start]);
    const parent = trace ? new Map<string, string>() : undefined;
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
        const current = queue[i]!;
        if (main.has(current)) {
            if (trace) {
                trace.with_neck_visited = [...visited].sort(strictCompare);
                trace.with_neck_terminal = 'reached_main';
                const path = [current];
                let cursor = current;
                while (parent?.has(cursor)) { cursor = parent.get(cursor)!; path.push(cursor); }
                trace.chosen_path = path.reverse();
            }
            return current;
        }
        for (const neighbor of adjacency.get(current) ?? []) {
            if (visited.has(neighbor)) continue;
            const passable = neighbor === capturedOsid
                || isFriendlyFaction(controllers[neighbor], faction, state);
            if (!passable) continue;
            visited.add(neighbor);
            parent?.set(neighbor, current);
            queue.push(neighbor);
        }
    }
    if (trace) {
        trace.with_neck_visited = [...visited].sort(strictCompare);
        trace.with_neck_terminal = 'not_reached';
    }
    return null;
}

interface SalientObserverSelection { requested: string[]; selected: ReadonlySet<string> }
interface SalientReachTrace {
    without_neck_visited?: string[];
    without_neck_terminal?: string;
    with_neck_visited?: string[];
    with_neck_terminal?: string;
    chosen_path?: string[];
}

function salientObserverSelection(turn: number): SalientObserverSelection | undefined {
    if (!isReasonCodeTopicEnabled('salient_evacuation') || typeof process === 'undefined') return undefined;
    const range = process.env.AWWV_DEBUG_SALIENT_TURNS ?? '';
    const match = /^(\d+)\.\.(\d+)$/.exec(range.trim());
    if (!match) return undefined;
    const first = Number(match[1]); const last = Number(match[2]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first > last || turn < first || turn > last) return undefined;
    const requested = (process.env.AWWV_DEBUG_SALIENT_BRIGADES ?? '').split(',').map(v => v.trim()).filter(Boolean).sort(strictCompare);
    if (requested.length === 0 || new Set(requested).size !== requested.length) return undefined;
    return { requested, selected: new Set(requested) };
}

export function evacuateFormationsSeveredByCapture(
    state: GameState,
    capturedOsid: string,
    displacedFaction: FactionId,
    adjacency: ReadonlyMap<string, readonly string[]>,
): SalientWithdrawalReport {
    const report: SalientWithdrawalReport = { evacuated_formation_ids: [] };
    const controllers = state.political.political_controllers ?? {};
    const observation = salientObserverSelection(state.meta.turn);
    const formations = state.military.formations ?? {};
    if (observation) emitSalientEvacuationRecord({
        kind: 'pass_start', turn: state.meta.turn, captured_osid: capturedOsid,
        captured_owner: controllers[capturedOsid] ?? null, displaced_faction: displacedFaction,
        live_alliance_rbih_hrhb: state.political.war_alliance_rbih_hrhb ?? null,
        requested_ids: observation.requested,
    });
    if (observation) {
        const present = observation.requested.filter(id => formations[id] !== undefined);
        emitSalientEvacuationRecord({ kind: 'inventory', turn: state.meta.turn, present_requested_ids: present,
            absent_requested_ids: observation.requested.filter(id => formations[id] === undefined) });
    }
    const components = ownComponents(controllers, displacedFaction, adjacency);
    if (components.length < 2) {
        if (observation) {
            for (const id of observation.requested) emitSalientEvacuationRecord({ kind: 'formation_terminal', turn: state.meta.turn,
                formation_id: id, terminal: formations[id] ? 'components_lt_2' : 'inventory_absent', wrote: false });
            emitSalientEvacuationRecord({ kind: 'pass_end', turn: state.meta.turn, terminal: 'components_lt_2' });
        }
        return report;
    }

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
    if (observation) {
        emitSalientEvacuationRecord({ kind: 'component_rank', turn: state.meta.turn,
            components: components.map(osids => ({ osids: [...osids], size: osids.length,
                supplied_count: osids.filter(osid => supply[osid] !== 'critical').length })),
            initial_main_osids: [...main].sort(strictCompare) });
        emitSalientEvacuationRecord({ kind: 'operation_holders', turn: state.meta.turn,
            participant_ids: [...operationHolders.participants].sort(strictCompare),
            staging_osids: [...operationHolders.stagingOsids].sort(strictCompare) });
    }

    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id] as FormationState | undefined;
        const selected = observation?.selected.has(id) === true;
        const terminal = (value: string, extra: Record<string, unknown> = {}): void => {
            if (selected) emitSalientEvacuationRecord({ kind: 'formation_terminal', turn: state.meta.turn,
                formation_id: id, terminal: value, wrote: value === 'evacuated', ...extra });
        };
        if (!formation || formation.status !== 'active' || formation.kind !== 'brigade') { terminal('ineligible_not_active_brigade'); continue; }
        if (formation.faction !== displacedFaction) { terminal('ineligible_faction'); continue; }
        if (isEnclaveBrigade(formation)) { terminal('ineligible_enclave'); continue; }
        const start = formation.location_osid;
        if (!start) { terminal('ineligible_no_location'); continue; }
        if (start === capturedOsid) { terminal('ineligible_at_captured_osid', { start_osid: start }); continue; }
        if (main.has(start)) { terminal('already_connected_to_main', { start_osid: start }); continue; }
        if (controllers[start] !== displacedFaction) { terminal('ineligible_start_not_displaced_control', { start_osid: start }); continue; }
        // The operation commander owns formations committed to a live plan and
        // local troops physically holding its assembly area. Generic salient
        // evacuation must not silently cancel that deliberate pocket defense.
        if (operationHolders.participants.has(id)) { terminal('ineligible_operation_participant', { start_osid: start }); continue; }
        if (operationHolders.stagingOsids.has(start)) { terminal('ineligible_operation_staging', { start_osid: start }); continue; }
        const trace: SalientReachTrace | undefined = selected ? {} : undefined;
        const destination = findEvacuationDestination(
            state, start, capturedOsid, displacedFaction, main, adjacency, trace,
        );
        if (!destination) {
            terminal(trace?.without_neck_terminal === 'reached_main' ? 'already_connected_to_main' : 'no_route', { start_osid: start, ...trace });
            continue;
        }

        const orderBefore = state.military.brigade_movement_orders?.[id];
        const movementStateBefore = state.military.brigade_movement_state?.[id];
        const corpsIdBefore = formation.corps_id ?? null;
        const assignmentBefore = formation.assignment ?? null;
        const strandedStatusBefore = formation.stranded_status ?? null;

        formation.location_osid = destination;
        formation.assignment = null;
        formation.entrenchment_turns = 0;
        formation.stranded_status = 'reconnected';
        delete formation.stranded_since_turn;
        formation.last_reachable_turn = state.meta.turn;
        delete state.military.brigade_movement_orders?.[id];
        delete state.military.brigade_movement_state?.[id];
        report.evacuated_formation_ids.push(id);
        terminal('evacuated', { start_osid: start, destination_osid: destination, ...trace,
            corps_id_before: corpsIdBefore, corps_id_after: formation.corps_id ?? null,
            order_present_before: orderBefore !== undefined, order_before: orderBefore ?? null,
            order_present_after: state.military.brigade_movement_orders?.[id] !== undefined,
            movement_state_present_before: movementStateBefore !== undefined, movement_state_before: movementStateBefore ?? null,
            movement_state_present_after: state.military.brigade_movement_state?.[id] !== undefined,
            assignment_before: assignmentBefore, assignment_after: formation.assignment,
            stranded_status_before: strandedStatusBefore, stranded_status_after: formation.stranded_status,
            stranded_since_turn_present_after: formation.stranded_since_turn !== undefined,
            last_reachable_turn_after: formation.last_reachable_turn });
    }
    if (observation) {
        for (const id of observation.requested) if (formations[id] === undefined) emitSalientEvacuationRecord({
            kind: 'formation_terminal', turn: state.meta.turn, formation_id: id, terminal: 'inventory_absent', wrote: false });
        emitSalientEvacuationRecord({ kind: 'pass_end', turn: state.meta.turn, terminal: 'completed',
            evacuated_formation_ids: [...report.evacuated_formation_ids] });
    }
    return report;
}
