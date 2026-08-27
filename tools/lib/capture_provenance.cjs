'use strict';

function classifyCombatCapture(event, battle) {
  if (!event || event.mechanism !== 'combat') {
    return { kind: 'non_combat', gates: true };
  }
  if (!event.battle_id || !battle) {
    return { kind: 'missing_battle_receipt', gates: true };
  }
  if (battle.battle_id !== event.battle_id
    || battle.target_osid !== event.settlement_id
    || battle.attacker_brigade !== event.attacker_brigade
    || battle.attacker_won !== true) {
    return { kind: 'contradictory_battle_receipt', gates: true };
  }
  const operationIds = Array.isArray(battle.contributing_operation_ids)
    ? battle.contributing_operation_ids.filter((id) => typeof id === 'string' && id.length > 0)
    : [];
  if (typeof battle.operation_id === 'string' && battle.operation_id.length > 0) {
    operationIds.push(battle.operation_id);
  }
  if (operationIds.length > 0) {
    return { kind: 'operation_owned', gates: false, operation_ids: [...new Set(operationIds)].sort() };
  }
  return { kind: 'operationless_or_unattributed', gates: true };
}

module.exports = { classifyCombatCapture };
