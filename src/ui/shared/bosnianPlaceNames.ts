/**
 * Detects ASCII-stripped Bosnian place names in player-facing text.
 *
 * This is a correctness issue, not a cosmetic one: the game is set in Bosnia, and rendering
 * "Bihac" where "Bihać" is meant is the same class of error as misspelling a person's name.
 * The 2026-09-03 showcase audit recorded it as a live defect class (`Ilijaš`/`Ilijas` inside a
 * single card); `inbox.openingBrief.RBiH.bullet.0` carried "Bihac" in both locales while the
 * same file spelled "Bihać" correctly elsewhere.
 *
 * Drafted by the local executor model and reviewed/cleaned by the planner — see
 * tools/local_executor/README.md. Its boundary semantics were correct as proposed; the
 * cleanup was efficiency and dead code.
 */

/**
 * SCOPE WARNING — player-facing PROSE only, never identifiers.
 *
 * OSID slugs (`op:bihac:bihac_2`), formation ids, event ids, save keys and scenario keys are
 * ASCII BY DESIGN and must never be "corrected". Adding diacritics to an identifier changes a
 * key and breaks lookups, saves and calibration. A sweep across `tests/` on 2026-09-10 found
 * ~20 files containing "Bihac" and ~24 containing "Gorazde" — essentially all of them slugs.
 *
 * Apply this checker to localized message catalogues and rendered prose. Nothing else.
 */

export interface BosnianPlaceName {
  /** The ASCII-stripped form that should never appear in player-facing text. */
  ascii: string;
  /** The correct form, with diacritics. */
  correct: string;
}

export const BOSNIAN_PLACE_NAMES: ReadonlyArray<BosnianPlaceName> = [
  { ascii: 'Bihac', correct: 'Bihać' },
  { ascii: 'Gorazde', correct: 'Goražde' },
  { ascii: 'Zepa', correct: 'Žepa' },
  { ascii: 'Foca', correct: 'Foča' },
  { ascii: 'Cajnice', correct: 'Čajniče' },
  { ascii: 'Sipovo', correct: 'Šipovo' },
  { ascii: 'Vogosca', correct: 'Vogošća' },
  { ascii: 'Ilijas', correct: 'Ilijaš' },
  { ascii: 'Gradacac', correct: 'Gradačac' },
  { ascii: 'Brcko', correct: 'Brčko' },
  { ascii: 'Tesanj', correct: 'Tešanj' },
  { ascii: 'Visegrad', correct: 'Višegrad' },
  { ascii: 'Buzim', correct: 'Bužim' },
  { ascii: 'Kljuc', correct: 'Ključ' },
  { ascii: 'Sekovici', correct: 'Šekovići' },
  { ascii: 'Zivinice', correct: 'Živinice' },
  { ascii: 'Teocak', correct: 'Teočak' },
  { ascii: 'Celic', correct: 'Čelić' },
  { ascii: 'Orasje', correct: 'Orašje' },
  { ascii: 'Odzak', correct: 'Odžak' },
  { ascii: 'Samac', correct: 'Šamac' },
  { ascii: 'Mrkonjic', correct: 'Mrkonjić' },
];

/**
 * Every place name appearing in `text` in its ASCII-stripped form, as a whole word.
 *
 * Whole-word matching is why this tokenises rather than using `includes`: "Foca" must not
 * match inside "Focal", and "Samac" must not match inside "Samacki". Matching is
 * case-sensitive, so only the capitalised place-name form counts and ordinary lowercase
 * words are never flagged.
 *
 * `\w` deliberately excludes diacritics, so a correctly-spelled "Bihać" tokenises as "Biha"
 * and can never be reported as a violation of itself.
 *
 * Results follow BOSNIAN_PLACE_NAMES order, each pair at most once.
 */
export function findStrippedPlaceNames(text: string): BosnianPlaceName[] {
  const tokens = new Set(text.match(/\b\w+\b/g) ?? []);
  if (tokens.size === 0) return [];
  return BOSNIAN_PLACE_NAMES.filter((place) => tokens.has(place.ascii));
}
