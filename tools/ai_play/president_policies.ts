/**
 * Three test Presidents for the Authority economy (Fable consult 1 appendix C, revised; ratified
 * in L7 #670, proposal §5D). Used by `desktop_calibration_compare.ts --president <kind>`.
 *
 *   hands_off : answers nothing that costs Authority and initiates nothing.
 *   engaged   : every gesture as soon as it is off cooldown and affordable (front visit, address to
 *               the nation, decoration, strategic posture review); a Request-op every 8th week; a
 *               Stop-op on the plan's main-effort operation every 12th week; Insist on every army
 *               clash; backs every corps proposal he is asked.
 *   meddler   : as engaged, with a Request-op every 4th week and a Stop-op every 6th.
 *
 * The Stop-op was added on 2026-11-15: RBiH's plan holds no field corps back, so no Request-op
 * could ever cross it, and the clash line was untestable.
 *
 * Every act goes through the desktop's own contracts and helpers, in the order the desktop runs
 * them (availability, Authority debit, staged order or queued decision, fire bookkeeping), so the
 * measurement reflects what a player at the desk would pay. When he cannot afford everything in a
 * week, gestures go first. Each refusal is recorded with its kind.
 *
 * Request-op target: the President is meant to cross the army's plan so clashes can fire, so he
 * prefers a corps the current campaign plan holds on economy or containment; otherwise the corps
 * with the most enemy contact. The objective is that corps' first buildable enemy settlement on its
 * front (checked with the same `queryDirectiveObjection` the desktop uses before staging).
 *
 * Played-test options (package "1994-95 attack and defence", 2026-11-16), all opt-in; without them the
 * President behaves exactly as above:
 *   requestAxis      : concentrate every Request-op on the named corps (one or several) and on
 *                      targets in the named municipalities (one axis). With several corps, each
 *                      request week stages one Request-op per corps (each paid in Authority), so
 *                      several corps converge on the axis. No buildable axis target records a refusal.
 *   requestEvery     : the Request-op cadence in weeks (default 8 engaged / 4 meddler); 1 orders
 *                      every week, a sustained push.
 *   requestOnly      : spend Command Authority on Request-ops only (no gestures, Stop-ops or
 *                      backing), as a President set on one push would. Every order is still paid.
 *   preferExhausted  : among candidate corps, prefer one whose corps exhaustion is above the planning
 *                      gate (MAX_EXHAUSTION_FOR_OPERATION), so an exhausted corps is ordered forward.
 * With either option set, each staged Request-op also leaves a `request_details` record (corps
 * exhaustion at the order, objection, cost, clash) that the compare tool joins to the operation's
 * after-action report.
 */

import { createRequire } from 'node:module';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import { raiseArmyClash } from '../../src/sim/combat/army_clashes.js';
import { queryDirectiveObjection } from '../../src/desktop/desktop_sim.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../../src/sim/combat/bot_constants.js';

const requireCjs = createRequire(import.meta.url);
/* eslint-disable @typescript-eslint/no-explicit-any */
const frontVisit = requireCjs('../../src/desktop/front_visit_contract.cjs');
const addressNation = requireCjs('../../src/desktop/address_nation_contract.cjs');
const decorateUnit = requireCjs('../../src/desktop/decorate_unit_contract.cjs');
const postureReview = requireCjs('../../src/desktop/strategic_posture_review_contract.cjs');
const opDirective = requireCjs('../../src/desktop/op_directive_staging.cjs');
const opHalt = requireCjs('../../src/desktop/op_halt.cjs');
const ipcContract = requireCjs('../../src/desktop/autonomy_ipc_contract.cjs');
const clashIpc = requireCjs('../../src/desktop/army_clash_ipc.cjs');

export type PresidentKind = 'hands_off' | 'engaged' | 'meddler';

/** Opt-in played-test options. Absent: the President behaves exactly as before. */
export interface PresidentPolicyOptions {
    requestAxis?: { corpsIds: string[]; municipalities: string[] };
    preferExhausted?: boolean;
    /** Request-op cadence in weeks (1 = every week). Absent: 8 engaged, 4 meddler. */
    requestEvery?: number;
    /** Spend Authority on Request-ops only: no gestures, Stop-ops or backing. */
    requestOnly?: boolean;
}

