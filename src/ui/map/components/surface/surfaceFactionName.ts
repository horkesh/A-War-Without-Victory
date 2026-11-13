/**
 * surfaceFactionName — the player's side by its full, localized name, for surface
 * header eyebrows (the same `desk.faction.*` strings the Desk and Diplomacy use).
 *
 * Canonical owner: src/ui/map/components/surface/surfaceFactionName.ts
 */
import { t } from '../../i18n';

export function surfaceFactionName(faction: string | null | undefined): string {
  if (faction === 'RBiH') return t('desk.faction.rbih');
  if (faction === 'RS') return t('desk.faction.rs');
  if (faction === 'HRHB') return t('desk.faction.hrhb');
  return t('desk.faction.fallback');
}
