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
]);

export function isDisplayEventEffectKind(kind: string): boolean {
  return !NON_DISPLAY_EVENT_EFFECT_KINDS.has(kind);
}

export function isDisplayEventEffect(effect: EventEffect): boolean {
  return effect.kind !== 'narrative' && isDisplayEventEffectKind(effect.kind);
}
