/**
 * Phase 6D.0 / 6E.2 / 6E.3 / C.2: Remap settlements to 1990 municipality IDs.
 * Deterministic: no timestamps, stable ordering. Uses mistake guard.
 * Phase 6E.2: Explicit post-Dayton logic overrides (mun → mun1990_id, SID → Sokolac).
 * Phase 6E.3: Explicit SID overrides for screenshot settlements → Sokolac (20206:209465, 20206:209481).
 * Phase C.2: Emit canonical mun1990_id (snake_case ASCII from registry) and mun1990_name (human-readable).
 *
 * Input: data/derived/settlements_index.json, data/source/municipality_post1995_to_mun1990.json,
 *        data/source/municipalities_1990_registry_110.json
 * Output: data/derived/settlements_index_1990.json (mun1990_id = canonical key, mun1990_name = display name)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';


const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

/** Phase 6E.2: Post-Dayton mun name → 1990 logic mun1990_id. Applied AFTER index lookup. Preserve settlement name (do not overwrite with mun). */
const POST_1995_TO_1990_LOGIC_OVERRIDES: Record<string, { mun1990_id: string }> = {
  Milici: { mun1990_id: 'Vlasenica' },
  Milići: { mun1990_id: 'Vlasenica' },
  'Istocno Novo Sarajevo': { mun1990_id: 'Novo Sarajevo' },
  'Istocni Stari Grad': { mun1990_id: 'Stari Grad Sarajevo' }
};

/** Phase 6E.3: SIDs that must map to Sokolac (explicit list from screenshots; Istocni Stari Grad → Sokolac). */
const SID_OVERRIDES_TO_SOKOLAC: ReadonlySet<string> = new Set([
  '20206:209465',
  '20206:209481'
]);

/** Phase 6E.3: Required SIDs that must appear in output with mun1990_id Sokolac (fail-fast validation). */
const REQUIRED_SOKOLAC_SIDS = ['20206:209465', '20206:209481'] as const;

interface SettlementEntry {
  sid: string;
  source_id: string;
  mun_code: string;
  mun: string;
  [key: string]: unknown;
}

interface SettlementsIndex {
  version?: string;
  generated_at?: string;
  sid_strategy?: string;
  settlements: SettlementEntry[];
}

interface RemapIndex {
  schema_version: string;
  index_by_post1995_code: Record<string, string>;
}

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name?: string;
}

interface RegistryFile {
  rows?: RegistryRow[];
}

const PHASE6E2_COUNTS_PATH = resolve(ROOT, 'data/derived/mun1990_phase6e2_override_counts.json');
const MAX_UNMAPPED_SIDS_IN_ERROR = 20;

/** Build display name → canonical mun1990_id from registry (name and normalized_name). */
function buildDisplayNameToCanonical(registry: RegistryFile): Map<string, string> {
  const map = new Map<string, string>();
  const rows = registry.rows ?? [];
  for (const row of rows) {
    if (typeof row.mun1990_id === 'string' && row.mun1990_id.length > 0) {
      if (typeof row.name === 'string' && row.name.length > 0) map.set(row.name, row.mun1990_id);
      if (typeof row.normalized_name === 'string' && row.normalized_name.length > 0)
        map.set(row.normalized_name, row.mun1990_id);
    }
  }
  return map;
}

