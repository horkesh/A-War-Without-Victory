/**
 * Phase H5.0: Derive mun1990 adjacency graph from settlement contact graph.
 *
 * Deterministic: map each settlement sid -> mun1990_id; for each settlement-settlement
 * edge where a_m != b_m, accumulate municipality edge (min/max lex order). Edge type
 * and contact_weight from settlement edge; de-dupe, stable sort. All 109 registry
 * mun1990_id appear as nodes.
 *
 * Usage: npm run map:derive:mun1990-adjacency:h5_0
 *   or: tsx scripts/map/derive_mun1990_adjacency_graph_h5_0.ts
 *
 * Outputs:
 *   - data/derived/mun1990_adjacency_graph.json
 *   - data/derived/_debug/h5_0_mun1990_adjacency_report.txt (optional)
 *   - data/derived/h5_1_mun1990_adjacency_coverage.json (Phase H5.1 coverage audit)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';


const DERIVED_DIR = resolve('data/derived');
const CONTACT_PATH = resolve(DERIVED_DIR, 'settlement_contact_graph.json');
const AGG_PATH = resolve(DERIVED_DIR, 'municipality_agg_post1995.json');
const SUBSTRATE_PATH = resolve(DERIVED_DIR, 'settlements_substrate.geojson');
const OUTPUT_GRAPH_PATH = resolve(DERIVED_DIR, 'mun1990_adjacency_graph.json');
const DEBUG_DIR = resolve(DERIVED_DIR, '_debug');
const DEBUG_REPORT_PATH = resolve(DEBUG_DIR, 'h5_0_mun1990_adjacency_report.txt');
const H5_1_COVERAGE_PATH = resolve(DERIVED_DIR, 'h5_1_mun1990_adjacency_coverage.json');

const QUANTIZE_SCALE = 1e6; // deterministic integer-like weight from float

function quantizeWeight(v: number): number {
  return Math.round(v * QUANTIZE_SCALE);
}

function main(): void {
  mkdirSync(DERIVED_DIR, { recursive: true });
  mkdirSync(DEBUG_DIR, { recursive: true });

  process.stdout.write('Loading registry (canonical mun1990_id)...\n');
  const { registrySet } = buildMun1990RegistrySet(resolve());
  const canonicalMun1990Ids = [...registrySet].sort((a, b) => a.localeCompare(b));

  process.stdout.write('Loading municipality_agg_post1995 (sid -> mun1990 via municipality_id)...\n');
  const agg = JSON.parse(readFileSync(AGG_PATH, 'utf8')) as {
    by_municipality_id?: Record<string, { mun1990_id: string }>;
  };
  const byPost1995 = agg.by_municipality_id ?? {};

  process.stdout.write('Building sid -> mun1990_id from substrate (H5.3: registry-driven normalization)...\n');
  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  const sidToMun1990 = new Map<string, string>();
  for (const f of substrate.features ?? []) {
    const props = f.properties ?? {};
    const sid = props.sid ?? props.census_id;
    if (sid == null) continue;
    const sidStr = String(sid).trim();
    const mun1990FromFeature = props.mun1990_id ?? props.mun1990_municipality_id;
    const municipalityId = props.municipality_id ?? props.muni_id ?? props.opstina_id;
    let raw: string;
    if (mun1990FromFeature != null && typeof mun1990FromFeature === 'string') {
      raw = String(mun1990FromFeature).trim();
    } else if (municipalityId != null && byPost1995[String(municipalityId).trim()]) {
      raw = byPost1995[String(municipalityId).trim()].mun1990_id;
    } else {
      continue;
    }
    const { canonical } = normalizeMun1990Id(raw, MUN1990_ALIAS_MAP, registrySet);
    if (canonical == null) {
      process.stderr.write(`ERROR: mun1990_id not in registry and not resolvable by alias: "${raw}" (sid ${sidStr})\n`);
      process.exit(1);
    }
    sidToMun1990.set(sidStr, canonical);
  }
  process.stdout.write(`  sid_to_mun1990_count: ${sidToMun1990.size}\n`);

  process.stdout.write('Loading settlement contact graph...\n');
  const contact = JSON.parse(readFileSync(CONTACT_PATH, 'utf8')) as {
    edges?: Array<{
      a: string;
      b: string;
      type?: string;
      min_dist?: number;
      overlap_len?: number;
      weight?: number;
      length?: number;
    }>;
  };
  const edges = contact.edges ?? [];

  type MunEdgeType = 'shared_border' | 'point_touch' | 'distance_contact';
  const acc = new Map<
    string,
    { type: MunEdgeType; contact_weight: number; supporting_pairs_count: number }
  >();

  const edgeKey = (a: string, b: string): string => {
    const [minM, maxM] = [a, b].sort((x, y) => x.localeCompare(y));
    return `${minM}\t${maxM}`;
  };

  let skippedSameMun = 0;
  let skippedUnknownSid = 0;

  for (const e of edges) {
    if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
    const aMun = sidToMun1990.get(e.a.trim()) ?? sidToMun1990.get('S' + e.a.replace(/^S/i, ''));
    const bMun = sidToMun1990.get(e.b.trim()) ?? sidToMun1990.get('S' + e.b.replace(/^S/i, ''));
    if (aMun == null || bMun == null) {
      skippedUnknownSid++;
      continue;
    }
    if (aMun === bMun) {
      skippedSameMun++;
      continue;
    }
    const key = edgeKey(aMun, bMun);
    let type: MunEdgeType =
      e.type === 'shared_border'
        ? 'shared_border'
        : e.type === 'point_touch'
          ? 'point_touch'
          : 'distance_contact';
    let w = 0;
    if (type === 'shared_border' && (e.overlap_len != null || e.length != null || e.weight != null)) {
      w = quantizeWeight(Number(e.overlap_len ?? e.length ?? e.weight ?? 0));
    } else if (type === 'distance_contact' && (e.min_dist != null || e.weight != null)) {
      w = quantizeWeight(Number(e.min_dist ?? e.weight ?? 0));
    }
    const existing = acc.get(key);
    if (existing) {
      existing.contact_weight += w;
      existing.supporting_pairs_count += 1;
      if (type === 'shared_border' && existing.type !== 'shared_border') existing.type = 'shared_border';
      else if (type === 'point_touch' && existing.type === 'distance_contact') existing.type = 'point_touch';
    } else {
      acc.set(key, { type, contact_weight: w, supporting_pairs_count: 1 });
    }
  }

  process.stdout.write(`  edges_processed: ${edges.length}, skipped_same_mun: ${skippedSameMun}, skipped_unknown_sid: ${skippedUnknownSid}\n`);

  const nodes = [...canonicalMun1990Ids].sort((a, b) => a.localeCompare(b));
  const edgeList: Array<{
    a: string;
    b: string;
    type: MunEdgeType;
    contact_weight: number;
    supporting_pairs_count: number;
  }> = [];
  for (const [key, val] of acc.entries()) {
    const [a, b] = key.split('\t');
    edgeList.push({ a, b, type: val.type, contact_weight: val.contact_weight, supporting_pairs_count: val.supporting_pairs_count });
  }
  edgeList.sort((x, y) => {
    const xMin = x.a < x.b ? x.a : x.b;
    const xMax = x.a < x.b ? x.b : x.a;
    const yMin = y.a < y.b ? y.a : y.b;
    const yMax = y.a < y.b ? y.b : y.a;
    if (xMin !== yMin) return xMin.localeCompare(yMin);
    return xMax.localeCompare(yMax);
  });

  const graph = {
    awwv_meta: {
      role: 'mun1990_adjacency_graph',
      version: 'h5_0',
      source: ['settlement_contact_graph.json', 'municipality_agg_post1995.json', 'settlements_substrate.geojson', 'municipalities_1990_registry (canonical)'],
    },
    nodes,
    edges: edgeList,
  };
  writeFileSync(OUTPUT_GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_GRAPH_PATH} (nodes: ${nodes.length}, edges: ${edgeList.length})\n`);

  const typeCounts: Record<string, number> = {};
  for (const e of edgeList) {
    typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
  }
  const top20 = [...edgeList]
    .sort((a, b) => b.contact_weight - a.contact_weight)
    .slice(0, 20);
  const reportLines: string[] = [
    'H5.0 mun1990 adjacency report',
    `Nodes: ${nodes.length}`,
    `Edges: ${edgeList.length}`,
    'Count by type: ' + JSON.stringify(typeCounts),
    '',
    'Top 20 by contact_weight:',
    ...top20.map((e) => `  ${e.a} -- ${e.b}  type=${e.type} weight=${e.contact_weight} pairs=${e.supporting_pairs_count}`),
  ];
  const degreeByNode = new Map<string, number>();
  for (const id of nodes) degreeByNode.set(id, 0);
  for (const e of edgeList) {
    degreeByNode.set(e.a, (degreeByNode.get(e.a) ?? 0) + 1);
    degreeByNode.set(e.b, (degreeByNode.get(e.b) ?? 0) + 1);
  }
  const degreeZero = nodes.filter((id) => (degreeByNode.get(id) ?? 0) === 0);
  if (degreeZero.length > 0) {
    reportLines.push('', 'Disconnected (degree 0): ' + degreeZero.join(', '));
  } else {
    reportLines.push('', 'Disconnected components: none (all nodes have degree >= 1)');
  }
  writeFileSync(DEBUG_REPORT_PATH, reportLines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${DEBUG_REPORT_PATH}\n`);

  // Phase H5.1: Adjacency coverage audit (diagnostic only)
  const settlementCountSubstrate = new Map<string, number>();
  const settlementCountInGraph = new Map<string, number>();
  for (const id of nodes) {
    settlementCountSubstrate.set(id, 0);
    settlementCountInGraph.set(id, 0);
  }
  for (const [sid, mun] of sidToMun1990) {
    if (settlementCountSubstrate.has(mun)) {
      settlementCountSubstrate.set(mun, (settlementCountSubstrate.get(mun) ?? 0) + 1);
    }
  }
  const sidsInContactEdges = new Set<string>();
  for (const e of edges) {
    if (e?.a != null) sidsInContactEdges.add(String(e.a).trim());
    if (e?.b != null) sidsInContactEdges.add(String(e.b).trim());
  }
  function sidInGraph(sid: string): boolean {
    const numeric = sid.replace(/^S/i, '');
    const withS = 'S' + numeric;
    return sidsInContactEdges.has(sid) || sidsInContactEdges.has(numeric) || sidsInContactEdges.has(withS);
  }
  for (const [sid, mun] of sidToMun1990) {
    if (sidInGraph(sid) && settlementCountInGraph.has(mun)) {
      settlementCountInGraph.set(mun, (settlementCountInGraph.get(mun) ?? 0) + 1);
    }
  }
  const coverage: Record<string, { settlement_count_substrate: number; settlement_count_in_graph: number; adjacency_edge_count: number; is_isolated: boolean }> = {};
  for (const id of nodes) {
    const degree = degreeByNode.get(id) ?? 0;
    coverage[id] = {
      settlement_count_substrate: settlementCountSubstrate.get(id) ?? 0,
      settlement_count_in_graph: settlementCountInGraph.get(id) ?? 0,
      adjacency_edge_count: degree,
      is_isolated: degree === 0,
    };
  }
  writeFileSync(H5_1_COVERAGE_PATH, JSON.stringify({ awwv_meta: { role: 'h5_1_mun1990_adjacency_coverage', version: 'h5_1' }, by_mun1990_id: coverage }, null, 2), 'utf8');
  process.stdout.write(`Wrote ${H5_1_COVERAGE_PATH}\n`);
}

main();
