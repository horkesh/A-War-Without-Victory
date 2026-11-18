import type { EventEffect } from '../../../sim/events/event_types';

/**
 * Engine/audit-only effect kinds that must not surface as player-facing
 * mechanical previews. They are internal tuning knobs or ledger annotations,
 * not authored display copy.
 */
export const NON_DISPLAY_EVENT_EFFECT_KINDS = new Set<string>([
  'cost_ledger_annotation',
  'recruitment_modifier',
  'equipment_quality_modifier',
  'bot_priority_shift',
  'doctrine_constraint',
  'alliance_lock',
  // Retired 2026-11-17 (supply is connection, not stock): an old save's staged decision may still carry
  // one. The engine ignores it, so the player must not be shown it.
  'supply_delta',
]);

export function isDisplayEventEffectKind(kind: string): boolean {
  return !NON_DISPLAY_EVENT_EFFECT_KINDS.has(kind);
}

export function isDisplayEventEffect(effect: EventEffect): boolean {
  return effect.kind !== 'narrative' && isDisplayEventEffectKind(effect.kind);
}
