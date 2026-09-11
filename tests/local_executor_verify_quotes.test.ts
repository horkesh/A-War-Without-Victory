/**
 * Demanding verbatim quotes is what makes a local-model answer trustworthy: it turns an
 * unverifiable claim into a checkable one. But the CHECKER is where it goes wrong.
 *
 * Written ad hoc on 2026-09-11 it produced TWO false accusations of fabrication, and both times
 * the quoted text was genuinely in the source:
 *   - the model escapes backticks and dollars for JSON, so `\`$?\`` is not byte-identical
 *   - a quote can span two adjacent source lines, stitched with a newline and the `**` dropped
 *
 * Accusing the tool of inventing evidence is worse than missing an invention: it is the same
 * false-positive failure the repo's guards keep teaching, aimed at the executor instead of the
 * planner. So the tolerances are pinned here.
 *
 * AND THE OPPOSITE, which is the danger of every tolerance: a verifier that accepts anything is
 * a rubber stamp, and a rubber stamp is worse than no verifier because it launders a guess into
 * a fact. Half of these tests exist to prove it still says no.
 */

import { describe, expect, it } from 'vitest';
import { normaliseForQuote, quoteIsReal, collectQuotes } from '../tools/local_executor/verify_quotes.mjs';

const SOURCE = [
  '# Guard',
  'deny "BLOCKED: this reads `$?` immediately after a pipeline ending in `tail`."',
  '',
  '0m. **A LOOKUP THAT COULD NOT HAVE FOUND X IS NOT EVIDENCE THAT X IS ABSENT**',
  '   Do instead: name WHICH lookup you ran and what it could not have seen.',
].join('\n');

describe('verify_quotes — tolerances that were earned', () => {
  it('accepts a quote the model escaped for JSON', () => {
    // What the model actually emits: backslashes before backticks and dollars.
    const escaped = 'BLOCKED: this reads \\`$?\\` immediately after a pipeline ending in \\`tail\\`.';
    expect(quoteIsReal(SOURCE, escaped)).toBe(true);
  });

  it('accepts a quote stitched across two adjacent lines with markers dropped', () => {
    const stitched = 'A LOOKUP THAT COULD NOT HAVE FOUND X IS NOT EVIDENCE THAT X IS ABSENT\n'
      + '   Do instead: name WHICH lookup you ran and what it could not have seen.';
    expect(quoteIsReal(SOURCE, stitched)).toBe(true);
  });

  it('accepts a quote whose line wrapping differs', () => {
    expect(quoteIsReal(SOURCE, 'name WHICH lookup you\nran and what it\ncould not have seen')).toBe(true);
  });

  // ── It must still say no ───────────────────────────────────────────────────────

  it('REJECTS a quote that is not in the source', () => {
    expect(quoteIsReal(SOURCE, 'BLOCKED: this reads the moon and reports it as cheese')).toBe(false);
  });

  it('REJECTS a plausible paraphrase', () => {
    // The dangerous case: right meaning, words the source never used.
    expect(quoteIsReal(SOURCE, 'a search that could not have located X does not prove X is missing'))
      .toBe(false);
  });

  it('REJECTS a quote too short to be evidence of anything', () => {
    // "the" appears in almost any source; accepting it would make the check meaningless.
    expect(quoteIsReal(SOURCE, 'the')).toBe(false);
    expect(quoteIsReal(SOURCE, 'Do instead')).toBe(false);
  });

  it('REJECTS when the source is missing entirely', () => {
    expect(quoteIsReal(null, 'anything at all, long enough to count')).toBe(false);
  });

  it('normalisation drops escaping and emphasis but not words', () => {
    expect(normaliseForQuote('**bold** and \\`code\\`')).toBe('bold and `code`');
  });
});

describe('verify_quotes — finding the quotes to check', () => {
  it('walks nested structures and inherits the source field', () => {
    const answer = {
      guards: [
        { file: 'a.sh', proof: 'first quote here' },
        { file: 'b.sh', proof: 'second quote here' },
      ],
    };
    const rows = collectQuotes(answer, 'proof', 'file');
    expect(rows).toEqual([
      { quote: 'first quote here', source: 'a.sh' },
      { quote: 'second quote here', source: 'b.sh' },
    ]);
  });

  it('returns nothing when the field is absent, so the CLI can refuse', () => {
    // A verifier that checks zero quotes and reports success is the failure it exists to catch.
    expect(collectQuotes({ guards: [{ file: 'a.sh' }] }, 'proof', 'file')).toEqual([]);
  });
});
