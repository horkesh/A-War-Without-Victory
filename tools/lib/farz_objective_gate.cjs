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

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT TIERS (Fable consult 10, orchestrator ruling §26, 2026-11-26).
//
// The Farz receipts split into GATES, checked at every merge in both modes, and SHAPE rows, which
// are recorded now and must be green at the end of the calibration pass. A TRIPWIRE, set from the
// 57 distinct 188-week runs on disk, bounds how far the shape may drift before a merge holds.
// The §6 half (the nine eastern municipalities) is NOT loosened: it now covers every ARBiH corps.
//
// The stopping line reads BOTH corps of the joint offensive (the old P-B read the 2nd Corps
// only and missed the 3rd Corps' Jelen 2 at Boljanić and Petrovo). A capture is warranted when the
// October 1995 reference has the cell RBiH, so a retake of a cell the reference keeps RBiH is not
// a stopping-line row (the old test flagged Maglaj Jablanica).

const JOINT_CORPS = ['arbih_2nd_corps', 'arbih_3rd_corps'];
const LATE_SCAN_START = 160;
// P-A liveness and the early-fall row both read week 177, the week of the Farz planning order
// (seats' ruling 2026-11-17; Uragan 95 ran 10-14 Sep 1995, BB1 file p.423).
const FARZ_LIVENESS_TURN = 177;
const TRIPWIRE_BOUNDS = Object.freeze({ maxEarlyFarzCells: 1, maxStoppingLineCells: 3, minFarzCellsAt188: 3, minAnchorsPassed: 29 });

const battleOperationIds = (battle) => {
  if (!battle) return [];
  const ids = Array.isArray(battle.contributing_operation_ids)
    ? battle.contributing_operation_ids.filter((id) => typeof id === 'string' && id.length > 0) : [];
  if (typeof battle.operation_id === 'string' && battle.operation_id.length > 0) ids.push(battle.operation_id);
  return [...new Set(ids)].sort();
};
const munOf = (osid) => String(osid).split(':')[1];
const distinct = (rows) => [...new Set(rows.map((r) => r.osid))].sort();

/**
 * GATE (§6, not loosened): a late RBiH combat capture in the nine eastern municipalities by a
 * formation of ANY ARBiH corps. The warrant is unchanged (RS in April 1995 and RBiH in October
 * 1995); the painted reference records no such cell there, so in practice every capture is a red,
 * and a red goes to the §6 panel.
 */
function easternCaptureGate({ events, ref, factionOf, easternMuns, fromTurn = LATE_SCAN_START }) {
  return events.filter((e) => (e.turn ?? -1) >= fromTurn && e.to === 'RBiH' && e.mechanism === 'combat'
    && easternMuns.includes(munOf(e.settlement_id)) && factionOf(e.attacker_brigade) === 'RBiH'
    && !(ref.apr1995[e.settlement_id] === 'RS' && ref.oct1995[e.settlement_id] === 'RBiH'))
    .map((e) => ({ osid: e.settlement_id, turn: e.turn, attacker: e.attacker_brigade }));
}

/**
 * GATE: every capture of a Farz cell (any week, any mechanism) and every late combat capture by a
 * 2nd or 3rd Corps formation is combat owned by an operation (`classifyCombatCapture`).
 */
function operationOwnershipGate({ events, battleById, cells, corpsOf, fromTurn = LATE_SCAN_START }) {
  const farzCells = cells.map(([, osid]) => osid);
  const out = [];
  for (const e of events) {
    if (e.to !== 'RBiH') continue;
    const isFarz = farzCells.includes(e.settlement_id);
    const isLateJoint = (e.turn ?? -1) >= fromTurn && e.mechanism === 'combat' && JOINT_CORPS.includes(corpsOf(e.attacker_brigade));
    if (!isFarz && !isLateJoint) continue;
    const p = classifyCombatCapture(e, battleById.get(e.battle_id));
    if (p.kind !== 'operation_owned') out.push({ osid: e.settlement_id, turn: e.turn, attacker: e.attacker_brigade, kind: p.kind, farz_cell: isFarz });
  }
  return out;
}

/**
 * GATE, P-A liveness: if any Farz objective is still not RBiH when week 177 begins, the authored
 * Farz must start in its window (from week 160) with a roster. Each such objective must then be
 * attacked by it (a battle at the cell owned by Farz or by its authored 2nd Corps half, Uragan 95),
 * or taken from week 177 by an operation-owned combat capture of the joint offensive's other
 * operations. Main's emergent run has Farz target only gornja Bočinja and the 2nd Corps' Slap 2 take
 * Spreča at t182; that capture is held to the ownership gate (G2), and which operation got the
 * credit is a SHAPE row. What fails here is a Farz that never starts, has no roster, or leaves an
 * objective neither attacked nor taken.
 * `battles` are `{ turn, battle }` rows; `stateAt(turn)` is the controller map at the end of `turn`.
 */