/** One staged Request-op, recorded only when a played-test option is set. */
export interface PresidentRequestDetail {
    turn: number;
    corps_id: string;
    target_osid: string;
    /** The operation the inject-op-directive step builds from this order. */
    operation_name: string;
    /**
     * Bound after the week resolves (compare tool): the start turn of the operation this order
     * created, or the rejection recorded for this order's own attempt. Unbound: neither was seen.
     */
    injected_started_turn?: number;
    rejection?: { reason: string; turn: number };
    corps_exhaustion_at_order: number;
    above_planning_gate: boolean;
    forced_over_objection: boolean;
    ca_cost: number;
    clash: string | null;
}

export interface PresidentTurnLog {
    gestures: string[];
    requests: string[];
    stops: string[];
    clashes: string[];
    backed: string[];
    /** Acts he wanted but could not take, each `<kind>:<reason>`. */
    refusals: string[];
    /** Present only when a played-test option is set. */
    request_details?: PresidentRequestDetail[];
}

export function emptyPresidentTurnLog(): PresidentTurnLog {
    return { gestures: [], requests: [], stops: [], clashes: [], backed: [], refusals: [] };
}

function current(state: GameState): number {
    return state.military.command_authority?.current ?? Infinity;
}

function debit(state: GameState, cost: number): boolean {
    return ipcContract.debitCommandAuthority(state, cost).ok;
}

function recordFire(state: GameState, eventId: string): void {
    const military = state.military as Record<string, any>;
    military.event_fire_counts ??= {};
    military.event_fire_counts[eventId] = (military.event_fire_counts[eventId] ?? 0) + 1;
    military.event_last_fired_turn ??= {};
    military.event_last_fired_turn[eventId] = state.meta.turn;
}

/** Front visit, address, decoration: availability, debit, queue the decision, record the fire. */
function queuedGesture(
    state: GameState,
    faction: FactionId,
    kind: string,
    eventId: string | null,
    def: any,
    available: (s: GameState, f: FactionId, d: any) => any,
    build: (s: GameState, f: FactionId, d: any, a: any) => any,
    cost: number,
    log: PresidentTurnLog,
): void {
    if (!eventId || !def) return;
    const availability = available(state, faction, def);
    if (!availability.available) return; // on cooldown, cut off, pending: he does not want it now
    if (current(state) < cost) { log.refusals.push(`${kind}:insufficient_ca`); return; }
    const decision = build(state, faction, def, availability);
    if (!decision) return;
    debit(state, cost);
    (state.military.pending_event_decisions ??= []).push(decision);
    recordFire(state, eventId);
    log.gestures.push(kind);
}

function applyGestures(state: GameState, faction: FactionId, defs: Map<string, any>, log: PresidentTurnLog): void {
    const visitId = frontVisit.frontVisitEventIdForFaction(faction);
    queuedGesture(state, faction, 'front_visit', visitId, defs.get(visitId), frontVisit.computeFrontVisitAvailability,
        frontVisit.buildFrontVisitPendingDecision, ipcContract.FRONT_VISIT_COST, log);
    const addressId = addressNation.addressNationEventIdForFaction(faction);
    queuedGesture(state, faction, 'address_nation', addressId, defs.get(addressId), addressNation.computeAddressNationAvailability,
        addressNation.buildAddressNationPendingDecision, ipcContract.ADDRESS_NATION_COST, log);
    const decorateId = decorateUnit.decorateUnitEventIdForFaction(faction);
    queuedGesture(state, faction, 'decorate_unit', decorateId, defs.get(decorateId), decorateUnit.computeDecorateUnitAvailability,
        decorateUnit.buildDecorateUnitPendingDecision, ipcContract.DECORATE_UNIT_COST, log);

    const reviewId = postureReview.strategicPostureReviewEventIdForFaction(faction);
    const reviewDef = defs.get(reviewId);
    if (reviewId && reviewDef) {
        const availability = postureReview.computeStrategicPostureReviewAvailability(state, faction, reviewDef);
        if (availability.available) {
            const result = postureReview.initiateStrategicPostureReviewOnState(state, faction, reviewDef, ipcContract.STRATEGIC_POSTURE_REVIEW_COST);
            if (result.ok) log.gestures.push('posture_review');
            else log.refusals.push(`posture_review:${result.reason ?? result.error ?? 'refused'}`);
        }
    }
}

