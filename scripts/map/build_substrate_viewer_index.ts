/**
 * Build Substrate Viewer Index
 * 
 * CANONICAL SCRIPT FOR PHASE 0 SUBSTRATE VIEWER
 * 
 * This script is canonical for Phase 0 settlement substrate viewer. It creates
 * a lightweight lookup table keyed by sid for the substrate viewer and joins
 * settlement-level census data from bih_census_1991.json.
 * 
 * Usage:
 *   npm run map:viewer:substrate:index
 *   or: tsx scripts/map/build_substrate_viewer_index.ts
 * 
 * Outputs:
 *   - data/derived/substrate_viewer/data_index.json (canonical Phase 0 viewer index)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';
import { loadCorrectionsForViewer } from './phase_h6_10_5_apply_municipality_id_corrections_in_viewer.js';

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    sid: string;
    name?: string | null;
    municipality_id?: string | null;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | MultiPolygon;
  };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface CensusSettlement {
  p?: number[]; // [total, bosniak, croat, serb, other] or ambiguous
  [key: string]: unknown;
}

interface CensusData {
  settlements?: Record<string, CensusSettlement>;
  naselja?: Record<string, CensusSettlement>;
  settlement?: Record<string, CensusSettlement>;
  naselje?: Record<string, CensusSettlement>;
  [key: string]: unknown;
}

interface SettlementIndexEntry {
  name: string | null;
  municipality_id: string | null;
  bbox: [number, number, number, number];
  centroid: [number, number];
  majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';
  shares: {
    bosniak: number;
    croat: number;
    serb: number;
    other: number;
  };
  provenance: 'settlement' | 'no_settlement_census' | 'ambiguous_ordering';
}

interface ViewerIndex {
  meta: {
    geometry_path: string;
    census_path: string;
    settlement_names_path?: string;
    settlement_census_key: string | null;
    ordering_mode: 'named' | 'ambiguous' | 'missing';
    counts: {
      features: number;
      matched_settlement_census: number;
      unknown: number;
      majority: {
        bosniak: number;
        serb: number;
        croat: number;
        other: number;
        unknown: number;
      };
    };
    global_bbox: [number, number, number, number];
  };
  by_sid: Record<string, SettlementIndexEntry>;
}

/**
 * Compute bbox for a feature
 */
function computeBbox(coords: Polygon | MultiPolygon): { minx: number; miny: number; maxx: number; maxy: number } {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;

  const processRing = (ring: Ring) => {
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const [x, y] = pt;
      if (!isFinite(x) || !isFinite(y)) continue;
      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
    }
  };

  const isMultiPolygon = Array.isArray(coords) && 
                         coords.length > 0 && 
                         Array.isArray(coords[0]) && 
                         coords[0].length > 0 && 
                         Array.isArray(coords[0][0]) && 
                         coords[0][0].length > 0 && 
                         Array.isArray(coords[0][0][0]);

  if (isMultiPolygon) {
    for (const poly of coords as MultiPolygon) {
      if (!Array.isArray(poly)) continue;
      for (const ring of poly) {
        if (!Array.isArray(ring)) continue;
        processRing(ring);
      }
    }
  } else {
    for (const ring of coords as Polygon) {
      if (!Array.isArray(ring)) continue;
      processRing(ring);
    }
  }

  if (!isFinite(minx) || !isFinite(miny) || !isFinite(maxx) || !isFinite(maxy)) {
    return { minx: 0, miny: 0, maxx: 0, maxy: 0 };
  }

  return { minx, miny, maxx, maxy };
}

/**
 * Compute centroid (bbox center)
 */
function computeCentroid(bbox: { minx: number; miny: number; maxx: number; maxy: number }): [number, number] {
  return [
    (bbox.minx + bbox.maxx) / 2,
    (bbox.miny + bbox.maxy) / 2
  ];
}

/**
 * Detect settlement-level census table
 */
function detectSettlementCensusTable(census: CensusData, substrateSids: Set<string>): {
  key: string | null;
  table: Record<string, CensusSettlement> | null;
  overlap: number;
} {
  // Prefer explicit keys
  const explicitKeys = ['settlements', 'naselja', 'settlement', 'naselje'];
  for (const key of explicitKeys) {
    const table = census[key] as Record<string, CensusSettlement> | undefined;
    if (table && typeof table === 'object') {
      const overlap = Object.keys(table).filter(sid => substrateSids.has(sid)).length;
      if (overlap > 0) {
        return { key, table, overlap };
      }
    }
  }

  // Otherwise scan top-level objects with p arrays (len >= 5)
  let bestCandidate: { key: string; table: Record<string, CensusSettlement>; overlap: number } | null = null;
  
  for (const [key, value] of Object.entries(census)) {
    if (explicitKeys.includes(key)) continue; // Already checked
    if (key === 'metadata' || key === 'municipalities') continue; // Skip known non-settlement keys
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const table = value as Record<string, unknown>;
      // Check if values have p arrays
      let hasPArrays = false;
      let overlap = 0;
      
      for (const [sid, record] of Object.entries(table)) {
        if (substrateSids.has(sid)) {
          overlap++;
        }
        if (record && typeof record === 'object') {
          const rec = record as Record<string, unknown>;
          if (Array.isArray(rec.p) && rec.p.length >= 5) {
            hasPArrays = true;
          }
        }
      }
      
      if (hasPArrays && overlap > 0) {
        if (!bestCandidate || overlap > bestCandidate.overlap || 
            (overlap === bestCandidate.overlap && key < bestCandidate.key)) {
          bestCandidate = { key, table: table as Record<string, CensusSettlement>, overlap };
        }
      }
    }
  }
  
  if (bestCandidate) {
    return bestCandidate;
  }
  
  return { key: null, table: null, overlap: 0 };
}

/**
 * Validate p-sum: p[0] == p[1] + p[2] + p[3] + p[4]
 */
function validatePSum(p: number[]): boolean {
  if (!Array.isArray(p) || p.length < 5) return false;
  const total = p[0];
  const sum = p[1] + p[2] + p[3] + p[4];
  return Math.abs(total - sum) < 0.5; // Allow small floating point errors
}

/**
 * Compute majority ethnicity with deterministic tie-breaking
 */
function computeMajority(p: number[]): 'bosniak' | 'serb' | 'croat' | 'other' {
  if (!Array.isArray(p) || p.length < 5) return 'other';
  
  const bosniak = p[1] || 0;
  const croat = p[2] || 0;
  const serb = p[3] || 0;
  const other = p[4] || 0;
  
  const max = Math.max(bosniak, serb, croat, other);
  
  // Tie-breaking: bosniak > serb > croat > other
  if (bosniak === max) return 'bosniak';
  if (serb === max) return 'serb';
  if (croat === max) return 'croat';
  return 'other';
}

function parseGeometryPathOverride(): string | null {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--geometry_path' && args[i + 1]) return args[i + 1];
  }
  return process.env.GEOMETRY_PATH_OVERRIDE || null;
}

