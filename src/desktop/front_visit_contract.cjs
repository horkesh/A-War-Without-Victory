/**
 * Front-Visit contract — pure logic for the player-initiated presidential
 * FRONT VISIT action (Presidential Command Surface design §10).
 *
 * The president chooses to visit the front (a morale/leadership gesture). This
 * module force-queues the ALREADY-AUTHORED `visit_to_front_<faction>` event
 * (data/scenarios/events/war_1993.json) into
 * `state.military.pending_event_decisions` so EventDecisionModal surfaces it.
 * ZERO new sim/event code — the event's authored effects (morale +5 / cohesion
 * +3 / patron_pressure -3 / standing shifts), recurrence (max_fires 5 /
 * cooldown 10t), and branches are reused verbatim.
 *
 * ⚠ ENCLAVE REACHABILITY GATE (owner constraint, 2026-06-01):
 * The president CANNOT visit a CUT-OFF enclave (Srebrenica / Žepa / Goražde,
 * Bihać-when-encircled). Visit branches are gated by the SUPPLY-CONNECTIVITY
 * signal already persisted in state: `state.political.last_supply_state_by_osid`
 * (per-OSID 'adequate' | 'strained' | 'critical', derived from the
 * supply-reachability BFS-from-sources — `critical` === isolated/cut-off; see
 * src/state/supply_reachability_osid.ts + supply_state_derivation.ts). Besieged
 * but corridored (Sarajevo via Butmir tunnel = 'strained') stays visitable;
 * truly encircled enclaves ('critical') are filtered out before queuing. A
 * branch's target area is reachable iff the player faction controls ≥1 OSID in
 * that area whose supply state is NOT 'critical'. The whole action is
 * unavailable when NO front branch is reachable.
 *
 * Determinism: pure over (state). No Math.random / no Date.now. All iteration
 * over sorted keys (deterministic by construction; player-IPC-only path).
 *
 * NOT-gated branches:
 *  - `stay_*`        — staying in the capital; no reachability needed.
 *  - `visit_press_*` — sensitive-history gate (authored `available_from_fire`),
 *                      intentionally LEFT UNCHANGED here.
 */

const FRONT_VISIT_EVENT_BY_FACTION = {
  RBiH: 'visit_to_front_rbih',
  RS: 'visit_to_front_rs',
  HRHB: 'visit_to_front_hrhb',
};

/**
 * Branch (response_option) id → target front area, expressed as OSID prefixes
 * (`op:<mun>:`). A branch is reachability-gated iff it appears here. Every
 * prefix was verified present in data/derived/operational/operational_initial_master.json.
 * `stay_*` and `visit_press_*` branches are deliberately ABSENT (not gated).
 */
const FRONT_VISIT_BRANCH_AREAS = {
  // RBiH (visit_to_front_rbih)
  visit_sarajevo: [
    'op:stari_grad_sarajevo:',
    'op:centar_sarajevo:',
    'op:novi_grad_sarajevo:',
    'op:novo_sarajevo:',
  ],
  visit_eastern_front: ['op:tuzla:'],
  visit_bihac: ['op:bihac:'],
  // RS (visit_to_front_rs)
  visit_posavina: ['op:brcko:', 'op:bosanski_samac:', 'op:modrica:'],
  visit_sarajevo_lines: ['op:novo_sarajevo:', 'op:ilidza:', 'op:ilijas:'],
  visit_drina_front: ['op:vlasenica:', 'op:bratunac:', 'op:zvornik:'],
  // HRHB (visit_to_front_hrhb)
  visit_mostar_front: ['op:mostar:', 'op:citluk:'],
  visit_central_bosnia: ['op:vitez:', 'op:novi_travnik:', 'op:busovaca:'],
  visit_posavina_hrhb: ['op:orasje:', 'op:odzak:'],
};

/** Returns the authored visit-to-front event id for a faction, or null. */
function frontVisitEventIdForFaction(faction) {
  return FRONT_VISIT_EVENT_BY_FACTION[faction] ?? null;
}

/**
 * Reachability gate for ONE branch: is the player faction's target front
 * corridored to the rear (NOT cut off)?
 *
 * @returns true iff the player faction controls ≥1 OSID in the branch's target
 *          area whose supply state is NOT 'critical'. Gated branches with no
 *          area entry return true (ungated — e.g. stay/press branches).
 */
function isBranchReachable(branchId, playerFaction, controllers, supplyByOsid) {
  const prefixes = FRONT_VISIT_BRANCH_AREAS[branchId];
  if (!prefixes) return true; // ungated branch (stay/press) — always offered
  const osids = Object.keys(controllers || {}).sort();
  for (const osid of osids) {
    if (controllers[osid] !== playerFaction) continue;
    let inArea = false;
    for (const pref of prefixes) {
      if (osid.startsWith(pref)) {
        inArea = true;
        break;
      }
    }
    if (!inArea) continue;
    // Controlled, in-area OSID. Cut off iff supply state is 'critical'.
    if (supplyByOsid?.[osid] !== 'critical') return true;
  }
  return false;
}

/**
 * Compute front-visit availability for the player faction WITHOUT mutating
 * state. Used by both the read-only availability IPC and the force-queue
 * pre-checks.
 *
 * @returns {{
 *   available: boolean,
 *   reason: string|null,        // machine-readable when unavailable
 *   eventId: string|null,
 *   currentTurn: number,
 *   firesLeft: number,          // max_fires - fire_count (>=0)
 *   maxFires: number,
 *   cooldownUntil: number|null, // turn the cooldown expires (exclusive lower bound)
 *   onCooldown: boolean,
 *   reachableBranchIds: string[],   // gated branches currently reachable
 *   unreachableBranchIds: string[], // gated branches currently cut-off
 * }}
 */
