/**
 * Phase H6.10.3 — Audit NW municipality geography via adjacency, centroid, name sampling
 *
 * PURPOSE:
 *   Prove whether NW "wrong places" is (A) code↔geometry swap, (B) substrate geometry
 *   defect, or (C) viewer confusion, using adjacency + centroid + name sampling.
 *
 * INPUTS (required):
 *   - data/derived/settlements_substrate.geojson
 *   - data/derived/settlement_names.json
 *   - data/source/bih_census_1991.json
 *
 * INPUT (optional; use if present):
 *   - 1) data/derived/settlement_contact_graph.json
 *   - 2) data/derived/data_index.json meta.graph_path or continuity_graph_path (resolve relative to data/derived)
 *   If none exist, report "adjacency unavailable".
 *
 * OUTPUTS (untracked):
 *   - data/derived/_debug/nw_muni_geography_audit_h6_10_3.txt
 *   - data/derived/_debug/nw_muni_geography_audit_h6_10_3.json
 *   - data/derived/_debug/nw_muni_bboxes_overlay_h6_10_3.geojson
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_3_audit_nw_municipality_geography.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const SETTLEMENT_NAMES_PATH = resolve(DERIVED, 'settlement_names.json');
const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const CONTACT_GRAPH_PATH = resolve(DERIVED, 'settlement_contact_graph.json');
const DATA_INDEX_PATH = resolve(DERIVED, 'data_index.json');

const TARGET_CODES = ['10049', '10227', '11240'] as const;
const WESTMOST_N = 15;
const NORTHMOST_N = 15;
const SAMPLE_NAMES_N = 10;
const TOP_NEIGHBORS_N = 15;
const BBOX_OVERLAY_WESTMOST_N = 10;

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface SubstrateFeature {
  type: 'Feature';
  properties: {
    sid?: string;
    census_id?: string;
    municipality_id?: string;
    [key: string]: unknown;
  };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: SubstrateFeature[];
}

interface SettlementNamesData {
  by_census_id?: Record<string, { name?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface CensusMunicipality {
  n?: string;
  s?: string[];
  [key: string]: unknown;
}

interface CensusData {
  municipalities?: Record<string, CensusMunicipality>;
  [key: string]: unknown;
}

interface GraphEdge {
  a: string;
  b: string;
  type?: string;
  [key: string]: unknown;
}

interface ContactGraph {
  edges?: GraphEdge[];
  [key: string]: unknown;
}

function bboxFromCoords(coords: Polygon | MultiPolygon): { minx: number; miny: number; maxx: number; maxy: number } {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const processRing = (ring: Ring) => {
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const [x, y] = pt;
      if (!isFinite(x) || !isFinite(y)) continue;
      minx = Math.min(minx, x); miny = Math.min(miny, y);
      maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
    }
  };
  const d00 = coords[0] && (coords[0] as Ring[])[0];
  const isMulti = d00 && Array.isArray((d00 as Ring)[0]);
  if (isMulti) {
    for (const poly of coords as MultiPolygon)
      for (const ring of poly) processRing(ring);
  } else {
    for (const ring of coords as Polygon) processRing(ring);
  }
  if (!isFinite(minx)) return { minx: 0, miny: 0, maxx: 0, maxy: 0 };
  return { minx, miny, maxx, maxy };
}

function signedRingArea(ring: Ring): number {
  let area = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return area / 2;
}

function ringCentroid(ring: Ring): [number, number] | null {
  if (ring.length < 3) return null;
  let cx = 0, cy = 0, area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    cx += (ring[i][0] + ring[j][0]) * a;
    cy += (ring[i][1] + ring[j][1]) * a;
    area += a;
  }
  if (Math.abs(area) < 1e-20) return null;
  return [cx / (3 * area), cy / (3 * area)];
}

function featureAreaAndCentroid(geom: { type: string; coordinates: Polygon | MultiPolygon }): { area: number; centroid: [number, number] } | null {
  const coords = geom.coordinates;
  if (!coords) return null;
  const d00 = coords[0] && (coords[0] as Ring[])[0];
  const isMulti = d00 && Array.isArray((d00 as Ring)[0]);
  let totalArea = 0;
  let sumCx = 0, sumCy = 0;
  const rings: Ring[] = isMulti
    ? (coords as MultiPolygon).flatMap(p => (p && p[0] ? [p[0]] : []))
    : (coords as Polygon)[0] ? [(coords as Polygon)[0]] : [];
  for (const ring of rings) {
    if (!ring || ring.length < 3) continue;
    const a = Math.abs(signedRingArea(ring));
    const c = ringCentroid(ring);
    if (c && a > 0) {
      totalArea += a;
      sumCx += a * c[0];
      sumCy += a * c[1];
    }
  }
  if (totalArea <= 0) return null;
  return { area: totalArea, centroid: [sumCx / totalArea, sumCy / totalArea] };
}

function bboxCenter(bbox: { minx: number; miny: number; maxx: number; maxy: number }): [number, number] {
  return [(bbox.minx + bbox.maxx) / 2, (bbox.miny + bbox.maxy) / 2];
}

function bboxToPolygon(bbox: { minx: number; miny: number; maxx: number; maxy: number }): number[][] {
  return [
    [bbox.minx, bbox.miny],
    [bbox.maxx, bbox.miny],
    [bbox.maxx, bbox.maxy],
    [bbox.minx, bbox.maxy],
    [bbox.minx, bbox.miny],
  ];
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing input:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(SETTLEMENT_NAMES_PATH)) {
    console.error('Missing input:', SETTLEMENT_NAMES_PATH);
    process.exit(1);
  }
  if (!existsSync(CENSUS_PATH)) {
    console.error('Missing input:', CENSUS_PATH);
    process.exit(1);
  }

  mkdirSync(DEBUG_DIR, { recursive: true });

  const substrateBytes = readFileSync(SUBSTRATE_PATH);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  const features = substrate.features || [];

  const namesBytes = readFileSync(SETTLEMENT_NAMES_PATH);
  const namesSha = computeSha256Hex(namesBytes);
  const settlementNames = JSON.parse(namesBytes.toString('utf8')) as SettlementNamesData;
  const byCensusId = settlementNames.by_census_id || {};

  const censusBytes = readFileSync(CENSUS_PATH);
  const censusSha = computeSha256Hex(censusBytes);
  const census = JSON.parse(censusBytes.toString('utf8')) as CensusData;
  const municipalities = census.municipalities || {};

  let graphPath: string | null = null;
  let graphContent: string = '';
  let graphSha: string = '';
  if (existsSync(CONTACT_GRAPH_PATH)) {
    graphPath = 'settlement_contact_graph.json';
    graphContent = readFileSync(CONTACT_GRAPH_PATH, 'utf8');
    graphSha = computeSha256Hex(Buffer.from(graphContent, 'utf8'));
  } else if (existsSync(DATA_INDEX_PATH)) {
    const dataIndex = JSON.parse(readFileSync(DATA_INDEX_PATH, 'utf8')) as Record<string, unknown>;
    const graphRel = (dataIndex.continuity_graph_path as string) || (dataIndex.meta as Record<string, unknown>)?.graph_path as string;
    if (graphRel) {
      const absPath = resolve(DERIVED, graphRel);
      if (existsSync(absPath)) {
        graphPath = graphRel;
        graphContent = readFileSync(absPath, 'utf8');
        graphSha = computeSha256Hex(Buffer.from(graphContent, 'utf8'));
      }
    }
  }

  const graph: ContactGraph | null = graphPath ? (JSON.parse(graphContent) as ContactGraph) : null;
  const edges = graph?.edges || [];

  const globalBbox = computeBboxFromFeatures(features);

  type MunBucket = {
    feature_count: number;
    bbox: { minx: number; miny: number; maxx: number; maxy: number };
    centroid: [number, number];
    census_ids: string[];
    sample_names: string[];
  };

  const buckets = new Map<string, MunBucket>();
  const sidToMunicipality = new Map<string, string>();

  for (const f of features) {
    const mid = f.properties.municipality_id != null ? String(f.properties.municipality_id) : '';
    if (!mid) continue;
    const sid = f.properties.sid != null ? String(f.properties.sid) : '';
    const censusId = f.properties.census_id != null ? String(f.properties.census_id) : '';
    if (sid) sidToMunicipality.set(sid, mid);

    let bucket = buckets.get(mid);
    if (!bucket) {
      bucket = {
        feature_count: 0,
        bbox: { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity },
        centroid: [0, 0],
        census_ids: [],
        sample_names: [],
      };
      buckets.set(mid, bucket);
    }
    bucket.feature_count++;
    const bbox = bboxFromCoords(f.geometry.coordinates);
    bucket.bbox.minx = Math.min(bucket.bbox.minx, bbox.minx);
    bucket.bbox.miny = Math.min(bucket.bbox.miny, bbox.miny);
    bucket.bbox.maxx = Math.max(bucket.bbox.maxx, bbox.maxx);
    bucket.bbox.maxy = Math.max(bucket.bbox.maxy, bbox.maxy);
    if (censusId) bucket.census_ids.push(censusId);
  }

  for (const [mid, bucket] of buckets) {
    let totalArea = 0;
    for (const f of features) {
      const m = f.properties.municipality_id != null ? String(f.properties.municipality_id) : '';
      if (m !== mid) continue;
      const ac = featureAreaAndCentroid(f.geometry);
      if (ac) totalArea += ac.area;
    }
    if (totalArea > 0) {
      let cx = 0, cy = 0;
      for (const f of features) {
        const m = f.properties.municipality_id != null ? String(f.properties.municipality_id) : '';
        if (m !== mid) continue;
        const ac = featureAreaAndCentroid(f.geometry);
        if (ac) {
          cx += ac.area * ac.centroid[0];
          cy += ac.area * ac.centroid[1];
        }
      }
      bucket.centroid = [cx / totalArea, cy / totalArea];
    } else {
      bucket.centroid = bboxCenter(bucket.bbox);
    }
    const sortedIds = [...new Set(bucket.census_ids)].sort((a, b) => a.localeCompare(b));
    bucket.sample_names = sortedIds.slice(0, SAMPLE_NAMES_N).map(cid => {
      const entry = byCensusId[cid];
      return (entry && entry.name != null ? String(entry.name) : cid);
    });
  }

  const adjacency = new Map<string, number>();
  function adjKey(a: string, b: string) {
    return a <= b ? `${a}\t${b}` : `${b}\t${a}`;
  }
  for (const edge of edges) {
    const a = edge.a && String(edge.a);
    const b = edge.b && String(edge.b);
    if (!a || !b) continue;
    const munA = sidToMunicipality.get(a);
    const munB = sidToMunicipality.get(b);
    if (!munA || !munB || munA === munB) continue;
    const key = adjKey(munA, munB);
    adjacency.set(key, (adjacency.get(key) || 0) + 1);
  }

  const allMuns = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const westmost = [...allMuns].sort((a, b) => a[1].centroid[0] - b[1].centroid[0]).slice(0, WESTMOST_N);
  const northmost = [...allMuns].sort((a, b) => a[1].centroid[1] - b[1].centroid[1]).slice(0, NORTHMOST_N);

  const targetBuckets: Record<string, MunBucket & { municipality_id: string; top_neighbors?: Array<{ municipality_id: string; count: number }> }> = {};
  for (const code of TARGET_CODES) {
    const b = buckets.get(code);
    if (!b) {
      targetBuckets[code] = { municipality_id: code, feature_count: 0, bbox: { minx: 0, miny: 0, maxx: 0, maxy: 0 }, centroid: [0, 0], census_ids: [], sample_names: [] };
      continue;
    }
    const topNeighbors: Array<{ municipality_id: string; count: number }> = [];
    const counts = new Map<string, number>();
    for (const [key, count] of adjacency) {
      const [mA, mB] = key.split('\t');
      if (mA === code) counts.set(mB, (counts.get(mB) || 0) + count);
      else if (mB === code) counts.set(mA, (counts.get(mA) || 0) + count);
    }
    for (const [mun, c] of [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, TOP_NEIGHBORS_N)) {
      topNeighbors.push({ municipality_id: mun, count: c });
    }
    targetBuckets[code] = {
      municipality_id: code,
      ...b,
      top_neighbors: topNeighbors.length ? topNeighbors : undefined,
    };
  }

  const censusCrossCheck: Record<string, { expected_count: number; substrate_count: number; sample_names_from_census: string[] }> = {};
  for (const code of TARGET_CODES) {
    const mun = municipalities[code];
    const b = buckets.get(code);
    const expected_count = mun && Array.isArray(mun.s) ? mun.s.length : 0;
    const substrate_count = b ? b.feature_count : 0;
    const settlementIds = mun && Array.isArray(mun.s) ? [...mun.s].sort((a, b) => a.localeCompare(b)) : [];
    const sample_names_from_census = settlementIds.slice(0, SAMPLE_NAMES_N).map(cid => {
      const entry = byCensusId[cid];
      return (entry && entry.name != null ? String(entry.name) : cid);
    });
    censusCrossCheck[code] = { expected_count, substrate_count, sample_names_from_census };
  }

  const auditJson = {
    substrate_sha256: substrateSha,
    substrate_bbox: globalBbox,
    substrate_feature_count: features.length,
    settlement_names_sha256: namesSha,
    census_sha256: censusSha,
    graph_sha256: graphSha || null,
    graph_path: graphPath || null,
    adjacency_available: edges.length > 0,
    target_municipalities: targetBuckets,
    westmost_15: westmost.map(([code, b]) => ({
      municipality_id: code,
      feature_count: b.feature_count,
      centroid: b.centroid,
      sample_names: b.sample_names.slice(0, 5),
    })),
    northmost_15: northmost.map(([code, b]) => ({
      municipality_id: code,
      feature_count: b.feature_count,
      centroid: b.centroid,
      sample_names: b.sample_names.slice(0, 5),
    })),
    census_cross_check: censusCrossCheck,
  };

  const txtLines: string[] = [];
  txtLines.push('Phase H6.10.3 — NW municipality geography audit');
  txtLines.push('');
  txtLines.push('Input checksums:');
  txtLines.push('  substrate_sha256: ' + substrateSha);
  txtLines.push('  settlement_names_sha256: ' + namesSha);
  txtLines.push('  census_sha256: ' + censusSha);
  txtLines.push('  graph_sha256: ' + (graphSha || 'N/A (adjacency unavailable)'));
  txtLines.push('  graph_path: ' + (graphPath || 'N/A'));
  txtLines.push('');
  txtLines.push('Substrate: feature_count=' + features.length + ' bbox=' + JSON.stringify(globalBbox));
  txtLines.push('');
  txtLines.push('--- Target codes 10049 (Bihać), 10227 (Cazin), 11240 (Bužim) ---');
  for (const code of TARGET_CODES) {
    const t = targetBuckets[code];
    txtLines.push('');
    txtLines.push('municipality_id: ' + code);
    txtLines.push('  feature_count: ' + t.feature_count);
    txtLines.push('  bbox: ' + JSON.stringify(t.bbox));
    txtLines.push('  centroid: ' + JSON.stringify(t.centroid));
    txtLines.push('  sample_names (10): ' + JSON.stringify(t.sample_names));
    if (t.top_neighbors && t.top_neighbors.length) {
      txtLines.push('  top_neighbors: ' + t.top_neighbors.map(n => n.municipality_id + '(' + n.count + ')').join(', '));
    } else {
      txtLines.push('  top_neighbors: (adjacency unavailable)');
    }
  }
  txtLines.push('');
  txtLines.push('--- Westmost 15 (by centroid.x) ---');
  for (const [code, b] of westmost) {
    txtLines.push('  ' + code + ' feature_count=' + b.feature_count + ' centroid=' + JSON.stringify(b.centroid) + ' names[0..5]=' + JSON.stringify(b.sample_names.slice(0, 5)));
  }
  txtLines.push('');
  txtLines.push('--- Northmost 15 (by centroid.y, smallest y = north) ---');
  for (const [code, b] of northmost) {
    txtLines.push('  ' + code + ' feature_count=' + b.feature_count + ' centroid=' + JSON.stringify(b.centroid) + ' names[0..5]=' + JSON.stringify(b.sample_names.slice(0, 5)));
  }
  txtLines.push('');
  txtLines.push('--- Census cross-check ---');
  for (const code of TARGET_CODES) {
    const c = censusCrossCheck[code];
    txtLines.push('  ' + code + ' expected_count(census)= ' + c.expected_count + ' substrate_count= ' + c.substrate_count);
    txtLines.push('    sample_names_from_census (10): ' + JSON.stringify(c.sample_names_from_census));
  }

  writeFileSync(resolve(DEBUG_DIR, 'nw_muni_geography_audit_h6_10_3.json'), JSON.stringify(auditJson, null, 2), 'utf8');
  writeFileSync(resolve(DEBUG_DIR, 'nw_muni_geography_audit_h6_10_3.txt'), txtLines.join('\n'), 'utf8');

  const overlayMunIds = new Set<string>(TARGET_CODES);
  for (let i = 0; i < BBOX_OVERLAY_WESTMOST_N && i < westmost.length; i++) {
    overlayMunIds.add(westmost[i][0]);
  }
  interface BboxFeature {
    type: 'Feature';
    properties: { overlay_type: string; municipality_id: string; label: string };
    geometry: { type: 'Polygon'; coordinates: number[][][] };
  }
  const bboxFeatures: BboxFeature[] = [];
  for (const mid of [...overlayMunIds].sort()) {
    const b = buckets.get(mid);
    if (!b) continue;
    const label = mid + ' | n=' + b.feature_count + ' | cx=' + (b.centroid[0].toFixed(3)) + ' cy=' + (b.centroid[1].toFixed(3));
    bboxFeatures.push({
      type: 'Feature',
      properties: {
        overlay_type: 'mun_bbox',
        municipality_id: mid,
        label,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [bboxToPolygon(b.bbox)],
      },
    });
  }
  const bboxOverlay = {
    type: 'FeatureCollection' as const,
    features: bboxFeatures,
  };
  writeFileSync(resolve(DEBUG_DIR, 'nw_muni_bboxes_overlay_h6_10_3.geojson'), JSON.stringify(bboxOverlay, null, 2), 'utf8');

  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_muni_geography_audit_h6_10_3.txt'));
  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_muni_geography_audit_h6_10_3.json'));
  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_muni_bboxes_overlay_h6_10_3.geojson'));
  console.log('Adjacency: ' + (edges.length ? 'available' : 'unavailable'));
}

main();
