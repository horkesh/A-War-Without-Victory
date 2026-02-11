/**
 * Phase H6.10.18 — Audit NW anchor fit after similarity transform
 *
 * PURPOSE:
 *   Read derived substrate and drzava anchors; report per-NW municipality
 *   centroid vs anchor distance, internal NW overlap proxy, external overlap
 *   with key neighbors. Deterministic, fast.
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson
 *   - data/derived/_debug/drzava_muni_anchors_h6_10_18.json (or drzava_muni_anchors_h6_10_14.json)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - nw_anchor_fit_h6_10_18.txt
 *   - nw_anchor_fit_h6_10_18.json
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_18_audit_nw_anchor_fit.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const ANCHORS_H6_10_18 = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_18.json');
const ANCHORS_H6_10_14 = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_14.json');

const OUT_JSON = resolve(DEBUG_DIR, 'nw_anchor_fit_h6_10_18.json');
const OUT_TXT = resolve(DEBUG_DIR, 'nw_anchor_fit_h6_10_18.txt');

/** Distance threshold (units) for "ANCHOR FIT OK". Drzava scale ~100–700; derived after similarity similar. */
const ANCHOR_DISTANCE_THRESHOLD = 30;

const NW_SOURCE_FILES = new Set([
  'Bihac_10049.js',
  'Cazin_10227.js',
  'Buzim_11240.js',
  'Velika Kladusa_11118.js'
]);

const FILE_TO_MUN_ID: Record<string, string> = {
  'Bihac_10049.js': '10049',
  'Cazin_10227.js': '10227',
  'Buzim_11240.js': '11240',
  'Velika Kladusa_11118.js': '11118'
};

const NEIGHBOR_MUN_IDS = new Set(['11428', '11436']); // Bosanska Krupa, Bosanski Petrovac

function normFile(s: string): string {
  return s.normalize('NFKC').replace(/\\/g, '/').split('/').pop()!.trim();
}

