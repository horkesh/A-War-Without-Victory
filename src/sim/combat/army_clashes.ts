/**
 * Army clashes (command loop L7; proposal 2A step A1; owner decision 4, 2026-11-14).
 *
 * A clash is raised only by something the president actually did, at the moment he stages it, and
 * only when all three hold:
 *   (a) the act crosses the faction's current CampaignPlan (`detectPlanConflict`);
 *   (b) the army commander's compliance with that act, scored by the existing A3 formula against
 *       the verb it implies (request op: press offensive; stop, withhold, decline: hold), is
 *       anything short of `full`; the category (modified, partial, refused) is kept as the clash's
 *       severity. (Changed from "partial or refused, never modified" by Fable consult 1, appendix A,
 *       2026-11-15: the weekly bot-directive noise that rule guarded against cannot reach A1, which
 *       needs a real presidential act at corps scale and is capped at one open, four a year.)
 *   (c) the act concerns a corps operation or larger (all four acts do).
 * If (a) holds but (b) does not (full compliance, no army commander, or an acting one), the
 * objection is one silent Record line (`noted`). Volume: at most
 * one open clash per faction, at most 4 per faction per calendar year, at least 8 weeks between
 * clashes; anything over the caps is a `not_put` Record line. Frequency differences between
 * factions come from officer data, never from faction branches.
 *
 * Player-only: does nothing unless `isLivePresident(state)` and the acting faction is the player's.
 * Called only from desktop IPC in the planning window (through `desktop_sim`), never from the war
 * pipeline, so headless and bot runs are byte-identical by construction. Writes only
 * `meta.army_clashes`, `meta.army_clash_history` and `military.army_clash_state`.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type {
    ArmyClash,
    ArmyClashAct,
    ArmyClashConflict,
    ArmyClashCounterOrder,
    ArmyClashOutcome,
    ArmyClashReceipt,
    ArmyClashState,
} from '../../state/army_clash_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { turnToIsoDate } from '../replay/replay_frame_summary.js';
import { categoryForScore, computeArmyComplianceScore, type PoliticalDirectiveVerb } from './army_order_interpretation.js';
import type { CampaignPlan } from './army_hq_gathering_types.js';
import { getArmyCommander } from './officer_system.js';
import { OPERATION_OPPORTUNITY_CATALOG, OPPORTUNITY_PROPOSAL_ACTION_PREFIX } from './operation_opportunities.js';
import { isLivePresident } from './stance_matters.js';

export const ARMY_CLASH_MAX_PER_YEAR = 4;
export const ARMY_CLASH_MIN_GAP_TURNS = 8;
export const ARMY_CLASH_HISTORY_CAP = 200;

/** What the president did, as the staging handler saw it. */
export interface ArmyClashActInput {
    act: ArmyClashAct;
    /** The corps the order concerns. Optional for `decline_opportunity` (resolved from the catalog). */
    corpsId?: string;
    /** Stop: operation name. Request: target settlement. Withhold: plan id. Decline: opportunity proposal id. */
    orderRef: string;
    /** The review row behind a withhold or decline. */
    proposalId?: string;
    /** Authority already staged for the order (refunded on Accept). */
    stagedCost?: number;
    /** The corps commander's own go/no-go objection fired on the same order. */
    corpsObjection?: boolean;
}

export type ArmyClashRaiseResult =
    | { outcome: 'none' }
    | { outcome: 'noted' | 'not_put'; receiptId: string }
    | { outcome: 'raised'; clashId: string };

const VERB_FOR_ACT: Record<ArmyClashAct, PoliticalDirectiveVerb> = {
    request_op: 'PRESS_OFFENSIVE',
    stop_op: 'HOLD_AT_ALL_COSTS',
    withhold_plan: 'HOLD_AT_ALL_COSTS',
    decline_opportunity: 'HOLD_AT_ALL_COSTS',
};

const COUNTER_ORDER_FOR_ACT: Record<ArmyClashAct, ArmyClashCounterOrder> = {
    stop_op: 'continue_operation',
    request_op: 'resubmit_next_week',
    withhold_plan: 'launch_plan',
    decline_opportunity: 'approve_opportunity',
};

/** The calendar year a turn falls in (turn 0 is 6 April 1992). */
export function armyClashYear(turn: number): string {
    return turnToIsoDate(turn).slice(0, 4);
}

function currentPlan(state: GameState, faction: FactionId): CampaignPlan | null {
    const plan = state.military.campaign_plans?.[faction] ?? null;
    if (!plan) return null;
    return plan.valid_until_turn >= (state.meta.turn ?? 0) ? plan : null;
}

