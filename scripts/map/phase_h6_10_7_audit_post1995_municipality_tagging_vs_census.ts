/**
 * Phase H6.10.7 — Global audit of post-1995 municipality_id tagging vs census (candidates only, no corrections)
 *
 * PURPOSE:
 *   Produce an auditable report where substrate municipality_id (post-1995) disagrees with
 *   census membership. Identifies: (1) post-1995 municipality_ids with zero substrate features,
 *   (2) municipalities whose census settlements are mostly tagged as a different municipality_id,
 *   (3) top cross-tag flows (substrate_mun_id -> census_mun_id). Output is diagnostics only.
 *
 * INPUTS (required; read-only):
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson (read only, never modified)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - post1995_tagging_vs_census_h6_10_7.txt
 *   - post1995_tagging_vs_census_h6_10_7.json
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_7_audit_post1995_municipality_tagging_vs_census.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeSha256Hex } from './lib/awwv_contracts.js';
import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');

interface CensusMunicipality {
  n?: string;
  s?: string[];
  [key: string]: unknown;
}

interface CensusData {
  municipalities?: Record<string, CensusMunicipality>;
  municipalities_by_code?: Record<string, CensusMunicipality>;
  [key: string]: unknown;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/** census_id (string) -> post-1995 municipality code */
function buildCensusIdToMunicipality(census: CensusData): Map<string, string> {
  const out = new Map<string, string>();
  const municipalities = census.municipalities ?? census.municipalities_by_code;
  if (!municipalities || typeof municipalities !== 'object') return out;
  for (const [code, mun] of Object.entries(municipalities)) {
    if (!mun || !Array.isArray(mun.s)) continue;
    for (const sid of mun.s) {
      const cid = String(sid);
      if (!out.has(cid)) out.set(cid, code);
    }
  }
  return out;
}

