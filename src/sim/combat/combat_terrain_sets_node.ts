import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadOsidSet(relativePath: string): Set<string> {
    try {
        const filePath = resolve(process.cwd(), relativePath);
        const ids = JSON.parse(readFileSync(filePath, 'utf8')) as string[];
        return new Set(ids);
    } catch {
        return new Set<string>();
    }
}

export function loadUrbanOsidSet(): Set<string> {
    return loadOsidSet('data/derived/operational/urban_osids.json');
}

export function loadForestOsidSet(): Set<string> {
    return loadOsidSet('data/derived/operational/forest_osids.json');
}
