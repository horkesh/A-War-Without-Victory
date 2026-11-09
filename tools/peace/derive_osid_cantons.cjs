#!/usr/bin/env node
/**
 * Each operational cell's Federation canton, for the Dayton place card (DC plan stage 3).
 *
 * A cell is a group of 1991 census settlements; the census is published on the post-1995
 * municipalities, and data/source/peace_plans/federation_cantons.json lists the cantons by
 * those municipalities. Rule, in order:
 *   1. settlement: the canton of the Federation municipality holding most of the cell's 1991
 *      population among its Federation settlements;
 *   2. municipality: no Federation settlement in the cell, but every Federation successor of
 *      its 1990 municipality lies in one canton (the game's line can give the Federation land
 *      the real line did not);
 *   3. null: no Federation successor, or successors in more than one canton. The place card
 *      then says the canton is left to Federation law.
 *
 * Deterministic: sorted keys, ties broken by municipality code. Writes
 * data/derived/peace/osid_cantons.json. Usage: node tools/peace/derive_osid_cantons.cjs [--check]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const OUT = 'data/derived/peace/osid_cantons.json';

const census = read('data/source/bih_census_1991.json');
const cantons = read('data/source/peace_plans/federation_cantons.json').cantons;
const remap = read('data/source/municipality_post1995_to_mun1990.json').rows;
const cells = read('data/derived/operational/operational_settlements.geojson').features;

const cantonOf = new Map();
for (const [canton, codes] of Object.entries(cantons)) {
    for (const code of codes) {
        if (cantonOf.has(code)) throw new Error(`municipality ${code} listed in two cantons`);
        if (!census.municipalities[code]) throw new Error(`municipality ${code} not in the census`);
        cantonOf.set(code, canton);
    }
}
for (const code of Object.keys(census.municipalities)) {
    if (code.startsWith('1') && !cantonOf.has(code)) throw new Error(`Federation municipality ${code} has no canton`);
}

// 1990 municipality name -> cantons of its Federation successors.
const byMun1990 = new Map();
for (const row of remap) {
    const canton = cantonOf.get(row.post1995_code);
    if (!canton) continue;
    const set = byMun1990.get(row.mun1990_name) ?? new Set();
    set.add(canton);
    byMun1990.set(row.mun1990_name, set);
}

// The geojson draws 744 polygons; the simulation scores 712. The 32 micro-cells were folded into
// a same-municipality parent (micro_osid_merge_map.json), so their settlements count for the parent
// and they get no entry of their own.
const mergeParent = read('data/derived/operational/micro_osid_merge_map.json');
const sidsByCell = new Map();
for (const feature of cells) {
    const p = feature.properties;
    const target = mergeParent[p.osid] ?? p.osid;
    sidsByCell.set(target, [...(sidsByCell.get(target) ?? []), ...(p.constituent_sids ?? [p.sid])]);
}

const out = {};
const counts = { settlement: 0, municipality: 0, none: 0 };
for (const feature of cells) {
    const p = feature.properties;
    if (mergeParent[p.osid]) continue;
    const pop = new Map();
    for (const sid of sidsByCell.get(p.osid)) {
        const s = census.settlements[String(sid).replace(/^S/, '')];
        if (!s || !cantonOf.has(s.m)) continue;
        pop.set(s.m, (pop.get(s.m) ?? 0) + (s.p?.[0] ?? 0));
    }
    let entry;
    if (pop.size) {
        const [code] = [...pop.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
        entry = { canton: cantonOf.get(code), basis: 'settlement' };
    } else {
        const set = byMun1990.get(p.mun1990_name);
        entry = set && set.size === 1 ? { canton: [...set][0], basis: 'municipality' } : { canton: null, basis: null };
    }
    counts[entry.basis ?? 'none'] += 1;
    out[p.osid] = entry;
}

const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
const text = JSON.stringify({
    schema: 'osid_cantons/v1',
    note: 'Derived by tools/peace/derive_osid_cantons.cjs from data/source/peace_plans/federation_cantons.json, data/source/bih_census_1991.json and data/source/municipality_post1995_to_mun1990.json. basis: settlement (the cell\'s Federation settlements), municipality (its 1990 municipality has one Federation canton), null (left to Federation law).',
    counts,
    cells: sorted,
}, null, 1) + '\n';

if (process.argv.includes('--check')) {
    const current = fs.existsSync(path.join(root, OUT)) ? fs.readFileSync(path.join(root, OUT), 'utf8') : '';
    if (current !== text) { console.error(`${OUT} is stale; run node tools/peace/derive_osid_cantons.cjs`); process.exit(1); }
    console.log(`${OUT} up to date`, counts);
} else {
    fs.writeFileSync(path.join(root, OUT), text);
    console.log(`wrote ${OUT}`, counts);
}