async function main(): Promise<void> {
  const geometryPathOverride = parseGeometryPathOverride();
  const derivedDir = resolve('data/derived');
  const outputDir = resolve(derivedDir, 'substrate_viewer');
  const defaultSubstratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const substratePath = geometryPathOverride
    ? resolve(outputDir, geometryPathOverride)
    : defaultSubstratePath;

  const censusPath = resolve('data/source/bih_census_1991.json');
  const outputPath = resolve(outputDir, 'data_index.json');
  const canonicalIndexPath = resolve(derivedDir, 'data_index.json');
  const htmlPath = resolve(outputDir, 'index.html');
  const viewerJsPath = resolve(outputDir, 'viewer.js');

  if (!existsSync(substratePath)) {
    throw new Error(`Substrate file not found: ${substratePath}`);
  }

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // Load substrate (bytes for checksum, utf8 for parse)
  process.stdout.write(`Loading ${substratePath}...\n`);
  const substrateBytes = readFileSync(substratePath);
  const substrateContent = substrateBytes.toString('utf8');
  const substrateGeoJSON = JSON.parse(substrateContent) as GeoJSONFC;

  if (substrateGeoJSON.type !== 'FeatureCollection') {
    throw new Error(`Expected FeatureCollection, got ${substrateGeoJSON.type}`);
  }

  const features = substrateGeoJSON.features;
  process.stdout.write(`Loaded ${features.length} features\n`);

  // Canonical bbox (deterministic)
  const canonical_bbox = computeBboxFromFeatures(features);

  // Only inject awwv_meta and write back when using canonical derived substrate (no override)
  let checksum_sha256: string;
  if (!geometryPathOverride) {
    const awwv_meta_base = {
      role: 'settlement_substrate',
      version: '0.0.0',
      schema: 'awwv://schemas/settlements_v0.json',
      schema_version: '0.0.0',
      coordinate_space: 'SVG_PIXELS_LEGACY',
      bbox_world: canonical_bbox,
      precision: 'float',
      id_field: 'sid',
      record_count: features.length,
      checksum_sha256: '',
    };
    const fcContentOnly = { type: 'FeatureCollection', awwv_meta: { ...awwv_meta_base }, features };
    const contentOnlyJson = JSON.stringify(fcContentOnly, null, 2);
    const contentChecksum = computeSha256Hex(Buffer.from(contentOnlyJson, 'utf8'));
    const fcWithMeta = {
      type: 'FeatureCollection',
      awwv_meta: { ...awwv_meta_base, checksum_sha256: contentChecksum },
      features,
    };
    const fullJson = JSON.stringify(fcWithMeta, null, 2);
    checksum_sha256 = computeSha256Hex(Buffer.from(fullJson, 'utf8'));
    writeFileSync(defaultSubstratePath, fullJson, 'utf8');
    process.stdout.write(`Injected awwv_meta and wrote settlements substrate (content checksum ${contentChecksum.slice(0, 12)}..., file checksum ${checksum_sha256.slice(0, 12)}...)\n`);
  } else {
    checksum_sha256 = computeSha256Hex(substrateBytes);
    process.stdout.write(`Substrate override: no write-back; geometry_path=${geometryPathOverride}\n`);
  }
  
  // Write canonical data_index.json (Phase H0: multi-dataset registry)
  // Build datasets registry (mark as available:false if file missing)
  const mun1990BoundariesPath = resolve(derivedDir, 'municipalities_1990_boundaries.geojson');
  const mun1990BoundariesV2Path = resolve(derivedDir, 'municipalities_1990_boundaries_v2.geojson');
  const politicalControlPath = resolve(derivedDir, 'political_control_data.json');
  const ethnicityPath = resolve(derivedDir, 'settlement_ethnicity_data.json');
  const settlementNamesPath = resolve(derivedDir, 'settlement_names.json');
  const mun1990NamesPath = resolve(derivedDir, 'mun1990_names.json');
  const settlementsViewerV1Path = resolve(derivedDir, 'settlements_viewer_v1.geojson');
  const settlementsViewerV1GzPath = resolve(derivedDir, 'settlements_viewer_v1.geojson.gz');
  const graphV3Path = resolve(derivedDir, 'settlement_graph_v3.json');
  const graphContinuityPath = resolve(derivedDir, 'settlement_continuity_graph.json');
  
  // Helper to load and compute metadata for a dataset if available
  const getDatasetMeta = (path: string, schema: string, idField: string): DatasetMetaPartial => {
    if (!existsSync(path)) {
      return { record_count: 0, checksum_sha256: '', available: false };
    }
    try {
      const content = readFileSync(path, 'utf8');
      const data = JSON.parse(content);
      const recordCount = data.type === 'FeatureCollection' ? data.features?.length || 0 :
                         data.nodes ? data.nodes.length :
                         data.by_sid ? Object.keys(data.by_sid).length :
                         data.by_census_id ? Object.keys(data.by_census_id).length :
                         data.by_settlement_id ? Object.keys(data.by_settlement_id).length :
                         data.by_municipality_id ? Object.keys(data.by_municipality_id).length :
                         data.by_mun1990_id ? Object.keys(data.by_mun1990_id).length :
                         data.meta?.total_municipalities ?? 0;
      const hash = computeSha256Hex(Buffer.from(content, 'utf8'));
      return { record_count: recordCount, checksum_sha256: hash, available: true };
    } catch {
      return { record_count: 0, checksum_sha256: '', available: false };
    }
  };
  
  type DatasetMetaPartial = { record_count: number; checksum_sha256: string; available: boolean };
  
  // Prefer v2 boundaries if available, fallback to v1
  const mun1990PathToUse = existsSync(mun1990BoundariesV2Path) ? mun1990BoundariesV2Path : mun1990BoundariesPath;
  const mun1990Schema = existsSync(mun1990BoundariesV2Path) ? 'awwv://schemas/mun1990_boundaries_v2.json' : 'awwv://schemas/mun1990_boundaries_v0.json';
  const mun1990Meta = getDatasetMeta(mun1990PathToUse, mun1990Schema, 'municipality_pair');
  const politicalControlMeta = getDatasetMeta(politicalControlPath, 'awwv://schemas/political_control_v0.json', 'sid');
  const ethnicityMeta = getDatasetMeta(ethnicityPath, 'awwv://schemas/settlement_ethnicity_v0.json', 'sid');
  const settlementNamesMeta = getDatasetMeta(settlementNamesPath, 'awwv://schemas/settlement_names_v1.json', 'by_census_id');
  const mun1990NamesMeta = getDatasetMeta(mun1990NamesPath, 'awwv://schemas/mun_names_v1.json', 'by_municipality_id');
  const viewerV1GeojsonExists = existsSync(settlementsViewerV1Path);
  const viewerV1GzExists = existsSync(settlementsViewerV1GzPath);
  let settlementsViewerV1Meta: { record_count: number; checksum_sha256: string; available: boolean; path_gz?: string } = {
    record_count: 0,
    checksum_sha256: '',
    available: false,
  };
  if (viewerV1GeojsonExists) {
    try {
      const content = readFileSync(settlementsViewerV1Path, 'utf8');
      const data = JSON.parse(content);
      const fc = data.type === 'FeatureCollection' && Array.isArray(data.features) ? data : null;
      settlementsViewerV1Meta = {
        record_count: fc ? fc.features.length : 0,
        checksum_sha256: computeSha256Hex(Buffer.from(content, 'utf8')),
        available: true,
        ...(viewerV1GzExists && { path_gz: 'settlements_viewer_v1.geojson.gz' }),
      };
    } catch {
      settlementsViewerV1Meta = { record_count: 0, checksum_sha256: '', available: false };
    }
  }
  const graphV3Meta = getDatasetMeta(graphV3Path, 'awwv://schemas/settlement_graph_v3.json', 'settlement_id');
  const graphContinuityMeta = getDatasetMeta(graphContinuityPath, 'awwv://schemas/settlement_continuity_graph.json', 'settlement_id');
  
  // Phase H4.2: Municipality viewer geometry and aggregates
  const municipalitiesViewerV1Path = resolve(derivedDir, 'municipalities_viewer_v1.geojson');
  const municipalitiesViewerV1GzPath = resolve(derivedDir, 'municipalities_viewer_v1.geojson.gz');
  const municipalitiesViewerV1Exists = existsSync(municipalitiesViewerV1Path);
  const municipalitiesViewerV1GzExists = existsSync(municipalitiesViewerV1GzPath);
  let municipalitiesViewerV1Meta: { record_count: number; checksum_sha256: string; available: boolean; path_gz?: string } = {
    record_count: 0,
    checksum_sha256: '',
    available: false,
  };
  if (municipalitiesViewerV1Exists) {
    try {
      const content = readFileSync(municipalitiesViewerV1Path, 'utf8');
      const data = JSON.parse(content) as { features?: unknown[] };
      municipalitiesViewerV1Meta.record_count = data.features?.length ?? 0;
      municipalitiesViewerV1Meta.checksum_sha256 = computeSha256Hex(Buffer.from(content, 'utf8'));
      municipalitiesViewerV1Meta.available = true;
      if (municipalitiesViewerV1GzExists) {
        municipalitiesViewerV1Meta.path_gz = 'municipalities_viewer_v1.geojson.gz';
      }
    } catch {
      municipalitiesViewerV1Meta.available = false;
    }
  }
  const municipalityAggPost1995Path = resolve(derivedDir, 'municipality_agg_post1995.json');
  const municipalityAgg1990Path = resolve(derivedDir, 'municipality_agg_1990.json');
  const municipalityAggPost1995Meta = getDatasetMeta(municipalityAggPost1995Path, 'awwv://schemas/municipality_agg_post1995.json', 'by_municipality_id');
  const municipalityAgg1990Meta = getDatasetMeta(municipalityAgg1990Path, 'awwv://schemas/municipality_agg_1990.json', 'by_mun1990_id');

  // Phase H6.9: Terrain scalars viewer overlay (optional)
  const terrainOverlayPath = resolve(derivedDir, 'terrain', 'terrain_scalars_viewer_overlay_h6_9.json');
  const terrainOverlayMeta = getDatasetMeta(terrainOverlayPath, 'awwv://schemas/terrain_scalars_viewer_overlay_v0.json', 'sid');
  const hasTerrainOverlay = terrainOverlayMeta.available;

  const canonicalIndex = {
    $schema: 'awwv://schemas/data_index_v1.json',
    schema_version: '1.0.0',
    coordinate_space: 'SVG_PIXELS_LEGACY',
    canonical_bbox,
    datasets: {
      settlements: {
        path: 'settlements_substrate.geojson',
        schema: 'awwv://schemas/settlements_v0.json',
        schema_version: '0.0.0',
        id_field: 'sid',
        geometry_type: 'Polygon',
        record_count: features.length,
        checksum_sha256,
        available: true,
      },
      settlements_viewer_v1: {
        path: 'settlements_viewer_v1.geojson',
        path_gz: settlementsViewerV1Meta.available && viewerV1GzExists ? 'settlements_viewer_v1.geojson.gz' : undefined,
        schema: 'awwv://schemas/settlement_geometry_viewer_v1.json',
        schema_version: '1.0.0',
        id_field: 'sid',
        geometry_type: 'Polygon',
        type: 'geometry',
        ...settlementsViewerV1Meta,
      },
      mun1990_names: {
        path: 'mun1990_names.json',
        schema: 'awwv://schemas/mun_names_v1.json',
        schema_version: '1.0.0',
        type: 'attribute_json',
        id_field: 'by_municipality_id',
        ...mun1990NamesMeta,
      },
      municipalities_1990_boundaries: {
        path: existsSync(mun1990BoundariesV2Path) ? 'municipalities_1990_boundaries_v2.geojson' : 'municipalities_1990_boundaries.geojson',
        schema: mun1990Schema,
        schema_version: '0.0.0',
        id_field: 'municipality_pair',
        geometry_type: 'MultiLineString',
        ...mun1990Meta,
      },
      political_control: {
        path: 'political_control_data.json',
        schema: 'awwv://schemas/political_control_v0.json',
        schema_version: '0.0.0',
        id_field: 'sid',
        ...politicalControlMeta,
      },
      settlement_ethnicity: {
        path: 'settlement_ethnicity_data.json',
        schema: 'awwv://schemas/settlement_ethnicity_v0.json',
        schema_version: '0.0.0',
        id_field: 'sid',
        ...ethnicityMeta,
      },
      settlement_names: {
        path: 'settlement_names.json',
        schema: 'awwv://schemas/settlement_names_v1.json',
        schema_version: '1.0.0',
        type: 'attribute_json',
        id_field: 'by_census_id',
        ...settlementNamesMeta,
      },
      graph_v3: {
        path: 'settlement_graph_v3.json',
        schema: 'awwv://schemas/settlement_graph_v3.json',
        schema_version: '0.0.0',
        id_field: 'settlement_id',
        ...graphV3Meta,
      },
      graph_continuity: {
        path: 'settlement_continuity_graph.json',
        schema: 'awwv://schemas/settlement_continuity_graph.json',
        schema_version: '0.0.0',
        id_field: 'settlement_id',
        ...graphContinuityMeta,
      },
      // Phase H4.2: Municipality viewer geometry and aggregates
      municipalities_viewer_v1: {
        path: 'municipalities_viewer_v1.geojson',
        path_gz: municipalitiesViewerV1Meta.available && municipalitiesViewerV1GzExists ? 'municipalities_viewer_v1.geojson.gz' : undefined,
        schema: 'awwv://schemas/municipalities_viewer_v1.json',
        schema_version: '1.0.0',
        id_field: 'municipality_id',
        geometry_type: 'Polygon',
        type: 'geometry',
        ...municipalitiesViewerV1Meta,
      },
      municipality_agg_post1995: {
        path: 'municipality_agg_post1995.json',
        schema: 'awwv://schemas/municipality_agg_post1995.json',
        schema_version: '1.0.0',
        type: 'attribute_json',
        id_field: 'by_municipality_id',
        ...municipalityAggPost1995Meta,
      },
      municipality_agg_1990: {
        path: 'municipality_agg_1990.json',
        schema: 'awwv://schemas/municipality_agg_1990.json',
        schema_version: '1.0.0',
        type: 'attribute_json',
        id_field: 'by_mun1990_id',
        ...municipalityAgg1990Meta,
      },
      // Phase H4: Displacement hooks (NO data, NO mechanics yet)
      displacement_settlement_turn0: {
        path: 'displacement_settlement_turn0.json',
        schema: 'awwv://schemas/displacement_settlement_v0.json',
        schema_version: '0.0.0',
        id_field: 'sid',
        record_count: 0,
        checksum_sha256: '',
        available: false,
      },
      displacement_municipality_turn0: {
        path: 'displacement_municipality_turn0.json',
        schema: 'awwv://schemas/displacement_municipality_v0.json',
        schema_version: '0.0.0',
        id_field: 'municipality_id',
        record_count: 0,
        checksum_sha256: '',
        available: false,
      },
      terrain_scalars_viewer_overlay_h6_9: {
        path: 'terrain/terrain_scalars_viewer_overlay_h6_9.json',
        schema: 'awwv://schemas/terrain_scalars_viewer_overlay_v0.json',
        schema_version: '0.0.0',
        id_field: 'sid',
        type: 'attribute_json',
        ...terrainOverlayMeta,
      },
    },
    layers: {
      base_settlements: {
        dataset: 'settlements',
        preferred_datasets: ['settlements_viewer_v1', 'settlements'],
        style: null,
        z_index: 100,
        visibility_default: true,
        available: true,
      },
      mun1990_boundaries: {
        dataset: 'municipalities_1990_boundaries',
        style: { stroke: '#333333', stroke_width: 2, stroke_opacity: 0.8 },
        z_index: 200,
        visibility_default: false,
        available: mun1990Meta.available,
      },
      political_control: {
        dataset: 'political_control',
        style: { fill_mode: 'faction_color', fill_opacity: 0.4 },
        z_index: 150,
        visibility_default: false,
        available: politicalControlMeta.available,
      },
      ethnicity_majority: {
        dataset: 'settlement_ethnicity',
        style: { fill_mode: 'majority_ethnicity', fill_opacity: 0.3 },
        z_index: 140,
        visibility_default: false,
        available: ethnicityMeta.available,
      },
      // Phase H4: Displacement layers (future)
      displacement_settlement: {
        dataset: 'displacement_settlement_turn0',
        style: { fill_mode: 'displacement_intensity', fill_opacity: 0.5 },
        z_index: 160,
        visibility_default: false,
        available: false,
      },
      displacement_municipality: {
        dataset: 'displacement_municipality_turn0',
        style: { fill_mode: 'displacement_total', fill_opacity: 0.4 },
        z_index: 155,
        visibility_default: false,
        available: false,
      },
      terrain_scalars: {
        dataset: 'terrain_scalars_viewer_overlay_h6_9',
        style: { fill_mode: 'terrain_scalar_choropleth', fill_opacity: 0.4 },
        z_index: 145,
        visibility_default: false,
        available: hasTerrainOverlay,
      },
    },
    ...(existsSync(graphContinuityPath) && {
      continuity_graph_path: 'settlement_continuity_graph.json',
    }),
    adjacency_viewer_data_path: 'adjacency_viewer/data.json',
  };
  writeFileSync(canonicalIndexPath, JSON.stringify(canonicalIndex, null, 2), 'utf8');
  process.stdout.write(`Wrote canonical index to ${canonicalIndexPath}\n`);
  
  // Load census
  process.stdout.write(`Loading ${censusPath}...\n`);
  const censusContent = readFileSync(censusPath, 'utf8');
  const census = JSON.parse(censusContent) as CensusData;
  process.stdout.write(`Loaded census data\n`);
  
  // Extract substrate SIDs and census IDs
  // SVG-derived substrate uses census_id for matching; master-derived uses sid directly
  const substrateSids = new Set<string>();
  const substrateCensusIds = new Set<string>();
  for (const feature of features) {
    if (feature.properties.sid) {
      substrateSids.add(String(feature.properties.sid));
    }
    // SVG-derived substrate has census_id field
    if (feature.properties.census_id) {
      const censusId = String(feature.properties.census_id);
      substrateCensusIds.add(censusId);
      // Also add to substrateSids for backwards compatibility (census table lookup)
      substrateSids.add(censusId);
    }
  }
  
  // Detect settlement-level census table (use census IDs if available, otherwise SIDs)
  process.stdout.write(`Detecting settlement-level census table...\n`);
  const censusDetection = detectSettlementCensusTable(census, substrateCensusIds.size > 0 ? substrateCensusIds : substrateSids);
  
  if (!censusDetection.table) {
    process.stdout.write(`WARNING: No settlement-level census table found\n`);
  }
  
  // Validate ordering if table exists
  let orderingMode: 'named' | 'ambiguous' | 'missing' = 'missing';
  let pSumFailCount = 0;
  let pSumPassCount = 0;
  
  if (censusDetection.table) {
    process.stdout.write(`Validating census ordering (p-sum checks)...\n`);
    for (const [sid, record] of Object.entries(censusDetection.table)) {
      if (!substrateSids.has(sid)) continue;
      if (record.p && Array.isArray(record.p) && record.p.length >= 5) {
        if (validatePSum(record.p)) {
          pSumPassCount++;
        } else {
          pSumFailCount++;
        }
      }
    }
    
    const totalMatched = pSumPassCount + pSumFailCount;
    const failRate = totalMatched > 0 ? pSumFailCount / totalMatched : 0;
    
    if (failRate > 0.1) {
      orderingMode = 'ambiguous';
      process.stdout.write(`WARNING: Census ordering ambiguous (${(failRate * 100).toFixed(1)}% p-sum failures)\n`);
    } else {
      orderingMode = 'named';
      process.stdout.write(`Census ordering validated: [total, bosniak, croat, serb, other]\n`);
    }
  }
  
  // Build index
  const bySid: Record<string, SettlementIndexEntry> = {};
  let globalMinx = Infinity;
  let globalMiny = Infinity;
  let globalMaxx = -Infinity;
  let globalMaxy = -Infinity;
  
  const majorityCounts = {
    bosniak: 0,
    serb: 0,
    croat: 0,
    other: 0,
    unknown: 0
  };
  
  let matchedSettlementCensus = 0;
  let unknownCount = 0;
  
  for (const feature of features) {
    const sid = String(feature.properties.sid);
    // SVG-derived substrate: use census_id for matching; master-derived: use sid directly
    const censusIdForMatching = feature.properties.census_id ? String(feature.properties.census_id) : sid;
    const name = feature.properties.name || feature.properties.settlement_name || null;
    const municipalityId = feature.properties.municipality_id || null;
    
    // Compute bbox and centroid
    const bbox = computeBbox(feature.geometry.coordinates);
    const centroid = computeCentroid(bbox);
    
    // Update global bbox
    globalMinx = Math.min(globalMinx, bbox.minx);
    globalMiny = Math.min(globalMiny, bbox.miny);
    globalMaxx = Math.max(globalMaxx, bbox.maxx);
    globalMaxy = Math.max(globalMaxy, bbox.maxy);
    
    // Join census
    let majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown' = 'unknown';
    let shares = { bosniak: 0, croat: 0, serb: 0, other: 0 };
    let provenance: 'settlement' | 'no_settlement_census' | 'ambiguous_ordering' = 'no_settlement_census';
    
    if (censusDetection.table && orderingMode !== 'missing') {
      const censusRecord = censusDetection.table[censusIdForMatching];
      if (censusRecord && censusRecord.p && Array.isArray(censusRecord.p) && censusRecord.p.length >= 5) {
        if (orderingMode === 'named' && validatePSum(censusRecord.p)) {
          // Valid ordering: [total, bosniak, croat, serb, other]
          const total = censusRecord.p[0];
          if (total > 0) {
            shares = {
              bosniak: censusRecord.p[1] / total,
              croat: censusRecord.p[2] / total,
              serb: censusRecord.p[3] / total,
              other: censusRecord.p[4] / total
            };
          }
          majority = computeMajority(censusRecord.p);
          provenance = 'settlement';
          matchedSettlementCensus++;
        } else {
          // Ambiguous ordering
          provenance = 'ambiguous_ordering';
          majority = 'unknown';
          unknownCount++;
        }
      } else {
        // No census record
        provenance = 'no_settlement_census';
        majority = 'unknown';
        unknownCount++;
      }
    } else {
      // No census table or missing
      provenance = 'no_settlement_census';
      majority = 'unknown';
      unknownCount++;
    }
    
    majorityCounts[majority]++;
    
    bySid[sid] = {
      name,
      municipality_id: municipalityId,
      bbox: [bbox.minx, bbox.miny, bbox.maxx, bbox.maxy],
      centroid,
      majority,
      shares,
      provenance
    };
  }
  
  // Sort by_sid keys deterministically
  const sortedSids = Object.keys(bySid).sort((a, b) => a.localeCompare(b));
  const sortedBySid: Record<string, SettlementIndexEntry> = {};
  for (const sid of sortedSids) {
    sortedBySid[sid] = bySid[sid];
  }
  
  // Build index (viewer-relative paths so serving data/derived/ as root works)
  const resolvedGeometryPath = geometryPathOverride ?? '../settlements_substrate.geojson';
  const index: ViewerIndex = {
    meta: {
      geometry_path: resolvedGeometryPath,
      census_path: '../../source/bih_census_1991.json',
      settlement_names_path: '../settlement_names.json',
      settlement_census_key: censusDetection.key,
      ordering_mode: orderingMode,
      counts: {
        features: features.length,
        matched_settlement_census: matchedSettlementCensus,
        unknown: unknownCount,
        majority: majorityCounts
      },
      global_bbox: [globalMinx, globalMiny, globalMaxx, globalMaxy]
    },
    by_sid: sortedBySid
  };
  
  // Write output
  writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf8');
  process.stdout.write(`Wrote index to ${outputPath}\n`);
  
  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settlement Substrate Viewer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
      height: 100vh;
    }
    #canvas-container {
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    #canvas {
      display: block;
      cursor: grab;
      background: #f5f5f5;
    }
    #canvas.dragging {
      cursor: grabbing;
    }
    #controls {
      position: absolute;
      top: 10px;
      left: 10px;
      background: white;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10;
      max-width: 300px;
      max-height: 90vh;
      overflow-y: auto;
      font-size: 12px;
    }
    .control-group {
      margin-bottom: 12px;
    }
    .control-group:last-child {
      margin-bottom: 0;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    input[type="checkbox"], input[type="text"] {
      margin-right: 6px;
    }
    input[type="text"] {
      width: 100%;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 12px;
    }
    button {
      padding: 6px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      width: 100%;
    }
    button:hover {
      background: #0056b3;
    }
    .legend {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
    }
    .legend-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .legend-color {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 6px;
      border: 1px solid #333;
      vertical-align: middle;
    }
    .tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
      pointer-events: none;
      z-index: 1000;
      max-width: 250px;
      display: none;
    }
    .tooltip-line {
      margin-bottom: 2px;
    }
    .tooltip-line:last-child {
      margin-bottom: 0;
    }
    .hint {
      margin-top: 12px;
      padding: 8px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 3px;
      font-size: 11px;
      color: #856404;
    }
    .warning-banner {
      margin-top: 12px;
      padding: 8px;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 3px;
      font-size: 11px;
      color: #721c24;
      display: none;
    }
    .warning-banner.show {
      display: block;
    }
    .serve-root-warning {
      margin-top: 8px;
      padding: 8px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 3px;
      font-size: 11px;
      color: #856404;
      display: none;
    }
    .serve-root-warning.show {
      display: block;
    }
    .error-box {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border: 2px solid #dc3545;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 500px;
      font-size: 14px;
    }
    .error-box h2 {
      color: #dc3545;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .error-box p {
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .error-box code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    .error-box ol {
      margin-left: 20px;
      margin-top: 8px;
    }
    .error-box li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="canvas"></canvas>
    <div id="tooltip" class="tooltip"></div>
    <div id="controls">
      <div class="control-group">
        <label>Color by:</label>
        <select id="color-mode" style="width: 100%; padding: 4px;">
          <option value="ethnicity">Ethnicity (majority)</option>
          <option value="municipality_id">Municipality ID (post-1995)</option>
          ${hasTerrainOverlay ? `<option value="terrain">Terrain scalar</option>` : ''}
        </select>
      </div>
      <div class="control-group" id="terrain-scalar-group" style="display: none;">
        <label>Terrain scalar:</label>
        <select id="terrain-scalar-select" style="width: 100%; padding: 4px;">
          <option value="elevation_mean_m">Elevation (m)</option>
          <option value="slope_index">Slope</option>
          <option value="road_access_index">Road access</option>
          <option value="river_crossing_penalty">River crossing</option>
          <option value="elevation_stddev_m">Elevation stddev</option>
          <option value="terrain_friction_index">Terrain friction</option>
        </select>
      </div>
      <div class="control-group" id="ethnicity-hint">
        <div style="font-size: 10px; color: #666;">
          Ethnicity: settlement-level majority. Terrain: choropleth from H6.9 overlay.
        </div>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="show-unknown-only">
          Show Unknown only
        </label>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="use-corrected-muni-id-h6105">
          Use corrected municipality_id tags (NW Bužim fix) (H6.10.5)
        </label>
        <div id="tag-corrections-status" style="font-size: 10px; color: #666;">Tag corrections: OFF, loaded corrections=0</div>
      </div>
      <div class="control-group" id="load-info-group" style="font-size: 10px; color: #666;">
        <div id="serve-root-warning-banner" class="serve-root-warning"></div>
        <div><strong>Geometry:</strong> <span id="geometry-path-display">—</span></div>
        <div><strong>Geometry fingerprint:</strong> <span id="geometry-fingerprint-display">—</span></div>
        <div><strong>Settlement names:</strong> <span id="settlement-names-status">—</span></div>
        <div><strong>Overlays:</strong> NW <span id="overlay-nw-url-display">—</span> | Mismatch <span id="overlay-mismatch-url-display">—</span> | H6.9.8 <span id="overlay-h698-url-display">—</span> | H6.10.0 <span id="overlay-h6100-url-display">—</span> | H6.10.2 <span id="overlay-h6102-url-display">—</span> | H6.10.3 <span id="overlay-h6103-bbox-url-display">—</span> | H6.10.4 <span id="overlay-h6104-ordering-url-display">—</span></div>
        <div style="margin-top: 8px;"><strong>Resolved URLs</strong></div>
        <div id="resolved-urls-content" style="word-break: break-all; font-size: 9px;">—</div>
      </div>
      <div class="control-group">
        <label>SID filter (substring):</label>
        <input type="text" id="filter-sid" placeholder="(empty for all)">
      </div>
      <div class="control-group">
        <button id="reset-view">Reset View</button>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-bihac-overlay">
          Debug: NW overlays (Bihać/Cazin) from substrate SIDs (H6.9.4)
        </label>
        <span id="debug-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h659-mismatch-overlay">
          Debug: NW overlay mismatches (H6.9.5)
        </label>
        <span id="mismatch-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h698-census-membership-overlay">
          NW overlay from census membership (H6.9.8, substrate override)
        </label>
        <span id="h698-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h6100-mun1990-composite-overlay">
          Debug: NW overlays (Bihać/Cazin) as 1990 composites (H6.10.0)
        </label>
        <span id="h6100-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h6102-post1995-overlay">
          Debug: NW triad (Bihać/Cazin/Bužim) post-1995 overlays from census (H6.10.2)
        </label>
        <span id="h6102-post1995-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h6102-mun1990-composite-overlay">
          Debug: NW triad 1990 composites (Bihać, Cazin+Bužim) from census (H6.10.2)
        </label>
        <span id="h6102-mun1990-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h6103-mun-bbox-overlay">
          Debug: Municipality bbox diagnostics (NW codes + westmost) (H6.10.3)
        </label>
        <span id="h6103-bbox-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">Use this to identify which municipality_id codes occupy the far NW of the substrate.</div>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" id="debug-h6104-nw-ordering-overlay">
          Debug: NW ordering invariants (Bihać/Cazin/Bužim/V. Kladuša) (H6.10.4)
        </label>
        <span id="h6104-ordering-overlay-status" class="layer-status" style="display:block;font-size:11px;color:#666;"></span>
      </div>
      <div class="legend" id="debug-overlay-legend" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px;"></div>
      <div class="legend" id="h6102-overlay-legend" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px;"></div>
      <div class="warning-banner" id="warning-banner"></div>
      <div class="legend" id="legend"></div>
    </div>
    <div id="error-box" class="error-box" style="display: none;"></div>
  </div>
  <script src="./viewer.js"></script>
</body>
</html>`;
  
  writeFileSync(htmlPath, html, 'utf8');
  process.stdout.write(`Wrote HTML to ${htmlPath}\n`);
  
  const debugDir = resolve(derivedDir, '_debug');
  const muniIdCorrectionsEntries = loadCorrectionsForViewer(debugDir);
  
  // Generate viewer.js with file:// detection
  const viewerJs = `/**
 * Substrate Settlement Viewer
 * 
 * Pure static viewer - no bundler required.
 * Loads settlement geometry from settlements_substrate.geojson
 * and index data, renders to canvas with pan/zoom.
 * 
 * Strict settlement-level majority ethnicity coloring only (no municipality fallback).
 */

(function() {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');
  const colorModeSelect = document.getElementById('color-mode');
  const terrainScalarSelect = document.getElementById('terrain-scalar-select');
  const showUnknownOnlyCheck = document.getElementById('show-unknown-only');
  const filterSidInput = document.getElementById('filter-sid');
  const resetViewBtn = document.getElementById('reset-view');
  const legendDiv = document.getElementById('legend');
  const warningBanner = document.getElementById('warning-banner');
  const errorBox = document.getElementById('error-box');
  const debugOverlayCheck = document.getElementById('debug-bihac-overlay');
  const debugH659MismatchCheck = document.getElementById('debug-h659-mismatch-overlay');
  const debugH698OverlayCheck = document.getElementById('debug-h698-census-membership-overlay');
  const debugH6100OverlayCheck = document.getElementById('debug-h6100-mun1990-composite-overlay');
  const debugH6102Post1995Check = document.getElementById('debug-h6102-post1995-overlay');
  const debugH6102Mun1990Check = document.getElementById('debug-h6102-mun1990-composite-overlay');
  const debugH6103BboxCheck = document.getElementById('debug-h6103-mun-bbox-overlay');
  const debugH6104OrderingCheck = document.getElementById('debug-h6104-nw-ordering-overlay');
  const debugOverlayLegendDiv = document.getElementById('debug-overlay-legend');
  const debugOverlayStatusSpan = document.getElementById('debug-overlay-status');
  const mismatchOverlayStatusSpan = document.getElementById('mismatch-overlay-status');
  const h698OverlayStatusSpan = document.getElementById('h698-overlay-status');
  const h6100OverlayStatusSpan = document.getElementById('h6100-overlay-status');
  const h6102Post1995OverlayStatusSpan = document.getElementById('h6102-post1995-overlay-status');
  const h6102Mun1990OverlayStatusSpan = document.getElementById('h6102-mun1990-overlay-status');
  const h6103BboxOverlayStatusSpan = document.getElementById('h6103-bbox-overlay-status');
  const h6104OrderingOverlayStatusSpan = document.getElementById('h6104-ordering-overlay-status');
  const h6102OverlayLegendDiv = document.getElementById('h6102-overlay-legend');
  const settlementNamesStatusEl = document.getElementById('settlement-names-status');
  const useCorrectedMuniIdCheck = document.getElementById('use-corrected-muni-id-h6105');
  const tagCorrectionsStatusEl = document.getElementById('tag-corrections-status');

  var MUNI_ID_CORRECTIONS_ENTRIES = ${JSON.stringify(muniIdCorrectionsEntries)};
  var MUNI_ID_CORRECTIONS = new Map(MUNI_ID_CORRECTIONS_ENTRIES);

  var OVERLAY_NW_URL = '../_debug/nw_provenance_overlay_from_substrate_h6_9_4.geojson';
  var MISMATCH_OVERLAY_URL = '../_debug/nw_overlay_mismatch_overlay_h6_9_5.geojson';
  var OVERLAY_H698_URL = '../_debug/nw_provenance_overlay_from_census_membership_h6_9_8.geojson';
  var OVERLAY_H6100_URL = '../_debug/mun1990_overlays_nw_h6_10_0.geojson';
  var OVERLAY_H6102_POST1995_URL = '../_debug/nw_triad_post1995_overlays_h6_10_2.geojson';
  var OVERLAY_H6102_MUN1990_URL = '../_debug/nw_triad_mun1990_composite_overlays_h6_10_2.geojson';
  var OVERLAY_H6103_BBOX_URL = '../_debug/nw_muni_bboxes_overlay_h6_10_3.geojson';
  var OVERLAY_H6104_ORDERING_URL = '../_debug/nw_ordering_invariants_overlay_h6_10_4.geojson';
  var TERRAIN_OVERLAY_PATH = '../terrain/terrain_scalars_viewer_overlay_h6_9.json';

  function resolveUrl(relativeOrAbsolute) {
    if (relativeOrAbsolute.startsWith('http:') || relativeOrAbsolute.startsWith('https:')) return relativeOrAbsolute;
    return new URL(relativeOrAbsolute, window.location.href).toString();
  }

  async function computeGeometryFingerprint(arrayBuffer) {
    var bytes = arrayBuffer.byteLength;
    var sliceLen = Math.min(bytes, 262144);
    var slice = arrayBuffer.slice(0, sliceLen);
    var hashBuffer = await crypto.subtle.digest('SHA-256', slice);
    var hashArray = new Uint8Array(hashBuffer);
    var hex = '';
    for (var i = 0; i < hashArray.length; i++) hex += ('0' + hashArray[i].toString(16)).slice(-2);
    return { bytes: bytes, sha256_256k: hex.substring(0, 16) };
  }

  async function probeFirstOkUrl(candidates, label) {
    var lbl = label || 'URL';
    var lastStatus = null;
    var lastUrl = null;
    for (var i = 0; i < candidates.length; i++) {
      var u = candidates[i];
      var url = (u.startsWith('http:') || u.startsWith('https:')) ? u : new URL(u, window.location.href).toString();
      try {
        var r = await fetch(url, { method: 'GET' });
        if (r.ok) return url;
        lastStatus = r.status;
        lastUrl = url;
      } catch (e) {
        lastUrl = url;
        lastStatus = (e && e.message) ? e.message : 'network error';
      }
      try {
        var r2 = await fetch(url, { method: 'HEAD' });
        if (r2.ok) return url;
        lastStatus = r2.status;
        lastUrl = url;
      } catch (e2) {}
    }
    var errDetail = lastStatus != null ? ' (last: ' + String(lastUrl) + ' -> ' + String(lastStatus) + ')' : '';
    throw new Error('No ' + lbl + ' candidates succeeded: ' + candidates.join(', ') + errDetail);
  }

  function getSettlementNamesPath() {
    return (dataIndex && dataIndex.meta && dataIndex.meta.settlement_names_path) ? dataIndex.meta.settlement_names_path : '../settlement_names.json';
  }

  function resolveOverlayPath(relPath) {
    if (overlayPathPrefix) return overlayPathPrefix + relPath;
    return derivedRoot ? (derivedRoot + '/' + relPath) : ('/' + relPath);
  }

  function updateTagCorrectionsStatus() {
    if (!tagCorrectionsStatusEl) return;
    var on = useCorrectedMuniIdCheck && useCorrectedMuniIdCheck.checked;
    var n = MUNI_ID_CORRECTIONS ? MUNI_ID_CORRECTIONS.size : 0;
    tagCorrectionsStatusEl.textContent = 'Tag corrections: ' + (on ? 'ON' : 'OFF') + ', loaded corrections=' + n;
  }

  function updateServeRootWarning() {
    var el = document.getElementById('serve-root-warning-banner');
    if (!el || !geometryUrlChosen) return;
    var pathname = window.location.pathname || '';
    var geom = geometryUrlChosen;
    var msg = '';
    if (geom.indexOf('/data/derived/') >= 0 && pathname.indexOf('/data/derived/substrate_viewer/') < 0 && pathname.indexOf('/substrate_viewer/') >= 0) {
      msg = 'Viewer is running in repo-root mode; you may be serving from repo root. Use /data/derived/substrate_viewer/ URL.';
    } else if ((geom === '/settlements_substrate.geojson' || geom.indexOf('/settlements_substrate.geojson') >= 0) && pathname.indexOf('/data/derived/substrate_viewer/') >= 0) {
      msg = 'Viewer is running in derived-root mode; you may be serving from data/derived. Use /substrate_viewer/ URL.';
    }
    if (msg) {
      el.textContent = msg;
      el.classList.add('show');
    } else {
      el.textContent = '';
      el.classList.remove('show');
    }
  }

  function updateLoadInfoDisplay() {
    var geomEl = document.getElementById('geometry-path-display');
    if (geomEl) geomEl.textContent = geometryUrlChosen || (dataIndex && dataIndex.meta ? dataIndex.meta.geometry_path : '') || '—';
    var fpEl = document.getElementById('geometry-fingerprint-display');
    if (fpEl && geometryFingerprint) fpEl.textContent = 'bytes=' + geometryFingerprint.bytes + ' sha256_256k=' + geometryFingerprint.sha256_256k;
    else if (fpEl) fpEl.textContent = '—';
    if (settlementNamesStatusEl) {
      if (settlementNamesLoadStatus === 'ok') settlementNamesStatusEl.textContent = 'OK';
      else if (settlementNamesLoadStatus === 'error') settlementNamesStatusEl.textContent = 'ERROR (see console)';
      else if (settlementNamesLoadStatus === 'disabled') settlementNamesStatusEl.textContent = 'DISABLED';
      else settlementNamesStatusEl.textContent = 'loading';
    }
    updateTagCorrectionsStatus();
    var nwEl = document.getElementById('overlay-nw-url-display');
    if (nwEl) nwEl.textContent = OVERLAY_NW_URL;
    var mismatchEl = document.getElementById('overlay-mismatch-url-display');
    if (mismatchEl) mismatchEl.textContent = MISMATCH_OVERLAY_URL;
    var h698El = document.getElementById('overlay-h698-url-display');
    if (h698El) h698El.textContent = OVERLAY_H698_URL;
    var h6100El = document.getElementById('overlay-h6100-url-display');
    if (h6100El) h6100El.textContent = OVERLAY_H6100_URL;
    var h6102El = document.getElementById('overlay-h6102-url-display');
    if (h6102El) h6102El.textContent = OVERLAY_H6102_POST1995_URL + ' / ' + OVERLAY_H6102_MUN1990_URL;
    var h6103BboxEl = document.getElementById('overlay-h6103-bbox-url-display');
    if (h6103BboxEl) h6103BboxEl.textContent = OVERLAY_H6103_BBOX_URL;
    var h6104OrderingEl = document.getElementById('overlay-h6104-ordering-url-display');
    if (h6104OrderingEl) h6104OrderingEl.textContent = OVERLAY_H6104_ORDERING_URL;
    var resolvedEl = document.getElementById('resolved-urls-content');
    if (resolvedEl) {
      var gp = (dataIndex && dataIndex.meta) ? (dataIndex.meta.geometry_path || '') : '';
      var snp = getSettlementNamesPath();
      var lines = [];
      lines.push('geometry_url_chosen: ' + (geometryUrlChosen || '—'));
      lines.push('settlement_names_url_chosen: ' + (settlementNamesUrlChosen || '—'));
      lines.push('derived_root_mode: ' + derivedRootMode);
      lines.push('geometry_path (raw): ' + gp);
      lines.push('geometry_url_resolved: ' + (gp ? resolveUrl(gp) : '—'));
      lines.push('settlement_names_path (raw): ' + snp);
      lines.push('settlement_names_url_resolved: ' + (snp ? resolveUrl(snp) : '—'));
      lines.push('overlay_nw (raw): ' + OVERLAY_NW_URL);
      lines.push('overlay_nw_resolved: ' + resolveOverlayPath('_debug/nw_provenance_overlay_from_substrate_h6_9_4.geojson'));
      lines.push('overlay_mismatch (raw): ' + MISMATCH_OVERLAY_URL);
      lines.push('overlay_mismatch_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_overlay_mismatch_overlay_h6_9_5.geojson')));
      lines.push('overlay_h698 (raw): ' + OVERLAY_H698_URL);
      lines.push('overlay_h698_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_provenance_overlay_from_census_membership_h6_9_8.geojson')));
      lines.push('overlay_h6100 (raw): ' + OVERLAY_H6100_URL);
      lines.push('overlay_h6100_resolved: ' + resolveUrl(resolveOverlayPath('_debug/mun1990_overlays_nw_h6_10_0.geojson')));
      lines.push('overlay_h6102_post1995 (raw): ' + OVERLAY_H6102_POST1995_URL);
      lines.push('overlay_h6102_post1995_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_triad_post1995_overlays_h6_10_2.geojson')));
      lines.push('overlay_h6102_mun1990 (raw): ' + OVERLAY_H6102_MUN1990_URL);
      lines.push('overlay_h6102_mun1990_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_triad_mun1990_composite_overlays_h6_10_2.geojson')));
      lines.push('overlay_h6103_bbox (raw): ' + OVERLAY_H6103_BBOX_URL);
      lines.push('overlay_h6103_bbox_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_muni_bboxes_overlay_h6_10_3.geojson')));
      lines.push('overlay_h6104_ordering (raw): ' + OVERLAY_H6104_ORDERING_URL);
      lines.push('overlay_h6104_ordering_resolved: ' + resolveUrl(resolveOverlayPath('_debug/nw_ordering_invariants_overlay_h6_10_4.geojson')));
      lines.push('terrain (raw): ' + TERRAIN_OVERLAY_PATH);
      lines.push('terrain_resolved: ' + resolveUrl(resolveOverlayPath('terrain/terrain_scalars_viewer_overlay_h6_9.json')));
      resolvedEl.textContent = lines.join('\\n');
    }
    updateServeRootWarning();
  }

  let settlementsGeoJSON = null;
  let dataIndex = null;
  var geometryUrlChosen = null;
  var settlementNamesUrlChosen = null;
  var derivedRoot = '';
  var derivedRootMode = 'derived-root';
  var overlayPathPrefix = ''; // '' or '../' when serving from substrate_viewer/
  var geometryFingerprint = null; // { bytes: number, sha256_256k: string }
  let debugOverlayGeoJSON = null;
  let debugH659MismatchGeoJSON = null;
  let debugH698OverlayGeoJSON = null;
  let debugH6100OverlayGeoJSON = null;
  let debugH6102Post1995OverlayGeoJSON = null;
  let debugH6102Mun1990OverlayGeoJSON = null;
  let debugH6103BboxOverlayGeoJSON = null;
  let debugH6104OrderingOverlayGeoJSON = null;
  let mismatchOverlayLoggedOnce = false;
  var debugOverlayLoadStatus = 'pending';
  var mismatchOverlayLoadStatus = 'pending';
  var h698OverlayLoadStatus = 'pending';
  var h6100OverlayLoadStatus = 'pending';
  var h6102Post1995OverlayLoadStatus = 'pending';
  var h6102Mun1990OverlayLoadStatus = 'pending';
  var h6103BboxOverlayLoadStatus = 'pending';
  var h6104OrderingOverlayLoadStatus = 'pending';
  var settlementNamesLoadStatus = 'pending';
  var terrainOverlayLoadStatus = 'pending';
  var lastDrawCount = { settlements: 0, nwOverlay: 0, mismatch: 0, h698: 0, h6100: 0, h6102Post1995: 0, h6102Mun1990: 0, h6103Bbox: 0, h6104Ordering: 0 };
  let terrainOverlayData = null;
  const settlementIndex = new Map(); // sid -> index entry
  const settlementNamesMap = new Map(); // census_id -> name (authoritative, from settlement_names.json)

  // View state
  let viewX = 0;
  let viewY = 0;
  let viewScale = 1;
  let globalBounds = null;

  // Pan/zoom state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartViewX = 0;
  let dragStartViewY = 0;

  // Hover state
  let hoveredFeature = null;

  // Fixed color palette (must match exactly)
  const ETHNICITY_COLORS = {
    bosniak: '#2e7d32', // Green
    serb: '#c62828',    // Red
    croat: '#1565c0',   // Blue
    other: '#6d6d6d',   // Gray
    unknown: '#bdbdbd', // Light gray
  };
  
  // Convert hex to rgba with opacity for fills
  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
  }

  const STROKE_COLOR = 'rgba(0, 0, 0, 0.5)';
  const STROKE_WIDTH = 1;

  // Show file:// protocol error
  function showFileProtocolError() {
    errorBox.innerHTML = \`
      <h2>Cannot Load Data</h2>
      <p><strong>Browsers block fetch() requests from file:// protocol for security.</strong></p>
      <p>To view this map, you need to run a local web server:</p>
      <ol>
        <li>Open a terminal (e.g. in repo root or in data/derived)</li>
        <li>Run: <code>npx http-server -p 8080</code></li>
        <li>Open the viewer (e.g. <code>http://localhost:8080/substrate_viewer/index.html</code> when serving from data/derived)</li>
      </ol>
    \`;
    errorBox.style.display = 'block';
  }

  // Fatal contract error (missing/mismatch)
  function showFatalError(msg) {
    errorBox.innerHTML = '<h2>Contract Error</h2><p>' + String(msg).replace(/</g, '&lt;') + '</p>';
    errorBox.style.display = 'block';
  }

  // H6.10.5: Apply municipality_id corrections (deterministic feature_key = sid ?? census_id#ordinal)
  function applyMunicipalityIdCorrections(fc) {
    if (!fc || !fc.features) return;
    var censusIdToFeatures = {};
    for (var i = 0; i < fc.features.length; i++) {
      var f = fc.features[i];
      var cid = f.properties && f.properties.census_id != null ? String(f.properties.census_id) : '';
      if (!cid) continue;
      if (!censusIdToFeatures[cid]) censusIdToFeatures[cid] = [];
      censusIdToFeatures[cid].push(f);
    }
    for (var cid in censusIdToFeatures) {
      var list = censusIdToFeatures[cid];
      list.sort(function(a, b) {
        var sidA = (a.properties && a.properties.sid != null) ? String(a.properties.sid) : '';
        var sidB = (b.properties && b.properties.sid != null) ? String(b.properties.sid) : '';
        if (sidA !== sidB) return sidA.localeCompare(sidB);
        var bboxA = computeFeatureBounds(a);
        var bboxB = computeFeatureBounds(b);
        if (!bboxA || !bboxB) return 0;
        if (bboxA.minX !== bboxB.minX) return bboxA.minX - bboxB.minX;
        if (bboxA.minY !== bboxB.minY) return bboxA.minY - bboxB.minY;
        if (bboxA.maxX !== bboxB.maxX) return bboxA.maxX - bboxB.maxX;
        if (bboxA.maxY !== bboxB.maxY) return bboxA.maxY - bboxB.maxY;
        return 0;
      });
      for (var ord = 0; ord < list.length; ord++) {
        var feat = list[ord];
        var sid = feat.properties && feat.properties.sid != null ? String(feat.properties.sid) : null;
        var featureKey = sid !== null && sid !== '' ? sid : cid + '#' + ord;
        var raw = (feat.properties && feat.properties.municipality_id != null) ? String(feat.properties.municipality_id) : '';
        feat.__mun_id_corrected = MUNI_ID_CORRECTIONS.get(featureKey) !== undefined ? MUNI_ID_CORRECTIONS.get(featureKey) : raw;
      }
    }
    for (var j = 0; j < fc.features.length; j++) {
      var f2 = fc.features[j];
      if (f2.__mun_id_corrected === undefined) {
        var raw2 = (f2.properties && f2.properties.municipality_id != null) ? String(f2.properties.municipality_id) : '';
        f2.__mun_id_corrected = raw2;
      }
    }
  }

  // SHA-256 of ArrayBuffer as hex (browser)
  async function sha256Hex(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Transform world to screen
  function worldToScreen(x, y) {
    return {
      x: x * viewScale + viewX,
      y: y * viewScale + viewY
    };
  }

  // Transform screen to world
  function screenToWorld(x, y) {
    return {
      x: (x - viewX) / viewScale,
      y: (y - viewY) / viewScale
    };
  }

  // Compute bounds for a feature
  function computeFeatureBounds(feature) {
    const geom = feature.geometry;
    let coords = [];
    
    if (geom.type === 'Polygon') {
      coords = geom.coordinates[0] || [];
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (poly[0]) coords.push(...poly[0]);
      }
    }
    
    if (coords.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const coord of coords) {
      if (coord.length >= 2) {
        const x = coord[0];
        const y = coord[1];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  }

  // Fit view to bounds
  function fitToBounds(bounds) {
    if (!bounds) return;
    
    const padding = 20;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    if (width === 0 || height === 0) return;
    
    const scaleX = (canvas.width - padding * 2) / width;
    const scaleY = (canvas.height - padding * 2) / height;
    viewScale = Math.min(scaleX, scaleY);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    viewX = canvas.width / 2 - centerX * viewScale;
    viewY = canvas.height / 2 - centerY * viewScale;
    
    render();
  }

  // Get index entry for a feature
  function getIndexEntry(feature) {
    if (!dataIndex) return null;
    
    const sid = feature.properties?.sid;
    if (sid) {
      return settlementIndex.get(String(sid)) || null;
    }
    
    return null;
  }

  // Check if feature passes filters
  function passesFilters(feature, indexEntry) {
    const sidFilter = filterSidInput.value.trim();
    
    if (sidFilter) {
      const sid = feature.properties?.sid;
      if (!sid || !String(sid).includes(sidFilter)) {
        return false;
      }
    }
    
    // Show Unknown only filter (ethnicity mode only)
    if (showUnknownOnlyCheck && showUnknownOnlyCheck.checked && colorModeSelect && colorModeSelect.value === 'ethnicity') {
      if (!indexEntry || indexEntry.majority !== 'unknown') {
        return false;
      }
    }
    
    return true;
  }

  // Render polygon outline
  function renderPolygon(coords, fillColor, strokeColor) {
    if (coords.length < 2) return;
    
    ctx.beginPath();
    const first = worldToScreen(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);
    
    for (let i = 1; i < coords.length; i++) {
      const pt = worldToScreen(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }
    
    ctx.closePath();
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.stroke();
    }
  }

  // Render feature
  function renderFeature(feature, indexEntry) {
    const geom = feature.geometry;
    
    // Determine fill color
    let fillColor = null;
    const colorMode = colorModeSelect ? colorModeSelect.value : 'ethnicity';
    if (colorMode === 'terrain' && terrainOverlayData && terrainScalarSelect) {
      const field = terrainScalarSelect.value;
      const rec = terrainOverlayData.by_sid && terrainOverlayData.by_sid[feature.properties?.sid];
      const bounds = terrainOverlayData.awwv_meta?.scalar_bounds?.[field];
      if (rec && bounds && field in rec) {
        const v = rec[field];
        const span = bounds.max - bounds.min || 1;
        const t = Math.max(0, Math.min(1, (Number(v) - bounds.min) / span));
        const r = Math.round(255 * t);
        const b = Math.round(255 * (1 - t));
        fillColor = \`rgba(\${r}, 100, \${b}, 0.4)\`;
      } else {
        fillColor = 'rgba(180, 180, 180, 0.3)';
      }
    } else if (colorMode === 'ethnicity') {
      if (dataIndex && dataIndex.meta.ordering_mode === 'ambiguous') {
        fillColor = hexToRgba(ETHNICITY_COLORS.unknown, 0.3);
      } else if (indexEntry && indexEntry.majority) {
        const colorHex = ETHNICITY_COLORS[indexEntry.majority];
        if (colorHex) {
          fillColor = hexToRgba(colorHex, 0.3);
        }
      } else {
        fillColor = hexToRgba(ETHNICITY_COLORS.unknown, 0.3);
      }
    } else if (colorMode === 'municipality_id') {
      const useCorrected = useCorrectedMuniIdCheck && useCorrectedMuniIdCheck.checked;
      const munId = (useCorrected && feature.__mun_id_corrected !== undefined) ? feature.__mun_id_corrected : (feature.properties && feature.properties.municipality_id != null ? String(feature.properties.municipality_id) : '');
      var MUN_COLORS = { '10049': 'rgba(0,180,0,0.35)', '10227': 'rgba(80,80,220,0.35)', '11240': 'rgba(220,0,180,0.35)' };
      fillColor = MUN_COLORS[munId] || (function() {
        var h = 0;
        for (var k = 0; k < (munId || '?').length; k++) h = ((h << 5) - h) + (munId || '?').charCodeAt(k);
        h = Math.abs(h % 360);
        return 'hsla(' + h + ', 60%, 50%, 0.35)';
      })();
    }
    
    if (geom.type === 'Polygon') {
      const coords = geom.coordinates;
      if (coords && coords[0]) {
        renderPolygon(coords[0], fillColor, STROKE_COLOR);
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (poly && poly[0]) {
          renderPolygon(poly[0], fillColor, STROKE_COLOR);
        }
      }
    }
    if (useCorrectedMuniIdCheck && useCorrectedMuniIdCheck.checked && feature.__mun_id_corrected !== undefined && feature.__mun_id_corrected !== (feature.properties && feature.properties.municipality_id != null ? String(feature.properties.municipality_id) : '')) {
      var magStroke = 'rgba(220,0,180,0.9)';
      var prevLw = ctx.lineWidth;
      ctx.lineWidth = 2;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        renderPolygon(geom.coordinates[0], null, magStroke);
      } else if (geom.type === 'MultiPolygon') {
        for (var pi = 0; pi < geom.coordinates.length; pi++) {
          if (geom.coordinates[pi] && geom.coordinates[pi][0]) renderPolygon(geom.coordinates[pi][0], null, magStroke);
        }
      }
      ctx.lineWidth = prevLw;
    }
  }

  // Render all features
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!settlementsGeoJSON) return;
    
    // Draw features in deterministic order: sorted by sid (string compare)
    const features = [...settlementsGeoJSON.features];
    features.sort((a, b) => {
      const sidA = a.properties?.sid || '';
      const sidB = b.properties?.sid || '';
      return String(sidA).localeCompare(String(sidB));
    });
    
    lastDrawCount.settlements = 0;
    lastDrawCount.nwOverlay = 0;
    for (const feature of features) {
      const indexEntry = getIndexEntry(feature);
      
      if (!passesFilters(feature, indexEntry)) continue;
      
      renderFeature(feature, indexEntry);
      lastDrawCount.settlements++;
    }
    
    if (debugOverlayCheck && debugOverlayCheck.checked && debugOverlayGeoJSON && debugOverlayGeoJSON.features) {
      renderDebugOverlay();
    }
    if (debugH659MismatchCheck && debugH659MismatchCheck.checked && debugH659MismatchGeoJSON && debugH659MismatchGeoJSON.features) {
      renderDebugH659MismatchOverlay();
    }
    if (debugH698OverlayCheck && debugH698OverlayCheck.checked && debugH698OverlayGeoJSON && debugH698OverlayGeoJSON.features) {
      renderDebugH698Overlay();
    }
    if (debugH6100OverlayCheck && debugH6100OverlayCheck.checked && debugH6100OverlayGeoJSON && debugH6100OverlayGeoJSON.features) {
      renderDebugH6100Overlay();
    }
    if (debugH6102Post1995Check && debugH6102Post1995Check.checked && debugH6102Post1995OverlayGeoJSON && debugH6102Post1995OverlayGeoJSON.features) {
      renderDebugH6102Post1995Overlay();
    }
    if (debugH6102Mun1990Check && debugH6102Mun1990Check.checked && debugH6102Mun1990OverlayGeoJSON && debugH6102Mun1990OverlayGeoJSON.features) {
      renderDebugH6102Mun1990Overlay();
    }
    if (debugH6103BboxCheck && debugH6103BboxCheck.checked && debugH6103BboxOverlayGeoJSON && debugH6103BboxOverlayGeoJSON.features) {
      renderH6103BboxOverlay();
    }
    if (debugH6104OrderingCheck && debugH6104OrderingCheck.checked && debugH6104OrderingOverlayGeoJSON && debugH6104OrderingOverlayGeoJSON.features) {
      renderH6104OrderingOverlay();
    }
    
    // Draw hover highlight
    if (hoveredFeature) {
      const indexEntry = getIndexEntry(hoveredFeature);
      if (passesFilters(hoveredFeature, indexEntry)) {
        const geom = hoveredFeature.geometry;
        if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.lineWidth = 2;
          renderPolygon(geom.coordinates[0], null, 'rgba(255, 0, 0, 0.8)');
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            if (poly && poly[0]) {
              ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
              ctx.lineWidth = 2;
              renderPolygon(poly[0], null, 'rgba(255, 0, 0, 0.8)');
            }
          }
        }
      }
    }
  }

  // Find feature at point (simple bbox check)
  function findFeatureAt(x, y) {
    if (!settlementsGeoJSON) return null;
    
    const world = screenToWorld(x, y);
    
    // Check features in reverse order (top-most first)
    const features = [...settlementsGeoJSON.features].reverse();
    for (const feature of features) {
      const bounds = computeFeatureBounds(feature);
      if (bounds && world.x >= bounds.minX && world.x <= bounds.maxX &&
          world.y >= bounds.minY && world.y <= bounds.maxY) {
        return feature;
      }
    }
    
    return null;
  }

  // Settlement display name: authoritative name table (census_id -> name), never municipality name
  function getSettlementDisplayName(feature) {
    var censusId = feature.properties && feature.properties.census_id != null ? String(feature.properties.census_id) : null;
    if (censusId && settlementNamesMap.has(censusId)) return settlementNamesMap.get(censusId);
    var sid = feature.properties && feature.properties.sid != null ? String(feature.properties.sid) : null;
    if (sid) return sid;
    return '(unknown settlement)';
  }

  // Update tooltip
  function updateTooltip(feature, x, y) {
    if (!feature) {
      tooltip.style.display = 'none';
      return;
    }
    
    const indexEntry = getIndexEntry(feature);
    
    let html = '';
    
    const sid = feature.properties?.sid || '(missing sid)';
    html += \`<div class="tooltip-line"><strong>SID:</strong> \${sid}</div>\`;
    
    html += \`<div class="tooltip-line"><strong>Name:</strong> \${getSettlementDisplayName(feature)}</div>\`;
    
    // Provenance
    if (indexEntry && indexEntry.provenance) {
      html += \`<div class="tooltip-line"><strong>Provenance:</strong> \${indexEntry.provenance}</div>\`;
    }
    
    // Majority
    if (indexEntry && indexEntry.majority) {
      html += \`<div class="tooltip-line"><strong>Majority:</strong> \${indexEntry.majority}</div>\`;
    } else {
      html += \`<div class="tooltip-line"><strong>Majority:</strong> unknown</div>\`;
    }
    
    // Composition breakdown (when ordering_mode is "named")
    if (indexEntry && indexEntry.shares && dataIndex && dataIndex.meta.ordering_mode === 'named') {
      html += '<div class="tooltip-line"><strong>Composition:</strong></div>';
      const shares = indexEntry.shares;
      if (shares.bosniak !== undefined) html += \`<div class="tooltip-line">  Bosniak: \${(shares.bosniak * 100).toFixed(1)}%</div>\`;
      if (shares.croat !== undefined) html += \`<div class="tooltip-line">  Croat: \${(shares.croat * 100).toFixed(1)}%</div>\`;
      if (shares.serb !== undefined) html += \`<div class="tooltip-line">  Serb: \${(shares.serb * 100).toFixed(1)}%</div>\`;
      if (shares.other !== undefined) html += \`<div class="tooltip-line">  Other: \${(shares.other * 100).toFixed(1)}%</div>\`;
    }
    
    // If unknown, show why
    if (indexEntry && indexEntry.majority === 'unknown') {
      if (indexEntry.provenance === 'no_settlement_census') {
        html += \`<div class="tooltip-line" style="color: #ffcccc;"><strong>Reason:</strong> No settlement-level census data</div>\`;
      } else if (indexEntry.provenance === 'ambiguous_ordering') {
        html += \`<div class="tooltip-line" style="color: #ffcccc;"><strong>Reason:</strong> Census ordering ambiguous</div>\`;
      }
    }
    if (terrainOverlayData && terrainOverlayData.by_sid && colorModeSelect && colorModeSelect.value === 'terrain') {
      const rec = terrainOverlayData.by_sid[sid];
      if (rec) {
        html += '<div class="tooltip-line"><strong>Terrain scalars:</strong></div>';
        html += \`<div class="tooltip-line">  elevation_mean_m: \${rec.elevation_mean_m != null ? rec.elevation_mean_m : '-'}</div>\`;
        html += \`<div class="tooltip-line">  slope_index: \${rec.slope_index != null ? rec.slope_index : '-'}</div>\`;
        html += \`<div class="tooltip-line">  road_access_index: \${rec.road_access_index != null ? rec.road_access_index : '-'}</div>\`;
        html += \`<div class="tooltip-line">  river_crossing_penalty: \${rec.river_crossing_penalty != null ? rec.river_crossing_penalty : '-'}</div>\`;
      }
    }
    
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y + 10) + 'px';
    
    // Keep tooltip in viewport
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = (x - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = (y - rect.height - 10) + 'px';
    }
  }

  // Update legend
  function updateLegend() {
    if (!dataIndex) return;
    
    let html = '<div style="font-weight: bold; margin-bottom: 6px;">Legend:</div>';
    
    const counts = dataIndex.meta.counts.majority;
    const order = ['bosniak', 'serb', 'croat', 'other', 'unknown'];
    
    for (const key of order) {
      const count = counts[key] || 0;
      const colorHex = ETHNICITY_COLORS[key];
      if (colorHex) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        html += \`<div class="legend-item">
          <span><span class="legend-color" style="background: \${colorHex}"></span>\${label}</span>
          <span>\${count}</span>
        </div>\`;
      }
    }
    
    legendDiv.innerHTML = html;
  }

  // Update warning banner
  function updateWarningBanner() {
    if (!dataIndex) return;
    
    if (dataIndex.meta.ordering_mode === 'ambiguous') {
      warningBanner.textContent = 'Settlement-level census ordering ambiguous (p0 != sum(p1..p4) frequently).';
      warningBanner.classList.add('show');
    } else if (dataIndex.meta.settlement_census_key === null) {
      warningBanner.textContent = 'Settlement-level census table missing. All settlements shown as Unknown.';
      warningBanner.classList.add('show');
    } else {
      warningBanner.classList.remove('show');
    }
  }

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartViewX = viewX;
    dragStartViewY = viewY;
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      viewX = dragStartViewX + dx;
      viewY = dragStartViewY + dy;
      render();
    } else {
      const feature = findFeatureAt(e.clientX, e.clientY);
      if (feature !== hoveredFeature) {
        hoveredFeature = feature;
        render();
        updateTooltip(feature, e.clientX, e.clientY);
      } else if (feature) {
        updateTooltip(feature, e.clientX, e.clientY);
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
    hoveredFeature = null;
    tooltip.style.display = 'none';
    render();
  });

  // Zoom with mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    viewScale *= zoomFactor;
    viewScale = Math.max(0.1, Math.min(100, viewScale));
    
    const newWorld = screenToWorld(e.clientX, e.clientY);
    viewX += (world.x - newWorld.x) * viewScale;
    viewY += (world.y - newWorld.y) * viewScale;
    
    render();
  });

  // Control events
  if (colorModeSelect) colorModeSelect.addEventListener('change', function() {
    const tg = document.getElementById('terrain-scalar-group');
    if (tg) tg.style.display = colorModeSelect.value === 'terrain' ? 'block' : 'none';
    render();
  });
  if (terrainScalarSelect) terrainScalarSelect.addEventListener('change', render);
  showUnknownOnlyCheck.addEventListener('change', render);
  filterSidInput.addEventListener('input', render);
  if (debugOverlayCheck) debugOverlayCheck.addEventListener('change', render);
  if (debugH698OverlayCheck) debugH698OverlayCheck.addEventListener('change', render);
  if (debugH6100OverlayCheck) debugH6100OverlayCheck.addEventListener('change', render);
  if (debugH6102Post1995Check) debugH6102Post1995Check.addEventListener('change', function() { if (h6102OverlayLegendDiv) updateH6102OverlayLegend(); render(); });
  if (debugH6102Mun1990Check) debugH6102Mun1990Check.addEventListener('change', render);
  if (debugH6103BboxCheck) debugH6103BboxCheck.addEventListener('change', render);
  if (debugH6104OrderingCheck) debugH6104OrderingCheck.addEventListener('change', render);
  if (useCorrectedMuniIdCheck) useCorrectedMuniIdCheck.addEventListener('change', function() { updateTagCorrectionsStatus(); render(); });
  if (debugH659MismatchCheck) debugH659MismatchCheck.addEventListener('change', function() {
    if (debugH659MismatchCheck.checked && debugH659MismatchGeoJSON && debugH659MismatchGeoJSON.features && !mismatchOverlayLoggedOnce) {
      var bbox = computeMismatchBbox();
      console.log('H6.9.5 mismatch ON url=' + MISMATCH_OVERLAY_URL + ' n=' + debugH659MismatchGeoJSON.features.length + ' bbox=' + JSON.stringify(bbox));
      mismatchOverlayLoggedOnce = true;
    }
    render();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'L' || e.key === 'l') {
      var panZoom = 'viewX=' + viewX + ' viewY=' + viewY + ' viewScale=' + viewScale;
      var layers = 'nwOverlay=' + debugOverlayLoadStatus + ' (drew ' + lastDrawCount.nwOverlay + ') mismatch=' + mismatchOverlayLoadStatus + ' (drew ' + lastDrawCount.mismatch + ') h698=' + h698OverlayLoadStatus + ' (drew ' + lastDrawCount.h698 + ') h6100=' + h6100OverlayLoadStatus + ' (drew ' + lastDrawCount.h6100 + ') h6102Post1995=' + h6102Post1995OverlayLoadStatus + ' (drew ' + lastDrawCount.h6102Post1995 + ') h6102Mun1990=' + h6102Mun1990OverlayLoadStatus + ' (drew ' + lastDrawCount.h6102Mun1990 + ') h6103Bbox=' + h6103BboxOverlayLoadStatus + ' (drew ' + lastDrawCount.h6103Bbox + ') h6104Ordering=' + h6104OrderingOverlayLoadStatus + ' (drew ' + lastDrawCount.h6104Ordering + ') settlements=' + lastDrawCount.settlements + ' settlementNames=' + settlementNamesLoadStatus + ' terrain=' + terrainOverlayLoadStatus;
      console.log('Layer sanity: ' + panZoom + ' | ' + layers);
    }
  });
  resetViewBtn.addEventListener('click', () => {
    if (globalBounds) {
      fitToBounds(globalBounds);
    }
  });

  // Load data after canonical index validated and geometry verified
  function applyViewerIndexAndFit(viewerIndex) {
    dataIndex = viewerIndex;
    if (dataIndex && dataIndex.by_sid) {
      for (const sid of Object.keys(dataIndex.by_sid).sort()) {
        settlementIndex.set(sid, dataIndex.by_sid[sid]);
      }
    }
    updateLoadInfoDisplay();
    updateLegend();
    updateWarningBanner();
    if (globalBounds) fitToBounds(globalBounds);
    render();
  }

  async function loadOverlays() {
    if (!settlementNamesUrlChosen) {
      settlementNamesLoadStatus = 'disabled';
      if (settlementNamesStatusEl) settlementNamesStatusEl.textContent = 'DISABLED';
      updateLoadInfoDisplay();
    } else {
      settlementNamesLoadStatus = 'loading';
      if (settlementNamesStatusEl) settlementNamesStatusEl.textContent = 'loading';
      updateLoadInfoDisplay();
    }
    try {
      if (settlementNamesUrlChosen) {
        const namesResp = await fetch(settlementNamesUrlChosen);
        if (!namesResp.ok) throw new Error(namesResp.status + ' ' + namesUrl);
        const namesData = await namesResp.json();
        settlementNamesMap.clear();
        if (namesData.by_census_id && typeof namesData.by_census_id === 'object') {
          for (var cid of Object.keys(namesData.by_census_id)) {
            var entry = namesData.by_census_id[cid];
            if (entry && entry.name) settlementNamesMap.set(cid, entry.name);
          }
        }
        settlementNamesLoadStatus = 'ok';
        if (settlementNamesStatusEl) settlementNamesStatusEl.textContent = 'OK';
        updateLoadInfoDisplay();
      }
    } catch (e) {
      if (settlementNamesUrlChosen) {
        settlementNamesLoadStatus = 'error';
        console.error('Settlement names fetch failed: url=' + settlementNamesUrlChosen + ' status=' + (e && e.message ? e.message : e));
        if (settlementNamesStatusEl) settlementNamesStatusEl.textContent = 'ERROR (see console)';
        updateLoadInfoDisplay();
      }
    }
    try {
      const overlayResp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_provenance_overlay_from_substrate_h6_9_4.geojson')));
      if (!overlayResp.ok) throw new Error(overlayResp.status + ' NW overlay');
      debugOverlayGeoJSON = await overlayResp.json();
      debugOverlayLoadStatus = 'ok';
      var n = debugOverlayGeoJSON && debugOverlayGeoJSON.features ? debugOverlayGeoJSON.features.length : 0;
      if (debugOverlayStatusSpan) debugOverlayStatusSpan.textContent = 'loaded (' + n + ' features)';
      if (debugOverlayLegendDiv) updateDebugOverlayLegend();
    } catch (e) {
      debugOverlayLoadStatus = 'error';
      console.error('NW overlay (H6.9.4) fetch failed:', OVERLAY_NW_URL, e);
      if (debugOverlayStatusSpan) debugOverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const mismatchResp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_overlay_mismatch_overlay_h6_9_5.geojson')));
      if (!mismatchResp.ok) throw new Error(mismatchResp.status + ' mismatch overlay');
      debugH659MismatchGeoJSON = await mismatchResp.json();
      mismatchOverlayLoadStatus = 'ok';
      var m = debugH659MismatchGeoJSON && debugH659MismatchGeoJSON.features ? debugH659MismatchGeoJSON.features.length : 0;
      if (mismatchOverlayStatusSpan) mismatchOverlayStatusSpan.textContent = 'loaded (' + m + ' features)';
    } catch (e) {
      mismatchOverlayLoadStatus = 'error';
      console.error('Mismatch overlay (H6.9.5) fetch failed:', MISMATCH_OVERLAY_URL, e);
      if (mismatchOverlayStatusSpan) mismatchOverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h698Resp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_provenance_overlay_from_census_membership_h6_9_8.geojson')));
      if (!h698Resp.ok) throw new Error(h698Resp.status + ' H6.9.8 overlay');
      debugH698OverlayGeoJSON = await h698Resp.json();
      h698OverlayLoadStatus = 'ok';
      var h698n = debugH698OverlayGeoJSON && debugH698OverlayGeoJSON.features ? debugH698OverlayGeoJSON.features.length : 0;
      if (h698OverlayStatusSpan) h698OverlayStatusSpan.textContent = 'loaded (' + h698n + ' features)';
    } catch (e) {
      h698OverlayLoadStatus = 'error';
      console.error('H6.9.8 census membership overlay fetch failed:', OVERLAY_H698_URL, e);
      if (h698OverlayStatusSpan) h698OverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h6100Resp = await fetch(resolveUrl(resolveOverlayPath('_debug/mun1990_overlays_nw_h6_10_0.geojson')));
      if (!h6100Resp.ok) throw new Error(h6100Resp.status + ' H6.10.0 overlay');
      debugH6100OverlayGeoJSON = await h6100Resp.json();
      h6100OverlayLoadStatus = 'ok';
      var h6100n = debugH6100OverlayGeoJSON && debugH6100OverlayGeoJSON.features ? debugH6100OverlayGeoJSON.features.length : 0;
      if (h6100OverlayStatusSpan) h6100OverlayStatusSpan.textContent = 'loaded (' + h6100n + ' features)';
    } catch (e) {
      h6100OverlayLoadStatus = 'error';
      console.error('H6.10.0 mun1990 composite overlay fetch failed:', OVERLAY_H6100_URL, e);
      if (h6100OverlayStatusSpan) h6100OverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h6102Post1995Resp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_triad_post1995_overlays_h6_10_2.geojson')));
      if (!h6102Post1995Resp.ok) throw new Error(h6102Post1995Resp.status + ' H6.10.2 post1995 overlay');
      debugH6102Post1995OverlayGeoJSON = await h6102Post1995Resp.json();
      h6102Post1995OverlayLoadStatus = 'ok';
      var h6102Post1995n = debugH6102Post1995OverlayGeoJSON && debugH6102Post1995OverlayGeoJSON.features ? debugH6102Post1995OverlayGeoJSON.features.length : 0;
      if (h6102Post1995OverlayStatusSpan) h6102Post1995OverlayStatusSpan.textContent = 'loaded (' + h6102Post1995n + ' features)';
      if (h6102OverlayLegendDiv) updateH6102OverlayLegend();
    } catch (e) {
      h6102Post1995OverlayLoadStatus = 'error';
      console.error('H6.10.2 post-1995 triad overlay fetch failed:', OVERLAY_H6102_POST1995_URL, e);
      if (h6102Post1995OverlayStatusSpan) h6102Post1995OverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h6102Mun1990Resp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_triad_mun1990_composite_overlays_h6_10_2.geojson')));
      if (!h6102Mun1990Resp.ok) throw new Error(h6102Mun1990Resp.status + ' H6.10.2 mun1990 overlay');
      debugH6102Mun1990OverlayGeoJSON = await h6102Mun1990Resp.json();
      h6102Mun1990OverlayLoadStatus = 'ok';
      var h6102Mun1990n = debugH6102Mun1990OverlayGeoJSON && debugH6102Mun1990OverlayGeoJSON.features ? debugH6102Mun1990OverlayGeoJSON.features.length : 0;
      if (h6102Mun1990OverlayStatusSpan) h6102Mun1990OverlayStatusSpan.textContent = 'loaded (' + h6102Mun1990n + ' features)';
      if (h6102OverlayLegendDiv && !h6102OverlayLegendDiv.innerHTML) updateH6102OverlayLegend();
    } catch (e) {
      h6102Mun1990OverlayLoadStatus = 'error';
      console.error('H6.10.2 mun1990 composite overlay fetch failed:', OVERLAY_H6102_MUN1990_URL, e);
      if (h6102Mun1990OverlayStatusSpan) h6102Mun1990OverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h6103BboxResp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_muni_bboxes_overlay_h6_10_3.geojson')));
      if (!h6103BboxResp.ok) throw new Error(h6103BboxResp.status + ' H6.10.3 bbox overlay');
      debugH6103BboxOverlayGeoJSON = await h6103BboxResp.json();
      h6103BboxOverlayLoadStatus = 'ok';
      var h6103Bboxn = debugH6103BboxOverlayGeoJSON && debugH6103BboxOverlayGeoJSON.features ? debugH6103BboxOverlayGeoJSON.features.length : 0;
      if (h6103BboxOverlayStatusSpan) h6103BboxOverlayStatusSpan.textContent = 'loaded (' + h6103Bboxn + ' features)';
    } catch (e) {
      h6103BboxOverlayLoadStatus = 'error';
      console.error('H6.10.3 municipality bbox overlay fetch failed:', OVERLAY_H6103_BBOX_URL, e);
      if (h6103BboxOverlayStatusSpan) h6103BboxOverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const h6104OrderingResp = await fetch(resolveUrl(resolveOverlayPath('_debug/nw_ordering_invariants_overlay_h6_10_4.geojson')));
      if (!h6104OrderingResp.ok) throw new Error(h6104OrderingResp.status + ' H6.10.4 ordering overlay');
      debugH6104OrderingOverlayGeoJSON = await h6104OrderingResp.json();
      h6104OrderingOverlayLoadStatus = 'ok';
      var h6104Orderingn = debugH6104OrderingOverlayGeoJSON && debugH6104OrderingOverlayGeoJSON.features ? debugH6104OrderingOverlayGeoJSON.features.length : 0;
      if (h6104OrderingOverlayStatusSpan) h6104OrderingOverlayStatusSpan.textContent = 'loaded (' + h6104Orderingn + ' features)';
    } catch (e) {
      h6104OrderingOverlayLoadStatus = 'error';
      console.error('H6.10.4 NW ordering invariants overlay fetch failed:', OVERLAY_H6104_ORDERING_URL, e);
      if (h6104OrderingOverlayStatusSpan) h6104OrderingOverlayStatusSpan.textContent = 'ERROR (see console)';
    }
    try {
      const terrainResp = await fetch(resolveUrl(resolveOverlayPath('terrain/terrain_scalars_viewer_overlay_h6_9.json')));
      if (!terrainResp.ok) throw new Error(terrainResp.status + ' terrain overlay');
      terrainOverlayData = await terrainResp.json();
      terrainOverlayLoadStatus = 'ok';
    } catch (e) {
      terrainOverlayLoadStatus = 'error';
      console.error('Terrain overlay fetch failed:', TERRAIN_OVERLAY_PATH, e);
    }
  }

  async function loadViewerIndexOnly() {
    var geomCandidates = ['/data/derived/settlements_substrate.geojson', '/settlements_substrate.geojson', '../settlements_substrate.geojson'];
    var namesCandidates = ['/data/derived/settlement_names.json', '/settlement_names.json', '../settlement_names.json'];
    try {
      geometryUrlChosen = await probeFirstOkUrl(geomCandidates, 'geometry');
      settlementNamesUrlChosen = await probeFirstOkUrl(namesCandidates, 'settlement_names');
    } catch (e) {
      showFatalError(e && e.message ? e.message : String(e));
      return;
    }
    derivedRoot = (geometryUrlChosen.indexOf('/data/derived/') >= 0 || geometryUrlChosen.indexOf('/data/derived') >= 0) ? '/data/derived' : '';
    overlayPathPrefix = (geometryUrlChosen.indexOf('../') === 0) ? '../' : '';
    derivedRootMode = derivedRoot ? 'repo-root' : (overlayPathPrefix ? 'substrate_viewer-root' : 'derived-root');

    const viewerResp = await fetch(resolveUrl('./data_index.json'));
    if (!viewerResp.ok) { showFatalError('Failed to load viewer index: ' + viewerResp.statusText); return; }
    const viewerIndex = await viewerResp.json();
    const geoResp = await fetch(geometryUrlChosen);
    if (!geoResp.ok) { showFatalError('Failed to load geometry: ' + geometryUrlChosen + ' (' + geoResp.status + ')'); return; }
    const buf = await geoResp.arrayBuffer();
    geometryFingerprint = await computeGeometryFingerprint(buf);
    settlementsGeoJSON = JSON.parse(new TextDecoder().decode(buf));
    applyMunicipalityIdCorrections(settlementsGeoJSON);
    var bbox = viewerIndex.meta && viewerIndex.meta.global_bbox;
    if (bbox && bbox.length >= 4) {
      globalBounds = { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] };
    } else {
      globalBounds = null;
    }
    applyViewerIndexAndFit(viewerIndex);
    await loadOverlays();
    render();
  }

  // Phase H6.9.4: Substrate-anchored NW overlay (geometry from substrate SIDs; no viewBox math).
  function updateDebugOverlayLegend() {
    if (!debugOverlayLegendDiv || !debugOverlayGeoJSON || !debugOverlayGeoJSON.features) return;
    var html = '<div style="font-weight: bold; margin-bottom: 4px;">NW overlays (H6.9.4, from substrate SIDs):</div>';
    for (var i = 0; i < debugOverlayGeoJSON.features.length; i++) {
      var f = debugOverlayGeoJSON.features[i];
      var props = f.properties || {};
      var name = props.mun_name || props.mun1990_id || '?';
      var count = props.sid_count != null ? props.sid_count : '-';
      html += '<div class="legend-item">' + name + ': ' + count + ' settlements</div>';
    }
    debugOverlayLegendDiv.style.display = 'block';
    debugOverlayLegendDiv.innerHTML = html;
  }

  function renderDebugOverlayPolygon(coords, strokeColor, lineWidth) {
    if (!coords || coords.length < 2) return;
    ctx.beginPath();
    var first = worldToScreen(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);
    for (var i = 1; i < coords.length; i++) {
      var pt = worldToScreen(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function renderDebugOverlay() {
    if (!debugOverlayGeoJSON || !debugOverlayGeoJSON.features) return;
    lastDrawCount.nwOverlay = 0;
    var strokeByMun = { bihac: 'rgba(0,140,0,1)', cazin: 'rgba(80,80,200,0.95)' };
    var widthByMun = { bihac: 3, cazin: 2 };
    for (var i = 0; i < debugOverlayGeoJSON.features.length; i++) {
      var feature = debugOverlayGeoJSON.features[i];
      var munId = (feature.properties && feature.properties.mun1990_id) || '';
      var stroke = strokeByMun[munId] || 'rgba(120,120,120,0.9)';
      var lw = widthByMun[munId] || 2;
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.nwOverlay++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.nwOverlay++;
      }
    }
  }

  function renderDebugH698Overlay() {
    if (!debugH698OverlayGeoJSON || !debugH698OverlayGeoJSON.features) return;
    lastDrawCount.h698 = 0;
    var strokeByMun = { bihac: 'rgba(0,180,0,0.9)', cazin: 'rgba(100,100,220,0.9)' };
    var widthByMun = { bihac: 2, cazin: 2 };
    for (var i = 0; i < debugH698OverlayGeoJSON.features.length; i++) {
      var feature = debugH698OverlayGeoJSON.features[i];
      var munId = (feature.properties && feature.properties.mun1990_id) || '';
      var stroke = strokeByMun[munId] || 'rgba(120,120,120,0.9)';
      var lw = widthByMun[munId] || 2;
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.h698++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.h698++;
      }
    }
  }

  function renderDebugH6100Overlay() {
    if (!debugH6100OverlayGeoJSON || !debugH6100OverlayGeoJSON.features) return;
    lastDrawCount.h6100 = 0;
    var stroke = 'rgba(255,140,0,1)';
    var lw = 4;
    for (var i = 0; i < debugH6100OverlayGeoJSON.features.length; i++) {
      var feature = debugH6100OverlayGeoJSON.features[i];
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.h6100++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.h6100++;
      }
    }
  }

  var STROKE_BY_MUN_CODE_H6102 = { '10049': 'rgba(0,180,0,1)', '10227': 'rgba(80,80,220,1)', '11240': 'rgba(220,0,180,1)' };
  var STROKE_WIDTH_POST1995 = 4;

  function renderDebugH6102Post1995Overlay() {
    if (!debugH6102Post1995OverlayGeoJSON || !debugH6102Post1995OverlayGeoJSON.features) return;
    lastDrawCount.h6102Post1995 = 0;
    for (var i = 0; i < debugH6102Post1995OverlayGeoJSON.features.length; i++) {
      var feature = debugH6102Post1995OverlayGeoJSON.features[i];
      var code = (feature.properties && feature.properties.mun_code != null) ? String(feature.properties.mun_code) : '';
      var stroke = STROKE_BY_MUN_CODE_H6102[code] || 'rgba(120,120,120,1)';
      var lw = STROKE_WIDTH_POST1995;
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.h6102Post1995++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.h6102Post1995++;
      }
    }
  }

  function renderDebugH6102Mun1990Overlay() {
    if (!debugH6102Mun1990OverlayGeoJSON || !debugH6102Mun1990OverlayGeoJSON.features) return;
    lastDrawCount.h6102Mun1990 = 0;
    var stroke = 'rgba(255,140,0,1)';
    var lw = 5;
    if (ctx.setLineDash) ctx.setLineDash([8, 4]);
    for (var i = 0; i < debugH6102Mun1990OverlayGeoJSON.features.length; i++) {
      var feature = debugH6102Mun1990OverlayGeoJSON.features[i];
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.h6102Mun1990++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.h6102Mun1990++;
      }
    }
    if (ctx.setLineDash) ctx.setLineDash([]);
  }

  function renderH6103BboxOverlay() {
    if (!debugH6103BboxOverlayGeoJSON || !debugH6103BboxOverlayGeoJSON.features) return;
    lastDrawCount.h6103Bbox = 0;
    var stroke = 'rgba(0,0,0,1)';
    var fill = 'rgba(0,0,0,0.15)';
    var lw = 3;
    for (var i = 0; i < debugH6103BboxOverlayGeoJSON.features.length; i++) {
      var feature = debugH6103BboxOverlayGeoJSON.features[i];
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      var ring = geom.type === 'Polygon' && geom.coordinates[0] ? geom.coordinates[0] : null;
      if (!ring || ring.length < 2) continue;
      ctx.beginPath();
      var first = worldToScreen(ring[0][0], ring[0][1]);
      ctx.moveTo(first.x, first.y);
      for (var j = 1; j < ring.length; j++) {
        var pt = worldToScreen(ring[j][0], ring[j][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
      lastDrawCount.h6103Bbox++;
    }
  }

  function renderH6104OrderingOverlay() {
    if (!debugH6104OrderingOverlayGeoJSON || !debugH6104OrderingOverlayGeoJSON.features) return;
    lastDrawCount.h6104Ordering = 0;
    var bboxStroke = 'rgba(0,0,0,1)';
    var bboxLw = 3;
    var centroidRadius = 4;
    var failStroke = 'rgba(255,0,0,1)';
    var failLw = 4;
    var features = debugH6104OrderingOverlayGeoJSON.features;
    var failFeatures = [];
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      var overlayType = (f.properties && f.properties.overlay_type) ? f.properties.overlay_type : '';
      if (overlayType === 'FAIL') { failFeatures.push(f); continue; }
      var geom = f.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'Polygon' && geom.coordinates[0]) {
        var ring = geom.coordinates[0];
        ctx.beginPath();
        var first = worldToScreen(ring[0][0], ring[0][1]);
        ctx.moveTo(first.x, first.y);
        for (var j = 1; j < ring.length; j++) {
          var pt = worldToScreen(ring[j][0], ring[j][1]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.strokeStyle = bboxStroke;
        ctx.lineWidth = bboxLw;
        ctx.stroke();
        lastDrawCount.h6104Ordering++;
      } else if (geom.type === 'Point' && geom.coordinates && geom.coordinates.length >= 2) {
        var sc = worldToScreen(geom.coordinates[0], geom.coordinates[1]);
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, centroidRadius, 0, Math.PI * 2);
        ctx.fillStyle = bboxStroke;
        ctx.fill();
        lastDrawCount.h6104Ordering++;
      }
    }
    for (var k = 0; k < failFeatures.length; k++) {
      var failF = failFeatures[k];
      var failGeom = failF.geometry;
      if (!failGeom || failGeom.type !== 'LineString' || !failGeom.coordinates || failGeom.coordinates.length < 2) continue;
      ctx.beginPath();
      var firstPt = worldToScreen(failGeom.coordinates[0][0], failGeom.coordinates[0][1]);
      ctx.moveTo(firstPt.x, firstPt.y);
      for (var q = 1; q < failGeom.coordinates.length; q++) {
        var p = worldToScreen(failGeom.coordinates[q][0], failGeom.coordinates[q][1]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = failStroke;
      ctx.lineWidth = failLw;
      ctx.stroke();
      lastDrawCount.h6104Ordering++;
    }
  }

  function updateH6102OverlayLegend() {
    if (!h6102OverlayLegendDiv) return;
    var html = '<div style="font-weight: bold; margin-bottom: 4px;">NW triad H6.10.2 (census authority):</div>';
    if (debugH6102Post1995OverlayGeoJSON && debugH6102Post1995OverlayGeoJSON.features) {
      html += '<div style="margin-bottom: 4px;">Post-1995 (Bihać green, Cazin blue, Bužim magenta):</div>';
      for (var i = 0; i < debugH6102Post1995OverlayGeoJSON.features.length; i++) {
        var f = debugH6102Post1995OverlayGeoJSON.features[i];
        var p = f.properties || {};
        var name = p.name || p.mun_code || '?';
        var exp = p.settlement_count_expected != null ? p.settlement_count_expected : '-';
        var found = p.settlement_count_found != null ? p.settlement_count_found : '-';
        html += '<div class="legend-item">' + name + ': expected=' + exp + ' found=' + found + '</div>';
      }
    }
    if (debugH6102Mun1990OverlayGeoJSON && debugH6102Mun1990OverlayGeoJSON.features) {
      html += '<div style="margin-top: 6px;">1990 composites (orange):</div>';
      for (var j = 0; j < debugH6102Mun1990OverlayGeoJSON.features.length; j++) {
        var g = debugH6102Mun1990OverlayGeoJSON.features[j];
        var q = g.properties || {};
        var n = q.name || '?';
        var expSum = q.settlement_count_expected_sum != null ? q.settlement_count_expected_sum : '-';
        var foundSum = q.settlement_count_found_sum != null ? q.settlement_count_found_sum : '-';
        html += '<div class="legend-item">' + n + ': expected_sum=' + expSum + ' found_sum=' + foundSum + '</div>';
      }
    }
    h6102OverlayLegendDiv.innerHTML = html;
    h6102OverlayLegendDiv.style.display = 'block';
  }

  function computeMismatchBbox() {
    if (!debugH659MismatchGeoJSON || !debugH659MismatchGeoJSON.features) return [0,0,0,0];
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (var i = 0; i < debugH659MismatchGeoJSON.features.length; i++) {
      var geom = debugH659MismatchGeoJSON.features[i].geometry;
      if (!geom || !geom.coordinates) continue;
      var coords = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
      for (var p = 0; p < coords.length; p++) {
        var ring = coords[p][0] || coords[p];
        if (!ring) continue;
        for (var k = 0; k < ring.length; k++) {
          var pt = ring[k];
          if (pt && pt.length >= 2) {
            minx = Math.min(minx, pt[0]); miny = Math.min(miny, pt[1]);
            maxx = Math.max(maxx, pt[0]); maxy = Math.max(maxy, pt[1]);
          }
        }
      }
    }
    return [isFinite(minx) ? minx : 0, isFinite(miny) ? miny : 0, isFinite(maxx) ? maxx : 0, isFinite(maxy) ? maxy : 0];
  }
  function featureCentroid(geom) {
    if (!geom || !geom.coordinates) return null;
    var coords = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    var sumx = 0, sumy = 0, n = 0;
    for (var p = 0; p < coords.length; p++) {
      var ring = coords[p][0] || coords[p];
      if (!ring) continue;
      for (var k = 0; k < ring.length; k++) {
        var pt = ring[k];
        if (pt && pt.length >= 2) { sumx += pt[0]; sumy += pt[1]; n++; }
      }
    }
    return n > 0 ? [sumx / n, sumy / n] : null;
  }
  function renderDebugH659MismatchOverlay() {
    if (!debugH659MismatchGeoJSON || !debugH659MismatchGeoJSON.features) return;
    lastDrawCount.mismatch = 0;
    var stroke = 'rgba(255,0,255,1)';
    var lw = 6;
    var sidFilter = filterSidInput && filterSidInput.value ? String(filterSidInput.value).trim() : '';
    for (var i = 0; i < debugH659MismatchGeoJSON.features.length; i++) {
      var feature = debugH659MismatchGeoJSON.features[i];
      if (sidFilter) {
        var sid = feature.properties && feature.properties.sid != null ? String(feature.properties.sid) : '';
        if (!sid || sid.indexOf(sidFilter) === -1) continue;
      }
      var geom = feature.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiPolygon') {
        for (var p = 0; p < geom.coordinates.length; p++) {
          var poly = geom.coordinates[p];
          if (poly && poly[0]) { renderDebugOverlayPolygon(poly[0], stroke, lw); lastDrawCount.mismatch++; }
        }
      } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
        renderDebugOverlayPolygon(geom.coordinates[0], stroke, lw);
        lastDrawCount.mismatch++;
      }
      var cen = featureCentroid(geom);
      if (cen) {
        var sc = worldToScreen(cen[0], cen[1]);
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = stroke;
        ctx.fill();
      }
    }
    var bbox = computeMismatchBbox();
    if (bbox[0] !== bbox[2] && bbox[1] !== bbox[3]) {
      var sw = worldToScreen(bbox[0], bbox[1]);
      var ne = worldToScreen(bbox[2], bbox[3]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      var rx = Math.min(sw.x, ne.x), ry = Math.min(sw.y, ne.y), rw = Math.abs(ne.x - sw.x), rh = Math.abs(ne.y - sw.y);
      ctx.strokeRect(rx, ry, rw, rh);
      lastDrawCount.mismatch++;
    }
  }

  if (window.location.protocol === 'file:') {
    showFileProtocolError();
  } else {
    loadViewerIndexOnly();
  }

})();`;
  
  writeFileSync(viewerJsPath, viewerJs, 'utf8');
  process.stdout.write(`Wrote viewer.js to ${viewerJsPath}\n`);
  
  // Print summary
  process.stdout.write('\n');
  process.stdout.write('SUMMARY:\n');
  process.stdout.write(`  Features: ${index.meta.counts.features}\n`);
  process.stdout.write(`  Settlement census key: ${index.meta.settlement_census_key || 'null'}\n`);
  process.stdout.write(`  Ordering mode: ${index.meta.ordering_mode}\n`);
  process.stdout.write(`  Matched settlement census: ${index.meta.counts.matched_settlement_census}\n`);
  process.stdout.write(`  Unknown: ${index.meta.counts.unknown}\n`);
  process.stdout.write(`  Majority counts: bosniak=${index.meta.counts.majority.bosniak}, serb=${index.meta.counts.majority.serb}, croat=${index.meta.counts.majority.croat}, other=${index.meta.counts.majority.other}, unknown=${index.meta.counts.majority.unknown}\n`);
  process.stdout.write(`  Global bbox: [${globalMinx.toFixed(6)}, ${globalMiny.toFixed(6)}, ${globalMaxx.toFixed(6)}, ${globalMaxy.toFixed(6)}]\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
