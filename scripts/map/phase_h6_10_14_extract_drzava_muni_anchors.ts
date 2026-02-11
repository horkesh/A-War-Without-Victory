/**
 * Phase H6.10.14 — Extract drzava.js municipality anchors for NW placement reference
 *
 * PURPOSE:
 *   Extract anchor points (middleX/middleY or bbox center) for NW municipalities and
 *   neighbors from data/source/drzava.js. DIAGNOSTIC REFERENCE ONLY — coordinate
 *   consistency, not historical truth.
 *
 * INPUTS:
 *   - data/source/drzava.js
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - drzava_muni_anchors_h6_10_14.json
 *   - drzava_muni_anchors_h6_10_14.txt
 *
 * TARGET MUNICIPALITIES:
 *   - 10049 Bihać, 10227 Cazin, 11240 Bužim, 11118 Velika Kladuša (NW)
 *   - 11428 Bosanska Krupa, 11436 Bosanski Petrovac (neighbors, if present)
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_14_extract_drzava_muni_anchors.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';
import { bboxFromCoords, svgPathToPolygon } from './derive_settlement_substrate_from_svg_sources.js';


const ROOT = resolve();
const SOURCE_PATH = resolve(ROOT, 'data/source/drzava.js');
const DEBUG_DIR = resolve(ROOT, 'data/derived/_debug');
const JSON_PATH = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_14.json');
const TXT_PATH = resolve(DEBUG_DIR, 'drzava_muni_anchors_h6_10_14.txt');

const TARGET_MUN_IDS = new Set(['10049', '10227', '11240', '11118', '11428', '11436']);
const NW_LABELS: Record<string, string> = {
  '10049': 'Bihać',
  '10227': 'Cazin',
  '11240': 'Bužim',
  '11118': 'Velika Kladuša',
  '11428': 'Bosanska Krupa',
  '11436': 'Bosanski Petrovac'
};

interface DrzavaAnchor {
  mun_id: string;
  name: string | null;
  anchor_x: number;
  anchor_y: number;
  anchor_source: 'middleX_middleY' | 'bbox_center';
  bbox: [number, number, number, number];
}

function extractAllMunicipalitiesFromDrzava(content: string): Map<string, DrzavaAnchor> {
  const result = new Map<string, DrzavaAnchor>();

  // drzava.js format: aus.push(R.path("...").data("middleX", N).data("middleY", N).data("munID", M).attr(attr))
  // Each municipality on one line; capture path and rest of line for .data() parsing
  const pathRegex = /(?:aus|kantoni)\.push\s*\(\s*R\.path\s*\(\s*"([^"]+)"\s*\)([^\n]*)/g;

  let match;
  while ((match = pathRegex.exec(content)) !== null) {
    const pathStr = match[1];
    const rest = match[2];

    const munIDMatch = rest.match(/\.data\s*\(\s*"munID"\s*,\s*(\d+)\s*\)/);
    if (!munIDMatch) continue;
    const munId = munIDMatch[1];
    if (!TARGET_MUN_IDS.has(munId)) continue;

    let middleX: number | null = null;
    let middleY: number | null = null;
    const mxMatch = rest.match(/\.data\s*\(\s*"middleX"\s*,\s*(\d+)\s*\)/);
    const myMatch = rest.match(/\.data\s*\(\s*"middleY"\s*,\s*(\d+)\s*\)/);
    if (mxMatch) middleX = parseInt(mxMatch[1], 10);
    if (myMatch) middleY = parseInt(myMatch[1], 10);

    const polygon = svgPathToPolygon(pathStr);
    if (!polygon || !polygon[0]) continue;
    const bbox = bboxFromCoords(polygon);
    if (!bbox.every(Number.isFinite)) continue;

    const bboxCenterX = (bbox[0] + bbox[2]) / 2;
    const bboxCenterY = (bbox[1] + bbox[3]) / 2;

    const anchor_x = middleX !== null && middleY !== null ? middleX : bboxCenterX;
    const anchor_y = middleX !== null && middleY !== null ? middleY : bboxCenterY;
    const anchor_source: 'middleX_middleY' | 'bbox_center' =
      middleX !== null && middleY !== null ? 'middleX_middleY' : 'bbox_center';

    const name = NW_LABELS[munId] ?? null;

    result.set(munId, {
      mun_id: munId,
      name,
      anchor_x,
      anchor_y,
      anchor_source,
      bbox: [bbox[0], bbox[1], bbox[2], bbox[3]]
    });
  }

  return result;
}

function main(): void {
  if (!existsSync(SOURCE_PATH)) {
    console.error('Missing drzava.js:', SOURCE_PATH);
    process.exit(1);
  }

  const content = readFileSync(SOURCE_PATH, 'utf8');
  const anchors = extractAllMunicipalitiesFromDrzava(content);

  const sorted = Array.from(anchors.values()).sort((a, b) =>
    parseInt(a.mun_id, 10) - parseInt(b.mun_id, 10)
  );

  const payload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.14',
    source: 'data/source/drzava.js',
    anchors: sorted,
    note: 'drzava.js is DIAGNOSTIC REFERENCE ONLY (coordinate consistency, not historical truth)'
  }) as Record<string, unknown>;

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.14 — Drzava municipality anchors (diagnostic reference only)',
    '',
    `Extracted: ${sorted.length} municipalities`,
    '',
    'Anchors (sorted by mun_id):',
    ...sorted.map((a) =>
      `  ${a.mun_id} ${a.name ?? ''} anchor=(${a.anchor_x.toFixed(2)}, ${a.anchor_y.toFixed(2)}) source=${a.anchor_source} bbox=[${a.bbox.map((n) => n.toFixed(2)).join(', ')}]`
    )
  ];
  const missing = Array.from(TARGET_MUN_IDS).filter((id) => !anchors.has(id));
  if (missing.length > 0) {
    lines.push('');
    lines.push(`Not found in drzava.js (skipped): ${missing.join(', ')}`);
  }
  writeFileSync(TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${JSON_PATH}\n`);
  process.stdout.write(`Wrote ${TXT_PATH}\n`);
  process.stdout.write(`Extracted ${sorted.length} anchors for NW/neighbor municipalities\n`);
}

main();
