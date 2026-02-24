/**
 * extract_major_roads.ts
 *
 * Reads the gzipped OSM roads snapshot, filters to major road classes
 * (motorway, trunk, primary, secondary), and writes a compact WGS84
 * GeoJSON file for use by the HoI terrain texture builder.
 *
 * Usage: npx tsx scripts/map/extract_major_roads.ts
 * Output: data/derived/terrain/major_roads_wgs84.geojson (~12MB)
 */

import { createReadStream, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createGunzip } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const INPUT = resolve(ROOT, 'data/derived/terrain/osm_roads_snapshot_h6_2.geojson.gz');
const OUTPUT = resolve(ROOT, 'data/derived/terrain/major_roads_wgs84.geojson');

const MAJOR_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary']);

async function main(): Promise<void> {
    console.log('Reading gzipped roads...');
    const raw = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        createReadStream(INPUT)
            .pipe(createGunzip())
            .on('data', (chunk: Buffer) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            .on('error', reject);
    });

    console.log('Parsing JSON...');
    const fc = JSON.parse(raw) as {
        type: string;
        features: { type: string; geometry: unknown; properties: Record<string, unknown> }[];
    };

    console.log(`Total features: ${fc.features.length}`);

    const major = fc.features.filter(f => {
        const hwy = f.properties?.highway as string | undefined;
        return hwy != null && MAJOR_CLASSES.has(hwy);
    });

    // Count by class
    const counts: Record<string, number> = {};
    for (const f of major) {
        const hwy = f.properties.highway as string;
        counts[hwy] = (counts[hwy] ?? 0) + 1;
    }
    for (const [cls, count] of Object.entries(counts).sort()) {
        console.log(`  ${cls}: ${count}`);
    }
    console.log(`  TOTAL major: ${major.length}`);

    const output = {
        type: 'FeatureCollection',
        features: major,
    };

    const json = JSON.stringify(output);
    writeFileSync(OUTPUT, json, 'utf8');
    console.log(`Written: ${OUTPUT} (${(json.length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