function farzLivenessGate({ cells, stateAt, farz, battles, events, battleById, windowStart = LATE_SCAN_START, livenessTurn = FARZ_LIVENESS_TURN }) {
  const aar = farz && farz.aar;
  const owners = [aar?.operation_id, farz?.partner?.operation_id].filter(Boolean);
  const before = stateAt(livenessTurn - 1);
  const started = !!aar && Number.isFinite(aar.started_turn) && aar.started_turn >= windowStart;
  const roster = !!aar && Array.isArray(aar.participating_brigades) && aar.participating_brigades.length > 0;
  const rows = [];
  for (const [name, osid] of cells) {
    if (before[osid] === 'RBiH') continue;
    if (!started || !roster) {
      rows.push({ name, osid, ok: false, reason: !aar ? 'no_authored_farz' : !started ? 'farz_not_started_in_window' : 'farz_has_no_roster' });
      continue;
    }
    const attack = battles.find(({ turn, battle }) => battle.target_osid === osid
      && turn >= aar.started_turn && battleOperationIds(battle).some((id) => owners.includes(id)));
    if (attack) { rows.push({ name, osid, ok: true, reason: 'attacked', attack_turn: attack.turn }); continue; }
    const taken = (events || []).find((e) => e.settlement_id === osid && e.to === 'RBiH' && e.mechanism === 'combat'
      && (e.turn ?? -1) >= livenessTurn && classifyCombatCapture(e, battleById.get(e.battle_id)).kind === 'operation_owned');
    rows.push(taken
      ? { name, osid, ok: true, reason: 'taken_by_operation', taken_turn: taken.turn,
        operation_ids: classifyCombatCapture(taken, battleById.get(taken.battle_id)).operation_ids }
      : { name, osid, ok: false, reason: 'neither_attacked_nor_taken' });
  }
  return { started, roster, rows, ok: rows.every((r) => r.ok) };
}

/** SHAPE: an RBiH capture of a Farz cell before week 177, from week 0, any mechanism. */
function earlyFarzFalls({ cells, events, battleById, before = FARZ_LIVENESS_TURN }) {
  const farzCells = cells.map(([, osid]) => osid);
  return events.filter((e) => e.to === 'RBiH' && farzCells.includes(e.settlement_id) && (e.turn ?? -1) < before)
    .map((e) => ({ osid: e.settlement_id, turn: e.turn, attacker: e.attacker_brigade,
      operation_ids: classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids ?? [] }));
}

/**
 * SHAPE, the stopping line: a late combat capture by a 2nd or 3rd Corps formation, outside the nine
 * eastern municipalities (those are the §6 gate), of a cell the October 1995 reference does not
 * have RBiH.
 */
function stoppingLineRows({ events, battleById, ref, corpsOf, easternMuns, fromTurn = LATE_SCAN_START }) {
  return events.filter((e) => (e.turn ?? -1) >= fromTurn && e.to === 'RBiH' && e.mechanism === 'combat'
    && JOINT_CORPS.includes(corpsOf(e.attacker_brigade)) && !easternMuns.includes(munOf(e.settlement_id))
    && ref.oct1995[e.settlement_id] !== 'RBiH')
    .map((e) => ({ osid: e.settlement_id, turn: e.turn, attacker: e.attacker_brigade, corps: corpsOf(e.attacker_brigade),
      operation_ids: classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids ?? [] }));
}

/** SHAPE: the run's anchor contract (`run_summary.json`), failed anchors named. Missing = unknown. */
function anchorContract(runSummary) {
  const ev = runSummary && runSummary.anchor_contract_evaluation;
  const checks = ev && Array.isArray(ev.anchor_checks) ? ev.anchor_checks : null;
  if (!checks || checks.length === 0) return { known: false, passed: null, total: null, failed: [] };
  const failed = checks.filter((a) => a.passed !== true).map((a) => a.anchor_id).sort();
  return { known: true, passed: checks.length - failed.length, total: checks.length, failed };
}

/**
 * TRIPWIRE ("hold and trace"): more than one Farz cell early, more than three stopping-line cells,
 * fewer than three Farz cells RBiH at week 188, or anchors under 29. An unknown anchor contract
 * trips (fail closed).
 */
function receiptTripwire({ earlyCells, stoppingCells, farzCellsAt188, anchors, bounds = TRIPWIRE_BOUNDS }) {
  const trips = [];
  if (earlyCells.length > bounds.maxEarlyFarzCells) trips.push(`${earlyCells.length} Farz cells fell early (bound ${bounds.maxEarlyFarzCells})`);
  if (stoppingCells.length > bounds.maxStoppingLineCells) trips.push(`${stoppingCells.length} stopping-line cells (bound ${bounds.maxStoppingLineCells})`);
  if (farzCellsAt188 < bounds.minFarzCellsAt188) trips.push(`${farzCellsAt188} Farz cells RBiH at w188 (bound ${bounds.minFarzCellsAt188})`);
  if (!anchors.known) trips.push('anchor contract missing from run_summary.json');
  else if (anchors.passed < bounds.minAnchorsPassed) trips.push(`anchors ${anchors.passed}/${anchors.total} (bound ${bounds.minAnchorsPassed})`);
  return trips;
}

module.exports = {
  checkFarzObjectiveCaptures, registeredFarzAarIds,
  JOINT_CORPS, LATE_SCAN_START, FARZ_LIVENESS_TURN, TRIPWIRE_BOUNDS,
  easternCaptureGate, operationOwnershipGate, farzLivenessGate, earlyFarzFalls, stoppingLineRows,
  anchorContract, receiptTripwire, distinctCells: distinct,
};
