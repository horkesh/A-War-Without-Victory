/**
 * Build WGS84 settlement polygons that tessellate inside bih_adm3_1990.geojson
 * using constrained Voronoi on SVG-derived seeds.
 *
 * Inputs:
 *  - settlements_substrate.geojson (SVG pixel space) — from data/derived/ or data/_deprecated/derived/legacy_substrate/
 *  - data/derived/georef/svg_to_world_transform.json (TPS SVG -> WGS84)
 *  - data/source/boundaries/bih_adm3_1990.geojson (WGS84 ADM3, 1990)
 *  - data/source/bih_census_1991.json (population totals by settlement_id)
 *  - data/derived/settlement_names.json (names by census_id)
 *
 * Outputs:
 *  - data/derived/settlements_wgs84_1990.geojson
 *  - data/derived/settlements_wgs84_1990_report.json
 *
 * Determinism: stable sorting, fixed precision, no timestamps/randomness.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as turf from '@turf/turf';
import * as polygonClipping from 'polyclip-ts';
import * as martinez from 'martinez-polygon-clipping';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js';
import GeoJSONWriter from 'jsts/org/locationtech/jts/io/GeoJSONWriter.js';
import { applyTps, TpsParams } from './lib/tps.js';
import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';

polygonClipping.setPrecision(1e-6);

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface SubstrateFeature {
  type: 'Feature';
  properties?: {
    sid?: string;
    census_id?: string;
    settlement_name?: string;
    municipality_id?: string;
    mun1990_id?: string;
  };
  geometry?: {
    type?: 'Polygon' | 'MultiPolygon';
    coordinates?: Polygon | MultiPolygon;
  };
}

interface GeoJSONFC<T = any> {
  type: 'FeatureCollection';
  features: T[];
  awwv_meta?: Record<string, unknown>;
}

interface Adm3Feature {
  type: 'Feature';
  properties?: { mun1990_id?: string; mun1990_name?: string };
  geometry?: { type?: 'Polygon' | 'MultiPolygon'; coordinates?: Polygon | MultiPolygon };
}

interface CensusData {
  settlements?: Record<string, { p?: number[] }>;
}

const ROOT = resolve();
const SUBSTRATE_DERIVED = resolve(ROOT, 'data/derived/settlements_substrate.geojson');
const SUBSTRATE_DEPRECATED = resolve(ROOT, 'data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson');
const SUBSTRATE_PATH = existsSync(SUBSTRATE_DERIVED) ? SUBSTRATE_DERIVED : SUBSTRATE_DEPRECATED;
const SVG_TO_WORLD_PATH = resolve(ROOT, 'data/derived/georef/svg_to_world_transform.json');
const ADM3_1990_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const CENSUS_PATH = resolve(ROOT, 'data/source/bih_census_1991.json');
const SETTLEMENT_NAMES_PATH = resolve(ROOT, 'data/derived/settlement_names.json');

const OUTPUT_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990.geojson');
const REPORT_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990_report.json');

const PRECISION = 6;

/** Known mun1990_id aliases (e.g. hanpijesak vs han_pijesak). Applied before grouping. */
const MUN1990_NORMALIZE: Record<string, string> = {
  hanpijesak: 'han_pijesak'
};

/** municipality_id → mun1990_id when substrate/legacy has wrong mun1990. Istočno Novo Sarajevo (20214) merges into Novo Sarajevo. */
const MUNICIPALITY_ID_TO_MUN1990_OVERRIDE: Record<string, string> = {
  '20214': 'novo_sarajevo'
};

/** Novi Grad (Bosanski Novi) vs Novi Grad Sarajevo: geometry overrides name when centroid disagrees. */
const NOVI_GRAD_PAIR = new Set(['bosanski_novi', 'novi_grad_sarajevo']);

/** When a merged feature contains these census_ids, prefer their names for display (Novi Grad Sarajevo). */
const PREFERRED_NOVI_GRAD_SARAJEVO_CENSUS_IDS = ['170658', '143936', '144029'];

/** Fallback merge pairs when audit file is missing. from_sid → into_sid. */
const MERGE_PAIRS_FALLBACK: Record<string, string> = {
  S209490: 'S170666', S209520: 'S165336', S209538: 'S165354'
};

const SPLIT_MUNI_AUDIT_PATH = resolve(ROOT, 'data/derived/_audit/split_municipality_duplicate_settlements.json');

function loadMergePairs(): Record<string, string> {
  if (!existsSync(SPLIT_MUNI_AUDIT_PATH)) return MERGE_PAIRS_FALLBACK;
  const audit = JSON.parse(readFileSync(SPLIT_MUNI_AUDIT_PATH, 'utf8')) as {
    all_pairs?: Array<{ from_sid: string; into_sid: string }>;
  };
  const pairs = audit.all_pairs ?? [];
  const out: Record<string, string> = {};
  for (const p of pairs) {
    if (p.from_sid && p.into_sid) out[p.from_sid] = p.into_sid;
  }
  return Object.keys(out).length > 0 ? out : MERGE_PAIRS_FALLBACK;
}

