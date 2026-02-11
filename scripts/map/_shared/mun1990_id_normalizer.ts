/**
 * Phase H5.3: Shared mun1990_id normalizer — registry-driven canonicalization.
 * Phase H5.4: Prefer municipalities_1990_registry_110.json when present (110 mun1990); else registry_109.
 * Phase H5.6: Registry selection delegated to mun1990_registry_selector (single call site).
 *
 * Loads canonical registry and provides:
 * - registrySet, registryById, displayNameById
 * - normalizeMun1990Id(raw, aliasMap, registrySet) for deterministic normalization.
 *
 * Rules: raw in registry => canonical = raw; else raw in aliasMap and alias in registry => canonical = aliasMap[raw]; else null (reason: not_in_registry).
 * No timestamps; stable ordering when emitting audits.
 */

import { resolve } from 'node:path';
import { loadCanonicalMun1990Registry } from './mun1990_registry_selector.js';


/** Known aliases (historical typos / slug variants) -> canonical mun1990_id. Add only when encountered. */
export const MUN1990_ALIAS_MAP: Record<string, string> = {
  hanpijesak: 'han_pijesak',
};

export interface Mun1990RegistryMeta {
  selected_registry_path: string;
  selected_registry_count: number;
}

export interface Mun1990Registry {
  registrySet: Set<string>;
  registryById: Record<string, { name: string; normalized_name?: string }>;
  displayNameById: Record<string, string>;
  meta?: Mun1990RegistryMeta;
}

/**
 * Load registry and build registrySet, registryById, displayNameById.
 * Uses canonical registry selector (prefer registry_110 when present).
 * @param root - Project root (default process.cwd())
 */
export function buildMun1990RegistrySet(root?: string): Mun1990Registry {
  const base = root ?? resolve();
  const loaded = loadCanonicalMun1990Registry(base);
  const displayNameById: Record<string, string> = {};
  for (const [id, entry] of Object.entries(loaded.registryById)) {
    displayNameById[id] = entry.name ?? id;
  }
  return {
    registrySet: loaded.registrySet,
    registryById: loaded.registryById,
    displayNameById,
    meta: {
      selected_registry_path: loaded.path,
      selected_registry_count: loaded.count,
    },
  };
}

export interface NormalizeResult {
  canonical: string | null;
  reason?: string;
}

/**
 * Normalize raw mun1990_id to canonical registry id.
 * - If raw in registrySet => canonical = raw.
 * - Else if raw in aliasMap and aliasMap[raw] in registrySet => canonical = aliasMap[raw].
 * - Else => canonical = null, reason = "not_in_registry".
 */
export function normalizeMun1990Id(
  raw: string,
  aliasMap: Record<string, string>,
  registrySet: Set<string>
): NormalizeResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { canonical: null, reason: 'empty' };
  }
  if (registrySet.has(trimmed)) {
    return { canonical: trimmed, reason: undefined };
  }
  const canonical = aliasMap[trimmed];
  if (canonical != null && registrySet.has(canonical)) {
    return { canonical, reason: undefined };
  }
  return { canonical: null, reason: 'not_in_registry' };
}
