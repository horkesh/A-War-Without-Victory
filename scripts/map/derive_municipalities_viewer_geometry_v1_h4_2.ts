/**
 * Phase H4.2: Derive municipality viewer geometry via boundary extraction
 * Phase H4.5: Extended to support mun1990-merged layer
 *
 * Stream-reads settlements geometry, extracts boundary segments (edges that aren't
 * shared with another settlement in the same municipality), stitches into rings.
 * Deterministic, no polygon union, fast.
 *
 * Usage:
 *   npm run map:derive:municipalities-viewer:v1:h4_2
 *   tsx scripts/map/derive_municipalities_viewer_geometry_v1_h4_2.ts [--decimals 6] [--mode post1995|mun1990]
 */

import { writeFileSync, readFileSync, existsSync, createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { loadCanonicalMun1990Registry } from './_shared/mun1990_registry_selector.js';


const FEATURES_ARRAY_START = '"features":[';
const FEATURES_MARKER = '"features":';

interface Point2D {
  x: number;
  y: number;
}

interface SegmentKey {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

interface SettlementFeature {
  type: string;
  properties?: {
    sid?: string;
    municipality_id?: number | string;
    mun1990_id?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

function parseArgs(): { decimals: number; mode: 'post1995' | 'mun1990' } {
  const args = process.argv.slice(2);
  let decimals = 6;
  let mode: 'post1995' | 'mun1990' = 'post1995';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--decimals' && args[i + 1]) {
      decimals = Math.max(0, Math.min(10, parseInt(args[++i], 10) || 6));
    }
    if (args[i] === '--mode' && args[i + 1]) {
      const modeArg = args[++i];
      if (modeArg === 'post1995' || modeArg === 'mun1990') {
        mode = modeArg;
      }
    }
  }
  return { decimals, mode };
}

function quantize(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function findFeaturesArrayStart(buffer: string): number {
  const idx = buffer.indexOf(FEATURES_ARRAY_START);
  if (idx !== -1) return idx + FEATURES_ARRAY_START.length;
  const idx2 = buffer.indexOf(FEATURES_MARKER + ' [');
  if (idx2 !== -1) return idx2 + FEATURES_MARKER.length + 2;
  return -1;
}

function extractNextFeature(buffer: string, start: number): { objectString: string; nextIndex: number } | null {
  let pos = start;
  while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
  if (pos >= buffer.length || buffer[pos] !== '{') return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  const begin = pos;

  for (; pos < buffer.length; pos++) {
    const c = buffer[pos];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      depth++;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) {
        return { objectString: buffer.slice(begin, pos + 1), nextIndex: pos + 1 };
      }
      continue;
    }
  }
  return null;
}

/**
 * Normalize segment key: ensure a <= b lexicographically
 */
function makeSegmentKey(ax: number, ay: number, bx: number, by: number): string {
  if (ax < bx || (ax === bx && ay <= by)) {
    return `${ax},${ay}:${bx},${by}`;
  }
  return `${bx},${by}:${ax},${ay}`;
}

/**
 * Extract all ring edges from a polygon/multipolygon geometry
 */
function extractEdges(geom: { type?: string; coordinates?: unknown }, decimals: number): Array<[number, number, number, number]> {
  const edges: Array<[number, number, number, number]> = [];
  
  if (!geom || !geom.type || !geom.coordinates) return edges;
  
  function processRing(coords: unknown[]): void {
    if (!Array.isArray(coords) || coords.length < 2) return;
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) continue;
      const ax = quantize(a[0] as number, decimals);
      const ay = quantize(a[1] as number, decimals);
      const bx = quantize(b[0] as number, decimals);
      const by = quantize(b[1] as number, decimals);
      edges.push([ax, ay, bx, by]);
    }
  }
  
  if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
    for (const ring of geom.coordinates) {
      if (Array.isArray(ring)) processRing(ring);
    }
  } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
    for (const poly of geom.coordinates) {
      if (Array.isArray(poly)) {
        for (const ring of poly) {
          if (Array.isArray(ring)) processRing(ring);
        }
      }
    }
  }
  
  return edges;
}

/**
 * Stream settlements and collect edges per municipality (or per mun1990_id)
 */
