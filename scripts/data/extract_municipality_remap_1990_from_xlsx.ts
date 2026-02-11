/**
 * Phase 6D.0: Extract post-1995 → 1990 municipality mapping from Excel.
 * Deterministic: no timestamps, stable ordering. Uses mistake guard.
 *
 * Reads src/docs/municipalities_BiH.xlsx and settlements index; produces
 * data/source/municipality_post1995_to_mun1990.json keyed by post1995_code (join key).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const REQUIRED_HEADERS = ['Municipality', 'Pre-1995 municipality'] as const;

/** Explicit overrides when settlement mun name does not match Excel "Municipality" (deterministic; no guessing). Key = post1995_code, value = Excel column A exact string. */
const POST1995_CODE_TO_EXCEL_NAME_OVERRIDES: Record<string, string> = {
  '10766': 'Prozor-Rama',
  '11444': 'Foča',
  '20079': 'Brod',
  '20125': 'Gradiška',
  '20192': 'Grad Mostar',
  '20265': 'Kozarska Dubica',
  '20656': 'Šamac'
};

/** When post-1995 municipality is not in Excel column A but 1990 name is known (canonical 110 opštine); key = post1995_code, value = mun1990_name. */
const POST1995_CODE_TO_MUN1990_DIRECT: Record<string, string> = {
  '10928': 'Vogošća',  // Phase 6D.5: post1995 code 10928 is Vogošća (source Vogosca_10928.js); was wrongly mapped to Velika Kladuša — fix via explicit code override
  '20214': 'Novo Sarajevo',  // Istočno Novo Sarajevo (RS) merges into Novo Sarajevo per bih_adm3_1990; was wrongly mapped to Stari Grad Sarajevo
  '20346': 'Milići',
  '20397': 'Bosanski Novi',
  '20508': 'Ključ'  // Phase 6D.6: post-1995 Ribnik merged into 1990 Ključ (geometry-only remap)
};

/** Phase H1.2.3: Post-1995 display-name aliases (same code, same mun1990; e.g. Novi Grad == Bosanski Novi). Emitted as extra rows so extract1990 name→code lookup resolves. */
const POST1995_CODE_NAME_ALIASES: Record<string, string[]> = {
  '20397': ['Novi Grad']  // post-1995 name "Novi Grad" → same as Bosanski Novi (1990)
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Deterministic normalizer for join: NFD + strip combining marks; hyphens→space; "Grad X"→"X"; strip " (FBiH)" / " (RS)". */
function normalizeForJoin(s: string): string {
  let step = normalizeWhitespace(s).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (step.startsWith('Grad ')) step = step.slice(5).trim();
  step = step.replace(/\s*\((?:FBiH|RS)\)\s*$/i, '').trim();
  return step.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Lowercase normalized key for override rules (e.g. ribnik, kljuc). */
function normalizeName(s: string): string {
  return normalizeForJoin(s).toLowerCase();
}

/** Phase 6D.6: Explicit override — post-1995 Ribnik → 1990 Ključ. If resolved mun1990 or post-1995 name normalizes to "ribnik", force mun1990 to "Ključ". */
const RIBNIK_TO_KLJUC_OVERRIDE = { normalizedSource: 'ribnik', mun1990Target: 'Ključ' as const };

function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT }).trim();
  } catch {
    return 'unknown';
  }
}

interface ExcelRow {
  post1995_name: string;
  mun1990_name: string;
}

interface OutputRow {
  post1995_code?: string;
  post1995_name: string;
  mun1990_code?: string;
  mun1990_name: string;
}

