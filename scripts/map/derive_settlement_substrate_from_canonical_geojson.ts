/**
 * Derive canonical settlement substrate from non-SVG GeoJSON source.
 *
 * Source of truth:
 *   - data/source/bosnia_settlements_1991.geojson
 *
 * Output:
 *   - data/derived/settlements_substrate.geojson
 *
 * Deterministic: stable sort by sid, explicit ring closure, no timestamps.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';


type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface CanonicalFeature {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates?: unknown } | null;
}

interface CanonicalFC {
  type: 'FeatureCollection';
  features?: CanonicalFeature[];
}

interface MasterSettlement {
  sid: string;
  mun1990_id?: string;
}

interface MasterData {
  settlements?: MasterSettlement[];
}

interface SubstrateFeature {
  type: 'Feature';
  properties: {
    sid: string;
    census_id: string;
    settlement_name?: string;
    municipality_id: string;
    municipality_name?: string;
    mun1990_id?: string | null;
    geometry_source?: 'canonical' | 'fallback_substrate';
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | MultiPolygon;
  };
}

interface SubstrateFC {
  type: 'FeatureCollection';
  awwv_meta: {
    role: string;
    version: string;
    schema: string;
    schema_version: string;
    coordinate_space: string;
    bbox_world: number[];
    id_field: string;
    record_count: number;
    checksum_sha256: string;
  };
  features: SubstrateFeature[];
}

const ROOT = resolve();
const SOURCE_PATH = resolve(ROOT, 'data/source/bosnia_settlements_1991.geojson');
const MASTER_PATH = resolve(ROOT, 'data/source/settlements_initial_master.json');
const FALLBACK_PATH = resolve(ROOT, 'data/derived/settlements_substrate.geojson');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/settlements_substrate.geojson');
const REPORT_PATH = resolve(ROOT, 'data/derived/settlements_substrate_canonical_report.json');

function closeRing(ring: Ring): Ring | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = (first[0] === last[0] && first[1] === last[1]) ? ring : [...ring, first];
  return closed.length >= 4 ? closed : null;
}

function normalizePolygon(coords: unknown): Polygon | null {
  if (!Array.isArray(coords)) return null;
  const rings = coords as Ring[];
  const out: Polygon = [];
  for (const r of rings) {
    const closed = closeRing(r);
    if (closed) out.push(closed);
  }
  return out.length > 0 ? out : null;
}

function normalizeMultiPolygon(coords: unknown): MultiPolygon | null {
  if (!Array.isArray(coords)) return null;
  const out: MultiPolygon = [];
  for (const poly of coords as Ring[][]) {
    const normalized = normalizePolygon(poly);
    if (normalized) out.push(normalized);
  }
  return out.length > 0 ? out : null;
}

function buildMun1990Lookup(): Map<string, string> {
  if (!existsSync(MASTER_PATH)) return new Map();
  const raw = JSON.parse(readFileSync(MASTER_PATH, 'utf8')) as MasterData;
  const map = new Map<string, string>();
  for (const s of raw.settlements ?? []) {
    if (s?.sid && s?.mun1990_id) map.set(s.sid, s.mun1990_id);
  }
  return map;
}

function buildFallbackGeometryMap(): Map<string, SubstrateFeature> {
  if (!existsSync(FALLBACK_PATH)) return new Map();
  const raw = JSON.parse(readFileSync(FALLBACK_PATH, 'utf8')) as { features?: SubstrateFeature[] };
  const map = new Map<string, SubstrateFeature>();
  for (const f of raw.features ?? []) {
    const mid = f.properties?.municipality_id;
    const cid = f.properties?.census_id;
    if (!mid || !cid) continue;
    map.set(`${mid}:${cid}`, f);
  }
  return map;
}

function main(): void {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Missing canonical source: ${SOURCE_PATH}`);
  }

  const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf8')) as CanonicalFC;
  if (source.type !== 'FeatureCollection' || !Array.isArray(source.features)) {
    throw new Error('Canonical source is not a FeatureCollection');
  }

  const mun1990Lookup = buildMun1990Lookup();
  const fallbackMap = buildFallbackGeometryMap();

  const features: SubstrateFeature[] = [];
  const missingGeometry: string[] = [];
  const fallbackUsed: string[] = [];
  const skipped: string[] = [];

  for (const f of source.features) {
    const props = f.properties ?? {};
    const settlementId = String(props.settlement_id ?? props.id ?? '').trim();
    const municipalityId = String(props.municipality_id ?? props.mun_id ?? '').trim();
    const settlementName = (props.settlement_name ?? props.name ?? '').toString().trim();
    const municipalityName = (props.municipality_name ?? props.mun_name ?? '').toString().trim();

    if (!settlementId || !municipalityId) {
      skipped.push(`${municipalityId}:${settlementId}`);
      continue;
    }

    const masterSid = `${municipalityId}:${settlementId}`;
    const mun1990Id = mun1990Lookup.get(masterSid) ?? null;
    const sid = `S${settlementId}`;

    let geometry: SubstrateFeature['geometry'] | null = null;
    let geometrySource: 'canonical' | 'fallback_substrate' = 'canonical';

    const g = f.geometry;
    if (g?.type === 'Polygon') {
      const normalized = normalizePolygon(g.coordinates);
      if (normalized) geometry = { type: 'Polygon', coordinates: normalized };
    } else if (g?.type === 'MultiPolygon') {
      const normalized = normalizeMultiPolygon(g.coordinates);
      if (normalized) geometry = { type: 'MultiPolygon', coordinates: normalized };
    }

    if (!geometry) {
      const fallback = fallbackMap.get(`${municipalityId}:${settlementId}`);
      if (fallback) {
        geometry = fallback.geometry;
        geometrySource = 'fallback_substrate';
        fallbackUsed.push(masterSid);
      } else {
        missingGeometry.push(masterSid);
        continue;
      }
    }

    features.push({
      type: 'Feature',
      properties: {
        sid,
        census_id: settlementId,
        settlement_name: settlementName,
        municipality_id: municipalityId,
        municipality_name: municipalityName || undefined,
        mun1990_id: mun1990Id,
        geometry_source: geometrySource
      },
      geometry
    });
  }

  features.sort((a, b) => a.properties.sid.localeCompare(b.properties.sid));

  const bbox = computeBboxFromFeatures(features);
  const metaBase = {
    role: 'settlement_substrate',
    version: '0.0.0',
    schema: 'awwv://schemas/settlements_v0.json',
    schema_version: '0.0.0',
    coordinate_space: 'SVG_PIXELS_LEGACY',
    bbox_world: bbox,
    id_field: 'sid',
    record_count: features.length,
    checksum_sha256: ''
  };

  const contentOnly: SubstrateFC = {
    type: 'FeatureCollection',
    awwv_meta: { ...metaBase },
    features
  };
  const contentJson = JSON.stringify(contentOnly, null, 2);
  const checksum = computeSha256Hex(Buffer.from(contentJson, 'utf8'));

  const out: SubstrateFC = {
    type: 'FeatureCollection',
    awwv_meta: { ...metaBase, checksum_sha256: checksum },
    features
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');

  const report = {
    source: SOURCE_PATH,
    output: OUTPUT_PATH,
    record_count: features.length,
    fallback_used: fallbackUsed.length,
    missing_geometry: missingGeometry.length,
    skipped_missing_ids: skipped.length,
    missing_geometry_sids: missingGeometry.sort(),
    fallback_sids: fallbackUsed.sort(),
    skipped_sids: skipped.sort()
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH} (${features.length} features)\n`);
  if (missingGeometry.length > 0) {
    process.stdout.write(`Missing geometry: ${missingGeometry.length} (see report)\n`);
  }
}

main();
