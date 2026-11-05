import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TerrainScalarsData } from './terrain_scalars.js';

const cacheByPath = new Map<string, TerrainScalarsData>();

const DEFAULT_PATH = 'data/derived/terrain/settlements_terrain_scalars.json';

/**
 * Node-only terrain scalars loader.
 * Keep file-system access out of terrain_scalars.ts so browser map imports stay safe.
 */
export async function loadTerrainScalars(filePath?: string): Promise<TerrainScalarsData> {
    const absPath = resolve(filePath ?? DEFAULT_PATH);
    const cached = cacheByPath.get(absPath);
    if (cached) return cached;
    const raw = JSON.parse(await readFile(absPath, 'utf8')) as {
        by_sid?: Record<string, TerrainScalarsData['by_sid'][string]>;
    };

    const data = { by_sid: raw.by_sid ?? {} };
    cacheByPath.set(absPath, data);
    return data;
}
