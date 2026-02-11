/**
 * Phase H6.10.8 — Audit NW Bosnia geometry overlaps
 *
 * PURPOSE:
 *   Detect overlaps between NW settlements (Bihać/Cazin/Bužim/Velika Kladuša)
 *   and the rest of Bosnia to confirm suspected misplacement from incorrect
 *   viewBox offset selection in derive_settlement_substrate_from_svg_sources.ts.
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson (READ-ONLY, canonical)
 *
 * OUTPUTS (untracked debug, deterministic, no timestamps):
 *   - data/derived/_debug/nw_geometry_overlap_audit_h6_10_8.json
 *   - data/derived/_debug/nw_geometry_overlap_audit_h6_10_8.txt
 *
 * METHODOLOGY:
 *   - Identify NW features by source_file (Bihac_10049.js, Cazin_10227.js, etc.)
 *   - Compute bbox per NW file and per overall NW region
 *   - Check bbox overlaps between NW and non-NW features
 *   - For overlapping pairs, compute conservative overlap signal:
 *     * Bbox overlap area (deterministic proxy for polygon intersection)
 *   - Rank and report top suspicious overlaps
 *
 * DOES NOT:
 *   - Modify substrate geometry
 *   - Perform actual polygon intersection (too expensive)
 *   - Apply any corrections
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_8_audit_nw_geometry_overlap.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'nw_geometry_overlap_audit_h6_10_8.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'nw_geometry_overlap_audit_h6_10_8.txt');

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
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

interface OverlapRecord {
  nw_sid: string;
  nw_source_file: string;
  nw_bbox: [number, number, number, number];
  non_nw_sid: string;
  non_nw_source_file: string;
  non_nw_bbox: [number, number, number, number];
  overlap_area: number;
}

const NW_SOURCE_FILES = new Set([
  'Bihac_10049.js',
  'Cazin_10227.js',
  'Buzim_11240.js',
  'Velika_Kladusa_11118.js'
]);

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

function bboxOverlap(b1: FeatureBbox, b2: FeatureBbox): boolean {
  return !(b1.maxx < b2.minx || b2.maxx < b1.minx || b1.maxy < b2.miny || b2.maxy < b1.miny);
}

function bboxOverlapArea(b1: FeatureBbox, b2: FeatureBbox): number {
  if (!bboxOverlap(b1, b2)) return 0;
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

  // Partition features
  const nw_features: GeoJSONFeature[] = [];
  const non_nw_features: GeoJSONFeature[] = [];

  for (const f of substrate.features) {
    const source_file = f.properties?.source_file as string | undefined;
    if (source_file && NW_SOURCE_FILES.has(source_file)) {
      nw_features.push(f);
    } else {
      non_nw_features.push(f);
    }
  }

  process.stdout.write(`Total features: ${substrate.features.length}\n`);
  process.stdout.write(`NW features: ${nw_features.length}\n`);
  process.stdout.write(`Non-NW features: ${non_nw_features.length}\n`);

  // Compute group bboxes
  const nw_bbox = groupBbox(nw_features);
  const non_nw_bbox = groupBbox(non_nw_features);
  const global_bbox = groupBbox(substrate.features);

  process.stdout.write(`\nGlobal bbox: x=[${global_bbox.minx.toFixed(1)}, ${global_bbox.maxx.toFixed(1)}], y=[${global_bbox.miny.toFixed(1)}, ${global_bbox.maxy.toFixed(1)}]\n`);
  process.stdout.write(`NW bbox:     x=[${nw_bbox.minx.toFixed(1)}, ${nw_bbox.maxx.toFixed(1)}], y=[${nw_bbox.miny.toFixed(1)}, ${nw_bbox.maxy.toFixed(1)}]\n`);
  process.stdout.write(`Non-NW bbox: x=[${non_nw_bbox.minx.toFixed(1)}, ${non_nw_bbox.maxx.toFixed(1)}], y=[${non_nw_bbox.miny.toFixed(1)}, ${non_nw_bbox.maxy.toFixed(1)}]\n`);

  const group_overlaps = bboxOverlap(nw_bbox, non_nw_bbox);
  process.stdout.write(`\nNW bbox overlaps non-NW bbox: ${group_overlaps}\n`);

  // Per-file NW bboxes
  const per_file_bboxes: Record<string, { count: number; bbox: FeatureBbox }> = {};
  for (const fname of Array.from(NW_SOURCE_FILES).sort()) {
    const ff = nw_features.filter(f => f.properties?.source_file === fname);
    if (ff.length > 0) {
      per_file_bboxes[fname] = { count: ff.length, bbox: groupBbox(ff) };
    }
  }

  // Find overlapping pairs (bbox level)
  const overlaps: OverlapRecord[] = [];
  let checked = 0;
  for (const nw_f of nw_features) {
    const nw_bb = computeFeatureBbox(nw_f);
    const nw_sid = String(nw_f.properties?.sid ?? 'unknown');
    const nw_source = String(nw_f.properties?.source_file ?? 'unknown');

    for (const non_nw_f of non_nw_features) {
      checked++;
      const non_nw_bb = computeFeatureBbox(non_nw_f);
      if (bboxOverlap(nw_bb, non_nw_bb)) {
        const overlap_area = bboxOverlapArea(nw_bb, non_nw_bb);
        overlaps.push({
          nw_sid,
          nw_source_file: nw_source,
          nw_bbox: [nw_bb.minx, nw_bb.miny, nw_bb.maxx, nw_bb.maxy],
          non_nw_sid: String(non_nw_f.properties?.sid ?? 'unknown'),
          non_nw_source_file: String(non_nw_f.properties?.source_file ?? 'unknown'),
          non_nw_bbox: [non_nw_bb.minx, non_nw_bb.miny, non_nw_bb.maxx, non_nw_bb.maxy],
          overlap_area
        });
      }
    }
  }

  process.stdout.write(`\nChecked ${checked} NW×non-NW pairs\n`);
  process.stdout.write(`Found ${overlaps.length} bbox overlaps\n`);

  // Sort by overlap area descending
  overlaps.sort((a, b) => b.overlap_area - a.overlap_area);

  // Top 50
  const top_overlaps = overlaps.slice(0, 50);

  // Group by non-NW source file
  const overlaps_by_non_nw_file: Record<string, number> = {};
  for (const ov of overlaps) {
    overlaps_by_non_nw_file[ov.non_nw_source_file] = (overlaps_by_non_nw_file[ov.non_nw_source_file] || 0) + 1;
  }
  const sorted_non_nw_files = Object.entries(overlaps_by_non_nw_file)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Output JSON
  const auditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.8',
    total_features: substrate.features.length,
    nw_features_count: nw_features.length,
    non_nw_features_count: non_nw_features.length,
    global_bbox: [global_bbox.minx, global_bbox.miny, global_bbox.maxx, global_bbox.maxy],
    nw_bbox: [nw_bbox.minx, nw_bbox.miny, nw_bbox.maxx, nw_bbox.maxy],
    non_nw_bbox: [non_nw_bbox.minx, non_nw_bbox.miny, non_nw_bbox.maxx, non_nw_bbox.maxy],
    nw_bbox_overlaps_non_nw: group_overlaps,
    per_file_bboxes,
    total_overlap_count: overlaps.length,
    top_50_overlaps: top_overlaps.map(ov => ({
      nw_sid: ov.nw_sid,
      nw_source_file: ov.nw_source_file,
      nw_bbox: ov.nw_bbox.map(x => Math.round(x * 10) / 10),
      non_nw_sid: ov.non_nw_sid,
      non_nw_source_file: ov.non_nw_source_file,
      non_nw_bbox: ov.non_nw_bbox.map(x => Math.round(x * 10) / 10),
      overlap_area: Math.round(ov.overlap_area * 10) / 10
    })),
    most_overlapped_non_nw_files: Object.fromEntries(sorted_non_nw_files)
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditPayload, null, 2), 'utf8');

  // Output TXT
  const lines = [
    'Phase H6.10.8 — NW Bosnia Geometry Overlap Audit',
    '',
    `Total features: ${substrate.features.length}`,
    `NW features: ${nw_features.length}`,
    `Non-NW features: ${non_nw_features.length}`,
    '',
    `Global bbox: x=[${global_bbox.minx.toFixed(1)}, ${global_bbox.maxx.toFixed(1)}], y=[${global_bbox.miny.toFixed(1)}, ${global_bbox.maxy.toFixed(1)}]`,
    `NW bbox:     x=[${nw_bbox.minx.toFixed(1)}, ${nw_bbox.maxx.toFixed(1)}], y=[${nw_bbox.miny.toFixed(1)}, ${nw_bbox.maxy.toFixed(1)}]`,
    `Non-NW bbox: x=[${non_nw_bbox.minx.toFixed(1)}, ${non_nw_bbox.maxx.toFixed(1)}], y=[${non_nw_bbox.miny.toFixed(1)}, ${non_nw_bbox.maxy.toFixed(1)}]`,
    '',
    `NW bbox overlaps non-NW bbox: ${group_overlaps}`,
    '',
    'Per-file NW bboxes:',
    ...Object.entries(per_file_bboxes).sort(([a], [b]) => a.localeCompare(b)).map(([fname, data]) =>
      `  ${fname}: ${data.count} features, x=[${data.bbox.minx.toFixed(1)}, ${data.bbox.maxx.toFixed(1)}], y=[${data.bbox.miny.toFixed(1)}, ${data.bbox.maxy.toFixed(1)}]`
    ),
    '',
    `Total bbox overlaps: ${overlaps.length}`,
    '',
    'Top 10 most-overlapped non-NW source files:',
    ...sorted_non_nw_files.map(([fname, count]) => `  ${fname}: ${count} overlaps`),
    '',
    'Top 50 overlaps (by overlap area):',
    ...top_overlaps.map((ov, i) =>
      `${i + 1}. NW ${ov.nw_sid} (${ov.nw_source_file}) vs non-NW ${ov.non_nw_sid} (${ov.non_nw_source_file}), area=${ov.overlap_area.toFixed(1)}`
    )
  ];

  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`\nWrote ${AUDIT_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);
}

main();
