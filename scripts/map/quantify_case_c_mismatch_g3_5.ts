/**
 * Quantify CASE C Mismatch (Phase G3.5)
 *
 * Deterministic diagnostic: settlements that are degree-0 in v3 shared-border graph
 * but degree>0 in Phase 1 contact graph. Quantifies prevalence and municipality concentration.
 *
 * CASE C = { sid | degree_v3[sid]==0 AND degree_phase1[sid]>0 AND sid in substrate }
 *
 * No geometry/v3/contact derivation changes. Diagnostic evidence only.
 *
 * Usage:
 *   npm run map:debug:casec:g3_5
 *
 * Outputs:
 *   - data/derived/case_c_mismatch_summary_g3_5.json
 *   - data/derived/case_c_mismatch_summary_g3_5.txt
 *   - data/derived/_debug/case_c_mismatch_munis_top_g3_5.json
 *   - data/derived/_debug/case_c_mismatch_samples_11428_11304_g3_5.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { bboxDistance } from './lib/awwv_contracts.js';


function idNormalize(s: string, substrateSids: Set<string>): string {
  const t = String(s).trim();
  const withS = t.startsWith('S') ? t : 'S' + t;
  if (substrateSids.has(withS)) return withS;
  if (substrateSids.has(t)) return t;
  return withS;
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

function getBbox(feature: SubstrateFeature): Bbox | null {
  const g = feature.geometry;
  if (!g || !g.coordinates) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const processRing = (ring: unknown[]) => {
    for (const pt of ring as Array<[number, number]>) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const [x, y] = pt;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  };
  if (g.type === 'Polygon') {
    const ring = (g.coordinates as unknown[][])[0];
    if (Array.isArray(ring)) processRing(ring);
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as unknown[][]) {
      if (!Array.isArray(poly)) continue;
      const ring = poly[0];
      if (Array.isArray(ring)) processRing(ring);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minx: minX, miny: minY, maxx: maxX, maxy: maxY };
}

function getMunicipalityId(props: Record<string, unknown>): string | null {
  const keys = ['municipality_id', 'mun1990_id', 'opstina_id', 'muni_id'];
  for (const k of keys) {
    const v = props[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function main(): void {
  const substratePath = resolve('data/derived/settlements_substrate.geojson');
  const contactPath = resolve('data/derived/settlement_contact_graph.json');
  const v3Path = resolve('data/derived/settlement_graph_v3.json');
  const dataIndexPath = resolve('data/derived/data_index.json');
  const outputDir = resolve('data/derived');
  const debugDir = resolve('data/derived/_debug');

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(debugDir, { recursive: true });

  process.stdout.write('Loading substrate...\n');
  const substrate = JSON.parse(readFileSync(substratePath, 'utf8')) as { features?: SubstrateFeature[] };
  const features = substrate.features ?? [];

  const substrateSids = new Set<string>();
  const munBySid = new Map<string, string | null>();
  const featureBySid = new Map<string, SubstrateFeature>();
  const bboxBySid = new Map<string, Bbox>();

  for (const f of features) {
    const sid = String((f.properties as Record<string, unknown>)?.sid ?? '').trim();
    if (!sid) continue;
    substrateSids.add(sid);
    munBySid.set(sid, getMunicipalityId((f.properties ?? {}) as Record<string, unknown>));
    featureBySid.set(sid, f);
    const bbox = getBbox(f);
    if (bbox) bboxBySid.set(sid, bbox);
  }

  const idNorm = (s: string) => idNormalize(s, substrateSids);

  const unknownToSubstrate = new Set<string>();

  process.stdout.write('Loading Phase 1 contact graph...\n');
  const contactRaw = JSON.parse(readFileSync(contactPath, 'utf8')) as Record<string, unknown>;
  const phase1Edges = (contactRaw.edge_list ?? contactRaw.edges) as Array<{ a: string; b: string; type?: string }>;
  const degreePhase1 = new Map<string, number>();
  const phase1NeighborsBySid = new Map<string, Set<string>>();
  const phase1TypeCounts = new Map<string, Map<string, number>>();

  for (const sid of substrateSids) {
    degreePhase1.set(sid, 0);
    phase1NeighborsBySid.set(sid, new Set());
    phase1TypeCounts.set(sid, new Map());
  }

  for (const e of phase1Edges ?? []) {
    if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
    const a = idNorm(e.a);
    const b = idNorm(e.b);
    const type = (e.type && String(e.type).trim()) || 'unknown';
    if (!substrateSids.has(a)) unknownToSubstrate.add(a);
    if (!substrateSids.has(b)) unknownToSubstrate.add(b);
    if (!substrateSids.has(a) || !substrateSids.has(b)) continue;

    phase1NeighborsBySid.get(a)!.add(b);
    phase1NeighborsBySid.get(b)!.add(a);
    phase1TypeCounts.get(a)!.set(type, (phase1TypeCounts.get(a)!.get(type) ?? 0) + 1);
    phase1TypeCounts.get(b)!.set(type, (phase1TypeCounts.get(b)!.get(type) ?? 0) + 1);
  }

  for (const [sid, neighbors] of phase1NeighborsBySid) {
    degreePhase1.set(sid, neighbors.size);
  }

  process.stdout.write('Loading v3 graph...\n');
  const v3Raw = JSON.parse(readFileSync(v3Path, 'utf8')) as Record<string, unknown>;
  const degreeV3 = new Map<string, number>();
  for (const sid of substrateSids) degreeV3.set(sid, 0);

  const v3EdgeList = v3Raw.edge_list as Array<{ a: string; b: string }>;
  if (Array.isArray(v3EdgeList)) {
    for (const e of v3EdgeList) {
      const a = idNorm(e.a);
      const b = idNorm(e.b);
      if (!substrateSids.has(a)) unknownToSubstrate.add(a);
      if (!substrateSids.has(b)) unknownToSubstrate.add(b);
      if (substrateSids.has(a)) degreeV3.set(a, (degreeV3.get(a) ?? 0) + 1);
      if (substrateSids.has(b)) degreeV3.set(b, (degreeV3.get(b) ?? 0) + 1);
    }
  }

  const v3Graph = v3Raw.graph as Record<string, unknown[]>;
  if (v3Graph && typeof v3Graph === 'object') {
    const inEdgeList = new Set<string>();
    for (const e of v3EdgeList ?? []) {
      inEdgeList.add(idNorm(e.a));
      inEdgeList.add(idNorm(e.b));
    }
    for (const [k, neighbors] of Object.entries(v3Graph)) {
      const canonical = idNorm(k);
      if (!substrateSids.has(canonical)) continue;
      if (!inEdgeList.has(canonical)) {
        degreeV3.set(canonical, Array.isArray(neighbors) ? neighbors.length : 0);
      }
    }
  }

  const v3Degree0Total = [...substrateSids].filter((s) => (degreeV3.get(s) ?? 0) === 0).length;
  const v3Degree0Phase1_0 = [...substrateSids].filter((s) => (degreeV3.get(s) ?? 0) === 0 && (degreePhase1.get(s) ?? 0) === 0).length;
  const caseC = new Set<string>();
  for (const s of substrateSids) {
    if ((degreeV3.get(s) ?? 0) === 0 && (degreePhase1.get(s) ?? 0) > 0) caseC.add(s);
  }
  const caseCSorted = [...caseC].sort((a, b) => a.localeCompare(b, 'en'));
  const v3Degree0Phase1Gt0 = caseCSorted.length;

  const munStats = new Map<string, { substrate_count: number; case_c_count: number }>();
  for (const s of substrateSids) {
    const mun = munBySid.get(s) ?? '__unknown__';
    const st = munStats.get(mun) ?? { substrate_count: 0, case_c_count: 0 };
    st.substrate_count++;
    if (caseC.has(s)) st.case_c_count++;
    munStats.set(mun, st);
  }

  const munsSorted = [...munStats.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'));
  const top20ByCount = [...munsSorted]
    .filter(([, s]) => s.case_c_count > 0)
    .sort((a, b) => {
      if (b[1].case_c_count !== a[1].case_c_count) return b[1].case_c_count - a[1].case_c_count;
      return a[0].localeCompare(b[0], 'en');
    })
    .slice(0, 20);

  const top20ByShare = [...munsSorted]
    .filter(([, s]) => s.substrate_count >= 25 && s.case_c_count > 0)
    .sort((a, b) => {
      const shareA = a[1].case_c_count / a[1].substrate_count;
      const shareB = b[1].case_c_count / b[1].substrate_count;
      if (shareB !== shareA) return shareB - shareA;
      return a[0].localeCompare(b[0], 'en');
    })
    .slice(0, 20);

  const phase1EdgesByType = new Map<string, number>();
  for (const e of phase1Edges ?? []) {
    if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
    const a = idNorm(e.a);
    const b = idNorm(e.b);
    if (!caseC.has(a) && !caseC.has(b)) continue;
    const type = (e.type && String(e.type).trim()) || 'unknown';
    phase1EdgesByType.set(type, (phase1EdgesByType.get(type) ?? 0) + 1);
  }

  const munPhase1Breakdown = new Map<string, Record<string, number>>();
  const focusMuns = new Set(['11428', '11304']);
  const top10ByCountMuns = new Set(top20ByCount.slice(0, 10).map(([m]) => m));
  const breakdownMuns = new Set([...focusMuns, ...top10ByCountMuns]);

  for (const mun of breakdownMuns) {
    const caseCInMun = new Set(caseCSorted.filter((s) => (munBySid.get(s) ?? '__unknown__') === mun));
    const typeCounts: Record<string, number> = {};
    for (const e of phase1Edges ?? []) {
      if (!e || typeof e.a !== 'string' || typeof e.b !== 'string') continue;
      const a = idNorm(e.a);
      const b = idNorm(e.b);
      if (!caseCInMun.has(a) && !caseCInMun.has(b)) continue;
      const type = (e.type && String(e.type).trim()) || 'unknown';
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
    munPhase1Breakdown.set(mun, typeCounts);
  }

  const N_SAMPLE = 10;
  const geometrySamples: Array<{
    municipality_id: string;
    sid: string;
    phase1_neighbor_count: number;
    bbox_dist_zero_count: number;
    min_bbox_dist: number;
    note: string;
  }> = [];

  for (const mun of ['11428', '11304']) {
    const caseCInMun = caseCSorted.filter((s) => (munBySid.get(s) ?? '__unknown__') === mun);
    const sampleSids = caseCInMun.slice(0, N_SAMPLE);
    for (const sid of sampleSids) {
      const neighbors = phase1NeighborsBySid.get(sid);
      const bb = bboxBySid.get(sid);
      if (!neighbors || !bb) {
        geometrySamples.push({
          municipality_id: mun,
          sid,
          phase1_neighbor_count: neighbors?.size ?? 0,
          bbox_dist_zero_count: 0,
          min_bbox_dist: -1,
          note: 'no_bbox_or_neighbors'
        });
        continue;
      }
      let bboxZero = 0;
      let minBboxDist = Infinity;
      for (const n of neighbors) {
        const nb = bboxBySid.get(n);
        if (!nb) continue;
        const d = bboxDistance(bb, nb);
        if (d === 0) bboxZero++;
        if (d < minBboxDist) minBboxDist = d;
      }
      geometrySamples.push({
        municipality_id: mun,
        sid,
        phase1_neighbor_count: neighbors.size,
        bbox_dist_zero_count: bboxZero,
        min_bbox_dist: minBboxDist === Infinity ? -1 : minBboxDist,
        note: 'diagnostic_evidence_only'
      });
    }
  }

  const phase1Degrees11428 = caseCSorted.filter((s) => (munBySid.get(s) ?? '') === '11428').map((s) => degreePhase1.get(s) ?? 0);
  const phase1Degrees11304 = caseCSorted.filter((s) => (munBySid.get(s) ?? '') === '11304').map((s) => degreePhase1.get(s) ?? 0);

  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
  const median = (arr: number[]) => {
    const s = sorted(arr);
    return s.length === 0 ? 0 : s[Math.floor(s.length / 2)];
  };

  const summary = {
    schema_version: 1,
    generated_by: 'scripts/map/quantify_case_c_mismatch_g3_5.ts',
    global: {
      settlements_in_substrate: substrateSids.size,
      v3_degree0_total: v3Degree0Total,
      v3_degree0_phase1_gt0: v3Degree0Phase1Gt0,
      v3_degree0_phase1_0: v3Degree0Phase1_0,
      unknown_to_substrate_count: unknownToSubstrate.size
    },
    top_20_municipalities_by_case_c_count: top20ByCount.map(([mun, s]) => ({
      municipality_id: mun,
      substrate_count: s.substrate_count,
      case_c_count: s.case_c_count,
      case_c_share: (s.case_c_count / s.substrate_count).toFixed(6)
    })),
    top_20_municipalities_by_case_c_share: top20ByShare.map(([mun, s]) => ({
      municipality_id: mun,
      substrate_count: s.substrate_count,
      case_c_count: s.case_c_count,
      case_c_share: (s.case_c_count / s.substrate_count).toFixed(6)
    })),
    case_c_phase1_edge_type_totals: Object.fromEntries(
      [...phase1EdgesByType.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))
    ),
    municipality_phase1_breakdown: Object.fromEntries(
      [...munPhase1Breakdown.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))
    ),
    focus_11428: {
      case_c_sids: caseCSorted.filter((s) => (munBySid.get(s) ?? '') === '11428'),
      phase1_degree_distribution: {
        min: phase1Degrees11428.length > 0 ? Math.min(...phase1Degrees11428) : 0,
        median: median(sorted(phase1Degrees11428)),
        max: phase1Degrees11428.length > 0 ? Math.max(...phase1Degrees11428) : 0
      },
      phase1_edge_type_composition: munPhase1Breakdown.get('11428') ?? {}
    },
    focus_11304: {
      case_c_sids: caseCSorted.filter((s) => (munBySid.get(s) ?? '') === '11304'),
      phase1_degree_distribution: {
        min: phase1Degrees11304.length > 0 ? Math.min(...phase1Degrees11304) : 0,
        median: median(sorted(phase1Degrees11304)),
        max: phase1Degrees11304.length > 0 ? Math.max(...phase1Degrees11304) : 0
      },
      phase1_edge_type_composition: munPhase1Breakdown.get('11304') ?? {}
    },
    geometry_evidence_fixed_sample: {
      note: 'diagnostic evidence only; does not define CASE C',
      samples: geometrySamples
    }
  };

  const jsonPath = resolve(outputDir, 'case_c_mismatch_summary_g3_5.json');
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');
  process.stdout.write(`Wrote ${jsonPath}\n`);

  const debugTopPath = resolve(debugDir, 'case_c_mismatch_munis_top_g3_5.json');
  writeFileSync(debugTopPath, JSON.stringify({ top20ByCount, top20ByShare }, null, 2), 'utf8');

  const debugSamplesPath = resolve(debugDir, 'case_c_mismatch_samples_11428_11304_g3_5.json');
  writeFileSync(debugSamplesPath, JSON.stringify({ geometry_evidence: geometrySamples }, null, 2), 'utf8');

  const lines: string[] = [
    'CASE C Mismatch Summary (Phase G3.5)',
    '====================================',
    'CASE C = v3 degree 0 AND Phase1 degree > 0 AND in substrate',
    '',
    'Global totals',
    '-------------',
    `settlements_in_substrate: ${summary.global.settlements_in_substrate}`,
    `v3_degree0_total: ${summary.global.v3_degree0_total}`,
    `v3_degree0_phase1_gt0 (CASE C count): ${summary.global.v3_degree0_phase1_gt0}`,
    `v3_degree0_phase1_0: ${summary.global.v3_degree0_phase1_0}`,
    `unknown_to_substrate_count: ${summary.global.unknown_to_substrate_count}`,
    '',
    'Top 20 municipalities by case_c_count',
    '-------------------------------------',
    'mun_id | substrate | case_c | share'
  ];

  for (const r of summary.top_20_municipalities_by_case_c_count) {
    lines.push(`  ${r.municipality_id} | ${r.substrate_count} | ${r.case_c_count} | ${r.case_c_share}`);
  }

  lines.push('');
  lines.push('Top 20 municipalities by case_c_share (substrate_count >= 25)');
  lines.push('----------------------------------------------------------------');
  lines.push('mun_id | substrate | case_c | share');
  for (const r of summary.top_20_municipalities_by_case_c_share) {
    lines.push(`  ${r.municipality_id} | ${r.substrate_count} | ${r.case_c_count} | ${r.case_c_share}`);
  }

  lines.push('');
  lines.push('Phase 1 edge type composition (CASE C aggregate)');
  lines.push('------------------------------------------------');
  for (const [typ, cnt] of Object.entries(summary.case_c_phase1_edge_type_totals)) {
    lines.push(`  ${typ}: ${cnt}`);
  }

  lines.push('');
  lines.push('Focus 11428');
  lines.push('-----------');
  lines.push(`case_c_sids: ${(summary.focus_11428.case_c_sids as string[]).join(', ')}`);
  lines.push(`phase1_degree: min=${summary.focus_11428.phase1_degree_distribution.min} median=${summary.focus_11428.phase1_degree_distribution.median} max=${summary.focus_11428.phase1_degree_distribution.max}`);
  lines.push('phase1_edge_types: ' + JSON.stringify(summary.focus_11428.phase1_edge_type_composition));

  lines.push('');
  lines.push('Focus 11304');
  lines.push('-----------');
  lines.push(`case_c_sids: ${(summary.focus_11304.case_c_sids as string[]).join(', ')}`);
  lines.push(`phase1_degree: min=${summary.focus_11304.phase1_degree_distribution.min} median=${summary.focus_11304.phase1_degree_distribution.median} max=${summary.focus_11304.phase1_degree_distribution.max}`);
  lines.push('phase1_edge_types: ' + JSON.stringify(summary.focus_11304.phase1_edge_type_composition));

  lines.push('');
  lines.push('Geometry evidence (diagnostic only, fixed sample N=10 per mun)');
  lines.push('----------------------------------------------------------------');
  lines.push(summary.geometry_evidence_fixed_sample.note);
  for (const s of geometrySamples) {
    lines.push(`  ${s.municipality_id} ${s.sid}: neighbors=${s.phase1_neighbor_count} bbox_dist_zero=${s.bbox_dist_zero_count} min_bbox_dist=${s.min_bbox_dist.toFixed(4)}`);
  }

  const txtPath = resolve(outputDir, 'case_c_mismatch_summary_g3_5.txt');
  writeFileSync(txtPath, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${txtPath}\n`);

  if (existsSync(dataIndexPath)) {
    try {
      const idx = JSON.parse(readFileSync(dataIndexPath, 'utf8'));
      if (idx.schema_version != null) process.stdout.write('data_index contract sanity: OK\n');
    } catch {
      process.stdout.write('data_index contract sanity: skip (read failed)\n');
    }
  }

  process.stdout.write(`\nCASE C count: ${v3Degree0Phase1Gt0}\n`);
}

main();
