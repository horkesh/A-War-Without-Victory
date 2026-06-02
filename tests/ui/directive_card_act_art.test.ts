/**
 * @vitest-environment jsdom
 *
 * DirectiveCard 16:9 dossier-header art (Presidential Command Surface §9 act layer).
 *
 * Covers (UI-only, byte-identical — reuses existing consequence_stills via the
 * SHARED presidentialCommandArt resolver):
 *   - every directive lever resolves to its mapped `act_*` consequence-still
 *   - the lever→act-id table matches the owner-locked mapping
 *   - a lever whose art does not resolve renders the text-only header (fallback)
 *   - the shared resolver still backs CommandCard (no glob duplication regression)
 */

import { describe, expect, it } from 'vitest';
import {
  DIRECTIVE_LEVER_TO_ACT_ID,
  resolveDirectiveActArt,
} from '../../src/ui/map/data/directiveActArt.js';
import {
  resolveDeskAssetByBasename,
  resolveCommandCardOverride,
  resolvePresidentialCommandArt,
} from '../../src/ui/map/data/presidentialCommandArt.js';
import {
  COMMAND_CARD_DESK_ASSET,
  resolveCommandCardArt,
} from '../../src/ui/map/components/warroom/CommandCard.js';
import type { PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom.js';

type Lever = PresidentialDecisionRoomDirective['lever'];

const ALL_LEVERS: Lever[] = [
  'request_op',
  'stop_op',
  'force_launch',
  'authorize_op',
  'replace_co',
  'elite_deploy',
  'front_visit',
];

describe('DirectiveCard act-layer lever → art map', () => {
  it('maps every lever to the owner-locked act id', () => {
    expect(DIRECTIVE_LEVER_TO_ACT_ID).toEqual({
      request_op: 'act_authorize_op',
      force_launch: 'act_authorize_op',
      authorize_op: 'act_authorize_op',
      stop_op: 'act_authorize_op',
      elite_deploy: 'act_authorize_op',
      replace_co: 'act_replace_commander',
      front_visit: 'act_front_visit',
    });
  });

  it('resolves each lever to its mapped 16:9 consequence-still', () => {
    const expectedBasename: Record<Lever, string> = {
      request_op: 'consequence_reserve_deployment.webp',
      force_launch: 'consequence_reserve_deployment.webp',
      authorize_op: 'consequence_reserve_deployment.webp',
      stop_op: 'consequence_reserve_deployment.webp',
      elite_deploy: 'consequence_reserve_deployment.webp',
      replace_co: 'consequence_personnel_change.webp',
      front_visit: 'consequence_public_pressure.webp',
    };
    for (const lever of ALL_LEVERS) {
      const url = resolveDirectiveActArt(lever);
      expect(url, `lever ${lever} must resolve art`).not.toBeNull();
      expect(url!.endsWith(expectedBasename[lever])).toBe(true);
      // The art is the shared 16:9 consequence-still family (not a 4:3 thumbnail).
      expect(url).toContain('consequence_stills');
    }
  });

  it('falls back to the text-only header (null) for an unmapped lever', () => {
    // A lever not in the table resolves to null → DirectiveCard renders its
    // existing text header. The card always works with zero art.
    const unmapped = 'no_such_lever' as Lever;
    expect(resolveDirectiveActArt(unmapped)).toBeNull();
  });

  it('falls back to null when the mapped act id has no still on disk', () => {
    // Resolver-level fallback proof: an act id that is NOT in the desk-asset map
    // (and has no override) resolves to null, exercising the same graceful path
    // the DirectiveCard relies on when nothing maps.
    expect(resolvePresidentialCommandArt('act_does_not_exist', COMMAND_CARD_DESK_ASSET)).toBeNull();
  });
});

describe('shared presidentialCommandArt resolver (no glob duplication)', () => {
  it('still backs CommandCard category resolution', () => {
    // CommandCard.resolveCommandCardArt delegates to the shared resolver; a mapped
    // category must still resolve to its packet thumbnail.
    const url = resolveCommandCardArt('cat_war_direction');
    expect(url).not.toBeNull();
    expect(url!.endsWith('packet_thumb_reserve_request.webp')).toBe(true);
    expect(url).toContain('packet_thumbnails');
  });

  it('resolves shared desk assets by basename and returns null for unknown ones', () => {
    expect(resolveDeskAssetByBasename('consequence_personnel_change.webp')).not.toBeNull();
    expect(resolveDeskAssetByBasename('does_not_exist.webp')).toBeNull();
  });

  it('returns null for a command_cards override that does not exist', () => {
    expect(resolveCommandCardOverride('totally_unmapped_id')).toBeNull();
  });
});
