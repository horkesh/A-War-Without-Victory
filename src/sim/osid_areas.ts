import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface OsidAreaData {
    total: number;
    areas: Record<string, number>;
}

let osidAreaCache: OsidAreaData | null = null;

export function getOsidAreas(): OsidAreaData {
    if (osidAreaCache) return osidAreaCache;
    try {
        const filePath = resolve(process.cwd(), 'data/derived/operational/osid_areas.json');
        const raw = JSON.parse(readFileSync(filePath, 'utf8')) as { total_area_km2: number; areas: Record<string, number> };
        osidAreaCache = { total: raw.total_area_km2, areas: raw.areas };
    } catch {
        osidAreaCache = { total: 51337, areas: {} };
    }
    return osidAreaCache;
}
