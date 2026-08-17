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

/**
 * Elite brigades that are knowingly carried WITHOUT an `elite_commander`.
 *
 * The basis lives here, in the entry, and not in a commit message — the R7
 * Phase 2 provenance pass deleted five of these attributions against a
 * 35%-complete index (the local BB knowledge base holds 406 of 1,152 pages and
 * is missing BB2 pp.1-400 entirely), and a bare id list gave a later reader
 * nothing to check the deletion against. Two of the five were attested and have
 * been restored; the three below survive the historian's full-text pass over
 * both volumes and stay allowlisted.
 *
 * Restored, do NOT re-add here: `arbih_120th_liberation_black_swans` (Hase
 * Tirić) and `hvo_3rd_guard_jastrebovi` (Ilija Nakić).
 */
const sourceReviewAllowlistedEliteCommanderGaps = [
  {
    id: 'arbih_guards_brigade',
    basis:
      'Attribution "Dževad Rađo" is unattested. Full-text search of both BB volumes ' +
      'returns zero hits for Rađo / Radjo / Dževad; the single "Rado" in the corpus is ' +
      'Gaby Rado, a Sunday Telegraph journalist (BB1 p.446) — do not read that as a ' +
      'confirmation. The BRIGADE is attested (BB1 p.506 / printed 469, Appendix H: ' +
      '"Guards Brigade, HQ Sarajevo"); its commander is not. Separately flagged, not ' +
      'fixed here: this row carries home_mun "visoko" while Appendix H gives HQ Sarajevo ' +
      '— and Appendix H is dated October 1995, the same end-of-war-snapshot trap that ' +
      'put the 102nd Odžak Brigade in Orašje. That is its own lane.',
  },
  {
    id: 'rs_1st_guards_motorized',
    basis:
      'Attribution "Zdravko Samardžić" is unattested. The BRIGADE is heavily attested ' +
      '(BB1 p.496 / printed 459, Appendix G, HQ Kalinovik), but BB never names its ' +
      'VRS-era commander. NEAR-MISS TRAP, recorded so nobody "confirms" this later off ' +
      'the wrong hit: the only Samardzic in the corpus is RADMILO Samardžić, a tank ' +
      'commander with the 1st Igman Brigade (BB2 p.430 / printed 411) — different man, ' +
      'different unit, different rank.',
  },
  {
    id: 'hvo_4th_guard_sinovi_posavine',
    basis:
      'NEEDS-EVIDENCE rather than disproven — allowlisted pending sourcing. Zero hits in ' +
      'either volume for "Sinovi Posavine" or "Bilonj". The "Mato Bilonjić" attribution ' +
      'exists only in docs/40_reports/20260315_OFFICER_ROSTER_OVERHAUL.md, which is the ' +
      'ORIGIN of the claim rather than an independent source, so it cannot corroborate ' +
      'itself. Note the officer record `hvo_bilonjic` is a KEEP on separate grounds and ' +
      'is restored in apr1992_officers.json: the PERSON stands, the elite-commander ' +
      'PAIRING does not.',
  },
  {
    id: 'hrhb_vitezovi_brigade_vitez',
    basis:
      'Pre-existing gap, unrelated to the R7 Phase 2 pass: the brigade-vs-PPN source ' +
      'review is still open. Pinned in detail by the two tests below.',
  },
] as const;

const sourceReviewAllowlistedEliteCommanderGapIds = sourceReviewAllowlistedEliteCommanderGaps
  .map((entry) => entry.id)
  .slice()
  .sort();

describe('OOB elite commander metadata contract', () => {
  test('requires every elite brigade commander gap to be source-review allowlisted', () => {
    const missingEliteCommanderIds = oobRows
      .filter((row) => row.is_elite === true && row.kind === 'brigade')
      .filter((row) => !row.elite_commander)
      .map((row) => row.id)
      .sort();

    expect(missingEliteCommanderIds).toEqual(sourceReviewAllowlistedEliteCommanderGapIds);
  });

  test('every allowlisted gap states its basis, and the restored attested pairings are present', () => {
    // A bare id list is what let five attributions be dropped without anyone
    // being able to see on what grounds. Require the grounds to exist.
    for (const entry of sourceReviewAllowlistedEliteCommanderGaps) {
      expect(entry.basis.length).toBeGreaterThan(80);
    }

    // The two the historian confirmed against full-text BB must NOT drift back
    // into the allowlist. Pinned by name because the pairing itself was reported
    // inverted once (Rađo/Tirić) before being checked against this file.
    const byId = new Map(oobRows.map((row) => [row.id, row]));
    expect(byId.get('arbih_120th_liberation_black_swans')?.elite_commander?.name).toBe('Hase Tirić');
    expect(byId.get('hvo_3rd_guard_jastrebovi')?.elite_commander?.name).toBe('Ilija Nakić');
    expect(byId.get('arbih_guards_brigade')?.elite_commander).toBeUndefined();
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
