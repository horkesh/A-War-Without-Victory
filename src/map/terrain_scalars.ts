/**
 * Terrain scalars loader: reads per-settlement terrain data from
 * data/derived/terrain/settlements_terrain_scalars.json.
 *
 * Six scalars per settlement:
 *   road_access_index      [0,1] — road network density
 *   river_crossing_penalty  [0,1] — waterway crossing difficulty
 *   elevation_mean_m        meters above sea level
 *   elevation_stddev_m      elevation roughness
 *   slope_index             [0,1] — steepness
 *   terrain_friction_index  [0,1] — overall movement difficulty
 *
 * Deterministic: no randomness, cached after first load.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// --- Types ---

export interface TerrainScalars {
  road_access_index: number;
  river_crossing_penalty: number;
  elevation_mean_m: number;
  elevation_stddev_m: number;
  slope_index: number;
  terrain_friction_index: number;
}

export interface TerrainScalarsData {
  by_sid: Record<string, TerrainScalars>;
}

// --- Default (flat open terrain, no rivers, low elevation) ---

const DEFAULT_TERRAIN: TerrainScalars = {
  road_access_index: 0.5,
  river_crossing_penalty: 0,
  elevation_mean_m: 200,
  elevation_stddev_m: 10,
  slope_index: 0.1,
  terrain_friction_index: 0.1
};

// --- Cache ---

let cache: TerrainScalarsData | null = null;

// --- Loader ---

const DEFAULT_PATH = 'data/derived/terrain/settlements_terrain_scalars.json';

/**
 * Load terrain scalars from disk. Caches after first load.
 * Safe to call multiple times; subsequent calls return the cache.
 */
export async function loadTerrainScalars(filePath?: string): Promise<TerrainScalarsData> {
  if (cache) return cache;

  const absPath = resolve(filePath ?? DEFAULT_PATH);
  const raw = JSON.parse(await readFile(absPath, 'utf8')) as {
    by_sid?: Record<string, TerrainScalars>;
  };

  const bySid = raw.by_sid ?? {};
  cache = { by_sid: bySid };
  return cache;
}

/**
 * Get terrain scalars for a specific settlement.
 * Returns default flat-terrain scalars if SID is not found.
 */
export function getTerrainScalarsForSid(
  data: TerrainScalarsData,
  sid: string
): TerrainScalars {
  return data.by_sid[sid] ?? DEFAULT_TERRAIN;
}

/**
 * Inject pre-loaded terrain data into the cache (for tests / browser contexts).
 */
export function setTerrainScalarsCache(data: TerrainScalarsData): void {
  cache = data;
}

/**
 * Clear the cache (for tests).
 */
export function clearTerrainScalarsCache(): void {
  cache = null;
}