async function streamSettlements(
  geojsonPath: string, 
  decimals: number, 
  mode: 'post1995' | 'mun1990',
  mun1990Lookup: Map<string, string>, // municipality_id -> mun1990_id
  canonicalMun1990Ids: Set<string>, // valid mun1990_ids from registry (empty = no filtering)
  mun1990NameNormalization: Map<string, string> // name normalization map
): Promise<Map<string, {
  edges: Array<[number, number, number, number]>;
  mun1990_id: string | null;
  post1995_municipality_ids: Set<string>;
}>> {
  const byKey = new Map<string, {
    edges: Array<[number, number, number, number]>;
    mun1990_id: string | null;
    post1995_municipality_ids: Set<string>;
  }>();
  
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    let featureCount = 0;
    
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        process.stdout.write(`\nProcessed ${featureCount} settlements\n`);
        resolvePromise(byKey);
      }
    };
    
    const processBuffer = (): void => {
      if (featuresStart === -1) {
        featuresStart = findFeaturesArrayStart(buffer);
        if (featuresStart === -1) return;
        pos = featuresStart;
      }
      
      while (pos < buffer.length) {
        const extracted = extractNextFeature(buffer, pos);
        if (!extracted) return;
        pos = extracted.nextIndex;
        
        try {
          const feature = JSON.parse(extracted.objectString) as SettlementFeature;
          const munId = feature.properties?.municipality_id;
          if (munId == null) continue;
          
          const municipalityId = String(munId).trim();
          // Resolve mun1990_id from lookup (feature.properties.mun1990_id may be null or invalid)
          let mun1990Id = feature.properties?.mun1990_id ?? mun1990Lookup.get(municipalityId) ?? null;
          
          // Apply name normalization if needed
          if (mun1990Id != null) {
            mun1990Id = mun1990NameNormalization.get(mun1990Id) ?? mun1990Id;
          }
          
          // Validate against canonical registry (if provided)
          if (mun1990Id != null && canonicalMun1990Ids.size > 0 && !canonicalMun1990Ids.has(mun1990Id)) {
            mun1990Id = mun1990Lookup.get(municipalityId) ?? null; // fallback to lookup
            if (mun1990Id != null) {
              mun1990Id = mun1990NameNormalization.get(mun1990Id) ?? mun1990Id;
              if (!canonicalMun1990Ids.has(mun1990Id)) {
                mun1990Id = null; // still invalid, skip
              }
            }
          }
          
          // Decide grouping key based on mode
          // In mun1990 mode, skip if no valid mun1990_id
          if (mode === 'mun1990' && mun1990Id == null) {
            continue; // skip settlement without valid mun1990_id
          }
          const groupKey = mode === 'mun1990' ? mun1990Id! : municipalityId;
          
          if (!byKey.has(groupKey)) {
            byKey.set(groupKey, { 
              edges: [], 
              mun1990_id: mun1990Id, 
              post1995_municipality_ids: new Set() 
            });
          }
          
          const entry = byKey.get(groupKey)!;
          entry.post1995_municipality_ids.add(municipalityId);
          
          const edges = extractEdges(feature.geometry, decimals);
          entry.edges.push(...edges);
          
          featureCount++;
          if (featureCount % 500 === 0) {
            process.stdout.write(`\rProcessed ${featureCount} settlements...`);
          }
        } catch {
          /* skip malformed */
        }
        
        while (pos < buffer.length && /\s|,/.test(buffer[pos])) pos++;
        if (pos < buffer.length && buffer[pos] === ']') {
          finish();
          return;
        }
      }
    };
    
    const stream = createReadStream(geojsonPath, { encoding: 'utf8', highWaterMark: 256 * 1024 });
    stream.on('data', (chunk: string) => { buffer += chunk; processBuffer(); });
    stream.on('end', () => { processBuffer(); finish(); });
    stream.on('error', rejectPromise);
  });
}

/**
 * Cancel interior edges: remove segments that appear exactly twice (bidirectional)
 */
