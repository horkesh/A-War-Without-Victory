import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TerrainScalarsData } from './terrain_scalars.js';

let cache: TerrainScalarsData | null = null;

const DEFAULT_PATH = 'data/derived/terrain/settlements_terrain_scalars.json';

/**
 * Node-only terrain scalars loader.
 * Keep file-system access out of terrain_scalars.ts so browser map imports stay safe.
 */
export async function loadTerrainScalars(filePath?: string): Promise<TerrainScalarsData> {
    if (cache) return cache;

    const absPath = resolve(filePath ?? DEFAULT_PATH);
    const raw = JSON.parse(await readFile(absPath, 'utf8')) as {
        by_sid?: Record<string, TerrainScalarsData['by_sid'][string]>;
    };

    cache = { by_sid: raw.by_sid ?? {} };
    return cache;
}
