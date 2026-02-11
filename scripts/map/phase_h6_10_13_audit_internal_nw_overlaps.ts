/**
 * Phase H6.10.13 — Audit internal NW overlap (deterministic, diagnostics only)
 *
 * PURPOSE:
 *   Compute bbox intersection area proxy among the 4 NW municipality groups
 *   (Bihać/Cazin/Bužim/Velika Kladuša). Hard gate: internal overlap proxy must
 *   be 0 (or near-zero for border-touch boxes) for the final build.
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson (READ-ONLY)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - nw_internal_overlap_audit_h6_10_13.json
 *   - nw_internal_overlap_audit_h6_10_13.txt
 *
 * METHODOLOGY:
 *   - Group substrate features by NW source_file (normFile for path-safe match).
 *   - Compute per-file aggregate bbox (union of feature bboxes).
 *   - Pairwise bbox intersection area among the 4 NW files (6 pairs).
 *   - Sum intersection area proxy. Expect 0 for correct coordination regime.
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_13_audit_internal_nw_overlaps.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


function normFile(s: string): string {
  return s.normalize('NFKC').replace(/\\/g, '/').split('/').pop()!.trim();
}

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'nw_internal_overlap_audit_h6_10_13.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'nw_internal_overlap_audit_h6_10_13.txt');

const NW_SOURCE_FILES = new Set([
  'Bihac_10049.js',
  'Cazin_10227.js',
  'Buzim_11240.js',
  'Velika Kladusa_11118.js'  // Note: space, not underscore, matches actual source file name
]);

type Point = [number, number];
type Polygon = Point[][];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface FeatureBbox {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

function computeFeatureBbox(f: GeoJSONFeature): FeatureBbox {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const coords: Point[] = [];

  if (f.geometry.type === 'Polygon') {
    coords.push(...(f.geometry.coordinates as Polygon)[0]);
  } else if (f.geometry.type === 'MultiPolygon') {
    for (const poly of f.geometry.coordinates as MultiPolygon) {
      coords.push(...poly[0]);
    }
  }

  for (const pt of coords) {
    minx = Math.min(minx, pt[0]);
    maxx = Math.max(maxx, pt[0]);
    miny = Math.min(miny, pt[1]);
    maxy = Math.max(maxy, pt[1]);
  }

  return { minx, miny, maxx, maxy };
}

function bboxOverlapArea(b1: FeatureBbox, b2: FeatureBbox): number {
  if (b1.maxx < b2.minx || b2.maxx < b1.minx || b1.maxy < b2.miny || b2.maxy < b1.miny) {
    return 0;
  }
  const xOverlap = Math.min(b1.maxx, b2.maxx) - Math.max(b1.minx, b2.minx);
  const yOverlap = Math.min(b1.maxy, b2.maxy) - Math.max(b1.miny, b2.miny);
  return xOverlap * yOverlap;
}

function groupBbox(features: GeoJSONFeature[]): FeatureBbox {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const f of features) {
    const bb = computeFeatureBbox(f);
    minx = Math.min(minx, bb.minx);
    maxx = Math.max(maxx, bb.maxx);
    miny = Math.min(miny, bb.miny);
    maxy = Math.max(maxy, bb.maxy);
  }
  return { minx, miny, maxx, maxy };
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing substrate:', SUBSTRATE_PATH);
    process.exit(1);
  }

  const substrateContent = readFileSync(SUBSTRATE_PATH, 'utf8');
  const substrate = JSON.parse(substrateContent) as GeoJSONFC;

  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection');
    process.exit(1);
  }

  // Partition NW features by source_file (normFile for path-safe match)
  const perFileFeatures: Record<string, GeoJSONFeature[]> = {};
  for (const fname of Array.from(NW_SOURCE_FILES).sort()) {
    perFileFeatures[fname] = [];
  }
  for (const f of substrate.features) {
    const sourceFile = f.properties?.source_file as string | undefined;
    const nf = sourceFile ? normFile(sourceFile) : '';
    if (NW_SOURCE_FILES.has(nf)) {
      perFileFeatures[nf].push(f);
    }
  }

  // Per-file aggregate bbox
  const perFileBbox: Record<string, { count: number; bbox: FeatureBbox }> = {};
  for (const [fname, ff] of Object.entries(perFileFeatures)) {
    if (ff.length > 0) {
      perFileBbox[fname] = { count: ff.length, bbox: groupBbox(ff) };
    }
  }

  const fileList = Object.keys(perFileBbox).sort();
  const pairs: Array<{ file_a: string; file_b: string; overlap_area: number }> = [];
  let totalInternalOverlapProxy = 0;

  for (let i = 0; i < fileList.length; i++) {
    for (let j = i + 1; j < fileList.length; j++) {
      const fa = fileList[i];
      const fb = fileList[j];
      const area = bboxOverlapArea(perFileBbox[fa].bbox, perFileBbox[fb].bbox);
      pairs.push({ file_a: fa, file_b: fb, overlap_area: area });
      totalInternalOverlapProxy += area;
    }
  }

  const passed = totalInternalOverlapProxy === 0 || totalInternalOverlapProxy < 0.001;

  process.stdout.write(`Internal NW overlap audit (H6.10.13)\n`);
  process.stdout.write(`  Per-file NW feature counts: ${Object.entries(perFileBbox).map(([f, d]) => `${f}=${d.count}`).join(', ')}\n`);
  process.stdout.write(`  Total internal overlap area proxy: ${totalInternalOverlapProxy.toFixed(4)}\n`);
  process.stdout.write(`  Hard gate: ${passed ? 'PASS' : 'FAIL'}\n`);

  const payload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.13',
    total_internal_overlap_area_proxy: Math.round(totalInternalOverlapProxy * 10000) / 10000,
    hard_gate_passed: passed,
    per_file: Object.fromEntries(
      Object.entries(perFileBbox).map(([f, d]) => [
        f,
        { count: d.count, bbox: [d.bbox.minx, d.bbox.miny, d.bbox.maxx, d.bbox.maxy] }
      ])
    ),
    pairwise_overlaps: pairs.map(p => ({
      ...p,
      overlap_area: Math.round(p.overlap_area * 10000) / 10000
    }))
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.13 — Internal NW Overlap Audit',
    '',
    `Total internal overlap area proxy: ${totalInternalOverlapProxy.toFixed(4)}`,
    `Hard gate (proxy == 0 or near-zero): ${passed ? 'PASS' : 'FAIL'}`,
    '',
    'Per-file NW feature counts and bboxes:',
    ...Object.entries(perFileBbox)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fname, data]) =>
        `  ${fname}: ${data.count} features, x=[${data.bbox.minx.toFixed(1)}, ${data.bbox.maxx.toFixed(1)}], y=[${data.bbox.miny.toFixed(1)}, ${data.bbox.maxy.toFixed(1)}]`
      ),
    '',
    'Pairwise bbox overlaps (6 pairs):',
    ...pairs.map(p => `  ${p.file_a} vs ${p.file_b}: overlap_area=${p.overlap_area.toFixed(4)}`)
  ];
  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`\nWrote ${AUDIT_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);

  if (!passed) {
    process.exitCode = 1;
  }
}

main();