/** Seed position overrides [lon, lat] WGS84 — forces Voronoi cell placement when substrate centroid is wrong. */
const SEED_OVERRIDE_WGS84: Record<string, [number, number]> = {
  S170666: [18.3932, 43.8398]  // Sarajevo Dio - Novo Sarajevo: northwestern part of Novo Sarajevo municipality
};

function round6(n: number): number {
  const f = Math.pow(10, PRECISION);
  return Math.round(n * f) / f;
}

function triangleArea(a: Point, b: Point, c: Point): number {
  return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}

function removeDuplicatePoints(ring: Ring): Ring {
  if (ring.length < 2) return ring;
  const out: Ring = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prev = out[out.length - 1];
    const curr = ring[i];
    if (prev[0] !== curr[0] || prev[1] !== curr[1]) out.push(curr);
  }
  return out;
}

function removeCollinearPoints(ring: Ring, areaEps: number): Ring {
  if (ring.length < 3) return ring;
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const prev = ring[(i - 1 + ring.length) % ring.length];
    const curr = ring[i];
    const next = ring[(i + 1) % ring.length];
    if (triangleArea(prev, curr, next) >= areaEps) out.push(curr);
  }
  return out.length >= 3 ? out : ring;
}

function closeRing(ring: Ring): Ring | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = (first[0] === last[0] && first[1] === last[1]) ? ring : [...ring, first];
  return closed.length >= 4 ? closed : null;
}

function normalizeRing(ring: Ring): Ring | null {
  const deduped = removeDuplicatePoints(ring);
  const closed = closeRing(deduped);
  if (!closed) return null;
  const open = closed.slice(0, -1);
  const rounded: Ring = open.map(([x, y]) => [round6(x), round6(y)]);
  const simplified = removeCollinearPoints(rounded, 1e-12);
  return closeRing(simplified);
}

function normalizePolygon(poly: Polygon): Polygon | null {
  const out: Polygon = [];
  for (const ring of poly) {
    const r = normalizeRing(ring);
    if (r) out.push(r);
  }
  return out.length > 0 ? out : null;
}

function normalizeMultiPolygon(mp: MultiPolygon): MultiPolygon | null {
  const out: MultiPolygon = [];
  for (const poly of mp) {
    const p = normalizePolygon(poly);
    if (p) out.push(p);
  }
  return out.length > 0 ? out : null;
}

function toMultiPolygon(geom?: { type?: string; coordinates?: unknown }): MultiPolygon | null {
  if (!geom || !geom.coordinates) return null;
  if (geom.type === 'Polygon') {
    const norm = normalizePolygon(geom.coordinates as Polygon);
    return norm ? [norm] : null;
  }
  if (geom.type === 'MultiPolygon') {
    return normalizeMultiPolygon(geom.coordinates as MultiPolygon);
  }
  return null;
}

function polyToGeoJSON(mp: MultiPolygon): turf.Feature<turf.Polygon | turf.MultiPolygon> {
  if (mp.length === 1) return turf.polygon(mp[0]);
  return turf.multiPolygon(mp);
}

function centroidOf(mp: MultiPolygon): Point {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const poly of mp) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          sx += x;
          sy += y;
          n++;
        }
      }
    }
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

function distanceSq(a: Point, b: Point): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function areaOf(mp: MultiPolygon): number {
  if (!mp || mp.length === 0) return 0;
  try {
    return turf.area(polyToGeoJSON(mp));
  } catch {
    return 0;
  }
}

function transformPolygonSVGToWGS84(mp: MultiPolygon, tps: TpsParams): MultiPolygon {
  const out: MultiPolygon = [];
  for (const poly of mp) {
    const rings: Polygon = [];
    for (const ring of poly) {
      const outRing: Ring = [];
      for (const [x, y] of ring) {
        const [lon, lat] = applyTps(x, y, tps);
        outRing.push([round6(lon), round6(lat)]);
      }
      const norm = normalizeRing(outRing);
      if (norm) rings.push(norm);
    }
    if (rings.length > 0) out.push(rings);
  }
  return out;
}

function simplifyForClip(mp: MultiPolygon): MultiPolygon {
  try {
    const simplified = turf.simplify(polyToGeoJSON(mp), { tolerance: 1e-6, highQuality: false, mutate: false });
    const norm = toMultiPolygon(simplified.geometry);
    return norm ?? mp;
  } catch {
    return mp;
  }
}

function unkinkMultiPolygon(mp: MultiPolygon): MultiPolygon {
  const out: MultiPolygon = [];
  for (const poly of mp) {
    try {
      const fc = turf.unkinkPolygon(turf.polygon(poly));
      for (const f of fc.features) {
        const p = toMultiPolygon(f.geometry);
        if (p) out.push(...p);
      }
    } catch {
      out.push(poly);
    }
  }
  return out.length > 0 ? out : mp;
}