/**
 * The corps he orders forward: one the plan holds back if any (crosses the plan), else the busiest front.
 * With `requestAxis`, only that corps and only targets in the axis municipalities. With
 * `preferExhausted`, a corps above the planning gate sorts first.
 */
export function requestCandidates(state: GameState, faction: FactionId, opts?: PresidentPolicyOptions): Array<{ corpsId: string; targets: string[] }> {
    const enemyByCorps = new Map<string, Set<string>>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {}) as any[]) {
        if (!sector?.corps_id || sector.faction !== faction) continue;
        const set = enemyByCorps.get(sector.corps_id) ?? new Set<string>();
        for (const sub of sector.sub_segments ?? []) for (const osid of sub.enemy_osids ?? []) set.add(osid);
        enemyByCorps.set(sector.corps_id, set);
    }
    const plan = state.military.campaign_plans?.[faction];
    const heldBack = new Set((plan && plan.valid_until_turn >= state.meta.turn ? plan.front_priorities : [])
        .filter((fp) => fp.role === 'economy' || fp.role === 'contain').map((fp) => fp.corps_id));
    const exhausted = (corpsId: string) => (state.military.corps_command?.[corpsId]?.corps_exhaustion ?? 0) > MAX_EXHAUSTION_FOR_OPERATION;
    const axis = opts?.requestAxis;
    const inAxis = (osid: string) => !axis || axis.municipalities.some((m) => osid.startsWith(`op:${m}:`));
    return [...enemyByCorps.entries()]
        .filter(([corpsId]) => !axis || axis.corpsIds.includes(corpsId))
        .map(([corpsId, targets]) => [corpsId, new Set([...targets].filter(inAxis))] as const)
        .filter(([, targets]) => targets.size > 0)
        .sort((a, b) => (opts?.preferExhausted ? Number(exhausted(b[0])) - Number(exhausted(a[0])) : 0)
            || Number(heldBack.has(b[0])) - Number(heldBack.has(a[0])) || b[1].size - a[1].size || strictCompare(a[0], b[0]))
        .map(([corpsId, targets]) => ({ corpsId, targets: [...targets].sort(strictCompare) }));
}

/**
 * The order several axis corps are served in a request week. With `preferExhausted`, corps above
 * the planning gate come first (Codex review on #742: in plain id order an exhausted 3rd Corps lost
 * its Authority to a buildable 2nd Corps request); then corps id.
 */
export function axisCorpsOrder(state: GameState, corpsIds: readonly string[], preferExhausted: boolean): string[] {
    const exhausted = (corpsId: string): number =>
        (state.military.corps_command?.[corpsId]?.corps_exhaustion ?? 0) > MAX_EXHAUSTION_FOR_OPERATION ? 1 : 0;
    return [...corpsIds].sort((a, b) => (preferExhausted ? exhausted(b) - exhausted(a) : 0) || strictCompare(a, b));
}

async function applyRequestOp(state: GameState, faction: FactionId, baseDir: string, log: PresidentTurnLog, opts?: PresidentPolicyOptions): Promise<void> {
    // Several axis corps: one Request-op per corps per request week (each paid and checked alone),
    // in axisCorpsOrder so --request-prefer-exhausted reaches the exhausted corps first.
    const axis = opts?.requestAxis;
    if (axis && axis.corpsIds.length > 1) {
        for (const corpsId of axisCorpsOrder(state, axis.corpsIds, opts?.preferExhausted === true)) {
            await applyOneRequestOp(state, faction, baseDir, log, { ...opts, requestAxis: { ...axis, corpsIds: [corpsId] } });
        }
        return;
    }
    await applyOneRequestOp(state, faction, baseDir, log, opts);
}

