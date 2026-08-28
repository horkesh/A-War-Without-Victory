'use strict';

/**
 * generate_osid_population.cjs
 * Precompute 1991-census population for every OSID from operational_settlements.geojson.
 * Writes a lightweight JSON lookup mirroring osid_areas.json:
 *   { total_population_1991, osid_count, population: { osid: total, ... } }
 *
 * WHY a derived companion instead of reading the geojson: the source carries full
 * polygon geometry and is ~3 MB. The negotiation code needs one integer per OSID,
 * and static-importing 3 MB of geometry to get it would be paid on every import.
 * osid_areas.json exists for exactly this reason; this is its population twin.
 *
 * Usage: node tools/generate_osid_population.cjs
 *
 * CommonJS — runs with plain node, no tsx/ESM needed.
 */

const fs   = require('fs');
const path = require('path');

const GEOJSON_PATH = path.resolve(__dirname, '../data/derived/operational/operational_settlements.geojson');
const OUTPUT_PATH  = path.resolve(__dirname, '../data/derived/operational/osid_population_1991.json');

function main() {
    if (!fs.existsSync(GEOJSON_PATH)) {
        console.error('ERROR: operational_settlements.geojson not found at:', GEOJSON_PATH);
        process.exit(1);
    }

    const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
    const rows = [];
    let total = 0;
    let missing = 0;

    for (const f of geo.features ?? []) {
        const p = f.properties ?? {};
        const osid = p.osid;
        if (typeof osid !== 'string' || osid.length === 0) continue;
        const pop = p.population_total;
        if (typeof pop !== 'number' || !Number.isFinite(pop)) { missing += 1; continue; }
        rows.push([osid, Math.round(pop)]);
        total += Math.round(pop);
    }

    // Sorted output: deterministic bytes on every regeneration.
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const population = {};
    for (const [osid, pop] of rows) population[osid] = pop;

    const out = {
        total_population_1991: total,
        osid_count: rows.length,
        population,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`wrote ${OUTPUT_PATH}`);
    console.log(`  ${rows.length} OSIDs, total 1991 population ${total.toLocaleString()}`);
    if (missing > 0) console.log(`  WARNING: ${missing} feature(s) had no usable population_total`);
}

main();
