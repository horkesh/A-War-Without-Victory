/**
 * Phase H6.0 — SVG → world georeferencing baseline (ADM3-anchored, audit-first).
 * DATA + MATH ONLY. No simulation logic. SVG space authoritative; world observational.
 *
 * Produces: anchor datasets, crosswalk, transform coefficients, residual report.
 * Usage: tsx scripts/map/phase_h6_0_build_svg_to_world_georef.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const GEOREF_DIR = resolve(DERIVED, 'georef');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const ADM3_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const ADM3_POST1995_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3.geojson');
const REGISTRY_PATH = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
const MANIFEST_PATH = resolve(ROOT, 'data/source/audits/source_manifest.json');
const MUN1990_NAMES_PATH = resolve(DERIVED, 'mun1990_names.json');

const RESIDUAL_DEBUG_THRESHOLD_M = 10_000;

// --- Step 0: Orient (confirmations recorded in audit) ---
interface OrientConfirm {
  svg_settlement_space: string;
  adm3_crs: string;
  existing_georef_artifacts: string[];
}

function step0Orient(): OrientConfirm {
  const georefExists = existsSync(GEOREF_DIR);
  const existing: string[] = [];
  if (georefExists) {
    try {
      const { readdirSync } = require('node:fs');
      existing.push(...readdirSync(GEOREF_DIR).map((f: string) => `georef/${f}`));
    } catch {
      existing.push('georef/ (dir present)');
    }
  } else {
    existing.push('none');
  }
  return {
    svg_settlement_space: 'arbitrary pixel space (settlements_substrate.geojson coordinates)',
    adm3_crs: 'EPSG:4326 (bih_adm3_1990.geojson lon/lat)',
    existing_georef_artifacts: existing.length ? existing : ['none'],
  };
}

// --- String normalization (lowercase, ascii, remove diacritics) ---
const DIACRITICS: Record<string, string> = {
  š: 's', ž: 'z', č: 'c', ć: 'c', đ: 'd', dž: 'dz',
  Š: 'S', Ž: 'Z', Č: 'C', Ć: 'C', Đ: 'D',
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ý: 'y',
  à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
  ä: 'a', ë: 'e', ï: 'i', ö: 'o', ü: 'u',
  â: 'a', ê: 'e', î: 'i', ô: 'o', û: 'u',
  ã: 'a', ñ: 'n', ø: 'o',
};
function normalizeName(s: string): string {
  let t = s.toLowerCase().trim();
  for (const [k, v] of Object.entries(DIACRITICS)) {
    t = t.split(k).join(v);
  }
  t = t.replace(/[^\x20-\x7E]/g, (c) => DIACRITICS[c] ?? '');
  return t.replace(/\s+/g, ' ').trim();
}

// Known ADM3 name → mun1990_id when normalized form differs (e.g. "Brcko District" → brcko)
const ADM3_NAME_ALIAS: Record<string, string> = {
  'brcko district': 'brcko',
};

// --- Polygon centroid (first ring, planar mean; for lon/lat GeoJSON) ---
function polygonCentroid(coords: number[][][]): [number, number] {
  const ring = coords[0];
  if (!ring || ring.length === 0) return [0, 0];
  let sx = 0, sy = 0, n = 0;
  for (const p of ring) {
    if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      sx += p[0];
      sy += p[1];
      n++;
    }
  }
  return n === 0 ? [0, 0] : [sx / n, sy / n];
}

function multiPolygonCentroid(coords: number[][][][]): [number, number] {
  let sx = 0, sy = 0, n = 0;
  for (const poly of coords) {
    const [cx, cy] = polygonCentroid(poly);
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      sx += cx;
      sy += cy;
      n++;
    }
  }
  return n === 0 ? [0, 0] : [sx / n, sy / n];
}

function geomCentroid(geom: { type: string; coordinates: unknown }): [number, number] | null {
  if (!geom?.coordinates) return null;
  const c = geom.coordinates as number[][][] | number[][][][];
  if (geom.type === 'Polygon') return polygonCentroid(c as number[][][]);
  if (geom.type === 'MultiPolygon') return multiPolygonCentroid(c as number[][][][]);
  return null;
}

/** Post-1995 municipalities that merge into a mun1990; add auxiliary TPS pairs (shapeName in bih_adm3 → municipality_id in substrate). */
const AUXILIARY_MERGED_PAIRS: Array<{ shapeName: string; municipality_id: string }> = [
  { shapeName: 'Petrovo', municipality_id: '20478' }, // Petrovo→Gračanica
];

