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

// Node.js imports are lazily loaded to allow browser-safe imports
// of the pure functions (getTerrainScalarsForSid, getMaxAttackersForTarget).
// Only loadTerrainScalars() uses the Node.js APIs.
let _readFile: typeof import('node:fs/promises').readFile | null = null;
let _resolve: typeof import('node:path').resolve | null = null;

async function ensureNodeImports(): Promise<void> {
    if (!_readFile) {
        const fs = await import('node:fs/promises');
        _readFile = fs.readFile;
    }
    if (!_resolve) {
        const path = await import('node:path');
        _resolve = path.resolve;
    }
}

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

    await ensureNodeImports();
    const absPath = _resolve!(filePath ?? DEFAULT_PATH);
    const raw = JSON.parse(await _readFile!(absPath, 'utf8') as string) as {
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

// --- Phase H: Terrain battle width (max attacking brigades per target) ---

/** slope_index above this → mountain → max 1 attacker. */
export const BATTLE_WIDTH_SLOPE_MOUNTAIN = 0.5;
/** slope_index above this → hills → max 2 attackers. */
export const BATTLE_WIDTH_SLOPE_HILL = 0.35;
/** river_crossing_penalty above this → river crossing → max 1 attacker. */
export const BATTLE_WIDTH_RIVER_THRESHOLD = 0.5;

/**
 * Max number of attacking brigades that can engage this settlement simultaneously (Phase H).
 * River crossing or mountain → 1; hills → 2; plains → 3.
 * Deterministic: derived only from terrain scalars.
 */
export function getMaxAttackersForTarget(
    data: TerrainScalarsData,
    targetSid: string
): number {
    const t = getTerrainScalarsForSid(data, targetSid);
    if (t.river_crossing_penalty >= BATTLE_WIDTH_RIVER_THRESHOLD) return 1;
    if (t.slope_index >= BATTLE_WIDTH_SLOPE_MOUNTAIN) return 1;
    if (t.slope_index >= BATTLE_WIDTH_SLOPE_HILL) return 2;
    return 3;
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
