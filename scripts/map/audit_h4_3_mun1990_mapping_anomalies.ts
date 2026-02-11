/**
 * Phase H4.3: Mun1990 mapping anomalies report (deterministic, read-only).
 *
 * Generates a report of post1995→mun1990 mapping inconsistencies:
 * - post1995 municipality has mun1990_name that differs from mapped mun1990_id's display name
 * - multiple mun1990_ids share the same display name
 * - known post1995 split has unique mun1990_id instead of sharing parent mun1990_id
 *
 * Outputs: data/derived/h4_3_mun1990_mapping_anomalies.json and .txt
 *
 * Usage: npm run map:audit:h4-3-mun1990-anomalies
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCanonicalMun1990RegistryPath } from './_shared/mun1990_registry_selector.js';


function normalizeToSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

interface AnomalyRow {
  municipality_id: string;
  post1995_name: string;
  mun1990_name: string;
  mun1990_id: string;
  registry_display_name: string | null;
  anomaly: string;
}

function main(): void {
  const root = resolve();
  const registryPath = getCanonicalMun1990RegistryPath(root);
  const remapPath = resolve(root, 'data/source/municipality_post1995_to_mun1990.json');
  const outJson = resolve(root, 'data/derived/h4_3_mun1990_mapping_anomalies.json');
  const outTxt = resolve(root, 'data/derived/h4_3_mun1990_mapping_anomalies.txt');

  if (!existsSync(registryPath)) {
    process.stderr.write(`FAIL: registry not found: ${registryPath}\n`);
    process.exit(1);
  }
  if (!existsSync(remapPath)) {
    process.stderr.write(`FAIL: remap not found: ${remapPath}\n`);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    rows?: Array<{ mun1990_id: string; name: string }>;
  };
  const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as {
    rows?: Array< { post1995_code: string; post1995_name: string; mun1990_name: string }>;
  };

  const registryById = new Map<string, string>();
  const registryBySlug = new Map<string, string>();
  for (const row of registry.rows ?? []) {
    registryById.set(row.mun1990_id, row.name);
    const slug = normalizeToSlug(row.name);
    if (slug) registryBySlug.set(slug, row.name);
  }

  // Group post1995 by mun1990_id (derived from mun1990_name)
  const byMun1990Id = new Map<string, Array<{ municipality_id: string; post1995_name: string; mun1990_name: string }>>();
  const byDisplayName = new Map<string, string[]>();

  const anomalies: AnomalyRow[] = [];
  const rows = remap.rows ?? [];

  for (const r of rows) {
    const municipality_id = String(r.post1995_code ?? '').trim();
    const post1995_name = String(r.post1995_name ?? '').trim();
    const mun1990_name = String(r.mun1990_name ?? '').trim();
    if (!municipality_id || !mun1990_name) continue;

    const slug = normalizeToSlug(mun1990_name);
    const registryDisplay = registryById.get(slug) ?? registryBySlug.get(slug) ?? null;

    // Group by mun1990_id
    const list = byMun1990Id.get(slug) ?? [];
    list.push({ municipality_id, post1995_name, mun1990_name });
    byMun1990Id.set(slug, list);

    // Group by display name (mun1990_name as used)
    const names = byDisplayName.get(mun1990_name) ?? [];
    names.push(municipality_id);
    byDisplayName.set(mun1990_name, names);

    // Anomaly: post1995_name differs from mun1990_name (split) — check if mun1990_name matches registry
    const isSplit = post1995_name !== mun1990_name;
    if (isSplit && !registryDisplay) {
      anomalies.push({
        municipality_id,
        post1995_name,
        mun1990_name,
        mun1990_id: slug,
        registry_display_name: null,
        anomaly: 'split maps to mun1990_name not in registry',
      });
    }
  }

  // Known anomaly: Milići (20346) — should map to Vlasenica, not Milići
  const miliciEntry = rows.find((r) => String(r.post1995_code) === '20346');
  if (miliciEntry) {
    const mun1990_name = String(miliciEntry.mun1990_name ?? '');
    if (mun1990_name === 'Milići' || mun1990_name.toLowerCase().includes('milic')) {
      anomalies.push({
        municipality_id: '20346',
        post1995_name: String(miliciEntry.post1995_name ?? ''),
        mun1990_name,
        mun1990_id: 'milici',
        registry_display_name: registryById.get('milici') ?? 'Milići',
        anomaly: 'Milići was part of Vlasenica in 1990; should map to Vlasenica, not Milići',
      });
    }
  }

  // Multiple mun1990_ids sharing same display name (slug collision)
  const displayNameToSlugs = new Map<string, string[]>();
  for (const [slug, displayName] of registryById) {
    const list = displayNameToSlugs.get(displayName) ?? [];
    list.push(slug);
    displayNameToSlugs.set(displayName, list);
  }
  for (const [displayName, slugs] of displayNameToSlugs) {
    if (slugs.length > 1) {
      anomalies.push({
        municipality_id: '(registry)',
        post1995_name: displayName,
        mun1990_name: displayName,
        mun1990_id: slugs.join(', '),
        registry_display_name: displayName,
        anomaly: `multiple mun1990_ids share display name: ${slugs.join(', ')}`,
      });
    }
  }

  const byMun1990IdSorted = Object.fromEntries(
    [...byMun1990Id.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => [k, v.sort((a, b) => a.municipality_id.localeCompare(b.municipality_id))])
  );

  const report = {
    meta: {
      phase: 'H4.3',
      source: `municipality_post1995_to_mun1990.json + ${registryPath.split(/[/\\]/).pop() ?? 'registry'}`,
    },
    summary: {
      total_post1995: rows.length,
      total_mun1990_ids: byMun1990Id.size,
      anomaly_count: anomalies.length,
    },
    by_mun1990_id: byMun1990IdSorted,
    anomalies: anomalies.sort((a, b) => a.municipality_id.localeCompare(b.municipality_id)),
  };

  writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outJson}\n`);

  const lines: string[] = [
    'Phase H4.3 Mun1990 Mapping Anomalies Report',
    '',
    'Summary:',
    `  total post1995 municipalities: ${report.summary.total_post1995}`,
    `  distinct mun1990_ids: ${report.summary.total_mun1990_ids}`,
    `  anomaly count: ${report.summary.anomaly_count}`,
    '',
    'Anomalies (exact ids and current mappings):',
  ];
  for (const a of report.anomalies) {
    lines.push(`  municipality_id=${a.municipality_id} post1995_name="${a.post1995_name}" mun1990_name="${a.mun1990_name}" mun1990_id=${a.mun1990_id} | ${a.anomaly}`);
  }
  lines.push('');
  lines.push('Key mappings (Sanski Most / Oštra Luka):');
  const sanski = rows.find((r) => String(r.post1995_code) === '11541');
  const ostraluka = rows.find((r) => String(r.post1995_code) === '20435');
  if (sanski) lines.push(`  11541 (Sanski Most) -> mun1990_name="${sanski.mun1990_name}"`);
  if (ostraluka) lines.push(`  20435 (Oštra Luka) -> mun1990_name="${ostraluka.mun1990_name}"`);
  if (sanski && ostraluka && sanski.mun1990_name === ostraluka.mun1990_name) {
    lines.push('  -> Both map to same mun1990 (OK).');
  } else {
    lines.push('  -> MAPPING INCONSISTENCY.');
  }
  lines.push('');
  lines.push('Milići / Vlasenica:');
  const milici = rows.find((r) => String(r.post1995_code) === '20346');
  const vlasenica = rows.find((r) => String(r.post1995_code) === '20095');
  if (milici) lines.push(`  20346 (Milici) -> mun1990_name="${milici.mun1990_name}"`);
  if (vlasenica) lines.push(`  20095 (Vlasenica) -> mun1990_name="${vlasenica.mun1990_name}"`);
  lines.push('  Registry has Milići as separate mun1990: ' + (registry.rows?.some((r: { mun1990_id: string }) => r.mun1990_id === 'milici') ? 'YES (anomaly: should be 109)' : 'NO'));

  writeFileSync(outTxt, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${outTxt}\n`);
}

main();
