/**
 * The life-lessons index promises topic files it does not always deliver.
 *
 * An entry reading `see docs/life_lessons/process.md` is a promise that the full lesson is there.
 * A pointer that leads nowhere costs more than no pointer: the reader follows it, finds nothing,
 * concludes the lesson does not exist, and trusts every other pointer on the page a little less.
 *
 * THE BACKLOG IS CLEARED. All 164 pointers across the index and the session archive now resolve;
 * each cited lesson was copied verbatim into the topic file that cited it. The baseline file is
 * therefore EMPTY, which changes what these tests mean: with nothing grandfathered, any broken
 * pointer fails outright.
 *
 * TWO WRONG NUMBERS GOT THIS FAR, AND BOTH HAD ONE CAUSE — nobody recomputed them.
 *   `docs/open_gates.yml` said "160 of 244 entries" are broken.
 *   A first pass here scanned ONLY the index, found 23 pointers, and concluded 160 was invented.
 * Both were wrong. The archive holds another 141, so 164 pointers exist: the register was
 * counting the right corpus and overstating the breakage (49, not 160), while the correction
 * checked half the corpus and called the rest a phantom. Checking half and declaring the other
 * half imaginary is the same error facing the other way.
 */

import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pointers = require('../tools/validate_lesson_pointers.cjs');

describe('life-lessons pointer integrity', () => {
  it('no pointer is broken', () => {
    // The baseline is empty, so this is now absolute rather than a ratchet over a backlog.
    expect(pointers.newlyBroken()).toEqual([]);
  });

  it('every pointer in BOTH the index and the archive resolves', () => {
    // Scanning only the index was how a 141-pointer file got overlooked entirely.
    expect(pointers.validatePointers()).toEqual([]);
  });

  it('scans the archive, not just the index', () => {
    const files = new Set(pointers.collectPointers().map((r: { file: string }) => r.file));
    expect(files.has('docs/life_lessons.md')).toBe(true);
    expect(files.has('docs/life_lessons/session_archive.md')).toBe(true);
  });

  it('the baseline contains no entry that now resolves', () => {
    // If someone fixes a pointer, its baseline line must go, or the recorded count drifts back
    // into being a number nobody has checked — which is how the 160 got there.
    expect(pointers.staleBaseline()).toEqual([]);
  });

  it('the baseline is empty, and stays a mechanism rather than a parking space', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseline = require('../tools/lesson_pointer_baseline.json') as { broken: unknown[] };
    expect(baseline.broken).toEqual([]);
  });

  it('the baseline count matches the list it describes', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const baseline = require('../tools/lesson_pointer_baseline.json') as {
      count: number; broken: unknown[];
    };
    expect(baseline.count).toBe(baseline.broken.length);
  });

  it('the checker can actually fail — it is not a rubber stamp', () => {
    // A pointer to a topic file that cannot contain the title must be reported. Without this,
    // "0 broken" would be indistinguishable from "the check does nothing".
    const invented = {
      line: 1,
      topic: 'docs/life_lessons/process.md',
      title: 'A LESSON TITLE THAT IS DEFINITELY NOT IN ANY TOPIC FILE ANYWHERE 12345',
    };
    expect(pointers.pointerResolves(invented)).toBe(false);
  });

  it('a pointer whose lesson IS present resolves', () => {
    // Chosen from the checker's own [ OK ] list, not from memory — the first attempt at this
    // control used a title that is in the BROKEN set, and the test caught it.
    const real = {
      line: 1,
      topic: 'docs/life_lessons/process.md',
      title: 'I MERGED ON A PARTIAL SIGNAL ONE MESSAGE AFTER SAYING I WOULD NOT',
    };
    expect(pointers.pointerResolves(real)).toBe(true);
  });

  it('titleOf strips the tag, the stars and the trailing pointer', () => {
    const heading = '### [Process] ★★ SOME TITLE — see `docs/life_lessons/process.md`';
    expect(pointers.titleOf(heading)).toBe('SOME TITLE');
  });
});
