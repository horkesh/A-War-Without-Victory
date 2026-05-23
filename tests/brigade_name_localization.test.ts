import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getLocalizedFormationName,
} from '../src/ui/map/data/formationNameLocalizations';

interface OobBrigadeRow {
  id: string;
  faction: 'RBiH' | 'RS' | 'HRHB';
  name: string;
}

const repoRoot = path.resolve(__dirname, '..');
const oobRows = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/source/oob_brigades.json'), 'utf8'),
) as OobBrigadeRow[];

const forbiddenBosnianLeaks = [
  /\bBrigade\b/i,
  /\bMountain\b/i,
  /\bLight\b/i,
  /\bInfantry\b/i,
  /\bMotorized\b/i,
  /\bMechanized\b/i,
  /\bArmored\b/i,
  /\bGuards\b/i,
  /\bLiberation\b/i,
  /\bFamous\b/i,
  /\btjedan\w*\b/i,
  /\bpovijest\w*\b/i,
  /\bstozer\w*\b/i,
  /\bstožer\w*\b/i,
  /\bzapovjed\w*\b/i,
  /\bopć\w*\b/i,
  /\bvreme\b/i,
  /\bslede\w*\b/i,
  /\bprocena\b/i,
  /\bopsta\b/i,
  /\bopština\b/i,
  /\bpesad\w*\b/i,
];

describe('BCS brigade name localizations', () => {
  test('cover every source OOB brigade id', () => {
    const missing = oobRows
      .filter((row) => getLocalizedFormationName({
        id: row.id,
        kind: 'brigade',
        name: row.name,
      }, 'bcs') === row.name)
      .map((row) => `${row.id}: ${row.name}`);

    expect(missing).toEqual([]);
  });

  test('use Bosnian unit terminology rather than English, Croatian, or ekavian terms', () => {
    const leaks = oobRows
      .flatMap((row) => {
        const name = getLocalizedFormationName({
          id: row.id,
          kind: 'brigade',
          name: row.name,
        }, 'bcs');
        return forbiddenBosnianLeaks
        .filter((pattern) => pattern.test(name))
          .map((pattern) => `${row.id}: ${name} matched ${pattern}`);
      });

    expect(leaks).toEqual([]);
  });

  test('resolve localized labels without changing English fallback names', () => {
    expect(getLocalizedFormationName({
      id: 'arbih_503rd_slavna_mountain',
      kind: 'brigade',
      name: '503rd Slavna Mountain',
    }, 'bcs')).toBe('503. slavna brdska brigada');
    expect(getLocalizedFormationName({
      id: 'rs_5th_kozara_light_infantry',
      kind: 'brigade',
      name: '5th Kozara Light Infantry',
    }, 'bcs')).toBe('5. kozarska laka pješadijska brigada');
    expect(getLocalizedFormationName({
      id: 'hrhb_106th_bosanska_posavina_brigade',
      kind: 'brigade',
      name: '106th "Bosanska Posavina" Brigade',
    }, 'bcs')).toBe('106. brigada "Bosanska Posavina"');
    expect(getLocalizedFormationName({
      id: 'unknown_brigade',
      kind: 'brigade',
      name: 'Unknown Brigade',
    }, 'en')).toBe('Unknown Brigade');
  });
});
