/**
 * Phase H4.1: Derive canonical municipality aggregates from settlement roster.
 *
 * Inputs: settlements_substrate.geojson (stream), political_control_data.json,
 *         mun1990_names.json, municipality_post1995_to_mun1990.json,
 *         optional settlement_ethnicity_data.json.
 * Outputs: municipality_agg_post1995.json, municipality_agg_1990.json.
 * No census rollup if mapping requires heuristics (census_rollup_available: false).
 *
 * Usage: npm run map:derive:municipality-agg:h4_1
 *   or: tsx scripts/map/derive_municipality_aggregates_h4_1.ts
 */

import { readFileSync, writeFileSync, existsSync, createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';


const FEATURES_ARRAY_START = '"features":[';
const FEATURES_MARKER = '"features":';

function findFeaturesArrayStart(buffer: string): number {
  const idx = buffer.indexOf(FEATURES_ARRAY_START);
  if (idx !== -1) return idx + FEATURES_ARRAY_START.length;
  const idx2 = buffer.indexOf(FEATURES_MARKER + ' [');
  if (idx2 !== -1) return idx2 + FEATURES_MARKER.length + 2;
  return -1;
}

function extractNextFeature(buffer: string, start: number): { objectString: string; nextIndex: number } | null {
  let pos = start;
  while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
  if (pos >= buffer.length || buffer[pos] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  const begin = pos;
  for (; pos < buffer.length; pos++) {
    const c = buffer[pos];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return { objectString: buffer.slice(begin, pos + 1), nextIndex: pos + 1 };
      continue;
    }
  }
  return null;
}

interface SubstrateRow {
  municipality_id: string;
  mun1990_id: string | null;
  controlKey: string;
}

function streamSubstrateRows(geojsonPath: string): Promise<SubstrateRow[]> {
  const rows: SubstrateRow[] = [];
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        resolvePromise(rows);
      }
    };
    const processBuffer = (): void => {
      if (featuresStart === -1) {
        featuresStart = findFeaturesArrayStart(buffer);
        if (featuresStart === -1) return;
        pos = featuresStart;
      }
      while (pos < buffer.length) {
        const extracted = extractNextFeature(buffer, pos);
        if (!extracted) return;
        pos = extracted.nextIndex;
        try {
          const feature = JSON.parse(extracted.objectString) as { id?: string; properties?: Record<string, unknown> };
          const props = feature?.properties ?? {};
          const sidRaw = props.sid ?? feature?.id;
          if (sidRaw == null) continue;
          let numeric_sid: string;
          if (typeof sidRaw === 'string' && /^S\d+$/.test(sidRaw)) {
            numeric_sid = sidRaw.slice(1);
          } else if (typeof sidRaw === 'string' && sidRaw.includes(':')) {
            numeric_sid = sidRaw.split(':')[1] ?? String(sidRaw).replace(/^S/i, '');
          } else {
            numeric_sid = String(sidRaw).replace(/^S/i, '');
          }
          const munId = props.municipality_id ?? props.mun1990_municipality_id ?? props.opstina_id ?? props.muni_id;
          if (munId == null || typeof munId !== 'string') continue;
          const municipality_id = String(munId).trim();
          const mun1990Raw = props.mun1990_id ?? props.mun1990_municipality_id;
          const mun1990_id = mun1990Raw != null && typeof mun1990Raw === 'string' ? String(mun1990Raw).trim() : null;
          const controlKey = `${municipality_id}:${numeric_sid}`;
          rows.push({ municipality_id, mun1990_id, controlKey });
        } catch {
          /* skip */
        }
        while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
        if (pos < buffer.length && buffer[pos] === ']') {
          finish();
          return;
        }
      }
    };
    const stream = createReadStream(geojsonPath, { encoding: 'utf8', highWaterMark: 256 * 1024 });
    stream.on('data', (chunk: string) => { buffer += chunk; processBuffer(); });
    stream.on('end', () => { processBuffer(); finish(); });
    stream.on('error', rejectPromise);
  });
}

function sortMunicipalityIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function sortMun1990Ids(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}

interface ControlCounts {
  RBiH: number;
  RS: number;
  HRHB: number;
  null: number;
}

