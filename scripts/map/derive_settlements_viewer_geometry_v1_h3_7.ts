/**
 * Derive settlements_viewer_v1.geojson from canonical substrate.
 *
 * Deterministic: stable ordering, quantized coordinates, explicit ring closure.
 */
import { createReadStream, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { Readable } from 'node:stream';



type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface SubstrateFeature {
  type: string;
  properties?: {
    sid?: string;
    municipality_id?: string | number;
    mun1990_id?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

function parseArgs(): { decimals: number } {
  const args = process.argv.slice(2);
  let decimals = 6;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--decimals' && args[i + 1]) {
      decimals = Math.max(0, Math.min(10, parseInt(args[++i], 10) || 6));
    }
  }
  return { decimals };
}

function quantize(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function closeRing(ring: Ring): Ring | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = (first[0] === last[0] && first[1] === last[1]) ? ring : [...ring, first];
  return closed.length >= 4 ? closed : null;
}

function normalizePolygon(coords: unknown, decimals: number): Polygon | null {
  if (!Array.isArray(coords)) return null;
  const out: Polygon = [];
  for (const r of coords as Ring[]) {
    const closed = closeRing(r);
    if (!closed) continue;
    out.push(closed.map(([x, y]) => [quantize(x, decimals), quantize(y, decimals)]));
  }
  return out.length > 0 ? out : null;
}

function normalizeMultiPolygon(coords: unknown, decimals: number): MultiPolygon | null {
  if (!Array.isArray(coords)) return null;
  const out: MultiPolygon = [];
  for (const poly of coords as Ring[][]) {
    const normalized = normalizePolygon(poly, decimals);
    if (normalized) out.push(normalized);
  }
  return out.length > 0 ? out : null;
}

const FEATURES_ARRAY_START = '"features":[';
const FEATURES_MARKER = '"features":';

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
    }
  }
  return null;
}

async function main(): Promise<void> {
  const { decimals } = parseArgs();
  const derivedDir = resolve('data/derived');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const outputPath = resolve(derivedDir, 'settlements_viewer_v1.geojson');
  const outputGzPath = resolve(derivedDir, 'settlements_viewer_v1.geojson.gz');

  if (!existsSync(substratePath)) {
    throw new Error(`Missing substrate file: ${substratePath}`);
  }

  const input = createReadStream(substratePath, { encoding: 'utf8' });
  const chunks: string[] = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }
  const buffer = chunks.join('');
  const start = findFeaturesArrayStart(buffer);
  if (start === -1) throw new Error('Failed to locate features array in substrate');

  let pos = start;
  const features: Array<{ type: 'Feature'; properties: Record<string, unknown>; geometry: Record<string, unknown> }> = [];

  while (true) {
    const next = extractNextFeature(buffer, pos);
    if (!next) break;
    pos = next.nextIndex;

    const f = JSON.parse(next.objectString) as SubstrateFeature;
    const sid = f.properties?.sid;
    if (!sid || !f.geometry?.type || !f.geometry.coordinates) continue;

    let geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon } | null = null;
    if (f.geometry.type === 'Polygon') {
      const normalized = normalizePolygon(f.geometry.coordinates, decimals);
      if (normalized) geometry = { type: 'Polygon', coordinates: normalized };
    } else if (f.geometry.type === 'MultiPolygon') {
      const normalized = normalizeMultiPolygon(f.geometry.coordinates, decimals);
      if (normalized) geometry = { type: 'MultiPolygon', coordinates: normalized };
    }
    if (!geometry) continue;

    const municipalityId = f.properties?.municipality_id;
    const mun1990Id = f.properties?.mun1990_id;

    features.push({
      type: 'Feature',
      properties: {
        sid,
        municipality_id: municipalityId != null ? Number(municipalityId) : undefined,
        ...(mun1990Id ? { mun1990_id: mun1990Id } : {})
      },
      geometry
    });
  }

  features.sort((a, b) => String(a.properties.sid).localeCompare(String(b.properties.sid)));

  const out = {
    type: 'FeatureCollection',
    awwv_meta: {
      role: 'viewer_geometry',
      source: 'settlements_substrate.geojson',
      quantization_decimals: decimals,
      properties_kept: ['sid', 'municipality_id', 'mun1990_id?'],
      note: 'presentation-only; do not use for simulation'
    },
    features
  };

  writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');

  const gz = createGzip({ level: 9 });
  const sourceStream = Readable.from(JSON.stringify(out));
  const chunksGz: Buffer[] = [];
  await new Promise<void>((resolvePromise, reject) => {
    sourceStream
      .pipe(gz)
      .on('data', (c: Buffer) => chunksGz.push(c))
      .on('error', reject)
      .on('end', resolvePromise);
  });
  writeFileSync(outputGzPath, Buffer.concat(chunksGz));

  process.stdout.write(`Wrote ${outputPath} (${features.length} features)\n`);
  process.stdout.write(`Wrote ${outputGzPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
