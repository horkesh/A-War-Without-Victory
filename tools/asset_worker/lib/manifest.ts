import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';

export type AssetFamily = 'hq' | 'props' | 'crests' | 'papers';

export type AssetParams = {
  width?: number;
  height?: number;
  transparent?: boolean;
  style_refs?: string[];
};

export type AssetEntry = {
  asset_id: string;
  family: AssetFamily;
  source_path?: string | null;
  raw_path?: string | null;
  derived_paths: string[];
  prompt: string | null;
  generator: string;
  params: AssetParams;
  created_at: string | null;
  sha256_source: string | null;
  sha256_derived: string | null;
  notes?: string | null;
};

export type AssetManifest = {
  schema_version: number;
  assets: AssetEntry[];
};

export const MANIFEST_PATH = 'assets/manifests/assets_manifest.json';

const ASSET_FAMILIES: AssetFamily[] = ['hq', 'props', 'crests', 'papers'];

export function isAssetFamily(value: string): value is AssetFamily {
  return ASSET_FAMILIES.includes(value as AssetFamily);
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function normalizePath(path: string): string {
  return path.split(sep).join('/');
}

export function loadManifest(manifestPath = MANIFEST_PATH): AssetManifest {
  const absolute = resolve(manifestPath);
  if (!existsSync(absolute)) {
    return { schema_version: 1, assets: [] };
  }
  const content = readFileSync(absolute, 'utf8');
  const parsed = JSON.parse(content) as AssetManifest;
  return parsed;
}

export function writeManifest(manifest: AssetManifest, manifestPath = MANIFEST_PATH): void {
  const absolute = resolve(manifestPath);
  ensureDir(dirname(absolute));
  const canonical = canonicalizeManifest(manifest);
  writeFileSync(absolute, stableStringify(canonical), 'utf8');
}

export function canonicalizeManifest(manifest: AssetManifest): AssetManifest {
  const assets = [...(manifest.assets || [])]
    .map((entry) => ({
      ...entry,
      derived_paths: [...(entry.derived_paths || [])].sort()
    }))
    .sort((a, b) => a.asset_id.localeCompare(b.asset_id));

  return {
    schema_version: manifest.schema_version ?? 1,
    assets
  };
}

export function stableStringify(value: unknown): string {
  const ordered = sortObject(value);
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of keys) {
    sorted[key] = sortObject(obj[key]);
  }
  return sorted;
}

export function hashFileSha256(path: string): string {
  const data = readFileSync(path);
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}