function computeFrontVisitAvailability(state, playerFaction, eventDef) {
  const currentTurn = state?.meta?.turn ?? 0;
  const eventId = frontVisitEventIdForFaction(playerFaction);

  const base = {
    available: false,
    reason: null,
    eventId,
    currentTurn,
    firesLeft: 0,
    maxFires: 0,
    cooldownUntil: null,
    onCooldown: false,
    reachableBranchIds: [],
    unreachableBranchIds: [],
  };

  if (!playerFaction) return { ...base, reason: 'no_player_faction' };
  if (!eventId || !eventDef) return { ...base, reason: 'no_event' };

  // ── Cooldown / cap (reuse the event's OWN recurrence, canonical state) ──────
  const recurrence = eventDef.recurrence || {};
  const maxFires = typeof recurrence.max_fires === 'number' ? recurrence.max_fires : Infinity;
  const cooldownTurns = typeof recurrence.cooldown_turns === 'number' ? recurrence.cooldown_turns : 0;
  const fireCount = state?.military?.event_fire_counts?.[eventId] ?? 0;
  const lastFired = state?.military?.event_last_fired_turn?.[eventId];
  const firesLeft = Number.isFinite(maxFires) ? Math.max(0, maxFires - fireCount) : Infinity;
  const cooldownUntil =
    cooldownTurns > 0 && typeof lastFired === 'number' ? lastFired + cooldownTurns : null;
  const onCooldown = cooldownUntil != null && currentTurn < cooldownUntil;

  // ── Reachability gate (filter front branches by supply connectivity) ────────
  const controllers = state?.political?.political_controllers || {};
  const supplyByOsid = state?.political?.last_supply_state_by_osid || {};
  const reachableBranchIds = [];
  const unreachableBranchIds = [];
  for (const opt of eventDef.response_options || []) {
    const id = opt?.id;
    if (!id || !(id in FRONT_VISIT_BRANCH_AREAS)) continue; // only gated front branches
    if (isBranchReachable(id, playerFaction, controllers, supplyByOsid)) {
      reachableBranchIds.push(id);
    } else {
      unreachableBranchIds.push(id);
    }
  }
  reachableBranchIds.sort();
  unreachableBranchIds.sort();

  const out = {
    ...base,
    firesLeft: Number.isFinite(firesLeft) ? firesLeft : maxFires,
    maxFires: Number.isFinite(maxFires) ? maxFires : 0,
    cooldownUntil,
    onCooldown,
    reachableBranchIds,
    unreachableBranchIds,
  };

  if (firesLeft <= 0) return { ...out, available: false, reason: 'exhausted' };
  if (onCooldown) return { ...out, available: false, reason: 'on_cooldown' };
  if (reachableBranchIds.length === 0) return { ...out, available: false, reason: 'all_cut_off' };

  return { ...out, available: true, reason: null };
}

/**
 * Build the pending-event-decision payload that EventDecisionModal consumes,
 * mirroring the push at src/sim/events/evaluate_events.ts:577. The authored
 * response_options are FILTERED to the reachable front branches plus the
 * always-available non-front branches (stay_* / press_*, the latter still
 * subject to its own authored available_from_fire gate downstream).
 *
 * @returns the PendingEventDecision-shaped object (or null if not buildable).
 */
function buildFrontVisitPendingDecision(state, playerFaction, eventDef, availability) {
  if (!availability?.available) return null;
  const currentTurn = state?.meta?.turn ?? 0;
  const reachable = new Set(availability.reachableBranchIds);

  const filteredOptions = (eventDef.response_options || []).filter((opt) => {
    const id = opt?.id;
    if (!id) return false;
    if (id in FRONT_VISIT_BRANCH_AREAS) {
      // gated front branch: keep only if reachable
      return reachable.has(id);
    }
    return true; // ungated branch (stay_* / press_*) — always offered
  });

  const text = (eventDef.effect && eventDef.effect.text) || eventDef.title || eventDef.id;
  const respondingFaction = eventDef.responding_faction ?? playerFaction;

  const decision = {
    event_id: eventDef.id,
    event_title: eventDef.title || text,
    turn_fired: currentTurn,
    response_options: filteredOptions,
    faction: respondingFaction,
  };
  if (eventDef.narrative) decision.narrative = eventDef.narrative;
  if (eventDef.category) decision.category = eventDef.category;
  if (eventDef.situation) decision.situation = eventDef.situation;
  if (eventDef.staff_assessment) decision.staff_assessment = eventDef.staff_assessment;
  if (Array.isArray(eventDef.trigger_evidence) && eventDef.trigger_evidence.length > 0) {
    decision.trigger_evidence = [...eventDef.trigger_evidence];
  }
  if (eventDef.historical_source) decision.historical_source = eventDef.historical_source;
  if (eventDef.source_note) decision.source_note = eventDef.source_note;
  if (eventDef.source) decision.source = eventDef.source;
  if (eventDef.requires_player_response != null) {
    decision.requires_player_response = eventDef.requires_player_response;
  }
  if (eventDef.historical_default_response_id) {
    decision.historical_default_response_id = eventDef.historical_default_response_id;
  }
  if (eventDef.staff_recommended_response_id) {
    decision.staff_recommended_response_id = eventDef.staff_recommended_response_id;
  }
  return decision;
}

module.exports = {
  FRONT_VISIT_EVENT_BY_FACTION,
  FRONT_VISIT_BRANCH_AREAS,
  frontVisitEventIdForFaction,
  isBranchReachable,
  computeFrontVisitAvailability,
  buildFrontVisitPendingDecision,
};
