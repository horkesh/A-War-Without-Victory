/**
 * Phase H6.10.5 — Load municipality_id corrections for viewer embedding
 *
 * Invoked by build_substrate_viewer_index.ts when generating viewer.js.
 * Reads data/derived/_debug/nw_municipality_id_corrections_h6_10_5.json if it exists
 * and returns entries for MUNI_ID_CORRECTIONS Map (feature_key -> corrected municipality_id).
 * If the file is missing, returns [] so the viewer embeds empty corrections.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface Correction {
  feature_key: string;
  census_id: string;
  from: string;
  to: string;
}

interface CorrectionsFile {
  meta?: { phase?: string };
  corrections?: Correction[];
}

/**
 * Load corrections from _debug JSON. Returns array of [feature_key, to] for Map constructor.
 * Deterministic: corrections in the file are already sorted by (to, from, census_id, feature_key).
 */
export function loadCorrectionsForViewer(debugDir: string): Array<[string, string]> {
  const path = resolve(debugDir, 'nw_municipality_id_corrections_h6_10_5.json');
  if (!existsSync(path)) {
    return [];
  }
  const content = readFileSync(path, 'utf8');
  const data = JSON.parse(content) as CorrectionsFile;
  const corrections = data.corrections ?? [];
  return corrections.map((c) => [c.feature_key, c.to] as [string, string]);
}