/** Compute extra TPS anchor pairs for merged municipalities (e.g. Petrovo SVG centroid → Petrovo world centroid). */
function computeAuxiliaryAnchorPairs(): Array<{ x: number; y: number; lon: number; lat: number }> {
  if (!existsSync(ADM3_POST1995_PATH)) return [];
  const raw = readFileSync(ADM3_POST1995_PATH, 'utf8');
  const adm3 = JSON.parse(raw) as { features?: Array<{ properties?: { shapeName?: string }; geometry?: { type: string; coordinates: unknown } }> };
  const features = adm3?.features ?? [];
  const byShapeName = new Map<string, [number, number]>();
  for (const f of features) {
    const name = f.properties?.shapeName ?? '';
    if (!name) continue;
    const c = geomCentroid(f.geometry as { type: string; coordinates: unknown });
    if (c) byShapeName.set(name, c);
  }
  const rawSub = readFileSync(SUBSTRATE_PATH, 'utf8');
  const fc = JSON.parse(rawSub) as { features?: Array<{ properties?: { municipality_id?: string }; geometry?: { type: string; coordinates: unknown } }> };
  const subFeatures = fc?.features ?? [];
  const byMunId = new Map<string, { sx: number; sy: number; n: number }>();
  for (const f of subFeatures) {
    const mid = f.properties?.municipality_id ?? '';
    if (!mid) continue;
    const c = geomCentroid(f.geometry as { type: string; coordinates: unknown });
    if (!c) continue;
    const cur = byMunId.get(mid) ?? { sx: 0, sy: 0, n: 0 };
    cur.sx += c[0];
    cur.sy += c[1];
    cur.n += 1;
    byMunId.set(mid, cur);
  }
  const out: Array<{ x: number; y: number; lon: number; lat: number }> = [];
  for (const { shapeName, municipality_id } of AUXILIARY_MERGED_PAIRS) {
    const world = byShapeName.get(shapeName);
    const agg = byMunId.get(municipality_id);
    if (!world || !agg || agg.n === 0) continue;
    const x = agg.sx / agg.n;
    const y = agg.sy / agg.n;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(world[0]) || !Number.isFinite(world[1])) continue;
    out.push({ x, y, lon: world[0], lat: world[1] });
  }
  return out;
}

// --- Haversine (meters) ---
function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Step 1: World anchors (ADM3 centroids) ---
interface WorldAnchor {
  adm3_id: string;
  name: string;
  lon: number;
  lat: number;
}

function step1WorldAnchors(): WorldAnchor[] {
  const raw = readFileSync(ADM3_PATH, 'utf8');
  const fc = JSON.parse(raw) as {
    type: string;
    features?: Array<{
      properties?: { shapeID?: string; shapeName?: string; mun1990_id?: string; mun1990_name?: string };
      geometry?: { type: string; coordinates: unknown };
    }>;
  };
  const features = fc?.features ?? [];
  const out: WorldAnchor[] = [];
  for (const f of features) {
    const pid = f.properties?.shapeID ?? f.properties?.mun1990_id ?? '';
    const name = f.properties?.shapeName ?? f.properties?.mun1990_name ?? '';
    const c = geomCentroid(f.geometry as { type: string; coordinates: unknown });
    if (!c || !pid) continue;
    const [lon, lat] = c;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    out.push({ adm3_id: pid, name, lon, lat });
  }
  out.sort((a, b) => a.adm3_id.localeCompare(b.adm3_id));
  return out;
}

