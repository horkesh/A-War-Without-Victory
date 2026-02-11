/**
 * Phase H6.9.5 — Audit NW overlay membership and municipality ID regime (Bihać/Cazin)
 *
 * PURPOSE:
 *   Determine deterministically which mapping is wrong when overlay-from-substrate
 *   is mislocated: (A) settlements_substrate.geojson municipality_id values,
 *   (B) settlements_index_1990 sid→mun1990_id mapping, (C) join key (sid vs census_id),
 *   (D) assumption about substrate municipality_id (post-1995 vs mun1990).
 *
 * INPUTS (read-only):
 *   - data/derived/settlements_substrate.geojson
 *   - data/derived/settlements_index_1990.json
 *   - data/derived/municipalities_1990_registry_110.json
 *   - data/source/bih_census_1991.json (cross-check expected settlement lists)
 *
 * OUTPUTS (untracked, deterministic, no timestamps):
 *   - data/derived/_debug/nw_overlay_membership_audit_h6_9_5.json
 *   - data/derived/_debug/nw_overlay_membership_audit_h6_9_5.txt
 *   - data/derived/_debug/nw_overlay_mismatch_overlay_h6_9_5.geojson (ONLY mismatched)
 *
 * Usage: npx tsx scripts/map/phase_h6_9_5_audit_nw_overlay_membership.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const INDEX_1990_PATH = resolve(DERIVED, 'settlements_index_1990.json');
const REGISTRY_PATH = resolve(SOURCE, 'municipalities_1990_registry_110.json');
const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');

const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'nw_overlay_membership_audit_h6_9_5.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'nw_overlay_membership_audit_h6_9_5.txt');
const MISMATCH_GEOJSON_PATH = resolve(DEBUG_DIR, 'nw_overlay_mismatch_overlay_h6_9_5.geojson');

const EXAMPLE_N = 15;

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name?: string;
}

interface Index1990Settlement {
  sid: string;
  mun1990_id?: string | null;
  mun?: string | null;
  mun_code?: string | null;
  source_id?: string | null;
  [key: string]: unknown;
}

interface Index1990 {
  settlements?: Index1990Settlement[];
}

interface CensusMunicipality {
  n: string;
  s: string[];
  p?: number[];
}

interface CensusData {
  metadata?: { municipality_count?: number };
  municipalities?: Record<string, CensusMunicipality>;
}

function settlementIdFromFeature(f: GeoJSONFeature): string {
  const sid = f.properties?.sid as string | undefined;
  const censusId = f.properties?.census_id as string | undefined;
  if (sid) return sid;
  if (censusId) return 'S' + censusId;
  return '';
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing input:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(INDEX_1990_PATH)) {
    console.error('Missing input:', INDEX_1990_PATH);
    process.exit(1);
  }
  if (!existsSync(REGISTRY_PATH)) {
    console.error('Missing input:', REGISTRY_PATH);
    process.exit(1);
  }
  if (!existsSync(CENSUS_PATH)) {
    console.error('Missing input:', CENSUS_PATH);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as { rows?: RegistryRow[] };
  const rows = registry.rows || [];
  const nameToCanonical = new Map<string, string>();
  for (const r of rows) {
    nameToCanonical.set(r.mun1990_id, r.mun1990_id);
    nameToCanonical.set(r.name, r.mun1990_id);
    if (r.normalized_name) nameToCanonical.set(r.normalized_name, r.mun1990_id);
  }

  const cazinCanonical = nameToCanonical.get('Cazin') ?? nameToCanonical.get('cazin');
  const bihacCanonical = nameToCanonical.get('Bihać') ?? nameToCanonical.get('Bihac') ?? nameToCanonical.get('bihac');
  if (!cazinCanonical || !bihacCanonical) {
    console.error('Bihać or Cazin mun1990_id could not be determined from registry. STOP.');
    process.exit(1);
  }

  const index1990 = JSON.parse(readFileSync(INDEX_1990_PATH, 'utf8')) as Index1990;
  const settlements = index1990.settlements || [];
  const sidToMun1990 = new Map<string, string>();
  const sidToMunCode = new Map<string, string>();
  const munCodeToCanonical = new Map<string, string>();
  for (const s of settlements) {
    const sid = s.sid;
    const raw = s.mun1990_id ?? s.mun ?? null;
    const munCode = s.mun_code != null ? String(s.mun_code) : null;
    if (raw != null) {
      const canon = nameToCanonical.get(raw as string) ?? (typeof raw === 'string' && /^[a-z0-9_]+$/.test(raw) ? raw : null);
      if (canon) {
        sidToMun1990.set(sid, canon);
        if (munCode) munCodeToCanonical.set(munCode, canon);
      }
    }
    if (munCode) sidToMunCode.set(sid, munCode);
  }

  const targetMunIds = new Set<string>([bihacCanonical, cazinCanonical]);
  const bihacMunCode = Array.from(munCodeToCanonical.entries()).find(([, c]) => c === bihacCanonical)?.[0];
  const cazinMunCode = Array.from(munCodeToCanonical.entries()).find(([, c]) => c === cazinCanonical)?.[0];
  const targetMunCodes = new Set<string>();
  if (bihacMunCode) targetMunCodes.add(bihacMunCode);
  if (cazinMunCode) targetMunCodes.add(cazinMunCode);

  const census = JSON.parse(readFileSync(CENSUS_PATH, 'utf8')) as CensusData;
  const censusMunis = census.municipalities || {};
  const censusKeys = new Set(Object.keys(censusMunis));
  const SET_3_bihac = new Set<string>(bihacMunCode ? (censusMunis[bihacMunCode]?.s || []) : []);
  const SET_3_cazin = new Set<string>(cazinMunCode ? (censusMunis[cazinMunCode]?.s || []) : []);

  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const distinctSubstrateMunIds = new Map<string, number>();
  const perFeature: Array<{
    f: GeoJSONFeature;
    sid: string;
    census_id: string | null;
    municipality_id: string | null;
    index_key: string;
    mun1990_from_index: string | null;
    in_SET_1: boolean;
    in_SET_2: boolean;
    in_SET_3: boolean;
    target_name: string | null;
  }> = [];

  for (const f of substrate.features) {
    const props = f.properties || {};
    const sid = (props.sid as string) ?? '';
    const censusId = props.census_id != null ? String(props.census_id) : (sid ? sid.replace(/^S/, '') : null);
    const municipalityId = props.municipality_id != null ? String(props.municipality_id) : (props.mun_code != null ? String(props.mun_code) : null);

    if (municipalityId != null) {
      distinctSubstrateMunIds.set(municipalityId, (distinctSubstrateMunIds.get(municipalityId) ?? 0) + 1);
    }

    const indexKey = municipalityId != null && censusId != null ? municipalityId + ':' + censusId : '';
    const mun1990FromIndex = indexKey ? (sidToMun1990.get(indexKey) ?? null) : null;
    const in_SET_2 = mun1990FromIndex != null && targetMunIds.has(mun1990FromIndex);
    const in_SET_1 = municipalityId != null && targetMunCodes.has(municipalityId);
    const in_SET_3 =
      (censusId != null && SET_3_bihac.has(censusId)) || (censusId != null && SET_3_cazin.has(censusId));

    let target_name: string | null = null;
    if (mun1990FromIndex === bihacCanonical) target_name = 'Bihać';
    else if (mun1990FromIndex === cazinCanonical) target_name = 'Cazin';

    perFeature.push({
      f,
      sid,
      census_id: censusId,
      municipality_id: municipalityId,
      index_key: indexKey,
      mun1990_from_index: mun1990FromIndex,
      in_SET_1,
      in_SET_2,
      in_SET_3,
      target_name,
    });
  }

  const top20SubstrateMunIds = Array.from(distinctSubstrateMunIds.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));

  const inRegistry110 = new Set(rows.map((r) => r.mun1990_id));
  const substrateMunIdInCensus = top20SubstrateMunIds.filter((id) => censusKeys.has(id));
  const substrateMunIdNotInCensus = top20SubstrateMunIds.filter((id) => !censusKeys.has(id));
  const substrateRegimeConclusion =
    top20SubstrateMunIds.length > 0 && substrateMunIdInCensus.length >= Math.min(10, top20SubstrateMunIds.length)
      ? 'substrate municipality_id appears to be in POST-1995 (census 142) space; values match census municipality keys.'
      : top20SubstrateMunIds.length > 0
        ? 'substrate municipality_id may mix regimes or use mun1990 numeric codes; not all top-20 match census 142 keys.'
        : 'no substrate municipality_id values to classify.';

  const SET_1_bihac = new Set(perFeature.filter((p) => p.municipality_id === bihacMunCode).map((p) => settlementIdFromFeature(p.f)));
  const SET_1_cazin = new Set(perFeature.filter((p) => p.municipality_id === cazinMunCode).map((p) => settlementIdFromFeature(p.f)));
  const SET_2_bihac = new Set(perFeature.filter((p) => p.mun1990_from_index === bihacCanonical).map((p) => settlementIdFromFeature(p.f)));
  const SET_2_cazin = new Set(perFeature.filter((p) => p.mun1990_from_index === cazinCanonical).map((p) => settlementIdFromFeature(p.f)));

  const sortIds = (a: string, b: string) => a.localeCompare(b);

  const in1Not2_bihac = Array.from(SET_1_bihac).filter((id) => !SET_2_bihac.has(id)).sort(sortIds);
  const in2Not1_bihac = Array.from(SET_2_bihac).filter((id) => !SET_1_bihac.has(id)).sort(sortIds);
  const in1Not3_bihac = Array.from(SET_1_bihac).filter((id) => {
    const cid = id.replace(/^S/, '');
    return !SET_3_bihac.has(cid);
  }).sort(sortIds);
  const in2Not3_bihac = Array.from(SET_2_bihac).filter((id) => {
    const cid = id.replace(/^S/, '');
    return !SET_3_bihac.has(cid);
  }).sort(sortIds);

  const in1Not2_cazin = Array.from(SET_1_cazin).filter((id) => !SET_2_cazin.has(id)).sort(sortIds);
  const in2Not1_cazin = Array.from(SET_2_cazin).filter((id) => !SET_1_cazin.has(id)).sort(sortIds);
  const in1Not3_cazin = Array.from(SET_1_cazin).filter((id) => {
    const cid = id.replace(/^S/, '');
    return !SET_3_cazin.has(cid);
  }).sort(sortIds);
  const in2Not3_cazin = Array.from(SET_2_cazin).filter((id) => {
    const cid = id.replace(/^S/, '');
    return !SET_3_cazin.has(cid);
  }).sort(sortIds);

  const mismatchFeatures: GeoJSONFeature[] = [];
  const mismatchReasons = new Map<string, string>();

  for (const p of perFeature) {
    const id = settlementIdFromFeature(p.f);
    const reasons: string[] = [];
    const bySubstrate = p.municipality_id === bihacMunCode ? 'Bihać' : p.municipality_id === cazinMunCode ? 'Cazin' : null;
    const munLabel = p.target_name ?? bySubstrate;
    if (munLabel === 'Bihać') {
      if (p.in_SET_1 && !p.in_SET_2) reasons.push('in_SET_1_not_SET_2_substrate_says_Bihac_index_disagrees');
      if (p.in_SET_2 && !p.in_SET_1) reasons.push('in_SET_2_not_SET_1_index_says_Bihac_substrate_mun_id_disagrees');
      if (p.in_SET_1 && !p.in_SET_3) reasons.push('in_SET_1_not_SET_3_substrate_says_Bihac_not_in_census_list');
      if (p.in_SET_2 && !p.in_SET_3) reasons.push('in_SET_2_not_SET_3_index_says_Bihac_not_in_census_list');
    } else if (munLabel === 'Cazin') {
      if (p.in_SET_1 && !p.in_SET_2) reasons.push('in_SET_1_not_SET_2_substrate_says_Cazin_index_disagrees');
      if (p.in_SET_2 && !p.in_SET_1) reasons.push('in_SET_2_not_SET_1_index_says_Cazin_substrate_mun_id_disagrees');
      if (p.in_SET_1 && !p.in_SET_3) reasons.push('in_SET_1_not_SET_3_substrate_says_Cazin_not_in_census_list');
      if (p.in_SET_2 && !p.in_SET_3) reasons.push('in_SET_2_not_SET_3_index_says_Cazin_not_in_census_list');
    }
    if (reasons.length > 0) {
      mismatchReasons.set(id, reasons.join(';'));
      mismatchFeatures.push({
        ...p.f,
        properties: {
          ...p.f.properties,
          sid: p.sid,
          census_id: p.census_id,
          substrate_municipality_id: p.municipality_id,
          mun1990_id_from_index: p.mun1990_from_index,
          mismatch_reason: reasons.join(';'),
        },
      });
    }
  }

  const auditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.9.5',
    substrate_municipality_id_regime: {
      top_20_distinct_substrate_municipality_id: top20SubstrateMunIds,
      in_census_142_keys: substrateMunIdInCensus,
      not_in_census_142_keys: substrateMunIdNotInCensus,
      registry_110_uses_slugs_not_numeric: true,
      conclusion: substrateRegimeConclusion,
    },
    target_mun1990_ids: { bihac: bihacCanonical, cazin: cazinCanonical },
    target_mun_codes_from_index: { bihac: bihacMunCode ?? null, cazin: cazinMunCode ?? null },
    set_counts: {
      Bihać: { SET_1_substrate_by_municipality_id: SET_1_bihac.size, SET_2_index_by_sid_mun1990: SET_2_bihac.size, SET_3_census_expected: SET_3_bihac.size },
      Cazin: { SET_1_substrate_by_municipality_id: SET_1_cazin.size, SET_2_index_by_sid_mun1990: SET_2_cazin.size, SET_3_census_expected: SET_3_cazin.size },
    },
    mismatch_counts: {
      Bihać: {
        in_SET_1_not_SET_2: in1Not2_bihac.length,
        in_SET_2_not_SET_1: in2Not1_bihac.length,
        in_SET_1_not_SET_3: in1Not3_bihac.length,
        in_SET_2_not_SET_3: in2Not3_bihac.length,
      },
      Cazin: {
        in_SET_1_not_SET_2: in1Not2_cazin.length,
        in_SET_2_not_SET_1: in2Not1_cazin.length,
        in_SET_1_not_SET_3: in1Not3_cazin.length,
        in_SET_2_not_SET_3: in2Not3_cazin.length,
      },
    },
    mismatch_examples: {
      Bihać: {
        in_SET_1_not_SET_2: in1Not2_bihac.slice(0, EXAMPLE_N),
        in_SET_2_not_SET_1: in2Not1_bihac.slice(0, EXAMPLE_N),
        in_SET_1_not_SET_3: in1Not3_bihac.slice(0, EXAMPLE_N),
        in_SET_2_not_SET_3: in2Not3_bihac.slice(0, EXAMPLE_N),
      },
      Cazin: {
        in_SET_1_not_SET_2: in1Not2_cazin.slice(0, EXAMPLE_N),
        in_SET_2_not_SET_1: in2Not1_cazin.slice(0, EXAMPLE_N),
        in_SET_1_not_SET_3: in1Not3_cazin.slice(0, EXAMPLE_N),
        in_SET_2_not_SET_3: in2Not3_cazin.slice(0, EXAMPLE_N),
      },
    },
    mismatch_feature_count: mismatchFeatures.length,
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditPayload, null, 2), 'utf8');

  const lines: string[] = [
    'Phase H6.9.5 — NW overlay membership and municipality ID regime audit',
    '',
    '1) Is settlements_substrate.geojson municipality_id in mun1990 space or post-1995 space?',
    `   Conclusion: ${substrateRegimeConclusion}`,
    `   Top-20 distinct substrate.municipality_id (sorted): ${top20SubstrateMunIds.join(', ')}`,
    `   In census (142) keys: ${substrateMunIdInCensus.join(', ') || '(none)'}`,
    `   Not in census keys: ${substrateMunIdNotInCensus.join(', ') || '(none)'}`,
    '',
    '2) Bihać/Cazin mismatch diagnosis (counts)',
    `   Bihać: SET_1=${SET_1_bihac.size} SET_2=${SET_2_bihac.size} SET_3=${SET_3_bihac.size}`,
    `   Bihać: in_SET_1_not_SET_2=${in1Not2_bihac.length} in_SET_2_not_SET_1=${in2Not1_bihac.length} in_SET_1_not_SET_3=${in1Not3_bihac.length} in_SET_2_not_SET_3=${in2Not3_bihac.length}`,
    `   Cazin: SET_1=${SET_1_cazin.size} SET_2=${SET_2_cazin.size} SET_3=${SET_3_cazin.size}`,
    `   Cazin: in_SET_1_not_SET_2=${in1Not2_cazin.length} in_SET_2_not_SET_1=${in2Not1_cazin.length} in_SET_1_not_SET_3=${in1Not3_cazin.length} in_SET_2_not_SET_3=${in2Not3_cazin.length}`,
    '',
    '3) Cause of mislocation (if any)',
  ];

  if (in2Not1_bihac.length > 0 || in2Not1_cazin.length > 0) {
    lines.push('   - In SET_2 but not SET_1: index says Bihać/Cazin but substrate municipality_id disagrees → possible WRONG SUBSTRATE MUNICIPALITY ASSIGNMENTS (A).');
  }
  if (in1Not2_bihac.length > 0 || in1Not2_cazin.length > 0) {
    lines.push('   - In SET_1 but not SET_2: substrate says Bihać/Cazin but index disagrees → possible WRONG settlements_index_1990 sid→mun1990_id MAPPING (B).');
  }
  if (in1Not3_bihac.length > 0 || in1Not3_cazin.length > 0 || in2Not3_bihac.length > 0 || in2Not3_cazin.length > 0) {
    lines.push('   - In SET_1 or SET_2 but not SET_3: join key (sid vs census_id) or census list mismatch → possible WRONG JOIN KEY (C) or census expectation.');
  }
  if (
    in2Not1_bihac.length === 0 &&
    in2Not1_cazin.length === 0 &&
    in1Not2_bihac.length === 0 &&
    in1Not2_cazin.length === 0 &&
    in1Not3_bihac.length === 0 &&
    in1Not3_cazin.length === 0 &&
    in2Not3_bihac.length === 0 &&
    in2Not3_cazin.length === 0
  ) {
    lines.push('   - No mismatches: SET_1, SET_2, SET_3 agree for Bihać and Cazin.');
  }

  lines.push('', '4) Mismatch overlay feature count: ' + String(mismatchFeatures.length));
  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');

  const mismatchFc: GeoJSONFC = { type: 'FeatureCollection', features: mismatchFeatures };
  writeFileSync(MISMATCH_GEOJSON_PATH, JSON.stringify(mismatchFc, null, 2), 'utf8');

  process.stdout.write(`Wrote ${AUDIT_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);
  process.stdout.write(`Wrote ${MISMATCH_GEOJSON_PATH} (${mismatchFeatures.length} features)\n`);
}

main();
