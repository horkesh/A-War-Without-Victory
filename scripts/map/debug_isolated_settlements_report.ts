/**
 * Debug Isolated Settlements Report (Phase G3.3)
 *
 * Produces a deterministic diagnostic report for settlements that are
 * "isolated (v3 contact)" — i.e. degree 0 in the v3 contact graph.
 * Explains per-settlement why they are isolated: missing from v3 inputs,
 * ID mismatch, geometry flags, or genuinely isolated.
 *
 * No geometry or edge derivation logic is changed; diagnostics + reporting only.
 *
 * Usage:
 *   npm run map:debug:isolated
 *   or: tsx scripts/map/debug_isolated_settlements_report.ts
 *
 * Output:
 *   - data/derived/isolated_settlements_report.json
 *   - data/derived/isolated_settlements_report.txt (summary)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';


/** Normalize SID to substrate canonical form (S-prefix). Same as Phase G3.2. */
function toCanonicalSid(s: string): string {
  const t = String(s).trim();
  return t.startsWith('S') ? t : 'S' + t;
}

/** Numeric form for v3 graph key lookup (v3 graph keys are numeric). */
function toV3GraphKey(sid: string): string {
  const t = String(sid).trim();
  return t.startsWith('S') ? t.slice(1) : t;
}

interface IsolatedRow {
  sid: string;
  mun1990_id: string | null;
  name: string | null;
  centroid: { x: number; y: number };
  bbox: { minx: number; miny: number; maxx: number; maxy: number };
  bbox_area: number;
  in_v3_nodes: boolean;
  in_v3_edges_endpoints: boolean;
  in_contact_graph_endpoints: boolean;
  degree_in_viewer_edges?: number;
  degree_in_raw_v3?: number;
  notes: string[];
}

interface Report {
  schema_version: number;
  generated_by: string;
  substrate_path: string;
  v3_graph_path: string;
  contact_graph_path: string | null;
  total_substrate_sids: number;
  total_v3_edge_endpoints_unique: number;
  isolated_count: number;
  isolated: IsolatedRow[];
  forawwv_note: string | null;
}

interface SubstrateFeature {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates?: unknown[] };
}

function getCoords(feature: SubstrateFeature): Array<[number, number]> {
  const g = feature.geometry;
  if (!g || g.type !== 'Polygon') return [];
  const ring = g.coordinates?.[0];
  if (!Array.isArray(ring)) return [];
  return ring as Array<[number, number]>;
}

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n) && !Number.isNaN(n);
}