// --- Step 2: SVG anchors (municipality centroids from substrate) ---
interface SvgAnchor {
  mun1990_id: string;
  display_name: string;
  x: number;
  y: number;
}

function step2SvgAnchors(): SvgAnchor[] {
  let mun1990Names: { by_municipality_id?: Record<string, { mun1990_id?: string; display_name?: string }> } = {};
  if (existsSync(MUN1990_NAMES_PATH)) {
    mun1990Names = JSON.parse(readFileSync(MUN1990_NAMES_PATH, 'utf8'));
  }
  const raw = readFileSync(SUBSTRATE_PATH, 'utf8');
  const fc = JSON.parse(raw) as { type: string; features?: Array<{ properties?: { municipality_id?: string }; geometry?: { type: string; coordinates: unknown } }> };
  const features = fc?.features ?? [];
  const byMun1990 = new Map<string, { sx: number; sy: number; n: number; display_name: string }>();
  for (const f of features) {
    const mid = f.properties?.municipality_id ?? f.properties?.mun1990_municipality_id;
    if (mid == null || mid === '') continue;
    const c = geomCentroid(f.geometry as { type: string; coordinates: unknown });
    if (!c) continue;
    const [x, y] = c;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const entry = mun1990Names.by_municipality_id?.[String(mid).trim()];
    const mun1990_id = entry?.mun1990_id ?? String(mid).trim();
    const display_name = entry?.display_name ?? String(mid);
    const cur = byMun1990.get(mun1990_id) ?? { sx: 0, sy: 0, n: 0, display_name };
    cur.sx += x;
    cur.sy += y;
    cur.n += 1;
    cur.display_name = display_name;
    byMun1990.set(mun1990_id, cur);
  }
  const out: SvgAnchor[] = [];
  const ids = [...byMun1990.keys()].sort((a, b) => a.localeCompare(b));
  for (const mun1990_id of ids) {
    const agg = byMun1990.get(mun1990_id)!;
    const x = agg.sx / agg.n;
    const y = agg.sy / agg.n;
    out.push({ mun1990_id, display_name: agg.display_name, x, y });
  }
  return out;
}

// --- Step 3: Crosswalk candidates ---
type CandidateReason = 'exact' | 'normalized' | 'ambiguous' | 'unmatched';

interface CrosswalkCandidate {
  mun1990_id: string;
  adm3_id: string | null;
  reason: CandidateReason;
}

function step3CrosswalkCandidates(
  svgAnchors: SvgAnchor[],
  worldAnchors: WorldAnchor[],
  registry: { rows?: Array<{ mun1990_id: string; name?: string; normalized_name?: string }> }
): CrosswalkCandidate[] {
  const adm3ByNorm = new Map<string, WorldAnchor[]>();
  for (const w of worldAnchors) {
    let norm = normalizeName(w.name);
    const alias = ADM3_NAME_ALIAS[norm];
    if (alias) norm = alias;
    const list = adm3ByNorm.get(norm) ?? [];
    list.push(w);
    adm3ByNorm.set(norm, list);
  }
  const registryNormToMun = new Map<string, string>();
  for (const r of registry.rows ?? []) {
    const normName = r.normalized_name ? normalizeName(r.normalized_name) : (r.name ? normalizeName(r.name) : '');
    if (normName) registryNormToMun.set(normName, r.mun1990_id);
    const normId = normalizeName(r.mun1990_id.replace(/_/g, ' '));
    if (normId) registryNormToMun.set(normId, r.mun1990_id);
  }
  const out: CrosswalkCandidate[] = [];
  for (const svg of svgAnchors) {
    const munNormDisplay = normalizeName(svg.display_name);
    const munNormId = normalizeName(svg.mun1990_id.replace(/_/g, ' '));
    let adm3Candidates: WorldAnchor[] = [];
    for (const [adm3Norm, list] of adm3ByNorm) {
      const matchMun = registryNormToMun.get(svg.mun1990_id);
      const matchDisplayNorm = matchMun ? normalizeName((registry.rows ?? []).find((rr) => rr.mun1990_id === matchMun)?.normalized_name ?? '') : munNormDisplay;
      if (adm3Norm === munNormDisplay || adm3Norm === munNormId || adm3Norm === matchDisplayNorm) {
        adm3Candidates = list;
        break;
      }
    }
    if (adm3Candidates.length === 0) {
      const regRow = (registry.rows ?? []).find((r) => r.mun1990_id === svg.mun1990_id);
      const regNorm = regRow ? normalizeName(regRow.normalized_name ?? regRow.name ?? '') : '';
      if (regNorm && adm3ByNorm.has(regNorm)) {
        adm3Candidates = adm3ByNorm.get(regNorm)!;
      }
    }
    if (adm3Candidates.length === 0) {
      out.push({ mun1990_id: svg.mun1990_id, adm3_id: null, reason: 'unmatched' });
      continue;
    }
    if (adm3Candidates.length > 1) {
      out.push({
        mun1990_id: svg.mun1990_id,
        adm3_id: adm3Candidates[0].adm3_id,
        reason: 'ambiguous',
      });
      continue;
    }
    const match = adm3Candidates[0];
    const matchNorm = normalizeName(match.name);
    const reason: CandidateReason =
      munNormDisplay === matchNorm || munNormId === matchNorm ? 'exact' : 'normalized';
    out.push({ mun1990_id: svg.mun1990_id, adm3_id: match.adm3_id, reason });
  }
  return out;
}

