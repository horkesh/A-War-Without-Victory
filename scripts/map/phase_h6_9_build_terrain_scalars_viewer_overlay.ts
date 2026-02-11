/**
 * Phase H6.9 — Build terrain scalars viewer overlay (audit and visualization).
 *
 * PURPOSE:
 *   Create viewer-ready overlay from H6.8 settlements_terrain_scalars.json.
 *   Join with settlement geometry identifiers (by_sid). Produce audits.
 *   No scalar re-derivation; no simulation consumption.
 *
 * INPUTS (must exist; STOP on first missing):
 *   - data/derived/terrain/settlements_terrain_scalars.json
 *   - data/derived/terrain/terrain_scalars_audit_h6_8.json
 *   - data/derived/terrain/terrain_scalars_audit_h6_8.txt
 *   - data/derived/data_index.json (contracts index)
 *
 * OUTPUTS:
 *   - data/derived/terrain/terrain_scalars_viewer_overlay_h6_9.json
 *   - data/derived/terrain/terrain_scalars_audit_h6_9.json
 *   - data/derived/terrain/terrain_scalars_audit_h6_9.txt
 *
 * Usage: tsx scripts/map/phase_h6_9_build_terrain_scalars_viewer_overlay.ts
 *   or: npm run map:viewer:terrain-scalars:h6_9
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const TERRAIN_DIR = resolve(DERIVED, 'terrain');

const SCALARS_PATH = resolve(TERRAIN_DIR, 'settlements_terrain_scalars.json');
const AUDIT_H6_8_JSON_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_8.json');
const AUDIT_H6_8_TXT_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_8.txt');
const DATA_INDEX_PATH = resolve(DERIVED, 'data_index.json');

const OVERLAY_OUT_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_viewer_overlay_h6_9.json');
const AUDIT_JSON_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_9.json');
const AUDIT_TXT_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_9.txt');

const SCALAR_FIELDS = [
  'road_access_index',
  'river_crossing_penalty',
  'elevation_mean_m',
  'elevation_stddev_m',
  'slope_index',
  'terrain_friction_index',
] as const;

const NORMALIZED_SCALARS = new Set([
  'road_access_index',
  'river_crossing_penalty',
  'slope_index',
  'terrain_friction_index',
]);

interface ScalarRecord {
  road_access_index: number;
  river_crossing_penalty: number;
  elevation_mean_m: number;
  elevation_stddev_m: number;
  slope_index: number;
  terrain_friction_index: number;
}

interface ScalarsInput {
  awwv_meta?: { by_sid?: unknown };
  by_sid: Record<string, ScalarRecord>;
}

interface DistributionSummary {
  min: number;
  max: number;
  mean: number;
  p25: number;
  p50: number;
  p75: number;
  count: number;
  missing_count: number;
  nan_count: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function computeDistribution(values: number[]): DistributionSummary {
  const finite = values.filter((v) => Number.isFinite(v));
  const missing = values.length - finite.length;
  const nanCount = values.filter((v) => typeof v === 'number' && Number.isNaN(v)).length;
  const sorted = [...finite].sort((a, b) => a - b);
  const sum = finite.reduce((a, b) => a + b, 0);
  return {
    min: sorted.length > 0 ? sorted[0] : 0,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    mean: finite.length > 0 ? sum / finite.length : 0,
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    count: finite.length,
    missing_count: missing,
    nan_count: nanCount,
  };
}

function main(): void {
  if (!existsSync(SCALARS_PATH)) {
    console.error('Missing:', SCALARS_PATH);
    process.exit(1);
  }
  if (!existsSync(AUDIT_H6_8_JSON_PATH)) {
    console.error('Missing:', AUDIT_H6_8_JSON_PATH);
    process.exit(1);
  }
  if (!existsSync(AUDIT_H6_8_TXT_PATH)) {
    console.error('Missing:', AUDIT_H6_8_TXT_PATH);
    process.exit(1);
  }
  if (!existsSync(DATA_INDEX_PATH)) {
    console.error('Missing:', DATA_INDEX_PATH);
    process.exit(1);
  }

  const scalarsContent = readFileSync(SCALARS_PATH, 'utf8');
  const scalars = JSON.parse(scalarsContent) as ScalarsInput;
  const bySid = scalars.by_sid;
  if (!bySid || typeof bySid !== 'object') {
    console.error('Invalid scalars: by_sid missing or not object');
    process.exit(1);
  }

  const sortedSids = Object.keys(bySid).sort((a, b) => a.localeCompare(b));
  const distributions: Record<string, DistributionSummary> = {};

  for (const field of SCALAR_FIELDS) {
    const values: number[] = [];
    let missingCount = 0;
    let nanCount = 0;
    for (const sid of sortedSids) {
      const rec = bySid[sid];
      if (!rec) {
        missingCount++;
        continue;
      }
      const v = (rec as Record<string, unknown>)[field];
      if (v === undefined || v === null) {
        missingCount++;
        continue;
      }
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isNaN(n)) {
        nanCount++;
        continue;
      }
      values.push(n);
    }
    const dist = computeDistribution(values);
    dist.missing_count = missingCount;
    dist.nan_count = nanCount;
    distributions[field] = dist;

    if (missingCount > 0 || nanCount > 0) {
      console.error(
        `STOP: Scalar ${field} has missing_count=${missingCount} nan_count=${nanCount}. Expected zero.`
      );
      process.exit(1);
    }
  }

  // Normalization sanity: [0,1] for normalized scalars
  for (const field of NORMALIZED_SCALARS) {
    const d = distributions[field];
    if (d.min < 0 || d.max > 1) {
      console.error(
        `STOP: Scalar ${field} outside [0,1]: min=${d.min} max=${d.max}. Normalization sanity check failed.`
      );
      process.exit(1);
    }
  }

  // scalar_bounds for choropleth (viewer uses these to normalize)
  const scalarBounds: Record<string, { min: number; max: number }> = {};
  for (const field of SCALAR_FIELDS) {
    const d = distributions[field];
    scalarBounds[field] = { min: d.min, max: d.max };
  }

  const overlayBySid: Record<string, ScalarRecord> = {};
  for (const sid of sortedSids) {
    overlayBySid[sid] = bySid[sid];
  }

  const overlayPayload = {
    awwv_meta: {
      role: 'terrain_scalars_viewer_overlay',
      version: 'h6_9',
      id_field: 'sid',
      record_count: sortedSids.length,
      scalar_fields: [...SCALAR_FIELDS],
      scalar_bounds: scalarBounds,
      checksum_sha256: '',
    },
    by_sid: overlayBySid,
  };

  const contentForChecksum = JSON.stringify({
    awwv_meta: { ...overlayPayload.awwv_meta, checksum_sha256: '' },
    by_sid: overlayPayload.by_sid,
  });
  overlayPayload.awwv_meta.checksum_sha256 = createHash('sha256').update(contentForChecksum, 'utf8').digest('hex');

  const strippedOverlay = stripTimestampKeysForArtifacts(overlayPayload) as typeof overlayPayload;
  writeFileSync(OVERLAY_OUT_PATH, JSON.stringify(strippedOverlay, null, 2), 'utf8');

  const audit = {
    phase: 'h6_9',
    input_scalars: 'settlements_terrain_scalars.json',
    input_audit_h6_8: 'terrain_scalars_audit_h6_8.json',
    record_count: sortedSids.length,
    distributions,
    scalar_bounds: scalarBounds,
    normalization_checks: 'PASS',
  };

  const auditStripped = stripTimestampKeysForArtifacts(audit);
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditStripped, null, 2), 'utf8');

  const txtLines: string[] = [
    'Phase H6.9 — Terrain scalars viewer overlay audit',
    '================================================',
    '',
    'Inputs: settlements_terrain_scalars.json, terrain_scalars_audit_h6_8.json',
    '',
    `Output overlay: terrain_scalars_viewer_overlay_h6_9.json (${sortedSids.length} settlements)`,
    '',
    'Distribution summaries (min / max / mean / p25 / p50 / p75):',
  ];
  for (const field of SCALAR_FIELDS) {
    const d = distributions[field];
    txtLines.push(
      `  ${field}: min=${d.min} max=${d.max} mean=${d.mean.toFixed(3)} p25=${d.p25} p50=${d.p50} p75=${d.p75}`
    );
  }
  txtLines.push('');
  txtLines.push('Normalization [0,1] sanity: PASS (applicable scalars in range)');
  txtLines.push('Missing/NaN counts: 0');

  writeFileSync(AUDIT_TXT_PATH, txtLines.join('\n'), 'utf8');

  console.log('Phase H6.9 terrain scalars viewer overlay written to', OVERLAY_OUT_PATH);
  console.log('  record_count:', sortedSids.length);
  console.log('  audit:', AUDIT_JSON_PATH, AUDIT_TXT_PATH);
}

main();