async function applyOneRequestOp(state: GameState, faction: FactionId, baseDir: string, log: PresidentTurnLog, opts?: PresidentPolicyOptions): Promise<void> {
    if (current(state) < opDirective.REQUEST_OP_COST) { log.refusals.push('request_op:insufficient_ca'); return; }
    for (const candidate of requestCandidates(state, faction, opts).slice(0, 3)) {
        if (state.military.corps_command?.[candidate.corpsId]?.pending_op_directive) continue;
        for (const targetOsid of candidate.targets.slice(0, 5)) {
            const objection = await queryDirectiveObjection(state, { corpsId: candidate.corpsId, targetOsid }, baseDir);
            if (objection && typeof objection.rejectionReason === 'string') continue;
            const forced = objection ? objection.recommendedAction !== 'launch' : false;
            const staged = opDirective.stageOpDirective(state, { corpsId: candidate.corpsId, targetOsid, ...(forced ? { forced_over_objection: true } : {}) }, {});
            if (!staged.ok) { log.refusals.push(`request_op:${staged.error}`); return; }
            log.requests.push(`${candidate.corpsId}->${targetOsid}`);
            const pending = state.military.corps_command?.[candidate.corpsId]?.pending_op_directive as any;
            const raised = raiseArmyClash(state, faction, {
                act: 'request_op', corpsId: candidate.corpsId, orderRef: targetOsid,
                stagedCost: pending?.ca_cost ?? opDirective.REQUEST_OP_COST, corpsObjection: pending?.forced_over_objection === true,
            });
            let clash: string | null = null;
            if (raised.outcome === 'raised') {
                const answer = clashIpc.recordArmyClashAnswer(state, { clashId: raised.clashId, answer: 'insist' });
                if (answer.ok) { log.clashes.push(`insist:${raised.clashId}`); clash = `insist:${raised.clashId}`; }
                else log.refusals.push(`insist:${answer.error}`);
            } else if (raised.outcome !== 'none') {
                log.clashes.push(`${raised.outcome}:${raised.receiptId}`);
                clash = `${raised.outcome}:${raised.receiptId}`;
            }
            if (opts && (opts.requestAxis || opts.preferExhausted || opts.requestEvery != null || opts.requestOnly)) {
                const exhaustion = state.military.corps_command?.[candidate.corpsId]?.corps_exhaustion ?? 0;
                (log.request_details ??= []).push({
                    turn: state.meta.turn, corps_id: candidate.corpsId, target_osid: targetOsid,
                    operation_name: `Presidential Directive — ${targetOsid}`,
                    corps_exhaustion_at_order: exhaustion, above_planning_gate: exhaustion > MAX_EXHAUSTION_FOR_OPERATION,
                    forced_over_objection: pending?.forced_over_objection === true,
                    ca_cost: pending?.ca_cost ?? opDirective.REQUEST_OP_COST, clash,
                });
            }
            return;
        }
    }
    log.refusals.push(opts?.requestAxis ? 'request_op:no_buildable_axis_target' : 'request_op:no_buildable_target');
}

/**
 * The corps carrying the army plan's main effort: a `main_effort` participant of a synchronized
 * operation, else the plan's `primary` corps (RBiH: the 2nd Corps). Null without a valid plan.
 */
function mainEffortCorps(state: GameState, faction: FactionId): string | null {
    const plan = state.military.campaign_plans?.[faction];
    if (!plan || plan.valid_until_turn < state.meta.turn) return null;
    const syncMain = plan.synchronized_operations
        .flatMap((op) => op.participants.filter((p) => p.role === 'main_effort').map((p) => p.corps_id))
        .sort(strictCompare)[0];
    return syncMain ?? plan.front_priorities.find((fp) => fp.role === 'primary')?.corps_id ?? null;
}

/**
 * Stop-op on the main-effort corps' operation (re-spec 2026-11-15): the act that crosses RBiH's plan,
 * so the clash line can be tested. Mirrors the desktop `stage-op-halt-order` handler, then raises the
 * clash exactly as it does and answers Insist.
 */