// --- Step 4: Final crosswalk (strict) ---
interface FinalCrosswalkRow {
  mun1990_id: string;
  adm3_id: string;
}

interface FinalCrosswalk {
  rows: FinalCrosswalkRow[];
  total_mun1990: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
}

function step4FinalCrosswalk(candidates: CrosswalkCandidate[]): FinalCrosswalk {
  const total_mun1990 = candidates.length;
  let matched = 0;
  let ambiguous = 0;
  let unmatched = 0;
  const rows: FinalCrosswalkRow[] = [];
  for (const c of candidates) {
    if (c.reason === 'ambiguous') {
      ambiguous++;
      continue;
    }
    if (c.reason === 'unmatched' || c.adm3_id == null) {
      unmatched++;
      continue;
    }
    matched++;
    rows.push({ mun1990_id: c.mun1990_id, adm3_id: c.adm3_id });
  }
  rows.sort((a, b) => a.mun1990_id.localeCompare(b.mun1990_id));
  return { rows, total_mun1990, matched, ambiguous, unmatched };
}

// --- Affine 2D: [u,v] = [a,b,c] * [x,y,1] and [d,e,f] * [x,y,1] ---
function solveAffine(
  pairs: Array<{ x: number; y: number; u: number; v: number }>
): { method: 'affine'; params: number[] } | null {
  const n = pairs.length;
  if (n < 3) return null;
  const A: number[][] = [];
  const bu: number[] = [];
  const bv: number[] = [];
  for (const p of pairs) {
    A.push([p.x, p.y, 1]);
    bu.push(p.u);
    bv.push(p.v);
  }
  const params = leastSquares6(A, bu, bv);
  return params ? { method: 'affine', params } : null;
}

function leastSquares6(A: number[][], bu: number[], bv: number[]): number[] | null {
  const n = A.length;
  const M: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, o] = A[i];
    M.push([x, y, o, 0, 0, 0]);
    M.push([0, 0, 0, x, y, o]);
    b.push(bu[i], bv[i]);
  }
  const Mt = transpose(M);
  const MtM = matMul(Mt, M);
  const Mtb = matMulVec(Mt, b);
  const sol = solveLinear(MtM, Mtb);
  return sol;
}

function transpose(M: number[][]): number[][] {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  const T: number[][] = [];
  for (let j = 0; j < cols; j++) {
    T.push([]);
    for (let i = 0; i < rows; i++) T[j].push(M[i][j]);
  }
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const rows = A.length;
  const inner = A[0]?.length ?? 0;
  const cols = B[0]?.length ?? 0;
  const C: number[][] = [];
  for (let i = 0; i < rows; i++) {
    C.push([]);
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < inner; k++) s += A[i][k] * B[k][j];
      C[i].push(s);
    }
  }
  return C;
}

