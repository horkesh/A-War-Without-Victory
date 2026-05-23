import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  BRIGADE_DESIGNATION_CATALOG,
  getLocalizedFormationName,
  getFormationDesignation,
  getFormationUnitType,
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
  test('provide one structured designation row per source OOB brigade id', () => {
    const ids = new Set(oobRows.map((row) => row.id));
    const catalogIds = new Set(BRIGADE_DESIGNATION_CATALOG.map((row) => row.id));
    const missing = [...ids].filter((id) => !catalogIds.has(id));
    const extras = [...catalogIds].filter((id) => !ids.has(id));
    const codes = BRIGADE_DESIGNATION_CATALOG.map((row) => row.designation_code);
    const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);

    expect(missing).toEqual([]);
    expect(extras).toEqual([]);
    expect(duplicateCodes).toEqual([]);
    expect(BRIGADE_DESIGNATION_CATALOG.every((row) => row.echelon === 'brigade' || row.echelon === 'battalion' || row.echelon === 'regiment' || row.echelon === 'unit_group')).toBe(true);
    expect(BRIGADE_DESIGNATION_CATALOG.every((row) => row.english_gloss.length > 0 && row.official_bcs.length > 0)).toBe(true);
  });

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

  test('exposes canonical designation codes and unit types for UI logic', () => {
    expect(getFormationDesignation('arbih_503rd_slavna_mountain')?.designation_code).toBe('AWWV-BDE-ARBIH-503RD-SLAVNA-MOUNTAIN');
    expect(getFormationDesignation('rs_skelani_battalion')?.echelon).toBe('battalion');
    expect(getFormationUnitType({
      id: 'rs_1st_sarajevo_mechanized',
      kind: 'brigade',
      name: '1st Sarajevo Mechanized',
    })).toBe('mechanized');
  });
});