async function main(): Promise<void> {
  const settlementsPath = resolve(ROOT, 'data/derived/settlements_index.json');
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
  const outPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');

  const [settlementsJson, remapJson, registryJson] = await Promise.all([
    readFile(settlementsPath, 'utf8').then((t) => JSON.parse(t) as SettlementsIndex),
    readFile(remapPath, 'utf8').then((t) => JSON.parse(t) as RemapIndex),
    readFile(registryPath, 'utf8').then((t) => JSON.parse(t) as RegistryFile)
  ]);

  const displayNameToCanonical = buildDisplayNameToCanonical(registryJson);
  const index = remapJson.index_by_post1995_code ?? {};
  const settlements = settlementsJson.settlements ?? [];
  const unmapped: Array<{ sid: string; mun_code: string; mun: string }> = [];
  const unmappedDisplayName: Array<{ sid: string; mun1990_display: string }> = [];
  const entries: (SettlementEntry & { mun1990_id: string; mun1990_name: string; name?: string })[] = [];

  const overrideCounts: Record<string, number> = {
    Milici_to_Vlasenica: 0,
    Istocno_Novo_Sarajevo_to_Novo_Sarajevo: 0,
    Istocni_Stari_Grad_to_Stari_Grad_Sarajevo: 0,
    SID_to_Sokolac: 0
  };

  const sortedSettlements = [...settlements].sort((a, b) => a.sid.localeCompare(b.sid));
  for (const s of sortedSettlements) {
    let mun1990_display = index[s.mun_code];
    if (mun1990_display == null || mun1990_display === '') {
      unmapped.push({ sid: s.sid, mun_code: s.mun_code, mun: s.mun });
      continue;
    }
    const name: string | undefined = (s.name as string) ?? s.mun;

    if (SID_OVERRIDES_TO_SOKOLAC.has(s.sid)) {
      mun1990_display = 'Sokolac';
      overrideCounts.SID_to_Sokolac++;
    } else if (s.mun in POST_1995_TO_1990_LOGIC_OVERRIDES) {
      const override = POST_1995_TO_1990_LOGIC_OVERRIDES[s.mun];
      mun1990_display = override.mun1990_id;
      if (s.mun === 'Milici' || s.mun === 'Milići') overrideCounts.Milici_to_Vlasenica++;
      else if (s.mun === 'Istocno Novo Sarajevo') overrideCounts.Istocno_Novo_Sarajevo_to_Novo_Sarajevo++;
      else if (s.mun === 'Istocni Stari Grad') overrideCounts.Istocni_Stari_Grad_to_Stari_Grad_Sarajevo++;
    }

    const mun1990_id = displayNameToCanonical.get(mun1990_display);
    if (mun1990_id == null || mun1990_id === '') {
      unmappedDisplayName.push({ sid: s.sid, mun1990_display });
      continue;
    }
    entries.push({ ...s, mun1990_id, mun1990_name: mun1990_display, name });
  }

  if (unmappedDisplayName.length > 0) {
    const first = unmappedDisplayName.slice(0, MAX_UNMAPPED_SIDS_IN_ERROR);
    const sids = first.map((u) => u.sid).join(', ');
    const sample = first.map((u) => `${u.sid} (mun1990_display="${u.mun1990_display}")`).join('; ');
    throw new Error(
      `Phase C.2: ${unmappedDisplayName.length} settlement(s) have display name not in registry. ` +
        `First ${Math.min(MAX_UNMAPPED_SIDS_IN_ERROR, unmappedDisplayName.length)} SIDs: ${sids}. ` +
        `Sample: ${sample}. Ensure municipalities_1990_registry_110.json covers all display names from remap/overrides.`
    );
  }

  for (const sid of REQUIRED_SOKOLAC_SIDS) {
    const entry = entries.find((e) => e.sid === sid);
    if (!entry) {
      throw new Error(`Expected SID override not found in settlements_index_1990: ${sid}`);
    }
    if (entry.mun1990_id !== 'sokolac') {
      throw new Error(`Expected SID ${sid} to have mun1990_id sokolac, got ${entry.mun1990_id}`);
    }
  }

  if (unmapped.length > 0) {
    const auditPath = resolve(ROOT, 'docs/audits/settlements_mun1990_remap_coverage.md');
    const unmappedSorted = [...unmapped].sort((a, b) => a.sid.localeCompare(b.sid));
    const auditContent = [
      '# Settlements → 1990 municipality remap coverage audit',
      '',
      '**Generated by:** scripts/map/remap_settlements_to_mun1990.ts',
      '',
      '## Summary',
      '',
      `- **Total settlements:** ${settlements.length}`,
      `- **Successfully mapped:** ${entries.length}`,
      `- **Unmapped (no mun1990_id):** ${unmapped.length}`,
      '',
      '## Unmapped settlements (FAIL)',
      '',
      '| SID | mun_code | mun |',
      '|-----|----------|-----|',
      ...unmappedSorted.map((u) => `| ${u.sid} | ${u.mun_code} | ${u.mun} |`),
      '',
      '**Action:** Ensure municipality_post1995_to_mun1990.json index covers all mun_codes present in settlements_index.json.',
      ''
    ].join('\n');
    await mkdir(resolve(ROOT, 'docs/audits'), { recursive: true });
    await writeFile(auditPath, auditContent, 'utf8');
    console.error(`Unmapped: ${unmapped.length} settlements. Coverage report: ${auditPath}`);
    process.exit(1);
  }

  const mun1990Set = new Set(entries.map((e) => e.mun1990_id));
  const mun1990Count = mun1990Set.size;
  const expected1990 = 110;
  const mun1990Sorted = [...mun1990Set].sort((a, b) => a.localeCompare(b));

  const output: SettlementsIndex & { mun1990_universe_size?: number } = {
    ...settlementsJson,
    settlements: entries
  };
  delete (output as Record<string, unknown>).generated_at;
  if (mun1990Count !== expected1990) {
    output.mun1990_universe_size = mun1990Count;
  }

  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${outPath}: ${entries.length} settlements, ${mun1990Count} distinct mun1990_id.`);

  const leakIds = ['Milici', 'Milići', 'Istocno Novo Sarajevo', 'Istocni Stari Grad'];
  const leakCounts = leakIds.map((id) => entries.filter((e) => e.mun1990_id === id).length);
  const anyLeak = leakCounts.some((c) => c > 0);
  if (anyLeak) {
    const details = leakIds.map((id, i) => `${id}: ${leakCounts[i]}`).join('; ');
    throw new Error(`Phase 6E.2 validation failed: post-Dayton leaks still present (${details}).`);
  }

  await writeFile(
    PHASE6E2_COUNTS_PATH,
    JSON.stringify({ phase: '6E.2', override_counts: overrideCounts }, null, 2),
    'utf8'
  );
  console.log(`Phase 6E.2 override counts: ${JSON.stringify(overrideCounts)}`);

  const auditPath = resolve(ROOT, 'docs/audits/settlements_mun1990_remap_coverage.md');
  const auditLines = [
    '# Settlements → 1990 municipality remap coverage audit',
    '',
    '**Generated by:** scripts/map/remap_settlements_to_mun1990.ts',
    '',
    '## Summary',
    '',
    `- **Total settlements:** ${settlements.length}`,
    `- **Successfully mapped:** ${entries.length}`,
    `- **Unmapped (no mun1990_id):** 0`,
    `- **Resulting 1990 municipality count:** ${mun1990Count} (expected 110)`,
    ''
  ];
  if (mun1990Count !== expected1990) {
    auditLines.push(`- **Note:** ${expected1990 - mun1990Count} of 110 pre-war opštine have no settlements in this dataset.`, '');
  }
  auditLines.push('## Resulting 1990 municipalities (stable sorted)', '', ...mun1990Sorted.map((id) => `- ${id}`), '');
  await mkdir(resolve(ROOT, 'docs/audits'), { recursive: true });
  await writeFile(auditPath, auditLines.join('\n'), 'utf8');
  console.log(`Coverage audit: ${auditPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