function matMulVec(M: number[][], v: number[]): number[] {
  return M.map(row => row.reduce((s, m, k) => s + m * v[k], 0));
}

function solveLinear(M: number[][], b: number[]): number[] | null {
  const n = M.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[best][col])) best = row;
    }
    [a[col], a[best]] = [a[best], a[col]];
    const pivot = a[col][col];
    if (Math.abs(pivot) < 1e-12) return null;
    for (let j = 0; j <= n; j++) a[col][j] /= pivot;
    for (let i = 0; i < n; i++) {
      if (i === col) continue;
      const factor = a[i][col];
      for (let j = 0; j <= n; j++) a[i][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

function applyAffine(x: number, y: number, params: number[]): [number, number] {
  const [a, b, c, d, e, f] = params;
  return [a * x + b * y + c, d * x + e * y + f];
}

// --- TPS: f(x,y) = a1 + ax*x + ay*y + sum_i w_i * U(||p-p_i||), U(r)=r^2*log(max(r,1e-10)) ---
function tpsBasis(r: number): number {
  if (r < 1e-10) return 0;
  return r * r * Math.log(r);
}

function solveTps(
  pairs: Array<{ x: number; y: number; u: number; v: number }>
): { method: 'tps'; params: { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] } } | null {
  const n = pairs.length;
  if (n < 3) return null;
  const pts = pairs.map(p => [p.x, p.y]);
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K.push([]);
    for (let j = 0; j < n; j++) {
      const dx = pts[i][0] - pts[j][0];
      const dy = pts[i][1] - pts[j][1];
      K[i][j] = tpsBasis(Math.sqrt(dx * dx + dy * dy));
    }
  }
  const P: number[][] = pts.map((p, i) => [1, p[0], p[1]]);
  const L: number[][] = [];
  for (let i = 0; i < n; i++) {
    L.push([...K[i], ...P[i]]);
  }
  for (let col = 0; col < 3; col++) {
    const row = P.map((r) => r[col]);
    L.push([...row, 0, 0, 0]);
  }
  const rhsU = [...pairs.map(p => p.u), 0, 0, 0];
  const rhsV = [...pairs.map(p => p.v), 0, 0, 0];
  const solU = solveLinearSquare(L, rhsU);
  const solV = solveLinearSquare(L, rhsV);
  if (!solU || !solV) return null;
  for (const v of [...solU, ...solV]) {
    if (!Number.isFinite(v) || Number.isNaN(v)) return null;
  }
  return {
    method: 'tps',
    params: {
      wx: solU.slice(0, n),
      wy: solV.slice(0, n),
      ax: solU.slice(n),
      ay: solV.slice(n),
      pts,
    },
  };
}

