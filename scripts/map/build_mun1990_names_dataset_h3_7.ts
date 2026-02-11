/**
 * Phase H3.7: Build mun1990_names.json for municipality display names
 *
 * Reads canonical mun1990 registry (via selector) and municipality_post1995_to_mun1990.json,
 * outputs deterministic mun1990_names.json with by_municipality_id and by_mun1990_id lookups.
 * H5.3: All mun1990_id keys are canonical (registry + alias normalization); unresolvable ids fail hard.
 *
 * Usage:
 *   npm run map:build:mun1990-names:h3_7
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';


const ROOT = resolve();
const DEBUG_UNRESOLVABLE_PATH = resolve(ROOT, 'data/derived/_debug/h5_3_unresolvable_mun1990_ids.json');

function normalizeToSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function main(): void {
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const outputPath = resolve(ROOT, 'data/derived/mun1990_names.json');

  const { registrySet, displayNameById } = buildMun1990RegistrySet(ROOT);
  const rows = Array.from(registrySet).sort((a, b) => a.localeCompare(b)).map((id) => ({
    mun1990_id: id,
    name: displayNameById[id] ?? id,
  }));

  const byMun1990Id: Record<string, { municipality_id: string; display_name: string }> = {};
  const byMunicipalityId: Record<string, { mun1990_id: string; display_name: string }> = {};
  const mun1990ToPost1995 = new Map<string, string>();
  const unresolvable: Array<{ post1995_code: string; mun1990_name: string; raw_slug: string }> = [];

  if (existsSync(remapPath)) {
    const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as {
      rows?: Array<{ post1995_code: string; mun1990_name: string }>;
    };
    for (const r of remap.rows ?? []) {
      const post1995_code = String(r.post1995_code ?? '').trim();
      const mun1990_name = String(r.mun1990_name ?? '').trim();
      if (!post1995_code || !mun1990_name) continue;
      const rawSlug = normalizeToSlug(mun1990_name);
      const { canonical, reason } = normalizeMun1990Id(rawSlug, MUN1990_ALIAS_MAP, registrySet);
      if (canonical == null) {
        unresolvable.push({ post1995_code, mun1990_name, raw_slug: rawSlug });
        continue;
      }
      const display_name = displayNameById[canonical] ?? mun1990_name;
      byMunicipalityId[post1995_code] = { mun1990_id: canonical, display_name };
      if (!mun1990ToPost1995.has(canonical)) mun1990ToPost1995.set(canonical, post1995_code);
    }
  }

  if (unresolvable.length > 0) {
    mkdirSync(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    writeFileSync(
      DEBUG_UNRESOLVABLE_PATH,
      JSON.stringify({ phase: 'h5_3', unresolvable }, null, 2),
      'utf8'
    );
    console.error(
      `FAIL: ${unresolvable.length} unresolvable mun1990_id (not in registry, not in aliasMap). First 10:`,
      unresolvable.slice(0, 10).map((u) => u.raw_slug)
    );
    console.error('Debug list written to', DEBUG_UNRESOLVABLE_PATH);
    process.exit(1);
  }

  for (const row of rows) {
    const mun1990_id = row.mun1990_id;
    const display_name = row.name ?? mun1990_id;
    const municipality_id = mun1990ToPost1995.get(mun1990_id) ?? mun1990_id;
    byMun1990Id[mun1990_id] = { municipality_id, display_name };
  }

  const sortKeys = <T extends Record<string, unknown>>(obj: T): T => {
    const out = {} as T;
    for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
      (out as Record<string, unknown>)[k] = obj[k];
    }
    return out;
  };

  const output = {
    meta: {
      total_municipalities: rows.length,
      source: 'data/source/municipalities_1990_registry (canonical)',
      keys: ['municipality_id', 'mun1990_id', 'display_name'],
    },
    by_municipality_id: sortKeys(byMunicipalityId),
    by_mun1990_id: sortKeys(byMun1990Id),
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote', outputPath);
  console.log('  total_municipalities:', output.meta.total_municipalities);
  console.log('  by_municipality_id keys:', Object.keys(output.by_municipality_id).length);
  console.log('  by_mun1990_id keys:', Object.keys(output.by_mun1990_id).length);
}

main();