function extractBoundarySegments(allEdges: Array<[number, number, number, number]>): Array<[number, number, number, number]> {
  const segmentCount = new Map<string, number>();
  
  for (const [ax, ay, bx, by] of allEdges) {
    const key = makeSegmentKey(ax, ay, bx, by);
    segmentCount.set(key, (segmentCount.get(key) ?? 0) + 1);
  }
  
  const boundary: Array<[number, number, number, number]> = [];
  const seen = new Set<string>();
  
  for (const [ax, ay, bx, by] of allEdges) {
    const key = makeSegmentKey(ax, ay, bx, by);
    if (segmentCount.get(key) === 1 && !seen.has(key)) {
      boundary.push([ax, ay, bx, by]);
      seen.add(key);
    }
  }
  
  return boundary;
}

/**
 * Stitch segments into closed rings
 */
function stitchRings(segments: Array<[number, number, number, number]>): number[][][] {
  if (segments.length === 0) return [];
  
  // Build adjacency: point -> list of segments starting from that point
  const byStart = new Map<string, Array<[number, number, number, number]>>();
  
  for (const seg of segments) {
    const [ax, ay, bx, by] = seg;
    const keyA = `${ax},${ay}`;
    const keyB = `${bx},${by}`;
    
    if (!byStart.has(keyA)) byStart.set(keyA, []);
    byStart.get(keyA)!.push([ax, ay, bx, by]);
    
    if (!byStart.has(keyB)) byStart.set(keyB, []);
    byStart.get(keyB)!.push([bx, by, ax, ay]);
  }
  
  const used = new Set<string>();
  const rings: number[][][] = [];
  
  for (const startSeg of segments) {
    const startKey = makeSegmentKey(startSeg[0], startSeg[1], startSeg[2], startSeg[3]);
    if (used.has(startKey)) continue;
    
    const ring: number[][] = [];
    let [cx, cy] = [startSeg[0], startSeg[1]];
    let [nx, ny] = [startSeg[2], startSeg[3]];
    ring.push([cx, cy]);
    used.add(startKey);
    
    const maxSteps = segments.length * 2;
    let steps = 0;
    
    while (steps < maxSteps) {
      steps++;
      ring.push([nx, ny]);
      
      // Check if closed
      if (nx === ring[0][0] && ny === ring[0][1] && ring.length > 2) {
        break;
      }
      
      // Find next edge
      const nextKey = `${nx},${ny}`;
      const candidates = byStart.get(nextKey) ?? [];
      
      let found = false;
      for (const [ax, ay, bx, by] of candidates) {
        const edgeKey = makeSegmentKey(ax, ay, bx, by);
        if (!used.has(edgeKey)) {
          used.add(edgeKey);
          [cx, cy, nx, ny] = [ax, ay, bx, by];
          found = true;
          break;
        }
      }
      
      if (!found) break;
    }
    
    if (ring.length >= 4) {
      rings.push(ring);
    }
  }
  
  return rings;
}

/**
 * Compute bbox for a ring (minX, minY, maxX, maxY)
 */
