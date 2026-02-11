
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyTps, type TpsParams } from './lib/tps.js';

const ROOT = resolve(process.cwd());
const SOURCE_PATH = resolve(ROOT, 'data/source/geo/adm3.geojson');
const TRANSFORM_PATH = resolve(ROOT, 'data/derived/georef/world_to_svg_transform.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/adm3_a1_viewer.geojson');

function main() {
    console.log('--- Deriving Modern Borders A1 Viewer Data ---');

    if (!existsSync(SOURCE_PATH)) {
        console.error(`Missing source file: ${SOURCE_PATH}`);
        process.exit(1);
    }
    if (!existsSync(TRANSFORM_PATH)) {
        console.error(`Missing transform file: ${TRANSFORM_PATH}`);
        process.exit(1);
    }

    const transform = JSON.parse(readFileSync(TRANSFORM_PATH, 'utf-8'));
    const tpsParams: TpsParams = transform.coefficients;
    const sourceData = JSON.parse(readFileSync(SOURCE_PATH, 'utf-8'));

    let processedFeatures = 0;
    const errors: any[] = [];

    const projectPoint = (pt: number[]): number[] | null => {
        const [lon, lat] = pt;
        // Basic sanity check relative to BiH bounds to avoid TPS artifacts for outliers
        if (lon < 15 || lon > 20 || lat < 42 || lat > 46) return null;

        const [x, y] = applyTps(lon, lat, tpsParams);
        if (isNaN(x) || isNaN(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000) return null;

        // A1 space is already N-up based on tps.ts logic and phase_A1_derive_base_map usage
        return [parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))];
    };

    const projectLine = (line: number[][]): number[][] | null => {
        const out: number[][] = [];
        for (const pt of line) {
            const projected = projectPoint(pt);
            if (projected) out.push(projected);
        }
        return out.length > 1 ? out : null;
    };

    const processGeometry = (geom: any): any => {
        if (!geom) return null;

        if (geom.type === 'LineString') {
            const coords = projectLine(geom.coordinates);
            return coords ? { type: 'LineString', coordinates: coords } : null;
        } else if (geom.type === 'MultiLineString') {
            const lines: number[][][] = [];
            for (const line of geom.coordinates) {
                const projected = projectLine(line);
                if (projected) lines.push(projected);
            }
            return lines.length > 0 ? { type: 'MultiLineString', coordinates: lines } : null;
        } else if (geom.type === 'Polygon') {
            const rings: number[][][] = [];
            for (const ring of geom.coordinates) {
                const projected = projectLine(ring);
                if (projected) rings.push(projected);
            }
            return rings.length > 0 ? { type: 'Polygon', coordinates: rings } : null;
        } else if (geom.type === 'MultiPolygon') {
            const polys: number[][][][] = [];
            for (const poly of geom.coordinates) {
                const rings: number[][][] = [];
                for (const ring of poly) {
                    const projected = projectLine(ring);
                    if (projected) rings.push(projected);
                }
                if (rings.length > 0) polys.push(rings);
            }
            return polys.length > 0 ? { type: 'MultiPolygon', coordinates: polys } : null;
        }
        return null;
    };

    const outFeatures = [];
    for (const f of sourceData.features) {
        const geom = processGeometry(f.geometry);
        if (geom) {
            outFeatures.push({
                type: 'Feature',
                properties: f.properties,
                geometry: geom
            });
            processedFeatures++;
        }
    }

    const collection = {
        type: 'FeatureCollection',
        features: outFeatures
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(collection));
    console.log(`Wrote ${processedFeatures} features to ${OUTPUT_PATH}`);
}

main();
