/**
 * Player-facing text must spell Bosnian place names correctly.
 *
 * This is correctness, not polish. The game is set in Bosnia; rendering "Bihac" where "Bihać"
 * is meant is the same class of error as misspelling a person's name. The 2026-09-03 showcase
 * audit recorded the class (`Ilijaš`/`Ilijas` inside a single card), and on 2026-09-10
 * `inbox.openingBrief.RBiH.bullet.0` — the first text an RBiH player reads — carried "Bihac"
 * in BOTH locales while the same files spelled "Bihać" correctly elsewhere.
 *
 * The checker under test was drafted by the local executor model and reviewed by the planner
 * (see tools/local_executor/README.md). Its boundary semantics were correct as proposed.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BOSNIAN_PLACE_NAMES, findStrippedPlaceNames } from '../../src/ui/shared/bosnianPlaceNames';

const LOCALE_FILES = [
  'src/ui/map/i18n/messages.en.ts',
  'src/ui/map/i18n/messages.bcs.ts',
];

describe('Bosnian place-name diacritics', () => {
  it('the name table is well formed and every correct form differs from its ascii form', () => {
    expect(BOSNIAN_PLACE_NAMES.length).toBeGreaterThanOrEqual(22);
    const asciiForms = BOSNIAN_PLACE_NAMES.map((place) => place.ascii);
    expect(new Set(asciiForms).size).toBe(asciiForms.length);
    for (const place of BOSNIAN_PLACE_NAMES) {
      expect(place.correct, place.ascii).not.toBe(place.ascii);
      // The correct form must actually carry a diacritic, or the entry is pointless.
      expect(/[čćšžđČĆŠŽĐ]/.test(place.correct), place.correct).toBe(true);
    }
  });

  // ── The property that matters ──────────────────────────────────────────────────

  it.each(LOCALE_FILES)('%s contains no ascii-stripped place names', (file) => {
    const found = findStrippedPlaceNames(readFileSync(file, 'utf8'));
    const report = found.map((place) => `"${place.ascii}" should be "${place.correct}"`);
    expect(report, `${file} has ascii-stripped place names`).toEqual([]);
  });

  // ── The checker must not be vacuous ────────────────────────────────────────────
  // A scan that can never fire would pass forever while the defect returned.

  it('detects a genuine violation', () => {
    const found = findStrippedPlaceNames('Hold Sarajevo, Tuzla, Zenica, Bihac, and other anchors.');
    expect(found.map((place) => place.ascii)).toEqual(['Bihac']);
  });

  it('detects several, in table order, without duplicates', () => {
    const found = findStrippedPlaceNames('Bihac and Gorazde and Bihac again, plus Brcko.');
    expect(found.map((place) => place.ascii)).toEqual(['Bihac', 'Gorazde', 'Brcko']);
  });

  it('does not fire on the correctly-spelled forms', () => {
    const correct = BOSNIAN_PLACE_NAMES.map((place) => place.correct).join(' ');
    expect(findStrippedPlaceNames(correct)).toEqual([]);
  });

  it('matches whole words only', () => {
    // "Foca" inside "Focal", "Samac" inside "Samacki" — the reason this tokenises
    // rather than using includes().
    expect(findStrippedPlaceNames('Focal point of the Samacki corridor')).toEqual([]);
    expect(findStrippedPlaceNames('Bihacki district')).toEqual([]);
  });

  it('is case-sensitive, so ordinary lowercase prose is never flagged', () => {
    expect(findStrippedPlaceNames('the bihac lowercase word')).toEqual([]);
  });

  it('returns an empty result for empty input', () => {
    expect(findStrippedPlaceNames('')).toEqual([]);
  });
});
