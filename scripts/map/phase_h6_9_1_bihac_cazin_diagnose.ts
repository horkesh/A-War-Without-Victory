/**
 * Phase H6.9.1 — Diagnose Bihać–Cazin regression in substrate viewer (terrain overlay).
 *
 * PURPOSE:
 *   Deterministic data-only diagnostics for Bihać/Cazin settlements.
 *   Identifies overlay join, viewer, data, or geometry issues.
 *
 * OUTPUTS (data/derived/_debug/):
 *   - h6_9_1_bihac_cazin_report.json
 *   - h6_9_1_bihac_cazin_report.txt
 *
 * Usage: npx tsx scripts/map/phase_h6_9_1_bihac_cazin_diagnose.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');
const SUBSTRATE_VIEWER_DIR = resolve(DERIVED, 'substrate_viewer');
const TERRAIN_DIR = resolve(DERIVED, 'terrain');

const VIEWER_DATA_INDEX_PATH = resolve(SUBSTRATE_VIEWER_DIR, 'data_index.json');
const OVERLAY_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_viewer_overlay_h6_9.json');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');

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

// Bihać municipality_id 10049, Cazin 10227 (from mun1990_names.json / ledger)
const BIHAC_MUN_ID = '10049';
const CAZIN_MUN_ID = '10227';

interface ViewerIndexEntry {
  name?: string | null;
  municipality_id?: string | null;
  [key: string]: unknown;
}

interface OverlayRecord {
  road_access_index?: number;
  river_crossing_penalty?: number;
  elevation_mean_m?: number;
  elevation_stddev_m?: number;
  slope_index?: number;
  terrain_friction_index?: number;
}

function extractSidsFromSubstrate(path: string): Set<string> {
  const sids = new Set<string>();
  const content = readFileSync(path, 'utf8');
  // Stream-like extraction: find "sid":"S..." patterns
  const sidRegex = /"sid"\s*:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = sidRegex.exec(content)) !== null) {
    sids.add(m[1]);
  }
  return sids;
}

function main(): void {
  if (!existsSync(VIEWER_DATA_INDEX_PATH)) {
    console.error('Missing:', VIEWER_DATA_INDEX_PATH);
    process.exit(1);
  }
  if (!existsSync(OVERLAY_PATH)) {
    console.error('Missing:', OVERLAY_PATH);
    process.exit(1);
  }
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing:', SUBSTRATE_PATH);
    process.exit(1);
  }

  const viewerIndexRaw = readFileSync(VIEWER_DATA_INDEX_PATH, 'utf8');
  const viewerIndex = JSON.parse(viewerIndexRaw) as { by_sid?: Record<string, ViewerIndexEntry> };
  const bySid = viewerIndex.by_sid;
  if (!bySid || typeof bySid !== 'object') {
    console.error('Viewer index: by_sid missing or not object');
    process.exit(1);
  }

  const overlayRaw = readFileSync(OVERLAY_PATH, 'utf8');
  const overlay = JSON.parse(overlayRaw) as {
    by_sid?: Record<string, OverlayRecord>;
    awwv_meta?: { scalar_bounds?: Record<string, { min: number; max: number }> };
  };
  const overlayBySid = overlay.by_sid;
  if (!overlayBySid || typeof overlayBySid !== 'object') {
    console.error('Overlay: by_sid missing or not object');
    process.exit(1);
  }

  const substrateSids = extractSidsFromSubstrate(SUBSTRATE_PATH);

  // Identify Bihać and Cazin by municipality_id
  const bihacSids: string[] = [];
  const cazinSids: string[] = [];
  for (const [sid, entry] of Object.entries(bySid)) {
    const mid = entry?.municipality_id;
    if (mid === BIHAC_MUN_ID) bihacSids.push(sid);
    else if (mid === CAZIN_MUN_ID) cazinSids.push(sid);
  }

  // Deterministic ordering: by sid numeric ascending (extract numeric part, sort)
  function sidSortKey(s: string): number {
    const m = s.match(/^S(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }
  bihacSids.sort((a, b) => sidSortKey(a) - sidSortKey(b));
  cazinSids.sort((a, b) => sidSortKey(a) - sidSortKey(b));

  const bihacCount = bihacSids.length;
  const cazinCount = cazinSids.length;

  if (bihacCount === 0 && cazinCount === 0) {
    console.error('STOP: cannot identify Bihać/Cazin membership from viewer index schema');
    console.error('  mun1990_id or municipality_id not present in by_sid entries');
    process.exit(1);
  }

  interface SettlementRow {
    sid: string;
    mun_id: string;
    in_substrate: boolean;
    in_overlay: boolean;
    overlay_join_failed: boolean;
    scalars: Record<string, number>;
    all_zeros_normalized: boolean;
    elevation_mean_zero_stddev_nonzero: boolean;
    elevation_stddev_zero_mean_nonzero: boolean;
    missing_scalar_fields: string[];
  }

  const rows: SettlementRow[] = [];
  let missingInSubstrate = 0;
  let missingInOverlay = 0;
  let missingScalarFields = 0;
  const outliers: string[] = [];

  for (const sid of [...bihacSids, ...cazinSids]) {
    const munId = bihacSids.includes(sid) ? BIHAC_MUN_ID : CAZIN_MUN_ID;
    const inSubstrate = substrateSids.has(sid);
    const overlayRec = overlayBySid[sid];
    const inOverlay = !!overlayRec;
    const overlayJoinFailed = !inOverlay;

    if (!inSubstrate) missingInSubstrate++;
    if (!inOverlay) missingInOverlay++;

    const scalars: Record<string, number> = {};
    const missingFields: string[] = [];
    for (const f of SCALAR_FIELDS) {
      const v = overlayRec?.[f as keyof OverlayRecord];
      if (v === undefined || v === null) {
        missingFields.push(f);
      } else {
        scalars[f] = typeof v === 'number' ? v : Number(v);
      }
    }
    if (missingFields.length > 0) missingScalarFields++;

    let allZerosNormalized = false;
    if (inOverlay && overlayRec) {
      const normSum = NORMALIZED_SCALARS.size > 0
        ? (['road_access_index', 'river_crossing_penalty', 'slope_index', 'terrain_friction_index'] as const)
            .filter((f) => f in overlayRec)
            .reduce((s, f) => s + (Number(overlayRec[f]) || 0), 0)
        : 0;
      allZerosNormalized = normSum === 0;
    }

    const elevMean = scalars.elevation_mean_m ?? overlayRec?.elevation_mean_m ?? 0;
    const elevStd = scalars.elevation_stddev_m ?? overlayRec?.elevation_stddev_m ?? 0;
    const elevationMeanZeroStddevNonzero = elevMean === 0 && elevStd > 0;
    const elevationStddevZeroMeanNonzero = elevStd === 0 && elevMean > 0;

    if (allZerosNormalized) outliers.push(`${sid}: all-zeros across normalized scalars`);
    if (elevationMeanZeroStddevNonzero) outliers.push(`${sid}: elevation_mean_m==0 but elevation_stddev_m>0`);
    if (elevationStddevZeroMeanNonzero) outliers.push(`${sid}: elevation_stddev_m==0 but elevation_mean_m>0`);
    if (overlayJoinFailed) outliers.push(`${sid}: overlay join failed`);

    rows.push({
      sid,
      mun_id: munId,
      in_substrate: inSubstrate,
      in_overlay: inOverlay,
      overlay_join_failed: overlayJoinFailed,
      scalars,
      all_zeros_normalized: allZerosNormalized,
      elevation_mean_zero_stddev_nonzero: elevationMeanZeroStddevNonzero,
      elevation_stddev_zero_mean_nonzero: elevationStddevZeroMeanNonzero,
      missing_scalar_fields: missingFields,
    });
  }

  // Per-scalar summaries per municipality
  const summaries: Record<string, Record<string, { min: number; max: number; mean: number }>> = {
    [BIHAC_MUN_ID]: {},
    [CAZIN_MUN_ID]: {},
  };

  for (const field of SCALAR_FIELDS) {
    for (const munId of [BIHAC_MUN_ID, CAZIN_MUN_ID]) {
      const vals = rows
        .filter((r) => r.mun_id === munId && r.in_overlay && field in r.scalars)
        .map((r) => r.scalars[field]);
      if (vals.length === 0) {
        summaries[munId][field] = { min: 0, max: 0, mean: 0 };
      } else {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        summaries[munId][field] = { min, max, mean };
      }
    }
  }

  const reportJson = stripTimestampKeysForArtifacts({
    phase: 'h6_9_1',
    bihac_count: bihacCount,
    cazin_count: cazinCount,
    missing_in_substrate: missingInSubstrate,
    missing_in_overlay: missingInOverlay,
    missing_scalar_fields: missingScalarFields,
    per_municipality_summaries: summaries,
    outliers,
    settlement_rows: rows,
  });

  if (!existsSync(DEBUG_DIR)) {
    mkdirSync(DEBUG_DIR, { recursive: true });
  }

  const reportJsonPath = resolve(DEBUG_DIR, 'h6_9_1_bihac_cazin_report.json');
  writeFileSync(reportJsonPath, JSON.stringify(reportJson, null, 2), 'utf8');

  const txtLines: string[] = [
    'Phase H6.9.1 — Bihać–Cazin diagnosis report',
    '==========================================',
    '',
    'Counts:',
    `  bihac_count: ${bihacCount}`,
    `  cazin_count: ${cazinCount}`,
    `  missing_in_substrate: ${missingInSubstrate}`,
    `  missing_in_overlay: ${missingInOverlay}`,
    `  missing_scalar_fields: ${missingScalarFields}`,
    '',
    'Per-scalar summaries (min / max / mean) by municipality:',
  ];

  for (const munId of [BIHAC_MUN_ID, CAZIN_MUN_ID]) {
    const label = munId === BIHAC_MUN_ID ? 'Bihać (10049)' : 'Cazin (10227)';
    txtLines.push(`  ${label}:`);
    for (const field of SCALAR_FIELDS) {
      const s = summaries[munId][field];
      if (s) {
        txtLines.push(`    ${field}: min=${s.min} max=${s.max} mean=${s.mean.toFixed(3)}`);
      }
    }
  }

  txtLines.push('');
  txtLines.push('Outliers:');
  if (outliers.length === 0) {
    txtLines.push('  (none)');
  } else {
    for (const o of outliers) {
      txtLines.push(`  - ${o}`);
    }
  }

  const reportTxtPath = resolve(DEBUG_DIR, 'h6_9_1_bihac_cazin_report.txt');
  writeFileSync(reportTxtPath, txtLines.join('\n'), 'utf8');

  console.log('Diagnosis complete.');
  console.log('  bihac_count:', bihacCount, 'cazin_count:', cazinCount);
  console.log('  missing_in_substrate:', missingInSubstrate);
  console.log('  missing_in_overlay:', missingInOverlay);
  console.log('  outliers:', outliers.length);
  console.log('  Outputs:', reportJsonPath, reportTxtPath);
}

main();
