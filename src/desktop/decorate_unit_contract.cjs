/**
 * Decorate-a-Unit contract — pure logic for the player-initiated presidential
 * DECORATE-A-UNIT leadership action (Presidential Command Surface design §10,
 * deferred companion to the shipped front-visit action).
 *
 * The president chooses to decorate a formation (a morale / leadership gesture).
 * This module force-queues the ALREADY-AUTHORED `decorate_a_unit_<faction>` event
 * (data/scenarios/events/war_1993.json) into
 * `state.military.pending_event_decisions` so EventDecisionModal surfaces it.
 * ZERO new sim/event code — the event's authored effects (morale / cohesion /
 * military_credibility / internal_cohesion shifts, all double-edged), voluntary action cadence
 * (max_fires 5 / cooldown 10t), and branches are reused. This contract ADDS the
 * deterministic per-unit branch expansion so the PLAYER picks WHICH regular
 * formation to honour (we never auto-pick the unit).
 *
 * ⚠ BRIGHT LINE (design §5, non-§6 — keep it that way):
 * ONLY REGULAR MILITARY FORMATIONS are eligible — NEVER paramilitaries, militia,
 * phantom (JNA/HV) formations, or any unit associated with atrocities. The
 * eligible-kind allowlist below is the data gate that enforces this; there is no
 * glorification of irregular or war-crime-associated units. If the eligible set
 * is empty (no regular formation to honour), the "decorate one" path is omitted
 * and only the broad-citation / decline branches are offered.
 *
 * Determinism: pure over (state). No Math.random / no Date.now. Eligible
 * formations are iterated in strictCompare(id) order; the per-unit branches are
 * appended in that fixed order (deterministic by construction; player-IPC-only).
 */

/**
 * Regular fighting-formation kinds eligible for a presidential decoration.
 * Mirrors FormationKind in src/state/game_state.ts. DELIBERATELY excludes
 * 'paramilitary', 'militia', 'jna_phantom', 'hv_phantom' (the bright line) and
 * the non-combat 'army_hq' / support 'corps_asset' kinds. Corps and brigades are
 * the canonical regular formations a head of state would cite.
 */
const ELIGIBLE_REGULAR_KINDS = new Set(['corps', 'brigade']);

/**
 * Max number of per-unit "decorate this formation" branches to offer. The
 * president names ONE unit; offering every brigade would bury the choice, so we
 * cap to the highest-priority eligible formations (corps first, then brigades),
 * deterministically sorted. The broad-citation + decline branches are always
 * offered in addition.
 */
const MAX_UNIT_BRANCHES = 6;

const DECORATE_UNIT_EVENT_BY_FACTION = {
  RBiH: 'decorate_a_unit_rbih',
  RS: 'decorate_a_unit_rs',
  HRHB: 'decorate_a_unit_hrhb',
};

/** Returns the authored decorate-a-unit event id for a faction, or null. */
function decorateUnitEventIdForFaction(faction) {
  return DECORATE_UNIT_EVENT_BY_FACTION[faction] ?? null;
}

/** Stable string compare (mirrors strictCompare for the cjs boundary). */
function strictCompareStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Deterministically compute the eligible regular formations of the player
 * faction, sorted for stable per-unit branch ordering. NEVER returns a
 * paramilitary / militia / phantom unit (the bright line). Corps sort ahead of
 * brigades (so the headline formations are offered first), then by id.
 *
 * @returns Array<{ id, name, kind }>, capped to MAX_UNIT_BRANCHES.
 */
function eligibleRegularFormations(state, playerFaction) {
  const formations = state?.military?.formations;
  if (!formations || typeof formations !== 'object') return [];
  const out = [];
  for (const id of Object.keys(formations).sort(strictCompareStr)) {
    const f = formations[id];
    if (!f || typeof f !== 'object') continue;
    if (f.faction !== playerFaction) continue;
    if (f.status && f.status !== 'active') continue;
    const kind = typeof f.kind === 'string' ? f.kind : 'brigade'; // schema default
    if (!ELIGIBLE_REGULAR_KINDS.has(kind)) continue; // bright-line gate
    out.push({ id, name: typeof f.name === 'string' && f.name ? f.name : id, kind });
  }
  // Corps ahead of brigades, then by id (both already id-sorted within kind).
  out.sort((a, b) => {
    const rank = (k) => (k === 'corps' ? 0 : 1);
    if (rank(a.kind) !== rank(b.kind)) return rank(a.kind) - rank(b.kind);
    return strictCompareStr(a.id, b.id);
  });
  return out.slice(0, MAX_UNIT_BRANCHES);
}

/**
 * Compute decorate-a-unit availability for the player faction WITHOUT mutating
 * state. Used by both the read-only availability IPC and the force-queue
 * pre-checks. Gated by player-faction resolution + the event's action cadence;
 * there is NO reachability gate (a decoration is issued from the capital).
 *
 * @returns {{
 *   available: boolean,
 *   reason: string|null,
 *   eventId: string|null,
 *   currentTurn: number,
 *   firesLeft: number,
 *   maxFires: number,
 *   cooldownUntil: number|null,
 *   onCooldown: boolean,
 *   eligibleFormations: Array<{id,name,kind}>, // regular-only (bright line)
 * }}
 */
