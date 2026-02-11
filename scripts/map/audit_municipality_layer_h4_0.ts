/**
 * Phase H4.0: Municipality layer audit (deterministic, audit-only).
 *
 * Inputs: settlements_substrate.geojson, political_control_data.json, mun1990_names.json,
 *         municipality_post1995_to_mun1990.json, optionally bih_census_1991.json.
 * Outputs: data/derived/h4_0_municipality_audit.json and .txt (stable ordering, no timestamps).
 *
 * Usage: npm run map:audit:municipality-layer:h4_0
 *   or: tsx scripts/map/audit_municipality_layer_h4_0.ts
 */

import { readFileSync, writeFileSync, existsSync, createReadStream } from 'node:fs';
import { resolve } from 'node:path';


const FEATURES_ARRAY_START = '"features":[';
const FEATURES_MARKER = '"features":';

function findFeaturesArrayStart(buffer: string): number {
  const idx = buffer.indexOf(FEATURES_ARRAY_START);
  if (idx !== -1) return idx + FEATURES_ARRAY_START.length;
  const idx2 = buffer.indexOf(FEATURES_MARKER + ' [');
  if (idx2 !== -1) return idx2 + FEATURES_MARKER.length + 2;
  return -1;
}

function extractNextFeature(buffer: string, start: number): { objectString: string; nextIndex: number } | null {
  let pos = start;
  while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
  if (pos >= buffer.length || buffer[pos] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  const begin = pos;
  for (; pos < buffer.length; pos++) {
    const c = buffer[pos];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return { objectString: buffer.slice(begin, pos + 1), nextIndex: pos + 1 };
      continue;
    }
  }
  return null;
}

interface SubstrateRow {
  municipality_id: string;
  mun1990_id: string | null;
  controlKey: string;
}

function streamSubstrateRows(geojsonPath: string): Promise<SubstrateRow[]> {
  const rows: SubstrateRow[] = [];
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        resolvePromise(rows);
      }
    };
    const processBuffer = (): void => {
      if (featuresStart === -1) {
        featuresStart = findFeaturesArrayStart(buffer);
        if (featuresStart === -1) return;
        pos = featuresStart;
      }
      while (pos < buffer.length) {
        const extracted = extractNextFeature(buffer, pos);
        if (!extracted) return;
        pos = extracted.nextIndex;
        try {
          const feature = JSON.parse(extracted.objectString) as { id?: string; properties?: Record<string, unknown> };
          const props = feature?.properties ?? {};
          const sidRaw = props.sid ?? feature?.id;
          if (sidRaw == null) continue;
          let numeric_sid: string;
          if (typeof sidRaw === 'string' && /^S\d+$/.test(sidRaw)) {
            numeric_sid = sidRaw.slice(1);
          } else if (typeof sidRaw === 'string' && sidRaw.includes(':')) {
            numeric_sid = sidRaw.split(':')[1] ?? String(sidRaw).replace(/^S/i, '');
          } else {
            numeric_sid = String(sidRaw).replace(/^S/i, '');
          }
          const munId = props.municipality_id ?? props.mun1990_municipality_id ?? props.opstina_id ?? props.muni_id;
          if (munId == null || typeof munId !== 'string') continue;
          const municipality_id = String(munId).trim();
          const mun1990Raw = props.mun1990_id ?? props.mun1990_municipality_id;
          const mun1990_id = mun1990Raw != null && typeof mun1990Raw === 'string' ? String(mun1990Raw).trim() : null;
          const controlKey = `${municipality_id}:${numeric_sid}`;
          rows.push({ municipality_id, mun1990_id, controlKey });
        } catch {
          /* skip */
        }
        while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
        if (pos < buffer.length && buffer[pos] === ']') {
          finish();
          return;
        }
      }
    };
    const stream = createReadStream(geojsonPath, { encoding: 'utf8', highWaterMark: 256 * 1024 });
    stream.on('data', (chunk: string) => { buffer += chunk; processBuffer(); });
    stream.on('end', () => { processBuffer(); finish(); });
    stream.on('error', rejectPromise);
  });
}

/** Stable numeric sort for municipality_id (e.g. "10014", "10227") */
function sortMunicipalityIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

