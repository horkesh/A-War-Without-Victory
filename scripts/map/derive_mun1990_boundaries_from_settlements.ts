/**
 * Phase H1: Derive municipality 1990 boundary linework from settlements substrate
 * 
 * Extracts boundary segments (shared by >1 distinct municipality) from settlement
 * polygon ring segments WITHOUT performing polygon union. Aborts loudly if derivation
 * produces suspiciously low boundary segment counts (likely vertex mismatch).
 * 
 * Usage:
 *   npm run map:derive:mun1990:boundaries
 *   or: tsx scripts/map/derive_mun1990_boundaries_from_settlements.ts
 * 
 * Outputs:
 *   - data/derived/municipalities_1990_boundaries.geojson
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeSha256Hex } from './lib/awwv_contracts.js';

// Mistake guard

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    sid: string;
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
  awwv_meta?: Record<string, unknown>;
}

interface BoundarySegment {
  a: string; // canonical coordinate key (deterministic)
  b: string;
  municipalities: Set<string>;
}

/**
 * Format coordinate as deterministic string key (fixed precision).
 */
function coordKey(x: number, y: number): string {
  return `${x.toFixed(6)},${y.toFixed(6)}`;
}

/**
 * Canonical segment key (a, b) with a < b lexicographically.
 */
function segmentKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Extract all ring segments from a feature.
 */
function extractRingSegments(feature: GeoJSONFeature, municipalityId: string): Array<{ a: string; b: string }> {
  const segments: Array<{ a: string; b: string }> = [];
  const geom = feature.geometry;
  
  const processRing = (ring: Ring) => {
    if (!Array.isArray(ring) || ring.length < 2) return;
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      if (!Array.isArray(p1) || p1.length < 2 || !Array.isArray(p2) || p2.length < 2) continue;
      if (!isFinite(p1[0]) || !isFinite(p1[1]) || !isFinite(p2[0]) || !isFinite(p2[1])) continue;
      const a = coordKey(p1[0], p1[1]);
      const b = coordKey(p2[0], p2[1]);
      if (a !== b) segments.push({ a, b });
    }
  };
  
  if (geom.type === 'Polygon') {
    const coords = geom.coordinates as Polygon;
    if (coords && coords[0]) processRing(coords[0]); // Exterior ring only
  } else if (geom.type === 'MultiPolygon') {
    const coords = geom.coordinates as MultiPolygon;
    for (const poly of coords) {
      if (poly && poly[0]) processRing(poly[0]); // Exterior ring only
    }
  }
  
  return segments;
}

