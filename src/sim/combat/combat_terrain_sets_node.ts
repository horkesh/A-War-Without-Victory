import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadOsidSet(relativePath: string, baseDir?: string): Set<string> {
    try {
        const filePath = resolve(baseDir ?? process.cwd(), relativePath);
        const ids = JSON.parse(readFileSync(filePath, 'utf8')) as string[];
        return new Set(ids);
    } catch {
        return new Set<string>();
    }
}

export function loadUrbanOsidSet(baseDir?: string): Set<string> {
    return loadOsidSet('data/derived/operational/urban_osids.json', baseDir);
}

export function loadForestOsidSet(baseDir?: string): Set<string> {
    return loadOsidSet('data/derived/operational/forest_osids.json', baseDir);
}