async function main(): Promise<void> {
  const derivedDir = resolve('data/derived');
  const sourceDir = resolve('data/source');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const controlPath = resolve(derivedDir, 'political_control_data.json');
  const mun1990NamesPath = resolve(derivedDir, 'mun1990_names.json');
  const remapPath = resolve(sourceDir, 'municipality_post1995_to_mun1990.json');
  const censusPath = resolve(sourceDir, 'bih_census_1991.json');
  const ethnicityPath = resolve(derivedDir, 'settlement_ethnicity_data.json');

  const outJson = resolve(derivedDir, 'h4_0_municipality_audit.json');
  const outTxt = resolve(derivedDir, 'h4_0_municipality_audit.txt');

  if (!existsSync(substratePath)) {
    process.stderr.write(`FAIL: substrate not found: ${substratePath}\n`);
    process.exit(1);
  }

  const rows = await streamSubstrateRows(substratePath);
  const municipalityIds = sortMunicipalityIds([...new Set(rows.map((r) => r.municipality_id))]);

  const byMun: Record<string, { settlement_count: number; mun1990_ids: Set<string>; controlKeys: string[] }> = {};
  for (const mid of municipalityIds) {
    byMun[mid] = { settlement_count: 0, mun1990_ids: new Set(), controlKeys: [] };
  }
  for (const r of rows) {
    byMun[r.municipality_id].settlement_count++;
    byMun[r.municipality_id].controlKeys.push(r.controlKey);
    if (r.mun1990_id) byMun[r.municipality_id].mun1990_ids.add(r.mun1990_id);
  }

  let controlData: {
    by_settlement_id?: Record<string, string | null>;
    meta?: { control_missing_keys?: number };
    ungraphed_settlement_ids?: string[];
  } = {};
  if (existsSync(controlPath)) {
    controlData = JSON.parse(readFileSync(controlPath, 'utf8')) as typeof controlData;
  }
  const by_settlement_id = controlData.by_settlement_id ?? {};
  const ungraphedSet = new Set(controlData.ungraphed_settlement_ids ?? []);

  let mun1990Names: { by_municipality_id?: Record<string, { display_name?: string; mun1990_id?: string }> } = {};
  if (existsSync(mun1990NamesPath)) {
    mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as typeof mun1990Names;
  }

  let remapIndex: Record<string, string> = {};
  if (existsSync(remapPath)) {
    const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as { index_by_post1995_code?: Record<string, string> };
    remapIndex = remap.index_by_post1995_code ?? {};
  }

  const municipalities: Array<{
    municipality_id: string;
    mun1990_id: string | null;
    display_name: string | null;
    settlement_count_total: number;
    settlement_count_in_graph: number;
    settlement_count_ungraphed: number;
    control_counts: { RBiH: number; RS: number; HRHB: number; null: number };
    share_of_null: number;
    ethnic_majority_top3?: Array<{ majority: string; count: number }>;
    flags: { name_missing: boolean; mun1990_missing: boolean; mun1990_conflict: boolean; control_null_gt_0: boolean; ungraphed_gt_0: boolean };
  }> = [];

  let ethnicityBySid: Record<string, { majority?: string }> = {};
  if (existsSync(ethnicityPath)) {
    const eth = JSON.parse(readFileSync(ethnicityPath, 'utf8')) as { by_settlement_id?: Record<string, { majority?: string }> };
    ethnicityBySid = eth.by_settlement_id ?? {};
  }

  for (const mid of municipalityIds) {
    const rec = byMun[mid];
    const controlKeys = rec.controlKeys;
    const ungraphedCount = controlKeys.filter((k) => ungraphedSet.has(k)).length;
    const inGraphCount = controlKeys.length - ungraphedCount;

    const control_counts = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
    for (const k of controlKeys) {
      const v = by_settlement_id[k] ?? null;
      const key = v === null ? 'null' : v;
      if (key in control_counts) (control_counts as Record<string, number>)[key]++;
    }
    const totalControl = controlKeys.length;
    const share_of_null = totalControl > 0 ? (control_counts.null / totalControl) * 100 : 0;

    const displayFromNames = mun1990Names.by_municipality_id?.[mid]?.display_name ?? null;
    const displayFromRemap = remapIndex[mid] ?? null;
    const display_name = displayFromNames ?? displayFromRemap ?? null;

    const mun1990Observed = [...rec.mun1990_ids];
    const mun1990_id = mun1990Observed.length === 1 ? mun1990Observed[0]! : mun1990Observed.length > 1 ? null : null;
    const mun1990_conflict = mun1990Observed.length > 1;
    const mun1990_missing = mun1990Observed.length === 0;
    const name_missing = display_name == null || display_name === '';
    const control_null_gt_0 = control_counts.null > 0;
    const ungraphed_gt_0 = ungraphedCount > 0;

    let ethnic_majority_top3: Array<{ majority: string; count: number }> | undefined;
    if (Object.keys(ethnicityBySid).length > 0) {
      const counts: Record<string, number> = {};
      for (const k of controlKeys) {
        const numericSid = k.split(':')[1];
        const sid = numericSid ? `S${numericSid}` : k;
        const majority = ethnicityBySid[sid]?.majority ?? 'unknown';
        counts[majority] = (counts[majority] ?? 0) + 1;
      }
      ethnic_majority_top3 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([majority, count]) => ({ majority, count }));
    }

    municipalities.push({
      municipality_id: mid,
      mun1990_id: mun1990_conflict ? null : (mun1990Observed[0] ?? null),
      display_name,
      settlement_count_total: rec.settlement_count,
      settlement_count_in_graph: inGraphCount,
      settlement_count_ungraphed: ungraphedCount,
      control_counts,
      share_of_null: Math.round(share_of_null * 100) / 100,
      ethnic_majority_top3,
      flags: {
        name_missing,
        mun1990_missing,
        mun1990_conflict,
        control_null_gt_0,
        ungraphed_gt_0,
      },
    });
  }

  const missingFromMun1990Names = municipalityIds.filter((id) => !mun1990Names.by_municipality_id?.[id]);
  const missingFromRemap = municipalityIds.filter((id) => !(id in remapIndex));
  const nameMismatch: string[] = [];
  for (const mid of municipalityIds) {
    const fromNames = mun1990Names.by_municipality_id?.[mid]?.display_name;
    const fromRemap = remapIndex[mid];
    if (fromNames != null && fromRemap != null && fromNames !== fromRemap) nameMismatch.push(mid);
  }

  const mun1990IdsRepresented = new Set<string>();
  for (const m of municipalities) {
    if (m.mun1990_id) mun1990IdsRepresented.add(m.mun1990_id);
    for (const fid of byMun[m.municipality_id].mun1990_ids) mun1990IdsRepresented.add(fid);
  }

  let censusAvailable = false;
  let censusSettlementCount = 0;
  if (existsSync(censusPath)) {
    try {
      const census = JSON.parse(readFileSync(censusPath, 'utf8')) as { settlements?: Record<string, unknown> };
      censusAvailable = true;
      censusSettlementCount = census.settlements ? Object.keys(census.settlements).length : 0;
    } catch {
      /* ignore */
    }
  }

  const audit = {
    meta: {
      phase: 'H4.0',
      census_available: censusAvailable,
      census_settlement_count: censusSettlementCount,
    },
    global: {
      municipality_ids_in_substrate: municipalityIds.length,
      mun1990_ids_represented: mun1990IdsRepresented.size,
      municipality_ids_missing_from_mun1990_names: missingFromMun1990Names.length,
      municipality_ids_missing_from_mun1990_names_list: sortMunicipalityIds(missingFromMun1990Names).slice(0, 20),
      municipality_ids_missing_from_post1995_mapping: missingFromRemap.length,
      municipality_ids_missing_from_mapping_list: sortMunicipalityIds(missingFromRemap).slice(0, 20),
      municipality_ids_name_mismatch: nameMismatch.length,
      municipality_ids_name_mismatch_list: sortMunicipalityIds(nameMismatch).slice(0, 20),
    },
    municipalities,
  };

  writeFileSync(outJson, JSON.stringify(audit, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outJson}\n`);

  const lines: string[] = [
    'Phase H4.0 Municipality Layer Audit',
    '',
    'Global:',
    `  municipality_ids in substrate: ${audit.global.municipality_ids_in_substrate}`,
    `  mun1990_ids represented: ${audit.global.mun1990_ids_represented}`,
    `  missing from mun1990_names: ${audit.global.municipality_ids_missing_from_mun1990_names}`,
    `  missing from post1995 mapping: ${audit.global.municipality_ids_missing_from_post1995_mapping}`,
    `  name mismatch (names vs mapping): ${audit.global.municipality_ids_name_mismatch}`,
    `  census_available: ${audit.meta.census_available}, census_settlement_count: ${audit.meta.census_settlement_count}`,
    '',
    'Per municipality (stable-sorted by municipality_id):',
  ];
  for (const m of municipalities) {
    lines.push(
      `  ${m.municipality_id} | ${m.display_name ?? '(missing)'} | mun1990: ${m.mun1990_id ?? '(missing/conflict)'} | ` +
        `settlements: ${m.settlement_count_total} (in_graph: ${m.settlement_count_in_graph}, ungraphed: ${m.settlement_count_ungraphed}) | ` +
        `control RBiH=${m.control_counts.RBiH} RS=${m.control_counts.RS} HRHB=${m.control_counts.HRHB} null=${m.control_counts.null} | ` +
        `null%=${m.share_of_null} | flags: name_missing=${m.flags.name_missing} mun1990_missing=${m.flags.mun1990_missing} mun1990_conflict=${m.flags.mun1990_conflict} control_null_gt_0=${m.flags.control_null_gt_0} ungraphed_gt_0=${m.flags.ungraphed_gt_0}`
    );
  }
  writeFileSync(outTxt, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${outTxt}\n`);
}

main().then(
  () => {},
  (err) => {
    process.stderr.write(String(err));
    process.exit(1);
  }
);
