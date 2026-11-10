/**
 * Command Surface art — the explicit id → existing desk asset map for the six
 * command areas (4:3 packet thumbnails) and the action stills (16:9 consequence
 * stills) the DirectiveCard act layer and the Command Surface detail use.
 *
 * Re-map any id by editing the basename here; no other code change is needed.
 * Ids absent from the table resolve to null and the caller renders without art.
 * Resolution itself (per-id override `command_cards/<id>.webp`, then this table)
 * lives in the shared `presidentialCommandArt` resolver.
 *
 * Pure presentation: no engine/state touch.
 *
 * Canonical owner: src/ui/map/data/commandSurfaceArt.ts
 */

import { resolveCommandCardOverride, resolvePresidentialCommandArt } from './presidentialCommandArt';

export const COMMAND_CARD_DESK_ASSET: Readonly<Record<string, string>> = {
  // Command areas (4:3 → packet_thumbnails)
  cat_war_direction: 'packet_thumb_reserve_request.webp',
  cat_diplomacy: 'packet_thumb_peace_plan.webp',
  cat_home_front: 'packet_thumb_event_decision.webp',
  cat_command: 'packet_thumb_officer_matter.webp',
  cat_conscience: 'packet_thumb_paramilitary.webp',
  cat_record: 'packet_thumb_intelligence.webp',
  // Actions (16:9 → consequence_stills)
  act_authorize_op: 'consequence_reserve_deployment.webp',
  act_replace_commander: 'consequence_personnel_change.webp',
  act_patron_relations: 'consequence_negotiated_settlement.webp',
  act_convoy: 'consequence_humanitarian_access.webp',
  act_front_visit: 'consequence_public_pressure.webp',
};

/** Art URL for a command area or action id; null when none ships. */
export function resolveCommandCardArt(id: string, faction?: string | null): string | null {
  return resolvePresidentialCommandArt(id, COMMAND_CARD_DESK_ASSET, faction);
}

/**
 * Wide (5:1) banner art for a command area (surface redesign 2026-11-10): the
 * `command_cards/<id>_banner_<faction>.webp` cut when one ships, else the area's card.
 */
export function resolveCommandBannerArt(id: string, faction?: string | null): string | null {
  return resolveCommandCardOverride(`${id}_banner`, faction) ?? resolveCommandCardArt(id, faction);
}
