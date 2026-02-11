/**
 * Phase H3.1: Derive municipality 1990 boundary linework v2 (shared-border pairs)
 * 
 * Uses Phase 1 contact graph shared_border edges to find settlement pairs that:
 * 1. Share a border (type == "shared_border")
 * 2. Are in different municipalities
 * 
 * Then computes overlapping boundary segments between their polygon boundaries.
 * This approach is more robust than Phase H1 (direct segment cancellation) because
 * it leverages the validated Phase 1 contact graph.
 * 
 * DOES NOT use polygon union. DOES NOT modify geometry derivation.
 * 
 * Usage:
 *   npm run map:derive:mun1990:boundaries:v2
 *   or: tsx scripts/map/derive_mun1990_boundaries_from_shared_borders_v2.ts
 * 
 * Outputs:
 *   - data/derived/municipalities_1990_boundaries_v2.geojson
 */

import { readFileSync, writeFileSync } from 'node:fs';
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

interface ContactEdge {
  a: string;
  b: string;
  type: string;
  [key: string]: unknown;
}

interface ContactGraph {
  nodes: Array<{ sid: string }>;
  edges: ContactEdge[];
}

/**
 * Format coordinate as deterministic string key (fixed precision 1e-6).
 */
function coordKey(x: number, y: number): string {
  return `${x.toFixed(6)},${y.toFixed(6)}`;
}

/**
 * Parse coordinate key back to point.
 */
function parseCoordKey(key: string): Point {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}

/**
 * Canonical segment key (a, b) with a < b lexicographically.
 */
function segmentKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Extract all ring segments from a polygon as a set of segment keys.
 */
function extractSegmentKeys(geom: { type: string; coordinates: Polygon | MultiPolygon }): Set<string> {
  const segKeys = new Set<string>();
  
  const processRing = (ring: Ring) => {
    if (!Array.isArray(ring) || ring.length < 2) return;
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      if (!Array.isArray(p1) || p1.length < 2 || !Array.isArray(p2) || p2.length < 2) continue;
      if (!isFinite(p1[0]) || !isFinite(p1[1]) || !isFinite(p2[0]) || !isFinite(p2[1])) continue;
      const a = coordKey(p1[0], p1[1]);
      const b = coordKey(p2[0], p2[1]);
      if (a !== b) segKeys.add(segmentKey(a, b));
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
  
  return segKeys;
}

async function main(): Promise<void> {
  const substratePath = resolve('data/derived/settlements_substrate.geojson');
  const contactGraphPath = resolve('data/derived/settlement_contact_graph.json');
  const outputPath = resolve('data/derived/municipalities_1990_boundaries_v2.geojson');
  
  process.stdout.write(`Loading substrate: ${substratePath}\n`);
  const substrateContent = readFileSync(substratePath, 'utf8');
  const substrateGeoJSON = JSON.parse(substrateContent) as GeoJSONFC;
  
  if (substrateGeoJSON.type !== 'FeatureCollection') {
    throw new Error(`Expected FeatureCollection, got ${substrateGeoJSON.type}`);
  }
  
  process.stdout.write(`Loading Phase 1 contact graph: ${contactGraphPath}\n`);
  const contactGraphContent = readFileSync(contactGraphPath, 'utf8');
  const contactGraph = JSON.parse(contactGraphContent) as ContactGraph;
  
  // Build settlement index: sid -> feature
  const settlementIndex = new Map<string, GeoJSONFeature>();
  for (const feature of substrateGeoJSON.features) {
    const sid = feature.properties.sid;
    if (sid) settlementIndex.set(sid, feature);
  }
  
  process.stdout.write(`Loaded ${settlementIndex.size} settlements\n`);
  
  // Filter Phase 1 edges for shared_border type only
  const sharedBorderEdges = contactGraph.edges.filter(e => e.type === 'shared_border');
  process.stdout.write(`Found ${sharedBorderEdges.length} shared_border edges in Phase 1 contact graph\n`);
  
  // Identify pairs crossing municipality boundaries
  const crossingPairs: Array<{ a: string; b: string; mun_a: string; mun_b: string }> = [];
  
  for (const edge of sharedBorderEdges) {
    const featA = settlementIndex.get(edge.a);
    const featB = settlementIndex.get(edge.b);
    
    if (!featA || !featB) continue; // Skip if either settlement not in substrate
    
    const munA = String(featA.properties.municipality_id || '');
    const munB = String(featB.properties.municipality_id || '');
    
    if (!munA || !munB || munA === munB) continue; // Skip if same municipality or missing
    
    crossingPairs.push({ a: edge.a, b: edge.b, mun_a: munA, mun_b: munB });
  }
  
  process.stdout.write(`Found ${crossingPairs.length} shared_border pairs crossing municipality boundaries\n`);
  
  // For each crossing pair, compute overlapping boundary segments
  const munPairSegments = new Map<string, Array<{ a: Point; b: Point }>>();
  let totalSegmentsEmitted = 0;
  
  for (const pair of crossingPairs) {
    const featA = settlementIndex.get(pair.a)!;
    const featB = settlementIndex.get(pair.b)!;
    
    // Extract segment keys from both polygons
    const segKeysA = extractSegmentKeys(featA.geometry);
    const segKeysB = extractSegmentKeys(featB.geometry);
    
    // Find intersection (shared segments)
    const sharedSegKeys = new Set<string>();
    for (const key of segKeysA) {
      if (segKeysB.has(key)) sharedSegKeys.add(key);
    }
    
    if (sharedSegKeys.size === 0) continue; // No shared segments (shouldn't happen for shared_border)
    
    // Add to municipality pair collection
    const munIds = [pair.mun_a, pair.mun_b].sort();
    const pairKey = munIds.join('|');
    
    const segments = Array.from(sharedSegKeys).map(key => {
      const [a, b] = key.split('|');
      return { a: parseCoordKey(a), b: parseCoordKey(b) };
    });
    
    const existing = munPairSegments.get(pairKey);
    if (existing) {
      existing.push(...segments);
    } else {
      munPairSegments.set(pairKey, segments);
    }
    
    totalSegmentsEmitted += segments.length;
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
  
  // Sanity print (mandatory)
  process.stdout.write(`\nSANITY SUMMARY:\n`);
  process.stdout.write(`  candidate_shared_border_pairs: ${sharedBorderEdges.length}\n`);
  process.stdout.write(`  pairs_crossing_mun: ${crossingPairs.length}\n`);
  process.stdout.write(`  total_boundary_segments_emitted: ${totalSegmentsEmitted}\n`);
  process.stdout.write(`  municipality_pairs_with_boundaries: ${boundaryFeatures.length}\n`);
  
  // Top 10 pairs by segment count
  const sortedByCount = [...boundaryFeatures].sort((a, b) => b.properties.segment_count - a.properties.segment_count);
  process.stdout.write(`\nTop 10 (mun_a, mun_b) by segment count:\n`);
  for (let i = 0; i < Math.min(10, sortedByCount.length); i++) {
    const feat = sortedByCount[i];
    process.stdout.write(`  ${feat.properties.municipality_pair}: ${feat.properties.segment_count} segments\n`);
  }
  
  // Build output GeoJSON with awwv_meta
  const awwv_meta_base = {
    schema: 'awwv://schemas/mun1990_boundaries_v2.json',
    schema_version: '0.0.0',
    coordinate_space: 'SVG_PIXELS_LEGACY',
    source: 'settlements_substrate.geojson + settlement_contact_graph.json',
    derivation: 'phase_h3_1_shared_border_pairs',
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
