import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadManifest, writeManifest, AssetEntry, MANIFEST_PATH } from '../lib/manifest.js';
import { readPngMeta } from '../lib/png.js';
import { hashFileSha256 } from '../lib/manifest.js';
import { spawnSync } from 'node:child_process';

const CONTEXT = 'phase a1.0 asset worker pipeline + mcp tools + deterministic postprocess';

type BatchOptions = {
  family?: string;
  assetId?: string;
  resize?: string;
  trim: boolean;
  alphaThreshold?: string;
  overwrite: boolean;
};

function parseArgs(argv: string[]): BatchOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args.set(token, value);
        i++;
      } else {
        args.set(token, 'true');
      }
    }
  }

  return {
    family: args.get('--family'),
    assetId: args.get('--assetId'),
    resize: args.get('--resize'),
    trim: args.has('--trim'),
    alphaThreshold: args.get('--alphaThreshold'),
    overwrite: args.get('--overwrite') === 'true'
  };
}

function resolveInputPath(asset: AssetEntry): string | null {
  const source = asset.source_path ?? asset.raw_path ?? null;
  if (!source) return null;
  return resolve(source);
}

function buildDerivedPath(asset: AssetEntry): string {
  return resolve(`assets/derived/${asset.family}/${asset.asset_id}.png`);
}

function postprocessAsset(asset: AssetEntry, options: BatchOptions): string | null {
  const inputPath = resolveInputPath(asset);
  if (!inputPath || !existsSync(inputPath)) {
    console.warn(`Skipping ${asset.asset_id}: missing source/raw path.`);
    return null;
  }

  const derivedPath = asset.derived_paths?.length
    ? resolve(asset.derived_paths[0])
    : buildDerivedPath(asset);

  const args = [
    'tools/asset_worker/post/postprocess_png.ts',
    '--in',
    inputPath,
    '--out',
    derivedPath
  ];

  if (options.trim) args.push('--trim');
  if (options.resize) {
    args.push('--resize', options.resize);
  } else if (asset.params?.width && asset.params?.height) {
    args.push('--resize', `${asset.params.width}x${asset.params.height}`);
  }
  if (options.alphaThreshold) args.push('--alphaThreshold', options.alphaThreshold);
  if (options.overwrite) args.push('--overwrite');

  const result = spawnSync('tsx', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Postprocess failed for ${asset.asset_id}`);
  }

  return derivedPath;
}

function main() {

  const options = parseArgs(process.argv.slice(2));
  const manifest = loadManifest(MANIFEST_PATH);
  const assets = manifest.assets || [];

  const filtered = assets.filter((asset) => {
    if (options.assetId && asset.asset_id !== options.assetId) return false;
    if (options.family && asset.family !== options.family) return false;
    return true;
  });

  if (filtered.length === 0) {
    console.log('No assets matched the filter.');
    return;
  }

  const updated = [...assets];
  for (const asset of filtered) {
    const derivedPath = postprocessAsset(asset, options);
    if (!derivedPath) continue;

    const meta = readPngMeta(derivedPath);
    const sha256 = hashFileSha256(derivedPath);
    const idx = updated.findIndex((entry) => entry.asset_id === asset.asset_id);
    if (idx !== -1) {
      const entry = updated[idx];
      updated[idx] = {
        ...entry,
        derived_paths: [derivedPath.replace(/\\/g, '/')],
        sha256_derived: sha256,
        params: {
          ...entry.params,
          width: entry.params?.width ?? meta.width,
          height: entry.params?.height ?? meta.height
        }
      };
    }
  }

  writeManifest({ ...manifest, assets: updated }, MANIFEST_PATH);
}

main();
