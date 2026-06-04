import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

interface OobBrigadeRow {
  id: string;
  home_settlement?: string;
  home_osid?: string;
}

const repoRoot = path.resolve(__dirname, '..');

const oobRows = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/source/oob_brigades.json'), 'utf8'),
) as OobBrigadeRow[];

const canonicalToOperational = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/derived/operational/canonical_to_operational_map.json'), 'utf8'),
) as Record<string, string>;

describe('Ozren OOB home identity', () => {
  test('3rd Ozren home_osid matches Gornja Paklenica operational mapping', () => {
    const thirdOzren = oobRows.find((row) => row.id === 'rs_3rd_ozren_light_infantry');

    expect(thirdOzren).toBeDefined();
    expect(thirdOzren?.home_settlement).toBe('Gornja Paklenica');
    expect(canonicalToOperational.S208329).toBe('op:doboj:boljanic_2');
    expect(thirdOzren?.home_osid).toBe(canonicalToOperational.S208329);
  });
});
