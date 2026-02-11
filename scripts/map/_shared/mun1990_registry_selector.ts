/**
 * Phase H5.6: Canonical mun1990 registry selector — single source of truth for registry path.
 * Prefer municipalities_1990_registry_110.json when present; else fallback to
 * municipalities_1990_registry_109.json; else throw.
 * No timestamps; stable parsing.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';


const REGISTRY_110 = 'municipalities_1990_registry_110.json';
const REGISTRY_109 = 'municipalities_1990_registry_109.json';

/**
 * Returns the canonical registry file path.
 * Prefer registry_110 if present; else registry_109; else throw.
 */
export function getCanonicalMun1990RegistryPath(root?: string): string {
  const base = root ?? resolve();
  const sourceDir = resolve(base, 'data/source');
  const reg110 = resolve(sourceDir, REGISTRY_110);
  const reg109 = resolve(sourceDir, REGISTRY_109);
  if (existsSync(reg110)) return reg110;
  if (existsSync(reg109)) return reg109;
  throw new Error(`mun1990 registry not found; tried ${reg110} and ${reg109}`);
}

export interface Mun1990RegistryRow {
  mun1990_id: string;
  name?: string;
  normalized_name?: string;
}

export interface LoadCanonicalMun1990RegistryResult {
  rows: Mun1990RegistryRow[];
  registrySet: Set<string>;
  registryById: Record<string, { name: string; normalized_name?: string }>;
  count: number;
  path: string;
}

/**
 * Load the canonical registry and build lookup structures.
 * Deterministic: no timestamps; stable ordering.
 */
export function loadCanonicalMun1990Registry(root?: string): LoadCanonicalMun1990RegistryResult {
  const path = getCanonicalMun1990RegistryPath(root);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    rows?: Mun1990RegistryRow[];
  };
  const rows = raw.rows ?? [];
  const registrySet = new Set<string>();
  const registryById: Record<string, { name: string; normalized_name?: string }> = {};
  for (const row of rows) {
    const id = row.mun1990_id ?? '';
    if (!id) continue;
    registrySet.add(id);
    registryById[id] = { name: row.name ?? id, normalized_name: row.normalized_name };
  }
  return {
    rows,
    registrySet,
    registryById,
    count: registrySet.size,
    path,
  };
}
