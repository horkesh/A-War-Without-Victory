/**
 * Build new WGS84 settlement polygons that tessellate within bih_adm3_1990.geojson.
 *
 * Inputs:
 *  - data/derived/settlements_substrate.geojson (SVG pixel space)
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
const SUBSTRATE_PATH = resolve(ROOT, 'data/derived/settlements_substrate.geojson');
const SVG_TO_WORLD_PATH = resolve(ROOT, 'data/derived/georef/svg_to_world_transform.json');
const ADM3_1990_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const CENSUS_PATH = resolve(ROOT, 'data/source/bih_census_1991.json');
const SETTLEMENT_NAMES_PATH = resolve(ROOT, 'data/derived/settlement_names.json');

const OUTPUT_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990.geojson');
const REPORT_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990_report.json');

const PRECISION = 6;

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
  const reclosed = closeRing(simplified);
  return reclosed;
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

function areaOf(mp: MultiPolygon): number {
  return turf.area(polyToGeoJSON(mp));
}

function centroidOf(mp: MultiPolygon): Point {
  const c = turf.centroid(polyToGeoJSON(mp));
  const [x, y] = c.geometry.coordinates;
  return [x, y];
}

function distanceSq(a: Point, b: Point): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
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

function safeIntersect(a: MultiPolygon, b: MultiPolygon, sid: string, mun1990Id: string, report: any): MultiPolygon {
  try {
    const res = polygonClipping.intersection(a, b) as MultiPolygon;
    return res ?? [];
  } catch (err) {
    report.intersection_failures.push({ sid, mun1990_id: mun1990Id, error: String(err) });
    return [];
  }
}

function safeUnion(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  try {
    const res = polygonClipping.union(a, b) as MultiPolygon;
    return res ?? [];
  } catch (err) {
    report.union_failures.push(String(err));
    return a.length > 0 ? a : b;
  }
}

function safeDifference(a: MultiPolygon, b: MultiPolygon, report: any): MultiPolygon {
  try {
    const res = polygonClipping.difference(a, b) as MultiPolygon;
    return res ?? [];
  } catch (err) {
    report.difference_failures.push(String(err));
    return a;
  }
}

function isEmpty(mp: MultiPolygon | null): boolean {
  return !mp || mp.length === 0;
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
  if (!existsSync(SUBSTRATE_PATH)) throw new Error(`Missing substrate: ${SUBSTRATE_PATH}`);
  if (!existsSync(SVG_TO_WORLD_PATH)) throw new Error(`Missing transform: ${SVG_TO_WORLD_PATH}`);
  if (!existsSync(ADM3_1990_PATH)) throw new Error(`Missing ADM3 1990: ${ADM3_1990_PATH}`);

  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as GeoJSONFC<SubstrateFeature>;
  const transform = JSON.parse(readFileSync(SVG_TO_WORLD_PATH, 'utf8')) as { coefficients: TpsParams };
  const tps = transform.coefficients;

  const adm3 = JSON.parse(readFileSync(ADM3_1990_PATH, 'utf8')) as GeoJSONFC<Adm3Feature>;
  const adm3ByMun1990 = new Map<string, { name: string; geom: MultiPolygon }>();
  for (const f of adm3.features) {
    const id = f.properties?.mun1990_id;
    const name = f.properties?.mun1990_name ?? '';
    const mp = toMultiPolygon(f.geometry);
    if (id && mp) adm3ByMun1990.set(id, { name, geom: mp });
  }

  const census = loadCensus();
  const names = loadSettlementNames();

  const byMun1990 = new Map<string, SubstrateFeature[]>();
  for (const f of substrate.features) {
    const mun1990 = f.properties?.mun1990_id;
    if (!mun1990) continue;
    const list = byMun1990.get(mun1990) ?? [];
    list.push(f);
    byMun1990.set(mun1990, list);
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
    intersection_failures: [] as Array<{ sid: string; mun1990_id: string; error: string }>,
    union_failures: [] as string[],
    difference_failures: [] as string[],
    missing_municipalities: [] as string[],
    merged_settlements: [] as Array<{ from: string; into: string }>,
    muni_without_settlements: [] as string[]
  };

  const mun1990Ids = Array.from(adm3ByMun1990.keys()).sort((a, b) => a.localeCompare(b));
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

    const transformed = muniSettlements.map((f) => {
      const sid = f.properties?.sid ?? '';
      const censusId = f.properties?.census_id ?? '';
      const mpSvg = toMultiPolygon(f.geometry);
      const mpWorld = mpSvg ? transformPolygonSVGToWGS84(mpSvg, tps) : null;
      const clipped = mpWorld ? safeIntersect(mpWorld, adm3Poly, sid, mun1990Id, report) : null;
      const clippedNorm = clipped ? normalizeMultiPolygon(clipped) : null;
      const area = clippedNorm && !isEmpty(clippedNorm) ? areaOf(clippedNorm) : 0;
      return {
        sid,
        censusId,
        settlementName: names.get(censusId) ?? f.properties?.settlement_name ?? '',
        mp: clippedNorm,
        area
      };
    });

    // Sort: area desc, sid asc for determinism
    transformed.sort((a, b) => {
      if (b.area !== a.area) return b.area - a.area;
      return String(a.sid).localeCompare(String(b.sid));
    });

    const accepted: Array<{ sid: string; censusIds: string[]; name: string; geom: MultiPolygon; centroid: Point }> = [];
    const pendingMerge: Array<{ sid: string; censusId: string; name: string; centroid: Point | null }> = [];
    let unionGeom: MultiPolygon | null = null;

    for (const s of transformed) {
      if (!s.mp || isEmpty(s.mp)) {
        report.totals.missing_geometry += 1;
        if (s.censusId) {
          pendingMerge.push({ sid: s.sid, censusId: s.censusId, name: s.settlementName, centroid: null });
        }
        continue;
      }

      let remaining = s.mp;
      if (unionGeom && !isEmpty(unionGeom)) {
        remaining = safeDifference(remaining, unionGeom, report);
        remaining = normalizeMultiPolygon(remaining) ?? [];
      }

      if (!remaining || isEmpty(remaining)) {
        if (s.censusId) {
          pendingMerge.push({ sid: s.sid, censusId: s.censusId, name: s.settlementName, centroid: centroidOf(s.mp) });
        }
        continue;
      }

      const centroid = centroidOf(remaining);
      accepted.push({ sid: s.sid, censusIds: [s.censusId], name: s.settlementName, geom: remaining, centroid });
      unionGeom = unionGeom ? safeUnion(unionGeom, remaining, report) : remaining;
    }

    // If all geometry failed, emit a single merged polygon covering ADM3
    if (accepted.length === 0) {
      const censusIds = pendingMerge.map((p) => p.censusId).filter((c) => c);
      const censusSums = [0, 0, 0, 0, 0];
      for (const cid of censusIds) {
        const arr = census.get(cid) ?? [];
        for (let i = 0; i < censusSums.length; i++) {
          censusSums[i] += Number(arr[i] ?? 0);
        }
      }
      const syntheticSid = `MUN_${mun1990Id}_MERGED`;
      const geom = adm3Poly.length === 1 ? { type: 'Polygon', coordinates: adm3Poly[0] } : { type: 'MultiPolygon', coordinates: adm3Poly };
      outputFeatures.push({
        type: 'Feature',
        properties: {
          sid: syntheticSid,
          census_ids: censusIds.sort(),
          settlement_name: `${adm3Entry.name || mun1990Id} (merged)`,
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

    // Assign pending merges to nearest accepted settlement
    for (const p of pendingMerge) {
      if (accepted.length === 0) continue;
      let best = accepted[0];
      let bestDist = Number.POSITIVE_INFINITY;
      const pCentroid = p.centroid ?? best.centroid;
      for (const a of accepted) {
        const d = distanceSq(pCentroid, a.centroid);
        if (d < bestDist || (d === bestDist && String(a.sid).localeCompare(String(best.sid)) < 0)) {
          best = a;
          bestDist = d;
        }
      }
      best.censusIds.push(p.censusId);
      report.merged_settlements.push({ from: p.sid, into: best.sid });
      report.totals.settlements_merged += 1;
    }

    // Fill leftover gaps
    if (!unionGeom) unionGeom = [];
    const leftover = safeDifference(adm3Poly, unionGeom, report);
    const leftoverNorm = normalizeMultiPolygon(leftover) ?? [];
    if (!isEmpty(leftoverNorm) && accepted.length > 0) {
      report.totals.leftover_patches += leftoverNorm.length;
      for (const patch of leftoverNorm) {
        const centroid = centroidOf([patch]);
        let best = accepted[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const a of accepted) {
          const d = distanceSq(centroid, a.centroid);
          if (d < bestDist || (d === bestDist && String(a.sid).localeCompare(String(best.sid)) < 0)) {
            best = a;
            bestDist = d;
          }
        }
        best.geom = safeUnion(best.geom, [patch], report);
        best.geom = normalizeMultiPolygon(best.geom) ?? best.geom;
      }
    }

    // Emit features
    for (const a of accepted) {
      const censusSums = [0, 0, 0, 0, 0];
      for (const cid of a.censusIds) {
        const arr = census.get(cid) ?? [];
        for (let i = 0; i < censusSums.length; i++) {
          censusSums[i] += Number(arr[i] ?? 0);
        }
      }

      const props = {
        sid: a.sid,
        census_ids: a.censusIds.slice().sort(),
        settlement_name: a.name || a.sid,
        mun1990_id: mun1990Id,
        mun1990_name: adm3Entry.name,
        population_total: censusSums[0] ?? 0,
        population_bosniaks: censusSums[1] ?? 0,
        population_croats: censusSums[2] ?? 0,
        population_serbs: censusSums[3] ?? 0,
        population_others: censusSums[4] ?? 0
      };

      const geom = a.geom.length === 1 ? { type: 'Polygon', coordinates: a.geom[0] } : { type: 'MultiPolygon', coordinates: a.geom };
      outputFeatures.push({ type: 'Feature', properties: props, geometry: geom });
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
