/**
 * Corps reorganisation lifecycle events: dated brigade transfers between corps,
 * and corps retirement (hand-over to a successor, then switch-off).
 *
 * Data lives in `data/source/formation_lifecycle_events.json` under the
 * `corps_reorganisation` key (same file as the per-formation disband/merge/rename
 * events, so it is already stamped by run provenance).
 *
 * Runs once per war turn in the `apply-corps-reorganisation` step, directly after
 * `activate-corps` and BEFORE `partition-corps-front-sectors`, so a corps that
 * activates and receives brigades on week W has its sector on week W (no one-turn lag).
 *
 * SEMANTICS
 *
 * corps_transfer — from `trigger_turn` on, every listed formation belongs to
 *   `target_corps_id`. The event is STANDING: a listed brigade that spawns or is
 *   reconstituted after the trigger week is moved on the first turn it appears, so
 *   the OOB catalog corps never silently wins. When several transfers list the same
 *   formation, the latest-triggered one (trigger_turn, then id) governs it, so two
 *   standing transfers can never ping-pong a brigade. A brigade committed to a live
 *   operation of its current corps (participant, attached, loaned) or out on an elite
 *   loan finishes that commitment first; after `max_defer_turns` (default 4) past the
 *   trigger it is released through the same path brigade dissolution uses. The target
 *   must exist as an active corps formation; until it does, the transfer waits.
 *
 * corps_retire — from `trigger_turn` on, the corps is retired: its live operations
 *   are cancelled through the canonical clean-removal path (commanders released, TGs
 *   dissolved, Army-HQ receipts closed), its queued pre-planned operations are dropped
 *   (pre-planned definitions are keyed by corps, so a queue cannot be carried over),
 *   every active subordinate formation is handed to `successor_corps_id`, the corps
 *   formation is set inactive and its corps_command entry removed. Also standing: a
 *   formation that later appears under the retired corps is redirected to the
 *   successor. A transfer whose target has been retired resolves through the
 *   successor chain.
 *
 * DETERMINISM: events sorted by (trigger_turn, id); formation ids and corps ids
 * iterated in strictCompare order; no RNG, no wall clock. When the data file has no
 * events (or none has triggered) the step performs ZERO mutation, so a run without
 * reorganisation data is byte-identical to one without this step.
 *
 * SAVE COMPATIBILITY: the only persisted write besides corps_id / status is the
 * existing optional `military.formation_lifecycle_events_fired` receipt map
 * (event id → first turn the event completed).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CorpsCommandState, FormationId, FormationState, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { removeFromActiveOperation } from './combat/brigade_dissolution.js';
import { initializeCorpsCommand } from './combat/corps_command.js';
import { removeOperation } from './combat/corps_operation_helpers.js';
import { releaseOperationCommander, releaseTacticalCommander } from './combat/officer_system.js';
import { completeOperationLifecycle, enterOperationRecovery } from './combat/tactical_group_lifecycle.js';

/** Default number of turns a committed brigade may finish its operation before a forced transfer. */
export const DEFAULT_TRANSFER_MAX_DEFER_TURNS = 4;

export interface CorpsTransferEventDef {
    id: string;
    type: 'corps_transfer';
    trigger_turn: number;
    target_corps_id: string;
    formation_ids: string[];
    max_defer_turns?: number;
    reason: string;
}

export interface CorpsRetireEventDef {
    id: string;
    type: 'corps_retire';
    trigger_turn: number;
    corps_id: string;
    successor_corps_id: string;
    reason: string;
}

export type CorpsReorganisationEventDef = CorpsTransferEventDef | CorpsRetireEventDef;

export interface CorpsReorganisationReport {
    transferred: Array<{ event_id: string; formation_id: string; from_corps_id: string | null; to_corps_id: string; forced: boolean }>;
    deferred: Array<{ event_id: string; formation_id: string }>;
    retired: Array<{ event_id: string; corps_id: string; successor_corps_id: string; cancelled_operations: string[]; dropped_queued_operations: string[] }>;
    completed_event_ids: string[];
}

let cachedEvents: CorpsReorganisationEventDef[] | null = null;
let cachedBaseDir: string | null = null;

