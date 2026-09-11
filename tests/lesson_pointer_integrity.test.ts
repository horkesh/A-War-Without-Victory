/**
 * The life-lessons index promises topic files it does not always deliver.
 *
 * An entry reading `see docs/life_lessons/process.md` is a promise that the full lesson is there.
 * For 15 of 23 pointers it is not — the bodies only ever lived in the index. A pointer that leads
 * nowhere costs more than no pointer: the reader follows it, finds nothing, concludes the lesson
 * does not exist, and trusts every other pointer on the page a little less.
 *
 * THE NUMBER THIS CORRECTS. `docs/open_gates.yml` recorded the backlog as "160 of 244 entries".
 * Measured at that gate's own commit, the index contained TWENTY pointer lines in total. The
 * figure was wrong by an order of magnitude when written, and it turned a tractable cleanup into
 * something that looked like a week of work — so nobody started it.
 *
 * WHY THIS IS A RATCHET AND NOT A FIX. Making each pointer true means moving a lesson into a
 * topic file or dropping the pointer, and that is a curation judgement about the corpus, not a
 * mechanical rewrite. The backlog stands. What is mechanical — and what these tests enforce — is
 * that it may not GROW, and that it must shrink when someone fixes one.
 */

import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pointers = require('../tools/validate_lesson_pointers.cjs');

describe('life-lessons pointer integrity', () => {
  it('no NEW broken pointer has been added', () => {
    // The only failure mode that should ever block a commit.
    expect(pointers.newlyBroken()).toEqual([]);
  });

  it('the baseline contains no entry that now resolves', () => {
    // If someone fixes a pointer, its baseline line must go, or the recorded count drifts back
    // into being a number nobody has checked — which is how the 160 got there.
    expect(pointers.staleBaseline()).toEqual([]);
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
