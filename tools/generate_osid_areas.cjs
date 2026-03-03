'use strict';

/**
 * generate_osid_areas.cjs
 * Precompute area (km²) for every OSID from operational_settlements.geojson.
 * Writes a lightweight JSON lookup: { total_area_km2, areas: { osid: km², ... } }
 *
 * Usage: node tools/generate_osid_areas.cjs
 *
 * CommonJS — runs with plain node, no tsx/ESM needed.
 */

const turf = require('@turf/turf');
const fs   = require('fs');
const path = require('path');

const GEOJSON_PATH = path.resolve(__dirname, '../data/derived/operational/operational_settlements.geojson');
const OUTPUT_PATH  = path.resolve(__dirname, '../data/derived/operational/osid_areas.json');

function main() {
    if (!fs.existsSync(GEOJSON_PATH)) {
        console.error('ERROR: operational_settlements.geojson not found at:', GEOJSON_PATH);
        process.exit(1);
    }

    const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
    const areas = {};
    let totalArea = 0;
    let featureCount = 0;
    let degenerateCount = 0;

    for (const f of geo.features) {
        const osid = f.properties?.osid;
        if (!osid) {
            console.warn('WARNING: Feature missing osid property, skipping');
            continue;
        }
        const areaKm2 = turf.area(f) / 1e6; // m² → km²
        areas[osid] = Math.round(areaKm2 * 1000) / 1000; // 3 decimal places
        totalArea += areaKm2;
        featureCount++;
        if (areaKm2 < 0.1) degenerateCount++;
    }

    // Sort keys for deterministic output
    const sortedAreas = {};
    for (const key of Object.keys(areas).sort()) {
        sortedAreas[key] = areas[key];
    }

    const output = {
        total_area_km2: Math.round(totalArea * 100) / 100,
        osid_count: featureCount,
        areas: sortedAreas,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log(`OSID Areas generated:`);
    console.log(`  Features: ${featureCount}`);
    console.log(`  Total area: ${output.total_area_km2.toFixed(2)} km²`);
    console.log(`  Degenerate (< 0.1 km²): ${degenerateCount}`);
    console.log(`  Written to: ${OUTPUT_PATH}`);
}

main();
