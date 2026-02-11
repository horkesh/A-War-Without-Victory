import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve();
const DATA = resolve(ROOT, 'data');
const SOURCE = resolve(DATA, 'source');
const DERIVED = resolve(DATA, 'derived');
const TERRAIN = resolve(DERIVED, 'terrain');
const PBF_PATH = resolve(SOURCE, 'osm/bosnia-herzegovina-latest.osm.pbf');
const BOUNDARIES_PATH = resolve(SOURCE, 'boundaries/bih_adm3_1990.geojson');

function runOsmium(args: string[]) {
    const r = spawnSync('osmium', args, { encoding: 'utf8', timeout: 300_000 });
    return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr };
}

function computeBbox() {
    const content = JSON.parse(readFileSync(BOUNDARIES_PATH, 'utf8'));
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    content.features.forEach((f: any) => {
        const coords = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        coords.forEach((poly: any) => poly.forEach((ring: any) => ring.forEach((p: any) => {
            if (p[0] < minLon) minLon = p[0]; if (p[1] < minLat) minLat = p[1];
            if (p[0] > maxLon) maxLon = p[0]; if (p[1] > maxLat) maxLat = p[1];
        })));
    });
    return [minLon - 0.1, minLat - 0.1, maxLon + 0.1, maxLat + 0.1];
}

async function main() {
    console.log('--- Phase A1: Forest Extraction ---');
    const bbox = computeBbox();
    const bboxStr = bbox.join(',');

    const tempDir = resolve(TERRAIN, '_tmp');
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

    const forestPbf = resolve(tempDir, 'forests.pbf');
    const forestGeojson = resolve(TERRAIN, 'osm_forests_snapshot_A1.geojson');

    console.log('Filtering for forests...');
    const tf = runOsmium(['tags-filter', PBF_PATH, 'n/landuse=forest', 'n/natural=wood', 'w/landuse=forest', 'w/natural=wood', 'r/landuse=forest', 'r/natural=wood', '-o', forestPbf, '--overwrite']);
    if (!tf.ok) throw new Error(`Osmium tags-filter failed: ${tf.stderr}`);

    console.log('Exporting to GeoJSON...');
    const exp = runOsmium(['export', '-f', 'geojson', forestPbf, '-o', forestGeojson, '--overwrite']);
    if (!exp.ok) throw new Error(`Osmium export failed: ${exp.stderr}`);

    console.log(`Success: Extracted forests to ${forestGeojson}`);
}

main().catch(console.error);