type Point = [number, number];
type Polygon = Point[][];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown> & { source_file?: string; municipality_id?: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function bboxFromCoords(coords: Polygon | MultiPolygon): { minx: number; miny: number; maxx: number; maxy: number } {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const rings: Polygon = coords.length > 0 && typeof coords[0][0][0] === 'number'
    ? (coords as Polygon)
    : (coords as MultiPolygon).flat();
  for (const ring of rings) {
    for (const pt of ring) {
      if (Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
        minx = Math.min(minx, pt[0]);
        miny = Math.min(miny, pt[1]);
        maxx = Math.max(maxx, pt[0]);
        maxy = Math.max(maxy, pt[1]);
      }
    }
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

  // Load anchors: prefer h6_10_18 (flat {x,y}), else h6_10_14 (anchor_x, anchor_y)
  const anchorsByMunId = new Map<string, { x: number; y: number }>();
  const anchorsPath = existsSync(ANCHORS_H6_10_18) ? ANCHORS_H6_10_18 : ANCHORS_H6_10_14;
  const anchorsContent = readFileSync(anchorsPath, 'utf8');
  const anchorsData = JSON.parse(anchorsContent) as
    | { anchors?: Array<{ mun_id: string; anchor_x: number; anchor_y: number }> }
    | Record<string, { x?: number; y?: number; anchor_x?: number; anchor_y?: number }>;
  if (anchorsData && typeof anchorsData === 'object' && Array.isArray((anchorsData as { anchors?: unknown }).anchors)) {
    const arr = (anchorsData as { anchors: Array<{ mun_id: string; anchor_x: number; anchor_y: number }> }).anchors;
    for (const a of arr) {
      anchorsByMunId.set(a.mun_id, { x: a.anchor_x, y: a.anchor_y });
    }
  } else {
    const obj = anchorsData as Record<string, { x?: number; y?: number; anchor_x?: number; anchor_y?: number }>;
    for (const [munId, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && (typeof (v as { x?: number }).x === 'number' || typeof (v as { anchor_x?: number }).anchor_x === 'number')) {
        const vv = v as { x?: number; y?: number; anchor_x?: number; anchor_y?: number };
        anchorsByMunId.set(munId, { x: vv.x ?? vv.anchor_x!, y: vv.y ?? vv.anchor_y! });
      }
    }
  }

  // Group NW features by source_file (normFile)
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

  // Centroid per NW file (bbox center of all features)
  const perFileCentroid: Record<string, { cx: number; cy: number; count: number }> = {};
  for (const [fname, ff] of Object.entries(perFileFeatures)) {
    if (ff.length === 0) continue;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const f of ff) {
      const b = bboxFromCoords(f.geometry.coordinates as Polygon | MultiPolygon);
      minx = Math.min(minx, b.minx);
      miny = Math.min(miny, b.miny);
      maxx = Math.max(maxx, b.maxx);
      maxy = Math.max(maxy, b.maxy);
    }
    perFileCentroid[fname] = {
      cx: (minx + maxx) / 2,
      cy: (miny + maxy) / 2,
      count: ff.length
    };
  }

  // Per-NW municipality: centroid, anchor, delta, distance
  const munIds = Object.keys(FILE_TO_MUN_ID).sort();
  const perMun: Array<{
    municipality_id: string;
    source_file: string;
    centroid: { x: number; y: number };
    anchor: { x: number; y: number } | null;
    delta: { dx: number; dy: number } | null;
    distance: number | null;
    feature_count: number;
  }> = [];
  for (const fname of munIds) {
    const munId = FILE_TO_MUN_ID[fname];
    const cent = perFileCentroid[fname];
    const anchor = munId ? anchorsByMunId.get(munId) ?? null : null;
    if (!cent) {
      perMun.push({
        municipality_id: munId,
        source_file: fname,
        centroid: { x: NaN, y: NaN },
        anchor: anchor,
        delta: null,
        distance: null,
        feature_count: 0
      });
      continue;
    }
    const dx = anchor ? cent.cx - anchor.x : NaN;
    const dy = anchor ? cent.cy - anchor.y : NaN;
    const distance = anchor ? Math.sqrt(dx * dx + dy * dy) : null;
    perMun.push({
      municipality_id: munId,
      source_file: fname,
      centroid: { x: cent.cx, y: cent.cy },
      anchor,
      delta: anchor ? { dx, dy } : null,
      distance,
      feature_count: cent.count
    });
  }

  // Internal NW overlap proxy (per-file bbox, pairwise)
  const perFileBbox: Array<{ file: string; minx: number; miny: number; maxx: number; maxy: number }> = [];
  for (const [fname, ff] of Object.entries(perFileFeatures)) {
    if (ff.length === 0) continue;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const f of ff) {
      const b = bboxFromCoords(f.geometry.coordinates as Polygon | MultiPolygon);
      minx = Math.min(minx, b.minx);
      miny = Math.min(miny, b.miny);
      maxx = Math.max(maxx, b.maxx);
      maxy = Math.max(maxy, b.maxy);
    }
    perFileBbox.push({ file: fname, minx, miny, maxx, maxy });
  }
  let internalOverlapProxy = 0;
  for (let i = 0; i < perFileBbox.length; i++) {
    for (let j = i + 1; j < perFileBbox.length; j++) {
      const a = perFileBbox[i];
      const b = perFileBbox[j];
      const xOverlap = Math.max(0, Math.min(a.maxx, b.maxx) - Math.max(a.minx, b.minx));
      const yOverlap = Math.max(0, Math.min(a.maxy, b.maxy) - Math.max(a.miny, b.miny));
      internalOverlapProxy += xOverlap * yOverlap;
    }
  }

  // External overlap: NW vs non-NW features whose municipality_id is 11428 or 11436 (neighbors)
  const neighborFeatures = substrate.features.filter(
    f => (f.properties?.municipality_id as string) && NEIGHBOR_MUN_IDS.has(String(f.properties!.municipality_id))
  );
  let externalOverlapCountProxy = 0;
  for (const nwBb of perFileBbox) {
    for (const f of neighborFeatures) {
      const b = bboxFromCoords(f.geometry.coordinates as Polygon | MultiPolygon);
      if (
        !(nwBb.maxx < b.minx || b.maxx < nwBb.minx || nwBb.maxy < b.miny || b.maxy < nwBb.miny)
      ) {
        externalOverlapCountProxy++;
      }
    }
  }

  const maxDistance = perMun.reduce((acc, m) => (m.distance != null && m.distance > acc ? m.distance : acc), 0);
  const anchorFitOk = perMun.every(m => m.distance == null || m.distance <= ANCHOR_DISTANCE_THRESHOLD) &&
    internalOverlapProxy === 0;

  const conclusion = anchorFitOk
    ? 'ANCHOR FIT OK'
    : `ANCHOR FIT CHECK: max_distance=${maxDistance.toFixed(2)} threshold=${ANCHOR_DISTANCE_THRESHOLD} internal_overlap=${internalOverlapProxy.toFixed(2)}`;

  const payload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.18',
    substrate_path: SUBSTRATE_PATH,
    anchors_path: anchorsPath,
    anchor_distance_threshold: ANCHOR_DISTANCE_THRESHOLD,
    per_municipality: perMun.map(m => ({
      ...m,
      distance: m.distance != null ? Math.round(m.distance * 100) / 100 : null
    })),
    internal_nw_overlap_area_proxy: Math.round(internalOverlapProxy * 100) / 100,
    external_overlap_count_proxy_neighbors: externalOverlapCountProxy,
    conclusion,
    anchor_fit_ok: anchorFitOk
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.18 — NW anchor fit audit',
    '',
    `Anchors from: ${anchorsPath}`,
    `Threshold for OK: distance <= ${ANCHOR_DISTANCE_THRESHOLD}`,
    '',
    'Per-NW municipality: centroid, anchor, delta, distance',
    ...perMun.map(m =>
      m.anchor
        ? `  ${m.municipality_id} ${m.source_file}: centroid=(${m.centroid.x.toFixed(2)}, ${m.centroid.y.toFixed(2)}) anchor=(${m.anchor.x}, ${m.anchor.y}) dx=${m.delta!.dx.toFixed(2)} dy=${m.delta!.dy.toFixed(2)} distance=${m.distance!.toFixed(2)} n=${m.feature_count}`
        : `  ${m.municipality_id} ${m.source_file}: centroid=(${m.centroid.x.toFixed(2)}, ${m.centroid.y.toFixed(2)}) anchor=missing n=${m.feature_count}`
    ),
    '',
    `Internal NW overlap area proxy: ${internalOverlapProxy.toFixed(2)} (expect 0)`,
    `External overlap count proxy (vs Bosanska Krupa / Bosanski Petrovac): ${externalOverlapCountProxy}`,
    '',
    conclusion
  ];
  writeFileSync(OUT_TXT, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${OUT_JSON}\n`);
  process.stdout.write(`Wrote ${OUT_TXT}\n`);
  process.stdout.write(`${conclusion}\n`);
}

main();