async function main(): Promise<void> {
  const excelPath = resolve(ROOT, 'src/docs/municipalities_BiH.xlsx');
  const settlementsPath = resolve(ROOT, 'data/derived/settlements_index.json');
  const outPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');

  const buffer = await readFile(excelPath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel has no sheets');
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'];
  if (!ref) throw new Error('Sheet has no range');

  const range = XLSX.utils.decode_range(ref);
  const headerRow = range.s.r;
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    const val = cell && cell.v != null ? normalizeWhitespace(String(cell.v)) : '';
    headers.push(val);
  }

  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required header "${required}". Headers: ${headers.join(', ')}`);
    }
  }

  const colPost1995 = headers.indexOf(REQUIRED_HEADERS[0]);
  const colMun1990 = headers.indexOf(REQUIRED_HEADERS[1]);

  const excelRows: ExcelRow[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: colPost1995 })];
    const cellB = sheet[XLSX.utils.encode_cell({ r, c: colMun1990 })];
    const post1995 = cellA && cellA.v != null ? normalizeWhitespace(String(cellA.v)) : '';
    const mun1990 = cellB && cellB.v != null ? normalizeWhitespace(String(cellB.v)) : '';
    if (post1995 && mun1990) {
      excelRows.push({ post1995_name: post1995, mun1990_name: mun1990 });
    }
  }

  const settlementsJson = JSON.parse(await readFile(settlementsPath, 'utf8')) as {
    settlements?: Array< { sid: string; mun_code: string; mun: string } >;
  };
  const settlements = settlementsJson?.settlements ?? [];
  const munCodeToMun = new Map<string, string>();
  for (const s of settlements) {
    if (s.mun_code && s.mun && !munCodeToMun.has(s.mun_code)) {
      munCodeToMun.set(s.mun_code, normalizeWhitespace(s.mun));
    }
  }

  const normalizedPost1995ToRow = new Map<string, ExcelRow>();
  const excelNameToRow = new Map<string, ExcelRow>();
  for (const row of excelRows) {
    excelNameToRow.set(normalizeWhitespace(row.post1995_name), row);
    const key = normalizeForJoin(row.post1995_name);
    if (!normalizedPost1995ToRow.has(key)) {
      normalizedPost1995ToRow.set(key, row);
    }
    if (key.startsWith('Novo ')) {
      const keyWithoutNovo = key.slice(5).trim();
      if (keyWithoutNovo && !normalizedPost1995ToRow.has(keyWithoutNovo)) {
        normalizedPost1995ToRow.set(keyWithoutNovo, row);
      }
    }
  }

  const post1995CodeToMun1990 = new Map<string, string>();
  const post1995CodeToPost1995Name = new Map<string, string>();
  const unmappedCodes: string[] = [];
  const ambiguousNames: Array<{ mun_code: string; mun: string; excelName: string }> = [];

  const sortedCodes = [...munCodeToMun.keys()].sort((a, b) => a.localeCompare(b));
  for (const mun_code of sortedCodes) {
    const directMun1990 = POST1995_CODE_TO_MUN1990_DIRECT[mun_code];
    if (directMun1990) {
      post1995CodeToMun1990.set(mun_code, directMun1990);
      post1995CodeToPost1995Name.set(mun_code, munCodeToMun.get(mun_code) ?? mun_code);
      continue;
    }
    const overrideExcelName = POST1995_CODE_TO_EXCEL_NAME_OVERRIDES[mun_code];
    if (overrideExcelName) {
      const excelRow = excelNameToRow.get(overrideExcelName);
      if (excelRow) {
        post1995CodeToMun1990.set(mun_code, excelRow.mun1990_name);
        post1995CodeToPost1995Name.set(mun_code, excelRow.post1995_name);
      } else {
        unmappedCodes.push(mun_code);
      }
      continue;
    }
    const mun = munCodeToMun.get(mun_code)!;
    const joinKey = normalizeForJoin(mun);
    const excelRow = normalizedPost1995ToRow.get(joinKey);
    if (excelRow) {
      const existing = post1995CodeToMun1990.get(mun_code);
      if (existing !== undefined && existing !== excelRow.mun1990_name) {
        ambiguousNames.push({ mun_code, mun, excelName: excelRow.post1995_name });
      } else {
        post1995CodeToMun1990.set(mun_code, excelRow.mun1990_name);
        post1995CodeToPost1995Name.set(mun_code, excelRow.post1995_name);
      }
    } else {
      unmappedCodes.push(mun_code);
    }
  }

  if (ambiguousNames.length > 0) {
    throw new Error(`Ambiguous mapping: same normalized name maps to different 1990 municipalities: ${JSON.stringify(ambiguousNames.slice(0, 5))}`);
  }

  // Phase 6D.6: Apply Ribnik → Ključ override before writing rows/index (explicit, auditable).
  for (const [code, mun1990] of post1995CodeToMun1990) {
    const post1995Name = post1995CodeToPost1995Name.get(code);
    if (normalizeName(mun1990) === RIBNIK_TO_KLJUC_OVERRIDE.normalizedSource ||
        (post1995Name && normalizeName(post1995Name) === RIBNIK_TO_KLJUC_OVERRIDE.normalizedSource)) {
      post1995CodeToMun1990.set(code, RIBNIK_TO_KLJUC_OVERRIDE.mun1990Target);
    }
  }

  const mappedCodes = sortedCodes.filter((c) => post1995CodeToMun1990.has(c));
  const rows: OutputRow[] = mappedCodes.map((post1995_code) => ({
    post1995_code,
    post1995_name: post1995CodeToPost1995Name.get(post1995_code)!,
    mun1990_name: post1995CodeToMun1990.get(post1995_code)!
  }));
  for (const [code, aliasNames] of Object.entries(POST1995_CODE_NAME_ALIASES)) {
    if (!post1995CodeToMun1990.has(code)) continue;
    const mun1990_name = post1995CodeToMun1990.get(code)!;
    for (const post1995_name of aliasNames) {
      rows.push({ post1995_code: code, post1995_name, mun1990_name });
    }
  }
  rows.sort((a, b) => {
    const c = a.post1995_code.localeCompare(b.post1995_code);
    return c !== 0 ? c : a.post1995_name.localeCompare(b.post1995_name);
  });

  const indexByPost1995Code: Record<string, string> = {};
  for (const [code, mun1990] of post1995CodeToMun1990) {
    indexByPost1995Code[code] = mun1990;
  }
  const indexKeys = Object.keys(indexByPost1995Code).sort((a, b) => a.localeCompare(b));
  const indexSorted: Record<string, string> = {};
  for (const k of indexKeys) {
    indexSorted[k] = indexByPost1995Code[k];
  }

  const commitHash = getGitCommitHash();
  const generatorScript = 'scripts/data/extract_municipality_remap_1990_from_xlsx.ts';
  const output = {
    schema_version: 'v0.2.7',
    generator_script: generatorScript,
    generator_commit: commitHash,
    rows,
    index_by_post1995_code: indexSorted
  };

  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${outPath}: ${rows.length} rows, index has ${indexKeys.length} post1995 codes.`);

  if (unmappedCodes.length > 0) {
    const auditPath = resolve(ROOT, 'docs/audits/settlements_mun1990_remap_coverage.md');
    const unmappedWithNames = unmappedCodes
      .map((code) => ({ code, mun: munCodeToMun.get(code) ?? '?' }))
      .sort((a, b) => a.code.localeCompare(b.code));
    const auditContent = [
      '# Settlements → 1990 municipality remap coverage audit',
      '',
      '**Generated by:** ' + generatorScript,
      '**Commit:** ' + commitHash,
      '',
      '## Summary',
      '',
      '- **Post-1995 municipalities in settlements index:** ' + sortedCodes.length,
      '- **Successfully mapped to 1990:** ' + mappedCodes.length,
      '- **Unmapped (missing from Excel or name mismatch):** ' + unmappedCodes.length,
      '',
      '## Unmapped post-1995 municipalities (FAIL)',
      '',
      '| post1995_code | post1995_name (from settlements) |',
      '|---------------|-----------------------------------|',
      ...unmappedWithNames.map(({ code, mun }) => `| ${code} | ${mun} |`),
      '',
      '**Action:** Add or align names in `src/docs/municipalities_BiH.xlsx` (column "Municipality") so these match settlement `mun` values (deterministic join uses normalized form).',
      ''
    ].join('\n');
    await writeFile(auditPath, auditContent, 'utf8');
    console.error(`Coverage report: ${auditPath}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
