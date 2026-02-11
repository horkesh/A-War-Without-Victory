import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  MANIFEST_PATH,
  AssetEntry,
  ensureDir,
  hashFileSha256,
  loadManifest,
  normalizePath,
  writeManifest
} from './lib/manifest.js';
import { readPngMeta } from './lib/png.js';

const CONTEXT = 'phase a1.0 asset worker pipeline + mcp tools + deterministic postprocess';

const REQUIRED_DIRS = [
  'assets/sources/hq',
  'assets/sources/props',
  'assets/sources/crests',
  'assets/sources/papers',
  'assets/derived/hq',
  'assets/derived/props',
  'assets/derived/crests',
  'assets/derived/papers',
  'assets/derived/atlases',
  'assets/manifests'
];

const RAW_HQ_PATH = 'assets/raw_sora/hq_base_stable_v1.png';

function ensureDirectories(): void {
  for (const dir of REQUIRED_DIRS) {
    ensureDir(resolve(dir));
  }
}

function buildRawHqEntry(): AssetEntry {
  const absolute = resolve(RAW_HQ_PATH);
  if (!existsSync(absolute)) {
    throw new Error(`Required asset missing: ${RAW_HQ_PATH}`);
  }
  const meta = readPngMeta(absolute);
  const sha256 = hashFileSha256(absolute);

  return {
    asset_id: 'hq_base_stable_v1',
    family: 'hq',
    source_path: null,
    raw_path: normalizePath(RAW_HQ_PATH),
    derived_paths: [],
    prompt: null,
    generator: 'sora',
    params: {
      width: meta.width,
      height: meta.height,
      transparent: meta.hasTransparentPixels,
      style_refs: []
    },
    created_at: 'v1',
    sha256_source: sha256,
    sha256_derived: null,
    notes: 'Raw Sora output; not yet curated into assets/sources.'
  };
}

function upsertEntry(manifestEntries: AssetEntry[], entry: AssetEntry): AssetEntry[] {
  const index = manifestEntries.findIndex((asset) => asset.asset_id === entry.asset_id);
  if (index === -1) {
    return [...manifestEntries, entry];
  }
  const existing = manifestEntries[index];
  const updated: AssetEntry = {
    ...existing,
    family: existing.family ?? entry.family,
    raw_path: existing.raw_path ?? entry.raw_path,
    source_path: existing.source_path ?? entry.source_path,
    derived_paths: existing.derived_paths?.length ? existing.derived_paths : entry.derived_paths,
    prompt: existing.prompt ?? entry.prompt,
    generator: existing.generator ?? entry.generator,
    params: { ...entry.params, ...(existing.params || {}) },
    created_at: existing.created_at ?? entry.created_at,
    sha256_source: existing.sha256_source ?? entry.sha256_source,
    sha256_derived: existing.sha256_derived ?? entry.sha256_derived,
    notes: existing.notes ?? entry.notes
  };

  const next = [...manifestEntries];
  next[index] = updated;
  return next;
}

function main(): void {

  ensureDirectories();

  const manifest = loadManifest(MANIFEST_PATH);
  const updatedEntries = upsertEntry(manifest.assets || [], buildRawHqEntry());
  writeManifest({ ...manifest, assets: updatedEntries }, MANIFEST_PATH);
}

main();