function computeDecorateUnitAvailability(state, playerFaction, eventDef) {
  const currentTurn = state?.meta?.turn ?? 0;
  const eventId = decorateUnitEventIdForFaction(playerFaction);

  const base = {
    available: false,
    reason: null,
    eventId,
    currentTurn,
    firesLeft: 0,
    maxFires: 0,
    cooldownUntil: null,
    onCooldown: false,
    eligibleFormations: [],
  };

  if (!playerFaction) return { ...base, reason: 'no_player_faction' };
  if (!eventId || !eventDef) return { ...base, reason: 'no_event' };

  const actionCadence = eventDef.action_cadence;
  if (!actionCadence) return { ...base, reason: 'no_action_cadence' };
  const maxFires = actionCadence.max_fires;
  const cooldownTurns = actionCadence.cooldown_turns;
  const fireCount = state?.military?.event_fire_counts?.[eventId] ?? 0;
  const lastFired = state?.military?.event_last_fired_turn?.[eventId];
  const firesLeft = Number.isFinite(maxFires) ? Math.max(0, maxFires - fireCount) : Infinity;
  const cooldownUntil =
    cooldownTurns > 0 && typeof lastFired === 'number' ? lastFired + cooldownTurns : null;
  const onCooldown = cooldownUntil != null && currentTurn < cooldownUntil;

  const eligibleFormations = eligibleRegularFormations(state, playerFaction);

  const out = {
    ...base,
    firesLeft: Number.isFinite(firesLeft) ? firesLeft : maxFires,
    maxFires: Number.isFinite(maxFires) ? maxFires : 0,
    cooldownUntil,
    onCooldown,
    eligibleFormations,
  };

  if (firesLeft <= 0) return { ...out, available: false, reason: 'exhausted' };
  if (onCooldown) return { ...out, available: false, reason: 'on_cooldown' };

  return { ...out, available: true, reason: null };
}

/**
 * The authored "decorate one steadfast formation" branch id for a faction. The
 * per-unit branches are CLONES of this template with the unit named, so the
 * effects/dimension_shifts come straight from the authored event (no fabricated
 * numbers).
 */
function steadfastBranchId(playerFaction) {
  if (playerFaction === 'RBiH') return 'decorate_steadfast_rbih';
  if (playerFaction === 'RS') return 'decorate_steadfast_rs';
  if (playerFaction === 'HRHB') return 'decorate_steadfast_hrhb';
  return null;
}

/**
 * Build the pending-event-decision payload that EventDecisionModal consumes.
 * The authored `decorate_steadfast_<faction>` template branch is EXPANDED into
 * one branch per eligible regular formation (the player picks WHICH unit — we
 * never auto-pick). The `decorate_broadly` / `decorate_decline` branches are
 * carried through unchanged. When there are no eligible regular formations, the
 * steadfast template is dropped entirely (only broad/decline offered) — the
 * bright line means there is simply no unit to single out.
 *
 * Each per-unit branch id is `<steadfast>__<formationId>` so the downstream
 * resolver still finds the authored template effects (the resolver should match
 * on the template prefix; the suffix is presentational targeting only). To keep
 * the existing resolver working WITHOUT engine changes, each cloned option also
 * carries the authored `effects` / `dimension_shifts` inline so resolution does
 * not depend on id lookup.
 *
 * @returns the PendingEventDecision-shaped object (or null if not buildable).
 */
function buildDecorateUnitPendingDecision(state, playerFaction, eventDef, availability) {
  if (!availability?.available) return null;
  const currentTurn = state?.meta?.turn ?? 0;
  const templateId = steadfastBranchId(playerFaction);
  const eligible = Array.isArray(availability.eligibleFormations) ? availability.eligibleFormations : [];

  const authored = Array.isArray(eventDef.response_options) ? eventDef.response_options : [];
  const template = authored.find((o) => o && o.id === templateId) || null;

  const options = [];
  for (const opt of authored) {
    if (!opt || !opt.id) continue;
    if (opt.id === templateId) {
      // Expand the steadfast template into one PER-UNIT branch (player picks).
      if (!template || eligible.length === 0) continue; // bright line: no unit → drop
      for (const f of eligible) {
        const cloned = { ...template };
        cloned.id = `${templateId}__${f.id}`;
        cloned.label = `Decorate ${f.name}`;
        // Carry authored effects/dimension_shifts inline so resolution is
        // id-independent (the engine resolver reads these off the option).
        if (Array.isArray(template.effects)) cloned.effects = template.effects.map((e) => ({ ...e }));
        if (Array.isArray(template.dimension_shifts)) {
          cloned.dimension_shifts = template.dimension_shifts.map((d) => ({ ...d }));
        }
        cloned.target_formation_id = f.id;
        options.push(cloned);
      }
    } else {
      options.push({ ...opt });
    }
  }

  // Defensive: if expansion produced nothing usable (no template + no other
  // branches), there is nothing to queue.
  if (options.length === 0) return null;

  const text = (eventDef.effect && eventDef.effect.text) || eventDef.title || eventDef.id;
  const respondingFaction = eventDef.responding_faction ?? playerFaction;

  const decision = {
    event_id: eventDef.id,
    event_title: eventDef.title || text,
    turn_fired: currentTurn,
    response_options: options,
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
  DECORATE_UNIT_EVENT_BY_FACTION,
  ELIGIBLE_REGULAR_KINDS,
  MAX_UNIT_BRANCHES,
  decorateUnitEventIdForFaction,
  eligibleRegularFormations,
  computeDecorateUnitAvailability,
  buildDecorateUnitPendingDecision,
};
