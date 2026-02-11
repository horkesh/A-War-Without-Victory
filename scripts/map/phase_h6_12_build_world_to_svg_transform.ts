/**
 * Phase H6.12 — World → SVG georeferencing (Inverse Transform).
 * 
 * PURPOSE:
 *   Derive the inverse transform (World/WGS84 -> SVG/Pixels) needed to 
 *   project external GeoJSON data (OSM, census) into the AWWV viewer space.
 * 
 * INPUTS:
 *   - data/derived/georef/adm3_world_centroids.json
 *   - data/derived/georef/svg_municipality_centroids.json
 *   - data/derived/georef/adm3_crosswalk_final.json
 * 
 * OUTPUTS:
 *   - data/derived/georef/world_to_svg_transform.json
 * 
 * Usage: npx tsx scripts/map/phase_h6_12_build_world_to_svg_transform.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';



const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const GEOREF_DIR = resolve(DERIVED, 'georef');

const WORLD_ANCHORS_PATH = resolve(GEOREF_DIR, 'adm3_world_centroids.json');
const SVG_ANCHORS_PATH = resolve(GEOREF_DIR, 'svg_municipality_centroids.json');
const CROSSWALK_PATH = resolve(GEOREF_DIR, 'adm3_crosswalk_final.json');
const OUTPUT_PATH = resolve(GEOREF_DIR, 'world_to_svg_transform.json');

// --- TPS Math (from Phase H6.0) ---
function tpsBasis(r: number): number {
    if (r < 1e-10) return 0;
    return r * r * Math.log(r);
}

function solveLinearSquare(M: number[][], b: number[]): number[] | null {
    const n = M.length;
    const a = M.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let best = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(a[row][col]) > Math.abs(a[best][col])) best = row;
        }
        [a[col], a[best]] = [a[best], a[col]];
        const pivot = a[col][col];
        if (Math.abs(pivot) < 1e-10) return null;
        for (let j = 0; j <= n; j++) a[col][j] /= pivot;
        for (let i = 0; i < n; i++) {
            if (i === col) continue;
            const factor = a[i][col];
            for (let j = 0; j <= n; j++) a[i][j] -= factor * a[col][j];
        }
    }
    return a.map(row => row[n]);
}

function solveTps(
    pairs: Array<{ x: number; y: number; u: number; v: number }>
): { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] } | null {
    const n = pairs.length;
    if (n < 3) return null;
    const pts = pairs.map(p => [p.x, p.y]);
    const K: number[][] = [];
    for (let i = 0; i < n; i++) {
        K.push([]);
        for (let j = 0; j < n; j++) {
            const dx = pts[i][0] - pts[j][0];
            const dy = pts[i][1] - pts[j][1];
            K[i][j] = tpsBasis(Math.sqrt(dx * dx + dy * dy));
        }
    }
    const P: number[][] = pts.map((p, i) => [1, p[0], p[1]]);
    const L: number[][] = [];
    for (let i = 0; i < n; i++) {
        L.push([...K[i], ...P[i]]);
    }
    for (let col = 0; col < 3; col++) {
        const row = P.map((r) => r[col]);
        L.push([...row, 0, 0, 0]);
    }
    const rhsU = [...pairs.map(p => p.u), 0, 0, 0];
    const rhsV = [...pairs.map(p => p.v), 0, 0, 0];
    const solU = solveLinearSquare(L, rhsU);
    const solV = solveLinearSquare(L, rhsV);
    if (!solU || !solV) return null;
    return {
        wx: solU.slice(0, n),
        wy: solV.slice(0, n),
        ax: solU.slice(n),
        ay: solV.slice(n),
        pts,
    };
}

function main() {
    if (!existsSync(WORLD_ANCHORS_PATH) || !existsSync(SVG_ANCHORS_PATH) || !existsSync(CROSSWALK_PATH)) {
        console.error('Missing required georef artifacts. Run Phase H6.0 first.');
        process.exit(1);
    }

    const worldAnchors = JSON.parse(readFileSync(WORLD_ANCHORS_PATH, 'utf8'));
    const svgAnchors = JSON.parse(readFileSync(SVG_ANCHORS_PATH, 'utf8'));
    const crosswalk = JSON.parse(readFileSync(CROSSWALK_PATH, 'utf8'));

    const worldById = new Map(worldAnchors.map((w: any) => [w.adm3_id, w]));
    const svgByMun = new Map(svgAnchors.map((s: any) => [s.mun1990_id, s]));

    // INVERSE PAIRS: World (lon, lat) -> SVG (x, y)
    const pairs: Array<{ x: number; y: number; u: number; v: number }> = [];
    for (const row of crosswalk.rows) {
        const world = worldById.get(row.adm3_id);
        const svg = svgByMun.get(row.mun1990_id);
        if (world && svg) {
            pairs.push({
                x: world.lon,
                y: world.lat,
                u: svg.x,
                v: svg.y
            });
        }
    }

    process.stdout.write(`Deriving TPS for ${pairs.length} pairs (World -> SVG)...\n`);
    const tps = solveTps(pairs);

    if (!tps) {
        console.error('Failed to solve TPS transform.');
        process.exit(1);
    }

    const output = {
        method: 'tps',
        anchor_count: pairs.length,
        coefficients: tps,
        source: 'Phase H6.12 World-to-SVG derived from Phase H6.0 anchors'
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
    process.stdout.write(`Wrote inverse transform: ${OUTPUT_PATH}\n`);
}

main();