/** Load corps reorganisation events (cached per base dir). Missing file or key → []. */
export async function loadCorpsReorganisationEvents(baseDir?: string): Promise<CorpsReorganisationEventDef[]> {
    const dir = baseDir || (typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '');
    if (cachedEvents && cachedBaseDir === dir) return cachedEvents;
    const path = resolve(dir, 'data/source/formation_lifecycle_events.json');
    let events: CorpsReorganisationEventDef[] = [];
    try {
        const raw = JSON.parse(await readFile(path, 'utf8')) as { corps_reorganisation?: unknown };
        events = validateCorpsReorganisationEvents(raw.corps_reorganisation ?? []);
    } catch (err) {
        // A malformed reorganisation entry is a data bug: surface it, never run half the data.
        if (err instanceof CorpsReorganisationDataError) throw err;
        events = [];
    }
    cachedEvents = events;
    cachedBaseDir = dir;
    return events;
}

export class CorpsReorganisationDataError extends Error {}

/** Validate and normalise raw event definitions. Throws CorpsReorganisationDataError on bad data. */
export function validateCorpsReorganisationEvents(raw: unknown): CorpsReorganisationEventDef[] {
    if (!Array.isArray(raw)) throw new CorpsReorganisationDataError('corps_reorganisation must be an array');
    const seen = new Set<string>();
    const out: CorpsReorganisationEventDef[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') throw new CorpsReorganisationDataError('event must be an object');
        const e = entry as Record<string, unknown>;
        const id = e.id;
        if (typeof id !== 'string' || id.length === 0) throw new CorpsReorganisationDataError('event id required');
        if (seen.has(id)) throw new CorpsReorganisationDataError(`duplicate event id ${id}`);
        seen.add(id);
        if (typeof e.trigger_turn !== 'number' || !Number.isInteger(e.trigger_turn) || e.trigger_turn < 0) {
            throw new CorpsReorganisationDataError(`${id}: trigger_turn must be a non-negative integer`);
        }
        const reason = typeof e.reason === 'string' ? e.reason : '';
        if (e.type === 'corps_transfer') {
            if (typeof e.target_corps_id !== 'string' || !e.target_corps_id) {
                throw new CorpsReorganisationDataError(`${id}: target_corps_id required`);
            }
            if (!Array.isArray(e.formation_ids) || e.formation_ids.length === 0 || !e.formation_ids.every((f) => typeof f === 'string' && f)) {
                throw new CorpsReorganisationDataError(`${id}: formation_ids must be a non-empty string array`);
            }
            if (e.max_defer_turns != null && (typeof e.max_defer_turns !== 'number' || !Number.isInteger(e.max_defer_turns) || e.max_defer_turns < 0)) {
                throw new CorpsReorganisationDataError(`${id}: max_defer_turns must be a non-negative integer`);
            }
            out.push({
                id,
                type: 'corps_transfer',
                trigger_turn: e.trigger_turn,
                target_corps_id: e.target_corps_id,
                formation_ids: [...new Set(e.formation_ids as string[])].sort(strictCompare),
                ...(e.max_defer_turns != null ? { max_defer_turns: e.max_defer_turns as number } : {}),
                reason,
            });
        } else if (e.type === 'corps_retire') {
            if (typeof e.corps_id !== 'string' || !e.corps_id) throw new CorpsReorganisationDataError(`${id}: corps_id required`);
            if (typeof e.successor_corps_id !== 'string' || !e.successor_corps_id) {
                throw new CorpsReorganisationDataError(`${id}: successor_corps_id required`);
            }
            if (e.successor_corps_id === e.corps_id) throw new CorpsReorganisationDataError(`${id}: successor must differ from corps`);
            out.push({
                id,
                type: 'corps_retire',
                trigger_turn: e.trigger_turn,
                corps_id: e.corps_id,
                successor_corps_id: e.successor_corps_id,
                reason,
            });
        } else {
            throw new CorpsReorganisationDataError(`${id}: unknown type ${String(e.type)}`);
        }
    }
    return sortEvents(out);
}

function sortEvents<T extends CorpsReorganisationEventDef>(events: readonly T[]): T[] {
    return [...events].sort((a, b) => a.trigger_turn - b.trigger_turn || strictCompare(a.id, b.id));
}

