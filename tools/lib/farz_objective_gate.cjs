'use strict';

const { classifyCombatCapture } = require('./capture_provenance.cjs');

const FARZ_HQ_ID = /^ahq:RBiH:\d+:farz_95$/;
// Uragan 95 is the 2nd Corps half of the same joint offensive (Delić judgment §§285,397-399;
// BB1 printed 386), modelled as its own pre-planned 2nd Corps operation with no Farz ownership.
// Owner ruling 2026-09-29 accepts a final capture by either corps; owner ruling 2026-11-07
// counts a 2nd Corps capture owned by the authored Uragan 95 operation, inside the Farz window,
// as a Farz receipt. Identified by its exact corps-qualified AAR id, never by name alone.
const URAGAN_AAR_ID = /^arbih_2nd_corps:Operation Uragan 95:t\d+$/;

/**
 * An AAR is written only when an operation closes, so a Farz still executing or recovering
 * at the run's last turn has none. Its receipt owner is then built from the live operation
 * in the final save, held to the same standard: the id is the AAR's own
 * `corps:name:t<started_turn>` form, so every objective still needs a logged, battle-recorded,
 * operation-owned combat capture inside the window. Only the AAR's self-reported capture
 * list is replaced, by the operation's authored objective list.
 */
function provisionalFarzOwner(liveOperations, finalTurn) {
  const live = (liveOperations || []).filter(({ op }) => FARZ_HQ_ID.test(op?.army_hq_op_id || ''));
  if (live.length !== 1 || !Number.isFinite(finalTurn)) return null;
  const { corps_id: corpsId, op } = live[0];
  return {
    operation_id: `${corpsId}:${op.name}:t${op.started_turn}`,
    army_hq_telemetry: { army_hq_op_id: op.army_hq_op_id },
    started_turn: op.started_turn,
    ended_turn: finalTurn,
    objectives_logged_captured: [...(op.objectives || [])],
    participating_brigades: [...(op.participating_brigades || [])],
    provisional: true,
  };
}

function checkFarzObjectiveCaptures({ cells, at188, events, battleById, aars, corpsOf, windowStart, liveOperations, finalTurn }) {
  const authored = aars.filter((aar) => FARZ_HQ_ID.test(aar.army_hq_telemetry?.army_hq_op_id || ''));
  const aar = authored.length === 1
    ? authored[0]
    : authored.length === 0 ? provisionalFarzOwner(liveOperations, finalTurn) : null;
  const partners = aars.filter((a) => URAGAN_AAR_ID.test(a.operation_id || '') && a.started_turn >= windowStart);
  const partner = aar && partners.length === 1 ? partners[0] : null;
  const participants = [...(aar?.participating_brigades || []), ...(partner?.participating_brigades || [])];
  const secondCorpsParticipated = participants.some((id) => corpsOf(id) === 'arbih_2nd_corps');

  // A logged, operation-owned combat capture by `owner`, made inside the Farz window.
  // The capturer must belong to one of `corps`, or (`countParticipants`) be one of the
  // owner's own logged participants from any corps: an Army HQ operation can take donor
  // brigades from other commands (RF-3 SD1, orchestrator ruling 2026-11-14: the General
  // Staff's 120th took Spreča inside Farz and the AAR logs it, but the corps-only reading
  // reported it unattributed). A non-participant from another corps still fails.
  const receipt = (owner, corps, osid, countParticipants = false) => (owner && Array.isArray(owner.objectives_logged_captured)
    && owner.objectives_logged_captured.includes(osid)
    && events.find((e) => e.settlement_id === osid && e.to === 'RBiH'
      && e.mechanism === 'combat' && e.turn >= Math.max(windowStart, aar.started_turn)
      && e.turn <= aar.ended_turn
      && (corps.includes(corpsOf(e.attacker_brigade))
        || (countParticipants && Array.isArray(owner.participating_brigades)
          && owner.participating_brigades.includes(e.attacker_brigade)))
      && classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids?.includes(owner.operation_id))) || null;

  const rows = cells.map(([name, osid]) => {
    const own = aar ? receipt(aar, ['arbih_2nd_corps', 'arbih_3rd_corps'], osid, true) : null;
    const viaPartner = !own && aar ? receipt(partner, ['arbih_2nd_corps'], osid) : null;
    const event = own || viaPartner;
    return {
      name, osid, turn: event?.turn ?? null,
      via: own ? 'farz' : viaPartner ? 'uragan' : null,
      ok: !!event && at188[osid] === 'RBiH',
    };
  });
  return { aar, partner, authoredCount: authored.length, provisional: !!aar?.provisional, secondCorpsParticipated, rows,
    ok: !!aar && aar.started_turn >= windowStart && rows.every((row) => row.ok) };
}

module.exports = { checkFarzObjectiveCaptures };
