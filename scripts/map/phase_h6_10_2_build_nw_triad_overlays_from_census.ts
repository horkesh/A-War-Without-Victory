/**
 * Phase H6.10.2 — Rebuild NW triad overlays (Bihać, Cazin, Bužim) from census authority
 *
 * PURPOSE:
 *   Rebuild Bihać, Cazin, and Bužim overlays from the ground up using ONLY census
 *   settlement membership as authority. No substrate.municipality_id for membership.
 *   Geometry from settlements_substrate.geojson selected by census_id.
 *
 * INPUTS (required; STOP if missing):
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson
 *
 * OUTPUTS (untracked under data/derived/_debug/):
 *   - nw_triad_post1995_overlays_h6_10_2.geojson
 *   - nw_triad_post1995_overlays_h6_10_2.audit.json
 *   - nw_triad_post1995_overlays_h6_10_2.audit.txt
 *   - nw_triad_mun1990_composite_overlays_h6_10_2.geojson
 *   - nw_triad_mun1990_composite_overlays_h6_10_2.audit.json
 *   - nw_triad_mun1990_composite_overlays_h6_10_2.audit.txt
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_2_build_nw_triad_overlays_from_census.ts
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

const NW_TRIAD_CODES = [
  { code: '10049', name: 'Bihać' },
  { code: '10227', name: 'Cazin' },
  { code: '11240', name: 'Bužim' },
] as const;

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

function polygonToMultiPolygonCoords(geom: { type: string; coordinates: Polygon | MultiPolygon }): Polygon[] {
  if (geom.type === 'Polygon' && geom.coordinates) return [geom.coordinates as Polygon];
  if (geom.type === 'MultiPolygon' && geom.coordinates) return geom.coordinates as MultiPolygon;
  return [];
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
  const censusContent = censusBytes.toString('utf8');
  const census = JSON.parse(censusContent) as CensusData;

  let municipalities: Record<string, CensusMunicipality> | undefined = census.municipalities ?? census.municipalities_by_code;
  const schemaPath = census.municipalities ? 'census.municipalities[code]' : 'census.municipalities_by_code[code]';
  if (!municipalities || typeof municipalities !== 'object') {
    console.error('Census has no municipalities. Available top-level keys:', Object.keys(census).join(', '));
    console.error('Hint: Expect municipalities or municipalities_by_code.');
    process.exit(1);
  }

  for (const { code, name } of NW_TRIAD_CODES) {
    const mun = municipalities[code];
    if (!mun || !Array.isArray(mun.s)) {
      console.error(`Municipality not found: code=${code} (${name}). Schema used: ${schemaPath}`);
      console.error('Available municipality codes (first 30):', Object.keys(municipalities).slice(0, 30).join(', '));
      process.exit(1);
    }
  }

  const substrateBytes = readFileSync(SUBSTRATE_PATH);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const substrateBbox = computeBboxFromFeatures(substrate.features);
  const substrateFeatureCount = substrate.features.length;

  const censusIdToIndices = new Map<string, number[]>();
  for (let i = 0; i < substrate.features.length; i++) {
    const f = substrate.features[i];
    const raw = f.properties?.census_id;
    if (raw == null) continue;
    const cid = String(raw);
    if (!censusIdToIndices.has(cid)) censusIdToIndices.set(cid, []);
    censusIdToIndices.get(cid)!.push(i);
  }

  type MunResult = {
    code: string;
    name: string;
    settlementIds: string[];
    polygons: Polygon[];
    foundIds: Set<string>;
    missingIds: string[];
    duplicateCensusIdHits: string[];
    geomParts: number;
    bbox: [number, number, number, number];
  };

  const post1995Results: MunResult[] = [];

  for (const { code, name } of NW_TRIAD_CODES) {
    const s = (municipalities[code].s || []).slice();
    const settlementIdSet = new Set(s.map(String));
    const sortedIds = [...settlementIdSet].sort((a, b) => a.localeCompare(b));

    const polygons: Polygon[] = [];
    const foundIds = new Set<string>();
    const missingIds: string[] = [];
    const duplicateCensusIdHits: string[] = [];

    for (const cid of sortedIds) {
      const indices = censusIdToIndices.get(cid);
      if (!indices || indices.length === 0) {
        missingIds.push(cid);
        continue;
      }
      foundIds.add(cid);
      if (indices.length > 1) {
        duplicateCensusIdHits.push(cid);
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
      for (const feat of sortedFeatures) {
        for (const poly of polygonToMultiPolygonCoords(feat.geometry)) {
          polygons.push(poly);
        }
      }
    }

    const memberFeatures = Array.from(foundIds).flatMap((cid) => {
      const indices = censusIdToIndices.get(cid) || [];
      return indices.map((i) => substrate.features[i]);
    });
    const bbox: [number, number, number, number] =
      memberFeatures.length > 0 ? computeBboxFromFeatures(memberFeatures) : [0, 0, 0, 0];

    post1995Results.push({
      code,
      name,
      settlementIds: sortedIds,
      polygons,
      foundIds,
      missingIds,
      duplicateCensusIdHits,
      geomParts: polygons.length,
      bbox,
    });
  }

  const post1995Features: GeoJSONFeature[] = post1995Results.map((r) => ({
    type: 'Feature',
    properties: {
      overlay_type: 'post1995_municipality',
      mun_code: r.code,
      name: r.name,
      settlement_count_expected: r.settlementIds.length,
      settlement_count_found: r.foundIds.size,
      feature_geom_parts: r.geomParts,
      missing_census_ids: r.missingIds.length,
    },
    geometry: { type: 'MultiPolygon' as const, coordinates: r.polygons },
  }));

  const post1995Fc: GeoJSONFC = { type: 'FeatureCollection', features: post1995Features };
  mkdirSync(DEBUG_DIR, { recursive: true });

  const post1995Path = resolve(DEBUG_DIR, 'nw_triad_post1995_overlays_h6_10_2.geojson');
  const post1995AuditJson = resolve(DEBUG_DIR, 'nw_triad_post1995_overlays_h6_10_2.audit.json');
  const post1995AuditTxt = resolve(DEBUG_DIR, 'nw_triad_post1995_overlays_h6_10_2.audit.txt');

  writeFileSync(post1995Path, JSON.stringify(post1995Fc, null, 2), 'utf8');

  const post1995AuditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.2',
    overlay_path: 'nw_triad_post1995_overlays_h6_10_2.geojson',
    substrate_sha256: substrateSha,
    substrate_feature_count: substrateFeatureCount,
    substrate_bbox: substrateBbox,
    census_sha256: censusSha,
    census_municipality_schema_path: schemaPath,
    municipalities: post1995Results.map((r) => ({
      code: r.code,
      name: r.name,
      expected_settlement_ids_count: r.settlementIds.length,
      found_ids_count: r.foundIds.size,
      missing_ids_count: r.missingIds.length,
      missing_ids_first_25: r.missingIds.slice(0, 25),
      duplicate_census_id_hits_count: r.duplicateCensusIdHits.length,
      duplicate_census_id_hits_first_25: r.duplicateCensusIdHits.slice(0, 25),
      overlay_bbox: r.bbox,
    })),
    feature_count: post1995Features.length,
  }) as Record<string, unknown>;
  writeFileSync(post1995AuditJson, JSON.stringify(post1995AuditPayload, null, 2), 'utf8');

  const post1995Lines: string[] = [
    'Phase H6.10.2 — NW triad post-1995 overlays (Bihać, Cazin, Bužim) from census authority',
    '',
    `Substrate SHA256: ${substrateSha.slice(0, 16)}...`,
    `Substrate feature count: ${substrateFeatureCount}`,
    `Substrate bbox: [${substrateBbox.join(', ')}]`,
    `Census SHA256: ${censusSha.slice(0, 16)}...`,
    `Census municipality schema: ${schemaPath}`,
    '',
  ];
  for (const r of post1995Results) {
    post1995Lines.push(`${r.name} (${r.code}): expected=${r.settlementIds.length} found=${r.foundIds.size} missing=${r.missingIds.length} geom_parts=${r.geomParts}`);
    post1995Lines.push(`  bbox: [${r.bbox.join(', ')}]`);
    if (r.missingIds.length > 0) {
      post1995Lines.push(`  missing_ids (first 25): ${r.missingIds.slice(0, 25).join(', ')}`);
    }
    if (r.duplicateCensusIdHits.length > 0) {
      post1995Lines.push(`  duplicate_census_id_hits (first 25): ${r.duplicateCensusIdHits.slice(0, 25).join(', ')}`);
    }
  }
  writeFileSync(post1995AuditTxt, post1995Lines.join('\n'), 'utf8');

  const bihacResult = post1995Results[0];
  const cazinResult = post1995Results[1];
  const buzimResult = post1995Results[2];
  const cazin1990Polygons: Polygon[] = [...cazinResult.polygons, ...buzimResult.polygons];
  const cazin1990Bbox: [number, number, number, number] =
    cazin1990Polygons.length > 0
      ? computeBboxFromFeatures([
          { geometry: { type: 'MultiPolygon', coordinates: cazin1990Polygons } } as GeoJSONFeature,
        ])
      : [0, 0, 0, 0];

  const compositeFeatures: GeoJSONFeature[] = [
    {
      type: 'Feature',
      properties: {
        overlay_type: 'mun1990_composite',
        name: 'Bihać (1990)',
        members_post1995_codes: [bihacResult.code],
        settlement_count_expected_sum: bihacResult.settlementIds.length,
        settlement_count_found_sum: bihacResult.foundIds.size,
        geom_parts: bihacResult.geomParts,
      },
      geometry: { type: 'MultiPolygon', coordinates: bihacResult.polygons },
    },
    {
      type: 'Feature',
      properties: {
        overlay_type: 'mun1990_composite',
        name: 'Cazin (1990)',
        members_post1995_codes: [cazinResult.code, buzimResult.code],
        settlement_count_expected_sum: cazinResult.settlementIds.length + buzimResult.settlementIds.length,
        settlement_count_found_sum: cazinResult.foundIds.size + buzimResult.foundIds.size,
        geom_parts: cazin1990Polygons.length,
      },
      geometry: { type: 'MultiPolygon', coordinates: cazin1990Polygons },
    },
  ];

  const compositeFc: GeoJSONFC = { type: 'FeatureCollection', features: compositeFeatures };
  const compositePath = resolve(DEBUG_DIR, 'nw_triad_mun1990_composite_overlays_h6_10_2.geojson');
  const compositeAuditJson = resolve(DEBUG_DIR, 'nw_triad_mun1990_composite_overlays_h6_10_2.audit.json');
  const compositeAuditTxt = resolve(DEBUG_DIR, 'nw_triad_mun1990_composite_overlays_h6_10_2.audit.txt');

  writeFileSync(compositePath, JSON.stringify(compositeFc, null, 2), 'utf8');

  const compositeAuditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.2',
    overlay_path: 'nw_triad_mun1990_composite_overlays_h6_10_2.geojson',
    substrate_sha256: substrateSha,
    census_sha256: censusSha,
    census_municipality_schema_path: schemaPath,
    composite_components: [
      { name: 'Bihać (1990)', members_post1995_codes: [bihacResult.code], geom_parts: bihacResult.geomParts, bbox: bihacResult.bbox },
      { name: 'Cazin (1990)', members_post1995_codes: [cazinResult.code, buzimResult.code], geom_parts: cazin1990Polygons.length, bbox: cazin1990Bbox },
    ],
    feature_count: compositeFeatures.length,
  }) as Record<string, unknown>;
  writeFileSync(compositeAuditJson, JSON.stringify(compositeAuditPayload, null, 2), 'utf8');

  writeFileSync(
    compositeAuditTxt,
    [
      'Phase H6.10.2 — NW triad 1990 composite overlays from census authority',
      '',
      `Substrate SHA256: ${substrateSha.slice(0, 16)}...`,
      `Census SHA256: ${censusSha.slice(0, 16)}...`,
      `Schema: ${schemaPath}`,
      '',
      `Bihać (1990): members_post1995=[10049], expected_sum=${bihacResult.settlementIds.length}, found_sum=${bihacResult.foundIds.size}, geom_parts=${bihacResult.geomParts}`,
      `  bbox: [${bihacResult.bbox.join(', ')}]`,
      `Cazin (1990): members_post1995=[10227, 11240], expected_sum=${cazinResult.settlementIds.length + buzimResult.settlementIds.length}, found_sum=${cazinResult.foundIds.size + buzimResult.foundIds.size}, geom_parts=${cazin1990Polygons.length}`,
      `  bbox: [${cazin1990Bbox.join(', ')}]`,
    ].join('\n'),
    'utf8'
  );

  process.stdout.write(`Wrote ${post1995Path} (${post1995Features.length} features)\n`);
  process.stdout.write(`Wrote ${post1995AuditJson}\n`);
  process.stdout.write(`Wrote ${post1995AuditTxt}\n`);
  process.stdout.write(`Wrote ${compositePath} (${compositeFeatures.length} features)\n`);
  process.stdout.write(`Wrote ${compositeAuditJson}\n`);
  process.stdout.write(`Wrote ${compositeAuditTxt}\n`);
}

main();