function solveLinearSquare(M: number[][], b: number[]): number[] | null {
  const n = M.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[best][col])) best = row;
    }
    [a[col], a[best]] = [a[best], a[col]];
    const pivot = a[col][col];
    if (Math.abs(pivot) < 1e-10) return null;
    for (let j = 0; j <= n; j++) a[col][j] /= pivot;
    for (let i = 0; i < n; i++) {
      if (i === col) continue;
      const factor = a[i][col];
      for (let j = 0; j <= n; j++) a[i][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

function applyTps(
  x: number,
  y: number,
  params: { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] }
): [number, number] {
  const { wx, wy, ax, ay, pts } = params;
  let u = ax[0] + ax[1] * x + ax[2] * y;
  let v = ay[0] + ay[1] * x + ay[2] * y;
  for (let i = 0; i < pts.length; i++) {
    const dx = x - pts[i][0];
    const dy = y - pts[i][1];
    const r = Math.sqrt(dx * dx + dy * dy);
    u += wx[i] * tpsBasis(r);
    v += wy[i] * tpsBasis(r);
  }
  return [u, v];
}

// --- Step 5: Transform derivation ---
interface TransformOutput {
  method: 'tps' | 'affine';
  anchor_count: number;
  coefficients: unknown;
  residuals_summary: { min: number; max: number; mean: number; rmse: number };
  rejected_anchors: string[];
  source_manifest_hash: string;
}

function step5Transform(
  crosswalk: FinalCrosswalk,
  svgAnchors: SvgAnchor[],
  worldAnchors: WorldAnchor[],
  manifestHash: string
): TransformOutput {
  const worldById = new Map(worldAnchors.map(w => [w.adm3_id, w]));
  const svgByMun = new Map(svgAnchors.map(s => [s.mun1990_id, s]));
  const pairs: Array<{ mun1990_id: string; x: number; y: number; lon: number; lat: number }> = [];
  for (const row of crosswalk.rows) {
    const svg = svgByMun.get(row.mun1990_id);
    const world = worldById.get(row.adm3_id);
    if (!svg || !world) continue;
    pairs.push({
      mun1990_id: row.mun1990_id,
      x: svg.x,
      y: svg.y,
      lon: world.lon,
      lat: world.lat,
    });
  }
  if (pairs.length < 3) {
    return {
      method: 'affine',
      anchor_count: 0,
      coefficients: {},
      residuals_summary: { min: 0, max: 0, mean: 0, rmse: 0 },
      rejected_anchors: crosswalk.rows.map(r => r.mun1990_id),
      source_manifest_hash: manifestHash,
    };
  }
  const auxiliary = computeAuxiliaryAnchorPairs();
  const anchorPairs = [
    ...pairs.map(p => ({ x: p.x, y: p.y, u: p.lon, v: p.lat })),
    ...auxiliary.map(a => ({ x: a.x, y: a.y, u: a.lon, v: a.lat })),
  ];
  let transform: { method: 'tps' | 'affine'; coeff: unknown; apply: (x: number, y: number) => [number, number] };
  const tps = solveTps(anchorPairs);
  if (tps && tps.method === 'tps') {
    transform = {
      method: 'tps',
      coeff: tps.params,
      apply: (x, y) => applyTps(x, y, tps.params),
    };
  } else {
    const aff = solveAffine(anchorPairs);
    if (!aff) {
      return {
        method: 'affine',
        anchor_count: 0,
        coefficients: {},
        residuals_summary: { min: 0, max: 0, mean: 0, rmse: 0 },
        rejected_anchors: crosswalk.rows.map(r => r.mun1990_id),
        source_manifest_hash: manifestHash,
      };
    }
    transform = {
      method: 'affine',
      coeff: aff.params,
      apply: (x, y) => applyAffine(x, y, aff.params),
    };
  }
  const residuals: number[] = [];
  for (const p of pairs) {
    const [lonPred, latPred] = transform.apply(p.x, p.y);
    const m = haversineMeters(p.lon, p.lat, lonPred, latPred);
    residuals.push(m);
  }
  for (const a of auxiliary) {
    const [lonPred, latPred] = transform.apply(a.x, a.y);
    const m = haversineMeters(a.lon, a.lat, lonPred, latPred);
    residuals.push(m);
  }
  const min = Math.min(...residuals);
  const max = Math.max(...residuals);
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const rmse = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / residuals.length);
  return {
    method: transform.method,
    anchor_count: pairs.length + auxiliary.length,
    coefficients: transform.coeff,
    residuals_summary: { min, max, mean, rmse },
    rejected_anchors: [],
    source_manifest_hash: manifestHash,
  };
}

function computeSourceManifestHash(): string {
  if (!existsSync(MANIFEST_PATH)) return '';
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  return createHash('sha256').update(content).digest('hex');
}

// --- Step 6: Audit report ---
interface AuditReport {
  orient: OrientConfirm;
  anchor_counts: { world_adm3: number; svg_municipalities: number };
  match_rates: { total_mun1990: number; matched: number; ambiguous: number; unmatched: number };
  residual_distribution: { min: number; max: number; mean: number; rmse: number };
  top10_worst_residuals: Array<{ mun1990_id: string; residual_m: number }>;
  note_svg_authoritative: string;
}

