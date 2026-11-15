'use strict';

/**
 * Army clashes (command loop L7; proposal 2A step A1; owner decision 4, 2026-11-14): the desktop
 * side of the president's answer. Detection lives in the sim (`raiseArmyClash`, reached through
 * the desktop_sim bundle); this module applies the answer at once, in the planning window, writing
 * only the clash fields, the staged order it concerns and (for Insist) the army commander's
 * override record. The war pipeline gains no step.
 *
 *   accept  : the army's version is staged instead, at that version's price: a withdrawn halt or
 *             request refunds the Authority staged for it; a restaged withheld plan or declined
 *             opportunity is an approval and pays the backing price (10 or 20), refused when
 *             unaffordable.
 *   insist  : the order stands as given; one override goes on the army commander's tolerance
 *             record (`recent_overrides`, read by army_co_lifecycle). 15 Authority.
 *   replace : the existing Replace-CO lever for the corps commander who would carry out the
 *             order (co_replacement.cjs), staged now so it lands this week. 25 Authority.
 *             Never the army commander in 1.0 (owner decision 4).
 *
 * The caller sweeps lapsed clashes (`sim.sweepLapsedArmyClashes`) before calling this.
 */

const { stageCoReplacement, REPLACE_CO_COST } = require('./co_replacement.cjs');
const { debitCommandAuthority, proposalBackingCost } = require('./autonomy_ipc_contract.cjs');

const ARMY_CLASH_INSIST_COST = 15;
const ARMY_CLASH_HISTORY_CAP = 200;
const ANSWERS = new Set(['accept', 'insist', 'replace']);

function compareIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function appendReceipt(meta, receipt) {
  const history = [...(Array.isArray(meta.army_clash_history) ? meta.army_clash_history : []), receipt]
    .sort((a, b) => a.resolved_turn - b.resolved_turn || compareIds(a.id, b.id));
  meta.army_clash_history = history.slice(Math.max(0, history.length - ARMY_CLASH_HISTORY_CAP));
}

/** Return Authority already staged for an order the president now withdraws. */
function refundCommandAuthority(state, cost) {
  const auth = state && state.military && state.military.command_authority;
  if (!auth || !(cost > 0)) return;
  const max = typeof auth.max === 'number' ? auth.max : auth.current + cost;
  auth.current = Math.min(max, auth.current + cost);
  auth.spent_this_turn = Math.max(0, (auth.spent_this_turn || 0) - cost);
  auth.lifetime_spent = Math.max(0, (auth.lifetime_spent || 0) - cost);
}

/** Stage the army's version of the order (Accept). Returns an error string or null. */
function stageArmyVersion(state, clash) {
  const turn = state.meta.turn;
  const cc = state.military && state.military.corps_command ? state.military.corps_command[clash.corps_id] : undefined;
  const reviews = Array.isArray(state.meta.pending_proposal_reviews) ? state.meta.pending_proposal_reviews : [];
  if (clash.act === 'stop_op') {
    if (cc && cc.pending_op_halt && cc.pending_op_halt.op_name === clash.order_ref) delete cc.pending_op_halt;
    refundCommandAuthority(state, clash.staged_cost);
    return null;
  }
  if (clash.act === 'request_op') {
    if (cc && cc.pending_op_directive && cc.pending_op_directive.target_osid === clash.order_ref) delete cc.pending_op_directive;
    refundCommandAuthority(state, clash.staged_cost);
    return null;
  }
  const review = reviews.find((row) => row && row.id === clash.proposal_id);
  if (!review) return 'proposal_not_found';
  // The army's version of a withheld plan or a declined opportunity is an approval, so it pays the
  // owner decision 1 backing price (10 or 20) like any other approval; refused when unaffordable
  // (game-designer seat, L7 ratification: otherwise withhold + Accept would skip the price).
  const backing = debitCommandAuthority(state, proposalBackingCost(review.proposed_action));
  if (!backing.ok) return backing.error;
  if (clash.act === 'withhold_plan') {
    review.accepted = true;
    review.resolved_turn = turn;
    if (cc) cc.player_op_response = { plan_id: clash.order_ref, approved: true, turn };
    return null;
  }
  // decline_opportunity: the staff's recommendation, approval, is recorded instead.
  if (review.opportunity_decision !== undefined) {
    review.opportunity_decision = 'approve';
    delete review.opportunity_decision_options;
  } else {
    review.accepted = true;
  }
  review.resolved_turn = turn;
  return null;
}