function applyStopOp(state: GameState, faction: FactionId, log: PresidentTurnLog): 'done' | 'no_operation' | 'refused' {
    const corpsId = mainEffortCorps(state, faction);
    const ops = corpsId ? (state.military.corps_command?.[corpsId]?.active_operations ?? []) : [];
    const op = [...ops].filter((o) => o.phase !== 'recovery').sort((a, b) => strictCompare(a.name, b.name))[0];
    if (!corpsId || !op) return 'no_operation';
    const staged = opHalt.stageOpHalt(state, { corpsId, opName: op.name });
    if (!staged.ok) {
        log.refusals.push(/insufficient/.test(staged.error) ? 'stop_op:insufficient_ca' : `stop_op:${staged.error}`);
        return 'refused';
    }
    log.stops.push(`${corpsId}:${op.name}`);
    const pending = state.military.corps_command?.[corpsId]?.pending_op_halt as any;
    const raised = raiseArmyClash(state, faction, {
        act: 'stop_op', corpsId, orderRef: pending?.op_name ?? op.name, stagedCost: pending?.ca_cost ?? opHalt.STOP_OP_COST,
    });
    if (raised.outcome === 'raised') {
        const answer = clashIpc.recordArmyClashAnswer(state, { clashId: raised.clashId, answer: 'insist' });
        if (answer.ok) log.clashes.push(`insist:${raised.clashId}`);
        else log.refusals.push(`insist:${answer.error}`);
    } else if (raised.outcome !== 'none') {
        log.clashes.push(`${raised.outcome}:${raised.receiptId}`);
    }
    return 'done';
}

/**
 * A due Stop-op carries over week by week until the main-effort corps has an operation to stop (a
 * President who means to halt it waits for it to run). One harness process runs one President, so
 * module state is enough. Cleared once he stops it or is refused for lack of Authority.
 */
let stopOpDue = false;

/**
 * Back every corps operation and campaign opportunity he is asked to back, mirroring the desktop
 * accept-proposal handler: debit `proposalBackingCost` (10 for APPROVE_OP, 20 for OPPORTUNITY),
 * then mark the review accepted. For an opportunity that is all the handler does; the war
 * pipeline's `apply-resolved-opportunity-decisions` step reads the accepted flag next turn.
 * Historical operations stay with `--historical-operation-policy`.
 */
function backProposals(state: GameState, faction: FactionId, log: PresidentTurnLog): void {
    const reviews = [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((r) => r.faction === faction && typeof r.proposed_action === 'string'
            && (r.proposed_action.startsWith('APPROVE_OP:') || r.proposed_action.startsWith('OPPORTUNITY:')))
        .filter((r) => r.accepted == null && r.resolved_turn == null)
        .sort((a, b) => strictCompare(a.id, b.id));
    for (const review of reviews) {
        if (!debit(state, ipcContract.proposalBackingCost(review.proposed_action))) { log.refusals.push('back:insufficient_ca'); continue; }
        review.accepted = true;
        review.resolved_turn = state.meta.turn;
        if (review.proposed_action.startsWith('APPROVE_OP:')) {
            const [, corpsId, planId] = review.proposed_action.split(':');
            const corps = state.military.corps_command?.[corpsId!] as Record<string, unknown> | undefined;
            if (corps) corps.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn };
        }
        log.backed.push(review.id);
    }
}

/**
 * One week of the President's own acts, run before the week's decisions are answered (so the
 * gesture decisions he queues are answered the same week, as at the desk). `turnIndex` counts from
 * 0 at the first week played.
 */
export async function applyPresidentPolicy(
    state: GameState,
    faction: FactionId,
    kind: PresidentKind,
    turnIndex: number,
    eventDefs: Map<string, any>,
    baseDir: string,
    log: PresidentTurnLog,
    opts?: PresidentPolicyOptions,
): Promise<void> {
    if (kind === 'hands_off') return;
    const requestEvery = opts?.requestEvery ?? (kind === 'meddler' ? 4 : 8);
    if (opts?.requestOnly) {
        if (turnIndex % requestEvery === requestEvery - 1) await applyRequestOp(state, faction, baseDir, log, opts);
        return;
    }
    applyGestures(state, faction, eventDefs, log);
    if (turnIndex % requestEvery === requestEvery - 1) await applyRequestOp(state, faction, baseDir, log, opts);
    const stopEvery = kind === 'meddler' ? 6 : 12;
    if (turnIndex % stopEvery === stopEvery - 1) stopOpDue = true;
    if (stopOpDue && applyStopOp(state, faction, log) !== 'no_operation') stopOpDue = false;
    backProposals(state, faction, log);
}