function emptyControlCounts(): ControlCounts {
  return { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
}

interface AggEntry {
  mun1990_id: string | null;
  display_name: string;
  post1995_municipality_ids: string[];
  settlement_count_total: number;
  settlement_count_in_graph: number;
  settlement_count_ungraphed: number;
  control_counts: ControlCounts;
  ethnic_majority_top3?: Array<{ majority: string; count: number }>;
  flags: { any_ungraphed: boolean; any_null_control: boolean; any_mun1990_missing: boolean; any_conflict: boolean };
}

async function main(): Promise<void> {
  const derivedDir = resolve('data/derived');
  const sourceDir = resolve('data/source');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const controlPath = resolve(derivedDir, 'political_control_data.json');
  const mun1990NamesPath = resolve(derivedDir, 'mun1990_names.json');
  const remapPath = resolve(sourceDir, 'municipality_post1995_to_mun1990.json');
  const ethnicityPath = resolve(derivedDir, 'settlement_ethnicity_data.json');
  const outPost1995 = resolve(derivedDir, 'municipality_agg_post1995.json');
  const out1990 = resolve(derivedDir, 'municipality_agg_1990.json');

  if (!existsSync(substratePath)) {
    process.stderr.write(`FAIL: substrate not found: ${substratePath}\n`);
    process.exit(1);
  }
  if (!existsSync(controlPath)) {
    process.stderr.write(`FAIL: political_control_data not found: ${controlPath}\n`);
    process.exit(1);
  }
  if (!existsSync(mun1990NamesPath)) {
    process.stderr.write(`FAIL: mun1990_names not found: ${mun1990NamesPath}\n`);
    process.exit(1);
  }
  if (!existsSync(remapPath)) {
    process.stderr.write(`FAIL: municipality_post1995_to_mun1990 not found: ${remapPath}\n`);
    process.exit(1);
  }

  const { registrySet } = buildMun1990RegistrySet(resolve());
  const canonicalMun1990Ids = sortMun1990Ids([...registrySet]);

  const rows = await streamSubstrateRows(substratePath);
  const controlData = JSON.parse(readFileSync(controlPath, 'utf8')) as {
    by_settlement_id?: Record<string, string | null>;
    ungraphed_settlement_ids?: string[];
  };
  const by_settlement_id = controlData.by_settlement_id ?? {};
  const ungraphedSet = new Set(controlData.ungraphed_settlement_ids ?? []);

  const mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as {
    by_municipality_id?: Record<string, { display_name?: string; mun1990_id?: string }>;
    by_mun1990_id?: Record<string, { display_name?: string }>;
  };

  const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as { index_by_post1995_code?: Record<string, string> };
  const indexByPost1995 = remap.index_by_post1995_code ?? {};

  let ethnicityBySid: Record<string, { majority?: string }> = {};
  if (existsSync(ethnicityPath)) {
    const eth = JSON.parse(readFileSync(ethnicityPath, 'utf8')) as { by_settlement_id?: Record<string, { majority?: string }> };
    ethnicityBySid = eth.by_settlement_id ?? {};
  }

  // Resolve mun1990_id: from feature, else from mun1990_names.by_municipality_id; normalize to canonical (H5.3).
  const unresolvableMun1990: Array<{ municipality_id: string; controlKey: string; raw: string }> = [];
  function resolveMun1990Id(municipality_id: string, fromFeature: string | null, controlKey: string): string | null {
    const raw = fromFeature != null && fromFeature !== ''
      ? fromFeature
      : mun1990Names.by_municipality_id?.[municipality_id]?.mun1990_id ?? null;
    if (raw == null || raw === '') return null;
    const { canonical } = normalizeMun1990Id(raw.trim(), MUN1990_ALIAS_MAP, registrySet);
    if (canonical == null) {
      unresolvableMun1990.push({ municipality_id, controlKey, raw: raw.trim() });
      return null;
    }
    return canonical;
  }

  function displayNameForMunicipalityId(mid: string): string {
    return mun1990Names.by_municipality_id?.[mid]?.display_name ?? indexByPost1995[mid] ?? mid;
  }

  function displayNameForMun1990Id(mid: string): string {
    return mun1990Names.by_mun1990_id?.[mid]?.display_name ?? mid;
  }

  // Buckets: post1995 by municipality_id; mun1990 by mun1990_id
  const post1995Ids = sortMunicipalityIds([...new Set(rows.map((r) => r.municipality_id))]);
  const byPost1995: Record<string, { controlKeys: string[]; mun1990Ids: Set<string> }> = {};
  for (const mid of post1995Ids) {
    byPost1995[mid] = { controlKeys: [], mun1990Ids: new Set() };
  }

  const byMun1990: Record<string, { controlKeys: string[]; post1995Ids: Set<string> }> = {};
  for (const mid of canonicalMun1990Ids) {
    byMun1990[mid] = { controlKeys: [], post1995Ids: new Set() };
  }

  for (const r of rows) {
    const mun1990_id = resolveMun1990Id(r.municipality_id, r.mun1990_id, r.controlKey);
    byPost1995[r.municipality_id].controlKeys.push(r.controlKey);
    if (mun1990_id) byPost1995[r.municipality_id].mun1990Ids.add(mun1990_id);
    if (mun1990_id && mun1990_id in byMun1990) {
      byMun1990[mun1990_id].controlKeys.push(r.controlKey);
      byMun1990[mun1990_id].post1995Ids.add(r.municipality_id);
    }
  }

  if (unresolvableMun1990.length > 0) {
    const first10 = unresolvableMun1990.slice(0, 10).map((u) => `${u.municipality_id}:${u.raw}`);
    process.stderr.write(
      `FAIL: ${unresolvableMun1990.length} settlements with unresolvable mun1990_id (not in registry, not in aliasMap). First 10: ${first10.join('; ')}\n`
    );
    process.exit(1);
  }

  // Build post1995 aggregate (keyed by municipality_id)
  const aggPost1995: Record<string, AggEntry> = {};
  for (const mid of post1995Ids) {
    const rec = byPost1995[mid];
    const controlKeys = rec.controlKeys;
    const ungraphedCount = controlKeys.filter((k) => ungraphedSet.has(k)).length;
    const inGraphCount = controlKeys.length - ungraphedCount;
    const control_counts = emptyControlCounts();
    for (const k of controlKeys) {
      const v = by_settlement_id[k] ?? null;
      const key = v === null ? 'null' : v;
      if (key in control_counts) (control_counts as Record<string, number>)[key]++;
    }
    const mun1990Observed = [...rec.mun1990Ids];
    const any_conflict = mun1990Observed.length > 1;
    const any_mun1990_missing = mun1990Observed.length === 0;
    let ethnic_majority_top3: Array<{ majority: string; count: number }> | undefined;
    if (Object.keys(ethnicityBySid).length > 0) {
      const counts: Record<string, number> = {};
      for (const k of controlKeys) {
        const numericSid = k.split(':')[1];
        const sid = numericSid ? `S${numericSid}` : k;
        const majority = ethnicityBySid[sid]?.majority ?? 'unknown';
        counts[majority] = (counts[majority] ?? 0) + 1;
      }
      ethnic_majority_top3 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([majority, count]) => ({ majority, count }));
    }
    aggPost1995[mid] = {
      mun1990_id: mun1990Observed.length === 1 ? mun1990Observed[0]! : null,
      display_name: displayNameForMunicipalityId(mid),
      post1995_municipality_ids: [mid],
      settlement_count_total: controlKeys.length,
      settlement_count_in_graph: inGraphCount,
      settlement_count_ungraphed: ungraphedCount,
      control_counts,
      ethnic_majority_top3,
      flags: {
        any_ungraphed: ungraphedCount > 0,
        any_null_control: control_counts.null > 0,
        any_mun1990_missing,
        any_conflict,
      },
    };
  }

  // Build 1990 aggregate (keyed by mun1990_id); include all 110 from registry (some may have 0 settlements from substrate)
  const agg1990: Record<string, AggEntry & { census_rollup?: unknown }> = {};
  for (const mun1990_id of canonicalMun1990Ids) {
    const rec = byMun1990[mun1990_id];
    const controlKeys = rec?.controlKeys ?? [];
    const post1995IdsList = rec ? sortMunicipalityIds([...rec.post1995Ids]) : [];
    const ungraphedCount = controlKeys.filter((k) => ungraphedSet.has(k)).length;
    const inGraphCount = controlKeys.length - ungraphedCount;
    const control_counts = emptyControlCounts();
    for (const k of controlKeys) {
      const v = by_settlement_id[k] ?? null;
      const key = v === null ? 'null' : v;
      if (key in control_counts) (control_counts as Record<string, number>)[key]++;
    }
    let ethnic_majority_top3: Array<{ majority: string; count: number }> | undefined;
    if (Object.keys(ethnicityBySid).length > 0 && controlKeys.length > 0) {
      const counts: Record<string, number> = {};
      for (const k of controlKeys) {
        const numericSid = k.split(':')[1];
        const sid = numericSid ? `S${numericSid}` : k;
        const majority = ethnicityBySid[sid]?.majority ?? 'unknown';
        counts[majority] = (counts[majority] ?? 0) + 1;
      }
      ethnic_majority_top3 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([majority, count]) => ({ majority, count }));
    }
    agg1990[mun1990_id] = {
      mun1990_id,
      display_name: displayNameForMun1990Id(mun1990_id),
      post1995_municipality_ids: post1995IdsList,
      settlement_count_total: controlKeys.length,
      settlement_count_in_graph: inGraphCount,
      settlement_count_ungraphed: ungraphedCount,
      control_counts,
      ethnic_majority_top3,
      flags: {
        any_ungraphed: ungraphedCount > 0,
        any_null_control: control_counts.null > 0,
        any_mun1990_missing: false,
        any_conflict: false,
      },
    };
  }

  // Census rollup: only if clean deterministic mapping exists. We do not add heuristics; set available false.
  const census_rollup_available = false;

  const payloadPost1995 = {
    awwv_meta: {
      role: 'municipality_agg_post1995' as const,
      version: 'h4_1',
      source: ['settlements_substrate', 'political_control_data', 'mun1990_names', 'post1995_to_mun1990'],
    },
    by_municipality_id: aggPost1995,
  };

  const payload1990 = {
    awwv_meta: {
      role: 'municipality_agg_1990' as const,
      version: 'h4_1',
      source: ['settlements_substrate', 'political_control_data', 'mun1990_names', 'post1995_to_mun1990'],
    },
    census_rollup_available,
    by_mun1990_id: agg1990,
  };

  writeFileSync(outPost1995, JSON.stringify(payloadPost1995, null, 2), 'utf8');
  writeFileSync(out1990, JSON.stringify(payload1990, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outPost1995}\n`);
  process.stdout.write(`Wrote ${out1990}\n`);
}

main().then(
  () => {},
  (err) => {
    process.stderr.write(String(err));
    process.exit(1);
  }
);