/** The corps a declined opportunity belongs to (its catalog primary corps). */
function opportunityCorps(state: GameState, proposalId: string): string | null {
    const proposal = (state.military.operation_opportunities ?? []).find((p) => p.proposal_id === proposalId);
    if (!proposal) return null;
    return OPERATION_OPPORTUNITY_CATALOG.find((def) => def.opportunity_id === proposal.opportunity_id)?.primary_corps ?? null;
}

function resolveCorps(state: GameState, input: ArmyClashActInput): string | null {
    if (input.act === 'decline_opportunity') return input.corpsId ?? opportunityCorps(state, input.orderRef);
    return input.corpsId ?? null;
}

/**
 * Pure: how (if at all) the act crosses the faction's army plan. Reads the current CampaignPlan
 * only while `valid_until_turn >= turn` (stop, request, withhold); a decline reads the staff
 * recommendation and the opportunity's required checks.
 */
export function detectPlanConflict(state: GameState, faction: FactionId, input: ArmyClashActInput): ArmyClashConflict | null {
    const corpsId = resolveCorps(state, input);
    if (!corpsId) return null;

    if (input.act === 'decline_opportunity') {
        const review = (state.meta.pending_proposal_reviews ?? []).find((r) => r.faction === faction
            && r.proposed_action === `${OPPORTUNITY_PROPOSAL_ACTION_PREFIX}${input.orderRef}`);
        if (!review || review.proposed_value !== 'approve') return null;
        const proposal = (state.military.operation_opportunities ?? []).find((p) => p.proposal_id === input.orderRef);
        if (!proposal || proposal.status !== 'eligible_pending_review') return null;
        const required = (proposal.last_axis_evaluation ?? []).filter((e) => e.mode === 'required');
        return required.every((e) => e.green) ? 'staff_recommended' : null;
    }

    const plan = currentPlan(state, faction);
    if (!plan) return null;
    const priority = plan.front_priorities.find((fp) => fp.corps_id === corpsId) ?? null;

    if (input.act === 'stop_op') {
        const isMainEffort = plan.synchronized_operations.some((op) => op.participants
            .some((p) => p.corps_id === corpsId && p.role === 'main_effort'));
        if (isMainEffort) return 'main_effort';
        const op = (state.military.corps_command?.[corpsId]?.active_operations ?? []).find((o) => o.name === input.orderRef);
        const offensiveTargets = new Set(priority?.offensive_targets ?? []);
        if (op && offensiveTargets.size > 0) {
            const objectives = [
                ...(op.target_settlements ?? []),
                ...(op.axes ?? []).flatMap((axis) => axis.objectives ?? []),
            ];
            if (objectives.some((osid) => offensiveTargets.has(osid))) return 'plan_objective';
        }
        return null;
    }
    if (input.act === 'request_op') {
        return priority && (priority.role === 'economy' || priority.role === 'contain') ? 'economy_corps' : null;
    }
    // withhold_plan
    return priority?.role === 'primary' ? 'primary_corps' : null;
}

/**
 * Pure: the army commander's compliance with the act (the A3 formula). Null when there is no army
 * commander or he is acting (acting commanders always comply, as in A3).
 */
export function armyComplianceForAct(
    state: GameState,
    faction: FactionId,
    act: ArmyClashAct,
): { officerId: string; category: ReturnType<typeof categoryForScore> } | null {
    const commander = getArmyCommander(faction, state);
    if (!commander || commander.state.acting_commander) return null;
    return { officerId: commander.data.id, category: categoryForScore(computeArmyComplianceScore(commander.data, VERB_FOR_ACT[act])) };
}

function emptyClashState(): ArmyClashState {
    return { raised_by_faction_year: {}, last_clash_turn_by_faction: {}, last_clash_turn_by_officer: {} };
}

function uniqueId(state: GameState, base: string): string {
    const taken = new Set([
        ...(state.meta.army_clashes ?? []).map((c) => c.id),
        ...(state.meta.army_clash_history ?? []).map((r) => r.id),
    ]);
    if (!taken.has(base)) return base;
    for (let n = 2; ; n += 1) {
        const candidate = `${base}_${n}`;
        if (!taken.has(candidate)) return candidate;
    }
}

/** Append a receipt, keep the history sorted by resolved turn then id, bounded at the cap. */
export function appendArmyClashReceipt(state: GameState, receipt: ArmyClashReceipt): void {
    const history = [...(state.meta.army_clash_history ?? []), receipt]
        .sort((a, b) => a.resolved_turn - b.resolved_turn || strictCompare(a.id, b.id));
    state.meta.army_clash_history = history.slice(Math.max(0, history.length - ARMY_CLASH_HISTORY_CAP));
}

