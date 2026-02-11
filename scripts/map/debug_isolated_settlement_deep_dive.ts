/**
 * Debug Isolated Settlement Deep Dive (Phase G3.4)
 *
 * Produces deterministic diagnostic evidence for a specific settlement (e.g. S104566)
 * to explain why it is isolated: v3 source gap vs viewer bundling vs geometry assumptions.
 *
 * Deterministic output only (stable ordering, no timestamps).
 * No geometry or derivation logic changes; diagnostics + artifacts only.
 *
 * Usage:
 *   npm run map:debug:isolated:deep -- --sid S104566 --mun 11428 --k 20
 *   or: tsx scripts/map/debug_isolated_settlement_deep_dive.ts --sid S104566
 *
 * Output:
 *   - data/derived/_debug/isolated_deep_dive_S104566.json
 *   - data/derived/_debug/isolated_deep_dive_S104566.txt
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { bboxDistance } from './lib/awwv_contracts.js';


function toCanonicalSid(s: string): string {
  const t = String(s).trim();
  return t.startsWith('S') ? t : 'S' + t;
}

function toV3GraphKey(sid: string): string {
  const t = String(sid).trim();
  return t.startsWith('S') ? t.slice(1) : t;
}

interface Bbox {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

interface SubstrateFeature {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates?: unknown[] };
}

function getCoords(feature: SubstrateFeature): Array<[number, number]> {
  const g = feature.geometry;
  if (!g || !g.coordinates) return [];
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0];
    if (!Array.isArray(ring)) return [];
    return ring as Array<[number, number]>;
  }
  if (g.type === 'MultiPolygon') {
    const all: Array<[number, number]> = [];
    for (const poly of g.coordinates as Array<unknown[]>) {
      if (!Array.isArray(poly)) continue;
      const ring = poly[0];
      if (!Array.isArray(ring)) continue;
      for (const pt of ring as Array<[number, number]>) {
        if (Array.isArray(pt) && pt.length >= 2) all.push(pt);
      }
    }
    return all;
  }
  return [];
}

function vertexCounts(feature: SubstrateFeature): { min: number; max: number } {
  const g = feature.geometry;
  if (!g || !g.coordinates) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0];
    const n = Array.isArray(ring) ? (ring as unknown[]).length : 0;
    min = max = n;
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as Array<unknown[]>) {
      if (!Array.isArray(poly)) continue;
      const ring = poly[0];
      const n = Array.isArray(ring) ? (ring as unknown[]).length : 0;
      if (n > 0) {
        min = Math.min(min, n);
        max = Math.max(max, n);
      }
    }
  }
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
}

function computeDegreeFromV3(raw: unknown): { degreeBySid: Map<string, number>; schema: string; sidFormat: 'numeric' | 's_prefix'; sidInNodes: boolean } {
  const degreeBySid = new Map<string, number>();
  let schema = 'unknown';
  let sidFormat: 'numeric' | 's_prefix' = 'numeric';
  let sidInNodes = false;

  const obj = raw as Record<string, unknown>;
  const topKeys = Object.keys(obj).sort();

  // Prefer edge_list; else graph; else adjacency_by_sid. Use only one source to avoid double-counting.
  if (Array.isArray(obj.edge_list)) {
    schema = 'edge_list';
    for (const e of obj.edge_list as Array<{ a: string; b: string }>) {
      if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
      const a = toCanonicalSid(e.a);
      const b = toCanonicalSid(e.b);
      if (!/^S\d+$/.test(e.a)) sidFormat = 'numeric';
      degreeBySid.set(a, (degreeBySid.get(a) ?? 0) + 1);
      degreeBySid.set(b, (degreeBySid.get(b) ?? 0) + 1);
    }
  }

  const graph = obj.graph as Record<string, unknown[]>;
  if (graph && typeof graph === 'object' && schema === 'unknown') {
    schema = 'graph';
    for (const [k, neighbors] of Object.entries(graph)) {
      const canonical = toCanonicalSid(k);
      if (!/^S\d+$/.test(k)) sidFormat = 'numeric';
      const count = Array.isArray(neighbors) ? neighbors.length : 0;
      degreeBySid.set(canonical, count);
    }
  }

  const adjBySid = obj.adjacency_by_sid as Record<string, unknown[]>;
  if (adjBySid && typeof adjBySid === 'object' && schema === 'unknown') {
    schema = 'adjacency_by_sid';
    for (const [k, neighbors] of Object.entries(adjBySid)) {
      const canonical = toCanonicalSid(k);
      const count = Array.isArray(neighbors) ? neighbors.length : 0;
      degreeBySid.set(canonical, count);
    }
  }

  if (graph && typeof graph === 'object' && schema === 'edge_list') {
    for (const k of Object.keys(graph)) {
      const canonical = toCanonicalSid(k);
      if (!degreeBySid.has(canonical)) {
        const neighbors = graph[k];
        degreeBySid.set(canonical, Array.isArray(neighbors) ? neighbors.length : 0);
      }
    }
  }

  if (schema === 'unknown') {
    return { degreeBySid, schema: `schema_unknown; keys: ${topKeys.slice(0, 10).join(',')}`, sidFormat, sidInNodes };
  }

  return { degreeBySid, schema, sidFormat, sidInNodes };
}

function computeDegreeFromContactGraph(raw: unknown): { degreeBySid: Map<string, number>; schema: string } {
  const degreeBySid = new Map<string, number>();
  const obj = raw as Record<string, unknown>;

  const edgeArr = (obj.edge_list ?? obj.edges) as Array<{ a: string; b: string }>;
  if (Array.isArray(edgeArr)) {
    for (const e of edgeArr) {
      if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
      const a = toCanonicalSid(e.a);
      const b = toCanonicalSid(e.b);
      degreeBySid.set(a, (degreeBySid.get(a) ?? 0) + 1);
      degreeBySid.set(b, (degreeBySid.get(b) ?? 0) + 1);
    }
    return { degreeBySid, schema: obj.edge_list ? 'edge_list' : 'edges' };
  }
  return { degreeBySid, schema: 'unknown' };
}

function parseArgs(): { sid: string; mun: string | null; k: number } {
  const args = process.argv.slice(2);
  let sid = 'S104566';
  let mun: string | null = null;
  let k = 20;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sid' && args[i + 1]) {
      sid = toCanonicalSid(args[i + 1]);
      i++;
    } else if (args[i] === '--mun' && args[i + 1]) {
      mun = String(args[i + 1]).trim();
      i++;
    } else if (args[i] === '--k' && args[i + 1]) {
      k = Math.max(1, parseInt(args[i + 1], 10) || 20);
      i++;
    }
  }
  return { sid, mun, k };
}

function main(): void {
  const { sid, mun, k } = parseArgs();

  const substratePath = resolve('data/derived/settlements_substrate.geojson');
  const viewerDataPath = resolve('data/derived/adjacency_viewer/data.json');
  const graphV3Path = resolve('data/derived/settlement_graph_v3.json');
  const contactGraphPath = resolve('data/derived/settlement_contact_graph.json');
  const isolatedReportPath = resolve('data/derived/isolated_settlements_report.json');
  const debugDir = resolve('data/derived/_debug');
  mkdirSync(debugDir, { recursive: true });

  const outputBase = resolve(debugDir, `isolated_deep_dive_${sid}`);
  const outputJson = outputBase + '.json';
  const outputTxt = outputBase + '.txt';

  process.stdout.write(`Deep dive for ${sid} (mun=${mun ?? 'all'}, k=${k})\n`);

  // Load substrate
  const substrate = JSON.parse(readFileSync(substratePath, 'utf8')) as { features?: SubstrateFeature[] };
  const features = substrate.features ?? [];
  const featureBySid = new Map<string, SubstrateFeature>();
  const centroidBySid = new Map<string, { x: number; y: number }>();
  const bboxBySid = new Map<string, Bbox>();
  const munBySid = new Map<string, string | null>();

  for (const f of features) {
    const s = String((f.properties as { sid?: string })?.sid ?? '').trim();
    if (!s) continue;
    featureBySid.set(s, f);
    const coords = getCoords(f);
    if (coords.length > 0) {
      let sumX = 0, sumY = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of coords) {
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      centroidBySid.set(s, { x: sumX / coords.length, y: sumY / coords.length });
      const bbox: Bbox = { minx: minX, miny: minY, maxx: maxX, maxy: maxY };
      bboxBySid.set(s, bbox);
    }
    const mid = (f.properties as { municipality_id?: string })?.municipality_id;
    munBySid.set(s, mid != null ? String(mid) : null);
  }

  const feature = featureBySid.get(sid);
  if (!feature) {
    process.stderr.write(`SID ${sid} not found in substrate\n`);
    process.exit(1);
  }

  const coords = getCoords(feature);
  const vc = vertexCounts(feature);
  let centroid = { x: 0, y: 0 };
  let bbox: Bbox = { minx: 0, miny: 0, maxx: 0, maxy: 0 };
  let bbox_area = 0;
  const sliverThreshold = 0.001;
  let bboxSliver = false;

  if (coords.length > 0) {
    let sumX = 0, sumY = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    centroid = { x: sumX / coords.length, y: sumY / coords.length };
    bbox = { minx: minX, miny: minY, maxx: maxX, maxy: maxY };
    const w = maxX - minX;
    const h = maxY - minY;
    bbox_area = w * h;
    bboxSliver = w < sliverThreshold || h < sliverThreshold;
  }

  // A) Geometry facts
  const geometryFacts = {
    sid,
    mun1990_id: munBySid.get(sid) ?? null,
    centroid,
    bbox,
    bbox_area,
    vertex_counts: vc,
    bbox_sliver: bboxSliver
  };

  // B) Viewer bundle edge facts
  let degreeInViewerEdges = 0;
  let viewerIncidentEdges: string[] = [];
  let viewerEdgesMissing = false;

  if (existsSync(viewerDataPath)) {
    const viewerData = JSON.parse(readFileSync(viewerDataPath, 'utf8')) as { edges?: Array<{ a: string; b: string }> };
    const edges = viewerData.edges ?? [];
    for (const e of edges) {
      const a = toCanonicalSid(e.a);
      const b = toCanonicalSid(e.b);
      if (a === sid || b === sid) {
        degreeInViewerEdges++;
        const other = a === sid ? b : a;
        viewerIncidentEdges.push(other);
      }
    }
    viewerIncidentEdges = [...new Set(viewerIncidentEdges)].sort((a, b) => a.localeCompare(b, 'en'));
    if (degreeInViewerEdges === 0) viewerEdgesMissing = true;
  } else {
    viewerEdgesMissing = true;
  }

  const viewerFacts = {
    degree_in_viewer_edges: degreeInViewerEdges,
    incident_edges_first_n: viewerIncidentEdges.slice(0, k),
    viewer_edges_missing: viewerEdgesMissing
  };

  // C) Raw v3 graph facts
  let degreeInRawV3 = 0;
  let v3SidFormat: 'numeric' | 's_prefix' = 'numeric';
  let v3Schema = 'unknown';
  let sidExistsInRawV3 = false;
  let v3IncidentEdges: string[] = [];

  if (existsSync(graphV3Path)) {
    const rawV3 = JSON.parse(readFileSync(graphV3Path, 'utf8'));
    const { degreeBySid, schema, sidFormat } = computeDegreeFromV3(rawV3);
    v3Schema = schema;
    v3SidFormat = sidFormat;
    degreeInRawV3 = degreeBySid.get(sid) ?? 0;
    sidExistsInRawV3 = degreeBySid.has(sid) || (rawV3 as Record<string, unknown>).graph?.[toV3GraphKey(sid)] !== undefined;

    if (Array.isArray((rawV3 as { edge_list?: unknown[] }).edge_list)) {
      for (const e of (rawV3 as { edge_list: Array<{ a: string; b: string }> }).edge_list) {
        const a = toCanonicalSid(e.a);
        const b = toCanonicalSid(e.b);
        if (a === sid) v3IncidentEdges.push(b);
        if (b === sid) v3IncidentEdges.push(a);
      }
    }
    const graph = (rawV3 as Record<string, unknown>).graph as Record<string, Array<{ sid: string }>> | undefined;
    if (graph) {
      const key = toV3GraphKey(sid);
      const neighbors = graph[key];
      if (Array.isArray(neighbors)) {
        for (const n of neighbors) {
          if (n?.sid) v3IncidentEdges.push(toCanonicalSid(n.sid));
        }
      }
    }
    v3IncidentEdges = [...new Set(v3IncidentEdges)].sort((a, b) => a.localeCompare(b, 'en'));
  }

  const v3Facts = {
    degree_in_raw_v3: degreeInRawV3,
    raw_v3_sid_format: v3SidFormat,
    sid_exists_in_raw_v3: sidExistsInRawV3,
    incident_neighbors_first_n: v3IncidentEdges.slice(0, k),
    schema_detected: v3Schema
  };

  // D) Raw contact graph facts
  let degreeInContactGraph = 0;
  let contactIncidentNeighbors: string[] = [];
  let contactSchema = 'unknown';

  if (existsSync(contactGraphPath)) {
    const contactRaw = JSON.parse(readFileSync(contactGraphPath, 'utf8'));
    const { degreeBySid, schema } = computeDegreeFromContactGraph(contactRaw);
    contactSchema = schema;
    degreeInContactGraph = degreeBySid.get(sid) ?? 0;

    const edgeArr = (contactRaw as { edge_list?: Array<{ a: string; b: string }> }).edge_list ??
      (contactRaw as { edges?: Array<{ a: string; b: string }> }).edges;
    if (Array.isArray(edgeArr)) {
      for (const e of edgeArr) {
        const a = toCanonicalSid(e.a);
        const b = toCanonicalSid(e.b);
        if (a === sid) contactIncidentNeighbors.push(b);
        if (b === sid) contactIncidentNeighbors.push(a);
      }
    }
    contactIncidentNeighbors = [...new Set(contactIncidentNeighbors)].sort((a, b) => a.localeCompare(b, 'en'));
  }

  const contactFacts = {
    degree_in_raw_contact_graph: degreeInContactGraph,
    incident_neighbors_first_n: contactIncidentNeighbors.slice(0, k),
    schema_detected: contactSchema
  };

  // E) Pure geometry neighbor check
  const allSids = [...featureBySid.keys()].filter((s) => s !== sid);
  const cent = centroidBySid.get(sid)!;
  const bb = bboxBySid.get(sid)!;

  const neighborsWithDist = allSids.map((s) => {
    const c = centroidBySid.get(s)!;
    const b = bboxBySid.get(s)!;
    const dx = cent.x - c.x;
    const dy = cent.y - c.y;
    const centroidDistSq = dx * dx + dy * dy;
    const bd = bboxDistance(bb, b);
    const bboxOverlap = bd === 0;
    return {
      neighbor_sid: s,
      neighbor_mun: munBySid.get(s) ?? null,
      centroid_dist: Math.sqrt(centroidDistSq),
      bbox_dist: bd,
      bbox_overlap_boolean: bboxOverlap
    };
  });

  neighborsWithDist.sort((a, b) => {
    const d = a.centroid_dist - b.centroid_dist;
    if (d !== 0) return d;
    return a.neighbor_sid.localeCompare(b.neighbor_sid, 'en');
  });

  const kNearest = neighborsWithDist.slice(0, k);
  const bboxOverlapCount = neighborsWithDist.filter((n) => n.bbox_overlap_boolean).length;

  const geometryNeighborFacts = {
    k_nearest: kNearest,
    neighbors_with_bbox_dist_zero: bboxOverlapCount
  };

  // F) Municipality cohort (if --mun provided)
  let cohortSummary: Record<string, unknown>[] | null = null;

  if (mun) {
    let isolatedInMun: string[] = [];
    if (existsSync(isolatedReportPath)) {
      const report = JSON.parse(readFileSync(isolatedReportPath, 'utf8')) as { isolated?: Array<{ sid: string; mun1990_id: string | null }> };
      isolatedInMun = (report.isolated ?? []).filter((r) => String(r.mun1990_id) === mun).map((r) => r.sid);
    } else {
      const v3Raw = existsSync(graphV3Path) ? JSON.parse(readFileSync(graphV3Path, 'utf8')) : null;
      const { degreeBySid } = v3Raw ? computeDegreeFromV3(v3Raw) : { degreeBySid: new Map<string, number>() };
      for (const s of featureBySid.keys()) {
        if (String(munBySid.get(s)) === mun && (degreeBySid.get(s) ?? 0) === 0) {
          isolatedInMun.push(s);
        }
      }
    }
    isolatedInMun.sort((a, b) => a.localeCompare(b, 'en'));

    let viewerDegreeBySid = new Map<string, number>();
    if (existsSync(viewerDataPath)) {
      const viewerData = JSON.parse(readFileSync(viewerDataPath, 'utf8')) as { edges?: Array<{ a: string; b: string }> };
      for (const e of viewerData.edges ?? []) {
        const a = toCanonicalSid(e.a);
        const b = toCanonicalSid(e.b);
        viewerDegreeBySid.set(a, (viewerDegreeBySid.get(a) ?? 0) + 1);
        viewerDegreeBySid.set(b, (viewerDegreeBySid.get(b) ?? 0) + 1);
      }
    }

    let v3DegreeBySid = new Map<string, number>();
    if (existsSync(graphV3Path)) {
      const rawV3 = JSON.parse(readFileSync(graphV3Path, 'utf8'));
      const r = computeDegreeFromV3(rawV3);
      v3DegreeBySid = r.degreeBySid;
    }

    cohortSummary = isolatedInMun.map((s) => {
      const bb = bboxBySid.get(s);
      const area = bb ? (bb.maxx - bb.minx) * (bb.maxy - bb.miny) : 0;
      const sliver = bb
        ? (bb.maxx - bb.minx) < sliverThreshold || (bb.maxy - bb.miny) < sliverThreshold
        : false;

      const centS = centroidBySid.get(s);
      const bbS = bboxBySid.get(s);
      let bboxZeroCount = 0;
      if (centS && bbS) {
        const others = allSids.filter((o) => o !== s);
        for (const o of others) {
          const bo = bboxBySid.get(o);
          if (bo && bboxDistance(bbS, bo) === 0) bboxZeroCount++;
        }
      }

      return {
        sid: s,
        degree_in_viewer_edges: viewerDegreeBySid.get(s) ?? 0,
        degree_in_raw_v3: v3DegreeBySid.get(s) ?? 0,
        bbox_area: area,
        bbox_sliver: sliver,
        neighbors_bbox_dist_zero: bboxZeroCount
      };
    });
  }

  // Diagnosis
  let diagnosis: string;
  if (degreeInRawV3 > 0 && degreeInViewerEdges === 0) {
    diagnosis = 'CASE A: raw v3 has edges but viewer bundle is missing them => build issue';
  } else if (degreeInRawV3 === 0) {
    if (bboxOverlapCount > 0) {
      diagnosis = 'CASE C: geometry strongly suggests contact exists (bbox_dist==0 neighbors) but graph has none => derivation criteria miss; candidate fix in next phase';
    } else if (bboxSliver) {
      diagnosis = 'CASE D: sliver/invalid geometry likely caused derivation drop => geometry cleanup needed (separate phase)';
    } else {
      diagnosis = 'CASE B: raw v3 has no edges for sid (degree 0) => derivation coverage issue';
    }
  } else if (bboxOverlapCount > 0 && degreeInRawV3 === 0) {
    diagnosis = 'CASE C: geometry strongly suggests contact exists (bbox_dist==0 neighbors) but graph has none => derivation criteria miss; candidate fix in next phase';
  } else if (bboxSliver && degreeInRawV3 === 0) {
    diagnosis = 'CASE D: sliver/invalid geometry likely caused derivation drop => geometry cleanup needed (separate phase)';
  } else {
    diagnosis = 'CASE B: raw v3 has no edges for sid (degree 0) => derivation coverage issue';
  }

  const payload = {
    schema_version: 1,
    generated_by: 'scripts/map/debug_isolated_settlement_deep_dive.ts',
    target_sid: sid,
    mun_filter: mun,
    k,
    geometry_facts: geometryFacts,
    viewer_bundle_facts: viewerFacts,
    raw_v3_facts: v3Facts,
    raw_contact_graph_facts: contactFacts,
    geometry_neighbor_facts: geometryNeighborFacts,
    municipality_cohort: cohortSummary,
    diagnosis
  };

  writeFileSync(outputJson, JSON.stringify(payload, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outputJson}\n`);

  const lines: string[] = [
    `Isolated settlement deep dive: ${sid}`,
    '====================================',
    '',
    'A) Geometry facts',
    `  sid: ${sid}, mun1990_id: ${geometryFacts.mun1990_id ?? '-'}`,
    `  centroid: (${geometryFacts.centroid.x.toFixed(4)}, ${geometryFacts.centroid.y.toFixed(4)})`,
    `  bbox_area: ${geometryFacts.bbox_area.toFixed(4)}, bbox_sliver: ${geometryFacts.bbox_sliver}`,
    `  vertex_counts: min=${vc.min}, max=${vc.max}`,
    '',
    'B) Viewer bundle edge facts',
    `  degree_in_viewer_edges: ${degreeInViewerEdges}`,
    `  viewer_edges_missing: ${viewerEdgesMissing}`,
    `  incident_edges (first ${Math.min(k, viewerIncidentEdges.length)}): ${viewerIncidentEdges.slice(0, k).join(', ') || '(none)'}`,
    '',
    'C) Raw v3 graph facts',
    `  degree_in_raw_v3: ${degreeInRawV3}`,
    `  sid_exists_in_raw_v3: ${sidExistsInRawV3}`,
    `  raw_v3_sid_format: ${v3SidFormat}`,
    `  schema_detected: ${v3Schema}`,
    `  incident_neighbors (first ${Math.min(k, v3IncidentEdges.length)}): ${v3IncidentEdges.slice(0, k).join(', ') || '(none)'}`,
    '',
    'D) Raw contact graph facts',
    `  degree_in_raw_contact_graph: ${degreeInContactGraph}`,
    `  incident_neighbors (first ${Math.min(k, contactIncidentNeighbors.length)}): ${contactIncidentNeighbors.slice(0, k).join(', ') || '(none)'}`,
    '',
    'E) Geometry neighbor check (pure bbox distance)',
    `  neighbors_with_bbox_dist_zero: ${bboxOverlapCount}`,
    `  top ${k} nearest by centroid (sid | mun | centroid_dist | bbox_dist | bbox_overlap):`
  ];

  for (const n of kNearest) {
    lines.push(
      `    ${n.neighbor_sid} | ${n.neighbor_mun ?? '-'} | ${n.centroid_dist.toFixed(4)} | ${n.bbox_dist.toFixed(4)} | ${n.bbox_overlap_boolean}`
    );
  }

  if (cohortSummary && cohortSummary.length > 0) {
    lines.push('');
    lines.push(`F) Municipality cohort (mun=${mun})`);
    lines.push('  sid | degree_viewer | degree_v3 | bbox_area | sliver | bbox_dist_zero_count');
    for (const row of cohortSummary as Array<{ sid: string; degree_in_viewer_edges: number; degree_in_raw_v3: number; bbox_area: number; bbox_sliver: boolean; neighbors_bbox_dist_zero: number }>) {
      lines.push(
        `  ${row.sid} | ${row.degree_in_viewer_edges} | ${row.degree_in_raw_v3} | ${row.bbox_area.toFixed(2)} | ${row.bbox_sliver} | ${row.neighbors_bbox_dist_zero}`
      );
    }
  }

  lines.push('');
  lines.push('Diagnosis');
  lines.push('---------');
  lines.push(diagnosis);

  writeFileSync(outputTxt, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${outputTxt}\n`);
  process.stdout.write(`\nDiagnosis: ${diagnosis}\n`);
}

main();
