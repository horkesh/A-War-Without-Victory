/**
 * Phase H5.3: Audit mun1990_id integrity across derived chain.
 *
 * Inputs: canonical mun1990 registry (via selector), municipality_post1995_to_mun1990.json,
 *         mun1990_names.json, municipality_agg_post1995.json, municipality_agg_1990.json,
 *         settlements_substrate.geojson (stream).
 * Outputs: data/derived/h5_3_mun1990_id_integrity.json, .txt
 *
 * Usage: npm run map:audit:mun1990-id-integrity:h5_3
 */

import { readFileSync, writeFileSync, createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');

function normalizeToSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

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

function streamSubstrateMun1990Ids(geojsonPath: string): Promise<Set<string>> {
  const ids = new Set<string>();
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        resolvePromise(ids);
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
          const feature = JSON.parse(extracted.objectString) as { properties?: Record<string, unknown> };
          const props = feature?.properties ?? {};
          const raw = props.mun1990_id ?? props.mun1990_municipality_id;
          if (raw != null && typeof raw === 'string') {
            const v = String(raw).trim();
            if (v) ids.add(v);
          }
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

interface Report {
  registry_valid_ids_count: number;
  distinct_raw_ids_by_source: {
    mapping_file_raw_ids: string[];
    substrate_raw_ids: string[];
    mun1990_names_raw_ids: string[];
    municipality_agg_1990_raw_ids: string[];
  };
  invalid_ids_by_source: Record<string, string[]>;
  resolvable_by_alias: string[];
  unresolvable_invalid_ids: string[];
}

async function run(): Promise<void> {
  const { registrySet } = buildMun1990RegistrySet(ROOT);
  const registryValidCount = registrySet.size;

  const mappingPath = resolve(SOURCE, 'municipality_post1995_to_mun1990.json');
  const mappingFileRawIds = new Set<string>();
  if (existsSync(mappingPath)) {
    const mapping = JSON.parse(readFileSync(mappingPath, 'utf8')) as {
      rows?: Array<{ mun1990_name?: string }>;
    };
    for (const r of mapping.rows ?? []) {
      const name = String(r.mun1990_name ?? '').trim();
      if (!name) continue;
      mappingFileRawIds.add(normalizeToSlug(name));
    }
  }

  let substrateRawIds = new Set<string>();
  const substratePath = resolve(DERIVED, 'settlements_substrate.geojson');
  if (existsSync(substratePath)) {
    substrateRawIds = await streamSubstrateMun1990Ids(substratePath);
  }

  const mun1990NamesRawIds = new Set<string>();
  const mun1990NamesPath = resolve(DERIVED, 'mun1990_names.json');
  if (existsSync(mun1990NamesPath)) {
    const names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as {
      by_mun1990_id?: Record<string, unknown>;
      by_municipality_id?: Record<string, { mun1990_id?: string }>;
    };
    for (const k of Object.keys(names.by_mun1990_id ?? {})) mun1990NamesRawIds.add(k);
    for (const v of Object.values(names.by_municipality_id ?? {})) {
      if (v?.mun1990_id) mun1990NamesRawIds.add(v.mun1990_id);
    }
  }

  const municipalityAgg1990RawIds = new Set<string>();
  const agg1990Path = resolve(DERIVED, 'municipality_agg_1990.json');
  if (existsSync(agg1990Path)) {
    const agg = JSON.parse(readFileSync(agg1990Path, 'utf8')) as {
      by_mun1990_id?: Record<string, unknown>;
    };
    for (const k of Object.keys(agg.by_mun1990_id ?? {})) municipalityAgg1990RawIds.add(k);
  }

  const invalidBySource: Record<string, string[]> = {
    mapping_file_raw_ids: [],
    substrate_raw_ids: [],
    mun1990_names_raw_ids: [],
    municipality_agg_1990_raw_ids: [],
  };

  function collectInvalid(sourceKey: string, rawIds: Set<string>): void {
    const invalid: string[] = [];
    for (const raw of rawIds) {
      const res = normalizeMun1990Id(raw, MUN1990_ALIAS_MAP, registrySet);
      if (res.canonical == null) invalid.push(raw);
    }
    invalid.sort((a, b) => a.localeCompare(b));
    invalidBySource[sourceKey] = invalid;
  }

  collectInvalid('mapping_file_raw_ids', mappingFileRawIds);
  collectInvalid('substrate_raw_ids', substrateRawIds);
  collectInvalid('mun1990_names_raw_ids', mun1990NamesRawIds);
  collectInvalid('municipality_agg_1990_raw_ids', municipalityAgg1990RawIds);

  const allInvalid = new Set<string>();
  for (const arr of Object.values(invalidBySource)) {
    for (const id of arr) allInvalid.add(id);
  }

  const resolvableByAlias: string[] = [];
  const unresolvable: string[] = [];
  for (const raw of [...allInvalid].sort((a, b) => a.localeCompare(b))) {
    const res = normalizeMun1990Id(raw, MUN1990_ALIAS_MAP, registrySet);
    if (res.canonical != null) resolvableByAlias.push(raw);
    else unresolvable.push(raw);
  }

  const report: Report = {
    registry_valid_ids_count: registryValidCount,
    distinct_raw_ids_by_source: {
      mapping_file_raw_ids: [...mappingFileRawIds].sort((a, b) => a.localeCompare(b)),
      substrate_raw_ids: [...substrateRawIds].sort((a, b) => a.localeCompare(b)),
      mun1990_names_raw_ids: [...mun1990NamesRawIds].sort((a, b) => a.localeCompare(b)),
      municipality_agg_1990_raw_ids: [...municipalityAgg1990RawIds].sort((a, b) => a.localeCompare(b)),
    },
    invalid_ids_by_source: invalidBySource,
    resolvable_by_alias: resolvableByAlias,
    unresolvable_invalid_ids: unresolvable,
  };

  const jsonPath = resolve(DERIVED, 'h5_3_mun1990_id_integrity.json');
  const txtPath = resolve(DERIVED, 'h5_3_mun1990_id_integrity.txt');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  const lines: string[] = [
    'H5.3 mun1990_id integrity audit',
    `registry_valid_ids_count: ${report.registry_valid_ids_count}`,
    '',
    'distinct_raw_ids_by_source:',
    `  mapping_file_raw_ids: ${report.distinct_raw_ids_by_source.mapping_file_raw_ids.length}`,
    `  substrate_raw_ids: ${report.distinct_raw_ids_by_source.substrate_raw_ids.length}`,
    `  mun1990_names_raw_ids: ${report.distinct_raw_ids_by_source.mun1990_names_raw_ids.length}`,
    `  municipality_agg_1990_raw_ids: ${report.distinct_raw_ids_by_source.municipality_agg_1990_raw_ids.length}`,
    '',
    'invalid_ids_by_source (not in registry, stable sorted):',
    ...Object.entries(report.invalid_ids_by_source).map(([k, v]) => `  ${k}: ${v.length} ${v.length ? v.join(', ') : ''}`),
    '',
    `resolvable_by_alias: ${report.resolvable_by_alias.length} ${report.resolvable_by_alias.join(', ') || ''}`,
    `unresolvable_invalid_ids: ${report.unresolvable_invalid_ids.length} ${report.unresolvable_invalid_ids.join(', ') || ''}`,
  ];
  writeFileSync(txtPath, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${txtPath}\n`);
  if (report.unresolvable_invalid_ids.length > 0) {
    process.stderr.write(`FAIL: ${report.unresolvable_invalid_ids.length} unresolvable mun1990_id: ${report.unresolvable_invalid_ids.join(', ')}\n`);
    process.exit(1);
  }
  process.stdout.write('PASS: H5.3 mun1990_id integrity (unresolvable_invalid_ids == 0).\n');
}

run().then(
  () => {},
  (err) => {
    process.stderr.write(String(err));
    process.exit(1);
  }
);
