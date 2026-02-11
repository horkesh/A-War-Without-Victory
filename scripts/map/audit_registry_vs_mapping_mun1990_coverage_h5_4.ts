/**
 * Phase H5.4: Audit registry vs mapping mun1990 coverage
 *
 * Deterministic report of:
 * - mapping_ids (mun1990 slugs from municipality_post1995_to_mun1990)
 * - registry_ids (from canonical registry: prefer registry_110 when present)
 * - missing_in_registry = mapping_ids - registry_ids
 * - unused_in_mapping = registry_ids - mapping_ids
 * - Focus section for Banovići (post1995 codes mapping to banovici)
 *
 * Usage: npm run map:audit:registry-vs-mapping:h5_4
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MUN1990_ALIAS_MAP } from './_shared/mun1990_id_normalizer.js';
import { getCanonicalMun1990RegistryPath } from './_shared/mun1990_registry_selector.js';


const ROOT = resolve();
const DERIVED_DIR = resolve(ROOT, 'data/derived');

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
  const registryPath = getCanonicalMun1990RegistryPath(ROOT);
  const registryBase = registryPath.split(/[/\\]/).pop() ?? '';
  const mappingPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');

  if (!existsSync(mappingPath)) {
    process.stderr.write(`FAIL: mapping not found: ${mappingPath}\n`);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    rows?: Array<{ mun1990_id: string }>;
  };
  const registry_ids = new Set<string>((registry.rows ?? []).map((r) => r.mun1990_id));

  const mapping = JSON.parse(readFileSync(mappingPath, 'utf8')) as {
    rows?: Array<{ post1995_code: string; mun1990_name: string }>;
  };
  const mapping_ids = new Set<string>();
  const banoviciRows: Array<{ post1995_code: string; mun1990_name: string }> = [];

  for (const r of mapping.rows ?? []) {
    const mun1990_name = String(r.mun1990_name ?? '').trim();
    if (!mun1990_name) continue;
    let slug = normalizeToSlug(mun1990_name);
    slug = MUN1990_ALIAS_MAP[slug] ?? slug;
    mapping_ids.add(slug);
    if (slug === 'banovici') {
      banoviciRows.push({
        post1995_code: String(r.post1995_code ?? '').trim(),
        mun1990_name,
      });
    }
  }

  const missing_in_registry = [...mapping_ids].filter((id) => !registry_ids.has(id)).sort((a, b) => a.localeCompare(b));
  const unused_in_mapping = [...registry_ids].filter((id) => !mapping_ids.has(id)).sort((a, b) => a.localeCompare(b));

  const report = {
    phase: 'h5_4',
    registry_file: registryBase,
    registry_count: registry_ids.size,
    mapping_count: mapping_ids.size,
    missing_in_registry,
    unused_in_mapping,
    banovici: {
      post1995_codes: banoviciRows.map((r) => r.post1995_code).sort((a, b) => a.localeCompare(b)),
      rows: banoviciRows.sort((a, b) => a.post1995_code.localeCompare(b.post1995_code)),
    },
  };

  mkdirSync(DERIVED_DIR, { recursive: true });
  const jsonPath = resolve(DERIVED_DIR, 'h5_4_registry_vs_mapping_coverage.json');
  const txtPath = resolve(DERIVED_DIR, 'h5_4_registry_vs_mapping_coverage.txt');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`Wrote ${jsonPath}\n`);

  const lines: string[] = [
    'H5.4 Registry vs Mapping mun1990 Coverage',
    '========================================',
    '',
    `Registry file: ${registryBase}`,
    `Registry count: ${registry_ids.size}`,
    `Mapping unique mun1990 slugs: ${mapping_ids.size}`,
    '',
    'Missing in registry (mapping references these but registry does not):',
    missing_in_registry.length === 0 ? '  (none)' : missing_in_registry.map((id) => `  - ${id}`).join('\n'),
    '',
    'Unused in mapping (registry has these but mapping does not use):',
    unused_in_mapping.length === 0 ? '  (none)' : unused_in_mapping.slice(0, 20).map((id) => `  - ${id}`).join('\n') + (unused_in_mapping.length > 20 ? `\n  ... and ${unused_in_mapping.length - 20} more` : ''),
    '',
    'Banovići focus:',
    `  post1995 codes mapping to banovici: ${report.banovici.post1995_codes.join(', ')}`,
    ...report.banovici.rows.map((r) => `  - ${r.post1995_code}: mun1990_name="${r.mun1990_name}"`),
  ];

  writeFileSync(txtPath, lines.join('\n') + '\n', 'utf8');
  process.stdout.write(`Wrote ${txtPath}\n`);

  if (missing_in_registry.length > 0) {
    process.stdout.write(`\nNOTE: ${missing_in_registry.length} mapping IDs missing from registry: ${missing_in_registry.join(', ')}\n`);
  }
}

main();
