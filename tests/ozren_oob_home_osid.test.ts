import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

interface OobBrigadeRow {
  id: string;
  home_mun?: string;
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
  // Ruling D on #774 (2026-11-17; historian, corps-army-commander and operations-expert seats): the
  // 3rd Ozren's HQ, Gornja Paklenica (S208329), lies in the Doboj-town cell, but its fighting sector
  // was the Maglaj face of the Ozren, which takes in Bočinja (BB2 p.489 n.3; BB1 p.254 n.41,
  // pp.387-388). The engine reads `home_osid` as the brigade's home ground, so it now names that
  // face; `home_settlement` and `home_mun` keep the HQ.
  test('3rd Ozren keeps its HQ settlement and holds the Maglaj face as home ground', () => {
    const thirdOzren = oobRows.find((row) => row.id === 'rs_3rd_ozren_light_infantry');

    expect(thirdOzren).toBeDefined();
    expect(thirdOzren?.home_settlement).toBe('Gornja Paklenica');
    expect(thirdOzren?.home_mun).toBe('doboj');
    expect(canonicalToOperational.S208329).toBe('op:doboj:boljanic_2');
    expect(thirdOzren?.home_osid).toBe('op:maglaj:donja_bocinja_2');
  });
});
