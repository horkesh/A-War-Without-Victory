import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getFormationDesignation,
  getLocalizedFormationName,
} from '../src/ui/map/data/formationNameLocalizations';

interface EliteCommander {
  name: string;
  competence?: number;
  aggressiveness?: number;
  defensive_skill?: number;
  origin?: string;
  war_crimes_record?: unknown;
}

interface OobBrigadeRow {
  id: string;
  faction: 'RBiH' | 'RS' | 'HRHB';
  name: string;
  kind: string;
  is_elite?: boolean;
  elite_commander?: EliteCommander;
  war_crimes_record?: unknown;
}

const repoRoot = path.resolve(__dirname, '..');
const oobRows = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/source/oob_brigades.json'), 'utf8'),
) as OobBrigadeRow[];

const projectLedgerKnowledge = fs.readFileSync(
  path.join(repoRoot, 'docs/PROJECT_LEDGER_KNOWLEDGE.md'),
  'utf8',
);

const sourceReviewAllowlistedEliteCommanderGaps = [
  'hrhb_vitezovi_brigade_vitez',
] as const;

describe('OOB elite commander metadata contract', () => {
  test('requires every elite brigade commander gap to be source-review allowlisted', () => {
    const missingEliteCommanderIds = oobRows
      .filter((row) => row.is_elite === true && row.kind === 'brigade')
      .filter((row) => !row.elite_commander)
      .map((row) => row.id)
      .sort();

    expect(missingEliteCommanderIds).toEqual([...sourceReviewAllowlistedEliteCommanderGaps]);
  });

  test('keeps the Vitezovi gap explicit until the brigade-vs-PPN source review is resolved', () => {
    const row = oobRows.find((candidate) => candidate.id === 'hrhb_vitezovi_brigade_vitez');

    expect(row).toMatchObject({
      faction: 'HRHB',
      kind: 'brigade',
      is_elite: true,
      name: '"Vitezovi" Brigade (Vitez)',
    });
    expect(row?.elite_commander).toBeUndefined();
    expect(row?.war_crimes_record).toBeUndefined();
    expect(projectLedgerKnowledge).toContain('hrhb_vitezovi_brigade_vitez');
    expect(projectLedgerKnowledge).toContain('PPN Vitezovi');
    expect(projectLedgerKnowledge).toContain('Mario Cerkez');
    expect(projectLedgerKnowledge).toContain('Darko Kraljevic');
  });

  test('keeps Vitezovi localization tied to the unresolved source-reviewed OOB row', () => {
    const row = oobRows.find((candidate) => candidate.id === 'hrhb_vitezovi_brigade_vitez');
    expect(row).toBeDefined();

    const designation = getFormationDesignation('hrhb_vitezovi_brigade_vitez');
    expect(designation?.english_gloss).toBe(row?.name);
    expect(designation?.official_bcs).toBe('Brigada "Vitezovi" (Vitez)');
    expect(getLocalizedFormationName({
      id: 'hrhb_vitezovi_brigade_vitez',
      kind: 'brigade',
      name: row?.name ?? '',
    }, 'bcs')).toBe(designation?.official_bcs);
  });
});
