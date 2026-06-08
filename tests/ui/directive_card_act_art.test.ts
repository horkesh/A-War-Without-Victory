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
      // Leadership gestures (§10) carry their own per-faction command-card art,
      // resolved via the faction-aware override layer (act_address_nation_<faction>.webp
      // / act_decorate_unit_<faction>.webp). Until the final art lands these files
      // are temporary byte-identical copies of the front_visit art.
      address_nation: 'act_address_nation',
      decorate_unit: 'act_decorate_unit',
    });
  });

  it('resolves each consequence-still lever to its mapped 16:9 still', () => {
    // The op / replace / front-visit levers map to act ids whose only art is the
    // shared consequence-still family (no per-faction command-card override ships).
    const STILL_LEVERS: Lever[] = [
      'request_op',
      'force_launch',
      'authorize_op',
      'stop_op',
      'elite_deploy',
      'replace_co',
      'front_visit',
    ];
    const expectedBasename: Partial<Record<Lever, string>> = {
      request_op: 'consequence_reserve_deployment.webp',
      force_launch: 'consequence_reserve_deployment.webp',
      authorize_op: 'consequence_reserve_deployment.webp',
      stop_op: 'consequence_reserve_deployment.webp',
      elite_deploy: 'consequence_reserve_deployment.webp',
      replace_co: 'consequence_personnel_change.webp',
      front_visit: 'consequence_public_pressure.webp',
    };
    for (const lever of STILL_LEVERS) {
      const url = resolveDirectiveActArt(lever);
      expect(url, `lever ${lever} must resolve art`).not.toBeNull();
      expect(url!.endsWith(expectedBasename[lever]!)).toBe(true);
      // The art is the shared 16:9 consequence-still family (not a 4:3 thumbnail).
      expect(url).toContain('consequence_stills');
    }
  });

  it('resolves the §10 leadership gestures to their per-faction command-card art', () => {
    // address_nation / decorate_unit carry their own per-faction command-card art
    // (act_address_nation_<faction>.webp / act_decorate_unit_<faction>.webp). The
    // DirectiveCard always passes the player faction, so these resolve via the
    // faction-aware override layer rather than a shared consequence-still.
    const GESTURE_ACT: Partial<Record<Lever, string>> = {
      address_nation: 'act_address_nation',
      decorate_unit: 'act_decorate_unit',
    };
    for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
      for (const lever of ['address_nation', 'decorate_unit'] as Lever[]) {
        const url = resolveDirectiveActArt(lever, faction);
        expect(url, `lever ${lever} (${faction}) must resolve art`).not.toBeNull();
        expect(url!.endsWith(`${GESTURE_ACT[lever]}_${faction}.webp`)).toBe(true);
        expect(url).toContain('command_cards');
      }
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

describe('faction-aware command-card override resolution', () => {
  const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
  const CAT_IDS = [
    'cat_war_direction',
    'cat_command',
    'cat_diplomacy',
    'cat_home_front',
    'cat_conscience',
    'cat_record',
  ];
  const ACT_IDS = [
    'act_authorize_op',
    'act_replace_commander',
    'act_patron_relations',
    'act_convoy',
    'act_front_visit',
  ];

  it('resolves the faction-specific override for every category card × faction', () => {
    for (const faction of FACTIONS) {
      for (const id of CAT_IDS) {
        const url = resolveCommandCardArt(id, faction);
        expect(url, `${id} (${faction}) must resolve to a faction override`).not.toBeNull();
        expect(url!.endsWith(`${id}_${faction}.webp`)).toBe(true);
        expect(url).toContain('command_cards');
      }
    }
  });

  it('resolves the faction-specific override for every action card × faction', () => {
    for (const faction of FACTIONS) {
      for (const id of ACT_IDS) {
        const url = resolveCommandCardOverride(id, faction);
        expect(url, `${id} (${faction}) must resolve to a faction override`).not.toBeNull();
        expect(url!.endsWith(`${id}_${faction}.webp`)).toBe(true);
        expect(url).toContain('command_cards');
      }
    }
  });

  it('falls back to the shared desk asset when no faction override exists', () => {
    // An unknown faction has no `<id>_<faction>.webp`, and no faction-agnostic
    // `<id>.webp` ships, so resolution falls through to the mapped desk thumbnail.
    const url = resolveCommandCardArt('cat_war_direction', 'ZZ');
    expect(url).not.toBeNull();
    expect(url!.endsWith('packet_thumb_reserve_request.webp')).toBe(true);
  });

  it('directive act art prefers the faction-specific override', () => {
    const url = resolveDirectiveActArt('replace_co', 'HRHB');
    expect(url).not.toBeNull();
    expect(url!.endsWith('act_replace_commander_HRHB.webp')).toBe(true);
    expect(url).toContain('command_cards');
  });
});
