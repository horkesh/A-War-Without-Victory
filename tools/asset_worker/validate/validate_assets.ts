import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { AssetEntry, loadManifest, MANIFEST_PATH } from '../lib/manifest.js';
import { hashFileSha256 } from '../lib/manifest.js';
import { readPngMeta } from '../lib/png.js';

const CONTEXT = 'phase a1.0 asset worker pipeline + mcp tools + deterministic postprocess';

type ValidationError = {
  asset_id: string;
  message: string;
};

const REQUIRED_FAMILIES = new Set(['hq', 'props', 'crests', 'papers']);

function validatePathPrefix(path: string, prefix: string): boolean {
  return path.replace(/\\/g, '/').startsWith(prefix);
}

function validateEntry(entry: AssetEntry): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!entry.asset_id) {
    errors.push({ asset_id: '<missing>', message: 'asset_id is required.' });
    return errors;
  }

  if (!REQUIRED_FAMILIES.has(entry.family)) {
    errors.push({ asset_id: entry.asset_id, message: `Unknown family: ${entry.family}` });
  }

  const sourcePath = entry.source_path ?? entry.raw_path ?? null;
  if (!sourcePath) {
    errors.push({ asset_id: entry.asset_id, message: 'source_path or raw_path must be provided.' });
  } else {
    if (entry.source_path && !validatePathPrefix(entry.source_path, `assets/sources/${entry.family}/`)) {
      errors.push({ asset_id: entry.asset_id, message: `source_path must live under assets/sources/${entry.family}/` });
    }
    if (entry.raw_path && !validatePathPrefix(entry.raw_path, 'assets/raw_sora/')) {
      errors.push({ asset_id: entry.asset_id, message: 'raw_path must live under assets/raw_sora/' });
    }
    const absolute = resolve(sourcePath);
    if (!existsSync(absolute)) {
      errors.push({ asset_id: entry.asset_id, message: `Missing source/raw file: ${sourcePath}` });
    } else {
      const sha = hashFileSha256(absolute);
      if (!entry.sha256_source) {
        errors.push({ asset_id: entry.asset_id, message: 'sha256_source is required.' });
      } else if (entry.sha256_source !== sha) {
        errors.push({ asset_id: entry.asset_id, message: `sha256_source mismatch for ${sourcePath}` });
      }

      if (entry.params?.width || entry.params?.height || entry.params?.transparent !== undefined) {
        const meta = readPngMeta(absolute);
        if (entry.params.width && meta.width !== entry.params.width) {
          errors.push({ asset_id: entry.asset_id, message: `width mismatch: expected ${entry.params.width}, got ${meta.width}` });
        }
        if (entry.params.height && meta.height !== entry.params.height) {
          errors.push({ asset_id: entry.asset_id, message: `height mismatch: expected ${entry.params.height}, got ${meta.height}` });
        }
        if (entry.params.transparent === true && !meta.hasTransparentPixels) {
          errors.push({ asset_id: entry.asset_id, message: 'transparent=true but no transparent pixels found.' });
        }
        if (entry.params.transparent === false && meta.hasTransparentPixels) {
          errors.push({ asset_id: entry.asset_id, message: 'transparent=false but transparent pixels found.' });
        }
      }
    }
  }

  if (entry.derived_paths?.length > 1) {
    errors.push({ asset_id: entry.asset_id, message: 'Only one derived_path is supported in this phase.' });
  }

  if (entry.derived_paths?.length) {
    const derivedPath = entry.derived_paths[0];
    if (!validatePathPrefix(derivedPath, 'assets/derived/')) {
      errors.push({ asset_id: entry.asset_id, message: 'derived_path must live under assets/derived/' });
    }
    const absolute = resolve(derivedPath);
    if (!existsSync(absolute)) {
      errors.push({ asset_id: entry.asset_id, message: `Missing derived file: ${derivedPath}` });
    } else {
      const sha = hashFileSha256(absolute);
      if (!entry.sha256_derived) {
        errors.push({ asset_id: entry.asset_id, message: 'sha256_derived is required for derived outputs.' });
      } else if (entry.sha256_derived !== sha) {
        errors.push({ asset_id: entry.asset_id, message: `sha256_derived mismatch for ${derivedPath}` });
      }
      if (entry.params?.width || entry.params?.height) {
        const meta = readPngMeta(absolute);
        if (entry.params.width && meta.width !== entry.params.width) {
          errors.push({ asset_id: entry.asset_id, message: `derived width mismatch: expected ${entry.params.width}, got ${meta.width}` });
        }
        if (entry.params.height && meta.height !== entry.params.height) {
          errors.push({ asset_id: entry.asset_id, message: `derived height mismatch: expected ${entry.params.height}, got ${meta.height}` });
        }
      }
    }
  }

  return errors;
}

function main(): void {

  const manifest = loadManifest(MANIFEST_PATH);
  const assets = manifest.assets || [];

  const ordered = [...assets].sort((a, b) => a.asset_id.localeCompare(b.asset_id));
  const orderingMismatch = assets.some((entry, index) => entry.asset_id !== ordered[index]?.asset_id);
  const errors: ValidationError[] = [];
  if (orderingMismatch) {
    errors.push({ asset_id: '<manifest>', message: 'assets must be sorted by asset_id.' });
  }

  for (const entry of assets) {
    errors.push(...validateEntry(entry));
  }

  if (errors.length) {
    for (const error of errors) {
      console.error(`[${error.asset_id}] ${error.message}`);
    }
    process.exit(1);
  }

  console.log('Asset manifest validation passed.');
}

main();
