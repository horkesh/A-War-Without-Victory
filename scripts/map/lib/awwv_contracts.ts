/**
 * AWWV map contract helpers (deterministic bbox + checksum).
 * Used by build_substrate_viewer_index and validate_map_contracts.
 */

import { createHash } from 'node:crypto';

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

function processRing(ring: Ring, acc: { minx: number; miny: number; maxx: number; maxy: number }): void {
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [x, y] = pt;
    if (!isFinite(x) || !isFinite(y)) continue;
    acc.minx = Math.min(acc.minx, x);
    acc.miny = Math.min(acc.miny, y);
    acc.maxx = Math.max(acc.maxx, x);
    acc.maxy = Math.max(acc.maxy, y);
  }
}

function bboxFromCoords(coords: Polygon | MultiPolygon): { minx: number; miny: number; maxx: number; maxy: number } {
  const acc = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  // MultiPolygon: coords[0][0][0] = [x,y] (array). Polygon: coords[0][0][0] = number (x).
  const d00 = coords[0] && (coords[0] as Ring[])[0];
  const isMulti = d00 && Array.isArray((d00 as Ring)[0]);
  if (isMulti) {
    for (const poly of coords as MultiPolygon) {
      if (!Array.isArray(poly)) continue;
      for (const ring of poly) {
        if (Array.isArray(ring)) processRing(ring, acc);
      }
    }
  } else {
    for (const ring of coords as Polygon) {
      if (Array.isArray(ring)) processRing(ring, acc);
    }
  }
  if (!isFinite(acc.minx)) {
    acc.minx = 0;
    acc.miny = 0;
    acc.maxx = 0;
    acc.maxy = 0;
  }
  return acc;
}

export interface GeoJSONFeatureLike {
  geometry?: { type: string; coordinates: Polygon | MultiPolygon };
}

/**
 * Compute canonical bbox [minX, minY, maxX, maxY] from GeoJSON features (deterministic).
 */
export function computeBboxFromFeatures(features: GeoJSONFeatureLike[]): [number, number, number, number] {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (const f of features) {
    const geom = f.geometry;
    if (!geom || !geom.coordinates) continue;
    const b = bboxFromCoords(geom.coordinates);
    minx = Math.min(minx, b.minx);
    miny = Math.min(miny, b.miny);
    maxx = Math.max(maxx, b.maxx);
    maxy = Math.max(maxy, b.maxy);
  }
  if (!isFinite(minx)) {
    return [0, 0, 0, 0];
  }
  return [minx, miny, maxx, maxy];
}

/**
 * SHA-256 of buffer as lowercase hex string (deterministic).
 */
export function computeSha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Distance between two axis-aligned bounding boxes.
 * Returns 0 if boxes overlap (or touch); otherwise minimum boundary-to-boundary distance.
 * Used by Phase G3.4 deep-dive diagnostics for geometry neighbor evidence.
 */