/** One override on the army commander's tolerance record (not the corps cowing counters). */
function recordArmyCommanderOverride(state, officerId, turn) {
  const officer = state.military && state.military.named_officers ? state.military.named_officers[officerId] : undefined;
  if (!officer) return;
  const history = Array.isArray(officer.recent_overrides) ? officer.recent_overrides : [];
  history.push({ turn, resolution: 'override' });
  history.sort((a, b) => a.turn - b.turn);
  officer.recent_overrides = history;
}

/**
 * Validate and apply the president's answer to the open clash, in place.
 * @param {object} state Raw canonical GameState (mutated only on success).
 * @param {{ clashId?: unknown, answer?: unknown }} payload
 * @returns {{ ok: true, cost: number } | { ok: false, error: string }}
 */
function recordArmyClashAnswer(state, payload) {
  const meta = state && state.meta;
  if (!meta) return { ok: false, error: 'no_state' };
  const playerFaction = meta.player_faction || null;
  if (!playerFaction) return { ok: false, error: 'no_player_faction' };
  const clashId = payload && typeof payload.clashId === 'string' ? payload.clashId : '';
  const answer = payload && typeof payload.answer === 'string' ? payload.answer : '';
  if (!clashId) return { ok: false, error: 'missing_clash_id' };
  if (!ANSWERS.has(answer)) return { ok: false, error: 'invalid_answer' };
  const open = Array.isArray(meta.army_clashes) ? meta.army_clashes : [];
  const clash = open.find((row) => row && row.id === clashId);
  if (!clash) return { ok: false, error: 'not_found' };
  if (clash.faction !== playerFaction) return { ok: false, error: 'wrong_faction' };
  if (clash.turn !== meta.turn) return { ok: false, error: 'clash_lapsed' };

  let cost = 0;
  if (answer === 'accept') {
    const reviewBefore = (Array.isArray(meta.pending_proposal_reviews) ? meta.pending_proposal_reviews : [])
      .find((row) => row && row.id === clash.proposal_id);
    const error = stageArmyVersion(state, clash);
    if (error) return { ok: false, error };
    cost = clash.act === 'withhold_plan' || clash.act === 'decline_opportunity'
      ? proposalBackingCost(reviewBefore && reviewBefore.proposed_action)
      : 0;
  } else if (answer === 'insist') {
    const debit = debitCommandAuthority(state, ARMY_CLASH_INSIST_COST);
    if (!debit.ok) return { ok: false, error: debit.error };
    recordArmyCommanderOverride(state, clash.army_officer_id, meta.turn);
    cost = ARMY_CLASH_INSIST_COST;
  } else {
    // Replace: the corps commander only (owner decision 4). The lever charges its own price.
    const staged = stageCoReplacement(state, { corpsId: clash.corps_id });
    if (!staged.ok) return { ok: false, error: staged.error };
    cost = REPLACE_CO_COST;
  }

  const remaining = open.filter((row) => row !== clash);
  if (remaining.length > 0) meta.army_clashes = remaining;
  else delete meta.army_clashes;
  appendReceipt(meta, {
    id: clash.id,
    faction: clash.faction,
    turn: clash.turn,
    act: clash.act,
    corps_id: clash.corps_id,
    army_officer_id: clash.army_officer_id,
    conflict: clash.conflict,
    outcome: answer,
    resolved_turn: meta.turn,
    cost,
  });
  return { ok: true, cost };
}

module.exports = { ARMY_CLASH_INSIST_COST, recordArmyClashAnswer, refundCommandAuthority };