async function main(): Promise<void> {
  const substratePath = resolve('data/derived/settlements_substrate.geojson');
  const outputPath = resolve('data/derived/municipalities_1990_boundaries.geojson');
  
  process.stdout.write(`Loading ${substratePath}...\n`);
  const substrateContent = readFileSync(substratePath, 'utf8');
  const substrateGeoJSON = JSON.parse(substrateContent) as GeoJSONFC;
  
  if (substrateGeoJSON.type !== 'FeatureCollection') {
    throw new Error(`Expected FeatureCollection, got ${substrateGeoJSON.type}`);
  }
  
  const features = substrateGeoJSON.features;
  process.stdout.write(`Loaded ${features.length} features\n`);
  
  // Build segment registry
  const segmentRegistry = new Map<string, BoundarySegment>();
  let totalSegments = 0;
  
  for (const feature of features) {
    const munId = feature.properties.municipality_id;
    if (!munId) continue; // Skip features without municipality_id
    
    const segments = extractRingSegments(feature, String(munId));
    totalSegments += segments.length;
    
    for (const seg of segments) {
      const key = segmentKey(seg.a, seg.b);
      const existing = segmentRegistry.get(key);
      if (existing) {
        existing.municipalities.add(String(munId));
      } else {
        segmentRegistry.set(key, {
          a: seg.a,
          b: seg.b,
          municipalities: new Set([String(munId)]),
        });
      }
    }
  }
  
  // Identify boundary segments (shared by >1 municipality)
  const boundarySegments: BoundarySegment[] = [];
  for (const seg of segmentRegistry.values()) {
    if (seg.municipalities.size > 1) {
      boundarySegments.push(seg);
    }
  }
  
  process.stdout.write(`\nPRE-FLIGHT SANITY:\n`);
  process.stdout.write(`  Total segments extracted: ${totalSegments}\n`);
  process.stdout.write(`  Unique segments: ${segmentRegistry.size}\n`);
  process.stdout.write(`  Boundary segments (shared by >1 mun): ${boundarySegments.length}\n`);
  
  // Sanity threshold: expect at least 100 boundary segments for 110 municipalities
  const MIN_BOUNDARY_SEGMENTS = 100;
  if (boundarySegments.length < MIN_BOUNDARY_SEGMENTS) {
    process.stderr.write(`\nERROR: Boundary segment count ${boundarySegments.length} is below threshold ${MIN_BOUNDARY_SEGMENTS}.\n`);
    process.stderr.write(`This likely indicates vertex mismatch in settlement polygons.\n`);
    process.stderr.write(`Do NOT emit junk output. Aborting.\n`);
    process.exitCode = 1;
    return;
  }
  
  // Group segments by municipality pairs
  const munPairSegments = new Map<string, Array<{ a: Point; b: Point }>>();
  
  for (const seg of boundarySegments) {
    const munIds = Array.from(seg.municipalities).sort();
    const pairKey = munIds.join('|');
    
    const aParts = seg.a.split(',').map(Number);
    const bParts = seg.b.split(',').map(Number);
    const aPt: Point = [aParts[0], aParts[1]];
    const bPt: Point = [bParts[0], bParts[1]];
    
    const existing = munPairSegments.get(pairKey);
    if (existing) {
      existing.push({ a: aPt, b: bPt });
    } else {
      munPairSegments.set(pairKey, [{ a: aPt, b: bPt }]);
    }
  }
  
  // Build GeoJSON features (one MultiLineString per municipality pair)
  const boundaryFeatures: Array<{
    type: 'Feature';
    properties: {
      municipality_pair: string;
      municipality_ids: string[];
      segment_count: number;
    };
    geometry: {
      type: 'MultiLineString';
      coordinates: Array<[Point, Point]>;
    };
  }> = [];
  
  // Sort pairs deterministically for stable output
  const sortedPairs = Array.from(munPairSegments.keys()).sort();
  
  for (const pairKey of sortedPairs) {
    const segments = munPairSegments.get(pairKey)!;
    const munIds = pairKey.split('|');
    
    boundaryFeatures.push({
      type: 'Feature',
      properties: {
        municipality_pair: pairKey,
        municipality_ids: munIds,
        segment_count: segments.length,
      },
      geometry: {
        type: 'MultiLineString',
        coordinates: segments.map(seg => [seg.a, seg.b]),
      },
    });
  }
  
  // Build output GeoJSON with awwv_meta
  const awwv_meta_base = {
    schema: 'awwv://schemas/mun1990_boundaries_v0.json',
    schema_version: '0.0.0',
    coordinate_space: 'SVG_PIXELS_LEGACY',
    source: 'settlements_substrate.geojson',
    derivation: 'phase_h1_boundary_segments',
    id_field: 'municipality_pair',
    record_count: boundaryFeatures.length,
    checksum_sha256: '',
  };
  
  const fcContentOnly = {
    type: 'FeatureCollection',
    awwv_meta: { ...awwv_meta_base },
    features: boundaryFeatures,
  };
  
  const contentOnlyJson = JSON.stringify(fcContentOnly, null, 2);
  const contentChecksum = computeSha256Hex(Buffer.from(contentOnlyJson, 'utf8'));
  
  const fcWithMeta = {
    type: 'FeatureCollection',
    awwv_meta: { ...awwv_meta_base, checksum_sha256: contentChecksum },
    features: boundaryFeatures,
  };
  
  const fullJson = JSON.stringify(fcWithMeta, null, 2);
  writeFileSync(outputPath, fullJson, 'utf8');
  
  process.stdout.write(`\nWrote ${boundaryFeatures.length} boundary features to ${outputPath}\n`);
  process.stdout.write(`Content checksum: ${contentChecksum.slice(0, 12)}...\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
