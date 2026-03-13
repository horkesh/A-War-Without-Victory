const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

const toFix = new Set([
    'arbih_116th_mountain',
    'arbih_1st_kamenica',
    'arbih_211th_liberation',
    'arbih_221st_mountain',
    'arbih_223rd_mountain',
    'arbih_241st_spreca_muslim_light_gazije',
    'arbih_243rd_muslimpodrinje_mountain',
    'arbih_319th_liberation',
    'arbih_328th_mountain',
    'arbih_329th_mountain',
    'arbih_372nd_vitezka_mountain',
    'hrhb_101st_oraje_brigade',
]);

let changed = 0;
for (const b of oob) {
    if (toFix.has(b.id)) {
        const old = b.available_from;
        b.available_from = 0;
        console.log(`  ${b.id}: available_from ${old} → 0`);
        changed++;
    }
}

console.log(`\nChanged ${changed} brigades.`);
fs.writeFileSync('data/source/oob_brigades.json', JSON.stringify(oob, null, 2) + '\n');
console.log('Written to data/source/oob_brigades.json');
