/**
 * Phase H1.2.2: data:extract1990 generator — Excel → municipality_political_controllers.json.
 * Reads data/source/1990 to 1995 municipalities_BiH.xlsx (Municipality, Party that won 1990 elections).
 * Output: data/source/municipality_political_controllers.json ({ version, mappings }).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import * as XLSX from 'xlsx';



const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const DEFAULT_INPUT = 'data/source/1990 to 1995 municipalities_BiH.xlsx';
const OUTPUT_PATH = join(ROOT, 'data/source/municipality_political_controllers.json');
const INDEX_PATH = join(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
const CANONICAL_IDS = ['RBiH', 'RS', 'HRHB'] as const;
type ControllerId = (typeof CANONICAL_IDS)[number];

/** Party name (normalized) → controller. Full names from Excel "Party that won 1990 elections". Ledger 6B.2: SDA/SK-SDP→RBiH, SDS→RS, HDZ BiH→HRHB. */
const PARTY_TO_CONTROLLER: Record<string, ControllerId> = {
  'stranka demokratske akcije': 'RBiH',
  'srpska demokratska stranka': 'RS',
  'hrvatska demokratska zajednica bih': 'HRHB',
  'hrvatska demokratska zajednica': 'HRHB',
  'savez komunista bih - stranka demokratskih promjena': 'RBiH',
  'stranka demokratskih promjena': 'RBiH',
  sda: 'RBiH',
  sds: 'RS',
  'hdz bih': 'HRHB',
  hdz: 'HRHB',
  'sk-sdp': 'RBiH'
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(s: string): string {
  return normalizeWhitespace(s).toLowerCase();
}

function parseArgs(): { input: string } {
  const args = process.argv.slice(2);
  let input = join(ROOT, DEFAULT_INPUT);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      const next = args[++i];
      input = next.startsWith('/') || /^[A-Za-z]:/.test(next) ? next : join(ROOT, next);
      break;
    }
  }
  return { input };
}

interface RemapRow {
  post1995_code: string;
  post1995_name: string;
  mun1990_name?: string;
}

interface RemapFile {
  rows?: RemapRow[];
  index_by_post1995_code?: Record<string, string>;
}

function buildNameToCodes(remap: RemapFile): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const rows = remap.rows ?? [];
  for (const row of rows) {
    const code = row.post1995_code;
    if (!code) continue;
    for (const name of [row.post1995_name, row.mun1990_name].filter(Boolean) as string[]) {
      const key = normalizeForMatch(name);
      if (!key) continue;
      const list = map.get(key) ?? [];
      if (!list.includes(code)) list.push(code);
      map.set(key, list);
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.localeCompare(b));
  return map;
}

function partyToController(partyRaw: string): ControllerId | null {
  const key = normalizeForMatch(partyRaw);
  if (!key) return null;
  if (PARTY_TO_CONTROLLER[key]) return PARTY_TO_CONTROLLER[key];
  if (key.includes('demokratske akcije') || key.includes('sda')) return 'RBiH';
  if (key.includes('srpska demokratska') || key.includes('sds')) return 'RS';
  if (key.includes('hrvatska demokratska') || key.includes('hdz')) return 'HRHB';
  if (key.includes('demokratskih promjena') || key.includes('komunista')) return 'RBiH'; // SK-SDP
  return null;
}

