/**
 * Phase H6.9.8 — Build NW provenance overlay from census membership (substrate geometry)
 *
 * PURPOSE:
 *   Same logic as H6.9.4 (Bihać/Cazin from registry + index_1990) but geometry
 *   is copied from whichever substrate is explicitly selected. Supports --substrate
 *   override to run against restored backup without changing canonical derived file.
 *
 * INPUTS (must exist; STOP and report if missing):
 *   - substrate: --substrate <path> or default data/derived/settlements_substrate.geojson
 *   - data/derived/settlements_index_1990.json
 *   - data/source/municipalities_1990_registry_110.json
 *
 * OUTPUTS:
 *   - data/derived/_debug/nw_provenance_overlay_from_census_membership_h6_9_8.geojson
 *   - data/derived/_debug/nw_provenance_overlay_from_census_membership_h6_9_8.audit.json
 *   - data/derived/_debug/nw_provenance_overlay_from_census_membership_h6_9_8.audit.txt
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_9_8_build_nw_overlays_from_census_membership.ts
 *   npx tsx scripts/map/phase_h6_9_8_build_nw_overlays_from_census_membership.ts --substrate data/source/settlements_substrate.geojson
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';
import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const DEFAULT_SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const INDEX_1990_PATH = resolve(DERIVED, 'settlements_index_1990.json');
const REGISTRY_PATH = resolve(SOURCE, 'municipalities_1990_registry_110.json');

const OVERLAY_PATH = resolve(DEBUG_DIR, 'nw_provenance_overlay_from_census_membership_h6_9_8.geojson');
const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'nw_provenance_overlay_from_census_membership_h6_9_8.audit.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'nw_provenance_overlay_from_census_membership_h6_9_8.audit.txt');

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
  [key: string]: unknown;
}

interface Index1990 {
  settlements?: Index1990Settlement[];
}

function parseArgs(): { substrate: string } {
  const args = process.argv.slice(2);
  let substrate = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--substrate' && args[i + 1]) {
      substrate = args[i + 1];
      i++;
    }
  }
  return { substrate };
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

function polygonToMultiPolygonCoords(geom: { type: string; coordinates: Polygon | MultiPolygon }): Polygon[] {
  if (geom.type === 'Polygon' && geom.coordinates)
    return [geom.coordinates as Polygon];
  if (geom.type === 'MultiPolygon' && geom.coordinates)
    return geom.coordinates as MultiPolygon;
  return [];
}

function main(): void {
  const { substrate: substrateArg } = parseArgs();
  const substratePath = substrateArg ? resolve(ROOT, substrateArg) : DEFAULT_SUBSTRATE_PATH;

  if (!existsSync(substratePath)) {
    console.error('Missing substrate:', substratePath);
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

  const substrateBytes = readFileSync(substratePath);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrateContent = substrateBytes.toString('utf8');
  const index1990Content = readFileSync(INDEX_1990_PATH, 'utf8');
  const registryContent = readFileSync(REGISTRY_PATH, 'utf8');

  const index1990Sha = computeSha256Hex(Buffer.from(index1990Content, 'utf8'));
  const registrySha = computeSha256Hex(Buffer.from(registryContent, 'utf8'));

  const registry = JSON.parse(registryContent) as { rows?: RegistryRow[] };
  const rows = registry.rows || [];
  const nameToCanonical = new Map<string, string>();
  for (const r of rows) {
    nameToCanonical.set(r.mun1990_id, r.mun1990_id);
    nameToCanonical.set(r.name, r.mun1990_id);
    if (r.normalized_name) nameToCanonical.set(r.normalized_name, r.mun1990_id);
  }

  const cazinCanonical = nameToCanonical.get('Cazin') ?? nameToCanonical.get('cazin');
  const bihacCanonical = nameToCanonical.get('Bihać') ?? nameToCanonical.get('Bihac') ?? nameToCanonical.get('bihac');
  if (!cazinCanonical) {
    console.error('Cazin mun1990_id could not be determined from registry (no name "Cazin" / "cazin"). STOP.');
    process.exit(1);
  }
  if (!bihacCanonical) {
    console.error('Bihać mun1990_id could not be determined from registry. STOP.');
    process.exit(1);
  }

  const targetMunIds = new Set<string>([bihacCanonical, cazinCanonical]);
  const index1990 = JSON.parse(index1990Content) as Index1990;
  const settlements = index1990.settlements || [];
  const sidToMun1990 = new Map<string, string>();
  for (const s of settlements) {
    const sid = s.sid;
    const raw = s.mun1990_id ?? s.mun ?? null;
    if (raw == null) continue;
    const canon = nameToCanonical.get(raw) ?? (typeof raw === 'string' && /^[a-z0-9_]+$/.test(raw) ? raw : null);
    if (canon) sidToMun1990.set(sid, canon);
  }

  const substrate = JSON.parse(substrateContent) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const substrateBbox = computeBboxFromFeatures(substrate.features);
  const substrateFeatureCount = substrate.features.length;

  const byMun = new Map<string, GeoJSONFeature[]>();
  for (const f of substrate.features) {
    const props = f.properties || {};
    const munCode = props.municipality_id ?? props.mun_code;
    const censusId = props.census_id ?? (typeof props.sid === 'string' ? props.sid.replace(/^S/, '') : null);
    if (munCode == null || censusId == null) continue;
    const lookupKey = String(munCode) + ':' + String(censusId);
    const mun1990 = sidToMun1990.get(lookupKey);
    if (!mun1990 || !targetMunIds.has(mun1990)) continue;
    if (!byMun.has(mun1990)) byMun.set(mun1990, []);
    byMun.get(mun1990)!.push(f);
  }

  const munNames: Record<string, string> = { [bihacCanonical]: 'Bihać', [cazinCanonical]: 'Cazin' };
  const featuresOut: GeoJSONFeature[] = [];
  const auditPerMun: Record<string, { sid_count: number; sid_min: string; sid_max: string; bbox: [number, number, number, number] }> = {};

  for (const munId of [bihacCanonical, cazinCanonical].sort()) {
    const memberFeatures = byMun.get(munId) || [];
    const polygons: Polygon[] = [];
    const sids: string[] = [];
    for (const f of memberFeatures) {
      const sid = (f.properties?.sid as string) ?? '';
      sids.push(sid);
      for (const poly of polygonToMultiPolygonCoords(f.geometry))
        polygons.push(poly);
    }
    sids.sort((a, b) => a.localeCompare(b));
    const sid_min = sids[0] ?? '';
    const sid_max = sids[sids.length - 1] ?? '';
    const bbox = memberFeatures.length > 0
      ? computeBboxFromFeatures(memberFeatures)
      : [0, 0, 0, 0];
    auditPerMun[munId] = { sid_count: memberFeatures.length, sid_min, sid_max, bbox };
    const munName = munNames[munId] ?? munId;
    featuresOut.push({
      type: 'Feature',
      properties: {
        mun1990_id: munId,
        mun_name: munName,
        sid_count: memberFeatures.length,
        sid_min,
        sid_max,
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: polygons,
      },
    });
  }

  const fc: GeoJSONFC = { type: 'FeatureCollection', features: featuresOut };
  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(OVERLAY_PATH, JSON.stringify(fc, null, 2), 'utf8');

  const auditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.9.8',
    overlay_path: 'nw_provenance_overlay_from_census_membership_h6_9_8.geojson',
    substrate_path: substratePath,
    substrate_sha256: substrateSha,
    substrate_feature_count: substrateFeatureCount,
    substrate_bbox: substrateBbox,
    input_sha256: {
      settlements_substrate_geojson: substrateSha,
      settlements_index_1990_json: index1990Sha,
      municipalities_1990_registry_110_json: registrySha,
    },
    target_mun1990_ids: [bihacCanonical, cazinCanonical],
    by_mun: auditPerMun,
    feature_count: featuresOut.length,
  }) as Record<string, unknown>;
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditPayload, null, 2), 'utf8');

  const lines: string[] = [
    'Phase H6.9.8 — NW provenance overlay from census membership (substrate geometry)',
    '',
    `Substrate path: ${substratePath}`,
    `Substrate SHA256: ${substrateSha.slice(0, 16)}...`,
    `Substrate feature count: ${substrateFeatureCount}`,
    `Substrate bbox: [${substrateBbox.join(', ')}]`,
    `Index_1990 SHA256: ${index1990Sha.slice(0, 16)}... registry: ${registrySha.slice(0, 16)}...`,
    `Target mun1990_ids: ${bihacCanonical}, ${cazinCanonical}`,
    `Feature count: ${featuresOut.length}`,
    '',
  ];
  for (const [munId, a] of Object.entries(auditPerMun).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${munId}: sid_count=${a.sid_count} sid_min=${a.sid_min} sid_max=${a.sid_max} bbox=[${a.bbox.join(', ')}]`);
  }
  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${OVERLAY_PATH} (${featuresOut.length} features)\n`);
  process.stdout.write(`Wrote ${AUDIT_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);
}

main();
