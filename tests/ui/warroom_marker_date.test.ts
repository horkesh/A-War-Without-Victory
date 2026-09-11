import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { withoutComments } from '../helpers/sourceComments';
import { warroomSceneYear } from '../../src/ui/map/components/warroom/WarroomShellLayer';
import { turnToDateString } from '../../src/ui/map/utils/formatters';
import {
  MARKER_BASELINE_DRIFT_PX,
  MARKER_LINE_TILT_DEGREES,
  MARKER_OPACITY_MAX,
  MARKER_OPACITY_MIN,
  MARKER_ROTATION_DEGREES,
  TARGET_CONTRAST_LSTAR,
  boardLuminance,
  dimBoardPlates,
  fnv1a,
  lstarOf,
  markerGlyphJitter,
  markerInk,
} from '../../src/ui/map/components/warroom/warroomMarkerInk';

const repoRoot = resolve(__dirname, '../..');
const componentPath = resolve(repoRoot, 'src/ui/map/components/warroom/WarroomShellLayer.tsx');
const inkModulePath = resolve(repoRoot, 'src/ui/map/components/warroom/warroomMarkerInk.ts');

describe('warroom marker date — determinism', () => {
  // THE SACRED RULE, AT THE ONE PLACE IT IS MOST TEMPTING TO BREAK.
  //
  // Making writing look hand-made means varying every glyph, and the obvious implementation is
  // Math.random(). That is banned across all of src/, and here it would also mean the date
  // visibly redrew itself on every React re-render. Every jitter value is therefore a pure hash
  // of turn, glyph index and channel.

  it('produces identical jitter for the same turn, every time', () => {
    for (let index = 0; index < 12; index += 1) {
      expect(markerGlyphJitter(40, index)).toEqual(markerGlyphJitter(40, index));
    }
  });

  it('produces different jitter for a different turn — a person rewrote the board', () => {
    const thisWeek = Array.from({ length: 10 }, (_, i) => markerGlyphJitter(40, i));
    const nextWeek = Array.from({ length: 10 }, (_, i) => markerGlyphJitter(41, i));
    expect(nextWeek).not.toEqual(thisWeek);
  });

  it('gives the ghost line its own wobble, so it is not the same stamp twice', () => {
    // Without a salt the ghost would receive glyph-for-glyph identical jitter to the live date,
    // and two copies of the same scrawl offset by a few percent reads as a drop shadow.
    expect(markerGlyphJitter(40, 3, 'ghost')).not.toEqual(markerGlyphJitter(40, 3, 'ink'));
  });

  it('varies across glyphs rather than applying one offset to the whole word', () => {
    const drifts = new Set(Array.from({ length: 12 }, (_, i) => markerGlyphJitter(40, i).baselineDriftPx));
    expect(drifts.size).toBeGreaterThan(6);
  });

  it('stays inside the design bounds for every glyph of every turn it can reach', () => {
    // 188 turns is the full campaign; 24 glyphs covers the longest label the board can show.
    for (let turn = 0; turn <= 188; turn += 1) {
      for (let index = 0; index < 24; index += 1) {
        const jitter = markerGlyphJitter(turn, index);
        expect(Math.abs(jitter.baselineDriftPx)).toBeLessThanOrEqual(MARKER_BASELINE_DRIFT_PX);
        expect(Math.abs(jitter.rotationDegrees)).toBeLessThanOrEqual(MARKER_ROTATION_DEGREES);
        expect(jitter.opacity).toBeGreaterThanOrEqual(MARKER_OPACITY_MIN);
        expect(jitter.opacity).toBeLessThanOrEqual(MARKER_OPACITY_MAX);
      }
    }
  });

  it('pins the hash itself, so a refactor cannot silently redraw every date in the game', () => {
    // FNV-1a over a known string. If this changes, every scrawl in every save changes with it —
    // which may be fine, but it should never happen by accident.
    expect(fnv1a('')).toBe(2166136261);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('has no wall clock or RNG anywhere in the ink module', () => {
    // Comments stripped first. This assertion failed on the module's own doc comment, which
    // explains that a Math.random() here would break determinism — correct about the code, wrong
    // about the file. See tests/helpers/sourceComments.ts.
    const source = withoutComments(readFileSync(inkModulePath, 'utf8'));
    expect(source).not.toMatch(/Math\.random\(/);
    expect(source).not.toMatch(/Date\.now\(/);
    expect(source).not.toMatch(/new Date\(/);
  });
});

describe('warroom marker date — ink in the room\'s light', () => {
  it('reproduces the signed-off ink on the plate the design sampled', () => {
    // RBiH 1993 is the plate design §4.4 called "a reasonable hue" at rgba(21,35,58). Deriving it
    // from the luminance table has to return that colour, or the target gap is not the one the
    // design actually approved.
    const ink = markerInk('RBiH', 1993);
    expect(ink.boardLstar).toBe(48.8);
    expect(ink.color).toBe('rgb(21, 35, 59)');
  });

  it('holds a constant perceptual gap wherever the board is light enough', () => {
    for (const faction of ['HRHB', 'RBiH', 'RS']) {
      for (const year of [1991, 1992, 1993, 1994, 1995]) {
        const ink = markerInk(faction, year);
        if (!ink.reachesTarget) continue;
        expect(Math.abs(ink.contrastLstar - TARGET_CONTRAST_LSTAR), `${faction} ${year}`).toBeLessThan(0.5);
      }
    }
  });

  it('moves the ink with the board rather than painting one colour everywhere', () => {
    // The whole point of the table. If these were equal the ink would be hard-coded again.
    expect(markerInk('RBiH', 1995).color).not.toBe(markerInk('RBiH', 1992).color);
    expect(lstarOf([55, 82, 127])).toBeGreaterThan(lstarOf([12, 22, 39]));
  });

  it('flags exactly the plates too dark to reach target, and does not invert to chalk', () => {
    // Design §4.4 accepts lower contrast on dark boards rather than switching to a light ink,
    // which would stop reading as a marker. So the ink bottoms out at black and the shortfall is
    // recorded for owner review instead of being engineered away.
    expect(dimBoardPlates()).toEqual([
      { faction: 'HRHB', year: 1994, boardLstar: 31 },
      { faction: 'HRHB', year: 1995, boardLstar: 24.5 },
    ]);
    expect(markerInk('HRHB', 1995).color).toBe('rgb(0, 0, 0)');
    expect(markerInk('HRHB', 1995).reachesTarget).toBe(false);
    // Never lighter than the board it sits on.
    for (const faction of ['HRHB', 'RBiH', 'RS']) {
      for (const year of [1991, 1992, 1993, 1994, 1995]) {
        const ink = markerInk(faction, year);
        expect(ink.contrastLstar, `${faction} ${year}`).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to the mid-tone reference rather than to white for an unknown plate', () => {
    // An unknown faction should give ink that is merely unoptimised, never ink that is invisible.
    expect(boardLuminance('NOT_A_FACTION', 1993)).toBe(48.8);
    expect(boardLuminance('RBiH', 1066)).toBe(48.8);
  });
});

describe('warroom scene year — the date and the room must agree', () => {
  // THE DEFECT THIS PINS was found by photographing the room, not by any test, and the reason is
  // instructive: both halves were independently plausible. The date came from the turn and was
  // right. The plate came from `metadata.date` and was a real plate. Only the PAIR was wrong, and
  // nothing in the suite compared them. A turn-68 save showed "26 Jul 1993" written on the 1992
  // whiteboard.

  it('falls back to the turn when the save carries no metadata date', () => {
    // Every save the scenario harness writes is this shape: meta.date is simply not a field, so
    // the adapter stores 'UNKNOWN', and parseInt('NOWN') is NaN. NaN fell to the 1992 branch.
    expect(warroomSceneYear({ turn: 68, metadata: { turn: 68, date: 'UNKNOWN' } })).toBe(1993);
    expect(warroomSceneYear({ turn: 68 } as never)).toBe(1993);
  });

  it('puts every turn of the campaign in the room its own date names', () => {
    for (const turn of [0, 1, 38, 39, 68, 90, 91, 143, 144, 188]) {
      const label = turnToDateString(turn);
      const labelYear = Number.parseInt(label.slice(-4), 10);
      const expected = labelYear <= 1992 ? 1992 : labelYear;
      expect(warroomSceneYear({ turn, metadata: { turn, date: 'UNKNOWN' } }), `turn ${turn} (${label})`)
        .toBe(expected);
    }
  });

  it('still prefers an explicit metadata date when the save actually has one', () => {
    expect(warroomSceneYear({ turn: 0, metadata: { turn: 0, date: 'April 1995' } })).toBe(1995);
  });

  it('clamps outside the five plates that exist', () => {
    expect(warroomSceneYear({ turn: 0, metadata: { turn: 0, date: 'April 1991' } })).toBe(1992);
    expect(warroomSceneYear({ turn: 400, metadata: { turn: 400, date: 'UNKNOWN' } })).toBe(1995);
    expect(warroomSceneYear(null)).toBe(1992);
  });
});

describe('warroom marker date — the ghost of last week', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('draws the previous week and suppresses it at turn 0', () => {
    // Nothing preceded the first week. A ghost there would be inventing a history the save does
    // not have.
    expect(source).toContain('dateTurn > 0 ? turnToDateString(dateTurn - 1) : null');
  });

  it('keeps the ghost out of the accessibility tree — it is texture, not information', () => {
    const boardStart = source.indexOf('function WarroomDateBoard');
    const boardEnd = source.indexOf('function WarroomHotspot');
    const board = source.slice(boardStart, boardEnd);
    expect(board).toContain('aria-hidden="true"');
    expect(board).toContain('testId="warroom-date-board-ghost"');
    // The ghost is rendered inside the aria-hidden board, so it inherits the exclusion; the live
    // date is too, which is correct — the Desk column is the accessible date surface.
    expect(board.indexOf('aria-hidden="true"')).toBeLessThan(board.indexOf('warroom-date-board-ghost'));
  });

  it('is the same hue as the live ink, never a lighter colour', () => {
    // Wiped marker leaves a faint DARKER residue. A lighter ghost would read as a highlight.
    const boardStart = source.indexOf('function WarroomDateBoard');
    const boardEnd = source.indexOf('function WarroomHotspot');
    const board = source.slice(boardStart, boardEnd);
    const ghostBlock = board.slice(board.indexOf('warroom-date-board-ghost'));
    expect(board).toMatch(/color=\{ink\.color\}[\s\S]*salt="ghost"/);
    expect(ghostBlock).not.toMatch(/color:\s*['"]/);
    expect(ghostBlock).toMatch(/opacity:\s*0\.1[0-4]/);
  });
});

describe('warroom marker date — the line, not the label', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('tilts the whole line uphill, the way people write', () => {
    expect(MARKER_LINE_TILT_DEGREES).toBeLessThan(0);
    expect(source).toContain('rotate(${MARKER_LINE_TILT_DEGREES}deg)');
    // Anchored where the writing started, not at the middle of the phrase.
    expect(source).toContain("transformOrigin: 'left center'");
  });

  it('sizes from the string so the writing keeps its width on the board', () => {
    // Labels are not a fixed width: '6 Apr 1992' is ten characters, metadata.date can carry a
    // full month name, and the pending label is 'Date Pending' or 'Datum čeka'. One fixed size
    // would overrun the board on the long ones and look timid on the short ones.
    expect(source).toContain('function markerFontSizeCqw');
    expect(source).toContain('MARKER_TARGET_WIDTH_PERCENT');
  });
});