function step6AuditReport(
  orient: OrientConfirm,
  worldAnchors: WorldAnchor[],
  svgAnchors: SvgAnchor[],
  crosswalk: FinalCrosswalk,
  transform: TransformOutput
): AuditReport {
  const residuals: Array<{ mun1990_id: string; residual_m: number }> = [];
  if (transform.anchor_count >= 3 && transform.coefficients) {
    const worldById = new Map(worldAnchors.map(w => [w.adm3_id, w]));
    const svgByMun = new Map(svgAnchors.map(s => [s.mun1990_id, s]));
    const apply = transform.method === 'affine'
      ? (x: number, y: number) => applyAffine(x, y, transform.coefficients as number[])
      : (x: number, y: number) => applyTps(x, y, transform.coefficients as { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] });
    for (const row of crosswalk.rows) {
      const svg = svgByMun.get(row.mun1990_id);
      const world = worldById.get(row.adm3_id);
      if (!svg || !world) continue;
      const [lonPred, latPred] = apply(svg.x, svg.y);
      const m = haversineMeters(world.lon, world.lat, lonPred, latPred);
      residuals.push({ mun1990_id: row.mun1990_id, residual_m: m });
    }
    residuals.sort((a, b) => b.residual_m - a.residual_m);
  }
  return {
    orient,
    anchor_counts: { world_adm3: worldAnchors.length, svg_municipalities: svgAnchors.length },
    match_rates: {
      total_mun1990: crosswalk.total_mun1990,
      matched: crosswalk.matched,
      ambiguous: crosswalk.ambiguous,
      unmatched: crosswalk.unmatched,
    },
    residual_distribution: transform.residuals_summary,
    top10_worst_residuals: residuals.slice(0, 10),
    note_svg_authoritative: 'SVG remains authoritative; world coordinates and transform are observational only.',
  };
}

// --- Step 7: Optional debug GeoJSON ---
function step7DebugGeojson(
  crosswalk: FinalCrosswalk,
  svgAnchors: SvgAnchor[],
  worldAnchors: WorldAnchor[],
  transform: TransformOutput,
  thresholdM: number
): void {
  const summary = transform.residuals_summary;
  if (summary.max <= thresholdM) return;
  const worldById = new Map(worldAnchors.map(w => [w.adm3_id, w]));
  const svgByMun = new Map(svgAnchors.map(s => [s.mun1990_id, s]));
  const apply = transform.method === 'affine'
    ? (x: number, y: number) => applyAffine(x, y, transform.coefficients as number[])
    : (x: number, y: number) => applyTps(x, y, transform.coefficients as { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] });
  const features: GeoJSON.Feature[] = [];
  for (const row of crosswalk.rows) {
    const svg = svgByMun.get(row.mun1990_id);
    const world = worldById.get(row.adm3_id);
    if (!svg || !world) continue;
    const [lonPred, latPred] = apply(svg.x, svg.y);
    const m = haversineMeters(world.lon, world.lat, lonPred, latPred);
    if (m <= thresholdM) continue;
    const [predLon, predLat] = apply(svg.x, svg.y);
    features.push({
      type: 'Feature',
      properties: { mun1990_id: row.mun1990_id, residual_m: Math.round(m * 100) / 100 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [predLon, predLat],
          [world.lon, world.lat],
        ],
      },
    });
  }
  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  writeFileSync(resolve(GEOREF_DIR, 'georef_debug_points.geojson'), JSON.stringify(fc, null, 2), 'utf8');
}

