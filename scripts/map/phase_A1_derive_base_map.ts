import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as turf from '@turf/turf';
import { applyTps, TpsParams } from './lib/tps.js';

const ROOT = resolve(process.cwd());
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');

const TRANSFORM_PATH = resolve(DERIVED, 'georef/world_to_svg_transform.json');
const ROADS_PATH = resolve(DERIVED, 'terrain/osm_roads_snapshot_h6_2.geojson');
const WATERWAYS_PATH = resolve(DERIVED, 'terrain/osm_waterways_snapshot_h6_2.geojson');
const SETTLEMENTS_PATH = resolve(DERIVED, 'settlements_wgs84_1990.geojson');
const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const BOUNDARIES_PATH = resolve(SOURCE, 'boundaries/bih_adm0.geojson');
const MUNI_DATA_PATH = resolve(SOURCE, 'boundaries/bih_adm3_1990.geojson');
const POLITICAL_CONTROL_PATH = resolve(DERIVED, 'political_control_data.json');
const ETHNICITY_PATH = resolve(DERIVED, 'settlement_ethnicity_data.json');

const OUTPUT_PATH = resolve(DERIVED, 'A1_BASE_MAP.geojson');

async function main() {
    console.log('--- Phase A1: Robust Base Map Derivation ---');

    const transform = JSON.parse(readFileSync(TRANSFORM_PATH, 'utf-8'));
    const tpsParams: TpsParams = transform.coefficients;

    // Load census
    const census = JSON.parse(readFileSync(CENSUS_PATH, 'utf-8'));
    const settlementPopMap = new Map();
    for (const [id, s] of Object.entries(census.settlements)) {
        settlementPopMap.set(id, (s as any).p[0]);
    }

    // Load Controllers from political_control_data only (same source as map viewer)
    let controllerByMun1990: Record<string, string> = {};
    if (existsSync(POLITICAL_CONTROL_PATH)) {
        const pc = JSON.parse(readFileSync(POLITICAL_CONTROL_PATH, 'utf-8'));
        const bySid = (pc.by_settlement_id as Record<string, string>) || {};
        const wgs84 = JSON.parse(readFileSync(SETTLEMENTS_PATH, 'utf-8'));
        const sidToMun1990: Record<string, string> = {};
        for (const f of wgs84.features || []) {
            const sid = f.properties?.sid;
            const mun = f.properties?.mun1990_id;
            if (sid && mun) sidToMun1990[String(sid)] = String(mun);
        }
        const countByMun: Record<string, Record<string, number>> = {};
        for (const [sid, controller] of Object.entries(bySid)) {
            if (controller === null || controller === 'null') continue;
            const mun = sidToMun1990[sid];
            if (!mun) continue;
            if (!countByMun[mun]) countByMun[mun] = {};
            countByMun[mun][controller] = (countByMun[mun][controller] || 0) + 1;
        }
        for (const [mun, counts] of Object.entries(countByMun)) {
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            if (entries[0]) controllerByMun1990[mun] = entries[0][0];
        }
    }

    // Load Ethnicity
    let ethnicityMap: Record<string, any> = {};
    if (existsSync(ETHNICITY_PATH)) {
        ethnicityMap = JSON.parse(readFileSync(ETHNICITY_PATH, 'utf-8')).by_settlement_id;
    }

    // Robust Projector (Capping)
    // Axis/orientation: georef SVG space can have north pointing along +x; we want north-up for display.
    // Apply 90° CCW rotation so (x,y) -> (-y, x): stored coords draw with north up.
    const projectPoint = (p: number[]) => {
        const [lon, lat] = p;
        // Basic bbox check for Bosnia before projecting to avoid TPS explosion
        if (lon < 15 || lon > 20 || lat < 42 || lat > 46) return null;

        const [x, y] = applyTps(lon, lat, tpsParams);
        // If TPS produced garbage (>1M or NaN), skip
        if (isNaN(x) || isNaN(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000) return null;

        // North-up orientation: 
        // TPS outputs are already in the project space where x=East, y=South (mostly).
        const u = x;
        const v = y;
        return [parseFloat(u.toFixed(4)), parseFloat(v.toFixed(4))];
    };

    const projectLine = (line: number[][]) => {
        const out = [];
        for (const p of line) {
            const pt = projectPoint(p);
            if (pt) out.push(pt);
        }
        return out.length > 1 ? out : null;
    };

    /** Ensure a ring is closed (first === last). Deterministic. */
    function closeRing(ring: number[][]): number[][] {
        if (ring.length < 3) return ring;
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            return [...ring, first];
        }
        return ring;
    }

    /** Clip line coords to polygon; returns array of line coord arrays (inside parts only). Deterministic. */
    function clipLineToPolygon(
        lineCoords: number[][],
        poly: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>
    ): number[][][] {
        if (lineCoords.length < 2) return [];
        const line = turf.lineString(lineCoords);
        // Pass poly directly to lineSplit — it accepts Polygon/MultiPolygon natively.
        // Do NOT use polygonToLine(), which returns a FeatureCollection for MultiPolygon
        // and causes lineSplit to throw.
        let split: turf.helpers.FeatureCollection<turf.helpers.LineString>;
        try {
            split = turf.lineSplit(line, poly);
        } catch {
            // On failure, drop the line rather than passing it through unclipped.
            console.warn('clipLineToPolygon: lineSplit failed, dropping segment');
            return [];
        }
        const result: number[][][] = [];
        for (const f of split.features) {
            const coords = f.geometry.coordinates;
            if (coords.length < 2) continue;
            const mid = turf.center(f);
            if (turf.booleanPointInPolygon(mid, poly)) result.push(coords);
        }
        // If lineSplit produced no segments (line doesn't cross boundary),
        // check if the entire line is inside the polygon.
        if (result.length === 0) {
            const mid = turf.center(line);
            if (turf.booleanPointInPolygon(mid, poly)) result.push(lineCoords);
        }
        return result;
    }

    // Load boundary early for clipping (per preferences: bih_adm0, clip at derivation)
    let boundaryPoly: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon> | null = null;
    if (existsSync(BOUNDARIES_PATH)) {
        const boundaries = JSON.parse(readFileSync(BOUNDARIES_PATH, 'utf8'));
        const f = boundaries.features[0];
        if (f?.geometry?.coordinates) {
            const type = f.geometry.type;
            const coords = f.geometry.coordinates;
            let projected: number[][][] | number[][][][];
            if (type === 'Polygon') {
                const rings: number[][][] = [];
                for (const r of coords) {
                    const ring = projectLine(r);
                    if (ring) rings.push(closeRing(ring));
                }
                projected = rings.length > 0 ? [rings] : [];
            } else {
                const polys: number[][][][] = [];
                for (const poly of coords) {
                    const rings: number[][][] = [];
                    for (const r of poly) {
                        const ring = projectLine(r);
                        if (ring) rings.push(closeRing(ring));
                    }
                    if (rings.length > 0) polys.push(rings);
                }
                projected = polys;
            }
            if ((type === 'Polygon' && (projected as number[][][])[0]?.length) ||
                (type === 'MultiPolygon' && (projected as number[][][][]).length > 0)) {
                boundaryPoly = type === 'Polygon'
                    ? turf.polygon(projected as number[][][])
                    : turf.multiPolygon(projected as number[][][][]);
            }
        }
    }

    const features: any[] = [];

    // 1. Roads
    console.log('Filtering Roads...');
    const roads = JSON.parse(readFileSync(ROADS_PATH, 'utf8'));
    roads.features.forEach((f: any) => {
        const hw = f.properties.highway;
        const isMSR = ['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link', 'primary_link'].includes(hw);
        const name = f.properties.name || f.properties.ref || '';
        if (!isMSR && !['secondary', 'tertiary'].includes(hw)) return;

        const coords = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
        let projectedRings: number[][][] = [];
        coords.forEach((l: any) => {
            const pl = projectLine(l);
            if (pl) projectedRings.push(pl);
        });

        if (projectedRings.length === 0) return;

        if (boundaryPoly) {
            const clipped: number[][][] = [];
            projectedRings.forEach((ring) => {
                clipLineToPolygon(ring, boundaryPoly!).forEach((seg) => clipped.push(seg));
            });
            projectedRings = clipped;
        }
        if (projectedRings.length === 0) return;

        features.push({
            type: 'Feature',
            properties: { role: 'road', nato_class: isMSR ? 'MSR' : 'SECONDARY', name },
            geometry: {
                type: projectedRings.length === 1 ? 'LineString' : 'MultiLineString',
                coordinates: projectedRings.length === 1 ? projectedRings[0] : projectedRings
            }
        });
    });

    // 2. Rivers (clipped to BiH boundary when available)
    console.log('Filtering Rivers...');
    const water = JSON.parse(readFileSync(WATERWAYS_PATH, 'utf8'));
    water.features.filter((f: any) => f.properties.waterway === 'river').forEach((f: any) => {
        const coords = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
        let projectedRings: number[][][] = [];
        coords.forEach((l: any) => {
            const pl = projectLine(l);
            if (pl) projectedRings.push(pl);
        });
        if (projectedRings.length === 0) return;

        if (boundaryPoly) {
            const clipped: number[][][] = [];
            projectedRings.forEach((ring) => {
                clipLineToPolygon(ring, boundaryPoly!).forEach((seg) => clipped.push(seg));
            });
            projectedRings = clipped;
        }
        if (projectedRings.length > 0) {
            features.push({
                type: 'Feature',
                properties: { role: 'river', nato_class: 'RIVER' },
                geometry: {
                    type: projectedRings.length === 1 ? 'LineString' : 'MultiLineString',
                    coordinates: projectedRings.length === 1 ? projectedRings[0] : projectedRings
                }
            });
        }
    });

    // 3. Settlements (WGS84: project lon/lat to A1 via TPS)
    console.log('Processing Settlements...');
    const settlements = JSON.parse(readFileSync(SETTLEMENTS_PATH, 'utf8'));
    settlements.features.forEach((f: any) => {
        const sid = f.properties.sid;
        const pop = Number(f.properties.population_total ?? 0) || settlementPopMap.get(f.properties.census_ids?.[0]) || settlementPopMap.get(f.properties.census_id) || 0;
        const eth = ethnicityMap[sid] || ethnicityMap[String(f.properties.census_ids?.[0])] || {};

        let nato = 'SETTLEMENT';
        if (pop > 20000) nato = 'URBAN_CENTER';
        else if (pop > 5000) nato = 'TOWN';

        // Project geometry from WGS84 (lon/lat) to A1 space
        let projectedGeom: any = null;
        if (f.geometry.type === 'Point') {
            const pt = projectPoint(f.geometry.coordinates);
            if (pt) projectedGeom = { type: 'Point', coordinates: pt };
        } else if (f.geometry.type === 'Polygon') {
            const rings: number[][][] = [];
            f.geometry.coordinates.forEach((r: number[][]) => {
                const ring = projectLine(r);
                if (ring) rings.push(closeRing(ring));
            });
            if (rings.length > 0) projectedGeom = { type: 'Polygon', coordinates: rings };
        } else if (f.geometry.type === 'MultiPolygon') {
            const polys: number[][][][] = [];
            f.geometry.coordinates.forEach((poly: number[][][]) => {
                const rings: number[][][] = [];
                poly.forEach((r: number[][]) => {
                    const ring = projectLine(r);
                    if (ring) rings.push(closeRing(ring));
                });
                if (rings.length > 0) polys.push(rings);
            });
            if (polys.length > 0) projectedGeom = { type: 'MultiPolygon', coordinates: polys };
        }

        if (projectedGeom) {
            features.push({
                type: 'Feature',
                properties: {
                    role: 'settlement', sid, name: f.properties.settlement_name, pop, nato_class: nato,
                    majority_ethnicity: eth.majority || 'unknown'
                },
                geometry: projectedGeom
            });
        }
    });

    // 4. Boundaries (Clipping context)
    if (existsSync(BOUNDARIES_PATH)) {
        console.log('Processing Boundaries (National)...');
        const boundaries = JSON.parse(readFileSync(BOUNDARIES_PATH, 'utf8'));
        boundaries.features.forEach((f: any) => {
            const type = f.geometry.type;
            const coords = f.geometry.coordinates;

            let projectedGeom = null;
            if (type === 'Polygon') {
                const rings: number[][][] = [];
                coords.forEach((r: any) => {
                    const ring = projectLine(r);
                    if (ring) rings.push(closeRing(ring));
                });
                if (rings.length > 0) projectedGeom = { type: 'Polygon', coordinates: rings };
            } else if (type === 'MultiPolygon') {
                const polys: number[][][][] = [];
                coords.forEach((poly: any) => {
                    const rings: number[][][] = [];
                    poly.forEach((r: any) => {
                        const ring = projectLine(r);
                        if (ring) rings.push(closeRing(ring));
                    });
                    if (rings.length > 0) polys.push(rings);
                });
                if (polys.length > 0) projectedGeom = { type: 'MultiPolygon', coordinates: polys };
            }

            if (projectedGeom) {
                features.push({
                    type: 'Feature',
                    properties: { role: 'boundary', name: f.properties?.name || 'BiH' },
                    geometry: projectedGeom
                });
            }
        });
    }

    // 5. Control Regions (from bih_adm3_1990 WGS84, projected to A1 via TPS — same as settlements)
    if (existsSync(MUNI_DATA_PATH)) {
        console.log('Processing Control Regions...');
        const muniMeta = JSON.parse(readFileSync(MUNI_DATA_PATH, 'utf8'));
        const mun1990IdToName: Record<string, string> = {};
        muniMeta.features.forEach((f: any) => {
            const id = f.properties?.mun1990_id ?? f.properties?.id;
            const name = f.properties?.mun1990_name ?? f.properties?.name;
            if (id && name) mun1990IdToName[String(id)] = name;
        });

        const sortedFeatures = [...(muniMeta.features || [])].sort((a: any, b: any) =>
            String(a.properties?.mun1990_id ?? '').localeCompare(String(b.properties?.mun1990_id ?? '')));

        for (const f of sortedFeatures) {
            const mun1990Id = String(f.properties?.mun1990_id ?? f.properties?.id ?? '');
            const name = mun1990IdToName[mun1990Id] ?? f.properties?.mun1990_name ?? f.properties?.name;
            const controller = controllerByMun1990[mun1990Id] ?? null;
            if (!controller) continue;

            const geom = f.geometry;
            if (!geom?.coordinates) continue;

            let projectedGeom: any = null;
            if (geom.type === 'Polygon') {
                const rings: number[][][] = [];
                geom.coordinates.forEach((r: number[][]) => {
                    const ring = projectLine(r);
                    if (ring) rings.push(closeRing(ring));
                });
                if (rings.length > 0) projectedGeom = { type: 'Polygon', coordinates: rings };
            } else if (geom.type === 'MultiPolygon') {
                const polys: number[][][][] = [];
                geom.coordinates.forEach((poly: number[][][]) => {
                    const rings: number[][][] = [];
                    poly.forEach((r: number[][]) => {
                        const ring = projectLine(r);
                        if (ring) rings.push(closeRing(ring));
                    });
                    if (rings.length > 0) polys.push(rings);
                });
                if (polys.length > 0) projectedGeom = { type: 'MultiPolygon', coordinates: polys };
            }
            if (projectedGeom) {
                features.push({
                    type: 'Feature',
                    properties: { role: 'control_region', name, controller, mun1990_id: mun1990Id },
                    geometry: projectedGeom
                });
            }
        }
    }

    // Diagnostic: log bbox per role to verify coordinate alignment
    console.log('Coordinate alignment diagnostic (bbox per role):');
    for (const role of ['road', 'river', 'settlement', 'boundary', 'control_region']) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let count = 0;
        for (const f of features) {
            if (f.properties.role !== role) continue;
            const visit = (pt: number[]) => {
                if (pt && typeof pt[0] === 'number' && Math.abs(pt[0]) < 10000) {
                    if (pt[0] < minX) minX = pt[0]; if (pt[1] < minY) minY = pt[1];
                    if (pt[0] > maxX) maxX = pt[0]; if (pt[1] > maxY) maxY = pt[1];
                    count++;
                }
            };
            const t = f.geometry.type;
            const c = f.geometry.coordinates;
            if (t === 'Point') visit(c);
            else if (t === 'LineString') c.forEach(visit);
            else if (t === 'MultiLineString' || t === 'Polygon') c.forEach((r: any) => r.forEach(visit));
            else if (t === 'MultiPolygon') c.forEach((p: any) => p.forEach((r: any) => r.forEach(visit)));
        }
        if (count > 0) {
            console.log(`  ${role}: x=[${minX.toFixed(1)}, ${maxX.toFixed(1)}] y=[${minY.toFixed(1)}, ${maxY.toFixed(1)}] (${count} pts)`);
        }
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features }));
    console.log(`Success: Wrote ${features.length} features.`);
}

main().catch(console.error);