function computeRingBbox(ring: number[][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Sort rings deterministically by bbox (minX, minY, maxX, maxY), then by coord hash
 */
function sortRingsDeterministic(rings: number[][][], decimals: number): number[][][] {
  return rings.slice().sort((a, b) => {
    const [aMinX, aMinY, aMaxX, aMaxY] = computeRingBbox(a);
    const [bMinX, bMinY, bMaxX, bMaxY] = computeRingBbox(b);
    
    // Compare bbox coordinates
    if (aMinX !== bMinX) return aMinX - bMinX;
    if (aMinY !== bMinY) return aMinY - bMinY;
    if (aMaxX !== bMaxX) return aMaxX - bMaxX;
    if (aMaxY !== bMaxY) return aMaxY - bMaxY;
    
    // Bbox identical, compare by quantized coordinate hash
    const hashA = a.map(([x, y]) => `${quantize(x, decimals)},${quantize(y, decimals)}`).join(';');
    const hashB = b.map(([x, y]) => `${quantize(x, decimals)},${quantize(y, decimals)}`).join(';');
    return hashA.localeCompare(hashB);
  });
}

async function main(): Promise<void> {
  const { decimals, mode } = parseArgs();
  const derivedDir = resolve('data/derived');
  
  process.stdout.write(`Mode: ${mode}\n`);
  
  // Prefer settlements_viewer_v1.geojson, fallback to substrate
  const viewerPath = resolve(derivedDir, 'settlements_viewer_v1.geojson');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const inputPath = existsSync(viewerPath) ? viewerPath : substratePath;
  
  if (!existsSync(inputPath)) {
    process.stderr.write(`FAIL: No settlement geometry found. Tried:\n  ${viewerPath}\n  ${substratePath}\n`);
    process.exit(1);
  }
  
  process.stdout.write(`Reading settlements from ${inputPath}...\n`);
  
  // Load mun1990_names for lookup and display names
  const mun1990NamesPath = resolve(derivedDir, 'mun1990_names.json');
  let mun1990Names: { 
    by_municipality_id?: Record<string, { display_name?: string; mun1990_id?: string }>;
    by_mun1990_id?: Record<string, { display_name?: string; post1995_municipality_ids?: string[] }>;
  } = {};
  if (existsSync(mun1990NamesPath)) {
    mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8'));
  }
  
  // Load canonical registry for mun1990_id validation (in mun1990 mode) — via selector (prefer 110 when present)
  const canonicalMun1990Ids = new Set<string>();
  if (mode === 'mun1990') {
    try {
      const loaded = loadCanonicalMun1990Registry(resolve());
      for (const row of loaded.rows) {
        canonicalMun1990Ids.add(row.mun1990_id);
      }
      process.stdout.write(`Loaded ${canonicalMun1990Ids.size} canonical mun1990_ids from registry\n`);
    } catch {
      // Registry not found; canonicalMun1990Ids stays empty
    }
  }
  
  // H4.6: Hardcoded name normalization for known mismatches (han_pijesak only).
  // CRITICAL (Phase H5.1): Novo Sarajevo is NOT Sarajevo. novo_sarajevo must remain a distinct mun1990_id.
  // Do NOT add novo_sarajevo -> sarajevo or any collapse of Sarajevo-related IDs.
  const mun1990NameNormalization = new Map<string, string>([
    ['hanpijesak', 'han_pijesak'],
  ]);
  
  // Build mun1990_id lookup map (municipality_id -> mun1990_id), registry-validated
  const mun1990Lookup = new Map<string, string>();
  if (mode === 'mun1990' && mun1990Names.by_municipality_id) {
    let skipped = 0;
    for (const [munId, data] of Object.entries(mun1990Names.by_municipality_id)) {
      let mun1990Id = data.mun1990_id;
      if (mun1990Id) {
        // Apply name normalization
        mun1990Id = mun1990NameNormalization.get(mun1990Id) ?? mun1990Id;
        
        // Only add if in canonical registry
        if (canonicalMun1990Ids.size === 0 || canonicalMun1990Ids.has(mun1990Id)) {
          mun1990Lookup.set(munId, mun1990Id);
        } else {
          skipped++;
        }
      }
    }
    process.stdout.write(`Loaded ${mun1990Lookup.size} municipality_id -> mun1990_id mappings (${skipped} skipped as not in registry)\n`);
  }
  
  const byKey = await streamSettlements(inputPath, decimals, mode, mun1990Lookup, canonicalMun1990Ids, mun1990NameNormalization);
  
  // Check for duplicate display names across mun1990_id (report only)
  const duplicateDisplayNames: Record<string, string[]> = {};
  if (mode === 'mun1990' && mun1990Names.by_mun1990_id) {
    const nameToMun1990Ids = new Map<string, string[]>();
    for (const [mun1990Id, data] of Object.entries(mun1990Names.by_mun1990_id)) {
      const name = data.display_name ?? mun1990Id;
      if (!nameToMun1990Ids.has(name)) {
        nameToMun1990Ids.set(name, []);
      }
      nameToMun1990Ids.get(name)!.push(mun1990Id);
    }
    for (const [name, ids] of nameToMun1990Ids.entries()) {
      if (ids.length > 1) {
        duplicateDisplayNames[name] = ids.sort();
      }
    }
    
    if (Object.keys(duplicateDisplayNames).length > 0) {
      process.stdout.write(`\nWarning: ${Object.keys(duplicateDisplayNames).length} duplicate display names across different mun1990_ids\n`);
      const reportPath = resolve(derivedDir, 'h4_5_duplicate_mun1990_display_names.json');
      writeFileSync(reportPath, JSON.stringify(duplicateDisplayNames, null, 2), 'utf8');
      process.stdout.write(`  Wrote report to ${reportPath}\n`);
    }
  }
  
  // Process each key (municipality_id or mun1990_id depending on mode)
  const features: Array<{
    type: string;
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }> = [];
  
  const keys = [...byKey.keys()].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  
  process.stdout.write(`\nProcessing ${keys.length} ${mode === 'mun1990' ? 'mun1990 groups' : 'municipalities'}...\n`);
  
  for (const key of keys) {
    const { edges, mun1990_id, post1995_municipality_ids } = byKey.get(key)!;
    const boundary = extractBoundarySegments(edges);
    const rings = stitchRings(boundary);
    
    // Sort rings deterministically for stable output (especially for MultiPolygon)
    const sortedRings = sortRingsDeterministic(rings, decimals);
    
    let displayName: string;
    let properties: Record<string, unknown>;
    
    if (mode === 'mun1990') {
      // key is mun1990_id
      displayName = mun1990Names.by_mun1990_id?.[key]?.display_name ?? key;
      const post1995Ids = [...post1995_municipality_ids].sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
      properties = {
        mun1990_id: key,
        display_name: displayName,
        post1995_municipality_ids: post1995Ids,
        geometry_kind: 'polygon',
      };
    } else {
      // key is municipality_id
      displayName = mun1990Names.by_municipality_id?.[key]?.display_name ?? key;
      const resolvedMun1990Id = mun1990_id ?? mun1990Names.by_municipality_id?.[key]?.mun1990_id ?? null;
      properties = {
        municipality_id: key,
        mun1990_id: resolvedMun1990Id,
        display_name: displayName,
        geometry_kind: 'polygon',
      };
    }
    
    if (sortedRings.length === 0) {
      // No closed rings; emit as LineString fallback
      properties.geometry_kind = 'boundary_lines';
      features.push({
        type: 'Feature',
        properties,
        geometry: {
          type: 'MultiLineString',
          coordinates: boundary.map(([ax, ay, bx, by]) => [[ax, ay], [bx, by]]),
        },
      });
    } else if (sortedRings.length === 1) {
      properties.geometry_kind = 'polygon';
      features.push({
        type: 'Feature',
        properties,
        geometry: {
          type: 'Polygon',
          coordinates: sortedRings,
        },
      });
    } else {
      properties.geometry_kind = 'multipolygon';
      features.push({
        type: 'Feature',
        properties,
        geometry: {
          type: 'MultiPolygon',
          coordinates: sortedRings.map((r) => [r]),
        },
      });
    }
  }
  
  const role = mode === 'mun1990' ? 'municipality_viewer_geometry_mun1990' : 'municipality_viewer_geometry';
  const version = mode === 'mun1990' ? 'h4_6' : 'h4_2';
  const idField = mode === 'mun1990' ? 'mun1990_id' : 'municipality_id';
  
  const geojson = {
    type: 'FeatureCollection',
    awwv_meta: {
      role,
      version,
      schema: 'awwv://schemas/municipalities_viewer_v1.json',
      precision: 'float',
      id_field: idField,
      record_count: features.length,
    },
    features,
  };
  
  const outBasename = mode === 'mun1990' ? 'municipalities_mun1990_viewer_v1' : 'municipalities_viewer_v1';
  const outPath = resolve(derivedDir, `${outBasename}.geojson`);
  const outPathGz = resolve(derivedDir, `${outBasename}.geojson.gz`);
  
  writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf8');
  process.stdout.write(`Wrote ${outPath} (${features.length} ${mode === 'mun1990' ? 'mun1990 groups' : 'municipalities'})\n`);
  
  // Gzip (await completion before exit)
  await new Promise<void>((resolve, reject) => {
    const gzStream = createGzip({ level: 9 });
    const readable = Readable.from([JSON.stringify(geojson, null, 2)]);
    const chunks: Buffer[] = [];
    gzStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    gzStream.on('end', () => {
      try {
        const gzBuffer = Buffer.concat(chunks);
        writeFileSync(outPathGz, gzBuffer);
        const sizeGz = (gzBuffer.length / 1024).toFixed(1);
        process.stdout.write(`Wrote ${outPathGz} (${sizeGz} KB)\n`);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    gzStream.on('error', reject);
    readable.pipe(gzStream);
  });
}

main().then(
  () => {},
  (err) => {
    process.stderr.write(String(err));
    process.exit(1);
  }
);
