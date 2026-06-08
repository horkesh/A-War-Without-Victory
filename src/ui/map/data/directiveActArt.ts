/**
 * directiveActArt — lever → 16:9 dossier-header art for the Decision Room
 * DirectiveCard act surface (Presidential Command Surface design §9 act layer).
 *
 * The art already ships: the `act_*` ids map to existing
 * `presidential_desk/consequence_stills/*.webp` stills (wired in
 * CommandCard's `COMMAND_CARD_DESK_ASSET`). This module is the small, explicit,
 * owner-editable table that says WHICH still each War-Direction lever shows as its
 * directive-card header. Resolution goes through the SHARED
 * `presidentialCommandArt` resolver (act_* id → consequence_stills basename), so
 * the glob pattern is never duplicated.
 *
 * Graceful fallback: a lever absent from the table (or whose mapped still fails to
 * resolve) returns null and the DirectiveCard renders its existing text-only
 * header — the card always works with zero art.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/directiveActArt.ts
 */

import type { PresidentialDecisionRoomDirective } from './presidentialDecisionRoom';
import {
  resolveCommandCardOverride,
  resolveDeskAssetByBasename,
} from './presidentialCommandArt';
import { COMMAND_CARD_DESK_ASSET } from '../components/warroom/CommandCard';

type DirectiveLever = PresidentialDecisionRoomDirective['lever'];

/**
 * Explicit, owner-editable lever → command-card `act_*` id map.
 *
 * The op / replace / front-visit ids resolve (via the shared resolver) to their
 * mapped 16:9 consequence-still:
 *   - act_authorize_op    → consequence_reserve_deployment (reserve / op art)
 *   - act_replace_commander → consequence_personnel_change (officer art)
 *   - act_front_visit     → consequence_public_pressure (public-pressure art)
 *
 * The §10 leadership-gesture ids carry their own per-faction command-card art and
 * resolve through the faction-aware override layer instead of a shared still:
 *   - act_address_nation  → command_cards/act_address_nation_<faction>.webp
 *   - act_decorate_unit   → command_cards/act_decorate_unit_<faction>.webp
 *
 * Operation levers (request/force/authorize/stop/elite-deploy) all read as
 * "commit forces" → the reserve-deployment still. replace_co → personnel change.
 * front_visit → public pressure. Re-map by editing this table; ids absent here
 * fall back to the text-only header.
 */
export const DIRECTIVE_LEVER_TO_ACT_ID: Readonly<Record<DirectiveLever, string>> = {
  request_op: 'act_authorize_op',
  force_launch: 'act_authorize_op',
  authorize_op: 'act_authorize_op',
  stop_op: 'act_authorize_op',
  elite_deploy: 'act_authorize_op',
  replace_co: 'act_replace_commander',
  front_visit: 'act_front_visit',
  // Leadership gestures (design §10 deferred actions) carry their own per-faction
  // command-card art (act_address_nation_<faction>.webp / act_decorate_unit_<faction>.webp,
  // resolved via the faction-aware override layer). Until the final generated art
  // lands, these files are temporary byte-identical copies of the front_visit art,
  // so the runtime image is unchanged while the wiring is correct.
  address_nation: 'act_address_nation',
  decorate_unit: 'act_decorate_unit',
};

/**
 * Resolve the 16:9 dossier-header art URL for a directive lever.
 *
 * Precedence: per-id override (`command_cards/<act_id>.webp`) → mapped
 * consequence-still → null (caller renders its text-only header).
 */
export function resolveDirectiveActArt(lever: DirectiveLever, faction?: string | null): string | null {
  const actId = DIRECTIVE_LEVER_TO_ACT_ID[lever];
  if (!actId) return null;
  // 1. Per-id override wins (faction-specific command_cards/<act_id>_<faction>.webp first,
  //    then the faction-agnostic command_cards/<act_id>.webp).
  const override = resolveCommandCardOverride(actId, faction);
  if (override) return override;
  // 2. Mapped consequence-still basename for this act id.
  const basename = COMMAND_CARD_DESK_ASSET[actId];
  if (basename) {
    const shared = resolveDeskAssetByBasename(basename);
    if (shared) return shared;
  }
  // 3. No art — caller falls back to the text-only header.
  return null;
}
