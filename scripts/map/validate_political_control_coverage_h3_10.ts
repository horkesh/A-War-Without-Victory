/**
 * Phase H3.10: Validate that political_control_data.json covers every settlement
 * in the viewer roster (settlements_substrate.geojson). Exit non-zero if any
 * roster settlement is missing a control entry.
 *
 * Usage: npm run map:viewer:political-control-coverage
 *   or: tsx scripts/map/validate_political_control_coverage_h3_10.ts
 */

import { readFileSync, existsSync, createReadStream } from 'node:fs';
import { resolve } from 'node:path';


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
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return { objectString: buffer.slice(begin, pos + 1), nextIndex: pos + 1 };
      continue;
    }
  }
  return null;
}

async function streamViewerRosterControlKeys(geojsonPath: string): Promise<string[]> {
  const keys: string[] = [];
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let featuresStart = -1;
    let pos = 0;
    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        keys.sort((a, b) => a.localeCompare(b));
        resolvePromise(keys);
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
          const feature = JSON.parse(extracted.objectString) as { id?: string; properties?: Record<string, unknown> };
          const props = feature?.properties ?? {};
          const sidRaw = props.sid ?? feature?.id;
          if (sidRaw == null) continue;
          let numeric_sid: string;
          if (typeof sidRaw === 'string' && /^S\d+$/.test(sidRaw)) {
            numeric_sid = sidRaw.slice(1);
          } else if (typeof sidRaw === 'string' && sidRaw.includes(':')) {
            numeric_sid = sidRaw.split(':')[1] ?? String(sidRaw).replace(/^S/i, '');
          } else {
            numeric_sid = String(sidRaw).replace(/^S/i, '');
          }
          const munId = props.municipality_id ?? props.mun1990_municipality_id ?? props.opstina_id ?? props.muni_id;
          if (munId == null || typeof munId !== 'string') continue;
          const municipality_id = String(munId).trim();
          keys.push(`${municipality_id}:${numeric_sid}`);
        } catch {
          /* skip */
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

async function main(): Promise<void> {
  const derivedDir = resolve('data/derived');
  const substratePath = resolve(derivedDir, 'settlements_substrate.geojson');
  const controlPath = resolve(derivedDir, 'political_control_data.json');

  if (!existsSync(substratePath)) {
    console.error('FAIL: Viewer roster source not found:', substratePath);
    process.exit(1);
  }
  if (!existsSync(controlPath)) {
    console.error('FAIL: political_control_data.json not found. Run npm run map:viewer:political-control-data');
    process.exit(1);
  }

  const rosterKeys = await streamViewerRosterControlKeys(substratePath);
  const controlJson = JSON.parse(readFileSync(controlPath, 'utf8')) as {
    by_settlement_id?: Record<string, string | null>;
  };
  const bySet = controlJson.by_settlement_id ?? {};
  const missing = rosterKeys.filter((k) => !(k in bySet));
  if (missing.length > 0) {
    const first10 = missing.slice(0, 10);
    console.error(`FAIL: ${missing.length} roster settlements missing from political_control_data. First 10 (stable-sorted): ${first10.join(', ')}`);
    process.exit(1);
  }
  console.log(`PASS: Political control coverage — ${rosterKeys.length} roster settlements have control entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
