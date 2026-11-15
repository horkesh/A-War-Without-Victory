/**
 * Army clashes (command loop L7; proposal 2A step A1; owner decision 4, 2026-11-14).
 *
 * A clash is raised only by something the president actually did, at the moment he stages it
 * (stop an operation, request one, withhold a Level-1 plan, decline an opportunity), when the
 * order crosses the army's current campaign plan AND the army commander's compliance with that
 * order scores partial or refused. The president answers Accept (the army's version is staged
 * instead; free), Insist (the order stands; 15 Authority; an override on the army commander's
 * tolerance record) or Replace (the corps commander who would carry it out is replaced through the
 * existing lever; 25 Authority). Replace never reaches the army commander in 1.0.
 *
 * Player-only: written only for a live president (`isLivePresident`), only in the planning window
 * through desktop IPC. Headless and bot factions never carry these fields. Imported type-only by
 * `game_state.ts`, as `officer_types` is.
 */

import type { FactionId } from './game_state.js';

/** The presidential act that raised the clash. */
export type ArmyClashAct = 'stop_op' | 'request_op' | 'withhold_plan' | 'decline_opportunity';

/** How the act crosses the army's plan. */
export type ArmyClashConflict =
    /** Stop op: the operation is the plan's main effort. */
    | 'main_effort'
    /** Stop op: the operation's objectives lie inside the plan's offensive targets for that corps. */
    | 'plan_objective'
    /** Request op: the plan has the corps on economy of force or containment. */
    | 'economy_corps'
    /** Withhold: the plan belongs to a primary corps. */
    | 'primary_corps'
    /** Decline: staff recommended approval and every required check is green. */
    | 'staff_recommended';

/** The army's one bounded counter-order (what Accept stages instead). */
export type ArmyClashCounterOrder =
    /** Stop op: let the operation run on. */
    | 'continue_operation'
    /** Request op: withdraw the request and resubmit next week. */
    | 'resubmit_next_week'
    /** Withhold: let the corps launch its plan. */
    | 'launch_plan'
    /** Decline: approve the opportunity. */
    | 'approve_opportunity';

export type ArmyClashAnswer = 'accept' | 'insist' | 'replace';

/**
 * Receipt outcome. `lapsed`: unanswered by Advance, so the order stood as given and no override
 * was recorded. `noted`: the order crossed the plan but the army commander complies, so only a
 * Record line. `not_put`: a clash was due but the volume caps held it back.
 */
export type ArmyClashOutcome = ArmyClashAnswer | 'lapsed' | 'noted' | 'not_put';

/** An open clash (at most one per faction), answerable only in the turn it was raised. */
export interface ArmyClash {
    /** Deterministic: `CLASH_<turn>_<faction>`. */
    id: string;
    faction: FactionId;
    turn: number;
    act: ArmyClashAct;
    /** The corps that would carry out (or is denied) the order. */
    corps_id: string;
    /** The army commander who objects. */
    army_officer_id: string;
    conflict: ArmyClashConflict;
    compliance: 'partial' | 'refused';
    counter_order: ArmyClashCounterOrder;
    /** The staged order: operation name (stop), target settlement (request), plan id (withhold), opportunity proposal id (decline). */
    order_ref: string;
    /** The review row behind a withhold or decline, so Accept can restage it. */
    proposal_id?: string;
    /** Authority already staged for the order; Accept refunds it. */
    staged_cost: number;
    /** The corps commander's own go/no-go objection fired on the same order (both voices on one card). */
    corps_objection?: boolean;
    /** The previous clash this faction answered, so the card can refer back to it. */
    previous_clash_id?: string;
}

/** Durable receipt (bounded at 200, sorted by resolved turn then id). */
export interface ArmyClashReceipt {
    id: string;
    faction: FactionId;
    turn: number;
    act: ArmyClashAct;
    corps_id: string;
    army_officer_id: string;
    conflict: ArmyClashConflict;
    outcome: ArmyClashOutcome;
    resolved_turn: number;
    /** Authority the answer cost (0 for accept, lapsed, noted, not_put). */
    cost: number;
}

/** Volume bookkeeping (caps derive from turns; no randomness). */
export interface ArmyClashState {
    /** `<faction>:<calendar year>` -> clashes raised that year (at most 4). */
    raised_by_faction_year: Record<string, number>;
    /** Faction -> turn of its last raised clash (at least 8 weeks apart). */
    last_clash_turn_by_faction: Record<string, number>;
    /** Army officer id -> turn of the last clash he raised. */
    last_clash_turn_by_officer: Record<string, number>;
}
