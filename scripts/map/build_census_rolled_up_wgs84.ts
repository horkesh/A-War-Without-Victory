/**
 * Build canonical rolled-up census for the 6002 emitted sids (WGS84 layer).
 * Uses settlements_wgs84_1990.geojson (which already has merged population per feature)
 * and settlements_wgs84_1990_report.json for merge_mapping traceability.
 *
 * Output: data/derived/census_rolled_up_wgs84.json
 *   - by_sid: { [sid]: { n, m, p } } — one record per emitted sid; p = [total, bosniaks, croats, serbs, others]
 *   - merge_mapping: from report (from→into) for traceability
 * Deterministic: stable sort of sids; no timestamps or randomness.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const WGS84_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990.geojson');
const REPORT_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990_report.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/census_rolled_up_wgs84.json');

interface FeatureProps {
  sid?: string;
  settlement_name?: string;
  mun1990_id?: string;
  mun1990_name?: string;
  population_total?: number;
  population_bosniaks?: number;
  population_croats?: number;
  population_serbs?: number;
  population_others?: number;
}

function main() {
  const geojson = JSON.parse(readFileSync(WGS84_PATH, 'utf8'));
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  const merged: Array<{ from: string; into: string }> = report.merged_settlements ?? [];

  const bySid: Record<string, { n: string; m: string; p: number[] }> = {};
  const features = geojson.features ?? [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const p = (f.properties ?? {}) as FeatureProps;
    const sid = (p.sid ?? '').trim() || `_idx_${i}`;
    const total = Number(p.population_total ?? 0);
    const bosniaks = Number(p.population_bosniaks ?? 0);
    const croats = Number(p.population_croats ?? 0);
    const serbs = Number(p.population_serbs ?? 0);
    const others = Number(p.population_others ?? 0);
    bySid[sid] = {
      n: String(p.settlement_name ?? ''),
      m: String(p.mun1990_id ?? ''),
      p: [total, bosniaks, croats, serbs, others]
    };
  }

  // Deterministic key order: sort sids lexicographically
  const sortedSids = Object.keys(bySid).sort((a, b) => a.localeCompare(b));
  const bySidOrdered: Record<string, { n: string; m: string; p: number[] }> = {};
  for (const sid of sortedSids) {
    bySidOrdered[sid] = bySid[sid];
  }

  const out = {
    schema_version: '1',
    source_geojson: 'data/derived/settlements_wgs84_1990.geojson',
    source_report: 'data/derived/settlements_wgs84_1990_report.json',
    record_count: sortedSids.length,
    by_sid: bySidOrdered,
    merge_mapping: merged
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${OUTPUT_PATH} (${sortedSids.length} settlements)`);
}

main();
