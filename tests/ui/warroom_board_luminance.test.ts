import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import table from '../../src/ui/warroom/assets/warroom_board_luminance.json';

// WHY THIS FILE EXISTS
//
// The whiteboard is not white, and it is not the same darkness twice. Measured across the fifteen
// scene plates the writing surface spans L*24.5 (HRHB 1995) to L*69.8 (RBiH 1995) — a 45-point
// spread. A single hard-coded ink colour is legible on roughly a third of the game.
//
// Design §4.4 therefore requires the ink to be derived from a committed table that a checked-in
// script regenerates from the art. The failure this guards is the quiet one: the art gets
// re-exported, the table keeps describing the old plates, and the ink drifts out of the room's
// light with nothing going red.

const repoRoot = resolve(__dirname, '../..');
const assetDir = 'src/ui/warroom/assets';
const factions = ['HRHB', 'RBiH', 'RS'] as const;
const years = ['1991', '1992', '1993', '1994', '1995'] as const;

type Boards = Record<string, Record<string, number>>;
const boards = table.boards as Boards;

function sha256(relativePath: string): string {
  return createHash('sha256').update(readFileSync(resolve(repoRoot, relativePath))).digest('hex');
}

describe('warroom board luminance table', () => {
  it('covers every faction and year the scene plates ship', () => {
    for (const faction of factions) {
      expect(boards[faction], faction).toBeDefined();
      for (const year of years) {
        const value = boards[faction][year];
        expect(typeof value, `${faction} ${year}`).toBe('number');
        expect(value, `${faction} ${year}`).toBeGreaterThan(0);
        expect(value, `${faction} ${year}`).toBeLessThan(100);
      }
    }
  });

  it('describes the regions the overlays actually sit on', () => {
    // If either drifts from the region id the component looks up, the table is measuring one
    // rectangle and the overlay is being painted in another.
    expect(table.regions.board).toBe('wall_calendar_area');
    expect(table.regions.cork).toBe('desk_map');
  });

  it('measures the corkboard as well as the whiteboard, for all fifteen plates', () => {
    // The map overlay has the same problem the date had, for the same reason: the room's light
    // varies across the campaign and the overlay did not.
    for (const faction of factions) {
      for (const year of years) {
        const value = (table.cork as Boards)[faction]?.[year];
        expect(typeof value, `cork ${faction} ${year}`).toBe('number');
        expect(value, `cork ${faction} ${year}`).toBeGreaterThan(0);
        expect(value, `cork ${faction} ${year}`).toBeLessThan(100);
      }
    }
  });

  it('does not assume cork tracks the board — on RS they invert', () => {
    // RS 1991-93 cork is BRIGHTER than that faction's own whiteboard. Deriving the sheet from the
    // board figure would be wrong there, which is why there are two measurements and not one.
    const corkTable = table.cork as Boards;
    expect(corkTable.RS['1991']).toBeGreaterThan(boards.RS['1991']);
    expect(corkTable.HRHB['1995']).toBeLessThan(boards.HRHB['1995']);
  });

  it('records a real spread, so a degenerate table cannot pass as a measurement', () => {
    // A sampler that silently read the wrong rectangle — or one pixel — would return a flat or
    // near-flat table, and every other assertion here would still pass. The measured spread is
    // the thing that proves fifteen different surfaces were actually looked at.
    const values = factions.flatMap((faction) => years.map((year) => boards[faction][year]));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(20);
    expect(new Set(values).size, 'distinct values').toBeGreaterThan(10);
  });

  it('is still in step with the art it was derived from', () => {
    // The cheap check: hash the inputs rather than decode fifteen webps. Catches an art re-export
    // that left the table behind, in milliseconds.
    const files: string[] = [];
    for (const stem of ['hrhb', 'rbih', 'rs']) {
      files.push(`${assetDir}/hq_${stem}_regions.json`);
      for (const year of years) files.push(`${assetDir}/hq_${stem}_${year}.webp`);
    }
    files.sort();

    const hash = createHash('sha256');
    for (const file of files) hash.update(`${file}:${sha256(file)}\n`);
    expect(hash.digest('hex')).toBe(table.source_digest);
  });

  it('is reproduced byte-for-byte by its generating script', () => {
    // The digest above proves the INPUTS have not moved. This proves the OUTPUT is what the script
    // actually produces from them — so the committed numbers cannot have been hand-edited, which
    // is the one way a generated file quietly becomes a hand-maintained one.
    expect(() =>
      execFileSync('node', ['tools/derive_warroom_board_luminance.cjs', '--check'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