function main(): void {
  if (!existsSync(CENSUS_PATH)) {
    console.error('Missing input:', CENSUS_PATH);
    process.exit(1);
  }
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing input:', SUBSTRATE_PATH);
    process.exit(1);
  }

  const censusBytes = readFileSync(CENSUS_PATH);
  const censusSha = computeSha256Hex(censusBytes);
  const census = JSON.parse(censusBytes.toString('utf8')) as CensusData;

  const municipalities = census.municipalities ?? census.municipalities_by_code;
  if (!municipalities || typeof municipalities !== 'object') {
    console.error('Census has no municipalities. Available top-level keys:', Object.keys(census).join(', '));
    process.exit(1);
  }

  const censusIdToMun = buildCensusIdToMunicipality(census);
  const allCensusMunCodes = [...new Set(Object.keys(municipalities))].sort((a, b) => a.localeCompare(b));

  const substrateBytes = readFileSync(SUBSTRATE_PATH);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  // census_id -> feature indices (join: prefer census_id; no sid fallback for matching census settlements)
  const censusIdToIndices = new Map<string, number[]>();
  const featureCountBySubstrateMunId = new Map<string, number>();
  const matchedPairs: { substrate_mun_id: string; census_mun_id: string }[] = [];
  const missingCensusIds: string[] = [];

  for (let i = 0; i < substrate.features.length; i++) {
    const f = substrate.features[i];
    const rawMunId = f.properties?.municipality_id;
    const munId = rawMunId != null ? String(rawMunId) : '';
    if (munId) {
      featureCountBySubstrateMunId.set(munId, (featureCountBySubstrateMunId.get(munId) ?? 0) + 1);
    }

    const rawCid = f.properties?.census_id;
    if (rawCid == null) continue;
    const cid = String(rawCid);
    if (!censusIdToIndices.has(cid)) censusIdToIndices.set(cid, []);
    censusIdToIndices.get(cid)!.push(i);

    const censusMunCode = censusIdToMun.get(cid);
    if (censusMunCode != null) {
      matchedPairs.push({ substrate_mun_id: munId || '(empty)', census_mun_id: censusMunCode });
    }
  }

  // Missing: census settlements (census_id in any municipality .s) that have no substrate feature
  const allCensusSettlementIds = new Set<string>();
  for (const mun of Object.values(municipalities)) {
    if (!mun?.s) continue;
    for (const s of mun.s) allCensusSettlementIds.add(String(s));
  }
  for (const cid of [...allCensusSettlementIds].sort((a, b) => a.localeCompare(b))) {
    if (!censusIdToIndices.has(cid) || censusIdToIndices.get(cid)!.length === 0) {
      missingCensusIds.push(cid);
    }
  }

  // A) All municipality_ids referenced in substrate or census; list those with 0 features
  const allMunIds = new Set<string>();
  for (const [k] of featureCountBySubstrateMunId) allMunIds.add(k);
  for (const code of allCensusMunCodes) allMunIds.add(code);
  const zeroFeatureMunicipalityIds = [...allMunIds].filter((id) => (featureCountBySubstrateMunId.get(id) ?? 0) === 0).sort((a, b) => a.localeCompare(b));
  const featureCountByMunIdSorted: { municipality_id: string; feature_count: number }[] = [...allMunIds]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ municipality_id: id, feature_count: featureCountBySubstrateMunId.get(id) ?? 0 }));

  // B) Per census municipality: distribution of substrate municipality_id among matched settlements
  type MunDistribution = {
    census_municipality_id: string;
    total_matched: number;
    dominant_tag: string;
    dominant_count: number;
    dominant_share: number;
    flagged: boolean;
    distribution: Record<string, number>;
  };
  const perMunDistributions: MunDistribution[] = [];

  for (const code of allCensusMunCodes) {
    const mun = municipalities[code];
    const settlementIds = mun?.s ? [...new Set(mun.s.map(String))].sort((a, b) => a.localeCompare(b)) : [];
    const tagCounts = new Map<string, number>();
    let totalMatched = 0;
    for (const cid of settlementIds) {
      const indices = censusIdToIndices.get(cid);
      if (!indices?.length) continue;
      for (const idx of indices) {
        const f = substrate.features[idx];
        const tag = f.properties?.municipality_id != null ? String(f.properties.municipality_id) : '(empty)';
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        totalMatched++;
      }
    }
    const distEntries = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const dominantTag = distEntries[0]?.[0] ?? '';
    const dominantCount = distEntries[0]?.[1] ?? 0;
    const dominantShare = totalMatched > 0 ? dominantCount / totalMatched : 0;
    const flagged = dominantTag !== code && dominantShare >= 0.6 && totalMatched >= 10;
    const distribution: Record<string, number> = {};
    for (const [k, v] of distEntries) distribution[k] = v;
    perMunDistributions.push({
      census_municipality_id: code,
      total_matched: totalMatched,
      dominant_tag: dominantTag,
      dominant_count: dominantCount,
      dominant_share: dominantShare,
      flagged,
      distribution,
    });
  }

  // Sort B by census_municipality_id (already from allCensusMunCodes which is sorted)
  perMunDistributions.sort((a, b) => a.census_municipality_id.localeCompare(b.census_municipality_id));

  // C) Cross-tag flow: (substrate_mun_id -> census_mun_id) -> count; top 50 by count
  const flowCount = new Map<string, number>();
  for (const { substrate_mun_id, census_mun_id } of matchedPairs) {
    const key = `${substrate_mun_id}\t${census_mun_id}`;
    flowCount.set(key, (flowCount.get(key) ?? 0) + 1);
  }
  const flowEntries = [...flowCount.entries()]
    .map(([key, count]) => {
      const [from_tag, to_census_mun] = key.split('\t');
      return { from_tag, to_census_mun, count };
    })
    .sort((a, b) => b.count - a.count || a.from_tag.localeCompare(b.from_tag) || a.to_census_mun.localeCompare(b.to_census_mun));
  const top50Flows = flowEntries.slice(0, 50);

  const flaggedMunicipalities = perMunDistributions.filter((d) => d.flagged);

  const output = {
    meta: {
      phase: 'H6.10.7',
      substrate_sha256: substrateSha,
      census_sha256: censusSha,
      substrate_feature_count: substrate.features.length,
      census_municipality_count: allCensusMunCodes.length,
      total_matched_settlement_features: matchedPairs.length,
      missing_census_id_count: missingCensusIds.length,
      zero_feature_municipality_id_count: zeroFeatureMunicipalityIds.length,
      flagged_municipality_count: flaggedMunicipalities.length,
    },
    zero_feature_municipality_ids: zeroFeatureMunicipalityIds,
    feature_count_by_municipality_id: featureCountByMunIdSorted,
    per_municipality_distribution: perMunDistributions,
    flagged_municipalities: flaggedMunicipalities.map((d) => ({
      census_municipality_id: d.census_municipality_id,
      dominant_tag: d.dominant_tag,
      dominant_share: d.dominant_share,
      total_matched: d.total_matched,
    })),
    cross_tag_flow_top_50: top50Flows,
    missing_census_ids: missingCensusIds,
  };

  const payload = stripTimestampKeysForArtifacts(output);
  mkdirSync(DEBUG_DIR, { recursive: true });

  const jsonPath = resolve(DEBUG_DIR, 'post1995_tagging_vs_census_h6_10_7.json');
  const txtPath = resolve(DEBUG_DIR, 'post1995_tagging_vs_census_h6_10_7.txt');

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  const txtLines = [
    'Phase H6.10.7 — Post-1995 municipality_id tagging vs census (global audit, candidates only)',
    '',
    'Summary',
    '-------',
    `Substrate SHA256: ${(output.meta as { substrate_sha256: string }).substrate_sha256.slice(0, 16)}...`,
    `Census SHA256: ${(output.meta as { census_sha256: string }).census_sha256.slice(0, 16)}...`,
    `Substrate feature count: ${(output.meta as { substrate_feature_count: number }).substrate_feature_count}`,
    `Census municipality count: ${(output.meta as { census_municipality_count: number }).census_municipality_count}`,
    `Total matched settlement features: ${(output.meta as { total_matched_settlement_features: number }).total_matched_settlement_features}`,
    `Missing census IDs (no substrate feature): ${(output.meta as { missing_census_id_count: number }).missing_census_id_count}`,
    `Zero-feature municipality_ids: ${(output.meta as { zero_feature_municipality_id_count: number }).zero_feature_municipality_id_count}`,
    `Flagged municipalities (dominant_tag != census, share >= 0.6, matched >= 10): ${(output.meta as { flagged_municipality_count: number }).flagged_municipality_count}`,
    '',
    'Zero-feature municipality_ids (post-1995 referenced in substrate or census)',
    '---------------------------------------------------------------------------',
    ...zeroFeatureMunicipalityIds.map((id) => `  ${id}`),
    '',
    'Flagged municipalities (dominant mismatch)',
    '------------------------------------------',
    ...flaggedMunicipalities.map(
      (d) =>
        `  census_mun=${d.census_municipality_id} dominant_tag=${d.dominant_tag} dominant_share=${d.dominant_share.toFixed(3)} total_matched=${d.total_matched}`
    ),
    '',
    'Cross-tag flow (top 50: substrate_mun_id -> census_mun_id)',
    '----------------------------------------------------------',
    ...top50Flows.map((f) => `  ${f.from_tag} -> ${f.to_census_mun}  count=${f.count}`),
    '',
    'Missing census IDs (first 100)',
    '-------------------------------',
    ...missingCensusIds.slice(0, 100).map((id) => `  ${id}`),
    ...(missingCensusIds.length > 100 ? [`  ... and ${missingCensusIds.length - 100} more`] : []),
  ];
  writeFileSync(txtPath, txtLines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${txtPath}\n`);
}

main();
