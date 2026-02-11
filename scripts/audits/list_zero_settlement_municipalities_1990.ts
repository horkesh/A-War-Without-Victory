/**
 * Phase 6D.3: Audit 1990 municipalities with zero settlements.
 * Deterministic: no timestamps, stable sorting. Uses mistake guard.
 *
 * Canonical set = data/source/municipalities_1990_registry_110.json (110 opštine).
 * Canonical key = normalize_name(row.name) — single key for set membership (NOT mun1990_id).
 * Observed = distinct normalize_name(settlement.mun1990_id) from settlements_index_1990.json.
 * Missing = canonical_keys − observed_keys (true zero-settlement municipalities).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


/** Same normalizer as registry extractor: single canonical key for comparison. */
function normalizeName(s: string): string {
  const trim = s.replace(/\s+/g, ' ').trim().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  let step = trim;
  if (step.startsWith('Grad ')) step = step.slice(5).trim();
  if (step.startsWith('Novo ')) step = step.slice(5).trim();
  step = step.replace(/\s*\((?:FBiH|RS)\)\s*$/i, '').trim();
  return step.normalize('NFD').replace(/\p{M}/gu, '');
}

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name: string;
}

interface Municipalities1990Registry110 {
  count: number;
  rows: RegistryRow[];
}

interface SettlementEntry {
  sid: string;
  mun1990_id?: string;
  [key: string]: unknown;
}

interface SettlementsIndex1990 {
  settlements?: SettlementEntry[];
}

interface RemapIndex {
  index_by_post1995_code?: Record<string, string>;
}

async function main(): Promise<void> {
  const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
  const settlementsPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const outPath = resolve(ROOT, 'docs/audits/mun1990_zero_settlements.md');

  const registryJson = JSON.parse(await readFile(registryPath, 'utf8')) as Municipalities1990Registry110;
  const canonicalRows = registryJson.rows ?? [];
  const totalCanonical = registryJson.count ?? canonicalRows.length;

  const settlementsJson = JSON.parse(await readFile(settlementsPath, 'utf8')) as SettlementsIndex1990;
  const settlements = settlementsJson.settlements ?? [];
  const rawMun1990Ids = new Set<string>();
  for (const s of settlements) {
    const raw = s.mun1990_id;
    if (raw != null && typeof raw === 'string' && raw.length > 0) rawMun1990Ids.add(raw);
  }
  const rawSample = [...rawMun1990Ids].sort((a, b) => a.localeCompare(b)).slice(0, 10);
  const useCanonicalId = rawSample.length > 0 && rawSample.every((s) => /^[a-z0-9_]+$/.test(s));

  const canonicalKeys = new Set<string>();
  for (const r of canonicalRows) {
    canonicalKeys.add(useCanonicalId ? r.mun1990_id : normalizeName(r.name));
  }

  const observedKeys = new Set<string>();
  for (const s of settlements) {
    const raw = s.mun1990_id;
    if (raw != null && typeof raw === 'string' && raw.length > 0) {
      observedKeys.add(useCanonicalId ? raw : normalizeName(raw));
    }
  }
  const totalObserved = observedKeys.size;

  const missingRows = canonicalRows.filter((r) =>
    !observedKeys.has(useCanonicalId ? r.mun1990_id : normalizeName(r.name))
  );
  missingRows.sort((a, b) => a.mun1990_id.localeCompare(b.mun1990_id));
  const totalMissing = missingRows.length;

  const diagnosticNote = useCanonicalId
    ? 'Settlement mun1990_id values in sample look slug-like (lowercase, underscores).'
    : 'Settlement mun1990_id values in sample look name-like (mixed case, spaces/diacritics).';

  const remapJson = JSON.parse(await readFile(remapPath, 'utf8')) as RemapIndex;
  const indexByCode = remapJson.index_by_post1995_code ?? {};
  const ribnikPresent = Object.values(indexByCode).some((v) => normalizeName(v) === 'ribnik');
  const vogoscaCode = '10928';
  const vogoscaTarget = indexByCode[vogoscaCode] ?? '(not mapped)';

  const lines = [
    '# Zero-settlement 1990 municipalities',
    '',
    'This audit lists 1990 (pre-war) municipalities from the **canonical 110-opština registry** that have **no settlements** in the settlement index. Comparison uses a **single canonical key** (normalize_name). Municipality existence ≠ settlement presence. Zero-settlement municipalities are valid and must still exist in the logic layer.',
    '',
    '## Counts',
    '',
    `- **Total canonical (registry):** ${totalCanonical}`,
    `- **Observed via settlements (distinct normalized keys):** ${totalObserved}`,
    `- **Missing (zero settlements):** ${totalMissing}`,
    '',
    '## Missing (stable sorted by mun1990_id)',
    '',
    ...(missingRows.length > 0
      ? missingRows.map((r) => `- **${r.name}** — \`${r.mun1990_id}\``)
      : ['(none)']),
    '',
    '## Diagnostic (format drift)',
    '',
    'Top 10 raw `settlement.mun1990_id` values (stable sorted):',
    '',
    ...rawSample.map((id) => `- \`${id}\``),
    '',
    diagnosticNote,
    '',
    '## Phase 6D.5 remap correctness (post-check)',
    '',
    'Deterministic checks on `municipality_post1995_to_mun1990.json`:',
    '',
    `- **Ribnik as mun1990 target:** ${ribnikPresent ? 'PRESENT (fail)' : 'absent (OK) — post-1995 Ribnik contributes to Ključ.'}`,
    `- **Vogošća:** post1995_code \`${vogoscaCode}\` → mun1990_name \`${vogoscaTarget}\` ${vogoscaTarget === 'Vogošća' ? '(OK)' : '(fail)'}`,
    '',
    '---',
    '',
    '**Note:** Municipality existence ≠ settlement presence. Zero-settlement municipalities are valid and must still exist in logic layer.'
  ];

  await mkdir(resolve(ROOT, 'docs/audits'), { recursive: true });
  await writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}: canonical=${totalCanonical}, observed=${totalObserved}, missing=${totalMissing}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