function normalizeFromMartinez(res: unknown): MultiPolygon {
  if (!res) return [];
  return normalizeMultiPolygon(res as MultiPolygon) ?? [];
}

function normalizeFromJsts(res: unknown): MultiPolygon {
  if (!res) return [];
  return normalizeMultiPolygon(res as MultiPolygon) ?? [];
}

function jstsOp(
  op: 'intersection' | 'union' | 'difference',
  a: MultiPolygon,
  b: MultiPolygon,
  report: any,
  bucket: 'intersection_failures' | 'union_failures' | 'difference_failures'
): MultiPolygon {
  try {
    const reader = new GeoJSONReader();
    const writer = new GeoJSONWriter();
    const ga = reader.read(polyToGeoJSON(a).geometry as any);
    const gb = reader.read(polyToGeoJSON(b).geometry as any);
    const res = op === 'intersection' ? ga.intersection(gb) : op === 'union' ? ga.union(gb) : ga.difference(gb);
    const geo = writer.write(res);
    const mp = toMultiPolygon(geo as any);
    return normalizeFromJsts(mp) ?? [];
  } catch (err) {
    report[bucket].push(String(err));
    return [];
  }
}

function safeIntersect(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  if (a.length === 0 || b.length === 0) return [];
  try {
    const res = martinez.intersection(a, b);
    const norm = normalizeFromMartinez(res);
    if (norm.length > 0) return norm;
  } catch (err) {
    report.intersection_failures.push(String(err));
  }
  const jstsRes = jstsOp('intersection', a, b, report, 'intersection_failures');
  if (jstsRes.length > 0) return jstsRes;
  try {
    const fa = polyToGeoJSON(a);
    const fb = polyToGeoJSON(b);
    const fallback = turf.intersect(fa, fb) as turf.Feature<turf.Polygon | turf.MultiPolygon> | null;
    if (fallback?.geometry) {
      const mp = toMultiPolygon(fallback.geometry);
      if (mp) return mp;
    }
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('Must specify at least 2 geometries')) {
      report.intersection_failures.push(msg);
    }
  }
  try {
    const res = polygonClipping.intersection(a, b) as MultiPolygon;
    if (res && res.length > 0) return normalizeMultiPolygon(res) ?? [];
  } catch (err) {
    report.intersection_failures.push(String(err));
  }
  return [];
}

function safeUnion(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  try {
    const res = martinez.union(a, b);
    const norm = normalizeFromMartinez(res);
    if (norm.length > 0) return norm;
  } catch (err) {
    report.union_failures.push(String(err));
  }
  const jstsRes = jstsOp('union', a, b, report, 'union_failures');
  if (jstsRes.length > 0) return jstsRes;
  try {
    const fa = polyToGeoJSON(a);
    const fb = polyToGeoJSON(b);
    const fallback = turf.union(fa, fb) as turf.Feature<turf.Polygon | turf.MultiPolygon> | null;
    if (fallback?.geometry) {
      const mp = toMultiPolygon(fallback.geometry);
      if (mp) return mp;
    }
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('Must specify at least 2 geometries')) {
      report.union_failures.push(msg);
    }
  }
  try {
    const res = polygonClipping.union(a, b) as MultiPolygon;
    if (res && res.length > 0) return normalizeMultiPolygon(res) ?? [];
  } catch (err) {
    report.union_failures.push(String(err));
  }
  return a.length > 0 ? a : b;
}

function safeDifferenceNoOverlap(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  if (a.length === 0) return [];
  if (b.length === 0) return a;
  try {
    const res = martinez.diff(a, b);
    const norm = normalizeFromMartinez(res);
    if (norm.length > 0) return norm;
  } catch (err) {
    report.difference_failures.push(String(err));
  }
  const jstsRes = jstsOp('difference', a, b, report, 'difference_failures');
  if (jstsRes.length > 0) return jstsRes;
  try {
    const fa = polyToGeoJSON(a);
    const fb = polyToGeoJSON(b);
    const fallback = turf.difference(fa, fb) as turf.Feature<turf.Polygon | turf.MultiPolygon> | null;
    if (fallback?.geometry) {
      const mp = toMultiPolygon(fallback.geometry);
      if (mp) return mp;
    }
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('Must specify at least 2 geometries') && !msg.includes('Must have at least two features')) {
      report.difference_failures.push(msg);
    }
  }
  try {
    const res = polygonClipping.difference(a, b) as MultiPolygon;
    if (res && res.length > 0) return normalizeMultiPolygon(res) ?? [];
  } catch (err) {
    report.difference_failures.push(String(err));
  }
  return [];
}