function isCorpsFormation(f: FormationState | undefined): boolean {
    return !!f && (f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq');
}

function isActiveCorps(state: GameState, corpsId: string): boolean {
    const f = state.military.formations?.[corpsId];
    return isCorpsFormation(f) && f!.status === 'active';
}

/** True while the brigade is committed to a live operation of its current corps or out on an elite loan. */
export function isCommittedToCorpsOperation(state: GameState, formation: FormationState): boolean {
    if (formation.elite_loan_state?.on_loan) return true;
    const corpsId = formation.corps_id;
    if (!corpsId) return false;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    for (const op of cmd.active_operations ?? []) {
        if (op.participating_brigades?.includes(formation.id)) return true;
        if (op.attached_brigades?.includes(formation.id)) return true;
        if (op.loaned_brigades?.some((l) => l.brigade_id === formation.id)) return true;
    }
    return false;
}

/** Fully detach a brigade from every operation list of the given corps (dissolution path + attached/loaned lists). */
function releaseFromCorpsOperations(state: GameState, formationId: FormationId, corpsId: string | null | undefined): void {
    if (!corpsId) return;
    removeFromActiveOperation(state, formationId, corpsId);
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return;
    for (const op of cmd.active_operations ?? []) {
        if (op.attached_brigades?.includes(formationId)) {
            op.attached_brigades = op.attached_brigades.filter((id) => id !== formationId);
        }
        if (op.loaned_brigades?.some((l) => l.brigade_id === formationId)) {
            op.loaned_brigades = op.loaned_brigades.filter((l) => l.brigade_id !== formationId);
        }
        if (op.primary_sector_brigades?.includes(formationId)) {
            op.primary_sector_brigades = op.primary_sector_brigades.filter((id) => id !== formationId);
        }
    }
}

function receipts(state: GameState): Record<string, number> {
    if (!state.military.formation_lifecycle_events_fired) state.military.formation_lifecycle_events_fired = {};
    return state.military.formation_lifecycle_events_fired;
}

/** Retirements that have taken effect by `turn`: corps id → successor id. */
function retiredCorpsMap(state: GameState, events: readonly CorpsReorganisationEventDef[], turn: number): Map<string, string> {
    const map = new Map<string, string>();
    for (const e of events) {
        if (e.type !== 'corps_retire' || e.trigger_turn > turn) continue;
        // A retirement is "in effect" once it has fired (receipt) — or fires this turn.
        map.set(e.corps_id, e.successor_corps_id);
    }
    return map;
}

/** Follow the retirement chain from `corpsId` to a corps that is not retired (cycle-safe). */
export function resolveLiveCorpsId(corpsId: string, retired: ReadonlyMap<string, string>): string {
    let current = corpsId;
    const visited = new Set<string>();
    while (retired.has(current) && !visited.has(current)) {
        visited.add(current);
        current = retired.get(current)!;
    }
    return current;
}

/**
 * Apply every triggered corps reorganisation event for this turn. See module doc.
 * Returns null (and mutates nothing) when no event has triggered.
 */
export function processCorpsReorganisationEvents(
    state: GameState,
    events: readonly CorpsReorganisationEventDef[],
): CorpsReorganisationReport | null {
    const turn = state.meta?.turn ?? 0;
    const sorted = sortEvents(events);
    if (!sorted.some((e) => e.trigger_turn <= turn)) return null;
    const formations = state.military.formations;
    if (!formations) return null;

    const report: CorpsReorganisationReport = { transferred: [], deferred: [], retired: [], completed_event_ids: [] };
    let changed = false;
    const retired = retiredCorpsMap(state, sorted, turn);

    // 1. Retirements first, so a transfer this turn already sees the successor chain.
    for (const e of sorted) {
        if (e.type !== 'corps_retire' || e.trigger_turn > turn) continue;
        const firstFire = state.military.formation_lifecycle_events_fired?.[e.id] == null;
        const successor = resolveLiveCorpsId(e.successor_corps_id, retired);
        if (!isActiveCorps(state, successor)) {
            // Successor not yet active: the retirement waits (corps keeps working until hand-over is possible).
            continue;
        }
        const cancelled: string[] = [];
        const dropped: string[] = [];
        const cmd = state.military.corps_command?.[e.corps_id];
        if (cmd) {
            const ops = [...(cmd.active_operations ?? [])].sort((a, b) => strictCompare(a.name, b.name) || a.started_turn - b.started_turn);
            for (const op of ops) {
                cancelOperation(state, e.corps_id, cmd, op, turn);
                cancelled.push(op.name);
            }
            if (cmd.queued_operations?.length) dropped.push(...cmd.queued_operations);
            delete state.military.corps_command![e.corps_id];
            changed = true;
        }
        const successorCmd = state.military.corps_command?.[successor];
        const oldActiveOgs = new Set(cmd?.active_ogs ?? []);
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid]!;
            if (f.corps_id !== e.corps_id || f.status !== 'active' || isCorpsFormation(f)) continue;
            f.corps_id = successor as FormationId;
            if (successorCmd && oldActiveOgs.has(fid as FormationId) && !successorCmd.active_ogs.includes(fid as FormationId)) {
                successorCmd.active_ogs = [...successorCmd.active_ogs, fid as FormationId].sort(strictCompare);
            }
            report.transferred.push({ event_id: e.id, formation_id: fid, from_corps_id: e.corps_id, to_corps_id: successor, forced: false });
            changed = true;
        }
        const corps = formations[e.corps_id];
        if (corps && corps.status === 'active') {
            corps.status = 'inactive';
            changed = true;
        }
        if (firstFire) {
            receipts(state)[e.id] = turn;
            report.completed_event_ids.push(e.id);
            changed = true;
        }
        if (cancelled.length || dropped.length || firstFire) {
            report.retired.push({ event_id: e.id, corps_id: e.corps_id, successor_corps_id: successor, cancelled_operations: cancelled, dropped_queued_operations: dropped });
        }
    }

    // 2. Transfers. The governing event per formation = latest-triggered listing it.
    const governing = new Map<string, CorpsTransferEventDef>();
    for (const e of sorted) {
        if (e.type !== 'corps_transfer' || e.trigger_turn > turn) continue;
        for (const fid of e.formation_ids) governing.set(fid, e); // sorted ascending → last write wins
    }
    const pendingByEvent = new Map<string, number>();
    for (const fid of [...governing.keys()].sort(strictCompare)) {
        const e = governing.get(fid)!;
        const target = resolveLiveCorpsId(e.target_corps_id, retired);
        if (!isActiveCorps(state, target)) {
            pendingByEvent.set(e.id, (pendingByEvent.get(e.id) ?? 0) + 1);
            continue;
        }
        const f = formations[fid];
        if (!f || f.status !== 'active' || isCorpsFormation(f)) continue; // not (yet) on the map: standing rule catches it later
        if (f.corps_id === target) continue;
        const maxDefer = e.max_defer_turns ?? DEFAULT_TRANSFER_MAX_DEFER_TURNS;
        const committed = isCommittedToCorpsOperation(state, f);
        if (committed && turn - e.trigger_turn < maxDefer) {
            report.deferred.push({ event_id: e.id, formation_id: fid });
            pendingByEvent.set(e.id, (pendingByEvent.get(e.id) ?? 0) + 1);
            continue;
        }
        const from = f.corps_id ?? null;
        if (committed) releaseFromCorpsOperations(state, fid as FormationId, from);
        f.corps_id = target as FormationId;
        report.transferred.push({ event_id: e.id, formation_id: fid, from_corps_id: from, to_corps_id: target, forced: committed });
        changed = true;
    }
    for (const e of sorted) {
        if (e.type !== 'corps_transfer' || e.trigger_turn > turn) continue;
        if (state.military.formation_lifecycle_events_fired?.[e.id] != null) continue;
        if ((pendingByEvent.get(e.id) ?? 0) > 0) continue;
        // Receipt once nothing governed by this event is waiting (target inactive or a
        // committed brigade deferring). A fully superseded event is receipted too: it has
        // nothing left to do. Receipts are informational; the rule itself stays standing.
        receipts(state)[e.id] = turn;
        report.completed_event_ids.push(e.id);
        changed = true;
    }

    if (!changed && report.deferred.length === 0) return null;
    if (changed) initializeCorpsCommand(state);
    return report;
}

function cancelOperation(
    state: GameState,
    corpsId: string,
    cmd: CorpsCommandState,
    op: CorpsCommandState['active_operations'][number],
    turn: number,
): void {
    // Canonical clean-removal path (same order as apply-op-halts): release officers,
    // close TGs / Army-HQ receipt, then drop the op. The recovery reason is never read
    // (the op is removed in the same call); 'manual_termination' is the closest existing value.
    releaseOperationCommander(state, op);
    if (op.tg_commander_officer_id) releaseTacticalCommander(state, op);
    enterOperationRecovery(state, corpsId as FormationId, op, turn, 'manual_termination');
    completeOperationLifecycle(state, corpsId as FormationId, op);
    removeOperation(cmd, op);
}