export function bboxDistance(
  a: { minx: number; miny: number; maxx: number; maxy: number },
  b: { minx: number; miny: number; maxx: number; maxy: number }
): number {
  const dx = a.maxx < b.minx ? b.minx - a.maxx : b.maxx < a.minx ? a.minx - b.maxx : 0;
  const dy = a.maxy < b.miny ? b.miny - a.maxy : b.maxy < a.miny ? a.miny - b.maxy : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

// ────────────────────────────────────────────────────────────────────────────
// Phase H0: Multi-dataset registry contracts + validation
// ────────────────────────────────────────────────────────────────────────────

export interface DatasetMeta {
  path: string;
  schema: string;
  schema_version: string;
  id_field: string;
  geometry_type?: string;
  record_count: number;
  checksum_sha256: string;
  available?: boolean;
}

export interface LayerMeta {
  dataset: string;
  style: unknown;
  z_index: number;
  visibility_default: boolean;
  available?: boolean;
}

export interface DataIndexV1 {
  $schema: string;
  schema_version: string;
  coordinate_space: string;
  canonical_bbox: [number, number, number, number];
  datasets: Record<string, DatasetMeta>;
  layers: Record<string, LayerMeta>;
  [key: string]: unknown; // Allow optional extensions like continuity_graph_path
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validate data_index.json structure (Phase H0 multi-dataset registry).
 */
export function validateDataIndexV1(index: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!index || typeof index !== 'object') {
    errors.push('data_index must be an object');
    return { ok: false, errors };
  }
  
  const idx = index as Record<string, unknown>;
  
  // Required top-level fields
  if (typeof idx.$schema !== 'string') {
    errors.push('Missing or invalid field: $schema (string)');
  }
  if (typeof idx.schema_version !== 'string') {
    errors.push('Missing or invalid field: schema_version (string)');
  }
  if (typeof idx.coordinate_space !== 'string') {
    errors.push('Missing or invalid field: coordinate_space (string)');
  }
  if (!Array.isArray(idx.canonical_bbox) || idx.canonical_bbox.length !== 4) {
    errors.push('Missing or invalid field: canonical_bbox (array of 4 numbers)');
  } else {
    const bbox = idx.canonical_bbox as unknown[];
    if (!bbox.every((v) => typeof v === 'number' && isFinite(v))) {
      errors.push('canonical_bbox must contain 4 finite numbers');
    }
  }
  
  // Datasets
  if (!idx.datasets || typeof idx.datasets !== 'object' || Array.isArray(idx.datasets)) {
    errors.push('Missing or invalid field: datasets (object)');
  } else {
    const datasets = idx.datasets as Record<string, unknown>;
    for (const [key, ds] of Object.entries(datasets)) {
      const errs = validateDatasetMeta(ds, key);
      errors.push(...errs);
    }
  }
  
  // Layers
  if (!idx.layers || typeof idx.layers !== 'object' || Array.isArray(idx.layers)) {
    errors.push('Missing or invalid field: layers (object)');
  } else {
    const layers = idx.layers as Record<string, unknown>;
    for (const [key, layer] of Object.entries(layers)) {
      const errs = validateLayerMeta(layer, key);
      errors.push(...errs);
    }
  }
  
  return { ok: errors.length === 0, errors };
}

/**
 * Validate dataset metadata entry.
 */
export function validateDatasetMeta(ds: unknown, key: string): string[] {
  const errors: string[] = [];
  
  if (!ds || typeof ds !== 'object') {
    errors.push(`datasets.${key}: must be an object`);
    return errors;
  }
  
  const meta = ds as Record<string, unknown>;
  
  if (typeof meta.path !== 'string') {
    errors.push(`datasets.${key}.path: must be a string`);
  }
  if (typeof meta.schema !== 'string') {
    errors.push(`datasets.${key}.schema: must be a string`);
  }
  if (typeof meta.schema_version !== 'string') {
    errors.push(`datasets.${key}.schema_version: must be a string`);
  }
  if (typeof meta.id_field !== 'string') {
    errors.push(`datasets.${key}.id_field: must be a string`);
  }
  if (meta.geometry_type !== undefined && typeof meta.geometry_type !== 'string') {
    errors.push(`datasets.${key}.geometry_type: must be a string if present`);
  }
  if (typeof meta.record_count !== 'number' || !isFinite(meta.record_count)) {
    errors.push(`datasets.${key}.record_count: must be a finite number`);
  }
  if (typeof meta.checksum_sha256 !== 'string') {
    errors.push(`datasets.${key}.checksum_sha256: must be a string`);
  }
  if (meta.available !== undefined && typeof meta.available !== 'boolean') {
    errors.push(`datasets.${key}.available: must be a boolean if present`);
  }
  
  return errors;
}

/**
 * Validate layer metadata entry.
 */
export function validateLayerMeta(layer: unknown, key: string): string[] {
  const errors: string[] = [];
  
  if (!layer || typeof layer !== 'object') {
    errors.push(`layers.${key}: must be an object`);
    return errors;
  }
  
  const meta = layer as Record<string, unknown>;
  
  if (typeof meta.dataset !== 'string') {
    errors.push(`layers.${key}.dataset: must be a string`);
  }
  // style can be null or any object
  if (typeof meta.z_index !== 'number' || !isFinite(meta.z_index)) {
    errors.push(`layers.${key}.z_index: must be a finite number`);
  }
  if (typeof meta.visibility_default !== 'boolean') {
    errors.push(`layers.${key}.visibility_default: must be a boolean`);
  }
  if (meta.available !== undefined && typeof meta.available !== 'boolean') {
    errors.push(`layers.${key}.available: must be a boolean if present`);
  }
  
  return errors;
}

/**
 * Deterministic JSON stringify with stable key ordering (Phase H0).
 */
export function stableStringify(obj: unknown, space?: number): string {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  }, space);
}