function safeDifferenceKeep(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  if (a.length === 0) return [];
  if (b.length === 0) return a;
  try {
    const res = martinez.diff(a, b);
    const norm = normalizeFromMartinez(res);
    if (norm.length > 0) return norm;
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('Must specify at least 2 geometries') && !msg.includes('Must have at least two features')) {
      report.difference_failures.push(msg);
    }
  }
  const jstsRes = jstsOp('difference', a, b, report, 'difference_failures');
  if (jstsRes.length > 0) return jstsRes;
  try {
    const fa = polyToGeoJSON(a);
    const fb = polyToGeoJSON(b);
    const fallback = turf.difference(fa, fb) as turf.Feature<turf.Polygon | turf.MultiPolygon> | null;
    if (fallback?.geometry) {
      const mp = toMultiPolygon(fallback.geometry);
      if (mp) return mp;
    }
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('Must specify at least 2 geometries') && !msg.includes('Must have at least two features')) {
      report.difference_failures.push(msg);
    }
  }
  try {
    const res = polygonClipping.difference(a, b) as MultiPolygon;
    if (res && res.length > 0) return normalizeMultiPolygon(res) ?? [];
  } catch (err) {
    report.difference_failures.push(String(err));
  }
  return a;
}

function loadCensus(): Map<string, number[]> {
  if (!existsSync(CENSUS_PATH)) return new Map();
  const raw = JSON.parse(readFileSync(CENSUS_PATH, 'utf8')) as CensusData;
  const map = new Map<string, number[]>();
  for (const [id, entry] of Object.entries(raw.settlements ?? {})) {
    if (entry?.p && Array.isArray(entry.p)) {
      map.set(id, entry.p.map((v) => Number(v) || 0));
    }
  }
  return map;
}

function loadSettlementNames(): Map<string, string> {
  if (!existsSync(SETTLEMENT_NAMES_PATH)) return new Map();
  const raw = JSON.parse(readFileSync(SETTLEMENT_NAMES_PATH, 'utf8')) as {
    by_census_id?: Record<string, { name?: string }>;
  };
  const map = new Map<string, string>();
  for (const [id, row] of Object.entries(raw.by_census_id ?? {})) {
    if (row?.name) map.set(id, row.name);
  }
  return map;
}


