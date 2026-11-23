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

/**
 * AAR ids of the operations the engine itself registered as the Farz Army HQ operation
 * (`state.military.army_hq_operations`, key `ahq:RBiH:<year>:farz_95`). `injectArmyHqOperations`
 * builds the op on the registration turn in the anchor corps, so its AAR id is exactly
 * `<anchor_corps_id>:<name>:t<formed_on_turn>`.
 *
 * Why (orchestrator ruling 2026-11-16): the AAR's `army_hq_telemetry` is built only from the
 * operation's Tactical Group, and whether a TG forms depends on the faction TG cap on the turn the
 * op becomes ready. A Farz that was injected as the Army HQ operation and took its objectives
 * failed P-A whenever the cap was full. The operation's own Army HQ identity answers the
 * provenance question directly; TG telemetry stays optional detail. Exact id match only, so no
 * other operation (another name, corps or start turn) is ever accepted.
 */
function registeredFarzAarIds(armyHqOperations) {
  const ids = new Set();
  for (const [id, rec] of Object.entries(armyHqOperations || {})) {
    if (!FARZ_HQ_ID.test(id) || !rec || rec.faction_id !== 'RBiH') continue;
    if (!rec.anchor_corps_id || !rec.name || !Number.isFinite(rec.formed_on_turn)) continue;
    ids.add(`${rec.anchor_corps_id}:${rec.name}:t${rec.formed_on_turn}`);
  }
  return ids;
}

function checkFarzObjectiveCaptures({ cells, at188, events, battleById, aars, corpsOf, windowStart, liveOperations, finalTurn, armyHqOperations, mode, earlyStart }) {
  const registered = registeredFarzAarIds(armyHqOperations);
  const authored = aars.filter((aar) => FARZ_HQ_ID.test(aar.army_hq_telemetry?.army_hq_op_id || '')
    || registered.has(aar.operation_id));
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

  // Seats' ruling (2026-11-17): an RBiH capture of a Farz cell before the September 1995 window
  // (in [earlyStart, windowStart)) is the early fall this guard exists to catch; it fails the cell
  // in both modes, even if RS retook it and RBiH took it again inside the window.
  const early = (osid) => (earlyStart != null && earlyStart < windowStart
    ? events.filter((e) => e.settlement_id === osid && e.to === 'RBiH' && e.mechanism === 'combat'
      && e.turn >= earlyStart && e.turn < windowStart)
    : []);
  // Emergent mode (freeze condition 7): any RBiH operation-owned combat capture inside the window
  // counts, whichever operation owned it. Probes, sweeps and other non-operation captures never do.
  const anyOperationReceipt = (osid) => events.find((e) => e.settlement_id === osid && e.to === 'RBiH'
    && e.mechanism === 'combat' && e.turn >= windowStart
    && (classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids ?? []).length > 0) || null;

  // Historical mode, third path (orchestrator ruling 2026-11-22 on the lane B two-seat sitting,
  // historian + operations-expert, the stricter set). Uragan 95 / Farz was one joint 2nd + 3rd Corps
  // offensive in September 1995 (BB1 printed pp. 384-388): the 2nd Corps' Spreča push and the 3rd
  // Corps' Ozren and Vozuća attacks ran side by side, and the owner ruling of 2026-09-29 lets either
  // corps make an objective's final capture. A cell may therefore also be taken by ANOTHER 2nd or
  // 3rd Corps operation of that offensive, when all of these hold:
  //   - the capture is an operation-owned combat capture by an operation O of the 2nd or 3rd Corps;
  //   - O started inside the window (t >= windowStart) and targeted this cell;
  //   - the capture came no earlier than the earlier of the authored Farz and Uragan starts, and no
  //     later than the authored Farz's end (Farz is still running);
  //   - the authored Farz itself took at least one cell (checked over the rows below).
  // A summer operation launched before the window, a capture before the joint launch, an incidental
  // capture by an operation aimed elsewhere, the 1st Corps or any other corps, probes and sweeps
  // never count. Early falls and the t188 holder are checked as for every path.
  const opById = new Map();
  for (const a of aars) if (a && a.operation_id) opById.set(a.operation_id, {
    corps_id: a.corps_id, started_turn: a.started_turn, objectives_targeted: a.objectives_targeted || [] });
  for (const { corps_id: corpsId, op } of liveOperations || []) {
    if (!op || !Number.isFinite(op.started_turn)) continue;
    const id = `${corpsId}:${op.name}:t${op.started_turn}`;
    if (!opById.has(id)) opById.set(id, { corps_id: corpsId, started_turn: op.started_turn, objectives_targeted: op.objectives || [] });
  }
  const jointStart = aar && aar.started_turn >= windowStart
    ? Math.min(aar.started_turn, partner ? partner.started_turn : Infinity)
    : null;
  const JOINT_CORPS = ['arbih_2nd_corps', 'arbih_3rd_corps'];
  const jointOperationOf = (e, osid) => (classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids ?? [])
    .find((id) => {
      const op = opById.get(id);
      return !!op && JOINT_CORPS.includes(op.corps_id) && op.started_turn >= windowStart
        && op.objectives_targeted.includes(osid);
    }) ?? null;
  const jointOperationReceipt = (osid) => (jointStart == null ? null : events.find((e) => e.settlement_id === osid
    && e.to === 'RBiH' && e.mechanism === 'combat'
    && e.turn >= Math.max(windowStart, jointStart) && e.turn <= aar.ended_turn
    && jointOperationOf(e, osid) !== null) || null);

  const emergent = mode === 'emergent';
  const found = cells.map(([name, osid]) => {
    const own = !emergent && aar ? receipt(aar, ['arbih_2nd_corps', 'arbih_3rd_corps'], osid, true) : null;
    const viaPartner = !emergent && !own && aar ? receipt(partner, ['arbih_2nd_corps'], osid) : null;
    const viaJoint = !emergent && !own && !viaPartner && aar ? jointOperationReceipt(osid) : null;
    const viaAny = emergent ? anyOperationReceipt(osid) : null;
    return { name, osid, own, viaPartner, viaJoint, viaAny };
  });
  // The third path needs the authored Farz to have taken at least one cell itself.
  const farzTookACell = found.some((f) => !!f.own);
  const rows = found.map(({ name, osid, own, viaPartner, viaJoint: joint, viaAny }) => {
    const earlyCaptures = early(osid);
    const viaJoint = farzTookACell ? joint : null;
    const event = own || viaPartner || viaJoint || viaAny;
    const jointOp = viaJoint ? jointOperationOf(viaJoint, osid) : null;
    return {
      name, osid, turn: event?.turn ?? null,
      via: own ? 'farz' : viaPartner ? 'uragan' : viaJoint ? 'joint' : viaAny ? 'operation' : null,
      ...(jointOp ? { operation_id: jointOp } : {}),
      early_captures: earlyCaptures.map((e) => ({ turn: e.turn,
        operation_ids: classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids ?? [] })),
      ok: !!event && earlyCaptures.length === 0 && at188[osid] === 'RBiH',
    };
  });
  const authoredOk = emergent || (!!aar && aar.started_turn >= windowStart);
  return { aar, partner, authoredCount: authored.length, provisional: !!aar?.provisional, secondCorpsParticipated, rows,
    mode: emergent ? 'emergent' : 'historical', ok: authoredOk && rows.every((row) => row.ok) };
}

module.exports = { checkFarzObjectiveCaptures, registeredFarzAarIds };
