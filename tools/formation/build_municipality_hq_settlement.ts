#!/usr/bin/env node
/**
 * Build municipality_hq_settlement.json: one settlement per mun1990_id (capital or largest).
 * Rule: settlement whose name matches municipality name (normalized); if none or ambiguous,
 * use largest by 1991 population; tie-break by sid sort. Deterministic key order.
 * Output: data/derived/municipality_hq_settlement.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name: string;
}

interface RegistryJson {
  rows: RegistryRow[];
}

interface CensusRecord {
  n: string;
  m: string;
  p: number[];
}

interface CensusJson {
  by_sid: Record<string, CensusRecord>;
}

/** Normalize for name match: lowercase, strip diacritics (BiH Latin). */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd');
}

function main(): void {
  const repoRoot = process.cwd();
  const registryPath = resolve(repoRoot, 'data/source/municipalities_1990_registry_110.json');
  const censusPath = resolve(repoRoot, 'data/derived/census_rolled_up_wgs84.json');
  const outPath = resolve(repoRoot, 'data/derived/municipality_hq_settlement.json');

  const registryRaw = JSON.parse(readFileSync(registryPath, 'utf8')) as { rows?: RegistryRow[] };
  const registryRows = registryRaw.rows ?? [];
  const munById = new Map<string, RegistryRow>();
  for (const row of registryRows) {
    munById.set(row.mun1990_id, row);
  }

  const censusRaw = JSON.parse(readFileSync(censusPath, 'utf8')) as CensusJson;
  const bySid = censusRaw.by_sid ?? {};

  // Group settlements by mun1990_id (from census m field)
  const byMun = new Map<string, Array<{ sid: string; name: string; pop: number }>>();
  for (const [sid, rec] of Object.entries(bySid)) {
    const m = rec.m;
    if (!m) continue;
    const pop = Array.isArray(rec.p) && rec.p.length > 0 ? rec.p[0] : 0;
    if (!byMun.has(m)) byMun.set(m, []);
    byMun.get(m)!.push({ sid, name: rec.n ?? '', pop });
  }

  const result: Record<string, string> = {};
  const munIds = Array.from(munById.keys()).sort((a, b) => a.localeCompare(b));

  for (const mun1990_id of munIds) {
    const munRow = munById.get(mun1990_id);
    const settlements = byMun.get(mun1990_id) ?? [];
    const munNormalizedName = munRow ? normalizeName(munRow.normalized_name ?? munRow.name) : mun1990_id;

    const nameMatches = settlements.filter(
      (s) => normalizeName(s.name) === munNormalizedName
    );
    let chosen: { sid: string; name: string; pop: number } | undefined;
    if (nameMatches.length === 1) {
      chosen = nameMatches[0];
    } else if (settlements.length > 0) {
      // None or ambiguous: largest by population, then sid sort
      const sorted = [...settlements].sort((a, b) => {
        if (b.pop !== a.pop) return b.pop - a.pop;
        return a.sid.localeCompare(b.sid);
      });
      chosen = sorted[0];
    }
    if (chosen) {
      result[mun1990_id] = chosen.sid;
    } else if (settlements.length === 0) {
      console.warn(`No settlements in census for mun ${mun1990_id}, skipping HQ`);
    }
  }

  const out = {
    awwv_meta: {
      role: 'municipality_hq_settlement',
      source: [
        'data/source/municipalities_1990_registry_110.json',
        'data/derived/census_rolled_up_wgs84.json',
      ],
      rule: 'Capital = name match (normalized); else largest by 1991 pop; tie-break sid.',
    },
    by_mun1990_id: result,
  };

  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${outPath} (${Object.keys(result).length} municipalities)`);
}

main();