function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) throw new Error(`Missing substrate. Checked: ${SUBSTRATE_DERIVED} and ${SUBSTRATE_DEPRECATED}`);
  if (!existsSync(SVG_TO_WORLD_PATH)) throw new Error(`Missing transform: ${SVG_TO_WORLD_PATH}`);
  if (!existsSync(ADM3_1990_PATH)) throw new Error(`Missing ADM3 1990: ${ADM3_1990_PATH}`);

  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as GeoJSONFC<SubstrateFeature>;
  const transform = JSON.parse(readFileSync(SVG_TO_WORLD_PATH, 'utf8')) as { coefficients: TpsParams };
  const tps = transform.coefficients;

  const adm3 = JSON.parse(readFileSync(ADM3_1990_PATH, 'utf8')) as GeoJSONFC<Adm3Feature>;
  const adm3ByMun1990 = new Map<string, { name: string; geom: MultiPolygon; bbox: number[]; feature: turf.Feature<turf.Polygon | turf.MultiPolygon> }>();
  for (const f of adm3.features) {
    const id = f.properties?.mun1990_id;
    const name = f.properties?.mun1990_name ?? '';
    const mp = toMultiPolygon(f.geometry);
    if (id && mp) {
      const bbox = turf.bbox(polyToGeoJSON(mp));
      adm3ByMun1990.set(id, { name, geom: mp, bbox, feature: polyToGeoJSON(mp) });
    }
  }

  const census = loadCensus();
  const names = loadSettlementNames();
  const mergePairs = loadMergePairs();

  const byMun1990 = new Map<string, SubstrateFeature[]>();
  const unassigned: Array<{ sid: string; census_id: string }> = [];
  const sortedFeatures = substrate.features.slice().sort((a, b) =>
    String(a.properties?.sid ?? '').localeCompare(String(b.properties?.sid ?? ''))
  );
  for (const f of sortedFeatures) {
    let mun1990 = f.properties?.mun1990_id;
    const municipalityId = String(f.properties?.municipality_id ?? '').trim();
    const overrideMun = MUNICIPALITY_ID_TO_MUN1990_OVERRIDE[municipalityId];
    if (overrideMun) mun1990 = overrideMun;
    const mpSvg = toMultiPolygon(f.geometry);
    const sid = f.properties?.sid ?? '';
    const censusId = f.properties?.census_id ?? '';

    if (mun1990) {
      mun1990 = MUN1990_NORMALIZE[mun1990] ?? mun1990;
      if (adm3ByMun1990.has(mun1990)) {
        if (NOVI_GRAD_PAIR.has(mun1990)) {
          const sname = String(f.properties?.settlement_name ?? '').toLowerCase();
          const mname = String(f.properties?.municipality_name ?? '').toLowerCase();
          if (sname.includes('sarajevo') || mname.includes('sarajevo')) {
            mun1990 = 'novi_grad_sarajevo';
          } else if (mpSvg) {
            const mpWorld = transformPolygonSVGToWGS84(mpSvg, tps);
            const c = centroidOf(mpWorld);
            const other = mun1990 === 'bosanski_novi' ? 'novi_grad_sarajevo' : 'bosanski_novi';
            const otherEntry = adm3ByMun1990.get(other);
            if (otherEntry && turf.booleanPointInPolygon(turf.point(c), otherEntry.feature)) {
              mun1990 = other;
            }
          }
        }
        const list = byMun1990.get(mun1990) ?? [];
        list.push({ ...f, properties: { ...f.properties, mun1990_id: mun1990 } });
        byMun1990.set(mun1990, list);
        continue;
      }
    }

    if (!mpSvg) {
      unassigned.push({ sid, census_id: censusId });
      continue;
    }
    const mpWorld = transformPolygonSVGToWGS84(mpSvg, tps);
    const c = centroidOf(mpWorld);
    let assigned: string | null = null;
    for (const [id, entry] of adm3ByMun1990.entries()) {
      if (turf.booleanPointInPolygon(turf.point(c), entry.feature)) {
        assigned = id;
        break;
      }
    }
    if (assigned) {
      const list = byMun1990.get(assigned) ?? [];
      list.push({ ...f, properties: { ...f.properties, mun1990_id: assigned } });
      byMun1990.set(assigned, list);
    } else {
      unassigned.push({ sid, census_id: censusId });
    }
  }

  const mun1990Ids = Array.from(adm3ByMun1990.keys()).sort((a, b) => a.localeCompare(b));
  const emptyMunis = mun1990Ids.filter((id) => (byMun1990.get(id) ?? []).length === 0);
  const salvagedList: Array<{ mun1990_id: string; sid: string; reason: string }> = [];
  for (const targetMun of emptyMunis) {
    const entry = adm3ByMun1990.get(targetMun);
    if (!entry) continue;
    const salvaged = sortedFeatures.filter((f) => {
      const mpSvg = toMultiPolygon(f.geometry);
      if (!mpSvg) return false;
      const mpWorld = transformPolygonSVGToWGS84(mpSvg, tps);
      const c = centroidOf(mpWorld);
      return turf.booleanPointInPolygon(turf.point(c), entry.feature);
    });
    for (const f of salvaged) {
      const fsid = f.properties?.sid ?? '';
      for (const [mun, list] of byMun1990.entries()) {
        const idx = list.findIndex((x) => (x.properties?.sid ?? '') === fsid);
        if (idx >= 0) {
          list.splice(idx, 1);
          break;
        }
      }
      const list = byMun1990.get(targetMun) ?? [];
      list.push({ ...f, properties: { ...f.properties, mun1990_id: targetMun } });
      byMun1990.set(targetMun, list);
      salvagedList.push({ mun1990_id: targetMun, sid: fsid, reason: 'centroid_in_polygon' });
    }
  }

  const outputFeatures: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
  }> = [];

  const report = {
    totals: {
      municipalities: 0,
      settlements_input: substrate.features.length,
      settlements_emitted: 0,
      settlements_merged: 0,
      missing_geometry: 0,
      leftover_patches: 0
    },
    intersection_failures: [] as string[],
    union_failures: [] as string[],
    difference_failures: [] as string[],
    unassigned_settlements: [] as Array<{ sid: string; census_id: string }>,
    missing_municipalities: [] as string[],
    merged_settlements: [] as Array<{ from: string; into: string }>,
    muni_without_settlements: [] as string[],
    salvaged_municipalities: salvagedList,
    coverage_diagnostics: [] as Array<{
      mun1990_id: string;
      adm3_area: number;
      union_area: number;
      sum_cell_area: number;
      gap_area: number;
      overlap_area: number;
    }>
  };
  report.unassigned_settlements = unassigned.slice();

  report.totals.municipalities = mun1990Ids.length;

  for (let idx = 0; idx < mun1990Ids.length; idx++) {
    const mun1990Id = mun1990Ids[idx];
    if (idx % 5 === 0) {
      process.stdout.write(`Processing mun1990 ${idx + 1}/${mun1990Ids.length} (${mun1990Id})...\n`);
    }
    const adm3Entry = adm3ByMun1990.get(mun1990Id);
    if (!adm3Entry) {
      report.missing_municipalities.push(mun1990Id);
      continue;
    }

    const muniSettlements = (byMun1990.get(mun1990Id) ?? []).slice();
    if (muniSettlements.length === 0) {
      report.muni_without_settlements.push(mun1990Id);
      continue;
    }

    const adm3Poly = adm3Entry.geom;
    const bbox = adm3Entry.bbox as [number, number, number, number];

    const seedPoints: Array<turf.Feature<turf.Point>> = [];
    const settlementMeta = new Map<string, { censusId: string; name: string }>();
    const mergedInto = new Map<string, string>();
    for (const [fromSid, intoSid] of Object.entries(mergePairs)) {
      mergedInto.set(fromSid, intoSid);
    }

    for (const f of muniSettlements) {
      const sid = f.properties?.sid ?? '';
      const censusId = f.properties?.census_id ?? '';
      if (mergePairs[sid]) {
        settlementMeta.set(sid, { censusId, name: names.get(censusId) ?? f.properties?.settlement_name ?? sid });
        continue; // Skip "from" as separate seed; census merged into target
      }
      const settlementName = names.get(censusId) ?? f.properties?.settlement_name ?? '';
      const mpSvg = toMultiPolygon(f.geometry);
      if (!mpSvg) {
        report.totals.missing_geometry += 1;
        continue;
      }
      const mpWorld = transformPolygonSVGToWGS84(mpSvg, tps);
      if (isNaN(mpWorld[0]?.[0]?.[0]?.[0] ?? NaN)) {
        report.totals.missing_geometry += 1;
        continue;
      }
      if (sid) settlementMeta.set(sid, { censusId, name: settlementName });
      const centroid = SEED_OVERRIDE_WGS84[sid] ?? centroidOf(mpWorld);
      seedPoints.push(turf.point(centroid, { sid }));

      // Use centroid only to keep Voronoi stable and deterministic
    }

    if (seedPoints.length === 0) {
      report.muni_without_settlements.push(mun1990Id);
      continue;
    }

    // Deduplicate identical seed points: jitter duplicates instead of merging (preserves distinct settlements)
    const sortedSeeds = seedPoints
      .filter((p) => Number.isFinite(p.geometry.coordinates[0]) && Number.isFinite(p.geometry.coordinates[1]))
      .sort((a, b) => {
        const sa = String(a.properties?.sid ?? '');
        const sb = String(b.properties?.sid ?? '');
        if (sa !== sb) return sa.localeCompare(sb);
        const ax = a.geometry.coordinates[0];
        const bx = b.geometry.coordinates[0];
        if (ax !== bx) return ax - bx;
        return a.geometry.coordinates[1] - b.geometry.coordinates[1];
      });

    const dedupedSeeds: Array<turf.Feature<turf.Point>> = [];
    const seenCount = new Map<string, number>();
    const JITTER_SCALE = 1e-4;
    for (const p of sortedSeeds) {
      const sid = String(p.properties?.sid ?? '');
      const key = `${p.geometry.coordinates[0]},${p.geometry.coordinates[1]}`;
      const count = seenCount.get(key) ?? 0;
      seenCount.set(key, count + 1);
      if (count > 0) {
        const offset = count * JITTER_SCALE;
        const jittered = turf.point(
          [p.geometry.coordinates[0] + offset * 0.7, p.geometry.coordinates[1] + offset * 0.3],
          { sid: p.properties?.sid }
        );
        dedupedSeeds.push(jittered);
      } else {
        dedupedSeeds.push(p);
      }
    }

    const uniqueSids = Array.from(new Set(dedupedSeeds.map((p) => p.properties?.sid))).filter(Boolean) as string[];
    if (uniqueSids.length === 1) {
      const onlySid = uniqueSids[0];
      const meta = settlementMeta.get(onlySid);
      const censusIds: string[] = [];
      if (meta?.censusId) censusIds.push(meta.censusId);
      for (const m of settlementMeta.values()) {
        if (m.censusId && !censusIds.includes(m.censusId)) censusIds.push(m.censusId);
      }
      const censusSums = [0, 0, 0, 0, 0];
      for (const cid of censusIds) {
        const arr = census.get(cid) ?? [];
        for (let i = 0; i < censusSums.length; i++) {
          censusSums[i] += Number(arr[i] ?? 0);
        }
      }
      const geom = adm3Poly.length === 1 ? { type: 'Polygon', coordinates: adm3Poly[0] } : { type: 'MultiPolygon', coordinates: adm3Poly };
      outputFeatures.push({
        type: 'Feature',
        properties: {
          sid: onlySid,
          census_ids: censusIds,
          settlement_name: meta?.name || onlySid,
          mun1990_id: mun1990Id,
          mun1990_name: adm3Entry.name,
          population_total: censusSums[0] ?? 0,
          population_bosniaks: censusSums[1] ?? 0,
          population_croats: censusSums[2] ?? 0,
          population_serbs: censusSums[3] ?? 0,
          population_others: censusSums[4] ?? 0
        },
        geometry: geom
      });
      continue;
    }

    const pointsFC = turf.featureCollection(dedupedSeeds);
    const voronoi = turf.voronoi(pointsFC, { bbox });
    if (!voronoi || !voronoi.features) {
      report.muni_without_settlements.push(mun1990Id);
      continue;
    }

    // Collect voronoi cells (raw, may overlap due to failures)
    const rawCells: Array<{ sid: string; mp: MultiPolygon; area: number; cx: number; cy: number }> = [];
    for (let i = 0; i < voronoi.features.length; i++) {
      const cell = voronoi.features[i];
      if (!cell?.geometry) continue;
      const sid = dedupedSeeds[i]?.properties?.sid;
      if (!sid) continue;
      const cellMp = toMultiPolygon(cell.geometry as any);
      if (!cellMp) continue;
      const prepared = simplifyForClip(unkinkMultiPolygon(cellMp));
      const clipped = safeIntersect(prepared, adm3Poly, report);
      if (clipped.length === 0) continue;
      const fixed = unkinkMultiPolygon(clipped);
      if (fixed.length === 0) continue;
      const c = centroidOf(fixed);
      rawCells.push({ sid, mp: fixed, area: areaOf(fixed), cx: c[0], cy: c[1] });
    }

    // Allocate cells in stable order to avoid overlaps
    rawCells.sort((a, b) => {
      if (a.sid !== b.sid) return a.sid.localeCompare(b.sid);
      if (a.area !== b.area) return b.area - a.area;
      if (a.cx !== b.cx) return a.cx - b.cx;
      return a.cy - b.cy;
    });

    const cellsBySid = new Map<string, MultiPolygon>();
    const allocatedMasks: MultiPolygon[] = [];
    for (const cell of rawCells) {
      let assigned = cell.mp;
      for (const mask of allocatedMasks) {
        if (assigned.length === 0) break;
        assigned = safeDifferenceNoOverlap(assigned, mask, report);
      }
      if (assigned.length === 0) continue;
      const existing = cellsBySid.get(cell.sid);
      cellsBySid.set(cell.sid, existing ? existing.concat(assigned) : assigned);
      allocatedMasks.push(assigned);
    }

    // Merge missing settlements into nearest existing (allowed by scope)
    const centroidsBySidForMerge = new Map<string, Point>();
    for (const [sid, mp] of cellsBySid.entries()) {
      centroidsBySidForMerge.set(sid, centroidOf(mp));
    }
    for (const sid of settlementMeta.keys()) {
      if (cellsBySid.has(sid)) continue;
      if (mergedInto.has(sid)) continue; // Already set by mergePairs (split municipality audit)
      if (centroidsBySidForMerge.size === 0) continue;
      const srcCentroid = (() => {
        const seed = seedPoints.find((p) => p.properties?.sid === sid);
        return seed ? (seed.geometry.coordinates as Point) : Array.from(centroidsBySidForMerge.values())[0];
      })();

      let bestSid = Array.from(centroidsBySidForMerge.keys()).sort()[0];
      let bestDist = Number.POSITIVE_INFINITY;
      for (const [candSid, c] of centroidsBySidForMerge.entries()) {
        const d = distanceSq(srcCentroid, c);
        if (d < bestDist || (d === bestDist && candSid.localeCompare(bestSid) < 0)) {
          bestSid = candSid;
          bestDist = d;
        }
      }
      mergedInto.set(sid, bestSid);
      report.merged_settlements.push({ from: sid, into: bestSid });
      report.totals.settlements_merged += 1;
    }

    let remaining: MultiPolygon = adm3Poly;
    for (const mask of allocatedMasks) {
      if (remaining.length === 0) break;
      remaining = safeDifferenceNoOverlap(remaining, mask, report);
    }
    const leftoverNorm = normalizeMultiPolygon(remaining) ?? [];
    if (leftoverNorm.length > 0 && cellsBySid.size > 0) {
      report.totals.leftover_patches += leftoverNorm.length;
      // Assign leftover patches to nearest sid by centroid (stable order)
      const centroidsBySid = new Map<string, Point>();
      for (const [sid, mp] of cellsBySid.entries()) {
        centroidsBySid.set(sid, centroidOf(mp));
      }
      const sortedPatches = leftoverNorm
        .map((poly) => {
          const c = centroidOf([poly]);
          return { poly, cx: c[0], cy: c[1] };
        })
        .sort((a, b) => (a.cx !== b.cx ? a.cx - b.cx : a.cy - b.cy));
      for (const patchEntry of sortedPatches) {
        const patch = patchEntry.poly;
        const c: Point = [patchEntry.cx, patchEntry.cy];
        let bestSid = Array.from(centroidsBySid.keys()).sort()[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const [sid, cent] of centroidsBySid.entries()) {
          const d = distanceSq(c, cent);
          if (d < bestDist || (d === bestDist && sid.localeCompare(bestSid) < 0)) {
            bestSid = sid;
            bestDist = d;
          }
        }
        const existing = cellsBySid.get(bestSid);
        if (existing) {
          const clippedPatch = safeDifferenceNoOverlap([patch], existing, report);
          if (clippedPatch.length > 0) {
            const fixedPatch = unkinkMultiPolygon(clippedPatch);
            if (fixedPatch.length > 0) {
              cellsBySid.set(bestSid, existing.concat(fixedPatch));
            }
          }
        }
      }
    }

    // Coverage/overlap diagnostics after leftover assignment
    const sortedAfter = Array.from(cellsBySid.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let sumArea = 0;
    for (const [, mp] of sortedAfter) {
      sumArea += areaOf(mp);
    }
    const adm3Area = areaOf(adm3Poly);
    let gapArea = Math.max(0, adm3Area - sumArea);
    let overlapArea = Math.max(0, sumArea - adm3Area);
    let assignedArea = Math.min(adm3Area, sumArea);

    // Salvage: if diagnostics show no subtraction but we have cells, collapse to adm3 polygon
    if (assignedArea === 0 && sumArea > 0 && cellsBySid.size > 0) {
      let bestSid = '';
      let bestArea = -1;
      for (const [sid, mp] of cellsBySid.entries()) {
        const a = areaOf(mp);
        if (a > bestArea || (a === bestArea && sid.localeCompare(bestSid) < 0)) {
          bestArea = a;
          bestSid = sid;
        }
      }
      if (bestSid) {
        cellsBySid.clear();
        cellsBySid.set(bestSid, adm3Poly);
        report.salvaged_municipalities.push({
          mun1990_id: mun1990Id,
          sid: bestSid,
          reason: 'difference_failed_in_diagnostics'
        });
        sumArea = adm3Area;
        assignedArea = adm3Area;
        gapArea = 0;
        overlapArea = 0;
      }
    }

    report.coverage_diagnostics.push({
      mun1990_id: mun1990Id,
      adm3_area: round6(adm3Area),
      union_area: round6(assignedArea),
      sum_cell_area: round6(sumArea),
      gap_area: round6(gapArea),
      overlap_area: round6(overlapArea)
    });

    // Emit per-sid features
    for (const [sid, mp] of sortedAfter) {
      const meta = settlementMeta.get(sid);
      const censusIds = meta?.censusId ? [meta.censusId] : [];
      for (const [from, into] of mergedInto.entries()) {
        if (into === sid) {
          const m = settlementMeta.get(from);
          if (m?.censusId) censusIds.push(m.censusId);
        }
      }
      let displayName = meta?.name || sid;
      if (mun1990Id === 'novi_grad_sarajevo' && censusIds.length > 0) {
        for (const preferred of PREFERRED_NOVI_GRAD_SARAJEVO_CENSUS_IDS) {
          if (censusIds.includes(preferred)) {
            const preferredName = names.get(preferred);
            if (preferredName) {
              displayName = preferredName;
              break;
            }
          }
        }
      }
      const censusSums = [0, 0, 0, 0, 0];
      for (const cid of censusIds) {
        const arr = census.get(cid) ?? [];
        for (let i = 0; i < censusSums.length; i++) {
          censusSums[i] += Number(arr[i] ?? 0);
        }
      }
      const geom = mp.length === 1 ? { type: 'Polygon', coordinates: mp[0] } : { type: 'MultiPolygon', coordinates: mp };
      outputFeatures.push({
        type: 'Feature',
        properties: {
          sid,
          census_ids: censusIds,
          settlement_name: displayName,
          mun1990_id: mun1990Id,
          mun1990_name: adm3Entry.name,
          population_total: censusSums[0] ?? 0,
          population_bosniaks: censusSums[1] ?? 0,
          population_croats: censusSums[2] ?? 0,
          population_serbs: censusSums[3] ?? 0,
          population_others: censusSums[4] ?? 0
        },
        geometry: geom
      });
    }
  }

  // Stable output ordering
  outputFeatures.sort((a, b) => {
    const ma = String(a.properties.mun1990_id);
    const mb = String(b.properties.mun1990_id);
    if (ma !== mb) return ma.localeCompare(mb);
    return String(a.properties.sid).localeCompare(String(b.properties.sid));
  });

  const bbox = computeBboxFromFeatures(outputFeatures);
  const metaBase = {
    role: 'settlement_wgs84_tessellation',
    version: '0.1.0',
    schema: 'awwv://schemas/settlements_wgs84_1990_v1.json',
    schema_version: '0.1.0',
    coordinate_space: 'WGS84',
    bbox_world: bbox,
    id_field: 'sid',
    record_count: outputFeatures.length,
    checksum_sha256: ''
  };

  const contentOnly = {
    type: 'FeatureCollection',
    awwv_meta: { ...metaBase },
    features: outputFeatures
  };
  const contentJson = JSON.stringify(contentOnly, null, 2);
  const checksum = computeSha256Hex(Buffer.from(contentJson, 'utf8'));

  const out = {
    type: 'FeatureCollection',
    awwv_meta: { ...metaBase, checksum_sha256: checksum },
    features: outputFeatures
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  report.totals.settlements_emitted = outputFeatures.length;
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH} (${outputFeatures.length} features)\n`);
}

main();
