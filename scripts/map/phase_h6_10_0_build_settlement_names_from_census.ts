/**
 * Phase H6.10.0 — Build authoritative settlement name table from census
 *
 * PURPOSE:
 *   Derive settlement display names from bih_census_1991.json (settlements.n)
 *   and write a deterministic mapping keyed by substrate census_id for viewer labels.
 *
 * INPUTS (must exist; STOP if missing):
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson
 *
 * OUTPUTS:
 *   - data/derived/settlement_names.json (tracked, deterministic)
 *   - data/derived/_debug/settlement_names_build_audit_h6_10_0.txt (untracked)
 *   - data/derived/_debug/settlement_names_build_audit_h6_10_0.json (untracked)
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_0_build_settlement_names_from_census.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const OUTPUT_PATH = resolve(DERIVED, 'settlement_names.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'settlement_names_build_audit_h6_10_0.txt');
const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'settlement_names_build_audit_h6_10_0.json');

interface CensusSettlement {
  n?: string;
  m?: string;
  [key: string]: unknown;
}

interface CensusData {
  settlements?: Record<string, CensusSettlement>;
  [key: string]: unknown;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface NameEntry {
  name: string;
  mun_code: string | null;
  source: string;
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

  const censusContent = readFileSync(CENSUS_PATH, 'utf8');
  const census = JSON.parse(censusContent) as CensusData;
  const substrateContent = readFileSync(SUBSTRATE_PATH, 'utf8');
  const substrate = JSON.parse(substrateContent) as GeoJSONFC;

  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const settlementsTable = census.settlements;
  if (!settlementsTable || typeof settlementsTable !== 'object') {
    console.error('Census has no settlements table. STOP.');
    process.exit(1);
  }

  // Build name table keyed by census_id (use census.settlements[id].n and .m)
  const nameTable: Record<string, NameEntry> = {};
  const censusIdsWithCensus = new Set<string>();

  for (const [censusId, rec] of Object.entries(settlementsTable)) {
    if (!rec || typeof rec !== 'object') continue;
    const name = rec.n != null ? String(rec.n) : '';
    const munCode = rec.m != null ? String(rec.m) : null;
    nameTable[censusId] = {
      name,
      mun_code: munCode,
      source: 'bih_census_1991',
    };
    if (name) censusIdsWithCensus.add(censusId);
  }

  // Validate join coverage against substrate
  let substrateWithCensusId = 0;
  let substrateMissingCensusId = 0;
  let matchInNameTable = 0;
  let censusIdNoName = 0;
  const missingCensusIds: string[] = [];
  const noNameCensusIds: string[] = [];

  for (const f of substrate.features) {
    const censusId = f.properties?.census_id != null ? String(f.properties.census_id) : null;
    if (censusId == null || censusId === '') {
      substrateMissingCensusId++;
      continue;
    }
    substrateWithCensusId++;
    const entry = nameTable[censusId];
    if (!entry) {
      missingCensusIds.push(censusId);
      continue;
    }
    if (!entry.name) {
      censusIdNoName++;
      noNameCensusIds.push(censusId);
      continue;
    }
    matchInNameTable++;
  }

  // Deterministic output: sort keys lexicographically
  const sortedKeys = Object.keys(nameTable).sort((a, b) => a.localeCompare(b));
  const byCensusId: Record<string, NameEntry> = {};
  for (const k of sortedKeys) {
    byCensusId[k] = nameTable[k];
  }

  const output = {
    source: 'bih_census_1991',
    by_census_id: byCensusId,
  };

  mkdirSync(DERIVED, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH}\n`);

  // Audit (untracked)
  mkdirSync(DEBUG_DIR, { recursive: true });
  const auditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.0',
    substrate_features: substrate.features.length,
    substrate_with_census_id: substrateWithCensusId,
    substrate_missing_census_id: substrateMissingCensusId,
    match_in_name_table: matchInNameTable,
    census_id_no_name: censusIdNoName,
    census_id_not_in_census: missingCensusIds.length,
    top_missing_census_ids: [...new Set(missingCensusIds)].sort((a, b) => a.localeCompare(b)).slice(0, 20),
    top_no_name_census_ids: [...new Set(noNameCensusIds)].sort((a, b) => a.localeCompare(b)).slice(0, 20),
  }) as Record<string, unknown>;
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditPayload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.0 — Settlement names build audit',
    '',
    `Substrate features: ${substrate.features.length}`,
    `Substrate with census_id: ${substrateWithCensusId}`,
    `Substrate missing census_id: ${substrateMissingCensusId}`,
    `Match in name table: ${matchInNameTable}`,
    `Census_id with no name: ${censusIdNoName}`,
    `Census_id not in census: ${missingCensusIds.length}`,
    '',
    'Top missing census_ids (substrate has census_id but not in census):',
    ...[...new Set(missingCensusIds)].sort((a, b) => a.localeCompare(b)).slice(0, 20).map((id) => `  ${id}`),
    '',
    'Top no-name census_ids (in census but name empty):',
    ...[...new Set(noNameCensusIds)].sort((a, b) => a.localeCompare(b)).slice(0, 20).map((id) => `  ${id}`),
  ];
  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_JSON_PATH}\n`);
}

main();