/**
 * Played test: each staged Request-op joined to what became of it. The inject-op-directive step names
 * the operation `Presidential Directive — <target>`; a finished one has an after-action report in
 * `state.operation_history`, a running one is still in the corps' active operations, and a refused
 * one leaves `op_directive_rejection`. The compare tool binds each order after the week that consumed it.
 */
export function bindPresidentRequestAttempts(requests: PresidentRequestDetail[], state: GameState, weekStartTurn: number): void {
    // Codex review on #706: the corps' op_directive_rejection holds only the LATEST rejection and a
    // later order can reuse the same operation name, so each outcome is bound to its own attempt
    // right after the week that consumed it resolves. A rejection counts only when it names this
    // order's target and was written this week; an operation only when it carries this order's
    // name and corps and started this week.
    const weekEndTurn = state.meta.turn;
    const inWeek = (turn: number | undefined): boolean => turn != null && turn >= weekStartTurn && turn <= weekEndTurn;
    const history = (state.operation_history ?? []) as Array<Record<string, any>>;
    for (const request of requests) {
        if (request.injected_started_turn != null || request.rejection) continue;
        const command = state.military.corps_command?.[request.corps_id];
        const rejection = command?.op_directive_rejection;
        if (rejection && rejection.target_osid === request.target_osid && inWeek(rejection.turn)) {
            request.rejection = { reason: rejection.reason, turn: rejection.turn };
            continue;
        }
        const live = (command?.active_operations ?? []).find((op) => op.name === request.operation_name && inWeek(op.started_turn));
        const closed = history.find((a) => a.operation_name === request.operation_name && a.corps_id === request.corps_id && inWeek(a.started_turn));
        const started = live?.started_turn ?? closed?.started_turn;
        if (started != null) request.injected_started_turn = started;
    }
}

/**
 * Each staged Request-op joined to what became of ITS OWN attempt (bound by
 * `bindPresidentRequestAttempts`): the after-action report or live operation with this order's
 * name, corps and start turn, or the rejection recorded for this order. Objectives are the AAR's
 * canonical `objectives_captured` (it carries engagement receipts and replayed losses).
 */
export function joinPresidentRequests(requests: PresidentRequestDetail[], state: GameState) {
    const history = (state.operation_history ?? []) as Array<Record<string, any>>;
    return requests.map((request) => {
        if (request.rejection) {
            return { ...request, result: { status: 'rejected', reason: request.rejection.reason, turn: request.rejection.turn } };
        }
        const started = request.injected_started_turn;
        if (started == null) return { ...request, result: { status: 'not_found' } };
        const aar = history.find((a) => a.operation_name === request.operation_name && a.corps_id === request.corps_id && a.started_turn === started);
        if (aar) {
            return { ...request, result: {
                status: 'completed', outcome: aar.outcome ?? null, recovery_reason: aar.recovery_reason ?? null,
                started_turn: aar.started_turn ?? null, ended_turn: aar.ended_turn ?? null, total_attacks: aar.total_attacks ?? null,
                killed_suffered: aar.casualties_suffered?.killed ?? null, killed_inflicted: aar.casualties_inflicted?.killed ?? null,
                objectives_captured: [...(aar.objectives_captured ?? [])].sort(strictCompare),
            } };
        }
        const running = (state.military.corps_command?.[request.corps_id]?.active_operations ?? [])
            .find((op) => op.name === request.operation_name && op.started_turn === started);
        return { ...request, result: running
            ? { status: 'running', phase: running.phase, started_turn: started }
            : { status: 'not_found', started_turn: started } };
    });
}
