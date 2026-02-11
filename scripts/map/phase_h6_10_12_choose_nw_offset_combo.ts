/**
 * Phase H6.10.12 / H6.10.14 / H6.10.18 — Brute-force NW viewBox offset + similarity transform
 *
 * PURPOSE:
 *   Compute the best offset assignment (none/plus/minus) for the four NW JS sources
 *   and best-fit similarity transform (s, tx, ty) aligning NW centroids to drzava anchors.
 *   H6.10.18: evaluate all 81 combos with closed-form similarity fit; score by internal
 *   overlap (hard gate 0), anchor_cost, external overlap; output chosen offsets + (s,tx,ty).
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson (read-only; non-NW bbox index)
 *   - NW source JS files under data/source/settlements
 *   - data/derived/_debug/drzava_muni_anchors_h6_10_14.json (run extract script first)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - drzava_muni_anchors_h6_10_18.json (flat schema mun_id -> {x,y})
 *   - nw_similarity_rank_h6_10_18.json
 *   - nw_similarity_rank_h6_10_18.txt
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_14_extract_drzava_muni_anchors.ts  # run first
 *   npx tsx scripts/map/phase_h6_10_12_choose_nw_offset_combo.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';
import {
  normFile,
  parseMunicipalityFile,
  bboxFromCoords,
  svgPathToPolygon,
  NW_FILES
} from './derive_settlement_substrate_from_svg_sources.js';

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const SETTLEMENTS_DIR = resolve(ROOT, 'data/source/settlements');
const DRZAVA_ANCHORS_PATH = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_14.json');
const DRZAVA_ANCHORS_H6_10_18_PATH = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_18.json');

const RANK_JSON_PATH = resolve(DEBUG_DIR, 'nw_similarity_rank_h6_10_18.json');
const RANK_TXT_PATH = resolve(DEBUG_DIR, 'nw_similarity_rank_h6_10_18.txt');

/** fileName -> mun_id for NW files */
const FILE_TO_MUN_ID: Record<string, string> = {
  'Bihac_10049.js': '10049',
  'Cazin_10227.js': '10227',
  'Buzim_11240.js': '11240',
  'Velika Kladusa_11118.js': '11118'
};
type BBox = [number, number, number, number]; // minx, miny, maxx, maxy
type OffsetChoice = 'none' | 'plus' | 'minus';

const NW_FILE_NAMES = new Set(Object.keys(NW_FILES));
const CANDIDATES: OffsetChoice[] = ['none', 'plus', 'minus'];

function bboxOverlap(a: BBox, b: BBox): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

function bboxOverlapArea(a: BBox, b: BBox): number {
  if (!bboxOverlap(a, b)) return 0;
  const xOverlap = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const yOverlap = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  return xOverlap * yOverlap;
}

/** H6.10.18: Apply similarity transform (s, tx, ty) to bbox; returns new bbox [minx, miny, maxx, maxy]. */
function transformBbox(bbox: BBox, s: number, tx: number, ty: number): BBox {
  const [minx, miny, maxx, maxy] = bbox;
  const corners: [number, number][] = [
    [minx, miny],
    [maxx, miny],
    [maxx, maxy],
    [minx, maxy]
  ];
  let nminx = Infinity, nminy = Infinity, nmaxx = -Infinity, nmaxy = -Infinity;
  for (const [x, y] of corners) {
    const nx = s * x + tx;
    const ny = s * y + ty;
    nminx = Math.min(nminx, nx);
    nminy = Math.min(nminy, ny);
    nmaxx = Math.max(nmaxx, nx);
    nmaxy = Math.max(nmaxy, ny);
  }
  return [nminx, nminy, nmaxx, nmaxy];
}