function main(): void {
  const substratePath = resolve('data/derived/settlements_substrate.geojson');
  const graphV3Path = resolve('data/derived/settlement_graph_v3.json');
  const contactGraphPath = resolve('data/derived/settlement_contact_graph.json');
  const outputDir = resolve('data/derived');
  const reportJsonPath = resolve(outputDir, 'isolated_settlements_report.json');
  const reportTxtPath = resolve(outputDir, 'isolated_settlements_report.txt');

  process.stdout.write(`Loading ${substratePath}...\n`);
  const substrate = JSON.parse(readFileSync(substratePath, 'utf8')) as { features?: SubstrateFeature[] };
  const features = substrate.features ?? [];

  const substrateSids = new Set<string>();
  const featureBySid = new Map<string, SubstrateFeature>();
  for (const f of features) {
    const sid = String((f.properties as { sid?: string })?.sid ?? '').trim();
    if (sid) {
      substrateSids.add(sid);
      featureBySid.set(sid, f);
    }
  }

  process.stdout.write(`Substrate SIDs: ${substrateSids.size}\n`);

  let graphV3: {
    graph?: Record<string, unknown[]>;
    edge_list?: Array<{ a: string; b: string }>;
  } | null = null;
  if (existsSync(graphV3Path)) {
    graphV3 = JSON.parse(readFileSync(graphV3Path, 'utf8'));
  }

  const v3GraphKeys = new Set<string>();
  const v3EdgeEndpointSids = new Set<string>();
  if (graphV3) {
    if (graphV3.graph && typeof graphV3.graph === 'object') {
      for (const k of Object.keys(graphV3.graph)) {
        v3GraphKeys.add(k);
        v3EdgeEndpointSids.add(toCanonicalSid(k));
        const neighbors = graphV3.graph[k] as Array<{ sid: string }>;
        if (Array.isArray(neighbors)) {
          for (const n of neighbors) {
            if (n && typeof n.sid === 'string') {
              v3EdgeEndpointSids.add(toCanonicalSid(n.sid));
            }
          }
        }
      }
    }
    if (Array.isArray(graphV3.edge_list)) {
      for (const e of graphV3.edge_list) {
        v3EdgeEndpointSids.add(toCanonicalSid(e.a));
        v3EdgeEndpointSids.add(toCanonicalSid(e.b));
      }
    }
  }

  process.stdout.write(`V3 unique endpoint SIDs: ${v3EdgeEndpointSids.size}\n`);

  const degreeBySid = new Map<string, number>();
  for (const sid of substrateSids) {
    degreeBySid.set(sid, 0);
  }
  if (graphV3 && Array.isArray(graphV3.edge_list)) {
    for (const e of graphV3.edge_list) {
      const a = toCanonicalSid(e.a);
      const b = toCanonicalSid(e.b);
      if (substrateSids.has(a)) {
        degreeBySid.set(a, (degreeBySid.get(a) ?? 0) + 1);
      }
      if (substrateSids.has(b)) {
        degreeBySid.set(b, (degreeBySid.get(b) ?? 0) + 1);
      }
    }
  }
  if (graphV3?.graph && typeof graphV3.graph === 'object') {
    const edgeList = Array.isArray(graphV3.edge_list) ? graphV3.edge_list : [];
    const inEdgeList = new Set<string>();
    for (const e of edgeList) {
      inEdgeList.add(toCanonicalSid(e.a));
      inEdgeList.add(toCanonicalSid(e.b));
    }
    for (const [k, neighbors] of Object.entries(graphV3.graph)) {
      const canonical = toCanonicalSid(k);
      if (substrateSids.has(canonical) && !inEdgeList.has(canonical)) {
        degreeBySid.set(canonical, Array.isArray(neighbors) ? neighbors.length : 0);
      }
    }
  }

  const degreeInViewerBySid = new Map<string, number>();
  for (const s of substrateSids) degreeInViewerBySid.set(s, 0);
  const viewerDataPath = resolve('data/derived/adjacency_viewer/data.json');
  if (existsSync(viewerDataPath)) {
    try {
      const viewerData = JSON.parse(readFileSync(viewerDataPath, 'utf8')) as { edges?: Array<{ a: string; b: string }> };
      const edges = viewerData.edges ?? [];
      for (const e of edges) {
        const a = toCanonicalSid(e.a);
        const b = toCanonicalSid(e.b);
        if (substrateSids.has(a)) degreeInViewerBySid.set(a, (degreeInViewerBySid.get(a) ?? 0) + 1);
        if (substrateSids.has(b)) degreeInViewerBySid.set(b, (degreeInViewerBySid.get(b) ?? 0) + 1);
      }
    } catch {
      // optional
    }
  }

  const isolatedSids = [...substrateSids].filter((sid) => (degreeBySid.get(sid) ?? 0) === 0);
  isolatedSids.sort((a, b) => a.localeCompare(b, 'en'));

  const contactGraphEndpointSids = new Set<string>();
  let contactGraphLoaded = false;
  if (existsSync(contactGraphPath)) {
    try {
      const contactGraph = JSON.parse(readFileSync(contactGraphPath, 'utf8')) as {
        nodes?: Array<{ sid: string }>;
        edge_list?: Array<{ a: string; b: string }>;
      };
      contactGraphLoaded = true;
      if (Array.isArray(contactGraph.nodes)) {
        for (const n of contactGraph.nodes) {
          if (n && typeof n.sid === 'string') {
            contactGraphEndpointSids.add(toCanonicalSid(n.sid));
          }
        }
      }
      if (Array.isArray(contactGraph.edge_list)) {
        for (const e of contactGraph.edge_list) {
          contactGraphEndpointSids.add(toCanonicalSid(e.a));
          contactGraphEndpointSids.add(toCanonicalSid(e.b));
        }
      }
    } catch {
      contactGraphLoaded = false;
    }
  }

  const TINY_BBOX_THRESHOLD = 0.001;
  const MIN_RING_LENGTH = 4;

  const isolatedRows: IsolatedRow[] = [];
  for (const sid of isolatedSids) {
    const feature = featureBySid.get(sid);
    const props = (feature?.properties ?? {}) as {
      municipality_id?: string;
      name?: string;
      [key: string]: unknown;
    };
    const mun1990_id = props.municipality_id != null ? String(props.municipality_id) : null;
    const name = props.name != null ? String(props.name) : null;

    const coords = getCoords(
      feature ?? ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } } as SubstrateFeature)
    );
    let centroid = { x: 0, y: 0 };
    let bbox = { minx: 0, miny: 0, maxx: 0, maxy: 0 };
    let bbox_area = 0;
    const notes: string[] = [];

    if (coords.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasNonFinite = false;
      for (const [x, y] of coords) {
        if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
          hasNonFinite = true;
        }
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

      if (coords.length < MIN_RING_LENGTH) {
        notes.push('invalid_ring_suspect');
      }
      if (w < TINY_BBOX_THRESHOLD || h < TINY_BBOX_THRESHOLD) {
        notes.push('tiny_bbox');
      }
      if (hasNonFinite) {
        notes.push('non_finite_coords');
      }
    } else {
      notes.push('no_coords');
    }

    const v3Key = toV3GraphKey(sid);
    const in_v3_nodes = v3GraphKeys.has(v3Key);
    const in_v3_edges_endpoints = v3EdgeEndpointSids.has(sid);
    const in_contact_graph_endpoints = contactGraphLoaded ? contactGraphEndpointSids.has(sid) : false;

    if (!in_v3_edges_endpoints) {
      notes.push('missing_from_v3_edges');
    }
    if (contactGraphLoaded && !in_contact_graph_endpoints) {
      notes.push('missing_from_contact_graph');
    }

    const row: IsolatedRow = {
      sid,
      mun1990_id,
      name,
      centroid,
      bbox,
      bbox_area,
      in_v3_nodes,
      in_v3_edges_endpoints,
      in_contact_graph_endpoints,
      notes: [...notes].sort()
    };
    const degViewer = degreeInViewerBySid.get(sid);
    if (degViewer !== undefined) row.degree_in_viewer_edges = degViewer;
    const degV3 = degreeBySid.get(sid);
    if (degV3 !== undefined) row.degree_in_raw_v3 = degV3;
    isolatedRows.push(row);
  }

  let forawwv_note: string | null = null;
  const missingFromV3 = isolatedRows.filter((r) => r.notes.includes('missing_from_v3_edges'));
  const byMun = new Map<string, number>();
  for (const r of missingFromV3) {
    const mun = r.mun1990_id ?? 'unknown';
    byMun.set(mun, (byMun.get(mun) ?? 0) + 1);
  }
  const munisWithMany = [...byMun.entries()].filter(([, count]) => count >= 5);
  if (munisWithMany.length > 0) {
    forawwv_note =
      'Multiple isolated settlements in same municipality (missing from v3 edges). FORAWWV.md may need an addendum if substrate/coordinate regime explains whole-municipality omission. Do NOT edit FORAWWV automatically.';
  }

  const reportPayload: Report = {
    schema_version: 1,
    generated_by: 'scripts/map/debug_isolated_settlements_report.ts',
    substrate_path: 'data/derived/settlements_substrate.geojson',
    v3_graph_path: 'data/derived/settlement_graph_v3.json',
    contact_graph_path: existsSync(contactGraphPath) ? 'data/derived/settlement_contact_graph.json' : null,
    total_substrate_sids: substrateSids.size,
    total_v3_edge_endpoints_unique: v3EdgeEndpointSids.size,
    isolated_count: isolatedRows.length,
    isolated: isolatedRows,
    forawwv_note
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(reportJsonPath, JSON.stringify(reportPayload, null, 2), 'utf8');
  process.stdout.write(`Wrote ${reportJsonPath}\n`);

  const lines: string[] = [
    'Isolated (v3 contact) settlements diagnostic report',
    '==================================================',
    '',
    `Total substrate SIDs: ${reportPayload.total_substrate_sids}`,
    `V3 unique endpoint SIDs: ${reportPayload.total_v3_edge_endpoints_unique}`,
    `Isolated count: ${reportPayload.isolated_count}`,
    ''
  ];
  if (reportPayload.forawwv_note) {
    lines.push(`FORAWWV note: ${reportPayload.forawwv_note}`);
    lines.push('');
  }
  lines.push('Per-settlement (sid | mun1990_id | name | deg_viewer | deg_v3 | in_v3_nodes | in_v3_edges | in_contact | notes)');
  lines.push('');
  for (const r of reportPayload.isolated) {
    lines.push(
      [
        r.sid,
        r.mun1990_id ?? '-',
        (r.name ?? '-').slice(0, 30),
        r.degree_in_viewer_edges ?? '-',
        r.degree_in_raw_v3 ?? '-',
        r.in_v3_nodes ? 'Y' : 'N',
        r.in_v3_edges_endpoints ? 'Y' : 'N',
        r.in_contact_graph_endpoints ? 'Y' : 'N',
        r.notes.join(';')
      ].join(' | ')
    );
  }
  writeFileSync(reportTxtPath, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${reportTxtPath}\n`);
  process.stdout.write(`\nIsolated: ${reportPayload.isolated_count}\n`);
}

main();
