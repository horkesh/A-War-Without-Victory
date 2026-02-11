/**
 * Phase H5.2: Settlement contact graph coverage audit.
 *
 * Compares substrate roster vs contact graph nodes to diagnose coverage gaps.
 * Special focus on han_pijesak (mun1990_id) for municipality adjacency isolation.
 *
 * Usage: npm run map:audit:contact-graph-coverage:h5_2
 *   or: tsx scripts/map/audit_settlement_contact_graph_coverage_h5_2.ts
 *
 * Outputs:
 *   - data/derived/h5_2_contact_graph_coverage.json
 *   - data/derived/h5_2_contact_graph_coverage.txt
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCanonicalMun1990RegistryPath } from './_shared/mun1990_registry_selector.js';


const DERIVED_DIR = resolve('data/derived');
const SUBSTRATE_PATH = resolve(DERIVED_DIR, 'settlements_substrate.geojson');
const CONTACT_PATH = resolve(DERIVED_DIR, 'settlement_contact_graph.json');
const POLITICAL_PATH = resolve(DERIVED_DIR, 'political_control_data.json');
const REGISTRY_PATH = getCanonicalMun1990RegistryPath(resolve());
const OUTPUT_JSON = resolve(DERIVED_DIR, 'h5_2_contact_graph_coverage.json');
const OUTPUT_TXT = resolve(DERIVED_DIR, 'h5_2_contact_graph_coverage.txt');

function toCanonicalSid(s: string): string {
  const n = String(s).replace(/^S/i, '').trim();
  return /^\d+$/.test(n) ? 'S' + n : String(s).trim();
}

function extractNumericSid(sid: string): number {
  const m = String(sid).match(/^S?(\d+)$/i);
  return m ? parseInt(m[1], 10) : NaN;
}

function main(): void {
  mkdirSync(DERIVED_DIR, { recursive: true });

  if (!existsSync(SUBSTRATE_PATH)) {
    process.stderr.write(`ERROR: Substrate not found: ${SUBSTRATE_PATH}\n`);
    process.exit(1);
  }
  if (!existsSync(CONTACT_PATH)) {
    process.stderr.write(`ERROR: Contact graph not found: ${CONTACT_PATH}\n`);
    process.exit(1);
  }

  // Load registry (109 mun1990_ids)
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as {
    rows?: Array<{ mun1990_id: string }>;
  };
  const mun1990Ids = (registry.rows ?? []).map((r) => r.mun1990_id).sort((a, b) => a.localeCompare(b));

  // Load substrate roster (stream-like: iterate features)
  process.stdout.write('Loading substrate roster...\n');
  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as {
    features?: Array<{
      properties?: Record<string, unknown>;
    }>;
  };
  const substrateRoster: Array<{
    sid: string;
    sidCanonical: string;
    municipality_id: string;
    mun1990_id: string | null;
  }> = [];

  const aggPath = resolve(DERIVED_DIR, 'municipality_agg_post1995.json');
  const mun1990NamesPath = resolve(DERIVED_DIR, 'mun1990_names.json');
  let byPost1995: Record<string, { mun1990_id: string }> = {};
  let mun1990Names: { by_municipality_id?: Record<string, { mun1990_id?: string }> } = {};
  if (existsSync(aggPath)) {
    const agg = JSON.parse(readFileSync(aggPath, 'utf8')) as { by_municipality_id?: Record<string, { mun1990_id: string }> };
    byPost1995 = agg.by_municipality_id ?? {};
  }
  if (existsSync(mun1990NamesPath)) {
    mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8'));
  }
  const registrySet = new Set(mun1990Ids);
  const MUN1990_NORMALIZE: Record<string, string> = { hanpijesak: 'han_pijesak' };

  for (const f of substrate.features ?? []) {
    const props = f.properties ?? {};
    const sidRaw = props.sid ?? props.census_id;
    if (sidRaw == null) continue;
    const sidStr = String(sidRaw).trim();
    const sidCanonical = toCanonicalSid(sidStr);
    const munId = props.municipality_id ?? props.muni_id ?? props.opstina_id;
    const munIdStr = munId != null ? String(munId).trim() : '';
    let mun1990: string | null = null;
    const mun1990FromFeature = props.mun1990_id ?? props.mun1990_municipality_id;
    if (mun1990FromFeature != null && typeof mun1990FromFeature === 'string') {
      mun1990 = MUN1990_NORMALIZE[mun1990FromFeature] ?? mun1990FromFeature;
    } else if (munIdStr && byPost1995[munIdStr]) {
      const raw = byPost1995[munIdStr].mun1990_id;
      mun1990 = MUN1990_NORMALIZE[raw] ?? raw;
    } else if (munIdStr && mun1990Names.by_municipality_id?.[munIdStr]?.mun1990_id) {
      const raw = mun1990Names.by_municipality_id[munIdStr].mun1990_id!;
      mun1990 = MUN1990_NORMALIZE[raw] ?? raw;
    }
    if (mun1990 && !registrySet.has(mun1990)) mun1990 = null;
    substrateRoster.push({ sid: sidStr, sidCanonical, municipality_id: munIdStr, mun1990_id: mun1990 });
  }

  const substrateSids = new Set(substrateRoster.map((r) => r.sidCanonical));
  const sidToMun1990 = new Map<string, string>();
  for (const r of substrateRoster) {
    if (r.mun1990_id) sidToMun1990.set(r.sidCanonical, r.mun1990_id);
  }

  process.stdout.write(`  Substrate roster: ${substrateRoster.length} settlements\n`);

  // Load contact graph nodes (from nodes array and edge endpoints)
  const contact = JSON.parse(readFileSync(CONTACT_PATH, 'utf8')) as {
    nodes?: Array<{ sid?: string }>;
    edges?: Array<{ a?: string; b?: string }>;
  };
  const nodesFromArray = new Set<string>();
  for (const n of contact.nodes ?? []) {
    if (n?.sid) nodesFromArray.add(toCanonicalSid(n.sid));
  }
  const nodesFromEdges = new Set<string>();
  for (const e of contact.edges ?? []) {
    if (e?.a) nodesFromEdges.add(toCanonicalSid(e.a));
    if (e?.b) nodesFromEdges.add(toCanonicalSid(e.b));
  }
  const contactGraphNodes = new Set<string>([...nodesFromArray, ...nodesFromEdges]);
  process.stdout.write(`  Contact graph nodes (from nodes+edges): ${contactGraphNodes.size}\n`);

  // Load ungraphed from political_control_data
  let ungraphedSet = new Set<string>();
  if (existsSync(POLITICAL_PATH)) {
    const pc = JSON.parse(readFileSync(POLITICAL_PATH, 'utf8')) as { ungraphed_settlement_ids?: string[] };
    const ungraphedIds = pc.ungraphed_settlement_ids ?? [];
    for (const key of ungraphedIds) {
      const m = key.match(/^(\d+):(\d+)$/);
      if (m) ungraphedSet.add('S' + m[2]);
    }
  }

  const missingFromGraph: string[] = [];
  for (const r of substrateRoster) {
    const canon = r.sidCanonical;
    const inNodes = contactGraphNodes.has(canon);
    const alt1 = canon.startsWith('S') ? canon.slice(1) : 'S' + canon.replace(/^S/i, '');
    const inNodesAlt = contactGraphNodes.has(alt1);
    if (!inNodes && !inNodesAlt) {
      missingFromGraph.push(canon);
    }
  }
  missingFromGraph.sort((a, b) => extractNumericSid(a) - extractNumericSid(b));

  const percentMissing =
    substrateRoster.length > 0 ? (missingFromGraph.length / substrateRoster.length) * 100 : 0;

  // By mun1990_id
  const byMun: Record<
    string,
    {
      settlement_count_substrate: number;
      settlement_count_in_graph: number;
      missing_count: number;
      missing_sids_first_20: string[];
      is_fully_missing: boolean;
    }
  > = {};

  for (const mid of mun1990Ids) {
    const substrateSidsForMun = substrateRoster.filter((r) => r.mun1990_id === mid);
    const inGraphSids = substrateSidsForMun.filter((r) => {
      const c = r.sidCanonical;
      return contactGraphNodes.has(c) || contactGraphNodes.has(c.startsWith('S') ? c.slice(1) : 'S' + c);
    });
    const missingForMun = substrateSidsForMun
      .filter((r) => {
        const c = r.sidCanonical;
        return !contactGraphNodes.has(c) && !contactGraphNodes.has(c.startsWith('S') ? c.slice(1) : 'S' + c);
      })
      .map((r) => r.sidCanonical)
      .sort((a, b) => extractNumericSid(a) - extractNumericSid(b));

    byMun[mid] = {
      settlement_count_substrate: substrateSidsForMun.length,
      settlement_count_in_graph: inGraphSids.length,
      missing_count: missingForMun.length,
      missing_sids_first_20: missingForMun.slice(0, 20),
      is_fully_missing: substrateSidsForMun.length > 0 && inGraphSids.length === 0,
    };
  }

  // Special focus: han_pijesak
  const hanPijesakMissing = byMun['han_pijesak']?.missing_sids_first_20 ?? [];
  const hanPijesakSubstrate = substrateRoster.filter((r) => r.mun1990_id === 'han_pijesak');
  const hanPijesakMissingFull = hanPijesakSubstrate
    .filter((r) => {
      const c = r.sidCanonical;
      return !contactGraphNodes.has(c) && !contactGraphNodes.has(c.startsWith('S') ? c.slice(1) : 'S' + c);
    })
    .map((r) => ({
      sid: r.sidCanonical,
      municipality_id: r.municipality_id,
      in_ungraphed: ungraphedSet.has(r.sidCanonical) || ungraphedSet.has('S' + r.sidCanonical.replace(/^S/i, '')),
    }))
    .sort((a, b) => extractNumericSid(a.sid) - extractNumericSid(b.sid));

  const report = {
    awwv_meta: { role: 'h5_2_contact_graph_coverage', version: 'h5_2' },
    contact_graph_path: CONTACT_PATH,
    node_key_type: 'S-prefixed string (e.g. S228036)',
    node_roster_source: 'Phase 1: nodes array + edge endpoints from substrate',
    global: {
      total_settlements_in_substrate: substrateRoster.length,
      total_nodes_in_contact_graph: contactGraphNodes.size,
      missing_from_graph_count: missingFromGraph.length,
      missing_from_graph_sids_first_50: missingFromGraph.slice(0, 50),
      percent_missing: Math.round(percentMissing * 100) / 100,
    },
    by_mun1990_id: byMun,
    han_pijesak_focus: {
      settlement_count_substrate: hanPijesakSubstrate.length,
      settlement_count_in_graph: byMun['han_pijesak']?.settlement_count_in_graph ?? 0,
      missing_count: hanPijesakMissingFull.length,
      missing_sids_full_list: hanPijesakMissingFull.map((x) => x.sid),
      missing_details: hanPijesakMissingFull,
      in_contact_graph_nodes_array: hanPijesakSubstrate.map((r) => {
        const c = r.sidCanonical;
        return contactGraphNodes.has(c) || nodesFromArray.has(c);
      }),
    },
  };

  writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_JSON}\n`);

  const txtLines: string[] = [
    'H5.2 Contact Graph Coverage Audit',
    '',
    'GLOBAL',
    `  total_settlements_in_substrate: ${report.global.total_settlements_in_substrate}`,
    `  total_nodes_in_contact_graph: ${report.global.total_nodes_in_contact_graph}`,
    `  missing_from_graph_count: ${report.global.missing_from_graph_count}`,
    `  percent_missing: ${report.global.percent_missing}%`,
    '',
    'MUNICIPALITIES FULLY MISSING (in_graph==0, substrate>0)',
    ...Object.entries(byMun)
      .filter(([, v]) => v.is_fully_missing)
      .map(([k]) => `  ${k}`),
    '',
    'HAN_PIJESAK',
    `  settlement_count_substrate: ${report.han_pijesak_focus.settlement_count_substrate}`,
    `  settlement_count_in_graph: ${report.han_pijesak_focus.settlement_count_in_graph}`,
    `  missing_count: ${report.han_pijesak_focus.missing_count}`,
    `  missing_sids: ${report.han_pijesak_focus.missing_sids_full_list.join(', ')}`,
  ];
  writeFileSync(OUTPUT_TXT, txtLines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_TXT}\n`);
}

main();
