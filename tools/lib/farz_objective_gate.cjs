'use strict';

const { classifyCombatCapture } = require('./capture_provenance.cjs');

const FARZ_HQ_ID = /^ahq:RBiH:\d+:farz_95$/;

function checkFarzObjectiveCaptures({ cells, at188, events, battleById, aars, corpsOf, windowStart }) {
  const authored = aars.filter((aar) => FARZ_HQ_ID.test(aar.army_hq_telemetry?.army_hq_op_id || ''));
  const aar = authored.length === 1 ? authored[0] : null;
  const participants = aar?.participating_brigades || [];
  const secondCorpsParticipated = participants.some((id) => corpsOf(id) === 'arbih_2nd_corps');
  const rows = cells.map(([name, osid]) => {
    const captured = aar && Array.isArray(aar.objectives_logged_captured)
      && aar.objectives_logged_captured.includes(osid);
    const event = captured && events.find((e) => e.settlement_id === osid && e.to === 'RBiH'
      && e.mechanism === 'combat' && e.turn >= Math.max(windowStart, aar.started_turn)
      && e.turn <= aar.ended_turn
      && ['arbih_2nd_corps', 'arbih_3rd_corps'].includes(corpsOf(e.attacker_brigade))
      && classifyCombatCapture(e, battleById.get(e.battle_id)).operation_ids?.includes(aar.operation_id));
    return { name, osid, turn: event?.turn ?? null, ok: !!event && at188[osid] === 'RBiH' };
  });
  return { aar, authoredCount: authored.length, secondCorpsParticipated, rows,
    ok: !!aar && aar.started_turn >= windowStart && rows.every((row) => row.ok) };
}

module.exports = { checkFarzObjectiveCaptures };
