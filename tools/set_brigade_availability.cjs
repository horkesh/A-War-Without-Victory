// Usage: node tools/set_brigade_availability.cjs <setup>
// setup A: w8→0 only (revert w4 brigades to original)
// setup B: w8→w2 only (revert w4 brigades to original)
// setup C: revert all to original values

const fs = require('fs');
const setup = process.argv[2] || 'A';

const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

// Original values for all 12 brigades
const originals = {
    // w4 brigades (Drina/Tuzla area) — should stay at w4
    'arbih_116th_mountain': 4,
    'arbih_1st_kamenica': 4,
    'arbih_211th_liberation': 4,
    'arbih_221st_mountain': 4,
    'arbih_223rd_mountain': 4,
    'arbih_241st_spreca_muslim_light_gazije': 4,
    'arbih_243rd_muslimpodrinje_mountain': 4,
    // w8 brigades (Central Bosnia / Posavina)
    'arbih_319th_liberation': 8,     // Žepče
    'arbih_328th_mountain': 8,       // Zavidovići
    'arbih_329th_mountain': 8,       // Kakanj
    'arbih_372nd_vitezka_mountain': 8, // Tešanj
    'hrhb_101st_oraje_brigade': 8,   // Orašje
};

const w8_ids = [
    'arbih_319th_liberation',
    'arbih_328th_mountain',
    'arbih_329th_mountain',
    'arbih_372nd_vitezka_mountain',
    'hrhb_101st_oraje_brigade',
];

const targets = {};

if (setup === 'A') {
    // w4 brigades → back to w4, w8 brigades → 0
    for (const [id, orig] of Object.entries(originals)) {
        if (w8_ids.includes(id)) targets[id] = 0;
        else targets[id] = orig; // revert to w4
    }
} else if (setup === 'B') {
    // w4 brigades → back to w4, w8 brigades → w2
    for (const [id, orig] of Object.entries(originals)) {
        if (w8_ids.includes(id)) targets[id] = 2;
        else targets[id] = orig;
    }
} else if (setup === 'C') {
    // Revert all to original
    for (const [id, orig] of Object.entries(originals)) {
        targets[id] = orig;
    }
} else {
    console.error('Unknown setup:', setup);
    process.exit(1);
}

let changed = 0;
for (const b of oob) {
    if (targets[b.id] !== undefined && b.available_from !== targets[b.id]) {
        console.log(`  ${b.id}: available_from ${b.available_from} → ${targets[b.id]}`);
        b.available_from = targets[b.id];
        changed++;
    }
}

console.log(`\nSetup ${setup}: changed ${changed} brigades.`);
fs.writeFileSync('data/source/oob_brigades.json', JSON.stringify(oob, null, 2) + '\n');
