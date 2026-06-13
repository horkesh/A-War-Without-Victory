/**
 * @vitest-environment jsdom
 *
 * Warroom convoy/patron activity-art resolver (graceful fallback).
 *
 * UI/data-only, calibration-INERT. The six faction-tagged stills
 * (event_supply_convoy_<faction>.webp / event_patron_relations_<faction>.webp)
 * already ship in src/ui/map/assets/event_illustrations/, so the resolver's real
 * eager glob is populated. This suite proves both halves of the graceful-fallback
 * contract:
 *   - present asset → the mapped <stem>_<faction>.webp resolves to its hashed URL
 *     (the real glob for the public resolver; an injected glob for the pure core);
 *   - absent asset / unknown kind / non-canonical faction → `null`.
 *
 * Mirrors the eventIllustrationArt / verdictArt idiom (eager import.meta.glob +
 * faction-tagged basename suffix resolve + graceful null).
 */

import { describe, expect, it } from 'vitest';
import {
  WARROOM_ACTIVITY_TO_BASENAME_STEM,
  resolveWarroomActivityArt,
  resolveWarroomActivityArtFrom,
  type WarroomActivityFaction,
  type WarroomActivityKind,
} from '../../src/ui/map/data/warroomActivityArt.js';

const FACTIONS: readonly WarroomActivityFaction[] = ['RBiH', 'RS', 'HRHB'];
const KINDS: readonly WarroomActivityKind[] = ['convoy', 'patron'];

describe('warroomActivityArt — kind → basename stem mapping', () => {
  it('maps each activity kind to its event-illustration stem', () => {
    expect(WARROOM_ACTIVITY_TO_BASENAME_STEM).toEqual({
      convoy: 'event_supply_convoy',
      patron: 'event_patron_relations',
    });
  });
});

describe('resolveWarroomActivityArtFrom — pure core (injected glob)', () => {
  it('resolves the mapped <stem>_<faction>.webp when present', () => {
    const glob: Record<string, string> = {
      '../assets/event_illustrations/event_supply_convoy_RBiH.webp': '/assets/event_supply_convoy_RBiH-aaa.webp',
      '../assets/event_illustrations/event_patron_relations_RS.webp': '/assets/event_patron_relations_RS-bbb.webp',
    };
    expect(resolveWarroomActivityArtFrom(glob, 'convoy', 'RBiH')).toBe('/assets/event_supply_convoy_RBiH-aaa.webp');
    expect(resolveWarroomActivityArtFrom(glob, 'patron', 'RS')).toBe('/assets/event_patron_relations_RS-bbb.webp');
  });

  it('returns null for an absent asset', () => {
    expect(resolveWarroomActivityArtFrom({}, 'convoy', 'RBiH')).toBeNull();
    // present convoy, asked for patron → no match
    const glob = { '../assets/event_illustrations/event_supply_convoy_RBiH.webp': '/x.webp' };
    expect(resolveWarroomActivityArtFrom(glob, 'patron', 'RBiH')).toBeNull();
  });

  it('returns null for an unknown kind', () => {
    expect(resolveWarroomActivityArtFrom({}, 'siege' as unknown as WarroomActivityKind, 'RBiH')).toBeNull();
    expect(resolveWarroomActivityArtFrom({}, null, 'RBiH')).toBeNull();
    expect(resolveWarroomActivityArtFrom({}, undefined, 'RBiH')).toBeNull();
  });

  it('returns null for a non-canonical / nullish faction', () => {
    expect(resolveWarroomActivityArtFrom({}, 'convoy', 'JNA')).toBeNull();
    expect(resolveWarroomActivityArtFrom({}, 'convoy', null)).toBeNull();
    expect(resolveWarroomActivityArtFrom({}, 'convoy', undefined)).toBeNull();
    // never resolves a partial/loose faction string against a real-shaped glob
    const glob = { '../assets/event_illustrations/event_supply_convoy_RBiH.webp': '/x.webp' };
    expect(resolveWarroomActivityArtFrom(glob, 'convoy', 'RB')).toBeNull();
  });
});

describe('resolveWarroomActivityArt — real (shipped) glob', () => {
  it('every kind × faction resolves to its hashed faction-tagged still', () => {
    for (const kind of KINDS) {
      const stem = WARROOM_ACTIVITY_TO_BASENAME_STEM[kind];
      for (const faction of FACTIONS) {
        const url = resolveWarroomActivityArt(kind, faction);
        expect(url).not.toBeNull();
        // Hashed dist URL: <stem>_<faction>(-<hash>).webp.
        expect(url).toMatch(new RegExp(`${stem}_${faction}[^/]*\\.webp$`));
      }
    }
  });

  it('still returns null for a non-canonical faction against the real glob', () => {
    expect(resolveWarroomActivityArt('convoy', 'JNA')).toBeNull();
    expect(resolveWarroomActivityArt('patron', null)).toBeNull();
  });
});