/** The last clash this faction was actually shown (any answer, or lapsed). */
function previousClashId(state: GameState, faction: FactionId): string | undefined {
    const shown: ReadonlySet<ArmyClashOutcome> = new Set(['accept', 'insist', 'replace', 'lapsed']);
    const rows = (state.meta.army_clash_history ?? []).filter((r) => r.faction === faction && shown.has(r.outcome));
    return rows.length > 0 ? rows[rows.length - 1]!.id : undefined;
}

/**
 * Move every open clash raised before this turn to the history as `lapsed`: unanswered by Advance,
 * the order stood as given and no override was recorded. Called before raising and answering.
 */
export function sweepLapsedArmyClashes(state: GameState): number {
    const open = state.meta.army_clashes ?? [];
    if (open.length === 0) return 0;
    const turn = state.meta.turn ?? 0;
    const lapsed = open.filter((c) => c.turn < turn);
    if (lapsed.length === 0) return 0;
    for (const clash of [...lapsed].sort((a, b) => strictCompare(a.id, b.id))) {
        appendArmyClashReceipt(state, {
            id: clash.id, faction: clash.faction, turn: clash.turn, act: clash.act, corps_id: clash.corps_id,
            army_officer_id: clash.army_officer_id, conflict: clash.conflict, outcome: 'lapsed', resolved_turn: turn, cost: 0,
        });
    }
    const remaining = open.filter((c) => c.turn >= turn);
    if (remaining.length > 0) state.meta.army_clashes = remaining;
    else delete state.meta.army_clashes;
    return lapsed.length;
}

/**
 * Run detection for one staged presidential act and record the result: an open clash, a `noted`
 * or `not_put` Record line, or nothing. Live president and the player's own faction only.
 */
export function raiseArmyClash(state: GameState, faction: FactionId, input: ArmyClashActInput): ArmyClashRaiseResult {
    if (!isLivePresident(state) || state.meta.player_faction !== faction) return { outcome: 'none' };
    if (state.meta.phase !== 'war') return { outcome: 'none' };
    sweepLapsedArmyClashes(state);

    const conflict = detectPlanConflict(state, faction, input);
    if (!conflict) return { outcome: 'none' };
    const corpsId = resolveCorps(state, input)!;
    const turn = state.meta.turn ?? 0;
    const compliance = armyComplianceForAct(state, faction, input.act);
    const receiptBase = {
        faction, turn, act: input.act, corps_id: corpsId,
        army_officer_id: compliance?.officerId ?? '', conflict, resolved_turn: turn, cost: 0,
    };

    if (!compliance || compliance.category === 'full') {
        const id = uniqueId(state, `CLASH_${turn}_${faction}`);
        appendArmyClashReceipt(state, { id, ...receiptBase, outcome: 'noted' });
        return { outcome: 'noted', receiptId: id };
    }

    const clashState = state.military.army_clash_state ?? emptyClashState();
    const yearKey = `${faction}:${armyClashYear(turn)}`;
    const lastTurn = clashState.last_clash_turn_by_faction[faction];
    const overCap = (state.meta.army_clashes ?? []).some((c) => c.faction === faction)
        || (clashState.raised_by_faction_year[yearKey] ?? 0) >= ARMY_CLASH_MAX_PER_YEAR
        || (typeof lastTurn === 'number' && turn - lastTurn < ARMY_CLASH_MIN_GAP_TURNS);
    if (overCap) {
        const id = uniqueId(state, `CLASH_${turn}_${faction}`);
        appendArmyClashReceipt(state, { id, ...receiptBase, outcome: 'not_put' });
        return { outcome: 'not_put', receiptId: id };
    }

    const id = uniqueId(state, `CLASH_${turn}_${faction}`);
    const previous = previousClashId(state, faction);
    const clash: ArmyClash = {
        id, faction, turn, act: input.act, corps_id: corpsId, army_officer_id: compliance.officerId,
        conflict, compliance: compliance.category, counter_order: COUNTER_ORDER_FOR_ACT[input.act],
        order_ref: input.orderRef,
        ...(input.proposalId ? { proposal_id: input.proposalId } : {}),
        staged_cost: Math.max(0, input.stagedCost ?? 0),
        ...(input.corpsObjection ? { corps_objection: true } : {}),
        ...(previous ? { previous_clash_id: previous } : {}),
    };
    state.meta.army_clashes = [...(state.meta.army_clashes ?? []), clash].sort((a, b) => strictCompare(a.id, b.id));
    clashState.raised_by_faction_year[yearKey] = (clashState.raised_by_faction_year[yearKey] ?? 0) + 1;
    clashState.last_clash_turn_by_faction[faction] = turn;
    clashState.last_clash_turn_by_officer[compliance.officerId] = turn;
    state.military.army_clash_state = clashState;
    return { outcome: 'raised', clashId: id };
}
