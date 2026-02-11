/**
 * Phase D3: Trace and classify the 15 "census_not_in_index" settlements (audit-only).
 *
 * Determines for each missing census settlement whether it is (a) absent from substrate,
 * (b) present in substrate but omitted by index generator, or (c) present under an
 * alternate ID scheme (e.g. 3-part sid). No mechanics changes, no data regeneration.
 *
 * Inputs (read-only):
 *   - data/derived/settlements_index_1990.json
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson
 *   - data/source/bih_master.geojson (optional)
 *
 * Output: data/derived/_debug/phaseD3_trace_missing_census_settlements_report.txt
 *   Deterministic; no timestamps; stable sorted sections.
 *
 * Exit: non-zero ONLY if required inputs are unreadable or parsing fails.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseD3_trace_missing_census_settlements_report.txt');
const INSPECT_FEATURES = 200;
const MUN_KEY_CANDIDATES = ['municipality_id', 'mun_code', 'mun_id'];
const SID_KEY_CANDIDATES = ['sid', 'id', 'source_id'];
const MAX_ALT_SID_MATCHES = 3;


interface SettlementRecord {
  sid?: string;
  source_id?: string;
  mun_code?: string;
  mun?: string;
  name?: string;
  [k: string]: unknown;
}

interface SettlementsIndex {
  settlements?: SettlementRecord[];
  [k: string]: unknown;
}

interface CensusMunicipality {
  n?: string;
  s?: string[];
  [k: string]: unknown;
}

interface CensusFile {
  municipalities?: Record<string, CensusMunicipality>;
  [k: string]: unknown;
}

interface GeoFeature {
  type?: string;
  properties?: Record<string, unknown>;
  geometry?: unknown;
}

interface GeoJSONCollection {
  type?: string;
  features?: GeoFeature[];
  [k: string]: unknown;
}

type Bucket =
  | 'missing_everywhere'
  | 'present_in_substrate_only'
  | 'present_in_master_only'
  | 'present_under_alt_sid_in_index'
  | 'ambiguous';

function detectPropertyKeys(features: GeoFeature[], limit: number): { munKey: string | null; sidKey: string | null } {
  const keySet = new Set<string>();
  for (let i = 0; i < Math.min(features.length, limit); i++) {
    const p = features[i]?.properties ?? {};
    for (const k of Object.keys(p)) keySet.add(k);
  }
  const allKeys = [...keySet].sort();
  const munKey = allKeys.find((k) => MUN_KEY_CANDIDATES.includes(k)) ?? null;
  const sidKey = allKeys.find((k) => SID_KEY_CANDIDATES.includes(k)) ?? null;
  return { munKey, sidKey };
}

function featureMatches(
  props: Record<string, unknown>,
  munCode: string,
  sourceId: string,
  munKey: string | null,
  sidKey: string | null
): boolean {
  if (!munKey || !sidKey) return false;
  const mun = props[munKey];
  const sid = props[sidKey];
  return String(mun) === munCode && String(sid) === sourceId;
}

function recommendedAction(bucket: Bucket): string {
  switch (bucket) {
    case 'missing_everywhere':
      return 'upstream data gap';
    case 'present_in_substrate_only':
      return 'inspect generator filter';
    case 'present_in_master_only':
      return 'substrate derivation omission risk';
    case 'present_under_alt_sid_in_index':
      return 'add normalization rule';
    case 'ambiguous':
      return 'resolve by explicit schema rule';
    default:
      return 'unknown';
  }
}

async function main(): Promise<void> {
  const indexPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
  const censusPath = resolve(ROOT, 'data/source/bih_census_1991.json');
  const substratePath = resolve(ROOT, 'data/derived/settlements_substrate.geojson');
  const masterPath = resolve(ROOT, 'data/source/bih_master.geojson');

  if (!existsSync(indexPath) || !existsSync(censusPath) || !existsSync(substratePath)) {
    console.error('Missing required input: index, census, or substrate');
    process.exit(1);
  }

  let indexText: string;
  let censusText: string;
  let substrateText: string;
  try {
    [indexText, censusText, substrateText] = await Promise.all([
      readFile(indexPath, 'utf8'),
      readFile(censusPath, 'utf8'),
      readFile(substratePath, 'utf8')
    ]);
  } catch (err) {
    console.error('Failed to read input:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let indexData: SettlementsIndex;
  let censusData: CensusFile;
  let substrateData: GeoJSONCollection;
  try {
    indexData = JSON.parse(indexText) as SettlementsIndex;
    censusData = JSON.parse(censusText) as CensusFile;
    substrateData = JSON.parse(substrateText) as GeoJSONCollection;
  } catch (err) {
    console.error('Failed to parse input:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const settlements: SettlementRecord[] = Array.isArray(indexData.settlements) ? indexData.settlements : [];
  const indexSids = new Set<string>();
  for (const s of settlements) {
    const sid = typeof s.sid === 'string' && s.sid ? s.sid : '';
    if (sid) indexSids.add(sid);
  }

  const censusSids = new Set<string>();
  const censusMunName = new Map<string, string>();
  const municipalities = censusData.municipalities ?? {};
  for (const [munCode, mun] of Object.entries(municipalities).sort(([a], [b]) => a.localeCompare(b))) {
    const name = typeof mun.n === 'string' ? mun.n : '';
    const sArr = Array.isArray(mun.s) ? mun.s : [];
    for (const id of sArr) {
      const sid = `${munCode}:${String(id)}`;
      censusSids.add(sid);
      censusMunName.set(sid, name);
    }
  }

  const missing_census = [...censusSids].filter((id) => !indexSids.has(id)).sort();

  const substrateFeatures = Array.isArray(substrateData.features) ? substrateData.features : [];
  const { munKey: subMunKey, sidKey: subSidKey } = detectPropertyKeys(substrateFeatures, INSPECT_FEATURES);
  const substrateMatched = new Set<string>();
  for (const f of substrateFeatures) {
    const p = f.properties ?? {};
    for (const censusId of missing_census) {
      const [munCode, sourceId] = censusId.split(':');
      if (featureMatches(p, munCode, sourceId, subMunKey, subSidKey)) {
        substrateMatched.add(censusId);
        break;
      }
    }
  }

  let masterMatched = new Set<string>();
  let masterMunKey: string | null = null;
  let masterSidKey: string | null = null;
  if (existsSync(masterPath)) {
    try {
      const masterText = await readFile(masterPath, 'utf8');
      const masterData = JSON.parse(masterText) as GeoJSONCollection;
      const masterFeatures = Array.isArray(masterData.features) ? masterData.features : [];
      const settlementFeatures = masterFeatures.filter(
        (f) => (f.properties as Record<string, unknown>)?.layer === 'settlement'
      );
      const detected = detectPropertyKeys(settlementFeatures, INSPECT_FEATURES);
      masterMunKey = detected.munKey;
      masterSidKey = detected.sidKey;
      for (const f of settlementFeatures) {
        const p = f.properties ?? {};
        for (const censusId of missing_census) {
          const [munCode, sourceId] = censusId.split(':');
          if (featureMatches(p, munCode, sourceId, masterMunKey, masterSidKey)) {
            masterMatched.add(censusId);
            break;
          }
        }
      }
    } catch {
      masterMatched = new Set<string>();
    }
  }

  const indexAltMatches = new Map<string, string[]>();
  for (const censusId of missing_census) {
    const [munCode, sourceId] = censusId.split(':');
    const prefix = `${munCode}:`;
    const matches: string[] = [];
    for (const sid of indexSids) {
      const parts = sid.split(':');
      if (
        parts.length >= 3 &&
        parts[0] === munCode &&
        parts[1] === sourceId
      ) {
        matches.push(sid);
      }
    }
    matches.sort();
    indexAltMatches.set(censusId, matches.slice(0, MAX_ALT_SID_MATCHES));
  }

  const bucketCounts: Record<Bucket, number> = {
    missing_everywhere: 0,
    present_in_substrate_only: 0,
    present_in_master_only: 0,
    present_under_alt_sid_in_index: 0,
    ambiguous: 0
  };

  const classifications: Array<{
    census_id: string;
    mun_name: string;
    substrate_found: boolean;
    substrate_keys: string;
    master_found: boolean;
    master_keys: string;
    index_alt_matches: string[];
    bucket: Bucket;
    action: string;
  }> = [];

  for (const censusId of missing_census) {
    const subFound = substrateMatched.has(censusId);
    const masterFound = masterMatched.has(censusId);
    const altMatches = indexAltMatches.get(censusId) ?? [];
    const hasAltInIndex = altMatches.length >= 1;

    let bucket: Bucket;
    if (hasAltInIndex) {
      bucket = 'present_under_alt_sid_in_index';
    } else if (subFound && !masterFound) {
      bucket = 'present_in_substrate_only';
    } else if (masterFound && !subFound) {
      bucket = 'present_in_master_only';
    } else if (!subFound && !masterFound) {
      bucket = 'missing_everywhere';
    } else {
      bucket = 'ambiguous';
    }

    bucketCounts[bucket]++;

    const substrateKeys = subMunKey && subSidKey ? `mun=${subMunKey} sid=${subSidKey}` : 'none';
    const masterKeys =
      masterMunKey != null && masterSidKey != null ? `mun=${masterMunKey} sid=${masterSidKey}` : 'none';

    classifications.push({
      census_id: censusId,
      mun_name: censusMunName.get(censusId) ?? '',
      substrate_found: subFound,
      substrate_keys: substrateKeys,
      master_found: masterFound,
      master_keys: masterKeys,
      index_alt_matches: altMatches,
      bucket,
      action: recommendedAction(bucket)
    });
  }

  const lines: string[] = [];
  lines.push('Phase D3: Trace missing census settlements (census_not_in_index)');
  lines.push('');
  lines.push('SUMMARY_BY_BUCKET');
  lines.push('-----------------');
  for (const b of [
    'missing_everywhere',
    'present_in_substrate_only',
    'present_in_master_only',
    'present_under_alt_sid_in_index',
    'ambiguous'
  ] as Bucket[]) {
    lines.push(`${b}: ${bucketCounts[b]}`);
  }
  lines.push(`total_missing_census: ${missing_census.length}`);
  lines.push('');

  lines.push('PER_MISSING_ID');
  lines.push('---------------');
  for (const c of classifications) {
    lines.push(`census_id: ${c.census_id}`);
    lines.push(`census_municipality_name: ${c.mun_name}`);
    lines.push(`substrate_found: ${c.substrate_found}`);
    lines.push(`substrate_matched_property_keys: ${c.substrate_keys}`);
    lines.push(`master_found: ${c.master_found}`);
    lines.push(`master_matched_property_keys: ${c.master_keys}`);
    lines.push(`index_alt_sid_matches: ${c.index_alt_matches.length}`);
    for (const m of c.index_alt_matches) {
      lines.push(`  ${m}`);
    }
    lines.push(`bucket: ${c.bucket}`);
    lines.push(`recommended_next_action: ${c.action}`);
    lines.push('');
  }

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log('Phase D3 trace missing census settlements');
  console.log('------------------------------------------');
  console.log(`total_missing_census: ${missing_census.length}`);
  for (const b of [
    'missing_everywhere',
    'present_in_substrate_only',
    'present_in_master_only',
    'present_under_alt_sid_in_index',
    'ambiguous'
  ] as Bucket[]) {
    console.log(`  ${b}: ${bucketCounts[b]}`);
  }
  console.log(`Report: ${REPORT_PATH}`);

  if (bucketCounts.present_under_alt_sid_in_index > 0) {
    console.log('');
    console.log(
      'docs/FORAWWV.md may require an addendum about settlement ID scheme normalization (2-part vs 3-part sid). Do NOT auto-edit.'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