async function extractFromExcel(inputPath: string): Promise<Record<string, ControllerId>> {
  const buffer = await readFile(inputPath);
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

  const muniHeader = headers.find(
    (h) =>
      /municipality/i.test(h) ||
      /op[cć]ina/i.test(h) ||
      /opstina/i.test(h)
  );
  const partyHeader = headers.find(
    (h) =>
      /party/i.test(h) ||
      /stranka/i.test(h) ||
      /winner/i.test(h) ||
      /1990/i.test(h)
  );
  if (!muniHeader || !partyHeader) {
    throw new Error(
      `Required columns not found. Need municipality-like and party-like. Headers: ${headers.join(', ')}`
    );
  }
  const colMuni = headers.indexOf(muniHeader);
  const colParty = headers.indexOf(partyHeader);

  const remapRaw = await readFile(INDEX_PATH, 'utf8');
  const remap = JSON.parse(remapRaw) as RemapFile;
  const nameToCodes = buildNameToCodes(remap);

  const mapping: Record<string, ControllerId> = {};
  const unknownParties = new Set<string>();
  const unmatchedMunicipalities = new Set<string>();

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const cellMuni = sheet[XLSX.utils.encode_cell({ r, c: colMuni })];
    const cellParty = sheet[XLSX.utils.encode_cell({ r, c: colParty })];
    const muniRaw = cellMuni && cellMuni.v != null ? normalizeWhitespace(String(cellMuni.v)) : '';
    const partyRaw = cellParty && cellParty.v != null ? normalizeWhitespace(String(cellParty.v)) : '';
    if (!muniRaw || !partyRaw) continue;

    const controller = partyToController(partyRaw);
    if (!controller) {
      unknownParties.add(partyRaw);
      continue;
    }

    const key = normalizeForMatch(muniRaw);
    const codes = nameToCodes.get(key);
    if (!codes || codes.length === 0) {
      unmatchedMunicipalities.add(muniRaw);
      continue;
    }
    for (const code of codes) {
      mapping[code] = controller;
    }
  }

  if (unknownParties.size > 0) {
    throw new Error(
      `Unknown party names (cannot map to RBiH/RS/HRHB): ${[...unknownParties].sort().join(', ')}`
    );
  }
  if (Object.keys(mapping).length === 0) {
    throw new Error('Mapping is empty. Check Excel columns and remap index.');
  }
  if (unmatchedMunicipalities.size > 0) {
    process.stderr.write(
      `Warning: Unmatched municipalities (not in remap): ${[...unmatchedMunicipalities].sort().join(', ')}\n`
    );
  }

  return mapping;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

async function validateAndAssertOrder(path: string): Promise<void> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed) || typeof parsed.version !== 'string' || !isRecord(parsed.mappings)) {
    throw new Error(
      `Invalid output: expected { version: string, mappings: Record<string, RBiH|RS|HRHB> } at ${path}`
    );
  }
  const mappings = parsed.mappings as Record<string, unknown>;
  if (Object.keys(mappings).length === 0) {
    throw new Error(`Output mapping is empty at ${path}`);
  }
  const keys = Object.keys(mappings);
  const sorted = [...keys].sort((a, b) => a.localeCompare(b));
  if (keys.length !== sorted.length || keys.some((k, i) => k !== sorted[i])) {
    throw new Error(
      `Output mappings are not lexicographically sorted at ${path}. Do not rewrite; fix the generator.`
    );
  }
  for (const [mun_code, controller] of Object.entries(mappings)) {
    if (controller !== null && !CANONICAL_IDS.includes(controller as ControllerId)) {
      throw new Error(
        `Invalid controller for municipality ${mun_code}: ${controller} (must be RBiH, RS, HRHB, or null)`
      );
    }
  }
}

async function main(): Promise<void> {
  const { input } = parseArgs();
  if (!existsSync(input)) {
    throw new Error(
      `Excel not found: ${input}. Expected data/source/1990 to 1995 municipalities_BiH.xlsx or pass --input <path>.`
    );
  }
  if (!existsSync(INDEX_PATH)) {
    throw new Error(
      `Municipality index not found: ${INDEX_PATH}. Run map pipeline to produce municipality_post1995_to_mun1990.json.`
    );
  }

  const mapping = await extractFromExcel(input);
  const sortedEntries = Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b));
  const out = {
    version: 'extract1990_v1',
    mappings: Object.fromEntries(sortedEntries)
  };
  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  await validateAndAssertOrder(OUTPUT_PATH);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
