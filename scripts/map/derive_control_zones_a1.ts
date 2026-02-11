/**
 * Derive faction control zones as concave hulls (terrain-fitted) for Layer 1.
 * Reads settlements_a1_viewer.geojson (canonical) + political_control_data, outputs control_zones_A1.geojson.
 * Deterministic: stable sort, no timestamps.
 * Run: tsx scripts/map/derive_control_zones_a1.ts  or npm run map:control-zones:a1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import concaveman from 'concaveman';

const ROOT = resolve(process.cwd());
const SETTLEMENTS_PATH = resolve(ROOT, 'data/derived/settlements_a1_viewer.geojson');
const CONTROL_PATH = resolve(ROOT, 'data/derived/political_control_data.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/control_zones_A1.geojson');

const CONCAVITY = 0.5;
const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

function getCentroid(feature: any): [number, number] | null {
    const coords = feature.geometry?.coordinates;
    if (!coords) return null;
    const type = feature.geometry?.type;
    let ring: number[][];
    if (type === 'Polygon') ring = coords[0]; // Polygon: coords[0] = exterior ring
    else if (type === 'MultiPolygon') ring = coords[0]?.[0]; // MultiPolygon: coords[0][0] = first poly exterior
    else return null;
    if (!ring || ring.length < 2) return null;
    let sx = 0, sy = 0, n = 0;
    for (const p of ring) {
        if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
            sx += p[0];
            sy += p[1];
            n++;
        }
    }
    return n ? [sx / n, sy / n] : null;
}

function getMasterSid(feature: any): string | null {
    const sid = feature.properties?.sid;
    const munId = feature.properties?.municipality_id ?? feature.properties?.mun1990_municipality_id;
    if (!sid) return null;
    const sourceId = typeof sid === 'string' && sid.startsWith('S') ? sid.slice(1) : String(sid);
    if (munId != null && typeof munId === 'number') return `${munId}:${sourceId}`;
    return sid;
}

function main() {
    if (!existsSync(SETTLEMENTS_PATH) || !existsSync(CONTROL_PATH)) {
        console.log('Missing settlements or political_control_data; skipping control zones.');
        const dir = resolve(ROOT, 'data/derived');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features: [] }));
        return;
    }

    const geojson = JSON.parse(readFileSync(SETTLEMENTS_PATH, 'utf-8'));
    const control = JSON.parse(readFileSync(CONTROL_PATH, 'utf-8'));
    const bySid: Record<string, string | null> = control.by_settlement_id || {};

    const pointsByFaction: Record<string, [number, number][]> = { RBiH: [], RS: [], HRHB: [] };

    for (const f of geojson.features || []) {
        const masterSid = getMasterSid(f);
        const controller = masterSid ? (bySid[masterSid] ?? null) : null;
        if (!controller || !FACTIONS.includes(controller as any)) continue;
        const pt = getCentroid(f);
        if (pt) pointsByFaction[controller].push(pt);
    }

    const features: any[] = [];
    for (const faction of FACTIONS) {
        const points = pointsByFaction[faction];
        if (points.length < 3) continue;
        try {
            const hull = concaveman(points as any, CONCAVITY, 0);
            if (hull && hull.length >= 3) {
                const ring = hull as number[][];
                if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
                    ring.push([ring[0][0], ring[0][1]]);
                }
                features.push({
                    type: 'Feature',
                    properties: { faction },
                    geometry: { type: 'Polygon', coordinates: [ring] }
                });
            }
        } catch (_) {
            // skip
        }
    }

    const dir = resolve(ROOT, 'data/derived');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const fc = { type: 'FeatureCollection' as const, features };
    writeFileSync(OUTPUT_PATH, JSON.stringify(fc));
    console.log(`Wrote ${features.length} control zones to ${OUTPUT_PATH}`);
}

main();
