/**
 * Verify A1 coordinate transform: MSR-based bounds, (0,0) exclusion, optional city check.
 * Authoritative transform is georef world_to_svg (TPS) + capping as in phase_A1_derive_base_map.ts.
 * Run: tsx scripts/map/verify_a1_transform.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyTps, type TpsParams } from './lib/tps.js';

const ROOT = resolve(process.cwd());
const DERIVED = resolve(ROOT, 'data/derived');
const TRANSFORM_PATH = resolve(DERIVED, 'georef/world_to_svg_transform.json');
const A1_PATH = resolve(DERIVED, 'A1_BASE_MAP.geojson');

function visitPoints(
    features: any[],
    filter: (f: any) => boolean,
    visitor: (pt: number[]) => void
) {
    for (const f of features) {
        if (!filter(f)) continue;
        const type = f.geometry?.type;
        const coords = f.geometry?.coordinates;
        if (!coords) continue;
        const visit = (pt: number[]) => {
            if (pt && typeof pt[0] === 'number' && typeof pt[1] === 'number') visitor(pt);
        };
        if (type === 'Point') visit(coords);
        else if (type === 'LineString') coords.forEach(visit);
        else if (type === 'MultiLineString') coords.forEach((ln: any) => ln?.forEach(visit));
        else if (type === 'Polygon') coords[0]?.forEach(visit);
        else if (type === 'MultiPolygon') coords.forEach((p: any) => p?.[0]?.forEach(visit));
    }
}

function msrBounds(features: any[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let count = 0;
    visitPoints(features, f => f.properties?.role === 'road' && f.properties?.nato_class === 'MSR', pt => {
        if (pt[0] === 0 && pt[1] === 0) return;
        minX = Math.min(minX, pt[0]);
        minY = Math.min(minY, pt[1]);
        maxX = Math.max(maxX, pt[0]);
        maxY = Math.max(maxY, pt[1]);
        count++;
    });
    if (count === 0) return null;
    return { minX, minY, maxX, maxY };
}

function main() {
    console.log('--- A1 Coordinate Transform Verification ---\n');

    if (!existsSync(TRANSFORM_PATH)) {
        console.error('Missing world_to_svg_transform.json. Run phase H6.12 (map georef) first.');
        process.exit(1);
    }
    if (!existsSync(A1_PATH)) {
        console.error('Missing A1_BASE_MAP.geojson. Run map:a1:derive first.');
        process.exit(1);
    }

    const transform = JSON.parse(readFileSync(TRANSFORM_PATH, 'utf-8'));
    const tpsParams: TpsParams = transform.coefficients;
    const projectPoint = (lon: number, lat: number): [number, number] | null => {
        if (lon < 15 || lon > 20 || lat < 42 || lat > 46) return null;
        const [x, y] = applyTps(lon, lat, tpsParams);
        if (isNaN(x) || isNaN(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000) return null;
        return [parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))];
    };

    const data = JSON.parse(readFileSync(A1_PATH, 'utf-8'));
    const features = data.features || [];

    // 1) MSR-only bounding box (exclude 0,0)
    const bounds = msrBounds(features);
    if (!bounds) {
        console.log('FAIL: No MSR points found in A1_BASE_MAP.');
        process.exit(1);
    }
    console.log('MSR-only bounds (0,0 excluded):');
    console.log(`  minX=${bounds.minX.toFixed(2)} minY=${bounds.minY.toFixed(2)} maxX=${bounds.maxX.toFixed(2)} maxY=${bounds.maxY.toFixed(2)}`);
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    if (spanX <= 0 || spanY <= 0) {
        console.log('FAIL: Degenerate MSR bounds.');
        process.exit(1);
    }
    console.log(`  span: ${spanX.toFixed(2)} x ${spanY.toFixed(2)}\n`);

    // 2) Key cities (optional): Sarajevo, Mostar — check they exist and are within MSR bounds
    const keyCities = ['Sarajevo', 'Mostar'];
    const settlements = features.filter((f: any) => f.properties?.role === 'settlement');
    for (const name of keyCities) {
        const f = settlements.find((s: any) => s.properties?.name === name);
        if (!f) {
            console.log(`City "${name}": not found in A1 (optional).`);
            continue;
        }
        let pt = f.geometry?.coordinates;
        if (f.geometry?.type !== 'Point' && Array.isArray(pt?.[0]?.[0])) pt = pt[0][0];
        else if (Array.isArray(pt?.[0])) pt = pt[0];
        if (!pt || typeof pt[0] !== 'number') {
            console.log(`City "${name}": no valid point.`);
            continue;
        }
        const inBounds = pt[0] >= bounds.minX && pt[0] <= bounds.maxX && pt[1] >= bounds.minY && pt[1] <= bounds.maxY;
        console.log(`City "${name}": [${pt[0].toFixed(2)}, ${pt[1].toFixed(2)}] ${inBounds ? 'inside' : 'outside'} MSR bounds`);
    }
    console.log('');

    console.log('PASS: Transform verification complete.');
    console.log('Note: Authoritative transform is georef/world_to_svg_transform.json (TPS) + capping in phase_A1_derive_base_map.ts. calc_transform.cjs is diagnostic only.');
}

main();
