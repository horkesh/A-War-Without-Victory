/**
 * Audit: Find all duplicate settlement names across post-1995 split municipalities.
 *
 * Post-1995 some municipalities were split (e.g. Istočno Novo Sarajevo from Novo Sarajevo).
 * Multiple post1995 codes can map to the same mun1990. When they do, settlements with the
 * same name in different parts of the split are candidates for merge (split → original).
 *
 * INPUTS:
 *   - data/source/municipality_post1995_to_mun1990.json
 *   - data/source/municipalities_1990_registry_110.json
 *   - data/derived/settlement_names.json
 *
 * OUTPUT: Report to stdout and optionally a JSON file.
 *
 * Deterministic: stable sort by mun1990_id, then by settlement name.
 * Usage: npx tsx scripts/map/audit_split_municipality_duplicate_settlements.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const MAPPING_PATH = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
const REGISTRY_PATH = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
const NAMES_PATH = resolve(ROOT, 'data/derived/settlement_names.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/_audit/split_municipality_duplicate_settlements.json');

interface MappingRow {
  post1995_code: string;
  post1995_name: string;
  mun1990_name: string;
}

interface NameEntry {
  name: string;
  mun_code: string;
  source?: string;
}

function main() {
  const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8')) as { rows: MappingRow[] };
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as {
    rows: Array<{ mun1990_id: string; name: string }>;
  };
  const namesData = JSON.parse(readFileSync(NAMES_PATH, 'utf8')) as {
    by_census_id?: Record<string, NameEntry>;
  };

  const byCensusId = namesData.by_census_id ?? {};

  // mun1990_name -> mun1990_id
  const nameToId = new Map<string, string>();
  for (const row of registry.rows ?? []) {
    if (row.name && row.mun1990_id) {
      nameToId.set(row.name, row.mun1990_id);
    }
  }

  // post1995_code -> { mun1990_id, post1995_name }
  const codeToMun = new Map<string, { mun1990_id: string; post1995_name: string }>();
  for (const row of mapping.rows ?? []) {
    const mun1990_id = nameToId.get(row.mun1990_name) ?? row.mun1990_name.replace(/\s+/g, '_').toLowerCase();
    codeToMun.set(row.post1995_code, { mun1990_id, post1995_name: row.post1995_name });
  }

  // Group post1995 codes by mun1990_id
  const munToCodes = new Map<string, Array<{ code: string; name: string }>>();
  for (const row of mapping.rows ?? []) {
    const mun1990_id = nameToId.get(row.mun1990_name) ?? row.mun1990_name.replace(/\s+/g, '_').toLowerCase();
    const list = munToCodes.get(mun1990_id) ?? [];
    list.push({ code: row.post1995_code, name: row.post1995_name });
    munToCodes.set(mun1990_id, list);
  }

  // Keep only mun1990s with 2+ distinct post1995 codes (real splits)
  const splitMuns = Array.from(munToCodes.entries())
    .map(([mun, codes]) => {
      const distinct = Array.from(new Map(codes.map((c) => [c.code, c])).values());
      return [mun, distinct] as const;
    })
    .filter(([, codes]) => codes.length >= 2)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const report: Array<{
    mun1990_id: string;
    post1995_codes: Array<{ code: string; name: string }>;
    duplicate_pairs: Array<{
      settlement_name: string;
      from_sid: string;
      from_census_id: string;
      from_mun: string;
      into_sid: string;
      into_census_id: string;
      into_mun: string;
    }>;
  }> = [];

  let totalPairs = 0;
  const allPairs: Array<{ from_sid: string; into_sid: string; name: string }> = [];

  for (const [mun1990_id, codes] of splitMuns) {
    const codesSorted = codes.slice().sort((a, b) => a.code.localeCompare(b.code));

    // Name -> census_ids by post1995 code
    const nameByCode = new Map<string, Map<string, string[]>>();
    for (const { code } of codesSorted) {
      nameByCode.set(code, new Map());
    }

    for (const [censusId, entry] of Object.entries(byCensusId)) {
      if (!entry?.mun_code || !entry?.name) continue;
      const c = nameByCode.get(entry.mun_code);
      if (!c) continue;
      const list = c.get(entry.name) ?? [];
      list.push(censusId);
      c.set(entry.name, list);
    }

    // Find names that appear in more than one post1995 mun
    const nameToCensusIds = new Map<string, Array<{ code: string; census_ids: string[] }>>();
    for (const { code } of codesSorted) {
      const byName = nameByCode.get(code)!;
      for (const [name, censusIds] of byName) {
        const list = nameToCensusIds.get(name) ?? [];
        list.push({ code, census_ids: censusIds });
        nameToCensusIds.set(name, list);
      }
    }

    const duplicatePairs: typeof report[0]['duplicate_pairs'] = [];

    for (const [name, occurrences] of nameToCensusIds) {
      if (occurrences.length < 2) continue;
      const codesWithSettlement = occurrences.filter((o) => o.census_ids.length > 0);
      if (codesWithSettlement.length < 2) continue;

      // Convention: "into" = canonical (first by code), "from" = split (others)
      const byCode = new Map(codesSorted.map((c) => [c.code, c.name]));
      const sortedOccurrences = occurrences
        .filter((o) => o.census_ids.length > 0)
        .sort((a, b) => a.code.localeCompare(b.code));

      const into = sortedOccurrences[0];
      for (let i = 1; i < sortedOccurrences.length; i++) {
        const from = sortedOccurrences[i];
        for (const fromCid of from.census_ids) {
          for (const intoCid of into.census_ids) {
            duplicatePairs.push({
              settlement_name: name,
              from_sid: `S${fromCid}`,
              from_census_id: fromCid,
              from_mun: byCode.get(from.code) ?? from.code,
              into_sid: `S${intoCid}`,
              into_census_id: intoCid,
              into_mun: byCode.get(into.code) ?? into.code
            });
            allPairs.push({ from_sid: `S${fromCid}`, into_sid: `S${intoCid}`, name });
            totalPairs++;
          }
        }
      }
    }

    duplicatePairs.sort((a, b) => {
      if (a.settlement_name !== b.settlement_name) return a.settlement_name.localeCompare(b.settlement_name);
      return a.from_sid.localeCompare(b.from_sid);
    });

    if (duplicatePairs.length > 0) {
      report.push({
        mun1990_id,
        post1995_codes: codesSorted,
        duplicate_pairs: duplicatePairs
      });
    }
  }

  // Output
  console.log('=== Split Municipality Duplicate Settlement Audit ===\n');
  console.log(`Split mun1990s (2+ post1995 codes): ${splitMuns.length}`);
  console.log(`Total duplicate-name merge pairs: ${totalPairs}\n`);

  for (const r of report) {
    console.log(`\n## ${r.mun1990_id}`);
    console.log(`  Post-1995 codes: ${r.post1995_codes.map((c) => `${c.code} (${c.name})`).join(', ')}`);
    console.log(`  Duplicate pairs (from → into):`);
    for (const p of r.duplicate_pairs) {
      console.log(`    ${p.settlement_name}: ${p.from_sid} (${p.from_mun}) → ${p.into_sid} (${p.into_mun})`);
    }
  }

  const out = {
    schema_version: '1',
    generated_by: 'audit_split_municipality_duplicate_settlements.ts',
    split_mun_count: splitMuns.length,
    total_merge_pairs: totalPairs,
    by_mun1990: report,
    all_pairs: allPairs.sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.from_sid.localeCompare(b.from_sid);
    })
  };

  const outDir = resolve(ROOT, 'data/derived/_audit');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main();