/** H6.10.18: Closed-form similarity fit. centroids keyed by fileName, anchors by mun_id; fileNames + FILE_TO_MUN_ID to pair. Returns {s, tx, ty} and anchor_cost. */
function similarityFit(
  centroids: Record<string, { cx: number; cy: number }>,
  anchors: Map<string, { anchor_x: number; anchor_y: number }>,
  fileNames: string[],
  fileToMunId: Record<string, string>
): { s: number; tx: number; ty: number; anchor_cost: number } {
  const points: Array<{ c: [number, number]; a: [number, number] }> = [];
  for (const fn of fileNames) {
    const munId = fileToMunId[fn];
    const c = centroids[fn];
    const a = munId ? anchors.get(munId) : undefined;
    if (c && a) {
      points.push({ c: [c.cx, c.cy], a: [a.anchor_x, a.anchor_y] });
    }
  }
  if (points.length === 0) {
    return { s: 1, tx: 0, ty: 0, anchor_cost: 0 };
  }
  const n = points.length;
  let sumCx = 0, sumCy = 0, sumAx = 0, sumAy = 0;
  for (const { c, a } of points) {
    sumCx += c[0]; sumCy += c[1];
    sumAx += a[0]; sumAy += a[1];
  }
  const cBarX = sumCx / n, cBarY = sumCy / n;
  const aBarX = sumAx / n, aBarY = sumAy / n;
  let num = 0, den = 0;
  for (const { c, a } of points) {
    const cpx = c[0] - cBarX, cpy = c[1] - cBarY;
    const apx = a[0] - aBarX, apy = a[1] - aBarY;
    num += cpx * apx + cpy * apy;
    den += cpx * cpx + cpy * cpy;
  }
  const s = den === 0 ? 1 : num / den;
  const tx = aBarX - s * cBarX;
  const ty = aBarY - s * cBarY;
  let anchor_cost = 0;
  for (const { c, a } of points) {
    const dx = s * c[0] + tx - a[0];
    const dy = s * c[1] + ty - a[1];
    anchor_cost += dx * dx + dy * dy;
  }
  return { s, tx, ty, anchor_cost };
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing substrate:', SUBSTRATE_PATH);
    process.exit(1);
  }

  const substrateContent = readFileSync(SUBSTRATE_PATH, 'utf8');
  const substrate = JSON.parse(substrateContent) as { type: string; features: Array<{ properties?: { source_file?: string }; geometry?: { type: string; coordinates: unknown } }> };
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection');
    process.exit(1);
  }

  // Non-NW feature bboxes (same regime as phase_h6_10_8; use normFile for path-safe matching)
  const nonNwBboxes: BBox[] = [];
  for (const f of substrate.features) {
    const sourceFile = f.properties?.source_file as string | undefined;
    if (sourceFile && NW_FILE_NAMES.has(normFile(sourceFile))) continue;
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    const bbox = bboxFromCoords(coords as Parameters<typeof bboxFromCoords>[0]);
    if (bbox.every(Number.isFinite)) nonNwBboxes.push(bbox);
  }

  process.stdout.write(`Non-NW feature bboxes: ${nonNwBboxes.length}\n`);

  // Load drzava anchors (H6.10.14)
  const drzavaAnchors = new Map<string, { anchor_x: number; anchor_y: number }>();
  if (existsSync(DRZAVA_ANCHORS_PATH)) {
    const anchorsContent = readFileSync(DRZAVA_ANCHORS_PATH, 'utf8');
    const anchorsData = JSON.parse(anchorsContent) as { anchors?: Array<{ mun_id: string; anchor_x: number; anchor_y: number }> };
    for (const a of anchorsData.anchors ?? []) {
      drzavaAnchors.set(a.mun_id, { anchor_x: a.anchor_x, anchor_y: a.anchor_y });
    }
    process.stdout.write(`Loaded ${drzavaAnchors.size} drzava anchors\n`);
    // H6.10.18: Write flat schema drzava_muni_anchors_h6_10_18.json (untracked)
    mkdirSync(DEBUG_DIR, { recursive: true });
    const flatAnchors: Record<string, { x: number; y: number }> = {};
    for (const [munId, v] of drzavaAnchors) {
      flatAnchors[munId] = { x: v.anchor_x, y: v.anchor_y };
    }
    const sortedIds = Array.from(Object.keys(flatAnchors)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const flatSorted: Record<string, { x: number; y: number }> = {};
    for (const id of sortedIds) {
      flatSorted[id] = flatAnchors[id];
    }
    writeFileSync(DRZAVA_ANCHORS_H6_10_18_PATH, JSON.stringify(flatSorted, null, 2), 'utf8');
    process.stdout.write(`Wrote ${DRZAVA_ANCHORS_H6_10_18_PATH}\n`);
  } else {
    process.stdout.write('Drzava anchors not found; run phase_h6_10_14_extract_drzava_muni_anchors.ts first\n');
  }

  // Discover NW JS files (same as derive)
  const files: string[] = [];
  function discoverFiles(dir: string): void {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        discoverFiles(fullPath);
      } else if (entry.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  discoverFiles(SETTLEMENTS_DIR);
  const nwFiles = files
    .map((f) => ({ fullPath: f, relativePath: relative(SETTLEMENTS_DIR, f) }))
    .filter(({ relativePath }) => NW_FILE_NAMES.has(normFile(relativePath)))
    .sort((a, b) => normFile(a.relativePath).localeCompare(normFile(b.relativePath)));

  if (nwFiles.length !== 4) {
    console.error(`Expected 4 NW files, found ${nwFiles.length}`);
    process.exit(1);
  }

  // Parse each NW file; per-file viewBox + list of shape bboxes (raw)
  type FileData = { fileName: string; viewBox: { x: number; y: number } | null; shapeBboxes: BBox[] };
  const nwFileData: FileData[] = [];
  for (const { fullPath, relativePath } of nwFiles) {
    const parsed = parseMunicipalityFile(fullPath, relativePath);
    const fileName = normFile(relativePath);
    const shapeBboxes: BBox[] = [];
    for (const shape of parsed.shapes) {
      const polygon = svgPathToPolygon(shape.path);
      if (polygon && polygon[0]) {
        const bbox = bboxFromCoords(polygon);
        if (bbox.every(Number.isFinite)) shapeBboxes.push(bbox);
      }
    }
    nwFileData.push({
      fileName,
      viewBox: parsed.viewBox ? { x: parsed.viewBox.x, y: parsed.viewBox.y } : null,
      shapeBboxes
    });
  }

  // All 81 combos: each file gets none | plus | minus (stable order: lex of combo key)
  const fileNames = nwFileData.map((d) => d.fileName).sort();
  const combos: Array<Record<string, OffsetChoice>> = [];
  for (let i = 0; i < 81; i++) {
    const combo: Record<string, OffsetChoice> = {};
    let n = i;
    for (const f of fileNames) {
      combo[f] = CANDIDATES[n % 3];
      n = Math.floor(n / 3);
    }
    combos.push(combo);
  }
  // Sort by combo key for deterministic listing
  const comboKey = (c: Record<string, OffsetChoice>): string =>
    fileNames.map((f) => `${f}:${c[f]}`).join(',');
  combos.sort((a, b) => comboKey(a).localeCompare(comboKey(b)));

  // H6.10.18: Score each combo with similarity transform: internal (on transformed bboxes), anchor_cost, external_count, external_area (lexicographic)
  type ScoredCombo = {
    combo_key: string;
    per_file: Record<string, OffsetChoice>;
    s: number;
    tx: number;
    ty: number;
    internal_nw_overlap_area_proxy: number;
    anchor_cost: number;
    external_overlap_count: number;
    external_overlap_area_proxy: number;
  };
  const scored: ScoredCombo[] = [];

  for (const combo of combos) {
    // Per-NW-file aggregate bbox for this combo (candidate space after offset)
    const perFileBboxes: Record<string, BBox> = {};
    for (const fd of nwFileData) {
      const choice = combo[fd.fileName];
      const vx = fd.viewBox?.x ?? 0;
      const vy = fd.viewBox?.y ?? 0;
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (const [sx, sy, sx2, sy2] of fd.shapeBboxes) {
        let x1: number, y1: number, x2: number, y2: number;
        if (choice === 'none') {
          x1 = sx; y1 = sy; x2 = sx2; y2 = sy2;
        } else if (choice === 'plus') {
          x1 = sx + vx; y1 = sy + vy; x2 = sx2 + vx; y2 = sy2 + vy;
        } else {
          x1 = sx - vx; y1 = sy - vy; x2 = sx2 - vx; y2 = sy2 - vy;
        }
        minx = Math.min(minx, x1, x2);
        miny = Math.min(miny, y1, y2);
        maxx = Math.max(maxx, x1, x2);
        maxy = Math.max(maxy, y1, y2);
      }
      if (fd.shapeBboxes.length > 0) {
        perFileBboxes[fd.fileName] = [minx, miny, maxx, maxy];
      }
    }

    const nwFileList = Object.keys(perFileBboxes).sort();

    // Per-file centroids (bbox center) in candidate space
    const centroids: Record<string, { cx: number; cy: number }> = {};
    for (const fn of nwFileList) {
      const b = perFileBboxes[fn];
      centroids[fn] = {
        cx: (b[0] + b[2]) / 2,
        cy: (b[1] + b[3]) / 2
      };
    }

    // H6.10.18: Closed-form similarity fit (s, tx, ty) and anchor_cost
    const fit = similarityFit(centroids, drzavaAnchors, nwFileList, FILE_TO_MUN_ID);
    const { s, tx, ty, anchor_cost } = fit;

    // Apply similarity to per-file bboxes for internal overlap check
    const transformedPerFileBboxes: Record<string, BBox> = {};
    for (const fn of nwFileList) {
      transformedPerFileBboxes[fn] = transformBbox(perFileBboxes[fn], s, tx, ty);
    }

    // Internal NW overlap on TRANSFORMED bboxes (hard gate must be 0)
    let internal_nw_overlap_area_proxy = 0;
    for (let i = 0; i < nwFileList.length; i++) {
      for (let j = i + 1; j < nwFileList.length; j++) {
        internal_nw_overlap_area_proxy += bboxOverlapArea(
          transformedPerFileBboxes[nwFileList[i]],
          transformedPerFileBboxes[nwFileList[j]]
        );
      }
    }

    // External overlap: transform each NW shape bbox (candidate space) by (s,tx,ty), then count vs non-NW
    const allNwBboxesTransformed: BBox[] = [];
    for (const fd of nwFileData) {
      const choice = combo[fd.fileName];
      const vx = fd.viewBox?.x ?? 0;
      const vy = fd.viewBox?.y ?? 0;
      for (const [minx, miny, maxx, maxy] of fd.shapeBboxes) {
        let x1: number, y1: number, x2: number, y2: number;
        if (choice === 'none') {
          x1 = minx; y1 = miny; x2 = maxx; y2 = maxy;
        } else if (choice === 'plus') {
          x1 = minx + vx; y1 = miny + vy; x2 = maxx + vx; y2 = maxy + vy;
        } else {
          x1 = minx - vx; y1 = miny - vy; x2 = maxx - vx; y2 = maxy - vy;
        }
        const bbox: BBox = [x1, y1, x2, y2];
        allNwBboxesTransformed.push(transformBbox(bbox, s, tx, ty));
      }
    }
    let external_overlap_count = 0;
    let external_overlap_area_proxy = 0;
    for (const nwBb of allNwBboxesTransformed) {
      for (const nonBb of nonNwBboxes) {
        if (bboxOverlap(nwBb, nonBb)) {
          external_overlap_count++;
          external_overlap_area_proxy += bboxOverlapArea(nwBb, nonBb);
        }
      }
    }

    scored.push({
      combo_key: comboKey(combo),
      per_file: { ...combo },
      s,
      tx,
      ty,
      internal_nw_overlap_area_proxy,
      anchor_cost,
      external_overlap_count,
      external_overlap_area_proxy
    });
  }

  // Lexicographic sort: internal (ASC, gate 0), anchor_cost (ASC), external_count (ASC), external_area (ASC), tie-break combo_key + (s,tx,ty)
  const tieBreak = (sc: ScoredCombo): string =>
    `${sc.combo_key} s=${sc.s.toFixed(6)} tx=${sc.tx.toFixed(4)} ty=${sc.ty.toFixed(4)}`;
  scored.sort((a, b) => {
    if (a.internal_nw_overlap_area_proxy !== b.internal_nw_overlap_area_proxy)
      return a.internal_nw_overlap_area_proxy - b.internal_nw_overlap_area_proxy;
    if (a.anchor_cost !== b.anchor_cost)
      return a.anchor_cost - b.anchor_cost;
    if (a.external_overlap_count !== b.external_overlap_count)
      return a.external_overlap_count - b.external_overlap_count;
    if (a.external_overlap_area_proxy !== b.external_overlap_area_proxy)
      return a.external_overlap_area_proxy - b.external_overlap_area_proxy;
    return tieBreak(a).localeCompare(tieBreak(b));
  });

  const winner = scored[0];
  process.stdout.write(`Winner: ${winner.combo_key}\n`);
  process.stdout.write(`  similarity s=${winner.s.toFixed(6)} tx=${winner.tx.toFixed(4)} ty=${winner.ty.toFixed(4)}\n`);
  process.stdout.write(`  internal_nw_overlap_area_proxy=${winner.internal_nw_overlap_area_proxy.toFixed(1)}\n`);
  process.stdout.write(`  anchor_cost=${winner.anchor_cost.toFixed(1)}\n`);
  process.stdout.write(`  external_overlap_count=${winner.external_overlap_count} external_overlap_area_proxy=${winner.external_overlap_area_proxy.toFixed(1)}\n`);

  const payload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.18',
    nw_file_names: fileNames,
    non_nw_bbox_count: nonNwBboxes.length,
    winner: {
      combo_key: winner.combo_key,
      per_file: winner.per_file,
      s: winner.s,
      tx: winner.tx,
      ty: winner.ty,
      internal_nw_overlap_area_proxy: Math.round(winner.internal_nw_overlap_area_proxy * 10) / 10,
      anchor_cost: Math.round(winner.anchor_cost * 10) / 10,
      external_overlap_count: winner.external_overlap_count,
      external_overlap_area_proxy: Math.round(winner.external_overlap_area_proxy * 10) / 10
    },
    all_81_ranked: scored.map((s) => ({
      combo_key: s.combo_key,
      per_file: s.per_file,
      s: s.s,
      tx: s.tx,
      ty: s.ty,
      internal_nw_overlap_area_proxy: Math.round(s.internal_nw_overlap_area_proxy * 10) / 10,
      anchor_cost: Math.round(s.anchor_cost * 10) / 10,
      external_overlap_count: s.external_overlap_count,
      external_overlap_area_proxy: Math.round(s.external_overlap_area_proxy * 10) / 10
    }))
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(RANK_JSON_PATH, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.18 — NW offset combo + similarity transform ranking',
    '',
    `Non-NW bbox count: ${nonNwBboxes.length}`,
    '',
    'Winner:',
    `  ${winner.combo_key}`,
    `  s=${winner.s.toFixed(6)} tx=${winner.tx.toFixed(4)} ty=${winner.ty.toFixed(4)}`,
    `  internal=${winner.internal_nw_overlap_area_proxy.toFixed(1)} anchor_cost=${winner.anchor_cost.toFixed(1)} ext_cnt=${winner.external_overlap_count} ext_area=${winner.external_overlap_area_proxy.toFixed(1)}`,
    '',
    'Per-file choice for winner:',
    ...Object.entries(winner.per_file)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([f, c]) => `  ${f} => ${c}`),
    '',
    'All 81 combos (sorted: internal, anchor_cost, ext_cnt, ext_area, tie-break):',
    ...scored.map((s, i) =>
      `${i + 1}. int=${s.internal_nw_overlap_area_proxy.toFixed(1)} anchor=${s.anchor_cost.toFixed(1)} ext=${s.external_overlap_count} area=${s.external_overlap_area_proxy.toFixed(1)}  ${s.combo_key}  s=${s.s.toFixed(4)} tx=${s.tx.toFixed(2)} ty=${s.ty.toFixed(2)}`
    )
  ];
  writeFileSync(RANK_TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${RANK_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${RANK_TXT_PATH}\n`);
}

main();
