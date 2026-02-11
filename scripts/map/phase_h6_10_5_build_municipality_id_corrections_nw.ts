/**
 * Phase H6.10.5 — Build deterministic municipality_id correction map (NW Bužim split from Cazin)
 *
 * PURPOSE:
 *   Substrate municipality_id is post-1995 but Bužim (11240) has 0 features; its 7 census
 *   settlements are tagged 10227 (Cazin). This script builds an auditable correction map
 *   derived from census membership (authoritative). Corrections are applied VIEWER-ONLY;
 *   canonical substrate is never modified.
 *
 * INPUTS (required):
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson (READ ONLY)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - nw_municipality_id_corrections_h6_10_5.json
 *   - nw_municipality_id_corrections_h6_10_5.txt
 *   - nw_corrected_tag_overlay_h6_10_5.geojson (optional convenience)
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_5_build_municipality_id_corrections_nw.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';
import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');

const BUZIM_CODE = '11240';
const CAZIN_CODE = '10227';

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

interface Correction {
  feature_key: string;
  census_id: string;
  from: string;
  to: string;
}

interface CorrectionsOutput {
  meta: {
    phase: string;
    substrate_sha256: string;
    census_sha256: string;
    buzim_code: string;
    expected_settlement_ids: number;
    found_settlement_ids: number;
    corrected_features: number;
    missing_census_ids: string[];
    duplicate_census_ids: string[];
    raw_buzim_feature_count: number;
    corrected_buzim_feature_count: number;
  };
  corrections: Correction[];
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
  const isMulti = Array.isArray(coords[0]) && Array.isArray((coords[0] as Ring)[0]) && typeof ((coords[0] as Ring)[0] as Point)[0] === 'number';
  if (isMulti) {
    for (const poly of coords as MultiPolygon)
      for (const ring of poly) processRing(ring);
  } else {
    for (const ring of coords as Polygon) processRing(ring);
  }
  if (!isFinite(minx)) return { minx: 0, miny: 0, maxx: 0, maxy: 0 };
  return { minx, miny, maxx, maxy };
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
  const schemaPath = census.municipalities ? 'census.municipalities[code]' : 'census.municipalities_by_code[code]';
  if (!municipalities || typeof municipalities !== 'object') {
    console.error('Census has no municipalities. Available top-level keys:', Object.keys(census).join(', '));
    process.exit(1);
  }

  const buzimMun = municipalities[BUZIM_CODE];
  if (!buzimMun || !Array.isArray(buzimMun.s)) {
    console.error(`Bužim municipality not found: code=${BUZIM_CODE}. Schema: ${schemaPath}`);
    process.exit(1);
  }

  const expectedSettlementIds = [...new Set(buzimMun.s.map(String))].sort((a, b) => a.localeCompare(b));
  const expectedCount = expectedSettlementIds.length;

  const substrateBytes = readFileSync(SUBSTRATE_PATH);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const censusIdToIndices = new Map<string, number[]>();
  for (let i = 0; i < substrate.features.length; i++) {
    const f = substrate.features[i];
    const raw = f.properties?.census_id;
    if (raw == null) continue;
    const cid = String(raw);
    if (!censusIdToIndices.has(cid)) censusIdToIndices.set(cid, []);
    censusIdToIndices.get(cid)!.push(i);
  }

  const corrections: Correction[] = [];
  const missingCensusIds: string[] = [];
  const duplicateCensusIds: string[] = [];
  const foundSettlementIds = new Set<string>();
  const correctedFeatureKeys = new Set<string>();

  for (const censusId of expectedSettlementIds) {
    const indices = censusIdToIndices.get(censusId);
    if (!indices || indices.length === 0) {
      missingCensusIds.push(censusId);
      continue;
    }
    foundSettlementIds.add(censusId);
    if (indices.length > 1) {
      duplicateCensusIds.push(censusId);
    }

    const featuresForCid = indices.map((idx) => substrate.features[idx]);
    const sortedFeatures = featuresForCid.slice().sort((a, b) => {
      const sidA = (a.properties?.sid != null ? String(a.properties.sid) : '');
      const sidB = (b.properties?.sid != null ? String(b.properties.sid) : '');
      if (sidA !== sidB) return sidA.localeCompare(sidB);
      const bboxA = bboxFromCoords(a.geometry.coordinates);
      const bboxB = bboxFromCoords(b.geometry.coordinates);
      const tA = [bboxA.minx, bboxA.miny, bboxA.maxx, bboxA.maxy] as const;
      const tB = [bboxB.minx, bboxB.miny, bboxB.maxx, bboxB.maxy] as const;
      for (let k = 0; k < 4; k++) {
        if (tA[k] !== tB[k]) return tA[k] - tB[k];
      }
      return 0;
    });

    let ordinal = 0;
    for (const feat of sortedFeatures) {
      const sid = feat.properties?.sid != null ? String(feat.properties.sid) : null;
      const featureKey = sid != null ? sid : `${censusId}#${ordinal}`;
      ordinal++;

      const currentMunId = feat.properties?.municipality_id != null ? String(feat.properties.municipality_id) : '';
      if (currentMunId !== BUZIM_CODE) {
        corrections.push({
          feature_key: featureKey,
          census_id: censusId,
          from: currentMunId || '(empty)',
          to: BUZIM_CODE,
        });
        correctedFeatureKeys.add(featureKey);
      }
    }
  }

  corrections.sort((a, b) => {
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.census_id !== b.census_id) return a.census_id.localeCompare(b.census_id);
    return a.feature_key.localeCompare(b.feature_key);
  });

  const rawBuzimFeatureCount = substrate.features.filter(
    (f) => (f.properties?.municipality_id != null ? String(f.properties.municipality_id) : '') === BUZIM_CODE
  ).length;

  const correctedBuzimCount = rawBuzimFeatureCount + corrections.length;

  const output: CorrectionsOutput = {
    meta: {
      phase: 'H6.10.5',
      substrate_sha256: substrateSha,
      census_sha256: censusSha,
      buzim_code: BUZIM_CODE,
      expected_settlement_ids: expectedCount,
      found_settlement_ids: foundSettlementIds.size,
      corrected_features: corrections.length,
      missing_census_ids: missingCensusIds,
      duplicate_census_ids: duplicateCensusIds,
      raw_buzim_feature_count: rawBuzimFeatureCount,
      corrected_buzim_feature_count: correctedBuzimCount,
    },
    corrections,
  };

  const payload = stripTimestampKeysForArtifacts(output) as CorrectionsOutput;
  mkdirSync(DEBUG_DIR, { recursive: true });

  const jsonPath = resolve(DEBUG_DIR, 'nw_municipality_id_corrections_h6_10_5.json');
  const txtPath = resolve(DEBUG_DIR, 'nw_municipality_id_corrections_h6_10_5.txt');

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  const txtLines = [
    'Phase H6.10.5 — NW municipality_id corrections (Bužim split from Cazin, viewer-only)',
    '',
    `Substrate SHA256: ${substrateSha.slice(0, 16)}...`,
    `Census SHA256: ${censusSha.slice(0, 16)}...`,
    `Bužim code: ${BUZIM_CODE}`,
    `Expected Bužim settlement IDs: ${expectedCount}`,
    `Found in substrate: ${foundSettlementIds.size}`,
    `Corrected feature count: ${corrections.length}`,
    `Raw features with municipality_id=${BUZIM_CODE}: ${rawBuzimFeatureCount}`,
    `Corrected Bužim feature count: ${correctedBuzimCount}`,
    `Missing census_ids: ${missingCensusIds.length > 0 ? missingCensusIds.join(', ') : '[]'}`,
    `Duplicate census_ids: ${duplicateCensusIds.length > 0 ? duplicateCensusIds.join(', ') : '[]'}`,
    '',
    'Corrections (feature_key -> to):',
    ...corrections.map((c) => `  ${c.feature_key}  census_id=${c.census_id}  from=${c.from} -> to=${c.to}`),
  ];
  writeFileSync(txtPath, txtLines.join('\n'), 'utf8');

  const correctionKeys = new Set(corrections.map((c) => c.feature_key));
  const overlayFeatures: GeoJSONFeature[] = [];
  for (const censusId of Array.from(censusIdToIndices.keys())) {
    const indices = censusIdToIndices.get(censusId) || [];
    const featuresForCid = indices.map((idx) => substrate.features[idx]);
    const sortedFeatures = featuresForCid.slice().sort((a, b) => {
      const sidA = (a.properties?.sid != null ? String(a.properties.sid) : '');
      const sidB = (b.properties?.sid != null ? String(b.properties.sid) : '');
      if (sidA !== sidB) return sidA.localeCompare(sidB);
      const bboxA = bboxFromCoords(a.geometry.coordinates);
      const bboxB = bboxFromCoords(b.geometry.coordinates);
      const tA = [bboxA.minx, bboxA.miny, bboxA.maxx, bboxA.maxy] as const;
      const tB = [bboxB.minx, bboxB.miny, bboxB.maxx, bboxB.maxy] as const;
      for (let k = 0; k < 4; k++) {
        if (tA[k] !== tB[k]) return tA[k] - tB[k];
      }
      return 0;
    });
    let ordinal = 0;
    for (const feat of sortedFeatures) {
      const featureKey = (feat.properties?.sid != null ? String(feat.properties.sid) : null) ?? `${censusId}#${ordinal}`;
      ordinal++;
      if (!correctionKeys.has(featureKey)) continue;
      const c = corrections.find((x) => x.feature_key === featureKey)!;
      overlayFeatures.push({
        type: 'Feature',
        properties: {
          ...feat.properties,
          overlay_type: 'mun_id_corrected_h6_10_5',
          feature_key: c.feature_key,
          census_id: c.census_id,
          from_municipality_id: c.from,
          corrected_municipality_id: c.to,
        },
        geometry: feat.geometry,
      });
    }
  }

  const overlayPath = resolve(DEBUG_DIR, 'nw_corrected_tag_overlay_h6_10_5.geojson');
  writeFileSync(
    overlayPath,
    JSON.stringify({ type: 'FeatureCollection', features: overlayFeatures }, null, 2),
    'utf8'
  );

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${txtPath}\n`);
  process.stdout.write(`Wrote ${overlayPath} (${overlayFeatures.length} features)\n`);
}

main();