declare namespace GeoJSON {
  interface Feature {
    type: 'Feature';
    properties?: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
}

// --- Main ---
function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(ADM3_PATH)) {
    console.error('Missing:', ADM3_PATH);
    process.exit(1);
  }
  if (!existsSync(REGISTRY_PATH)) {
    console.error('Missing:', REGISTRY_PATH);
    process.exit(1);
  }
  if (!existsSync(GEOREF_DIR)) {
    mkdirSync(GEOREF_DIR, { recursive: true });
  }

  const orient = step0Orient();
  const worldAnchors = step1WorldAnchors();
  const svgAnchors = step2SvgAnchors();
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as { rows?: Array<{ mun1990_id: string; name?: string; normalized_name?: string }> };
  const candidates = step3CrosswalkCandidates(svgAnchors, worldAnchors, registry);
  const crosswalk = step4FinalCrosswalk(candidates);
  const manifestHash = computeSourceManifestHash();
  const transform = step5Transform(crosswalk, svgAnchors, worldAnchors, manifestHash);
  const auditReport = step6AuditReport(orient, worldAnchors, svgAnchors, crosswalk, transform);

  writeFileSync(resolve(GEOREF_DIR, 'adm3_world_centroids.json'), JSON.stringify(worldAnchors, null, 2), 'utf8');
  writeFileSync(resolve(GEOREF_DIR, 'svg_municipality_centroids.json'), JSON.stringify(svgAnchors, null, 2), 'utf8');
  writeFileSync(
    resolve(GEOREF_DIR, 'adm3_crosswalk_candidates.json'),
    JSON.stringify(candidates, null, 2),
    'utf8'
  );
  writeFileSync(resolve(GEOREF_DIR, 'adm3_crosswalk_final.json'), JSON.stringify(crosswalk, null, 2), 'utf8');
  writeFileSync(resolve(GEOREF_DIR, 'svg_to_world_transform.json'), JSON.stringify(transform, null, 2), 'utf8');
  writeFileSync(resolve(GEOREF_DIR, 'audit_georef_report.json'), JSON.stringify(auditReport, null, 2), 'utf8');

  const txtLines: string[] = [
    'Phase H6.0 — Georeferencing audit report',
    '======================================',
    '',
    'Orient:',
    `  SVG settlement space: ${orient.svg_settlement_space}`,
    `  ADM3 CRS: ${orient.adm3_crs}`,
    `  Existing georef artifacts: ${orient.existing_georef_artifacts.join(', ')}`,
    '',
    'Anchor counts:',
    `  World ADM3: ${auditReport.anchor_counts.world_adm3}`,
    `  SVG municipalities: ${auditReport.anchor_counts.svg_municipalities}`,
    '',
    'Match rates:',
    `  total_mun1990: ${auditReport.match_rates.total_mun1990}`,
    `  matched: ${auditReport.match_rates.matched}`,
    `  ambiguous: ${auditReport.match_rates.ambiguous}`,
    `  unmatched: ${auditReport.match_rates.unmatched}`,
    '',
    'Residual distribution (m):',
    `  min: ${auditReport.residual_distribution.min.toFixed(2)}`,
    `  max: ${auditReport.residual_distribution.max.toFixed(2)}`,
    `  mean: ${auditReport.residual_distribution.mean.toFixed(2)}`,
    `  rmse: ${auditReport.residual_distribution.rmse.toFixed(2)}`,
    '',
    'Top 10 worst residuals:',
    ...auditReport.top10_worst_residuals.map((r) => `  ${r.mun1990_id}: ${r.residual_m.toFixed(2)} m`),
    '',
    'Note: ' + auditReport.note_svg_authoritative,
  ];
  writeFileSync(resolve(GEOREF_DIR, 'audit_georef_report.txt'), txtLines.join('\n'), 'utf8');

  step7DebugGeojson(crosswalk, svgAnchors, worldAnchors, transform, RESIDUAL_DEBUG_THRESHOLD_M);

  console.log('Phase H6.0 georef outputs written to data/derived/georef/');
  console.log('  matched:', crosswalk.matched, 'ambiguous:', crosswalk.ambiguous, 'unmatched:', crosswalk.unmatched);
  console.log('  transform:', transform.method, 'anchor_count:', transform.anchor_count, 'rmse(m):', transform.residuals_summary.rmse.toFixed(2));
}

main();
